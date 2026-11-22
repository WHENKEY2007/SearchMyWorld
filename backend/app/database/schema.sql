-- SearchMyWorld Core Database Schema
-- Local SQLite with WAL mode and FTS5 enabled

CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    indexing_enabled BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    folder_id TEXT,
    filename TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    extension TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'document' | 'image'
    file_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP,
    modified_at TIMESTAMP,
    indexed_at TIMESTAMP,
    indexing_status TEXT DEFAULT 'pending', -- 'pending' | 'indexed' | 'failed' | 'skipped'
    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_files_hash ON files(file_hash);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);

CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    page_number INTEGER,
    section_title TEXT,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chunks_file ON document_chunks(file_id);

CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    chunk_id TEXT NOT NULL UNIQUE,
    embedding_data BLOB NOT NULL, -- Serialized float32 numpy array
    model_name TEXT NOT NULL,
    FOREIGN KEY(chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS image_ocr (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL UNIQUE,
    extracted_text TEXT NOT NULL,
    processing_status TEXT DEFAULT 'completed', -- 'completed' | 'failed'
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    file_id TEXT NOT NULL,
    association_confidence REAL DEFAULT 1.0,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE,
    UNIQUE(project_id, file_id)
);

CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL -- 'topic' | 'person' | 'technology' | 'tool' | 'concept'
);

CREATE TABLE IF NOT EXISTS relationships (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    evidence_chunk_id TEXT,
    FOREIGN KEY(source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_chunk_id) REFERENCES document_chunks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS decisions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    decision_description TEXT NOT NULL,
    decision_date TEXT,
    source_chunk_id TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(source_chunk_id) REFERENCES document_chunks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    task_description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown', -- 'proposed' | 'in_progress' | 'verified_implemented' | 'pending' | 'unknown'
    source_chunk_id TEXT,
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY(source_chunk_id) REFERENCES document_chunks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS indexing_jobs (
    id TEXT PRIMARY KEY,
    file_id TEXT,
    status TEXT NOT NULL, -- 'queued' | 'processing' | 'completed' | 'failed'
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

-- Full Text Search virtual table for lexical retrieval
CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
    chunk_id UNINDEXED,
    file_id UNINDEXED,
    content,
    filename,
    tokenize = 'porter unicode61'
);
