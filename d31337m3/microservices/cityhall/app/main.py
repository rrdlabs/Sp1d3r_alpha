from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, admin

app = FastAPI(
    title="CityHall — d31337m3 Onboarding Gateway",
    description=(
        "Pre-launch node operator onboarding, user auth, profile management, "
        "and blockchain identity linking for the d31337m3 network."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "cityhall"}
