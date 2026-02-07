"""add habits and habit_logs

Revision ID: 878080f99563
Revises: 49680deb310f
Create Date: 2026-02-07 15:38:53.247371

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "878080f99563"
down_revision = "49680deb310f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "habits",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("goal", sa.String(length=120), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index(op.f("ix_habits_user_id"), "habits", ["user_id"], unique=False)

    op.create_table(
        "habit_logs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("habit_id", sa.Integer(), sa.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("done", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_logs_habit_date"),
    )
    op.create_index(op.f("ix_habit_logs_user_id"), "habit_logs", ["user_id"], unique=False)
    op.create_index(op.f("ix_habit_logs_habit_id"), "habit_logs", ["habit_id"], unique=False)
    op.create_index(op.f("ix_habit_logs_date"), "habit_logs", ["date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_habit_logs_date"), table_name="habit_logs")
    op.drop_index(op.f("ix_habit_logs_habit_id"), table_name="habit_logs")
    op.drop_index(op.f("ix_habit_logs_user_id"), table_name="habit_logs")
    op.drop_table("habit_logs")

    op.drop_index(op.f("ix_habits_user_id"), table_name="habits")
    op.drop_table("habits")