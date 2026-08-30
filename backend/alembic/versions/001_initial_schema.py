"""Initial Schema Setup

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-28 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

import app.models  # noqa: F401
from app.database import Base

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind, checkfirst=True)
