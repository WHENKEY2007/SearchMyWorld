from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Dict, Any

@dataclass
class DocumentPage:
    page_number: int
    text: str
    section_title: Optional[str] = None

@dataclass
class ExtractedContent:
    text: str
    pages: List[DocumentPage] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    file_type: str = "document" # "document" | "image"

class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_path: Path) -> ExtractedContent:
        """Extract plain text and structured pages/sections from a file."""
        pass
