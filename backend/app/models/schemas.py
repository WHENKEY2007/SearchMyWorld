from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class FolderAddRequest(BaseModel):
    path: str

class FolderResponse(BaseModel):
    id: str
    path: str
    created_at: Optional[str] = None
    indexing_enabled: bool = True

class SearchRequest(BaseModel):
    query: str
    limit: int = 20
    extension: Optional[str] = None
    file_type: Optional[str] = None
    folder_id: Optional[str] = None
    date_range: Optional[str] = None
    only_bookmarked: bool = False

class SearchResultItem(BaseModel):
    chunk_id: str
    file_id: str
    filename: str
    path: str
    extension: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    snippet: str
    full_content: str
    relevance_score: float
    matched_by: List[str]
    is_bookmarked: bool = False

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]

class ImageOCRSearchResult(BaseModel):
    id: str
    file_id: str
    filename: str
    path: str
    extracted_text: str
    modified_at: Optional[str] = None
    created_at: Optional[str] = None
    file_size: int

class DuplicateFileItem(BaseModel):
    id: str
    folder_id: Optional[str] = None
    filename: str
    path: str
    extension: str
    file_type: str
    file_size: int
    created_at: Optional[str] = None
    modified_at: Optional[str] = None
    is_primary: bool = False
    reason: str = ""

class DuplicateGroup(BaseModel):
    file_hash: str
    file_size: int
    total_copies: int
    reclaimable_bytes: int
    primary_file: DuplicateFileItem
    duplicates: List[DuplicateFileItem]

class DuplicateSummaryResponse(BaseModel):
    total_duplicate_files: int
    total_groups: int
    total_reclaimable_bytes: int
    groups: List[DuplicateGroup]

class FolderStatsDetail(BaseModel):
    folder_id: str
    folder_path: str
    total_files: int
    indexed_files: int
    total_size_bytes: int
    extension_counts: Dict[str, int]
    duplicate_count: int
    reclaimable_bytes: int
    delete_suggestions_count: int

class FileResponse(BaseModel):
    id: str
    folder_id: Optional[str] = None
    filename: str
    path: str
    extension: str
    file_type: str
    file_hash: str
    file_size: int
    created_at: Optional[str] = None
    modified_at: Optional[str] = None
    indexed_at: Optional[str] = None
    indexing_status: str

class FileListResponse(BaseModel):
    files: List[FileResponse]
    total: int
    limit: int
    offset: int

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    project_name: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class StatsResponse(BaseModel):
    total_folders: int
    total_files: int
    indexed_files: int
    total_chunks: int
    total_images_ocr: int
    type_distribution: Dict[str, int]
    extension_distribution: Dict[str, int]

class IndexingProgressResponse(BaseModel):
    total_files_discovered: int
    processed_files: int
    indexed_files: int
    skipped_files: int
    failed_files: int
    current_file: Optional[str] = None
    status: str
