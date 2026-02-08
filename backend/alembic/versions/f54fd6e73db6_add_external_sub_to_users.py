"""add external_sub to users

Revision ID: f54fd6e73db6
Revises: 497736de0586
Create Date: 2026-02-08 19:04:38.229079

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f54fd6e73db6'
down_revision: Union[str, Sequence[str], None] = '497736de0586'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
