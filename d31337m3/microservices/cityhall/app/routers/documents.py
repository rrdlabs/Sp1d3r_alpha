import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserDocument, UserSignature, Broker
from app.schemas import DocumentCreate, DocumentResponse, DocumentUpdate

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(UserDocument).where(UserDocument.user_id == user.id).order_by(UserDocument.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserDocument).where(UserDocument.id == document_id, UserDocument.user_id == user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")
    return doc


@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    body: DocumentCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if body.signature_id:
        sig_result = await session.execute(select(UserSignature).where(UserSignature.id == body.signature_id, UserSignature.user_id == user.id))
        if not sig_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="signature not found")

    if body.broker_id:
        broker_result = await session.execute(select(Broker).where(Broker.id == body.broker_id))
        if not broker_result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="broker not found")

    doc = UserDocument(
        user_id=user.id,
        broker_id=body.broker_id,
        document_type=body.document_type,
        title=body.title,
        content=body.content,
        status=body.status or "draft",
        signature_id=body.signature_id,
        recipient_email=body.recipient_email,
        recipient_address=body.recipient_address,
        auto_submit=body.auto_submit,
        meta=body.meta or {},
    )
    session.add(doc)
    await session.flush()
    return doc


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    body: DocumentUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserDocument).where(UserDocument.id == document_id, UserDocument.user_id == user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")

    if body.title is not None:
        doc.title = body.title
    if body.content is not None:
        doc.content = body.content
    if body.status is not None:
        doc.status = body.status
    if body.signature_id is not None:
        doc.signature_id = body.signature_id
    if body.recipient_email is not None:
        doc.recipient_email = body.recipient_email
    if body.recipient_address is not None:
        doc.recipient_address = body.recipient_address
    if body.auto_submit is not None:
        doc.auto_submit = body.auto_submit
    if body.meta is not None:
        doc.meta = body.meta

    await session.flush()
    return doc


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserDocument).where(UserDocument.id == document_id, UserDocument.user_id == user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")
    await session.delete(doc)
    await session.flush()


@router.post("/{document_id}/generate", response_model=DocumentResponse)
async def generate_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserDocument).where(UserDocument.id == document_id, UserDocument.user_id == user.id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")

    sig_text = ""
    sig_image = ""
    if doc.signature_id:
        sig_result = await session.execute(select(UserSignature).where(UserSignature.id == doc.signature_id))
        sig = sig_result.scalar_one_or_none()
        if sig:
            sig_text = sig.signature_text or ""
            sig_image = sig.signature_image or ""

    user_result = await session.execute(select(User).where(User.id == user.id))
    u = user_result.scalar_one_or_none()

    sig_html = ""
    if sig_image:
        sig_html = f'<img src="{sig_image}" alt="Signature" style="max-height:80px;" />'
    elif sig_text:
        sig_html = f'<span style="font-family:cursive;font-size:1.4em;font-style:italic;">{sig_text}</span>'

    content = doc.content
    if "[SIGNATURE]" in content:
        content = content.replace("[SIGNATURE]", sig_html)
    else:
        content = content + "\n\n" + sig_html

    doc.content = content

    doc.meta = {
        **doc.meta,
        "generated_for": f"{u.first_name} {u.last_name}" if u else "",
        "generated_email": u.email if u else "",
        "signature_text": sig_text,
        "signature_image": sig_image,
        "signature_html": sig_html,
    }

    now = datetime.now(timezone.utc)
    if doc.auto_submit and doc.recipient_email:
        doc.status = "sent"
        doc.sent_at = now
        doc.meta["auto_submitted"] = True
        doc.meta["submitted_at"] = now.isoformat()
    else:
        doc.status = "generated"

    await session.flush()
    await session.refresh(doc)
    return doc
