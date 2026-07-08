"""Create users and audit_logs tables.

Revision ID: 001
Revises:
Create Date: 2026-07-07
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("first_name", sa.String(100), nullable=False),
        sa.Column("last_name", sa.String(100), nullable=False),
        sa.Column("dob", sa.Date, nullable=False),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("username", sa.String(100), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_nodeop", sa.Boolean, default=False, nullable=False),
        sa.Column("is_tech_op", sa.Boolean, default=False, nullable=False),
        sa.Column("is_chat_op", sa.Boolean, default=False, nullable=False),
        sa.Column("is_user", sa.Boolean, default=True, nullable=False),
        sa.Column("is_employee", sa.Boolean, default=False, nullable=False),
        sa.Column("is_admin", sa.Boolean, default=False, nullable=False),
        sa.Column("is_super_admin", sa.Boolean, default=False, nullable=False),
        sa.Column("signup_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("founder_subscript", sa.String(50), nullable=True),
        sa.Column("referral_code", sa.String(50), nullable=True, unique=True),
        sa.Column("referred_by_code", sa.String(50), nullable=True),
        sa.Column("ed25519_public_key", sa.LargeBinary(32), nullable=True),
        sa.Column("wallet_address", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.String(1024), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("enrollment_data", JSONB, default=dict, nullable=False),
        sa.Column("extra_fields", JSONB, default=dict, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])
    op.create_index("ix_users_referral_code", "users", ["referral_code"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("detail", JSONB, default=dict, nullable=False),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("audit_logs")
    op.drop_table("users")
