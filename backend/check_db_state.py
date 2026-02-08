import os
import sys
from sqlalchemy import create_engine, text, inspect
from dotenv import load_dotenv

# Load env vars
load_dotenv()

database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("DATABASE_URL not found in .env")
    sys.exit(1)

print(f"Connecting to: {database_url}")
engine = create_engine(database_url)

try:
    with engine.connect() as conn:
        print("Connection successful!")
        
        # Check extensions
        print("\n--- Extensions ---")
        result = conn.execute(text("SELECT extname FROM pg_extension"))
        extensions = [row[0] for row in result]
        print(extensions)
        if "vector" not in extensions:
            print("WARNING: 'vector' extension is MISSING!")
        else:
            print("'vector' extension is present.")

        # Check alembic version
        print("\n--- Alembic Version ---")
        try:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            print(f"Current Revision: {result.scalar()}")
        except Exception as e:
            print(f"Could not read alembic_version: {e}")

        # Check user_memories columns
        print("\n--- user_memories Columns ---")
        insp = inspect(engine)
        if "user_memories" in insp.get_table_names():
            columns = insp.get_columns("user_memories")
            found_embedding = False
            for col in columns:
                print(f"- {col['name']} ({col['type']})")
                if col['name'] == 'embedding':
                    found_embedding = True
            
            if not found_embedding:
                print("\nERROR: 'embedding' column is MISSING from user_memories!")
            else:
                print("\nSUCCESS: 'embedding' column found.")
        else:
            print("\nERROR: Table 'user_memories' does not exist!")

        # Check rag_chunks columns
        print("\n--- rag_chunks Columns ---")
        if "rag_chunks" in insp.get_table_names():
            print("SUCCESS: 'rag_chunks' table found.")
        else:
            print("\nERROR: Table 'rag_chunks' does not exist!")

except Exception as e:
    print(f"\nConnection failed: {e}")
