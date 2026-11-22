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
        file_type_filter=req.file_type
    )
    return {
        "query": req.query,
        "total_results": len(results),
        "results": results
    }

@router.get("/ocr", response_model=List[ImageOCRSearchResult])
def search_ocr_images(q: str = Query(..., min_length=1), limit: int = 50):
    """Specialized visual memory search over extracted screenshot and image OCR text."""
    return DatabaseRepository.search_image_ocr(query=q, limit=limit)
