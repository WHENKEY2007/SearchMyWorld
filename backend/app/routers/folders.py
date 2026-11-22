from fastapi import APIRouter, HTTPException
from typing import List
from pathlib import Path
from app.models.schemas import FolderAddRequest, FolderResponse
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/folders", tags=["Folders"])

@router.post("", response_model=FolderResponse)
def add_folder(req: FolderAddRequest):
    folder_path = Path(req.path)
    if not folder_path.exists() or not folder_path.is_dir():
        raise HTTPException(status_code=400, detail=f"Invalid folder path or directory does not exist: {req.path}")
    
    # Store normalized path
    norm_path = str(folder_path.resolve())
    folder = DatabaseRepository.add_folder(norm_path)
    return folder

@router.get("", response_model=List[FolderResponse])
def list_folders():
    return DatabaseRepository.get_folders()

@router.delete("/{folder_id}")
def delete_folder(folder_id: str):
    success = DatabaseRepository.remove_folder(folder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder removed from index configuration"}

@router.post("/picker")
def open_native_folder_picker():
    """Opens the native Windows folder browser dialog and returns the selected path."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder_selected = filedialog.askdirectory(title="Select Folder to Index in SearchMyWorld")
        root.destroy()
        if not folder_selected:
            return {"cancelled": True, "path": None}
        norm_path = str(Path(folder_selected).resolve())
        return {"cancelled": False, "path": norm_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not open native folder picker: {str(e)}")

