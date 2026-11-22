import uuid
import json
import sqlite3
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from app.database.connection import get_db_connection

class DatabaseRepository:
    """Data Access Layer for SQLite local-first memory store."""

    # ------------------ FOLDERS ------------------
    @staticmethod
    def add_folder(path: str) -> Dict[str, Any]:
        folder_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO folders (id, path, indexing_enabled) VALUES (?, ?, 1) "
                "ON CONFLICT(path) DO UPDATE SET indexing_enabled=1",
                (folder_id, path)
            )
            cursor.execute("SELECT * FROM folders WHERE path = ?", (path,))
            row = cursor.fetchone()
            return dict(row)

    @staticmethod
    def get_folders() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM folders ORDER BY created_at DESC")
            return [dict(row) for row in cursor.fetchall()]

    @staticmethod
    def remove_folder(folder_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
            return cursor.rowcount > 0

    # ------------------ FILES ------------------
    @staticmethod
    def upsert_file(
        folder_id: Optional[str],
        filename: str,
        path: str,
        extension: str,
        file_type: str,
        file_hash: str,
        file_size: int,
        created_at: Optional[str],
        modified_at: Optional[str],
        indexing_status: str = "pending"
    ) -> str:
        file_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM files WHERE path = ?", (path,))
            existing = cursor.fetchone()
            if existing:
                file_id = existing["id"]
                cursor.execute(
                    """
                    UPDATE files 
                    SET folder_id = ?, filename = ?, extension = ?, file_type = ?,
                        file_hash = ?, file_size = ?, created_at = ?, modified_at = ?,
                        indexing_status = ?
                    WHERE id = ?
                    """,
                    (folder_id, filename, extension, file_type, file_hash, file_size, created_at, modified_at, indexing_status, file_id)
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO files (id, folder_id, filename, path, extension, file_type, file_hash, file_size, created_at, modified_at, indexing_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (file_id, folder_id, filename, path, extension, file_type, file_hash, file_size, created_at, modified_at, indexing_status)
                )
            return file_id

    @staticmethod
    def get_file_by_path(path: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE path = ?", (path,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_file_by_id(file_id: str) -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    @staticmethod
    def get_all_files(
        extension: Optional[str] = None,
        file_type: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM files WHERE 1=1"
            params = []
            if extension:
                query += " AND extension = ?"
                params.append(extension)
            if file_type:
                query += " AND file_type = ?"
                params.append(file_type)

            # Count total
            count_query = query.replace("SELECT *", "SELECT COUNT(*)")
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            query += " ORDER BY modified_at DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows], total

    @staticmethod
    def mark_file_status(file_id: str, status: str) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE files SET indexing_status = ?, indexed_at = CURRENT_TIMESTAMP WHERE id = ?",
                (status, file_id)
            )

    @staticmethod
    def delete_file_records(file_id: str) -> None:
        """Deletes chunks, embeddings, ocr and FTS index entries for a file."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            # Clean FTS
            cursor.execute("DELETE FROM chunks_fts WHERE file_id = ?", (file_id,))
            # Cascade takes care of chunks, embeddings, image_ocr, indexing_jobs
            cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))

    # ------------------ CHUNKS & FTS ------------------
    @staticmethod
    def insert_chunks(chunks: List[Dict[str, Any]], filename: str) -> None:
        """Insert chunks and synchronize into FTS5 index in a single transaction."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for chunk in chunks:
                cursor.execute(
                    """
                    INSERT INTO document_chunks (id, file_id, chunk_index, content, page_number, section_title)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (chunk["id"], chunk["file_id"], chunk["chunk_index"], chunk["content"], chunk.get("page_number"), chunk.get("section_title"))
                )
                # Synchronize into FTS5
                cursor.execute(
                    """
                    INSERT INTO chunks_fts (chunk_id, file_id, content, filename)
                    VALUES (?, ?, ?, ?)
                    """,
                    (chunk["id"], chunk["file_id"], chunk["content"], filename)
                )

    @staticmethod
    def get_chunks_by_file_id(file_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM document_chunks WHERE file_id = ? ORDER BY chunk_index ASC", (file_id,))
            return [dict(r) for r in cursor.fetchall()]

    # ------------------ EMBEDDINGS ------------------
    @staticmethod
    def insert_embeddings(embeddings_data: List[Tuple[str, str, np.ndarray, str]]) -> None:
        """Store dense vector embeddings as float32 binary blobs."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for emb_id, chunk_id, vec, model_name in embeddings_data:
                blob = vec.astype(np.float32).tobytes()
                cursor.execute(
                    "INSERT OR REPLACE INTO embeddings (id, chunk_id, embedding_data, model_name) VALUES (?, ?, ?, ?)",
                    (emb_id, chunk_id, blob, model_name)
                )

    @staticmethod
    def get_all_embeddings() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT e.chunk_id, e.embedding_data, c.file_id, c.content, c.page_number, c.section_title, f.filename, f.path, f.extension
                FROM embeddings e
                JOIN document_chunks c ON e.chunk_id = c.id
                JOIN files f ON c.file_id = f.id
                """
            )
            results = []
            for row in cursor.fetchall():
                vec = np.frombuffer(row["embedding_data"], dtype=np.float32)
                results.append({
                    "chunk_id": row["chunk_id"],
                    "vector": vec,
                    "file_id": row["file_id"],
                    "content": row["content"],
                    "page_number": row["page_number"],
                    "section_title": row["section_title"],
                    "filename": row["filename"],
                    "path": row["path"],
                    "extension": row["extension"]
                })
            return results

    # ------------------ IMAGE OCR ------------------
    @staticmethod
    def insert_image_ocr(file_id: str, extracted_text: str, status: str = "completed") -> str:
        ocr_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO image_ocr (id, file_id, extracted_text, processing_status) VALUES (?, ?, ?, ?)",
                (ocr_id, file_id, extracted_text, status)
            )
            return ocr_id

    @staticmethod
    def search_image_ocr(query: str, limit: int = 50) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT o.id, o.file_id, o.extracted_text, f.filename, f.path, f.modified_at, f.file_size
                FROM image_ocr o
                JOIN files f ON o.file_id = f.id
                WHERE o.extracted_text LIKE ?
                ORDER BY f.modified_at DESC
                LIMIT ?
                """,
                (f"%{query}%", limit)
            )
            return [dict(r) for r in cursor.fetchall()]

    # ------------------ FTS LEXICAL SEARCH ------------------
    @staticmethod
    def search_fts(query: str, limit: int = 50) -> List[Dict[str, Any]]:
        # Sanitize query for FTS5 (avoid syntax errors with special chars)
        sanitized_query = "".join(c if c.isalnum() or c.isspace() else " " for c in query).strip()
        if not sanitized_query:
            return []
        tokens = sanitized_query.split()
        fts_expr = " OR ".join(f'"{token}"*' for token in tokens)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT fts.chunk_id, fts.file_id, fts.content, fts.filename, f.path, f.extension,
                       c.page_number, c.section_title, bm25(chunks_fts) as rank
                FROM chunks_fts fts
                JOIN files f ON fts.file_id = f.id
                JOIN document_chunks c ON fts.chunk_id = c.id
                WHERE chunks_fts MATCH ?
                ORDER BY rank ASC
                LIMIT ?
                """,
                (fts_expr, limit)
            )
            return [dict(r) for r in cursor.fetchall()]

    # ------------------ TIMELINE ------------------
    @staticmethod
    def get_timeline(limit: int = 100) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, filename, path, extension, file_type, file_size, created_at, modified_at, indexed_at
                FROM files
                WHERE indexing_status = 'indexed'
                ORDER BY COALESCE(modified_at, created_at, indexed_at) DESC
                LIMIT ?
                """,
                (limit,)
            )
            return [dict(r) for r in cursor.fetchall()]

    # ------------------ STATS ------------------
    @staticmethod
    def get_stats() -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM folders")
            total_folders = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM files")
            total_files = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM files WHERE indexing_status = 'indexed'")
            indexed_files = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM document_chunks")
            total_chunks = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM image_ocr")
            total_images_ocr = cursor.fetchone()[0]

            cursor.execute("SELECT file_type, COUNT(*) as count FROM files GROUP BY file_type")
            type_distribution = {row["file_type"]: row["count"] for row in cursor.fetchall()}

            cursor.execute("SELECT extension, COUNT(*) as count FROM files GROUP BY extension")
            extension_distribution = {row["extension"]: row["count"] for row in cursor.fetchall()}

            return {
                "total_folders": total_folders,
                "total_files": total_files,
                "indexed_files": indexed_files,
                "total_chunks": total_chunks,
                "total_images_ocr": total_images_ocr,
                "type_distribution": type_distribution,
                "extension_distribution": extension_distribution
            }

    # ------------------ PROJECTS & RECONSTRUCTION ENTITIES ------------------
    @staticmethod
    def get_projects() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM projects ORDER BY updated_at DESC")
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def create_project(name: str, description: Optional[str] = None) -> Dict[str, Any]:
        proj_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO projects (id, project_name, description) VALUES (?, ?, ?)",
                (proj_id, name, description)
            )
            cursor.execute("SELECT * FROM projects WHERE id = ?", (proj_id,))
            return dict(cursor.fetchone())

    @staticmethod
    def delete_project(project_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            return cursor.rowcount > 0

    @staticmethod
    def associate_file_to_project(project_id: str, file_id: str, confidence: float = 1.0) -> None:
        pf_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO project_files (id, project_id, file_id, association_confidence) VALUES (?, ?, ?, ?)",
                (pf_id, project_id, file_id, confidence)
            )

    @staticmethod
    def get_project_files(project_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT f.*, pf.association_confidence
                FROM files f
                JOIN project_files pf ON f.id = pf.file_id
                WHERE pf.project_id = ?
                ORDER BY f.modified_at ASC
                """,
                (project_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_project_tasks(project_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT t.*, c.content as evidence_snippet, f.filename, f.path
                FROM tasks t
                LEFT JOIN document_chunks c ON t.source_chunk_id = c.id
                LEFT JOIN files f ON c.file_id = f.id
                WHERE t.project_id = ?
                """,
                (project_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_project_decisions(project_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT d.*, c.content as evidence_snippet, f.filename, f.path
                FROM decisions d
                LEFT JOIN document_chunks c ON d.source_chunk_id = c.id
                LEFT JOIN files f ON c.file_id = f.id
                WHERE d.project_id = ?
                ORDER BY d.decision_date ASC
                """,
                (project_id,)
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def record_indexing_job(file_id: Optional[str], status: str, error_message: Optional[str] = None) -> str:
        job_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO indexing_jobs (id, file_id, status, error_message) VALUES (?, ?, ?, ?)",
                (job_id, file_id, status, error_message)
            )
            return job_id

    @staticmethod
    def clear_database() -> None:
        """Cleans all indexed records while preserving folder preferences."""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chunks_fts")
            cursor.execute("DELETE FROM indexing_jobs")
            cursor.execute("DELETE FROM relationships")
            cursor.execute("DELETE FROM entities")
            cursor.execute("DELETE FROM tasks")
            cursor.execute("DELETE FROM decisions")
            cursor.execute("DELETE FROM project_files")
            cursor.execute("DELETE FROM projects")
            cursor.execute("DELETE FROM image_ocr")
            cursor.execute("DELETE FROM embeddings")
            cursor.execute("DELETE FROM document_chunks")
            cursor.execute("DELETE FROM files")
            cursor.execute("VACUUM")
