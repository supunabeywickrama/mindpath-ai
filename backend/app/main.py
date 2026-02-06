from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.health import router as health_router

from app.routers.auth import router as auth_router
from app.routers.journal import router as journal_router
from app.routers.mood import router as moods_router

from app.routers.ai import router as ai_router


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(journal_router, prefix="/api")
    app.include_router(moods_router, prefix="/api")
    app.include_router(ai_router, prefix="/api")

    return app

app = create_app()
