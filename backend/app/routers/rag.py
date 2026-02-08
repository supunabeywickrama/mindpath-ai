from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select, text as sql_text

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.rag_models import RagDocument, RagChunk
from app.embeddings import embed_texts
from app.auth import get_current_user

router = APIRouter(prefix="/rag", tags=["rag"])


def vec_to_pgvector(v: list[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in v) + "]"


def chunk_text(s: str, max_chars: int = 900, overlap: int = 120) -> list[str]:
    s = (s or "").strip()
    if not s:
        return []
    out = []
    i = 0
    step = max(1, max_chars - overlap)
    while i < len(s):
        out.append(s[i : i + max_chars])
        i += step
    return out


class IngestRequest(BaseModel):
    title: str
    source: str = "manual"
    content: str


class IngestResponse(BaseModel):
    doc_id: int
    chunks: int


@router.post("/ingest", response_model=IngestResponse)
def ingest(payload: IngestRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    title = (payload.title or "").strip() or "Untitled"
    source = (payload.source or "").strip() or "manual"
    content = (payload.content or "").strip()

    doc = RagDocument(title=title, source=source)
    db.add(doc)
    db.commit()
    db.refresh(doc)

    chunks = chunk_text(content)
    if not chunks:
        return {"doc_id": doc.id, "chunks": 0}

    vecs = embed_texts(chunks)

    for idx, (c, v) in enumerate(zip(chunks, vecs)):
        ch = RagChunk(doc_id=doc.id, chunk_index=idx, content=c)
        db.add(ch)
        db.flush()  # populate ch.id

        # IMPORTANT: cast to vector so we don't send numeric[] into pgvector operators
        db.execute(
            sql_text("UPDATE rag_chunks SET embedding = (:emb)::vector WHERE id = :id"),
            {"emb": vec_to_pgvector(v), "id": ch.id},
        )

    db.commit()
    return {"doc_id": doc.id, "chunks": len(chunks)}


class SearchRequest(BaseModel):
    query: str
    k: int = 5


class SearchHit(BaseModel):
    chunk_id: int
    doc_id: int
    content: str
    score: float


@router.post("/search", response_model=list[SearchHit])
def search(payload: SearchRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = (payload.query or "").strip()
    if not q:
        return []

    k = max(1, min(payload.k, 10))

    qvec = vec_to_pgvector(embed_texts([q])[0])

    rows = db.execute(
        sql_text(
            """
            SELECT id, doc_id, content,
                   1 - (embedding <=> (:qvec)::vector) AS score
            FROM rag_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> (:qvec)::vector
            LIMIT :k
            """
        ),
        {"qvec": qvec, "k": k},
    ).fetchall()

    return [
        {"chunk_id": r[0], "doc_id": r[1], "content": r[2], "score": float(r[3])}
        for r in rows
    ]
