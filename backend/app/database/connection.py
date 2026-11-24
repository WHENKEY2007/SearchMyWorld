import sqlite3
from pathlib import Path
from contextlib import contextmanager
from typing import Generator
from app.config import settings

def init_db() -> None:
    """Initialize the SQLite database with schema, WAL mode and Pragmas."""
    db_path = settings.DB_PATH
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    schema_file = Path(__file__).parent / "schema.sql"
    with open(schema_file, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with sqlite3.connect(db_path) as conn:
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.executescript(schema_sql)
        
        # Ensure image_ocr has bounding box & dimensions columns
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(image_ocr);")
        columns = [row[1] for row in cursor.fetchall()]
        if "boxes_json" not in columns:
            conn.execute("ALTER TABLE image_ocr ADD COLUMN boxes_json TEXT;")
        if "img_width" not in columns:
            conn.execute("ALTER TABLE image_ocr ADD COLUMN img_width INTEGER;")
        if "img_height" not in columns:
            conn.execute("ALTER TABLE image_ocr ADD COLUMN img_height INTEGER;")
            
        conn.commit()

@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Context manager for SQLite connections with row factory and pragmas enabled."""
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(settings.DB_PATH), timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
