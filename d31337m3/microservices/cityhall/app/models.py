import uuid
from datetime import date, datetime

from sqlalchemy import JSON, String, Boolean, Date, DateTime, Text, LargeBinary, func, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    dob: Mapped[date] = mapped_column(Date)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))

    is_nodeop: Mapped[bool] = mapped_column(Boolean, default=False)
    is_tech_op: Mapped[bool] = mapped_column(Boolean, default=False)
    is_chat_op: Mapped[bool] = mapped_column(Boolean, default=False)
    is_user: Mapped[bool] = mapped_column(Boolean, default=True)
    is_employee: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_suspended: Mapped[bool] = mapped_column(Boolean, default=False)
    suspended_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    signup_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    founder_subscript: Mapped[str | None] = mapped_column(String(50), nullable=True)
    referral_code: Mapped[str | None] = mapped_column(String(50), nullable=True, unique=True)
    referred_by_code: Mapped[str | None] = mapped_column(String(50), nullable=True)

    ed25519_public_key: Mapped[bytes | None] = mapped_column(LargeBinary(32), nullable=True)
    wallet_address: Mapped[str | None] = mapped_column(String(255), nullable=True)

    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verification_token: Mapped[str | None] = mapped_column(String(255), nullable=True)

    trial_searches_used: Mapped[int] = mapped_column(default=0)
    trial_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    node_pubkey: Mapped[str | None] = mapped_column(String(255), nullable=True)

    enrollment_data: Mapped[dict] = mapped_column(JSON, default=dict)
    extra_fields: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Broker(Base):
    __tablename__ = "brokers"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100), default="data_broker")
    website: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    opt_out_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class NodeEnrollToken(Base):
    __tablename__ = "node_enroll_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    used_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    detail: Mapped[dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OTPCode(Base):
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    code: Mapped[str] = mapped_column(String(6))
    purpose: Mapped[str] = mapped_column(String(20))
    device_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# User Signature (for document generation)
# ---------------------------------------------------------------------------

class UserSignature(Base):
    __tablename__ = "user_signatures"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    label: Mapped[str] = mapped_column(String(100), default="default")
    signature_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    signature_text: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# User Document (opt-out / removal letters)
# ---------------------------------------------------------------------------

class UserDocument(Base):
    __tablename__ = "user_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    broker_id: Mapped[int | None] = mapped_column(ForeignKey("brokers.id"), nullable=True)
    document_type: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    signature_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("user_signatures.id"), nullable=True)
    recipient_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    recipient_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# User Keyword (tracked keywords for scraping)
# ---------------------------------------------------------------------------

class UserKeyword(Base):
    __tablename__ = "user_keywords"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    keyword: Mapped[str] = mapped_column(String(255), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_dashboard: Mapped[bool] = mapped_column(Boolean, default=True)
    notify_email: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Keyword Match (discovered results)
# ---------------------------------------------------------------------------

class KeywordMatch(Base):
    __tablename__ = "keyword_matches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    keyword_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("user_keywords.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    source_url: Mapped[str] = mapped_column(String(2048))
    source_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    context_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    relevance_score: Mapped[float] = mapped_column(default=0.0)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Reputation Score (composite score per user)
# ---------------------------------------------------------------------------

class ReputationScore(Base):
    __tablename__ = "reputation_scores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, index=True)
    platform_score: Mapped[int] = mapped_column(default=0)
    onchain_score: Mapped[int] = mapped_column(default=0)
    composite_score: Mapped[int] = mapped_column(default=0)
    badges: Mapped[dict] = mapped_column(JSON, default=list)
    last_calculated: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ---------------------------------------------------------------------------
# Reputation Event (individual scoring events)
# ---------------------------------------------------------------------------

class ReputationEvent(Base):
    __tablename__ = "reputation_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(50), index=True)
    points: Mapped[int] = mapped_column(default=0)
    description: Mapped[str] = mapped_column(String(1000))
    attestation_tx_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
