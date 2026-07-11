import secrets
import uuid
from datetime import datetime, timedelta, timezone

import urllib.request
import urllib.error
import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, update
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
from app.models import AuditLog, OTPCode, User
from app.schemas import (
    AuthenticateWithKeyRequest,
    ChallengeResponse,
    LoginRequest,
    OnboardingRequest,
    OTPRequiredResponse,
    OTPVerifyRequest,
    TokenResponse,
)


class VerifyEmailRequest(BaseModel):
    email: EmailStr


class ConfirmEmailRequest(BaseModel):
    email: EmailStr
    token: str

router = APIRouter(prefix="/auth", tags=["auth"])

OTP_TTL_MINUTES = 10


def _generate_otp() -> str:
    return f"{secrets.randbelow(10**6):06d}"


async def _send_otp_email(to_email: str, code: str, purpose: str) -> None:
    subject = f"Your d31337m3 Verification Code: {code}"
    if purpose == "register":
        body = (
            f"Welcome to d31337m3!\n\n"
            f"Your verification code is: {code}\n\n"
            f"This code expires in {OTP_TTL_MINUTES} minutes.\n"
            f"If you did not register, ignore this email."
        )
    else:
        body = (
            f"New login attempt detected.\n\n"
            f"Your verification code is: {code}\n\n"
            f"This code expires in {OTP_TTL_MINUTES} minutes.\n"
            f"If this was not you, secure your account immediately."
        )
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:8300/mail",
            data=json.dumps({"to_address": to_email, "subject": subject, "body": body}).encode(),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception:
        pass


async def _create_and_send_otp(
    session: AsyncSession, user: User, purpose: str, device_id: str | None = None
) -> str:
    code = _generate_otp()
    otp = OTPCode(
        user_id=user.id,
        code=code,
        purpose=purpose,
        device_id=device_id,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    )
    session.add(otp)
    await session.flush()
    await _send_otp_email(user.email, code, purpose)
    return code


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
        email_verified=False,
    )
    session.add(user)
    await session.flush()

    await _create_and_send_otp(session, user, "register")

    session.add(
        AuditLog(
            user_id=user.id,
            action="user_registered",
            detail={"email": req.email, "username": req.username},
            ip_address=request.client.host if request.client else None,
        )
    )

    email_hint = req.email[:3] + "***" + req.email[req.email.index("@"):]
    return OTPRequiredResponse(
        user_id=str(user.id),
        username=user.username,
        purpose="register",
        email_hint=email_hint,
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

    device_id = request.headers.get("X-Device-ID", "")
    known = False
    if device_id:
        existing = await session.execute(
            select(OTPCode).where(
                OTPCode.user_id == user.id,
                OTPCode.device_id == device_id,
                OTPCode.is_used == True,
            ).limit(1)
        )
        known = existing.scalar_one_or_none() is not None

    session.add(
        AuditLog(
            user_id=user.id,
            action="user_login",
            detail={"method": "password", "device_known": known, "device_id": device_id[:16] if device_id else ""},
            ip_address=request.client.host if request.client else None,
        )
    )

    if not known and device_id:
        await _create_and_send_otp(session, user, "login", device_id)
        email_hint = user.email[:3] + "***" + user.email[user.email.index("@"):]
        return OTPRequiredResponse(
            user_id=str(user.id),
            username=user.username,
            purpose="login",
            email_hint=email_hint,
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
        is_admin=user.is_admin,
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
        is_admin=user.is_admin,
    )


@router.post("/otp/verify")
async def verify_otp(
    req: OTPVerifyRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    uid = uuid.UUID(req.user_id)
    result = await session.execute(
        select(OTPCode).where(
            OTPCode.user_id == uid,
            OTPCode.code == req.code,
            OTPCode.purpose == req.purpose,
            OTPCode.is_used == False,
            OTPCode.expires_at > datetime.now(timezone.utc),
        ).order_by(OTPCode.id.desc()).limit(1)
    )
    otp = result.scalar_one_or_none()
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    otp.is_used = True

    user_result = await session.execute(select(User).where(User.id == uid))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.purpose == "register":
        user.email_verified = True

    session.add(
        AuditLog(
            user_id=user.id,
            action="otp_verified",
            detail={"purpose": req.purpose, "device_id": req.device_id[:16] if req.device_id else ""},
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
        is_admin=user.is_admin,
    )


@router.post("/otp/resend")
async def resend_otp(
    request: Request,
    user_id: str = "",
    purpose: str = "",
    device_id: str | None = None,
    session: AsyncSession = Depends(get_session),
):
    uid = uuid.UUID(user_id)
    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await session.execute(
        update(OTPCode).where(
            OTPCode.user_id == uid,
            OTPCode.purpose == purpose,
            OTPCode.is_used == False,
        ).values(is_used=True)
    )

    await _create_and_send_otp(session, user, purpose, device_id)

    email_hint = user.email[:3] + "***" + user.email[user.email.index("@"):]
    return {"status": "sent", "email_hint": email_hint}
