from app.db import engine, Base
from sqlalchemy import text

def add_subscription_columns():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free'"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP"))
        conn.commit()
    print("Added subscription columns to users table.")

if __name__ == "__main__":
    add_subscription_columns()
