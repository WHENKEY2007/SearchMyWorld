from fastapi import APIRouter, Query
from typing import Optional, List
from app.models.schemas import SearchRequest, SearchResponse, ImageOCRSearchResult
from app.services.search import search_engine
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/search", tags=["Search"])

@router.post("", response_model=SearchResponse)
def hybrid_search(req: SearchRequest):
    results = search_engine.search(
        query=req.query,
        limit=req.limit,
        extension_filter=req.extension,
        file_type_filter=req.file_type,
        folder_id=req.folder_id,
        date_range=req.date_range,
        only_bookmarked=req.only_bookmarked
    )
    return {
        "query": req.query,
        "total_results": len(results),
        "results": results
    }

@router.get("/ocr", response_model=List[ImageOCRSearchResult])
def search_ocr_images(
    q: Optional[str] = Query(None),
    sort_by: str = Query("relevance"),
    limit: int = Query(60, ge=1, le=500)
):
    """Specialized visual memory search over extracted screenshot and image OCR text with flexible sorting."""
    return DatabaseRepository.search_image_ocr(query=q, sort_by=sort_by, limit=limit)
