import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_session
from app.models import User, UserKeyword, KeywordMatch
from app.schemas import KeywordCreate, KeywordResponse, KeywordUpdate, KeywordMatchResponse, KeywordMatchBulk

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.get("", response_model=list[KeywordResponse])
async def list_keywords(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(UserKeyword).where(UserKeyword.user_id == user.id).order_by(UserKeyword.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=KeywordResponse, status_code=201)
async def create_keyword(
    body: KeywordCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    existing = await session.execute(
        select(UserKeyword).where(UserKeyword.user_id == user.id, UserKeyword.keyword == body.keyword)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="keyword already exists")

    kw = UserKeyword(
        user_id=user.id,
        keyword=body.keyword.strip(),
        notify_dashboard=body.notify_dashboard,
        notify_email=body.notify_email,
    )
    session.add(kw)
    await session.flush()
    return kw


@router.patch("/{keyword_id}", response_model=KeywordResponse)
async def update_keyword(
    keyword_id: uuid.UUID,
    body: KeywordUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserKeyword).where(UserKeyword.id == keyword_id, UserKeyword.user_id == user.id))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="keyword not found")

    if body.is_active is not None:
        kw.is_active = body.is_active
    if body.notify_dashboard is not None:
        kw.notify_dashboard = body.notify_dashboard
    if body.notify_email is not None:
        kw.notify_email = body.notify_email

    await session.flush()
    return kw


@router.delete("/{keyword_id}", status_code=204)
async def delete_keyword(
    keyword_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(UserKeyword).where(UserKeyword.id == keyword_id, UserKeyword.user_id == user.id))
    kw = result.scalar_one_or_none()
    if not kw:
        raise HTTPException(status_code=404, detail="keyword not found")
    await session.delete(kw)
    await session.flush()


@router.get("/matches", response_model=list[KeywordMatchResponse])
async def list_matches(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    unread_only: bool = False,
):
    q = select(KeywordMatch).where(KeywordMatch.user_id == user.id)
    if unread_only:
        q = q.where(KeywordMatch.is_read == False)
    result = await session.execute(q.order_by(KeywordMatch.discovered_at.desc()).limit(200))
    return result.scalars().all()


@router.get("/matches/unread-count")
async def unread_count(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(func.count()).select_from(KeywordMatch).where(KeywordMatch.user_id == user.id, KeywordMatch.is_read == False)
    )
    return {"count": result.scalar()}


@router.post("/matches/{match_id}/read")
async def mark_match_read(
    match_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(KeywordMatch).where(KeywordMatch.id == match_id, KeywordMatch.user_id == user.id))
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="match not found")
    match.is_read = True
    await session.flush()
    return {"ok": True}


@router.post("/matches/mark-all-read")
async def mark_all_read(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(KeywordMatch).where(KeywordMatch.user_id == user.id, KeywordMatch.is_read == False))
    for match in result.scalars().all():
        match.is_read = True
    await session.flush()
    return {"ok": True}


@router.post("/internal/match-bulk")
async def bulk_create_matches(body: KeywordMatchBulk):
    from app.database import async_session
    async with async_session() as session:
        for m in body.matches:
            kw_result = await session.execute(select(UserKeyword).where(UserKeyword.id == m.keyword_id, UserKeyword.is_active == True))
            kw = kw_result.scalar_one_or_none()
            if not kw:
                continue
            match = KeywordMatch(
                keyword_id=kw.id,
                user_id=kw.user_id,
                source_url=m.source_url,
                source_name=m.source_name,
                context_snippet=m.context_snippet,
                relevance_score=m.relevance_score,
            )
            session.add(match)
        await session.flush()
    return {"ok": True, "count": len(body.matches)}
