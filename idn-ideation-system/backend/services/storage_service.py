import json
import os
from datetime import datetime
from pathlib import Path

import aiofiles

DATA_DIR = Path(__file__).parent.parent / "data" / "projects"


def _ensure_data_dir():
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def _project_path(project_id: str) -> Path:
    return DATA_DIR / f"{project_id}.json"


async def list_projects() -> list[dict]:
    _ensure_data_dir()
    projects = []
    for path in sorted(DATA_DIR.glob("*.json"), key=os.path.getmtime, reverse=True):
        try:
            async with aiofiles.open(path, "r", encoding="utf-8") as f:
                data = json.loads(await f.read())
            projects.append({
                "id": data["id"],
                "title": data["title"],
                "theme": data.get("theme", ""),
                "format": data.get("format", "branching"),
                "created_at": data["created_at"],
                "updated_at": data["updated_at"],
                "node_count": len(data.get("nodes", [])),
            })
        except Exception:
            continue
    return projects


async def load_project(project_id: str) -> dict | None:
    path = _project_path(project_id)
    if not path.exists():
        return None
    async with aiofiles.open(path, "r", encoding="utf-8") as f:
        return json.loads(await f.read())


async def save_project(project_data: dict) -> dict:
    _ensure_data_dir()
    project_data["updated_at"] = datetime.utcnow().isoformat()
    path = _project_path(project_data["id"])
    async with aiofiles.open(path, "w", encoding="utf-8") as f:
        await f.write(json.dumps(project_data, indent=2, default=str))
    return project_data


async def delete_project(project_id: str) -> bool:
    path = _project_path(project_id)
    if not path.exists():
        return False
    path.unlink()
    return True
