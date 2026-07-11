from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import RateLimitMiddleware
from app.routers import auth, users, admin

app = FastAPI(
    title="CityHall — d31337m3 Onboarding Gateway",
    description=(
        "Pre-launch node operator onboarding, user auth, profile management, "
        "and blockchain identity linking for the d31337m3 network."
    ),
    version="0.2.0",
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
        }
