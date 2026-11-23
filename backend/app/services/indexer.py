import os
import hashlib
import uuid
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.config import settings
from app.database.repository import DatabaseRepository
from app.extractors.manager import extractor_manager
from app.services.chunker import chunker
from app.services.embedding import embedding_service

logger = logging.getLogger(__name__)

class IndexingService:
    def __init__(self):
        self.is_indexing = False
        self.current_progress = {
            "total_files_discovered": 0,
            "processed_files": 0,
            "indexed_files": 0,
            "skipped_files": 0,
            "failed_files": 0,
            "current_file": None,
            "status": "idle"
        }

    def compute_sha256(self, file_path: Path) -> str:
        """Compute SHA-256 hash of a file efficiently in chunks."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def scan_and_index_file(self, file_path: Path, folder_id: Optional[str] = None) -> Dict[str, Any]:
        """Index or update a single file incrementally."""
        if not file_path.exists() or not extractor_manager.is_supported(file_path):
            return {"status": "unsupported", "path": str(file_path)}

        file_stat = file_path.stat()
        file_hash = self.compute_sha256(file_path)
        file_type = extractor_manager.get_file_type(file_path)
        
        created_at = datetime.fromtimestamp(file_stat.st_ctime).isoformat()
        modified_at = datetime.fromtimestamp(file_stat.st_mtime).isoformat()
        file_size = file_stat.st_size

        # Check existing record
        existing = DatabaseRepository.get_file_by_path(str(file_path))
        if existing and existing["file_hash"] == file_hash and existing["indexing_status"] == "indexed":
            logger.info(f"Skipping unchanged file: {file_path.name}")
            return {"status": "skipped", "file_id": existing["id"], "path": str(file_path)}

        # Record file as pending
        file_id = DatabaseRepository.upsert_file(
            folder_id=folder_id,
            filename=file_path.name,
            path=str(file_path),
            extension=file_path.suffix.lower(),
            file_type=file_type,
            file_hash=file_hash,
            file_size=file_size,
            created_at=created_at,
            modified_at=modified_at,
            indexing_status="processing"
        )

        job_id = DatabaseRepository.record_indexing_job(file_id=file_id, status="processing")

        try:
            # Clean old chunks/embeddings if re-indexing an existing file
            if existing:
                DatabaseRepository.delete_file_records(file_id)
                # Re-insert the file record
                file_id = DatabaseRepository.upsert_file(
                    folder_id=folder_id,
                    filename=file_path.name,
                    path=str(file_path),
                    extension=file_path.suffix.lower(),
                    file_type=file_type,
                    file_hash=file_hash,
                    file_size=file_size,
                    created_at=created_at,
                    modified_at=modified_at,
                    indexing_status="processing"
                )

            # Extract content
            extracted = extractor_manager.extract(file_path)

            if file_type == "image":
                # Save to OCR store
                DatabaseRepository.insert_image_ocr(file_id, extracted.text, "completed")

            # Chunk document or OCR text
            doc_chunks = chunker.chunk_document(file_id, extracted)

            if doc_chunks:
                # Insert chunks into DB and FTS5
                DatabaseRepository.insert_chunks(doc_chunks, file_path.name)

                # Generate and store dense embeddings
                chunk_texts = [c["content"] for c in doc_chunks]
                vectors = embedding_service.encode(chunk_texts)

                embeddings_to_insert = [
                    (str(uuid.uuid4()), doc_chunks[i]["id"], vectors[i], settings.EMBEDDING_MODEL_NAME)
                    for i in range(len(doc_chunks))
                ]
                DatabaseRepository.insert_embeddings(embeddings_to_insert)

            DatabaseRepository.mark_file_status(file_id, "indexed")
            DatabaseRepository.record_indexing_job(file_id=file_id, status="completed")
            return {"status": "indexed", "file_id": file_id, "chunks_count": len(doc_chunks)}

        except Exception as e:
            logger.error(f"Failed to index {file_path}: {str(e)}", exc_info=True)
            DatabaseRepository.mark_file_status(file_id, "failed")
            DatabaseRepository.record_indexing_job(file_id=file_id, status="failed", error_message=str(e))
            return {"status": "failed", "file_id": file_id, "error": str(e)}

    def index_all_folders(self) -> Dict[str, Any]:
        """Traverse all configured folders and run incremental indexing."""
        if self.is_indexing:
            return {"message": "Indexing already in progress", "progress": self.current_progress}

        folders = DatabaseRepository.get_folders()
        self.is_indexing = True
        self.current_progress = {
            "total_files_discovered": 0,
            "processed_files": 0,
            "indexed_files": 0,
            "skipped_files": 0,
            "failed_files": 0,
            "current_file": None,
            "status": "indexing"
        }

        try:
            discovered = []
            for folder in folders:
                if not folder["indexing_enabled"]:
                    continue
                folder_path = Path(folder["path"])
                if not folder_path.exists():
                    continue

                for root, _, filenames in os.walk(folder_path):
                    for fname in filenames:
                        fp = Path(root) / fname
                        if extractor_manager.is_supported(fp):
                            discovered.append((fp, folder["id"]))

            self.current_progress["total_files_discovered"] = len(discovered)

            for fp, f_id in discovered:
                self.current_progress["current_file"] = fp.name
                res = self.scan_and_index_file(fp, folder_id=f_id)
                self.current_progress["processed_files"] += 1

                if res["status"] == "indexed":
                    self.current_progress["indexed_files"] += 1
                elif res["status"] == "skipped":
                    self.current_progress["skipped_files"] += 1
                elif res["status"] == "failed":
                    self.current_progress["failed_files"] += 1

            self.current_progress["status"] = "completed"
        except Exception as e:
            logger.error(f"Error during folder indexing: {str(e)}")
            self.current_progress["status"] = "error"
        finally:
            self.is_indexing = False
            self.current_progress["current_file"] = None

        return self.current_progress

    def start_background_watcher(self, poll_interval_seconds: int = 20):
        """Starts a background daemon thread that periodically scans monitored folders for changes."""
        import threading
        if hasattr(self, "_watcher_thread") and self._watcher_thread and self._watcher_thread.is_alive():
            return
        self.auto_sync_enabled = True
        self.last_auto_sync = None
        self.auto_sync_count = 0
        self._stop_watcher = threading.Event()
        self._watcher_thread = threading.Thread(
            target=self._watcher_loop,
            args=(poll_interval_seconds,),
            daemon=True,
            name="SearchMyWorld-FolderWatcher"
        )
        self._watcher_thread.start()
        logger.info(f"Started SearchMyWorld Background Folder Auto-Watcher (poll every {poll_interval_seconds}s).")

    def stop_background_watcher(self):
        if hasattr(self, "_stop_watcher"):
            self._stop_watcher.set()

    def get_auto_sync_status(self) -> Dict[str, Any]:
        folders = DatabaseRepository.get_folders()
        return {
            "auto_sync_enabled": getattr(self, "auto_sync_enabled", True),
            "is_indexing": self.is_indexing,
            "last_auto_sync": getattr(self, "last_auto_sync", None),
            "auto_sync_count": getattr(self, "auto_sync_count", 0),
            "monitored_folders": len(folders)
        }

    def _watcher_loop(self, poll_interval: int):
        import time
        while not self._stop_watcher.is_set():
            time.sleep(poll_interval)
            if not getattr(self, "auto_sync_enabled", True) or self.is_indexing:
                continue

            try:
                folders = DatabaseRepository.get_folders()
                changed_or_new = []

                for folder in folders:
                    if not folder.get("indexing_enabled", True):
                        continue
                    folder_path = Path(folder["path"])
                    if not folder_path.exists():
                        continue

                    # Scan for new or modified files
                    for root, _, filenames in os.walk(folder_path):
                        for fname in filenames:
                            fp = Path(root) / fname
                            if not extractor_manager.is_supported(fp):
                                continue
                            try:
                                mtime = datetime.fromtimestamp(fp.stat().st_mtime).isoformat()
                                existing = DatabaseRepository.get_file_by_path(str(fp))
                                if not existing or existing.get("modified_at") != mtime or existing.get("indexing_status") != "indexed":
                                    changed_or_new.append((fp, folder["id"]))
                            except Exception:
                                continue

                for fp, f_id in changed_or_new:
                    if self._stop_watcher.is_set():
                        break
                    res = self.scan_and_index_file(fp, folder_id=f_id)
                    if res.get("status") == "indexed":
                        self.auto_sync_count = getattr(self, "auto_sync_count", 0) + 1
                        logger.info(f"[Auto-Watcher] Automatically indexed: {fp.name}")

                self.last_auto_sync = datetime.now().isoformat()
            except Exception as e:
                logger.debug(f"[Auto-Watcher] Exception in watcher loop: {e}")

indexing_service = IndexingService()
