from fastapi import APIRouter, HTTPException
from typing import List
from app.models.schemas import ProjectCreateRequest, ProjectResponse
from app.database.repository import DatabaseRepository

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects():
    return DatabaseRepository.get_projects()

@router.post("/auto-detect", response_model=List[ProjectResponse])
def auto_detect_projects():
    """Auto-detects project clusters from indexed folders and subdirectories."""
    return DatabaseRepository.auto_detect_projects()

@router.post("", response_model=ProjectResponse)
def create_project(req: ProjectCreateRequest):
    return DatabaseRepository.create_project(name=req.name, description=req.description)

@router.delete("/{project_id}")
def delete_project(project_id: str):
    success = DatabaseRepository.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/files")
def get_project_files(project_id: str):
    return DatabaseRepository.get_project_files(project_id)

@router.get("/{project_id}/tasks")
def get_project_tasks(project_id: str):
    return DatabaseRepository.get_project_tasks(project_id)

@router.get("/{project_id}/decisions")
def get_project_decisions(project_id: str):
    return DatabaseRepository.get_project_decisions(project_id)
