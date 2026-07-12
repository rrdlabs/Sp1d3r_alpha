import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserSignature
from app.schemas import SignatureCreate, SignatureResponse, SignatureUpdate

router = APIRouter(prefix="/signatures", tags=["signatures"])


@router.get("", response_model=list[SignatureResponse])
async def list_signatures(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(UserSignature).where(UserSignature.user_id == user.id).order_by(UserSignature.is_default.desc(), UserSignature.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=SignatureResponse, status_code=201)
async def create_signature(
    body: SignatureCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if body.is_default:
        existing = await session.execute(select(UserSignature).where(UserSignature.user_id == user.id, UserSignature.is_default == True))
        for sig in existing.scalars().all():
            sig.is_default = False

    sig = UserSignature(
        user_id=user.id,
        label=body.label or "default",
        signature_image=body.signature_image,
        signature_text=body.signature_text,
        is_default=body.is_default,
    )
    session.add(sig)
    await session.flush()
    return sig


@router.patch("/{signature_id}", response_model=SignatureResponse)
async def update_signature(
    signature_id: uuid.UUID,
    body: SignatureUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserSignature).where(UserSignature.id == signature_id, UserSignature.user_id == user.id))
    sig = result.scalar_one_or_none()
    if not sig:
        raise HTTPException(status_code=404, detail="signature not found")

    if body.label is not None:
        sig.label = body.label
    if body.signature_image is not None:
        sig.signature_image = body.signature_image
    if body.signature_text is not None:
        sig.signature_text = body.signature_text
    if body.is_default is not None:
        if body.is_default:
            existing = await session.execute(select(UserSignature).where(UserSignature.user_id == user.id, UserSignature.is_default == True))
            for s in existing.scalars().all():
                s.is_default = False
        sig.is_default = body.is_default

    await session.flush()
    return sig


@router.delete("/{signature_id}", status_code=204)
async def delete_signature(
    signature_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserSignature).where(UserSignature.id == signature_id, UserSignature.user_id == user.id))
    sig = result.scalar_one_or_none()
    if not sig:
        raise HTTPException(status_code=404, detail="signature not found")
    await session.delete(sig)
    await session.flush()
