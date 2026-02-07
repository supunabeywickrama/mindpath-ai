from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "49680deb310f"
down_revision = "846a741a97c7"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "user_memories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("source_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
    )
    op.create_index("ix_user_memories_id", "user_memories", ["id"])
    op.create_index("ix_user_memories_user_id", "user_memories", ["user_id"])

    op.execute("ALTER TABLE user_memories ADD COLUMN embedding vector(1536)")
    op.execute(
        "CREATE INDEX IF NOT EXISTS user_memories_embedding_idx "
        "ON user_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

def downgrade():
    op.execute("DROP INDEX IF EXISTS user_memories_embedding_idx")
    op.drop_table("user_memories")