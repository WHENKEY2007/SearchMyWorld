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
        folder_id: Optional[str] = None,
        sort_by: Optional[str] = "modified_desc",
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM files WHERE 1=1"
            params = []
            if extension:
                query += " AND extension = ?"
                params.append(extension.lower())
            if file_type:
                query += " AND file_type = ?"
                params.append(file_type)
            if folder_id:
                # Match files linked directly to folder or under folder path
                cursor.execute("SELECT path FROM folders WHERE id = ?", (folder_id,))
                folder_row = cursor.fetchone()
                if folder_row:
                    folder_path = folder_row["path"]
                    query += " AND (folder_id = ? OR path LIKE ?)"
                    params.extend([folder_id, f"{folder_path}%"])
                else:
                    query += " AND folder_id = ?"
                    params.append(folder_id)

            # Count total
            count_query = query.replace("SELECT *", "SELECT COUNT(*)")
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            order_clause = "ORDER BY modified_at DESC"
            if sort_by == "modified_asc":
                order_clause = "ORDER BY modified_at ASC"
            elif sort_by == "created_desc":
                order_clause = "ORDER BY created_at DESC"
            elif sort_by == "created_asc":
                order_clause = "ORDER BY created_at ASC"
            elif sort_by == "name_asc":
                order_clause = "ORDER BY filename COLLATE NOCASE ASC"
            elif sort_by == "name_desc":
                order_clause = "ORDER BY filename COLLATE NOCASE DESC"
            elif sort_by == "size_desc":
                order_clause = "ORDER BY file_size DESC"
            elif sort_by == "size_asc":
                order_clause = "ORDER BY file_size ASC"

            query += f" {order_clause} LIMIT ? OFFSET ?"
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
    def delete_file_records(file_id: str, delete_from_disk: bool = False) -> Dict[str, Any]:
        """Deletes chunks, embeddings, ocr and FTS index entries for a file, and optionally deletes file from disk."""
        from pathlib import Path
        import os
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM files WHERE id = ?", (file_id,))
            file_rec = cursor.fetchone()
            if not file_rec:
                return {"success": False, "message": "File not found"}
            
            file_dict = dict(file_rec)
            file_path_str = file_dict["path"]
            disk_deleted = False

            if delete_from_disk:
                try:
                    p = Path(file_path_str)
                    if p.exists() and p.is_file():
                        p.unlink()
                        disk_deleted = True
                except Exception as e:
                    # Continue with DB deletion even if file removal fails
                    pass

            # Clean FTS
            cursor.execute("DELETE FROM chunks_fts WHERE file_id = ?", (file_id,))
            # Cascade takes care of chunks, embeddings, image_ocr, indexing_jobs
            cursor.execute("DELETE FROM files WHERE id = ?", (file_id,))
            return {
                "success": True,
                "file_id": file_id,
                "filename": file_dict["filename"],
                "path": file_path_str,
                "disk_deleted": disk_deleted
            }

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
    def get_all_embeddings(
        limit: int = 5000,
        extension_filter: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            where_clauses = ["1=1"]
            params: List[Any] = []
            
            if extension_filter:
                where_clauses.append("f.extension = ?")
                params.append(extension_filter.lower())
            if folder_id:
                where_clauses.append("f.folder_id = ?")
                params.append(folder_id)
                
            where_sql = " AND ".join(where_clauses)
            
            # Use appropriate index hint to guarantee sub-second retrieval without full table scan
            if extension_filter:
                index_hint = "INDEXED BY idx_files_ext_mod"
                order_by = "f.extension, f.modified_at DESC"
            else:
                index_hint = "INDEXED BY idx_files_mod_desc"
                order_by = "f.modified_at DESC"
                
            sql = f"""
                SELECT e.chunk_id, e.embedding_data, c.file_id, c.content, c.page_number, c.section_title,
                       f.filename, f.path, f.extension, f.folder_id, f.modified_at, f.created_at
                FROM files f {index_hint}
                JOIN document_chunks c ON c.file_id = f.id
                JOIN embeddings e ON e.chunk_id = c.id
                WHERE {where_sql}
                ORDER BY {order_by}
                LIMIT ?
            """
            params.append(limit)
            
            try:
                cursor.execute(sql, tuple(params))
            except Exception as e:
                logger.warning(f"Indexed embeddings query fallback triggered: {e}")
                # Fallback without index hint if needed
                fallback_sql = f"""
                    SELECT e.chunk_id, e.embedding_data, c.file_id, c.content, c.page_number, c.section_title,
                           f.filename, f.path, f.extension, f.folder_id, f.modified_at, f.created_at
                    FROM files f
                    JOIN document_chunks c ON c.file_id = f.id
                    JOIN embeddings e ON e.chunk_id = c.id
                    WHERE {where_sql}
                    ORDER BY {order_by}
                    LIMIT ?
                """
                cursor.execute(fallback_sql, tuple(params))

            results = []
            for row in cursor.fetchall():
                try:
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
                        "extension": row["extension"],
                        "folder_id": row["folder_id"],
                        "modified_at": row["modified_at"],
                        "created_at": row["created_at"]
                    })
                except Exception:
                    continue
            return results

    # ------------------ IMAGE OCR ------------------
    @staticmethod
    def insert_image_ocr(
        file_id: str,
        extracted_text: str,
        status: str = "completed",
        boxes_json: Optional[str] = None,
        img_width: Optional[int] = None,
        img_height: Optional[int] = None
    ) -> str:
        ocr_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT OR REPLACE INTO image_ocr (id, file_id, extracted_text, processing_status, boxes_json, img_width, img_height)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (ocr_id, file_id, extracted_text, status, boxes_json, img_width, img_height)
            )
            return ocr_id

    @staticmethod
    def get_image_ocr_by_file_id(file_id: str) -> Optional[Dict[str, Any]]:
        import json
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT o.id, o.file_id, o.extracted_text, o.boxes_json, o.img_width, o.img_height,
                       f.filename, f.path, f.file_size, f.modified_at
                FROM image_ocr o
                JOIN files f ON o.file_id = f.id
                WHERE o.file_id = ?
                """,
                (file_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            try:
                res["boxes"] = json.loads(res["boxes_json"]) if res.get("boxes_json") else []
            except Exception:
                res["boxes"] = []
            return res

    @staticmethod
    def search_image_ocr(
        query: Optional[str] = None,
        sort_by: str = "relevance",
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        clean_q = (query or "").strip()
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT o.id, o.file_id, o.extracted_text, o.boxes_json, o.img_width, o.img_height,
                       f.filename, f.path, f.modified_at, f.created_at, f.file_size
                FROM image_ocr o
                JOIN files f ON o.file_id = f.id
                """
            )
            rows = [dict(r) for r in cursor.fetchall()]

        import json
        for r in rows:
            try:
                r["boxes"] = json.loads(r["boxes_json"]) if r.get("boxes_json") else []
            except Exception:
                r["boxes"] = []

        if not clean_q:
            for r in rows:
                r["relevance_score"] = 1.0
        else:
            import re
            lower_q = clean_q.lower()
            tokens = [t for t in re.findall(r"\b[a-zA-Z0-9_-]{2,}\b", lower_q)]
            total_tokens = max(len(tokens), 1)

            scored_dict: Dict[str, Dict[str, Any]] = {}
            for r in rows:
                fid = r["file_id"]
                text = (r.get("extracted_text") or "").lower()
                fname = (r.get("filename") or "").lower()
                combined = text + " " + fname

                # Substring token matching (handles fused OCR words e.g. 'adityauniversity', 'ApprovalBy')
                token_matches = sum(1 for t in tokens if t in combined)
                token_ratio = token_matches / total_tokens

                score = token_ratio * 40.0
                if lower_q in combined:
                    score += 35.0
                if lower_q in fname:
                    score += 25.0
                for t in tokens:
                    if t in fname:
                        score += 10.0

                r["token_ratio"] = token_ratio
                r["relevance_score"] = score
                scored_dict[fid] = r

            # Semantic vector retrieval for natural language descriptions
            try:
                from app.services.embedding import embedding_service
                with get_db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        """
                        SELECT e.chunk_id, e.embedding_data, c.file_id, c.content, f.filename
                        FROM embeddings e
                        JOIN document_chunks c ON e.chunk_id = c.id
                        JOIN files f ON c.file_id = f.id
                        WHERE f.extension IN ('.png', '.jpg', '.jpeg', '.webp')
                        """
                    )
                    emb_rows = cursor.fetchall()
                if emb_rows:
                    q_vec = embedding_service.encode_single(clean_q)
                    doc_vecs = np.array([np.frombuffer(row["embedding_data"], dtype=np.float32) for row in emb_rows])
                    sims = embedding_service.cosine_similarity(q_vec, doc_vecs)

                    for i, row in enumerate(emb_rows):
                        sim = float(sims[i])
                        if sim >= 0.25:
                            fid = row["file_id"]
                            if fid in scored_dict:
                                scored_dict[fid]["relevance_score"] += (sim * 55.0)
                                scored_dict[fid]["semantic_sim"] = round(sim, 3)
            except Exception:
                pass

            # Filter out non-matching noise
            candidates = [
                r for r in scored_dict.values()
                if r.get("relevance_score", 0) > 10.0 or r.get("token_ratio", 0) > 0.25 or r.get("semantic_sim", 0) >= 0.28
            ]
            rows = candidates

        # Sorting
        if sort_by == "relevance" and clean_q:
            rows.sort(key=lambda x: (x.get("relevance_score", 0), x.get("modified_at") or ""), reverse=True)
        elif sort_by in ("date_desc", "relevance"):
            rows.sort(key=lambda x: (x.get("modified_at") or x.get("created_at") or ""), reverse=True)
        elif sort_by == "date_asc":
            rows.sort(key=lambda x: (x.get("modified_at") or x.get("created_at") or ""))
        elif sort_by == "name_asc":
            rows.sort(key=lambda x: (x.get("filename") or "").lower())
        elif sort_by == "name_desc":
            rows.sort(key=lambda x: (x.get("filename") or "").lower(), reverse=True)
        elif sort_by == "size_desc":
            rows.sort(key=lambda x: (x.get("file_size") or 0), reverse=True)
        elif sort_by == "size_asc":
            rows.sort(key=lambda x: (x.get("file_size") or 0))

        return rows[:limit]

    # ------------------ FTS LEXICAL SEARCH ------------------
    @staticmethod
    def search_fts(
        query: str,
        limit: int = 50,
        extension_filter: Optional[str] = None,
        folder_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        # Sanitize query for FTS5 (avoid syntax errors with special chars)
        sanitized_query = "".join(c if c.isalnum() or c.isspace() else " " for c in query).strip()
        if not sanitized_query:
            return []
        tokens = [t for t in sanitized_query.split() if len(t) > 1]
        if not tokens:
            return []

        # Prioritize exact multi-word phrase, then all-token intersection (AND), then any-token union (OR)
        clause_parts = []
        if len(tokens) > 1:
            clause_parts.append(f'"{sanitized_query}"')
            clause_parts.append("(" + " AND ".join(f'"{token}"*' for token in tokens) + ")")
        clause_parts.append("(" + " OR ".join(f'"{token}"*' for token in tokens) + ")")
        fts_expr = " OR ".join(clause_parts)

        filter_sql_parts = []
        filter_params = []
        if extension_filter:
            filter_sql_parts.append("AND f.extension = ?")
            filter_params.append(extension_filter.lower())
        if folder_id:
            filter_sql_parts.append("AND f.folder_id = ?")
            filter_params.append(folder_id)
        filter_sql = " ".join(filter_sql_parts)

        with get_db_connection() as conn:
            cursor = conn.cursor()
            try:
                cursor.execute(
                    f"""
                    SELECT fts.chunk_id, fts.file_id, fts.content, fts.filename, f.path, f.extension, f.folder_id, f.modified_at, f.created_at,
                           c.page_number, c.section_title, bm25(chunks_fts) as rank
                    FROM chunks_fts fts
                    JOIN files f ON fts.file_id = f.id
                    JOIN document_chunks c ON fts.chunk_id = c.id
                    WHERE chunks_fts MATCH ? {filter_sql}
                    ORDER BY rank ASC
                    LIMIT ?
                    """,
                    (fts_expr, *filter_params, limit)
                )
                return [dict(r) for r in cursor.fetchall()]
            except sqlite3.OperationalError as e:
                logger.warning(f"FTS5 match failed for expression '{fts_expr}': {e}. Retrying with literal token quotes.")
                # Fallback: simple OR of literal quoted tokens
                safe_expr = " OR ".join(f'"{t}"' for t in tokens)
                try:
                    cursor.execute(
                        f"""
                        SELECT fts.chunk_id, fts.file_id, fts.content, fts.filename, f.path, f.extension, f.folder_id, f.modified_at, f.created_at,
                               c.page_number, c.section_title, bm25(chunks_fts) as rank
                        FROM chunks_fts fts
                        JOIN files f ON fts.file_id = f.id
                        JOIN document_chunks c ON fts.chunk_id = c.id
                        WHERE chunks_fts MATCH ? {filter_sql}
                        ORDER BY rank ASC
                        LIMIT ?
                        """,
                        (safe_expr, *filter_params, limit)
                    )
                    return [dict(r) for r in cursor.fetchall()]
                except Exception as inner_e:
                    logger.error(f"FTS fallback also failed: {inner_e}")
                    return []

    # ------------------ TIMELINE ------------------
    @staticmethod
    def get_timeline(limit: int = 100, date_type: str = "modified") -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            order_col = "modified_at"
            if date_type == "created":
                order_col = "created_at"
            elif date_type == "indexed":
                order_col = "indexed_at"

            cursor.execute(
                f"""
                SELECT id, filename, path, extension, file_type, file_size, created_at, modified_at, indexed_at
                FROM files
                WHERE indexing_status = 'indexed'
                ORDER BY COALESCE({order_col}, modified_at, created_at, indexed_at) DESC
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

    @staticmethod
    def get_folder_breakdown_stats(folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            if folder_id:
                cursor.execute("SELECT * FROM folders WHERE id = ?", (folder_id,))
                folders = [dict(r) for r in cursor.fetchall()]
            else:
                cursor.execute("SELECT * FROM folders ORDER BY created_at DESC")
                folders = [dict(r) for r in cursor.fetchall()]

            results = []
            for folder in folders:
                fid = folder["id"]
                fpath = folder["path"]

                cursor.execute(
                    """
                    SELECT id, filename, path, extension, file_type, file_size, file_hash, indexing_status
                    FROM files
                    WHERE folder_id = ? OR path LIKE ?
                    """,
                    (fid, f"{fpath}%")
                )
                folder_files = [dict(r) for r in cursor.fetchall()]

                total_files = len(folder_files)
                indexed_files = sum(1 for f in folder_files if f.get("indexing_status") == "indexed")
                total_size = sum(f.get("file_size") or 0 for f in folder_files)

                ext_counts: Dict[str, int] = {}
                for f in folder_files:
                    ext = (f.get("extension") or "").lower()
                    if ext:
                        ext_counts[ext] = ext_counts.get(ext, 0) + 1

                hash_map: Dict[str, List[Dict[str, Any]]] = {}
                for f in folder_files:
                    h = f.get("file_hash")
                    if h:
                        hash_map.setdefault(h, []).append(f)

                duplicate_count = 0
                reclaimable_bytes = 0
                for h, flist in hash_map.items():
                    if len(flist) > 1:
                        duplicate_count += (len(flist) - 1)
                        reclaimable_bytes += sum((f.get("file_size") or 0) for f in flist[1:])

                results.append({
                    "folder_id": fid,
                    "folder_path": fpath,
                    "total_files": total_files,
                    "indexed_files": indexed_files,
                    "total_size_bytes": total_size,
                    "extension_counts": ext_counts,
                    "duplicate_count": duplicate_count,
                    "reclaimable_bytes": reclaimable_bytes,
                    "delete_suggestions_count": duplicate_count
                })

            return results

    @staticmethod
    def get_duplicate_suggestions(folder_id: Optional[str] = None) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            if folder_id:
                cursor.execute("SELECT path FROM folders WHERE id = ?", (folder_id,))
                frow = cursor.fetchone()
                fpath = frow["path"] if frow else ""
                cursor.execute(
                    """
                    SELECT file_hash, COUNT(*) as cnt
                    FROM files
                    WHERE file_hash != '' AND (folder_id = ? OR path LIKE ?)
                    GROUP BY file_hash
                    HAVING cnt > 1
                    """,
                    (folder_id, f"{fpath}%")
                )
            else:
                cursor.execute(
                    """
                    SELECT file_hash, COUNT(*) as cnt
                    FROM files
                    WHERE file_hash != ''
                    GROUP BY file_hash
                    HAVING cnt > 1
                    """
                )

            dup_hashes = cursor.fetchall()
            groups = []
            total_duplicate_files = 0
            total_reclaimable_bytes = 0

            for row in dup_hashes:
                h = row["file_hash"]
                cursor.execute(
                    """
                    SELECT id, folder_id, filename, path, extension, file_type, file_size, created_at, modified_at
                    FROM files
                    WHERE file_hash = ?
                    ORDER BY COALESCE(created_at, modified_at) ASC, LENGTH(path) ASC
                    """,
                    (h,)
                )
                copies = [dict(c) for c in cursor.fetchall()]
                if len(copies) < 2:
                    continue

                primary = copies[0]
                primary["is_primary"] = True
                primary["reason"] = "Keep original file (earliest created / primary path)"

                duplicates_list = []
                for dup in copies[1:]:
                    dup["is_primary"] = False
                    dup["reason"] = f"Redundant copy of '{primary['filename']}'. Safe to delete."
                    duplicates_list.append(dup)
                    total_duplicate_files += 1
                    total_reclaimable_bytes += dup["file_size"]

                groups.append({
                    "file_hash": h,
                    "file_size": primary["file_size"],
                    "total_copies": len(copies),
                    "reclaimable_bytes": sum(d["file_size"] for d in duplicates_list),
                    "primary_file": primary,
                    "duplicates": duplicates_list
                })

            return {
                "total_duplicate_files": total_duplicate_files,
                "total_groups": len(groups),
                "total_reclaimable_bytes": total_reclaimable_bytes,
                "groups": groups
            }

    # ------------------ PROJECTS & RECONSTRUCTION ENTITIES ------------------
    @staticmethod
    def get_projects() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM projects ORDER BY updated_at DESC")
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def auto_detect_projects() -> List[Dict[str, Any]]:
        from pathlib import Path
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT path FROM files")
            paths = [row["path"] for row in cursor.fetchall()]

            folder_counts: Dict[str, int] = {}
            for p in paths:
                try:
                    parent_name = Path(p).parent.name
                    if parent_name and len(parent_name) > 1:
                        folder_counts[parent_name] = folder_counts.get(parent_name, 0) + 1
                except Exception:
                    continue

            cursor.execute("SELECT path FROM folders")
            for row in cursor.fetchall():
                try:
                    name = Path(row["path"]).name
                    if name:
                        folder_counts[name] = folder_counts.get(name, 0) + 1
                except Exception:
                    pass

            cursor.execute("SELECT project_name FROM projects")
            existing = {r["project_name"].lower() for r in cursor.fetchall()}

            for name, cnt in sorted(folder_counts.items(), key=lambda x: x[1], reverse=True):
                if name.lower() not in existing and cnt >= 1 and len(name) > 2:
                    DatabaseRepository.create_project(
                        name=name,
                        description=f"Auto-detected project from folder '{name}' containing {cnt} files."
                    )
                    existing.add(name.lower())

            return DatabaseRepository.get_projects()

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

    # ------------------ CHAT CONVERSATIONS & HISTORY ------------------
    @staticmethod
    def create_conversation(title: str = "New Chat", focused_file_id: Optional[str] = None) -> Dict[str, Any]:
        conv_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO conversations (id, title, focused_file_id)
                VALUES (?, ?, ?)
                """,
                (conv_id, title, focused_file_id)
            )
            cursor.execute(
                """
                SELECT c.*, f.filename as focused_filename
                FROM conversations c
                LEFT JOIN files f ON c.focused_file_id = f.id
                WHERE c.id = ?
                """,
                (conv_id,)
            )
            return dict(cursor.fetchone())

    @staticmethod
    def get_conversations() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT c.id, c.title, c.focused_file_id, c.created_at, c.updated_at,
                       f.filename as focused_filename,
                       (SELECT text FROM chat_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
                       (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id) as message_count
                FROM conversations c
                LEFT JOIN files f ON c.focused_file_id = f.id
                ORDER BY c.updated_at DESC
                """
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_conversation_messages(conversation_id: str) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT id, conversation_id, sender, text, citations_json, created_at
                FROM chat_messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                """,
                (conversation_id,)
            )
            rows = []
            for r in cursor.fetchall():
                d = dict(r)
                if d.get("citations_json"):
                    try:
                        d["sources"] = json.loads(d["citations_json"])
                    except Exception:
                        d["sources"] = []
                else:
                    d["sources"] = []
                rows.append(d)
            return rows

    @staticmethod
    def add_chat_message(
        conversation_id: str,
        sender: str,
        text: str,
        citations: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        msg_id = str(uuid.uuid4())
        citations_str = json.dumps(citations) if citations else None
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO chat_messages (id, conversation_id, sender, text, citations_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (msg_id, conversation_id, sender, text, citations_str)
            )
            cursor.execute(
                "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (conversation_id,)
            )
            cursor.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,))
            res = dict(cursor.fetchone())
            res["sources"] = citations or []
            return res

    @staticmethod
    def delete_conversation(conversation_id: str) -> bool:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
            return cursor.rowcount > 0

    @staticmethod
    def update_conversation_title(conversation_id: str, title: str) -> None:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE conversations SET title = ? WHERE id = ?", (title, conversation_id))

    # ------------------ BOOKMARKS / STARRED FILES ------------------
    @staticmethod
    def get_bookmarks() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT b.id as bookmark_id, b.note, b.created_at as bookmarked_at,
                       f.id as file_id, f.filename, f.path, f.extension, f.file_type, f.file_size,
                       f.modified_at, f.created_at
                FROM user_bookmarks b
                JOIN files f ON b.file_id = f.id
                ORDER BY b.created_at DESC
                """
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def toggle_bookmark(file_id: str, note: Optional[str] = None) -> Dict[str, Any]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM user_bookmarks WHERE file_id = ?", (file_id,))
            existing = cursor.fetchone()
            if existing:
                cursor.execute("DELETE FROM user_bookmarks WHERE file_id = ?", (file_id,))
                return {"file_id": file_id, "bookmarked": False}
            else:
                bm_id = str(uuid.uuid4())
                cursor.execute(
                    "INSERT INTO user_bookmarks (id, file_id, note) VALUES (?, ?, ?)",
                    (bm_id, file_id, note)
                )
                return {"file_id": file_id, "bookmarked": True, "bookmark_id": bm_id}

    @staticmethod
    def get_all_bookmarked_file_ids() -> set:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT file_id FROM user_bookmarks")
            return {r["file_id"] for r in cursor.fetchall()}

    # ------------------ TAGS ------------------
    @staticmethod
    def get_all_tags() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT tag, COUNT(*) as file_count
                FROM file_tags
                GROUP BY tag
                ORDER BY file_count DESC, tag ASC
                """
            )
            return [dict(r) for r in cursor.fetchall()]

    @staticmethod
    def get_file_tags(file_id: str) -> List[str]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT tag FROM file_tags WHERE file_id = ? ORDER BY tag ASC", (file_id,))
            return [r["tag"] for r in cursor.fetchall()]

    @staticmethod
    def add_file_tag(file_id: str, tag: str) -> bool:
        clean_tag = tag.strip().lower().lstrip("#")
        if not clean_tag:
            return False
        tag_id = str(uuid.uuid4())
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR IGNORE INTO file_tags (id, file_id, tag) VALUES (?, ?, ?)",
                (tag_id, file_id, clean_tag)
            )
            return cursor.rowcount > 0

    @staticmethod
    def remove_file_tag(file_id: str, tag: str) -> bool:
        clean_tag = tag.strip().lower().lstrip("#")
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM file_tags WHERE file_id = ? AND tag = ?", (file_id, clean_tag))
            return cursor.rowcount > 0

    # ------------------ RECENT ACTIVITY ------------------
    @staticmethod
    def get_recent_files(limit: int = 8) -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT f.id, f.filename, f.path, f.extension, f.file_type, f.file_size,
                       f.modified_at, f.created_at, f.indexed_at,
                       CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END as is_bookmarked
                FROM files f
                LEFT JOIN user_bookmarks b ON f.id = b.file_id
                WHERE f.indexing_status = 'indexed'
                ORDER BY COALESCE(f.modified_at, f.created_at, f.indexed_at) DESC
                LIMIT ?
                """,
                (limit,)
            )
            return [dict(r) for r in cursor.fetchall()]

    # ------------------ SMART COLLECTIONS ------------------
    @staticmethod
    def get_collections_summary() -> List[Dict[str, Any]]:
        """Returns auto-categorized collections with counts and matching criteria."""
        collections_def = [
            {
                "id": "invoices",
                "title": "Invoices & Receipts",
                "description": "Bills, payment receipts, taxes, and financial orders",
                "icon": "🧾",
                "color": "emerald",
                "where": "(f.filename LIKE '%invoice%' OR f.filename LIKE '%receipt%' OR f.filename LIKE '%bill%' OR f.filename LIKE '%tax%' OR f.filename LIKE '%gst%' OR f.filename LIKE '%payment%' OR f.filename LIKE '%order%')"
            },
            {
                "id": "certificates",
                "title": "Certificates & Credentials",
                "description": "Diplomas, credentials, IDs, and certificates",
                "icon": "📜",
                "color": "amber",
                "where": "(f.filename LIKE '%cert%' OR f.filename LIKE '%diploma%' OR f.filename LIKE '%degree%' OR f.filename LIKE '%passport%' OR f.filename LIKE '%license%' OR f.filename LIKE '%identity%' OR f.filename LIKE '%id card%')"
            },
            {
                "id": "study",
                "title": "Study & Notes",
                "description": "Assignments, lectures, summaries, and books",
                "icon": "📓",
                "color": "purple",
                "where": "(f.filename LIKE '%note%' OR f.filename LIKE '%lecture%' OR f.filename LIKE '%assignment%' OR f.filename LIKE '%syllabus%' OR f.filename LIKE '%chapter%' OR f.filename LIKE '%study%' OR f.filename LIKE '%exam%')"
            },
            {
                "id": "code",
                "title": "Code & Configs",
                "description": "Source code, notebooks, scripts, and configs",
                "icon": "💻",
                "color": "blue",
                "where": "f.extension IN ('.py', '.js', '.ts', '.html', '.css', '.json', '.yaml', '.yml', '.sql', '.sh', '.ini', '.ipynb', '.env')"
            },
            {
                "id": "screenshots",
                "title": "Visual Screenshots",
                "description": "All captured screens, error dialogs, and diagrams",
                "icon": "📸",
                "color": "rose",
                "where": "(f.file_type = 'image' OR f.extension IN ('.png', '.jpg', '.jpeg', '.webp'))"
            }
        ]

        results = []
        with get_db_connection() as conn:
            cursor = conn.cursor()
            for col in collections_def:
                try:
                    q = f"SELECT COUNT(*) FROM files f WHERE {col['where']}"
                    cursor.execute(q)
                    cnt = cursor.fetchone()[0] or 0
                except Exception:
                    cnt = 0
                results.append({
                    "id": col["id"],
                    "title": col["title"],
                    "description": col["description"],
                    "icon": col["icon"],
                    "color": col["color"],
                    "count": cnt
                })
        return results

    @staticmethod
    def get_collection_files(collection_id: str, limit: int = 100, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        """Returns files matching a specific collection."""
        where_map = {
            "invoices": "(f.filename LIKE '%invoice%' OR f.filename LIKE '%receipt%' OR f.filename LIKE '%bill%' OR f.filename LIKE '%tax%' OR f.filename LIKE '%gst%' OR f.filename LIKE '%payment%' OR f.filename LIKE '%order%')",
            "certificates": "(f.filename LIKE '%cert%' OR f.filename LIKE '%diploma%' OR f.filename LIKE '%degree%' OR f.filename LIKE '%passport%' OR f.filename LIKE '%license%' OR f.filename LIKE '%identity%' OR f.filename LIKE '%id card%')",
            "study": "(f.filename LIKE '%note%' OR f.filename LIKE '%lecture%' OR f.filename LIKE '%assignment%' OR f.filename LIKE '%syllabus%' OR f.filename LIKE '%chapter%' OR f.filename LIKE '%study%' OR f.filename LIKE '%exam%')",
            "code": "f.extension IN ('.py', '.js', '.ts', '.html', '.css', '.json', '.yaml', '.yml', '.sql', '.sh', '.ini', '.ipynb', '.env')",
            "screenshots": "(f.file_type = 'image' OR f.extension IN ('.png', '.jpg', '.jpeg', '.webp'))"
        }
        where_clause = where_map.get(collection_id.lower())
        if not where_clause:
            return [], 0

        with get_db_connection() as conn:
            cursor = conn.cursor()
            count_q = f"SELECT COUNT(*) FROM files f WHERE {where_clause}"
            cursor.execute(count_q)
            total = cursor.fetchone()[0] or 0

            q = f"""
                SELECT f.id, f.filename, f.path, f.extension, f.file_type, f.file_size,
                       f.created_at, f.modified_at, f.indexed_at, f.indexing_status,
                       CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_bookmarked
                FROM files f
                LEFT JOIN user_bookmarks b ON f.id = b.file_id
                WHERE {where_clause}
                ORDER BY f.modified_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(q, (limit, offset))
            files = [dict(r) for r in cursor.fetchall()]
            return files, total
