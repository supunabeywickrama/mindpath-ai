from app.db import engine
from sqlalchemy import text

def add_stripe_column():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)"))
        conn.commit()
    print("Added stripe_customer_id constraint to users table.")

if __name__ == "__main__":
    add_stripe_column()
