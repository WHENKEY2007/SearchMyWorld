from pathlib import Path
from docx import Document
from app.extractors.base import BaseExtractor, ExtractedContent, DocumentPage

class DOCXExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> ExtractedContent:
        doc = Document(file_path)
        paragraphs_text = []
        pages = []
        current_section = None
        current_page_text = []
        page_num = 1

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            if p.style and p.style.name.startswith("Heading"):
                current_section = text
            current_page_text.append(text)
            paragraphs_text.append(text)
            
            # Estimate pages every ~500 words or after big sections
            if len(" ".join(current_page_text).split()) > 400:
                pages.append(DocumentPage(
                    page_number=page_num,
                    text="\n".join(current_page_text),
                    section_title=current_section
                ))
                page_num += 1
                current_page_text = []

        # Extract table cells as well
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    paragraphs_text.append(row_text)
                    current_page_text.append(row_text)

        if current_page_text:
            pages.append(DocumentPage(
                page_number=page_num,
                text="\n".join(current_page_text),
                section_title=current_section
            ))

        full_text = "\n\n".join(paragraphs_text)

        return ExtractedContent(
            text=full_text,
            pages=pages,
            metadata={"paragraphs_count": len(doc.paragraphs), "tables_count": len(doc.tables)},
            file_type="document"
        )
