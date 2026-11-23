from pathlib import Path
from typing import Optional, Dict
from app.extractors.base import BaseExtractor, ExtractedContent
from app.extractors.pdf_extractor import PDFExtractor
from app.extractors.docx_extractor import DOCXExtractor
from app.extractors.pptx_extractor import PPTXExtractor
from app.extractors.txt_extractor import TXTExtractor
from app.extractors.image_ocr import ImageOCRExtractor
from app.config import settings

class ExtractorManager:
    def __init__(self):
        txt_extractor = TXTExtractor()
        self._extractors: Dict[str, BaseExtractor] = {
            ".pdf": PDFExtractor(),
            ".docx": DOCXExtractor(),
            ".pptx": PPTXExtractor(),
            ".txt": txt_extractor,
            ".md": txt_extractor,
            ".csv": txt_extractor,
            ".tsv": txt_extractor,
            ".json": txt_extractor,
            ".py": txt_extractor,
            ".js": txt_extractor,
            ".ts": txt_extractor,
            ".html": txt_extractor,
            ".css": txt_extractor,
            ".yaml": txt_extractor,
            ".yml": txt_extractor,
            ".xml": txt_extractor,
            ".log": txt_extractor,
            ".sql": txt_extractor,
            ".ini": txt_extractor,
            ".rtf": txt_extractor,
            ".png": ImageOCRExtractor(),
            ".jpg": ImageOCRExtractor(),
            ".jpeg": ImageOCRExtractor(),
        }

    def is_supported(self, file_path: Path) -> bool:
        return file_path.suffix.lower() in self._extractors

    def get_file_type(self, file_path: Path) -> str:
        ext = file_path.suffix.lower()
        if ext in settings.SUPPORTED_IMAGE_EXTENSIONS:
            return "image"
        return "document"

    def extract(self, file_path: Path) -> ExtractedContent:
        ext = file_path.suffix.lower()
        extractor = self._extractors.get(ext)
        if not extractor:
            raise ValueError(f"Unsupported file format: {ext}")
        return extractor.extract(file_path)

extractor_manager = ExtractorManager()
