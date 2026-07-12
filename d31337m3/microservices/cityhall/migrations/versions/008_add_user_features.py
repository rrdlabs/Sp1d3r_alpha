"""Add user documents, keywords, reputation, and signatures.

Revision ID: 008
Revises: 007
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade():
    # user_signatures
    op.create_table(
        "user_signatures",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("label", sa.String(100), nullable=False, server_default="default"),
        sa.Column("signature_image", sa.Text, nullable=True),
        sa.Column("signature_text", sa.String(500), nullable=True),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # user_documents
    op.create_table(
        "user_documents",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("broker_id", sa.Integer, sa.ForeignKey("brokers.id"), nullable=True),
        sa.Column("document_type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("signature_id", UUID(as_uuid=True), sa.ForeignKey("user_signatures.id"), nullable=True),
        sa.Column("recipient_email", sa.String(320), nullable=True),
        sa.Column("recipient_address", sa.Text, nullable=True),
        sa.Column("meta", sa.JSON, nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # user_keywords
    op.create_table(
        "user_keywords",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("keyword", sa.String(255), nullable=False, index=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("notify_dashboard", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("notify_email", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # keyword_matches
    op.create_table(
        "keyword_matches",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("keyword_id", UUID(as_uuid=True), sa.ForeignKey("user_keywords.id"), nullable=False, index=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("source_url", sa.String(2048), nullable=False),
        sa.Column("source_name", sa.String(500), nullable=True),
        sa.Column("context_snippet", sa.Text, nullable=True),
        sa.Column("relevance_score", sa.Float, nullable=False, server_default=sa.text("0.0")),
        sa.Column("is_read", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("discovered_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # reputation_scores
    op.create_table(
        "reputation_scores",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), unique=True, nullable=False, index=True),
        sa.Column("platform_score", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("onchain_score", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("composite_score", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("badges", sa.JSON, nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("last_calculated", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # reputation_events
    op.create_table(
        "reputation_events",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("event_type", sa.String(50), nullable=False, index=True),
        sa.Column("points", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("description", sa.String(1000), nullable=False),
        sa.Column("attestation_tx_hash", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("reputation_events")
    op.drop_table("reputation_scores")
    op.drop_table("keyword_matches")
    op.drop_table("user_keywords")
    op.drop_table("user_documents")
    op.drop_table("user_signatures")
