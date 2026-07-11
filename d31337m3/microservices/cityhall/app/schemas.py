import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, model_validator


# ---------------------------------------------------------------------------
# Auth / Onboarding
# ---------------------------------------------------------------------------

class OnboardingRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str = Field(..., min_length=8)

    volunteer_node_op: bool = False
    volunteer_tech_support: bool = False
    volunteer_chat_support: bool = False
    has_high_speed_connection: bool = False
    always_on_available: bool = False

    founder_subscript: str | None = Field(None, max_length=50)
    referral_code: str | None = Field(None, max_length=50)
    bio: str | None = Field(None, max_length=2000)
    extra_fields: dict = {}

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("passwords do not match")
        return self


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str


class ChallengeResponse(BaseModel):
    challenge: str


class AuthenticateWithKeyRequest(BaseModel):
    public_key_hex: str
    challenge: str
    signature: str


class AuthVerifyResponse(BaseModel):
    verified: bool
    user_id: str | None = None


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

class LinkWalletRequest(BaseModel):
    wallet_address: str


class KeypairResponse(BaseModel):
    private_key_hex: str
    public_key_hex: str
    warning: str = "Store your private key securely. It will not be shown again."


class PublicKeyResponse(BaseModel):
    public_key_hex: str


# ---------------------------------------------------------------------------
# User read / write schemas
# ---------------------------------------------------------------------------

class UserPublic(BaseModel):
    id: uuid.UUID
    username: str
    first_name: str
    last_name: str
    email: str
    avatar_url: str | None = None
    bio: str | None = None
    is_nodeop: bool = False
    is_tech_op: bool = False
    is_chat_op: bool = False
    wallet_address: str | None = None
    signup_date: datetime | None = None
    enrollment_data: dict = {}
    extra_fields: dict = {}

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    bio: str | None = Field(None, max_length=2000)
    avatar_url: str | None = Field(None, max_length=1024)
    wallet_address: str | None = None
    extra_fields: dict | None = None


class UserAdmin(UserPublic):
    is_user: bool = True
    is_employee: bool = False
    is_admin: bool = False
    is_super_admin: bool = False
    is_suspended: bool = False
    founder_subscript: str | None = None
    referral_code: str | None = None
    referred_by_code: str | None = None
    public_key_hex: str | None = None
    dob: date | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class SuspendRequest(BaseModel):
    reason: str | None = None


class AdminCreateUserRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    is_nodeop: bool = False
    is_tech_op: bool = False
    is_chat_op: bool = False
    is_user: bool = True
    is_employee: bool = False
    is_admin: bool = False
    is_super_admin: bool = False
    dob: date | None = None


class AdminUserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    bio: str | None = Field(None, max_length=2000)
    avatar_url: str | None = None
    wallet_address: str | None = None
    is_nodeop: bool | None = None
    is_tech_op: bool | None = None
    is_chat_op: bool | None = None
    is_user: bool | None = None
    is_employee: bool | None = None
    is_admin: bool | None = None
    is_super_admin: bool | None = None
    founder_subscript: str | None = None
    referral_code: str | None = None
    referred_by_code: str | None = None
    extra_fields: dict | None = None


# ---------------------------------------------------------------------------
# Pagination / list
# ---------------------------------------------------------------------------

class PaginatedUsers(BaseModel):
    items: list[UserAdmin]
    total: int
    page: int
    page_size: int
