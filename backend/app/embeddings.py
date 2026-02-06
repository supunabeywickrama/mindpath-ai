from app.config import settings
from app.llm import client

def embed_texts(texts: list[str]) -> list[list[float]]:
    # OpenAI embeddings
    res = client.embeddings.create(
        model=getattr(settings, "openai_embed_model", "text-embedding-3-small"),
        input=texts,
    )
    return [d.embedding for d in res.data]
