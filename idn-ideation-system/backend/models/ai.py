from pydantic import BaseModel


class GraphContext(BaseModel):
    node_count: int = 0
    node_titles: list[str] = []
    theme: str = ""
    format: str = "branching"


class SelectedNode(BaseModel):
    id: str
    title: str
    body: str = ""
    node_type: str = "scene"


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    project_id: str
    messages: list[ChatMessage]
    graph_context: GraphContext = GraphContext()


class BranchRequest(BaseModel):
    project_id: str
    selected_node: SelectedNode
    graph_context: GraphContext = GraphContext()


class ThemeRequest(BaseModel):
    project_id: str
    premise: str
    graph_context: GraphContext = GraphContext()


class CoherenceRequest(BaseModel):
    project_id: str
    graph_context: GraphContext = GraphContext()
    node_details: list[SelectedNode] = []


class PerspectiveRequest(BaseModel):
    project_id: str
    selected_node: SelectedNode
    graph_context: GraphContext = GraphContext()


class BranchSuggestion(BaseModel):
    id: str
    title: str
    body: str
    reasoning: str
    suggested_edge_label: str = "leads to"


class BranchResponse(BaseModel):
    suggestions: list[BranchSuggestion]
    mode: str


class ThemeAnalysis(BaseModel):
    dominant_angle: str
    framing_biases: list[str]
    underrepresented_perspectives: list[str]
    reasoning: str


class ThemeResponse(BaseModel):
    analysis: ThemeAnalysis
    mode: str


class CoherenceIssue(BaseModel):
    node_id: str | None = None
    issue_type: str  # "orphan", "dead_end", "thematic_drift", "structural"
    description: str
    suggestion: str


class CoherenceResponse(BaseModel):
    issues: list[CoherenceIssue]
    overall_assessment: str
    mode: str


class PerspectiveSuggestion(BaseModel):
    perspective_label: str
    rationale: str
    suggested_nodes: list[BranchSuggestion]


class PerspectiveResponse(BaseModel):
    suggestion: PerspectiveSuggestion
    mode: str


class AIStatusResponse(BaseModel):
    mode: str  # "live" or "mock"


# ── Narrative generation ──────────────────────────────────────────────────────

class GenerateNarrativeRequest(BaseModel):
    project_id: str
    premise: str


class GeneratedNode(BaseModel):
    id: str
    title: str
    body: str
    node_type: str  # scene | choice | ending | question
    tags: list[str] = []
    x: float
    y: float


class GeneratedEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str = ""


class GenerateNarrativeResponse(BaseModel):
    nodes: list[GeneratedNode]
    edges: list[GeneratedEdge]
    mode: str


# ── Narrative overview ────────────────────────────────────────────────────────

class NarrativeOverviewRequest(BaseModel):
    project_id: str
    node_details: list[SelectedNode] = []
    graph_context: GraphContext = GraphContext()


class NarrativeOverviewResponse(BaseModel):
    overview: str
    mode: str
