from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.blockchain import generate_keypair, public_key_to_hex
from app.database import get_session
from app.models import User
from app.schemas import (
    KeypairResponse,
    LinkWalletRequest,
    PublicKeyResponse,
    UserPublic,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
async def get_profile(user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(user)


@router.put("/me")
async def update_profile(
    updates: UserUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> UserPublic:
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.flush()
    return UserPublic.model_validate(user)


@router.post("/me/generate-keypair")
async def generate_ed25519_keypair(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KeypairResponse:
    priv_raw, pub_raw = generate_keypair()
    user.ed25519_public_key = pub_raw
    await session.flush()
    return KeypairResponse(
        private_key_hex=priv_raw.hex(),
        public_key_hex=pub_raw.hex(),
    )


@router.get("/me/public-key")
async def get_public_key(
    user: User = Depends(get_current_user),
) -> PublicKeyResponse:
    if not user.ed25519_public_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Ed25519 keypair generated yet. POST /users/me/generate-keypair first.",
        )
    return PublicKeyResponse(public_key_hex=user.ed25519_public_key.hex())


@router.post("/me/link-wallet")
async def link_wallet(
    req: LinkWalletRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    user.wallet_address = req.wallet_address
    await session.flush()
    return {"wallet_address": user.wallet_address}
