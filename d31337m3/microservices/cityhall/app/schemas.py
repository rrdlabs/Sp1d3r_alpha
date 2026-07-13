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
    is_admin: bool = False


class OTPRequiredResponse(BaseModel):
    requires_otp: bool = True
    user_id: str
    username: str
    purpose: str
    email_hint: str


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
    seed_phrase: str
    warning: str = "Store your private key and seed phrase securely. They will not be shown again."
    seed_warning: str = "Your seed phrase can recover your keypair if lost. Write it down and store it offline."


class RecoverKeypairRequest(BaseModel):
    seed_phrase: str = Field(..., min_length=1)


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
    phone: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    ssn_last4: str | None = None
    is_nodeop: bool = False
    is_tech_op: bool = False
    is_chat_op: bool = False
    wallet_address: str | None = None
    signup_date: datetime | None = None
    enrollment_data: dict = {}
    extra_fields: dict = {}
    trial_searches_used: int = 0
    trial_started_at: datetime | None = None
    node_pubkey: str | None = None
    system_searches_used: int = 0
    system_search_limit: int = 100
    system_searches_period_start: datetime | None = None

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    first_name: str | None = Field(None, min_length=1, max_length=100)
    last_name: str | None = Field(None, min_length=1, max_length=100)
    email: EmailStr | None = None
    bio: str | None = Field(None, max_length=2000)
    avatar_url: str | None = Field(None, max_length=1024)
    wallet_address: str | None = None
    phone: str | None = Field(None, max_length=50)
    address_line1: str | None = Field(None, max_length=500)
    address_line2: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=200)
    state: str | None = Field(None, max_length=100)
    zip_code: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    ssn_last4: str | None = Field(None, min_length=4, max_length=4)
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
# Node enrollment tokens
# ---------------------------------------------------------------------------

class NodeTokenCreateRequest(BaseModel):
    note: str | None = None
    expires_at: datetime | None = None


class NodeTokenUseRequest(BaseModel):
    token: str
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    dob: date


# ---------------------------------------------------------------------------
# Pagination / list
# ---------------------------------------------------------------------------

class PaginatedUsers(BaseModel):
    items: list[UserAdmin]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Broker schemas
# ---------------------------------------------------------------------------

class BrokerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    category: str = "data_broker"
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    country: str | None = None
    state: str | None = None
    opt_out_url: str | None = None
    notes: str | None = None
    is_active: bool = True
    extra_data: dict = {}


class BrokerUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    display_name: str | None = Field(None, min_length=1, max_length=255)
    category: str | None = None
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    country: str | None = None
    state: str | None = None
    opt_out_url: str | None = None
    notes: str | None = None
    is_active: bool | None = None
    extra_data: dict | None = None


class BrokerAdmin(BaseModel):
    id: int
    name: str
    display_name: str
    category: str
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    country: str | None = None
    state: str | None = None
    opt_out_url: str | None = None
    notes: str | None = None
    is_active: bool = True
    extra_data: dict = {}
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


class BrokerCsvRow(BaseModel):
    name: str
    display_name: str | None = None
    category: str = "data_broker"
    website: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    country: str | None = None
    state: str | None = None
    opt_out_url: str | None = None
    notes: str | None = None


class BrokerCsvUpload(BaseModel):
    brokers: list[BrokerCsvRow]


# ---------------------------------------------------------------------------
# OTP
# ---------------------------------------------------------------------------

class OTPVerifyRequest(BaseModel):
    user_id: str
    code: str = Field(..., min_length=6, max_length=6)
    purpose: str
    device_id: str | None = None


# ---------------------------------------------------------------------------
# Signatures
# ---------------------------------------------------------------------------

class SignatureCreate(BaseModel):
    label: str | None = Field("default", max_length=100)
    signature_image: str | None = None
    signature_text: str | None = Field(None, max_length=500)
    is_default: bool = False


class SignatureUpdate(BaseModel):
    label: str | None = Field(None, max_length=100)
    signature_image: str | None = None
    signature_text: str | None = Field(None, max_length=500)
    is_default: bool | None = None


class SignatureResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    label: str
    signature_image: str | None = None
    signature_text: str | None = None
    is_default: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------

class DocumentCreate(BaseModel):
    broker_id: int | None = None
    document_type: str = Field(..., max_length=50)
    title: str = Field(..., max_length=500)
    content: str
    status: str | None = Field(None, max_length=20)
    signature_id: uuid.UUID | None = None
    recipient_email: str | None = None
    recipient_address: str | None = None
    auto_submit: bool = False
    meta: dict | None = None


class DocumentUpdate(BaseModel):
    title: str | None = Field(None, max_length=500)
    content: str | None = None
    status: str | None = Field(None, max_length=20)
    signature_id: uuid.UUID | None = None
    recipient_email: str | None = None
    recipient_address: str | None = None
    auto_submit: bool | None = None
    meta: dict | None = None


class DocumentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    broker_id: int | None = None
    document_type: str
    title: str
    content: str
    status: str
    signature_id: uuid.UUID | None = None
    recipient_email: str | None = None
    recipient_address: str | None = None
    auto_submit: bool = False
    meta: dict = {}
    sent_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Keywords
# ---------------------------------------------------------------------------

class KeywordCreate(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    notify_dashboard: bool = True
    notify_email: bool = False


class KeywordUpdate(BaseModel):
    is_active: bool | None = None
    notify_dashboard: bool | None = None
    notify_email: bool | None = None


class KeywordResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    keyword: str
    is_active: bool = True
    notify_dashboard: bool = True
    notify_email: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None
    model_config = {"from_attributes": True}


class KeywordMatchResponse(BaseModel):
    id: uuid.UUID
    keyword_id: uuid.UUID
    user_id: uuid.UUID
    source_url: str
    source_name: str | None = None
    context_snippet: str | None = None
    relevance_score: float = 0.0
    is_read: bool = False
    discovered_at: datetime | None = None
    model_config = {"from_attributes": True}


class KeywordMatchItem(BaseModel):
    keyword_id: uuid.UUID
    source_url: str
    source_name: str | None = None
    context_snippet: str | None = None
    relevance_score: float = 0.0


class KeywordMatchBulk(BaseModel):
    matches: list[KeywordMatchItem]


# ---------------------------------------------------------------------------
# Reputation
# ---------------------------------------------------------------------------

class ReputationScoreResponse(BaseModel):
    user_id: uuid.UUID
    platform_score: int = 0
    onchain_score: int = 0
    composite_score: int = 0
    badges: list[str] = []
    last_calculated: datetime | None = None
    model_config = {"from_attributes": True}


class ReputationEventResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    event_type: str
    points: int = 0
    description: str
    attestation_tx_hash: str | None = None
    created_at: datetime | None = None
    model_config = {"from_attributes": True}


class ReputationAttestRequest(BaseModel):
    user_id: uuid.UUID
    points: int = Field(..., ge=1, le=100)
    description: str = Field(..., max_length=1000)
    tx_hash: str | None = Field(None, max_length=255)
