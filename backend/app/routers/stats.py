from fastapi import APIRouter
from app.models.schemas import StatsResponse
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/stats", tags=["Stats"])

@router.get("", response_model=StatsResponse)
def get_system_stats():
    return DatabaseRepository.get_stats()
