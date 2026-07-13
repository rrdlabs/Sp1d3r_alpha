import json
import urllib.request
import urllib.error

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, verify_password, hash_password
from app.blockchain import (
    generate_mnemonic,
    mnemonic_to_keypair,
    hash_mnemonic,
    verify_mnemonic,
    public_key_to_hex,
)
from app.config import settings
from app.database import get_session
from app.models import AuditLog, User
from app.schemas import (
    KeypairResponse,
    LinkWalletRequest,
    PublicKeyResponse,
    RecoverKeypairRequest,
    UserPublic,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["users"])

BANKER_URL = settings.banker_url if hasattr(settings, "banker_url") else "http://127.0.0.1:8700"


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
    mnemonic_phrase = generate_mnemonic()
    priv_raw, pub_raw = mnemonic_to_keypair(mnemonic_phrase)
    user.ed25519_public_key = pub_raw
    user.seed_phrase_hash = hash_mnemonic(mnemonic_phrase)
    await session.flush()
    return KeypairResponse(
        private_key_hex=priv_raw.hex(),
        public_key_hex=pub_raw.hex(),
        seed_phrase=mnemonic_phrase,
    )


@router.post("/me/recover-keypair")
async def recover_keypair(
    req: RecoverKeypairRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> KeypairResponse:
    mnemonic_phrase = req.seed_phrase.strip().lower()

    from mnemonic import Mnemonic
    if not Mnemonic("english").check(mnemonic_phrase):
        raise HTTPException(status_code=400, detail="Invalid seed phrase. Please check all 12 words.")

    priv_raw, pub_raw = mnemonic_to_keypair(mnemonic_phrase)
    user.ed25519_public_key = pub_raw
    user.seed_phrase_hash = hash_mnemonic(mnemonic_phrase)
    await session.flush()
    return KeypairResponse(
        private_key_hex=priv_raw.hex(),
        public_key_hex=pub_raw.hex(),
        seed_phrase=mnemonic_phrase,
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


class DeleteAccountRequest(BaseModel):
    password: str


@router.delete("/me")
async def delete_account(
    req: DeleteAccountRequest,
    request: Request,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect password")

    user.is_suspended = True
    user.suspended_reason = "Account deleted by user"
    user.username = f"deleted_{user.id.hex[:8]}"
    user.email = f"deleted_{user.id.hex[:8]}@deleted.local"
    user.password_hash = hash_password(f"deleted-{user.id.hex[:8]}")
    user.first_name = ""
    user.last_name = ""
    user.bio = None
    user.wallet_address = None
    user.ed25519_public_key = None
    user.seed_phrase_hash = None

    session.add(
        AuditLog(
            user_id=user.id,
            action="account_deleted",
            ip_address=request.client.host if request.client else None,
        )
    )
    await session.flush()
    return {"status": "account_deleted"}


@router.get("/me/payments")
async def get_my_payments(
    user: User = Depends(get_current_user),
):
    try:
        req = urllib.request.Request(
            f"{BANKER_URL}/subscriptions?user_id={user.id}",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            subscriptions = data.get("subscriptions", [])
            all_payments = []
            for sub in subscriptions:
                sub_id = sub.get("id", "")
                if sub_id:
                    try:
                        pay_req = urllib.request.Request(
                            f"{BANKER_URL}/subscriptions/{sub_id}/payments",
                            headers={"Content-Type": "application/json"},
                        )
                        with urllib.request.urlopen(pay_req, timeout=10) as pay_resp:
                            pay_data = json.loads(pay_resp.read().decode())
                            payments = pay_data.get("payments", [])
                            for p in payments:
                                p["subscription_id"] = sub_id
                                p["tier_name"] = sub.get("tier_id", "")
                            all_payments.extend(payments)
                    except Exception:
                        pass
            return {"payments": all_payments, "subscriptions": subscriptions}
    except Exception as e:
        return {"payments": [], "subscriptions": [], "error": str(e)}
