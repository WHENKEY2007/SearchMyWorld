import pytest
from pathlib import Path
from app.config import settings
from app.database.connection import init_db
from app.database.repository import DatabaseRepository
from app.services.indexer import indexing_service
from app.services.reconstruction import reconstruction_engine
from app.services.comparison import document_comparison_engine
from app.services.assistant import memory_assistant

@pytest.fixture(autouse=True)
def setup_test_env(tmp_path, monkeypatch):
    test_db = tmp_path / "test_reconstruction.db"
    monkeypatch.setattr(settings, "DATA_DIR", tmp_path)
    monkeypatch.setattr(settings, "DB_NAME", "test_reconstruction.db")
    init_db()
    yield

def test_project_reconstruction_and_classification(tmp_path):
    """Verify 5-tier evidence classification and project history extraction."""
    doc_dir = tmp_path / "project_docs"
    doc_dir.mkdir()

    proposal = doc_dir / "Project_Proposal.txt"
    proposal.write_text(
        "# Signify AI Proposal\n"
        "We plan to build a real-time American Sign Language recognition system.\n"
        "Initial requirements include cloud streaming and mobile apps.\n"
        "We decided to use PyTorch for the initial deep learning prototypes.",
        encoding="utf-8"
    )

    report = doc_dir / "Sprint_Report.txt"
    report.write_text(
        "# Sprint Progress Report\n"
        "We verified implemented local SQLite FTS5 search and dense vector embeddings.\n"
        "Currently developing the visual OCR screenshot extraction pipeline.\n"
        "Audio transcription is identified as a pending task for next quarter.\n"
        "Architecture decision: Switched from cloud vector DB to local SQLite to ensure user privacy.",
        encoding="utf-8"
    )

    DatabaseRepository.add_folder(str(doc_dir))
    indexing_service.index_all_folders()

    # Reconstruct project
    result = reconstruction_engine.reconstruct("Signify AI")
    assert result["total_evidence_chunks"] > 0
    assert "decisions" in result
    assert len(result["decisions"]) > 0

    features = result["feature_analysis"]
    assert len(features) > 0
    statuses = {f["status"] for f in features}
    
    # Verify presence of evidence categories
    assert any(s in statuses for s in ["verified_implemented", "in_progress", "proposed", "pending"])
    for f in features:
        assert f["source_file"] in ["Project_Proposal.txt", "Sprint_Report.txt"]
        assert len(f["evidence_quote"]) > 0

def test_document_comparison(tmp_path):
    """Verify comparison between two document versions."""
    doc_dir = tmp_path / "versions"
    doc_dir.mkdir()

    v1 = doc_dir / "proposal_v1.txt"
    v1.write_text(
        "Objective: Build an offline desktop file search assistant.\n"
        "Requirement: Cloud database hosting with external microservices.\n"
        "Security: Basic token authentication.",
        encoding="utf-8"
    )

    v2 = doc_dir / "report_v2.txt"
    v2.write_text(
        "Objective: Build an offline desktop file search assistant.\n"
        "Requirement: Completely local SQLite database with zero cloud hosting.\n"
        "New feature: Visual OCR memory for error screenshots.",
        encoding="utf-8"
    )

    DatabaseRepository.add_folder(str(doc_dir))
    indexing_service.index_all_folders()

    file_a = DatabaseRepository.get_file_by_path(str(v1))
    file_b = DatabaseRepository.get_file_by_path(str(v2))

    comparison = document_comparison_engine.compare_documents(file_a["id"], file_b["id"])
    assert comparison["document_a"]["filename"] == "proposal_v1.txt"
    assert comparison["document_b"]["filename"] == "report_v2.txt"
    assert len(comparison["unchanged_points"]) > 0
    assert len(comparison["newly_introduced_in_b"]) > 0

def test_grounded_assistant(tmp_path):
    """Verify conversational assistant grounded citations."""
    doc_dir = tmp_path / "notes"
    doc_dir.mkdir()

    note = doc_dir / "algorithm_notes.txt"
    note.write_text("We use Reciprocal Rank Fusion with k=60 to fuse BM25 and vector scores.", encoding="utf-8")

    DatabaseRepository.add_folder(str(doc_dir))
    indexing_service.index_all_folders()

    res = memory_assistant.answer_query("What k value is used in Reciprocal Rank Fusion?")
    assert res["grounded"] is True
    assert len(res["citations"]) > 0
    assert "algorithm_notes.txt" in res["citations"][0]["filename"]
    assert "matching file" in res["answer"].lower()

def test_project_create_and_delete():
    """Verify creating and deleting projects."""
    proj = DatabaseRepository.create_project("Test Temporary Project", "A project to test deletion")
    assert proj["project_name"] == "Test Temporary Project"

    # Delete project
    success = DatabaseRepository.delete_project(proj["id"])
    assert success is True

    # Verify project is gone
    projects = DatabaseRepository.get_projects()
    assert not any(p["id"] == proj["id"] for p in projects)

