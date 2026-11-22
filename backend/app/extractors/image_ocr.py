from pathlib import Path
from PIL import Image
from typing import Optional
from app.extractors.base import BaseExtractor, ExtractedContent, DocumentPage

class ImageOCRExtractor(BaseExtractor):
    def __init__(self):
        self._ocr_engine = None

    def _get_engine(self):
        if self._ocr_engine is None:
            try:
                from rapidocr_onnxruntime import RapidOCR
                self._ocr_engine = RapidOCR()
            except ImportError:
                self._ocr_engine = False
        return self._ocr_engine

    def extract(self, file_path: Path) -> ExtractedContent:
        engine = self._get_engine()
        extracted_text = ""
        
        # Verify image opens with Pillow
        with Image.open(file_path) as img:
            width, height = img.size
            metadata = {
                "format": img.format,
                "width": width,
                "height": height,
                "mode": img.mode
            }

        if engine:
            try:
                result, elapse = engine(str(file_path))
                if result:
                    lines = [line[1] for line in result if line and len(line) > 1]
                    extracted_text = "\n".join(lines)
            except Exception as e:
                extracted_text = f"[OCR Extraction Error: {str(e)}]"
        else:
            extracted_text = "[RapidOCR not installed or unavailable]"

        pages = [
            DocumentPage(
                page_number=1,
                text=extracted_text,
                section_title="Visual OCR"
            )
        ]

        return ExtractedContent(
            text=extracted_text,
            pages=pages,
            metadata=metadata,
            file_type="image"
        )
