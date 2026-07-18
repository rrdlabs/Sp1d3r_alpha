from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cityhall:cityhall@localhost:5432/cityhall"
    jwt_secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440
    chain_state_path: str = ""
    allowed_origins: list[str] = ["*"]
    rate_limit_enabled: bool = True
    rate_limit_max_requests: int = 60
    rate_limit_window_seconds: int = 60
    banker_url: str = "http://127.0.0.1:8700"
    director_url: str = "http://127.0.0.1:8400"
    internal_api_key: str = "CHANGE_ME_IN_PRODUCTION"

    model_config = {"env_prefix": "CITYHALL_"}


settings = Settings()
