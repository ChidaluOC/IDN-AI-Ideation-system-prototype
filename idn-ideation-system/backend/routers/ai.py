import json
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from models.ai import (
    AIStatusResponse,
    BranchRequest,
    BranchResponse,
    ChatRequest,
    CoherenceRequest,
    CoherenceResponse,
    GenerateNarrativeRequest,
    GenerateNarrativeResponse,
    NarrativeOverviewRequest,
    NarrativeOverviewResponse,
    PerspectiveRequest,
    PerspectiveResponse,
    ThemeRequest,
    ThemeResponse,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def get_ai_service(request: Request):
    return request.app.state.ai_service


@router.get("/status", response_model=AIStatusResponse)
async def ai_status(service=Depends(get_ai_service)):
    return AIStatusResponse(mode=service.mode)


@router.post("/chat")
async def chat(req: ChatRequest, service=Depends(get_ai_service)):
    async def event_stream():
        gc = req.graph_context.model_dump()
        async for event in service.chat_stream(req.messages, gc):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/branches", response_model=BranchResponse)
async def suggest_branches(req: BranchRequest, service=Depends(get_ai_service)):
    gc = req.graph_context.model_dump()
    return await service.suggest_branches(req.selected_node, gc)


@router.post("/theme-analysis", response_model=ThemeResponse)
async def analyze_theme(req: ThemeRequest, service=Depends(get_ai_service)):
    gc = req.graph_context.model_dump()
    return await service.analyze_theme(req.premise, gc)


@router.post("/coherence-check", response_model=CoherenceResponse)
async def check_coherence(req: CoherenceRequest, service=Depends(get_ai_service)):
    gc = req.graph_context.model_dump()
    return await service.check_coherence(req.node_details, gc)


@router.post("/perspective", response_model=PerspectiveResponse)
async def suggest_perspective(req: PerspectiveRequest, service=Depends(get_ai_service)):
    gc = req.graph_context.model_dump()
    return await service.suggest_perspective(req.selected_node, gc)


@router.post("/generate-narrative", response_model=GenerateNarrativeResponse)
async def generate_narrative(req: GenerateNarrativeRequest, service=Depends(get_ai_service)):
    return await service.generate_narrative(req.premise)


@router.post("/narrative-overview", response_model=NarrativeOverviewResponse)
async def narrative_overview(req: NarrativeOverviewRequest, service=Depends(get_ai_service)):
    gc = req.graph_context.model_dump()
    return await service.narrative_overview(req.node_details, gc)
