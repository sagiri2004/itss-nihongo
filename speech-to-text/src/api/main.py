"""
FastAPI application entrypoint exposing slide processing and speech-to-text services.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from .routers import slides, transcription, analytics

BASE_DIR = Path(__file__).resolve().parent


def create_app() -> FastAPI:
    """Initialize FastAPI application with configured routers and static assets."""
    app = FastAPI(
        title="Speech-to-Text Service",
        description="API cung cấp chức năng xử lý slide và chuyển giọng nói thành văn bản.",
        version="1.0.0",
    )

    app.include_router(slides.router, prefix="/slides", tags=["slides"])
    app.include_router(transcription.router, prefix="/ws", tags=["speech-to-text"])
    app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

    static_dir = BASE_DIR / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/", include_in_schema=False)
    async def root() -> RedirectResponse:
        return RedirectResponse(url="/static/demo.html")

    return app


app = create_app()

