import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    app_name: str = os.getenv("APP_NAME", "MindPath API")
    env: str = os.getenv("ENV", "dev")

    cors_origins: list[str] = [
        x.strip()
        for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
        if x.strip()
    ]

    database_url: str = os.getenv(
         "DATABASE_URL",
         "postgresql+psycopg2://postgres:postgres@localhost:5432/mindpath"
    )

    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-5")


settings = Settings()
