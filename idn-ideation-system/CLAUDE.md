# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the project

Two processes must run simultaneously:

**Backend** (Python FastAPI, port 8000):
```bash
cd backend
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # Mac/Linux
uvicorn main:app --reload
```
API docs auto-generated at http://localhost:8000/docs

**Frontend** (Vite + React, port 5173):
```bash
cd frontend
npm run dev
```

All `/api/*` requests from the frontend are proxied to `http://localhost:8000` via the Vite proxy in `vite.config.ts`.

## Build and type-check

```bash
# Frontend type check (no emit)
cd frontend && npx tsc --noEmit

# Frontend production build
cd frontend && npm run build

# Backend dependency install
cd backend && .venv/Scripts/pip install -r requirements.txt

# Update requirements after adding packages
cd backend && .venv/Scripts/pip freeze > requirements.txt
```

## AI mode

The backend detects `ANTHROPIC_API_KEY` at startup (`backend/main.py`). If absent, it uses `MockAIService` (demo mode). To enable live AI, create `backend/.env` from `backend/.env.example` and add the key. The frontend shows a Live/Demo badge reflecting the current mode.

## Architecture

### Backend (`backend/`)

- `main.py` — app factory: loads `.env`, chooses `AIService` vs `MockAIService`, registers CORS and routers
- `routers/projects.py` — project CRUD (list/create/get/save/delete/export)
- `routers/ai.py` — all AI endpoints; injects the AI service via `request.app.state.ai_service`
- `services/storage_service.py` — async JSON file I/O using `aiofiles`; one `.json` file per project in `backend/data/projects/`
- `services/ai_service.py` — live Claude API calls; structured JSON responses for all endpoints except `/chat` (SSE streaming)
- `services/mock_ai_service.py` — deterministic pre-written responses with simulated delay; same interface as `AIService`
- `models/` — Pydantic models for graph, project, and AI request/response shapes

### Frontend (`frontend/src/`)

**Stores (Zustand)** are the source of truth:
- `store/graphStore.ts` — nodes, edges, selectedNodeId, isDirty; wraps `@xyflow/react` change handlers
- `store/projectStore.ts` — projectId, title, theme, format, isSaving
- `store/aiStore.ts` — chatHistory, suggestions, streaming state, analysis results

**Key components:**
- `components/graph/GraphCanvas.tsx` — wraps `<ReactFlow>` with custom node/edge types; dispatches selection to graphStore
- `components/graph/StoryNode.tsx` — custom React Flow node; color-coded by type (scene/choice/ending/question/note)
- `components/graph/NodeInspector.tsx` — slide-in panel for editing a selected node; triggers AI actions
- `components/ai/AIPanel.tsx` — three-tab panel (Chat / Suggestions / Analysis); consumes all AI store state
- `components/ai/SuggestionCard.tsx` — renders one AI branch suggestion; "Add to graph" creates a node + edge

**Hooks:**
- `hooks/useAI.ts` — all AI calls; chat uses native `fetch` + `ReadableStream` for SSE; other calls use `api/client.ts`
- `hooks/useAutoSave.ts` — debounces 2 s after `isDirty` becomes true; calls `PUT /api/projects/{id}`
- `hooks/useProjectIO.ts` — load/create project; syncs all three stores at once

**Data flow for AI chat:** `useAI.sendChatMessage` → `POST /api/ai/chat` (SSE) → `aiStore.appendStreamChunk` per token → `aiStore.finalizeAssistantMessage`

**Data flow for branch suggestions:** NodeInspector button → `useAI.requestBranches` → `POST /api/ai/branches` → `aiStore.setSuggestions` → renders in AIPanel Suggestions tab → SuggestionCard "Add to graph" → `graphStore.addNode` + `graphStore.onConnect`

### AI prompt structure

Every Claude call in `ai_service.py` composes three layers:
1. Static identity/role (IDN authoring assistant for newcomers)
2. Dynamic project context (title, theme, format, node titles, selected node)
3. Task instruction (endpoint-specific, always requests structured JSON except `/chat`)

Structured endpoints strip markdown code fences before `json.loads()` to handle model formatting variation.
