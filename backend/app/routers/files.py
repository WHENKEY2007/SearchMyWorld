import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse as FastApiFileResponse
from typing import Optional, List
from app.models.schemas import FileResponse, FileListResponse
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("", response_model=FileListResponse)
def list_files(
    extension: Optional[str] = None,
    file_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    files, total = DatabaseRepository.get_all_files(
        extension=extension,
        file_type=file_type,
        limit=limit,
        offset=offset
    )
    return {
        "files": files,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/{file_id}/view")
def view_file(file_id: str):
    """Serves the actual file for in-browser viewing (PDFs, images, text)."""
    file_rec = DatabaseRepository.get_file_by_id(file_id)
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(file_rec["path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    ext = file_path.suffix.lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return FastApiFileResponse(
        path=str(file_path.resolve()),
        media_type=media_type,
        filename=file_rec["filename"]
    )

@router.get("/{file_id}")
def get_file_details(file_id: str):
    file_rec = DatabaseRepository.get_file_by_id(file_id)
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found")
    
    chunks = DatabaseRepository.get_chunks_by_file_id(file_id)
    return {
        "file": file_rec,
        "chunks_count": len(chunks),
        "chunks": chunks
    }

@router.post("/{file_id}/open")
def open_original_file(file_id: str):
    """Opens the original file using the native Windows default application."""
    file_rec = DatabaseRepository.get_file_by_id(file_id)
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(file_rec["path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File no longer exists on disk")

    try:
        # Native Windows file opener (calls ShellExecuteW directly)
        os.startfile(str(file_path))
        return {"message": f"Opened file {file_path.name} in default application"}
    except Exception as e:
        # If file extension has no registered default application, reveal it in File Explorer
        try:
            import subprocess
            subprocess.Popen(f'explorer.exe /select,"{str(file_path)}"', shell=True)
            return {"message": f"Revealed {file_path.name} in File Explorer"}
        except Exception:
            raise HTTPException(status_code=500, detail=f"Could not open file: {str(e)}")

