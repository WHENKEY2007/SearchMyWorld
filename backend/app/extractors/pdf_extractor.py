from pathlib import Path
import pymupdf
from app.extractors.base import BaseExtractor, ExtractedContent, DocumentPage

class PDFExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> ExtractedContent:
        doc = pymupdf.open(file_path)
        pages = []
        full_text_parts = []
        
        metadata = {
            "page_count": len(doc),
            "title": doc.metadata.get("title", ""),
            "author": doc.metadata.get("author", ""),
            "subject": doc.metadata.get("subject", ""),
        }

        for i, page in enumerate(doc):
            text = page.get_text("text").strip()
            if text:
                pages.append(DocumentPage(
                    page_number=i + 1,
                    text=text,
                    section_title=None
                ))
                full_text_parts.append(text)

        doc.close()
        full_text = "\n\n".join(full_text_parts)

        return ExtractedContent(
            text=full_text,
            pages=pages,
            metadata=metadata,
            file_type="document"
        )
