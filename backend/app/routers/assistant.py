from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.database.repository import DatabaseRepository
from app.services.assistant import MemoryAssistantService

router = APIRouter(prefix="/assistant", tags=["Assistant"])
memory_assistant = MemoryAssistantService()

class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Chat"
    focused_file_id: Optional[str] = None

class SendChatMessageRequest(BaseModel):
    conversation_id: Optional[str] = None
    query: str
    focused_file_id: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None

@router.get("/conversations")
def list_conversations():
    """Retrieve all saved conversation threads."""
    return DatabaseRepository.get_conversations()

@router.post("/conversations")
def create_conversation(req: CreateConversationRequest):
    """Create a new chat conversation thread, optionally focusing on a specific document."""
    return DatabaseRepository.create_conversation(
        title=req.title or "New Chat",
        focused_file_id=req.focused_file_id
    )

@router.get("/conversations/{conversation_id}")
def get_conversation_history(conversation_id: str):
    """Get all messages and citations for a conversation thread."""
    messages = DatabaseRepository.get_conversation_messages(conversation_id)
    return {"conversation_id": conversation_id, "messages": messages}

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: str):
    """Delete a conversation thread and all its messages."""
    success = DatabaseRepository.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"message": "Conversation deleted successfully", "id": conversation_id}

@router.post("/chat")
def chat_with_memory(req: SendChatMessageRequest):
    """
    Chat with personal memory or a focused document.
    Saves user message and assistant answer to the persistent conversation thread.
    """
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    conv_id = req.conversation_id
    if not conv_id:
        # Auto-create conversation thread
        conv = DatabaseRepository.create_conversation(
            title=q[:40] + ("..." if len(q) > 40 else ""),
            focused_file_id=req.focused_file_id
        )
        conv_id = conv["id"]
    else:
        # Check if conversation needs an auto-title update from "New Chat"
        messages = DatabaseRepository.get_conversation_messages(conv_id)
        if len(messages) == 0:
            DatabaseRepository.update_conversation_title(conv_id, q[:40] + ("..." if len(q) > 40 else ""))

    # 1. Record user message
    DatabaseRepository.add_chat_message(
        conversation_id=conv_id,
        sender="user",
        text=q
    )

    # 2. Get answer from memory assistant
    result = memory_assistant.answer_query(
        query=q,
        conversation_history=req.conversation_history,
        focused_file_id=req.focused_file_id
    )

    # 3. Record assistant message
    bot_msg = DatabaseRepository.add_chat_message(
        conversation_id=conv_id,
        sender="assistant",
        text=result.get("answer", ""),
        citations=result.get("citations", [])
    )

    return {
        "conversation_id": conv_id,
        "message": bot_msg,
        "answer": result.get("answer", ""),
        "citations": result.get("citations", []),
        "grounded": result.get("grounded", True),
        "source": result.get("source", "grounded_extractive_synthesis")
    }
