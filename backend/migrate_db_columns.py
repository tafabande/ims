from app.database import engine, Base
from sqlalchemy import text

statements = [
    "ALTER TABLE import_batches ADD COLUMN content_hash VARCHAR(64);",
    "ALTER TABLE import_batches ADD COLUMN approved_content_hash VARCHAR(64);",
    "ALTER TABLE import_records ADD COLUMN before_snapshot_json TEXT;",
    "ALTER TABLE import_records ADD COLUMN diff_json TEXT;",
    "ALTER TABLE integration_api_keys ADD COLUMN key_id VARCHAR(50);",
    "ALTER TABLE integration_api_keys ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';",
    "ALTER TABLE integration_api_keys ADD COLUMN rotated_from_key_id VARCHAR(50);",
]

with engine.connect() as conn:
    for stmt in statements:
        try:
            conn.execute(text(stmt))
            conn.commit()
            print("Successfully executed:", stmt)
        except Exception as e:
            print("Skipping (already applied):", stmt, "->", e)

Base.metadata.create_all(bind=engine)
print("Migration and table sync complete.")
