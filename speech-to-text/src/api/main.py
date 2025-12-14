"""
FastAPI application entrypoint exposing slide processing and speech-to-text services.
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .routers import slides, transcription, analytics, speech_proxy, analysis, final_analysis

logger = logging.getLogger(__name__)
BASE_DIR = Path(__file__).resolve().parent

# #region agent log
# Load .env file from speech-to-text directory
# BASE_DIR is src/api/, so we need to go up 2 levels to get to speech-to-text/
ENV_PATH = BASE_DIR.parent.parent / ".env"
# Also try current working directory as fallback
CWD_ENV_PATH = Path.cwd() / ".env"

# Write debug log
DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
try:
    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
        import json
        import time
        log_entry = {
            "timestamp": int(time.time() * 1000),
            "location": "main.py:21",
            "message": "Checking .env file locations",
            "data": {
                "ENV_PATH": str(ENV_PATH),
                "ENV_PATH_exists": ENV_PATH.exists(),
                "CWD_ENV_PATH": str(CWD_ENV_PATH),
                "CWD_ENV_PATH_exists": CWD_ENV_PATH.exists(),
                "cwd": str(Path.cwd()),
                "BASE_DIR": str(BASE_DIR)
            },
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        f.write(json.dumps(log_entry) + "\n")
except Exception as e:
    pass  # Silently fail if can't write log

# Try loading .env from multiple locations
env_loaded = False
if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)
    logger.info(f"Loaded .env from: {ENV_PATH}")
    env_loaded = True
elif CWD_ENV_PATH.exists():
    load_dotenv(CWD_ENV_PATH, override=True)
    logger.info(f"Loaded .env from: {CWD_ENV_PATH}")
    env_loaded = True
else:
    # Try loading from current directory (dotenv default behavior)
    load_dotenv(override=True)
    logger.info("Attempted to load .env from current directory")

# Debug: Check if GOOGLE_API_KEY is loaded
api_key = os.getenv("GOOGLE_API_KEY")
use_llm = os.getenv("USE_LLM_SUMMARIZER", "false")
provider = os.getenv("LLM_SUMMARIZER_PROVIDER", "none")

# Write debug log about env vars
try:
    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
        log_entry = {
            "timestamp": int(time.time() * 1000),
            "location": "main.py:50",
            "message": "Environment variables after load_dotenv",
            "data": {
                "env_loaded": env_loaded,
                "GOOGLE_API_KEY_set": bool(api_key),
                "GOOGLE_API_KEY_length": len(api_key) if api_key else 0,
                "GOOGLE_API_KEY_prefix": api_key[:10] if api_key else None,
                "USE_LLM_SUMMARIZER": use_llm,
                "LLM_SUMMARIZER_PROVIDER": provider
            },
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        f.write(json.dumps(log_entry) + "\n")
except Exception as e:
    pass

if api_key:
    logger.info(f"GOOGLE_API_KEY found: {api_key[:10]}... (length: {len(api_key)})")
else:
    logger.warning("GOOGLE_API_KEY not found in environment after loading .env")
logger.info(f"USE_LLM_SUMMARIZER={use_llm}, LLM_SUMMARIZER_PROVIDER={provider}")
# #endregion


def create_app() -> FastAPI:
    """Initialize FastAPI application with configured routers and static assets."""
    app = FastAPI(
        title="Speech-to-Text Service",
        description="API cung cấp chức năng xử lý slide và chuyển giọng nói thành văn bản.",
        version="1.0.0",
    )

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, specify exact origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(slides.router, prefix="/slides", tags=["slides"])
    app.include_router(transcription.router, prefix="/ws", tags=["speech-to-text"])
    app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
    app.include_router(speech_proxy.router, prefix="/proxy", tags=["speech-proxy"])
    app.include_router(analysis.router, prefix="/analysis", tags=["analysis"])
    app.include_router(final_analysis.router, prefix="/final-analysis", tags=["final-analysis"])

    static_dir = BASE_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse(url="/static/demo.html")

    return app


app = create_app()

