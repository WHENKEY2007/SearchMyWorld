from fastapi import APIRouter, Query
from typing import List, Optional
from app.models.schemas import StatsResponse, FolderStatsDetail
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("", response_model=StatsResponse)
def get_system_stats():
    return DatabaseRepository.get_stats()

@router.get("/folders", response_model=List[FolderStatsDetail])
def get_folder_stats(folder_id: Optional[str] = Query(None)):
    return DatabaseRepository.get_folder_breakdown_stats(folder_id=folder_id)
