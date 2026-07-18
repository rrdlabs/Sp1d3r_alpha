from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import RateLimitMiddleware
from app.routers import auth, users, admin, signatures, documents, keywords, reputation

app = FastAPI(
    title="CityHall — d31337m3 Onboarding Gateway",
    description=(
        "Pre-launch node operator onboarding, user auth, profile management, "
        "and blockchain identity linking for the d31337m3 network."
    ),
    version="0.5.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if settings.rate_limit_enabled:
    app.add_middleware(RateLimitMiddleware, max_requests=settings.rate_limit_max_requests, window_seconds=settings.rate_limit_window_seconds)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(signatures.router)
app.include_router(documents.router)
app.include_router(keywords.router)
app.include_router(reputation.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cityhall"}


@app.get("/internal/node-check")
async def internal_node_check(user_id: str):
    from uuid import UUID
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"is_nodeop": False, "error": "invalid_user_id"}

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"is_nodeop": False}
        return {
            "is_nodeop": user.is_nodeop,
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "node_pubkey": user.node_pubkey,
        }


TRIAL_DAILY_LIMIT = 1
TRIAL_MAX_DAYS = 7


@app.get("/internal/trial-status")
async def internal_trial_status(user_id: str, request: Request):
    from uuid import UUID
    from datetime import datetime, timezone, timedelta
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"trial_available": False, "error": "invalid_user_id"}

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"trial_available": False, "trial_used_up": True}

        now = datetime.now(timezone.utc)
        if user.trial_started_at is None:
            return {"trial_available": True, "trial_used_up": False, "searches_used": 0, "days_remaining": TRIAL_MAX_DAYS}

        elapsed = now - user.trial_started_at
        if elapsed.days >= TRIAL_MAX_DAYS:
            return {"trial_available": False, "trial_used_up": True, "searches_used": user.trial_searches_used, "days_remaining": 0}

        days_remaining = TRIAL_MAX_DAYS - elapsed.days
        searches_today = user.trial_searches_used if elapsed.days == 0 else 0
        if elapsed.days > 0:
            searches_today = user.trial_searches_used  # simplified: total used within window

        can_search = user.trial_searches_used < TRIAL_MAX_DAYS and searches_today < TRIAL_DAILY_LIMIT
        return {
            "trial_available": can_search,
            "trial_used_up": user.trial_searches_used >= TRIAL_MAX_DAYS,
            "searches_used": user.trial_searches_used,
            "searches_remaining": max(0, TRIAL_MAX_DAYS - user.trial_searches_used),
            "days_remaining": days_remaining,
        }


@app.post("/internal/trial-mark-used")
async def internal_trial_mark_used(user_id: str, request: Request):
    from uuid import UUID
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"error": "invalid_user_id"}

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "user_not_found"}

        now = datetime.now(timezone.utc)
        if user.trial_started_at is None:
            user.trial_started_at = now
        user.trial_searches_used += 1
        await session.flush()
        return {"ok": True, "searches_used": user.trial_searches_used}


@app.post("/internal/node-pubkey")
async def internal_set_node_pubkey(request: Request):
    from uuid import UUID
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    body = await request.json()
    user_id = body.get("user_id", "")
    node_pubkey = body.get("node_pubkey", "")

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"error": "invalid_user_id"}

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "user_not_found"}

        user.node_pubkey = node_pubkey
        await session.flush()
        return {"ok": True}


@app.get("/internal/user-id-for-pubkey")
async def internal_user_id_for_pubkey(pubkey: str, request: Request):
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.node_pubkey == pubkey))
        user = result.scalar_one_or_none()
        if not user:
            return {"user_id": None}
        return {"user_id": str(user.id)}


SYSTEM_SEARCH_LIMITS = {
    "free": 100,
    "starter": 500,
    "pro": 2000,
    "enterprise": 10000,
}


@app.get("/internal/system-search-status")
async def internal_system_search_status(user_id: str, tier: str = "free", request: Request = None):
    from uuid import UUID
    from datetime import datetime, timezone
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"allowed": False, "error": "invalid_user_id"}

    now = datetime.now(timezone.utc)
    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"allowed": False, "error": "user_not_found"}

        limit = SYSTEM_SEARCH_LIMITS.get(tier, SYSTEM_SEARCH_LIMITS["free"])

        if user.system_searches_period_start is None:
            user.system_searches_period_start = now
            user.system_searches_used = 0
            user.system_search_limit = limit
            await session.flush()
            return {
                "allowed": True,
                "searches_used": 0,
                "searches_remaining": limit,
                "limit": limit,
                "tier": tier,
                "period_start": now.isoformat(),
            }

        period_elapsed = now - user.system_searches_period_start
        if period_elapsed.days >= 30:
            user.system_searches_period_start = now
            user.system_searches_used = 0
            user.system_search_limit = limit
            await session.flush()
            return {
                "allowed": True,
                "searches_used": 0,
                "searches_remaining": limit,
                "limit": limit,
                "tier": tier,
                "period_start": now.isoformat(),
            }

        if user.system_search_limit != limit:
            user.system_search_limit = limit

        can_search = user.system_searches_used < user.system_search_limit
        return {
            "allowed": can_search,
            "searches_used": user.system_searches_used,
            "searches_remaining": max(0, user.system_search_limit - user.system_searches_used),
            "limit": user.system_search_limit,
            "tier": tier,
            "period_start": user.system_searches_period_start.isoformat() if user.system_searches_period_start else None,
        }


@app.post("/internal/system-search-mark-used")
async def internal_system_search_mark_used(user_id: str, request: Request):
    from uuid import UUID
    from sqlalchemy import select
    from app.database import get_session
    from app.models import User

    api_key = request.headers.get("X-Internal-Key", "")
    if api_key != settings.internal_api_key:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=403, content={"error": "forbidden"})

    try:
        uid = UUID(user_id)
    except ValueError:
        return {"error": "invalid_user_id"}

    session_factory = get_session
    async for session in session_factory():
        result = await session.execute(select(User).where(User.id == uid))
        user = result.scalar_one_or_none()
        if not user:
            return {"error": "user_not_found"}

        user.system_searches_used += 1
        await session.flush()
        return {"ok": True, "searches_used": user.system_searches_used, "limit": user.system_search_limit}
