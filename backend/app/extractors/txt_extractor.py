from pathlib import Path
from app.extractors.base import BaseExtractor, ExtractedContent, DocumentPage

class TXTExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> ExtractedContent:
        # Try multiple encodings for local text documents
        text = ""
        for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    text = f.read()
                break
            except UnicodeDecodeError:
                continue

        lines = text.splitlines()
        pages = []
        current_chunk_lines = []
        page_num = 1
        current_section = None

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("#"):
                current_section = stripped.lstrip("#").strip()
            current_chunk_lines.append(line)

            # Paginate plain text every ~40 lines
            if len(current_chunk_lines) >= 40:
                pages.append(DocumentPage(
                    page_number=page_num,
                    text="\n".join(current_chunk_lines),
                    section_title=current_section
                ))
                page_num += 1
                current_chunk_lines = []

        if current_chunk_lines:
            pages.append(DocumentPage(
                page_number=page_num,
                text="\n".join(current_chunk_lines),
                section_title=current_section
            ))

        return ExtractedContent(
            text=text,
            pages=pages,
            metadata={"line_count": len(lines), "char_count": len(text)},
            file_type="document"
        )
