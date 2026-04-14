import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from models.project import CreateProjectRequest, SaveProjectRequest
from services import storage_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects():
    return await storage_service.list_projects()


@router.post("", status_code=201)
async def create_project(req: CreateProjectRequest):
    now = datetime.utcnow().isoformat()
    project = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "theme": req.theme,
        "format": req.format,
        "created_at": now,
        "updated_at": now,
        "nodes": [],
        "edges": [],
        "chat_history": [],
    }
    return await storage_service.save_project(project)


@router.get("/{project_id}")
async def get_project(project_id: str):
    project = await storage_service.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.put("/{project_id}")
async def save_project(project_id: str, req: SaveProjectRequest):
    existing = await storage_service.load_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")
    existing.update({
        "title": req.title,
        "theme": req.theme,
        "format": req.format,
        "nodes": [n.model_dump() for n in req.nodes],
        "edges": [e.model_dump() for e in req.edges],
        "chat_history": req.chat_history,
    })
    return await storage_service.save_project(existing)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    deleted = await storage_service.delete_project(project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")


@router.get("/{project_id}/export")
async def export_project(project_id: str):
    project = await storage_service.load_project(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    filename = project["title"].replace(" ", "_").lower() + ".json"
    return JSONResponse(
        content=project,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
