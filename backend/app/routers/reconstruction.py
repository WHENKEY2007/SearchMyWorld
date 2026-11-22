from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.services.reconstruction import reconstruction_engine
from app.services.comparison import document_comparison_engine
from app.services.assistant import memory_assistant

router = APIRouter(prefix="", tags=["Reconstruction & Intelligence"])

class ReconstructionRequest(BaseModel):
    project_query: str

class ComparisonRequest(BaseModel):
    file_id_a: str
    file_id_b: str

class ChatRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None

@router.post("/reconstruction")
def reconstruct_project(req: ReconstructionRequest):
    if not req.project_query.strip():
        raise HTTPException(status_code=400, detail="Project query cannot be empty")
    return reconstruction_engine.reconstruct(req.project_query.strip())

@router.post("/comparison")
def compare_documents(req: ComparisonRequest):
    try:
        return document_comparison_engine.compare_documents(req.file_id_a, req.file_id_b)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/assistant/chat")
def chat_with_memory(req: ChatRequest):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    return memory_assistant.answer_query(req.query.strip(), req.conversation_history)
