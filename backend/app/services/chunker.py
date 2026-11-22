import uuid
from typing import List, Dict, Any
from app.extractors.base import ExtractedContent, DocumentPage
from app.config import settings

class DocumentChunker:
    def __init__(self, chunk_size: int = settings.CHUNK_SIZE, overlap: int = settings.CHUNK_OVERLAP):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(self, file_id: str, extracted: ExtractedContent) -> List[Dict[str, Any]]:
        """
        Split extracted document content into structured chunks,
        preserving page numbers and section headers.
        """
        chunks = []
        chunk_idx = 0

        # If pages are available, chunk page by page to keep exact page provenance
        if extracted.pages:
            for page in extracted.pages:
                page_text = page.text.strip()
                if not page_text:
                    continue

                if len(page_text) <= self.chunk_size:
                    chunks.append({
                        "id": str(uuid.uuid4()),
                        "file_id": file_id,
                        "chunk_index": chunk_idx,
                        "content": page_text,
                        "page_number": page.page_number,
                        "section_title": page.section_title
                    })
                    chunk_idx += 1
                else:
                    # Sliding window with overlap
                    start = 0
                    while start < len(page_text):
                        end = min(start + self.chunk_size, len(page_text))
                        # Try to split on newline or period if possible
                        if end < len(page_text):
                            split_pos = max(page_text.rfind("\n", start, end), page_text.rfind(". ", start, end))
                            if split_pos > start + (self.chunk_size // 2):
                                end = split_pos + 1

                        chunk_content = page_text[start:end].strip()
                        if chunk_content:
                            chunks.append({
                                "id": str(uuid.uuid4()),
                                "file_id": file_id,
                                "chunk_index": chunk_idx,
                                "content": chunk_content,
                                "page_number": page.page_number,
                                "section_title": page.section_title
                            })
                            chunk_idx += 1

                        if end >= len(page_text):
                            break
                        start = max(start + 1, end - self.overlap)
        else:
            # Fallback for full text without page objects
            full_text = extracted.text.strip()
            if full_text:
                start = 0
                while start < len(full_text):
                    end = min(start + self.chunk_size, len(full_text))
                    chunk_content = full_text[start:end].strip()
                    if chunk_content:
                        chunks.append({
                            "id": str(uuid.uuid4()),
                            "file_id": file_id,
                            "chunk_index": chunk_idx,
                            "content": chunk_content,
                            "page_number": 1,
                            "section_title": None
                        })
                        chunk_idx += 1
                    if end >= len(full_text):
                        break
                    start = max(start + 1, end - self.overlap)

        return chunks

chunker = DocumentChunker()
