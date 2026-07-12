import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.config import settings
from app.database import get_session
from app.models import User, ReputationScore, ReputationEvent
from app.schemas import ReputationScoreResponse, ReputationEventResponse, ReputationAttestRequest

router = APIRouter(prefix="/reputation", tags=["reputation"])

BADGE_THRESHOLDS = [
    (80, "trusted"),
    (60, "established"),
    (40, "active"),
    (20, "newcomer"),
    (0, "unranked"),
]


def _compute_composite(platform: int, onchain: int) -> int:
    return int(platform * 0.6 + onchain * 0.4)


def _assign_badges(composite: int) -> list[str]:
    for threshold, name in BADGE_THRESHOLDS:
        if composite >= threshold:
            return [name]
    return ["unranked"]


async def _recalculate_user(user_id: uuid.UUID, session: AsyncSession):
    now = datetime.now(timezone.utc)

    user_result = await session.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        return

    platform = 0

    if user.trial_started_at or user.trial_searches_used > 0:
        platform += 10

    if user.signup_date:
        days = (now - user.signup_date).days
        platform += min(days, 30)

    if user.is_nodeop:
        platform += 20
    if user.wallet_address:
        platform += 10

    events_result = await session.execute(
        select(func.sum(ReputationEvent.points)).where(
            ReputationEvent.user_id == user_id,
            ReputationEvent.event_type.in_(["search", "document", "node_uptime", "subscription"]),
        )
    )
    event_points = events_result.scalar() or 0
    platform += min(event_points, 40)
    platform = min(platform, 100)

    onchain_events = await session.execute(
        select(func.sum(ReputationEvent.points)).where(
            ReputationEvent.user_id == user_id,
            ReputationEvent.event_type == "attestation",
        )
    )
    onchain = min(onchain_events.scalar() or 0, 100)

    composite = _compute_composite(platform, onchain)
    badges = _assign_badges(composite)

    score_result = await session.execute(select(ReputationScore).where(ReputationScore.user_id == user_id))
    score = score_result.scalar_one_or_none()
    if not score:
        score = ReputationScore(user_id=user_id)
        session.add(score)

    score.platform_score = platform
    score.onchain_score = onchain
    score.composite_score = composite
    score.badges = badges
    score.last_calculated = now
    await session.flush()


@router.get("", response_model=ReputationScoreResponse)
async def get_reputation(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(ReputationScore).where(ReputationScore.user_id == user.id))
    score = result.scalar_one_or_none()
    if not score:
        await _recalculate_user(user.id, session)
        result = await session.execute(select(ReputationScore).where(ReputationScore.user_id == user.id))
        score = result.scalar_one_or_none()
        if not score:
            return ReputationScoreResponse(
                user_id=user.id, platform_score=0, onchain_score=0, composite_score=0,
                badges=["unranked"], last_calculated=None,
            )
    return score


@router.post("/recalculate")
async def recalculate_reputation(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    await _recalculate_user(user.id, session)
    result = await session.execute(select(ReputationScore).where(ReputationScore.user_id == user.id))
    score = result.scalar_one_or_none()
    return {"ok": True, "composite_score": score.composite_score if score else 0}


@router.get("/events", response_model=list[ReputationEventResponse])
async def list_events(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(ReputationEvent).where(ReputationEvent.user_id == user.id).order_by(ReputationEvent.created_at.desc()).limit(100)
    )
    return result.scalars().all()


@router.post("/attest", response_model=ReputationEventResponse, status_code=201)
async def attest_event(
    body: ReputationAttestRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    request: Request = None,
):
    api_key = request.headers.get("X-Internal-Key", "") if request else ""
    if api_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="forbidden")

    event = ReputationEvent(
        user_id=user.user_id,
        event_type="attestation",
        points=body.points,
        description=body.description,
        attestation_tx_hash=body.tx_hash,
    )
    session.add(event)
    await session.flush()
    await _recalculate_user(body.user_id, session)
    return event


@router.post("/internal/event")
async def internal_record_event(
    body: dict,
    request: Request,
):
    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        raise HTTPException(status_code=403, detail="forbidden")

    from app.database import async_session
    async with async_session() as session:
        event = ReputationEvent(
            user_id=uuid.UUID(body["user_id"]),
            event_type=body["event_type"],
            points=body.get("points", 0),
            description=body.get("description", ""),
        )
        session.add(event)
        await session.flush()
        await _recalculate_user(uuid.UUID(body["user_id"]), session)
    return {"ok": True}
