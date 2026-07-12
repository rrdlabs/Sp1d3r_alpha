"""Add auto_submit to user_documents.

Revision ID: 010
Revises: 009
Create Date: 2026-07-12
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("user_documents", sa.Column("auto_submit", sa.Boolean, nullable=False, server_default=sa.text("false")))


def downgrade():
    op.drop_column("user_documents", "auto_submit")
