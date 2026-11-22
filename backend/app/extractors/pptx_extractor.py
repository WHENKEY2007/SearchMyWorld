from pathlib import Path
from pptx import Presentation
from app.extractors.base import BaseExtractor, ExtractedContent, DocumentPage

class PPTXExtractor(BaseExtractor):
    def extract(self, file_path: Path) -> ExtractedContent:
        prs = Presentation(file_path)
        pages = []
        full_text_parts = []

        for i, slide in enumerate(prs.slides):
            slide_texts = []
            slide_title = None
            if slide.shapes.title and slide.shapes.title.text:
                slide_title = slide.shapes.title.text.strip()

            for shape in slide.shapes:
                if shape.has_text_frame:
                    for paragraph in shape.text_frame.paragraphs:
                        text = paragraph.text.strip()
                        if text:
                            slide_texts.append(text)

            slide_body = "\n".join(slide_texts)
            if slide_body:
                pages.append(DocumentPage(
                    page_number=i + 1,
                    text=slide_body,
                    section_title=slide_title
                ))
                full_text_parts.append(slide_body)

        full_text = "\n\n".join(full_text_parts)

        return ExtractedContent(
            text=full_text,
            pages=pages,
            metadata={"slide_count": len(prs.slides)},
            file_type="document"
        )
