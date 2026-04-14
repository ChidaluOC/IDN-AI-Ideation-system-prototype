# IDN Ideation System Prototype

A research prototype for an Interactive Digital Narrative (IDN) authoring tool. Supports professionals new to IDN authoring during the ideation phase through optional, transparent AI collaboration.

## Prerequisites

- Node.js v18+ (v24 recommended)
- Python 3.10+
- An Anthropic API key (optional — the tool works in mock/demo mode without one)

## Getting an Anthropic API Key

1. Go to https://console.anthropic.com and create an account
2. Navigate to **API Keys** in the sidebar
3. Click **Create Key**, name it (e.g. "IDN Thesis Prototype")
4. Copy it immediately — shown only once

## Setup and Running

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt

# Copy the env template and optionally add your API key
cp .env.example .env
# Edit .env and paste your ANTHROPIC_API_KEY (leave blank for mock mode)

uvicorn main:app --reload
```

Backend runs at http://localhost:8000  
API docs available at http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Mock / Demo Mode

If `ANTHROPIC_API_KEY` is not set in `backend/.env`, the tool automatically runs in **Demo Mode**. All AI features return pre-written, realistic responses. A yellow badge in the UI indicates this mode. Demo mode is fully functional for exploring the tool.

## Project Structure

```
idn-ideation-system/
├── frontend/          # React + TypeScript + Vite
└── backend/           # Python FastAPI
    └── data/projects/ # Saved projects (auto-created, gitignored)
```
