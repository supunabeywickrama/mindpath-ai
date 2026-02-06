"""add rag tables

Revision ID: 846a741a97c7
Revises: a1b6ec20ca55
Create Date: 2026-02-07 01:44:00.060834
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "846a741a97c7"
down_revision: Union[str, Sequence[str], None] = "a1b6ec20ca55"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ensure pgvector extension exists
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "rag_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("source", sa.String(length=200), nullable=False, server_default="manual"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_rag_documents_id", "rag_documents", ["id"])

    op.create_table(
        "rag_chunks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doc_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["doc_id"], ["rag_documents.id"]),
    )
    op.create_index("ix_rag_chunks_id", "rag_chunks", ["id"])
    op.create_index("ix_rag_chunks_doc_id", "rag_chunks", ["doc_id"])

    # Add embedding column (1536 dims for text-embedding-3-small)
    op.execute("ALTER TABLE rag_chunks ADD COLUMN embedding vector(1536)")

    # Vector index (IVFFLAT)
    op.execute(
        "CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx "
        "ON rag_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS rag_chunks_embedding_idx")
    op.drop_table("rag_chunks")
    op.drop_table("rag_documents")
