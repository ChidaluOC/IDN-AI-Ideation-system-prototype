from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


class NodeType(str, Enum):
    intro = "intro"
    scene = "scene"
    choice = "choice"
    ending = "ending"
    note = "note"  # kept for backward-compat with saved projects


class StoryNodeData(BaseModel):
    model_config = ConfigDict(extra="allow")

    title: str
    body: str = ""
    description: str = ""
    personal_note: str = ""
    node_type: NodeType = NodeType.scene
    tags: list[str] = []
    ai_generated: bool = False
    navigation_mode: Optional[str] = None
    choices: Optional[list[Any]] = None


class Position(BaseModel):
    x: float
    y: float


class StoryNode(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str
    type: str = "storyNode"
    position: Position
    data: StoryNodeData


class StoryEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""
    type: str = "default"
