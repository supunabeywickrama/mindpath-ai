from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "497736de0586"
down_revision = "878080f99563"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns if they don't exist
    op.add_column("habits", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key("fk_habits_user_id", "habits", "users", ["user_id"], ["id"], ondelete="CASCADE")
    op.create_index(op.f("ix_habits_user_id"), "habits", ["user_id"], unique=False)

    # Make it NOT NULL after backfill (if table already had rows)
    op.execute("UPDATE habits SET user_id = 1 WHERE user_id IS NULL")
    op.alter_column("habits", "user_id", nullable=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_habits_user_id"), table_name="habits")
    op.drop_constraint("fk_habits_user_id", "habits", type_="foreignkey")
    op.drop_column("habits", "user_id")
