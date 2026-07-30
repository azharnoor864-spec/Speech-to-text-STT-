"""
main.py

Main FastAPI application for the RAG project -- Day 22 version,
now fully integrated with the React (Create React App) frontend.

This ties together:
  1. Your existing text-based RAG query endpoint (from earlier days).
  2. The /api/transcribe endpoint (Day 22) for voice input.
  3. The built React frontend (npm run build -> build/ folder), served
     directly by this same FastAPI server.

Why this setup:
  - Previously you ran TWO servers: `npm run dev` (React on :5173) and
    `uvicorn main:app` (FastAPI on :8000), talking to each other over CORS.
  - Now, ONE server (this one) serves both the API *and* the built React
    app on the SAME port. No CORS needed for the frontend<->backend calls
    anymore since everything is same-origin. Simpler to run, and closer
    to how you'd actually deploy this.

ONE-TIME SETUP (build the frontend):
    cd your-react-project
    npm run build
    -> this creates a `build/` folder containing index.html + static/ assets

Then copy (or symlink) that `build/` folder next to this main.py, so your
backend folder looks like:
    STT/
      ├── main.py          <- this file
      ├── Transcribe.py
      └── build/           <- copied from your React project's build output
            ├── index.html
            └── static/
                  ├── css/
                  └── js/

NOTE (Day 22 addition): conver_chat.py, rag_chain.py, and landchain.py
live in a SEPARATE folder from this one:
    C:\\Users\\PMYLS\\Desktop\\RAG\\enterprise_rag_engine\\Day_20
This folder is NOT inside the STT project folder, so we add it to
sys.path below -- otherwise "from conver_chat import run_rag_query"
would raise ModuleNotFoundError.

HOW TO RUN (either works now):
    python main.py
    -- or --
    uvicorn main:app --reload

Then open:
    http://127.0.0.1:8000            <- your React app (mic + chat board)
    http://127.0.0.1:8000/docs       <- Swagger UI for the API
"""

import os
import sys

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

# --------------------------------------------------------------------------
# Load this project's own .env (STT folder) for BACKEND_PORT.
# This is separate from the RAG project's .env (which holds GROQ_API_KEY
# and is loaded separately, inside conver_chat.py).
# --------------------------------------------------------------------------
load_dotenv()
BACKEND_PORT = int(os.getenv("BACKEND_PORT", 8000))

# --------------------------------------------------------------------------
# Wire in the Day_20 RAG folder (separate location from this STT project
# folder), so Python can find conver_chat.py, rag_chain.py, and
# landchain.py when we import from them below.
#
# IMPORTANT: this must run BEFORE the "from conver_chat import ..." line.
# --------------------------------------------------------------------------
DAY20_PATH = r"C:\Users\PMYLS\Desktop\RAG\enterprise_rag_engine\Day_20"
sys.path.append(DAY20_PATH)

# --------------------------------------------------------------------------
# Import the transcribe router (Day 22 voice input).
# Transcribe.py must be in the same folder as this file.
# --------------------------------------------------------------------------
from Transcribe import router as transcribe_router

# --------------------------------------------------------------------------
# Import your existing RAG query function (from Day_20/conver_chat.py,
# now reachable thanks to the sys.path.append above).
# --------------------------------------------------------------------------
from conver_chat import run_rag_query


app = FastAPI(title="Enterprise RAG Engine - Day 22")

# --------------------------------------------------------------------------
# CORS middleware -- kept in for flexibility (e.g. if you ever run the
# React dev server separately again with `npm run dev` on :5173 while
# still pointing at this backend on :8000). Once the frontend is served
# from this same app (below), calls are same-origin and CORS doesn't
# actually matter anymore -- but there's no harm leaving this in.
# --------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your actual frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Register the transcribe endpoint (POST /api/transcribe).
# IMPORTANT: this and the other /api/* routes below must be registered
# BEFORE the catch-all frontend route at the bottom of this file, or
# FastAPI will try to match /api/transcribe against the frontend's
# catch-all path first and never reach your actual endpoint.
# --------------------------------------------------------------------------
app.include_router(transcribe_router)


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    response: str


@app.post("/api/query", response_model=QueryResponse)
async def query_rag(request: QueryRequest):
    """
    Existing text-input RAG flow (typed queries from the chat input).
    Also used by voice mode: transcribed text gets sent here too,
    via the SAME endpoint (see useChatWithVoice.js on the frontend).
    """
    llm_response = run_rag_query(request.query)
    return QueryResponse(response=llm_response)


@app.get("/api/health")
async def health():
    return {"status": "RAG engine running", "endpoints": ["/api/query", "/api/transcribe", "/docs"]}


# --------------------------------------------------------------------------
# Serve the built React frontend (Create React App output).
#
# BUILD_DIR points at the `build/` folder produced by `npm run build`.
# Update this path if you place the build folder somewhere else.
# --------------------------------------------------------------------------
BUILD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")
STATIC_DIR = os.path.join(BUILD_DIR, "static")

if os.path.isdir(STATIC_DIR):
    # Serves CRA's hashed JS/CSS bundles, e.g. /static/js/main.abc123.js
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
else:
    print(
        f"[warning] '{STATIC_DIR}' not found -- run `npm run build` in your "
        "React project and copy the resulting build/ folder next to main.py "
        "to serve the frontend from this server."
    )


@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    """
    Catch-all route: any URL that isn't one of the /api/* routes above
    (and isn't a /static/* asset, handled by the mount above) gets served
    index.html instead. This lets React Router (if you use it) handle
    client-side routes like /settings or /about without a 404 -- the
    browser loads index.html, then React takes over from there.
    """
    index_path = os.path.join(BUILD_DIR, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    return {
        "detail": (
            "Frontend build not found. Run `npm run build` in your React "
            "project, then copy the build/ folder next to main.py."
        )
    }


# --------------------------------------------------------------------------
# This is the piece that was missing before: without this block, running
# `python main.py` just defines the app and exits immediately -- nothing
# actually starts listening on a port. `uvicorn main:app --reload` worked
# because uvicorn itself starts the server; this block lets `python main.py`
# do the same thing directly.
# --------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=BACKEND_PORT, reload=True)