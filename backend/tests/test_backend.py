import os
import tempfile
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.config import settings
from app.database.connection import init_db, get_db_connection
from app.database.repository import DatabaseRepository
from app.extractors.txt_extractor import TXTExtractor
from app.extractors.manager import extractor_manager
from app.services.chunker import chunker
from app.services.embedding import embedding_service
from app.services.search import search_engine
from app.services.indexer import indexing_service
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Use a temporary database for test runs."""
    test_db = tmp_path / "test_searchmyworld.db"
    monkeypatch.setattr(settings, "DATA_DIR", tmp_path)
    monkeypatch.setattr(settings, "DB_NAME", "test_searchmyworld.db")
    init_db()
    yield
    # Cleanup

def test_database_init():
    """Verify that all core tables and FTS5 tables exist."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = {row[0] for row in cursor.fetchall()}
        
        expected_tables = {
            "folders", "files", "document_chunks", "embeddings",
            "image_ocr", "projects", "project_files", "entities",
            "relationships", "decisions", "tasks", "indexing_jobs", "chunks_fts"
        }
        for table in expected_tables:
            assert table in tables, f"Expected table {table} not found in database"

def test_txt_extractor_and_chunker(tmp_path):
    """Verify text extraction and provenance-preserving chunking."""
    test_file = tmp_path / "notes.txt"
    test_file.write_text("# Project Proposal\nWe are building SearchMyWorld.\n# Implementation Details\nPhase 1 covers the local-first backend.", encoding="utf-8")

    extracted = extractor_manager.extract(test_file)
    assert "SearchMyWorld" in extracted.text
    assert len(extracted.pages) > 0

    chunks = chunker.chunk_document("test-file-id-1", extracted)
    assert len(chunks) > 0
    assert chunks[0]["file_id"] == "test-file-id-1"
    assert chunks[0]["page_number"] == 1
    assert "SearchMyWorld" in chunks[0]["content"]

def test_embedding_and_hybrid_search(tmp_path):
    """Verify end-to-end indexing and hybrid search (FTS5 + Dense Embeddings)."""
    # 1. Create a test directory with sample documents
    doc_dir = tmp_path / "documents"
    doc_dir.mkdir()
    
    file1 = doc_dir / "machine_learning.txt"
    file1.write_text(
        "Support Vector Machines and Neural Networks are widely used in machine learning classification tasks.",
        encoding="utf-8"
    )

    file2 = doc_dir / "cooking_recipe.txt"
    file2.write_text(
        "To bake sourdough bread, mix flour, water, salt, and active sourdough starter thoroughly.",
        encoding="utf-8"
    )

    # 2. Add folder and index
    DatabaseRepository.add_folder(str(doc_dir))
    indexing_service.index_all_folders()

    # 3. Verify stats
    stats = DatabaseRepository.get_stats()
    assert stats["total_files"] == 2
    assert stats["indexed_files"] == 2
    assert stats["total_chunks"] >= 2

    # 4. Search for machine learning
    results = search_engine.search("Support Vector Machines", limit=5)
    assert len(results) > 0
    top_result = results[0]
    assert "machine_learning.txt" in top_result["filename"]
    assert "Support Vector" in top_result["snippet"]
    assert top_result["relevance_score"] > 0

def test_api_endpoints(tmp_path):
    """Verify REST API endpoints."""
    # Health check
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

    # Add folder endpoint
    test_folder = tmp_path / "sample_folder"
    test_folder.mkdir()
    res = client.post("/api/folders", json={"path": str(test_folder)})
    assert res.status_code == 200
    data = res.json()
    assert data["path"] == str(test_folder.resolve())

    # List folders endpoint
    res = client.get("/api/folders")
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # Stats endpoint
    res = client.get("/api/stats")
    assert res.status_code == 200
    assert "total_folders" in res.json()

    # Timeline endpoint
    res = client.get("/api/timeline")
    assert res.status_code == 200
    assert "timeline" in res.json()
