from sqlalchemy import create_engine, text
from app.config import settings

def update_schema():
    engine = create_engine(settings.database_url)
    with engine.connect() as conn:
        print("Adding columns to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC'"))
            conn.commit()
            print("Successfully added columns.")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
