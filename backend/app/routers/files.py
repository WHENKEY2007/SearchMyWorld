import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse as FastApiFileResponse
from typing import Optional, List
from app.models.schemas import FileResponse, FileListResponse, DuplicateSummaryResponse
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/files", tags=["Files"])

@router.get("", response_model=FileListResponse)
def list_files(
    extension: Optional[str] = None,
    file_type: Optional[str] = None,
    folder_id: Optional[str] = None,
    sort_by: Optional[str] = Query("modified_desc"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    files, total = DatabaseRepository.get_all_files(
        extension=extension,
        file_type=file_type,
        folder_id=folder_id,
        sort_by=sort_by,
        limit=limit,
        offset=offset
    )
    return {
        "files": files,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.get("/duplicates", response_model=DuplicateSummaryResponse)
def get_duplicate_files(folder_id: Optional[str] = Query(None)):
    """Detects duplicate files and returns delete suggestions with primary originals."""
    return DatabaseRepository.get_duplicate_suggestions(folder_id=folder_id)

@router.get("/recent")
def get_recent_files(limit: int = Query(8, ge=1, le=50)):
    """Returns most recently modified and indexed files for the dashboard Jump Back In hub."""
    return DatabaseRepository.get_recent_files(limit=limit)

@router.get("/bookmarks")
def get_bookmarked_files():
    """Returns all bookmarked / starred files with notes and metadata."""
    return DatabaseRepository.get_bookmarks()

@router.post("/{file_id}/bookmark")
def toggle_file_bookmark(file_id: str, note: Optional[str] = Query(None)):
    """Toggles bookmark status on a file (star / unstar)."""
    return DatabaseRepository.toggle_bookmark(file_id, note=note)

@router.get("/tags")
def get_all_tags():
    """Lists all user tags with file count."""
    return DatabaseRepository.get_all_tags()

@router.get("/collections")
def get_collections():
    """Lists smart auto-categorized collections (Invoices, Certificates, Study, Code, Screenshots)."""
    return DatabaseRepository.get_collections_summary()

@router.get("/collections/{collection_id}")
def get_collection_files(collection_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    """Returns files belonging to a specific smart collection."""
    files, total = DatabaseRepository.get_collection_files(collection_id, limit=limit, offset=offset)
    return {"collection_id": collection_id, "files": files, "total": total, "limit": limit, "offset": offset}

@router.get("/{file_id}/tags")
def get_file_tags(file_id: str):
    """Gets tags assigned to a file."""
    return DatabaseRepository.get_file_tags(file_id)

@router.post("/{file_id}/tags")
def add_file_tag(file_id: str, tag: str = Query(...)):
    """Adds a tag to a file."""
    success = DatabaseRepository.add_file_tag(file_id, tag)
    return {"success": success, "file_id": file_id, "tag": tag.strip().lower().lstrip("#")}

@router.delete("/{file_id}/tags/{tag}")
def remove_file_tag(file_id: str, tag: str):
    """Removes a tag from a file."""
    success = DatabaseRepository.remove_file_tag(file_id, tag)
    return {"success": success, "file_id": file_id, "tag": tag}

@router.get("/{file_id}/ocr")
def get_file_ocr(file_id: str):
    """Returns OCR text and bounding boxes for an image, generating them on-demand if missing."""
    import json
    ocr_data = DatabaseRepository.get_image_ocr_by_file_id(file_id)
    if ocr_data and ocr_data.get("boxes"):
        return ocr_data

    file_rec = DatabaseRepository.get_file_by_id(file_id)
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = Path(file_rec["path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    if file_rec["file_type"] == "image":
        from app.extractors.image_ocr import ImageOCRExtractor
        extracted = ImageOCRExtractor().extract(file_path)
        boxes = extracted.metadata.get("boxes", [])
        width = extracted.metadata.get("width")
        height = extracted.metadata.get("height")
        DatabaseRepository.insert_image_ocr(
            file_id=file_id,
            extracted_text=extracted.text,
            status="completed",
            boxes_json=json.dumps(boxes) if boxes else None,
            img_width=width,
            img_height=height
        )
        return {
            "file_id": file_id,
            "filename": file_rec["filename"],
            "path": file_rec["path"],
            "extracted_text": extracted.text,
            "boxes": boxes,
            "img_width": width,
            "img_height": height
        }
    return {"file_id": file_id, "extracted_text": "", "boxes": [], "img_width": None, "img_height": None}

@router.delete("/{file_id}")
def delete_file(file_id: str, delete_from_disk: bool = Query(True)):
    """Deletes a file record and chunks from the database, and optionally removes from disk."""
    result = DatabaseRepository.delete_file_records(file_id, delete_from_disk=delete_from_disk)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail="File not found")
    return result

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

