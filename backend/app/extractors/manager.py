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
        self._extractors: Dict[str, BaseExtractor] = {
            ".pdf": PDFExtractor(),
            ".docx": DOCXExtractor(),
            ".pptx": PPTXExtractor(),
            ".txt": TXTExtractor(),
            ".md": TXTExtractor(),
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
