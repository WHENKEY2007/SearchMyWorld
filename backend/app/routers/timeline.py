from fastapi import APIRouter, Query
from app.services.timeline import timeline_service

router = APIRouter(prefix="/timeline", tags=["Timeline"])

@router.get("")
def get_timeline_feed(limit: int = Query(100, ge=1, le=500)):
    return timeline_service.get_chronological_events(limit=limit)
