import os
import tempfile
import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.config import settings
from app.database.connection import init_db, get_db_connection
from app.database.repository import DatabaseRepository
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Temporary test database for isolated testing."""
    test_db = tmp_path / "test_searchmyworld.db"
    monkeypatch.setattr(settings, "DATA_DIR", tmp_path)
    monkeypatch.setattr(settings, "DB_NAME", "test_searchmyworld.db")
    init_db()
    yield

def test_folder_breakdown_and_duplicates(tmp_path):
    # 1. Create a test folder and files
    folder_a = tmp_path / "Screenshots"
    folder_a.mkdir()
    
    file1 = folder_a / "Screenshot_1.png"
    file1.write_bytes(b"image_content_A")
    file2 = folder_a / "Screenshot_copy.png"
    file2.write_bytes(b"image_content_A") # Duplicate of file1
    file3 = folder_a / "Document.pdf"
    file3.write_bytes(b"pdf_content_B")

    # Add folder
    folder_rec = DatabaseRepository.add_folder(str(folder_a))
    fid = folder_rec["id"]

    # Insert files
    f1_id = DatabaseRepository.upsert_file(
        folder_id=fid, filename=file1.name, path=str(file1),
        extension=".png", file_type="image", file_hash="hash_AAA",
        file_size=len(b"image_content_A"), created_at="2026-07-01T10:00:00",
        modified_at="2026-07-01T10:00:00", indexing_status="indexed"
    )
    f2_id = DatabaseRepository.upsert_file(
        folder_id=fid, filename=file2.name, path=str(file2),
        extension=".png", file_type="image", file_hash="hash_AAA",
        file_size=len(b"image_content_A"), created_at="2026-07-02T10:00:00",
        modified_at="2026-07-02T10:00:00", indexing_status="indexed"
    )
    f3_id = DatabaseRepository.upsert_file(
        folder_id=fid, filename=file3.name, path=str(file3),
        extension=".pdf", file_type="document", file_hash="hash_BBB",
        file_size=len(b"pdf_content_B"), created_at="2026-07-03T10:00:00",
        modified_at="2026-07-03T10:00:00", indexing_status="indexed"
    )

    # Test folder breakdown
    stats = DatabaseRepository.get_folder_breakdown_stats()
    assert len(stats) >= 1
    f_stat = stats[0]
    assert f_stat["total_files"] == 3
    assert f_stat["extension_counts"][".png"] == 2
    assert f_stat["extension_counts"][".pdf"] == 1
    assert f_stat["duplicate_count"] == 1
    assert f_stat["reclaimable_bytes"] == len(b"image_content_A")

    # Test duplicate suggestions
    dups = DatabaseRepository.get_duplicate_suggestions()
    assert dups["total_duplicate_files"] == 1
    assert len(dups["groups"]) == 1
    group = dups["groups"][0]
    assert group["primary_file"]["id"] == f1_id
    assert group["primary_file"]["is_primary"] is True
    assert group["duplicates"][0]["id"] == f2_id
    assert group["duplicates"][0]["is_primary"] is False

    # Test API endpoint /api/stats/folders
    res = client.get("/api/stats/folders")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1
    assert data[0]["total_files"] == 3

    # Test API endpoint /api/files/duplicates
    res = client.get("/api/files/duplicates")
    assert res.status_code == 200
    dup_res = res.json()
    assert dup_res["total_duplicate_files"] == 1

    # Test deleting duplicate file with disk deletion
    assert file2.exists()
    del_res = client.delete(f"/api/files/{f2_id}?delete_from_disk=true")
    assert del_res.status_code == 200
    assert not file2.exists() # Verify deleted from disk
    assert file1.exists()     # Original file preserved!

    # Verify duplicate count updated to 0
    dups_after = DatabaseRepository.get_duplicate_suggestions()
    assert dups_after["total_duplicate_files"] == 0

def test_visual_memory_search_and_sorting(tmp_path):
    img_dir = tmp_path / "Images"
    img_dir.mkdir()
    f1 = img_dir / "Screen1.png"
    f1.write_bytes(b"img1")
    f2 = img_dir / "Screen2.png"
    f2.write_bytes(b"img2")

    f1_id = DatabaseRepository.upsert_file(
        folder_id=None, filename=f1.name, path=str(f1),
        extension=".png", file_type="image", file_hash="h1",
        file_size=1000, created_at="2026-07-01T12:00:00",
        modified_at="2026-07-01T12:00:00", indexing_status="indexed"
    )
    f2_id = DatabaseRepository.upsert_file(
        folder_id=None, filename=f2.name, path=str(f2),
        extension=".png", file_type="image", file_hash="h2",
        file_size=2000, created_at="2026-07-02T12:00:00",
        modified_at="2026-07-02T12:00:00", indexing_status="indexed"
    )

    DatabaseRepository.insert_image_ocr(f1_id, "Python pip install fast-glob error")
    DatabaseRepository.insert_image_ocr(f2_id, "Database connection timeout error in MySQL")

    # Search with query
    res = client.get("/api/search/ocr?q=install")
    assert res.status_code == 200
    items = res.json()
    assert len(items) == 1
    assert items[0]["filename"] == "Screen1.png"

    # Search without query (browse all)
    res_all = client.get("/api/search/ocr?sort_by=date_desc")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 2
    assert res_all.json()[0]["filename"] == "Screen2.png" # Newer date first

    # Sort by size
    res_size = client.get("/api/search/ocr?sort_by=size_desc")
    assert res_size.status_code == 200
    assert res_size.json()[0]["file_size"] == 2000

def test_auto_detect_projects_and_auto_sync(tmp_path):
    # 1. Create a project directory with code files
    proj_dir = tmp_path / "MyWebProject"
    proj_dir.mkdir()
    (proj_dir / "app.py").write_text("from fastapi import FastAPI\napp = FastAPI()", encoding="utf-8")
    (proj_dir / "README.md").write_text("# My Web Project\nA fast web app", encoding="utf-8")

    folder_rec = DatabaseRepository.add_folder(str(proj_dir))
    fid = folder_rec["id"]

    DatabaseRepository.upsert_file(
        folder_id=fid, filename="app.py", path=str(proj_dir / "app.py"),
        extension=".py", file_type="code", file_hash="p1",
        file_size=50, created_at="2026-07-01T12:00:00",
        modified_at="2026-07-01T12:00:00", indexing_status="indexed"
    )

    # Test auto-detect projects
    projects = DatabaseRepository.auto_detect_projects()
    assert len(projects) >= 1
    p = next((x for x in projects if x.get("project_name") == "MyWebProject"), None)
    assert p is not None
    assert "MyWebProject" in p["description"]

    # Test API endpoint
    res = client.post("/api/projects/auto-detect")
    assert res.status_code == 200
    p_data = res.json()
    assert len(p_data) >= 1

    # Test auto-sync endpoints
    sync_status = client.get("/api/index/auto_sync")
    assert sync_status.status_code == 200
    assert "auto_sync_enabled" in sync_status.json()

    toggle_off = client.post("/api/index/auto_sync/toggle?enabled=false")
    assert toggle_off.status_code == 200
    assert toggle_off.json()["auto_sync_enabled"] is False

    toggle_on = client.post("/api/index/auto_sync/toggle?enabled=true")
    assert toggle_on.status_code == 200
    assert toggle_on.json()["auto_sync_enabled"] is True

def test_expanded_extractors_and_assistant(tmp_path):
    from app.extractors.manager import ExtractorManager
    from app.services.assistant import MemoryAssistantService

    mgr = ExtractorManager()
    # 1. Test extractor manager supports expanded extensions
    for ext in [".json", ".csv", ".py", ".sql", ".yaml", ".md", ".txt"]:
        assert mgr.is_supported(Path(f"test{ext}")) is True

    # Extract test file
    code_file = tmp_path / "script.py"
    code_file.write_text("def hello_world():\n    print('SearchMyWorld Engine')", encoding="utf-8")
    extracted = mgr.extract(code_file)
    assert extracted is not None
    assert "SearchMyWorld Engine" in extracted.text

    # 2. Test Assistant grounded extractive synthesis
    asst = MemoryAssistantService()
    context = [
        {"snippet": "SearchMyWorld is an offline-first desktop cognitive assistant that indexes local files and screenshots.", "filename": "docs.md"},
        {"snippet": "It uses RapidOCR for local image text extraction with zero external cloud dependencies.", "filename": "ocr.md"}
    ]
    citations = [{"filename": "docs.md", "snippet": "docs"}, {"filename": "ocr.md", "snippet": "ocr"}]
    ans = asst._synthesize_extractive_answer("What does SearchMyWorld use for image text extraction?", context, citations)
    assert "RapidOCR" in ans

def test_persistent_chat_and_document_mode(tmp_path):
    # 1. Create conversation
    res = client.post("/api/assistant/conversations", json={"title": "Test Chat Thread"})
    assert res.status_code == 200
    conv_id = res.json()["id"]

    # 2. Chat with memory within this conversation
    chat_res = client.post("/api/assistant/chat", json={
        "conversation_id": conv_id,
        "query": "What is SearchMyWorld?"
    })
    assert chat_res.status_code == 200
    assert "answer" in chat_res.json()
    assert chat_res.json()["conversation_id"] == conv_id

    # 3. Retrieve conversation history
    hist_res = client.get(f"/api/assistant/conversations/{conv_id}")
    assert hist_res.status_code == 200
    messages = hist_res.json()["messages"]
    assert len(messages) >= 2
    assert messages[0]["sender"] == "user"
    assert messages[1]["sender"] == "assistant"

    # 4. List all conversations
    list_res = client.get("/api/assistant/conversations")
    assert list_res.status_code == 200
    assert any(c["id"] == conv_id for c in list_res.json())

    # 5. Delete conversation
    del_res = client.delete(f"/api/assistant/conversations/{conv_id}")
    assert del_res.status_code == 200


