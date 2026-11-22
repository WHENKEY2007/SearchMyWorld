# SearchMyWorld — Phase 1: Local-First Backend & Ingestion Engine

SearchMyWorld is an AI-powered personal digital memory system. Phase 1 provides the local core backend:

## Capabilities in Phase 1
- **Local SQLite Database (WAL Mode + FTS5):** Complete schema with foreign keys, indexes, and full-text search.
- **Document & Image Extractors:**
  - PDF: Page-by-page text extraction and metadata (`PyMuPDF`)
  - DOCX: Paragraphs, tables, section headings (`python-docx`)
  - PPTX: Per-slide text extraction and slide titles (`python-pptx`)
  - TXT/MD: Multi-encoding text reader with section headings
  - Images (PNG, JPG, JPEG): Local OCR pipeline (`RapidOCR` + `Pillow`)
- **Provenance Chunker:** Preserves `file_id`, `chunk_index`, `page_number`, and `section_title` with sliding overlapping windows.
- **Embeddings & Hybrid Search:**
  - Local `sentence-transformers` (`all-MiniLM-L6-v2`) with fallback
  - SQLite FTS5 lexical BM25 retrieval
  - Dense cosine similarity retrieval
  - Reciprocal Rank Fusion (RRF) combining lexical and semantic scores
- **Incremental Indexing Service:** SHA-256 hash detection skips unchanged files; background async execution.
- **FastAPI REST API:** Full CRUD for folders, background indexing control, hybrid search, OCR search, file listings, native file opener, timeline, and stats.

## Running the Backend
```bash
# Activate virtual environment
backend\.venv\Scripts\activate

# Run backend server
python run.py
```
Backend will start on `http://127.0.0.1:8000`. Interactive OpenAPI documentation available at `http://127.0.0.1:8000/docs`.
