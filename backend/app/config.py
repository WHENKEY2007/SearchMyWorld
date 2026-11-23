import os
from pathlib import Path
from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "SearchMyWorld"
    VERSION: str = "0.1.0"
    API_PREFIX: str = "/api"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Storage and Database paths
    DATA_DIR: Path = Path(os.getenv("SEARCHMYWORLD_DATA_DIR", Path.home() / ".searchmyworld"))
    DB_NAME: str = "searchmyworld.db"
    
    @property
    def DB_PATH(self) -> Path:
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        return self.DATA_DIR / self.DB_NAME

    # Text Chunking Settings
    CHUNK_SIZE: int = 900          # characters per chunk (~200-250 tokens)
    CHUNK_OVERLAP: int = 150       # character overlap between consecutive chunks
    
    # Embedding Model Settings
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIM: int = 384
    
    # Supported File Extensions
    SUPPORTED_DOC_EXTENSIONS: set = {
        ".pdf", ".docx", ".pptx", ".txt", ".md",
        ".csv", ".tsv", ".json", ".py", ".js", ".ts",
        ".html", ".css", ".yaml", ".yml", ".xml", ".log", ".sql", ".ini", ".rtf"
    }
    SUPPORTED_IMAGE_EXTENSIONS: set = {".png", ".jpg", ".jpeg"}

    @property
    def ALL_SUPPORTED_EXTENSIONS(self) -> set:
        return self.SUPPORTED_DOC_EXTENSIONS | self.SUPPORTED_IMAGE_EXTENSIONS

settings = Settings()
