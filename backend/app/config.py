from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    app_name: str = os.getenv("APP_NAME", "MindPath API")
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")

settings = Settings()
