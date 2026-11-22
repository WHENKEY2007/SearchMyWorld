import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.models.schemas import IndexingProgressResponse
from app.services.indexer import indexing_service
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/index", tags=["Indexing"])

def _run_indexing_task():
    indexing_service.index_all_folders()

@router.post("/start")
def start_indexing(background_tasks: BackgroundTasks):
    if indexing_service.is_indexing:
        return {"message": "Indexing is already running", "status": "running"}
    
    background_tasks.add_task(_run_indexing_task)
    return {"message": "Background indexing started successfully", "status": "started"}

@router.get("/status", response_model=IndexingProgressResponse)
def get_indexing_status():
    return indexing_service.current_progress

@router.post("/clear")
def clear_indexed_memory():
    if indexing_service.is_indexing:
        raise HTTPException(status_code=400, detail="Cannot clear database while indexing is running")
    DatabaseRepository.clear_database()
    return {"message": "All indexed memories, chunks, and embeddings successfully cleared"}
