import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.blockchain import (
    generate_keypair,
    public_key_from_hex,
    verify_signature,
)
from app.database import get_session
from app.models import AuditLog, User
from app.schemas import (
    AuthenticateWithKeyRequest,
    ChallengeResponse,
    LoginRequest,
    OnboardingRequest,
    TokenResponse,
)


class VerifyEmailRequest(BaseModel):
    email: EmailStr


class ConfirmEmailRequest(BaseModel):
    email: EmailStr
    token: str

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(
    req: OnboardingRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    existing = await session.execute(
        select(User).where((User.email == req.email) | (User.username == req.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already registered")

    priv_raw, pub_raw = generate_keypair()
    ref_code = uuid.uuid4().hex[:12].upper()

    enrollment = {
        "volunteer_node_op": req.volunteer_node_op,
        "volunteer_tech_support": req.volunteer_tech_support,
        "volunteer_chat_support": req.volunteer_chat_support,
        "has_high_speed_connection": req.has_high_speed_connection,
        "always_on_available": req.always_on_available,
    }

    # Validate referral code if provided
    referred_by_user = None
    if req.referral_code:
        result = await session.execute(
            select(User).where(User.referral_code == req.referral_code)
        )
        referred_by_user = result.scalar_one_or_none()

    user = User(
        first_name=req.first_name,
        last_name=req.last_name,
        dob=req.dob,
        email=req.email,
        username=req.username,
        password_hash=hash_password(req.password),
        founder_subscript=req.founder_subscript,
        referral_code=ref_code,
        referred_by_code=req.referral_code if referred_by_user else None,
        ed25519_public_key=pub_raw,
        bio=req.bio,
        enrollment_data=enrollment,
        extra_fields=req.extra_fields,
    )
    session.add(user)
    await session.flush()

    session.add(
        AuditLog(
            user_id=user.id,
            action="user_registered",
            detail={"email": req.email, "username": req.username},
            ip_address=request.client.host if request.client else None,
        )
    )

    role_flags = {
        "is_user": True,
        "is_nodeop": req.volunteer_node_op,
        "is_tech_op": req.volunteer_tech_support,
        "is_chat_op": req.volunteer_chat_support,
    }
    token = create_access_token(user.id, role_flags)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username,
    )


@router.post("/login")
async def login(
    req: LoginRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User).where((User.username == req.username) | (User.email == req.username))
    )
    user = result.scalar_one_or_none()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session.add(
        AuditLog(
            user_id=user.id,
            action="user_login",
            detail={"method": "password"},
            ip_address=request.client.host if request.client else None,
        )
    )

    role_flags = {
        "is_user": user.is_user,
        "is_nodeop": user.is_nodeop,
        "is_tech_op": user.is_tech_op,
        "is_chat_op": user.is_chat_op,
        "is_admin": user.is_admin,
        "is_super_admin": user.is_super_admin,
    }
    token = create_access_token(user.id, role_flags)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username,
    )


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_user),
    request: Request = None,
    session: AsyncSession = Depends(get_session),
):
    session.add(
        AuditLog(
            user_id=user.id,
            action="user_logout",
            ip_address=request.client.host if request.client else None,
        )
    )
    return {"status": "logged_out"}


@router.get("/challenge")
async def get_challenge():
    import secrets

    challenge = secrets.token_hex(32)
    return ChallengeResponse(challenge=challenge)


@router.post("/verify-email")
async def verify_email(
    req: VerifyEmailRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    if user.email_verified:
        return {"status": "already_verified"}
    token = secrets.token_urlsafe(32)
    user.email_verification_token = token
    await session.flush()
    return {
        "status": "verification_sent",
        "detail": "Check your email for the verification code.",
        "token": token,
    }


@router.post("/confirm-email")
async def confirm_email(
    req: ConfirmEmailRequest,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    if user.email_verified:
        return {"status": "already_verified"}
    if not user.email_verification_token or user.email_verification_token != req.token:
        raise HTTPException(status_code=400, detail="Invalid verification token")
    user.email_verified = True
    user.email_verification_token = None
    await session.flush()
    return {"status": "email_verified"}


@router.post("/authenticate-with-key")
async def authenticate_with_key(
    req: AuthenticateWithKeyRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    pub_bytes = public_key_from_hex(req.public_key_hex)
    result = await session.execute(
        select(User).where(User.ed25519_public_key == pub_bytes)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Public key not registered")

    if not verify_signature(
        user.ed25519_public_key,
        bytes.fromhex(req.challenge),
        bytes.fromhex(req.signature),
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")

    session.add(
        AuditLog(
            user_id=user.id,
            action="user_authenticated_with_key",
            ip_address=request.client.host if request.client else None,
        )
    )

    role_flags = {
        "is_user": user.is_user,
        "is_nodeop": user.is_nodeop,
        "is_tech_op": user.is_tech_op,
        "is_chat_op": user.is_chat_op,
        "is_admin": user.is_admin,
        "is_super_admin": user.is_super_admin,
    }
    token = create_access_token(user.id, role_flags)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        username=user.username,
    )
