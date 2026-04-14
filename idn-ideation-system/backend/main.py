import os
import logging

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="IDN Ideation System API", version="0.1.0")

# CORS — allow the Vite dev server and any localhost origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine AI mode
api_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
if api_key:
    from services.ai_service import AIService
    from services.web_search import brave_search

    brave_key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
    search_fn = None
    if brave_key:
        import functools
        search_fn = functools.partial(brave_search, api_key=brave_key)
        logger.info("Web search: ENABLED (Brave Search API)")
    else:
        logger.info("Web search: DISABLED — set BRAVE_SEARCH_API_KEY to enable")

    app.state.ai_service = AIService(api_key=api_key, search_fn=search_fn)
    logger.info("AI mode: LIVE (Claude API)")
else:
    from services.mock_ai_service import MockAIService
    app.state.ai_service = MockAIService()
    logger.warning(
        "AI mode: MOCK — ANTHROPIC_API_KEY not set. "
        "Add your key to backend/.env to enable live AI responses."
    )

# Routers
from routers.projects import router as projects_router
from routers.ai import router as ai_router

app.include_router(projects_router)
app.include_router(ai_router)


@app.get("/")
async def root():
    return {"status": "ok", "message": "IDN Ideation System API"}
