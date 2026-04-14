from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field
from .graph import StoryNode, StoryEdge


class ProjectMeta(BaseModel):
    id: str
    title: str
    theme: str = ""
    format: Literal["branching", "hypertext"] = "branching"
    created_at: datetime
    updated_at: datetime
    node_count: int = 0


class Project(BaseModel):
    id: str
    title: str
    theme: str = ""
    format: Literal["branching", "hypertext"] = "branching"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    nodes: list[StoryNode] = []
    edges: list[StoryEdge] = []
    chat_history: list[dict] = []


class CreateProjectRequest(BaseModel):
    title: str
    theme: str = ""
    format: Literal["branching", "hypertext"] = "branching"


class SaveProjectRequest(BaseModel):
    title: str
    theme: str = ""
    format: Literal["branching", "hypertext"] = "branching"
    nodes: list[StoryNode] = []
    edges: list[StoryEdge] = []
    chat_history: list[dict] = []
