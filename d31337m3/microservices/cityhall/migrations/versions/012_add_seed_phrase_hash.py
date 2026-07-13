"""Add seed_phrase_hash column to users table."""

from alembic import op
import sqlalchemy as sa

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("seed_phrase_hash", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "seed_phrase_hash")
