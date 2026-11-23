from fastapi import APIRouter, Query
from app.services.timeline import timeline_service

router = APIRouter(prefix="/timeline", tags=["Timeline"])

@router.get("")
def get_timeline_feed(
    limit: int = Query(100, ge=1, le=500),
    date_type: str = Query("modified", pattern="^(modified|created|indexed)$")
):
    return timeline_service.get_chronological_events(limit=limit, date_type=date_type)
