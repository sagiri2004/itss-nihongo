"""Endpoints for slide processing operations."""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, File, HTTPException, UploadFile
from google.api_core import exceptions as gcs_exceptions
from google.cloud import storage
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Default service account path (same as transcription router)
DEFAULT_SERVICE_ACCOUNT = Path(__file__).resolve().parents[4] / "speech-processing-prod-9ffbefa55e2c.json"


def _ensure_credentials_path() -> Optional[str]:
    """Ensure GOOGLE_APPLICATION_CREDENTIALS is set, using local json as fallback."""
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if credentials_path and Path(credentials_path).exists():
        return credentials_path

    if DEFAULT_SERVICE_ACCOUNT.exists():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(DEFAULT_SERVICE_ACCOUNT)
        return str(DEFAULT_SERVICE_ACCOUNT)

    return credentials_path


# Ensure credentials are set on module import
_ensure_credentials_path()

from ...slide_processing import PDFProcessingError, SlideProcessor
from ...pdf_processing.text_summarizer import TextSummarizer

router = APIRouter()


class SlideProcessingRequest(BaseModel):
    """Payload for processing slides stored in GCS."""

    lecture_id: int = Field(..., alias="lecture_id")
    gcs_uri: str = Field(..., alias="gcs_uri")
    original_name: Optional[str] = Field(None, alias="original_name")
    use_embeddings: bool = Field(True, alias="use_embeddings")

    class Config:
        populate_by_name = True


class SlideDetails(BaseModel):
    """Slide-level information returned to the backend."""

    slide_id: int = Field(..., alias="slide_id")
    title: Optional[str] = None
    headings: List[str] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)
    body: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    all_text: str = Field("", alias="all_text")
    summary: str = Field("", alias="summary")  # Semantic summary processed by NLP

    class Config:
        populate_by_name = True


class SlideProcessingResponse(BaseModel):
    """Response returned after processing slides stored in GCS."""

    lecture_id: int = Field(..., alias="lecture_id")
    original_name: Optional[str] = Field(None, alias="original_name")
    slide_count: int = Field(..., alias="slide_count")
    keywords_count: int = Field(..., alias="keywords_count")
    has_embeddings: bool = Field(..., alias="has_embeddings")
    all_summary: str = Field("", alias="all_summary")  # Global summary of all slides
    slides: List[SlideDetails]

    class Config:
        populate_by_name = True


def _parse_gcs_uri(gcs_uri: str) -> Tuple[str, str]:
    """Split a GCS URI into bucket and object name."""
    if not gcs_uri.startswith("gs://"):
        raise HTTPException(status_code=400, detail="Invalid GCS URI. Must start with 'gs://'.")

    remainder = gcs_uri[5:]
    if "/" not in remainder:
        raise HTTPException(
            status_code=400,
            detail="Invalid GCS URI. Expected format 'gs://bucket/object'.",
        )

    bucket_name, object_name = remainder.split("/", 1)
    if not bucket_name or not object_name:
        raise HTTPException(
            status_code=400,
            detail="Invalid GCS URI. Bucket or object name missing.",
        )

    return bucket_name, object_name


def _download_gcs_file(bucket_name: str, object_name: str) -> Path:
    """Download a GCS object to a temporary local file."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)

    if not blob.exists():
        raise HTTPException(
            status_code=404,
            detail=f"GCS object not found: gs://{bucket_name}/{object_name}",
        )

    suffix = Path(object_name).suffix or ".pdf"
    tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_path = Path(tmp_file.name)
    try:
        blob.download_to_file(tmp_file)
        tmp_file.flush()
    finally:
        tmp_file.close()

    return temp_path


def _build_slide_payload(processor: SlideProcessor) -> Tuple[List[Dict[str, Any]], int]:
    """Build slide payload list and count unique keywords."""
    slides_payload: List[Dict[str, Any]] = []
    unique_keywords: set[str] = set()

    for slide in processor.slides:
        slide_keywords = processor.slide_keywords.get(slide.page_number, [])
        unique_keywords.update(slide_keywords)
        slides_payload.append(
            {
                "slide_id": slide.page_number,
                "title": slide.title,
                "headings": slide.headings,
                "bullets": slide.bullets,
                "body": slide.body,
                "keywords": slide_keywords,
                "all_text": slide.all_text,
                "summary": slide.summary,  # Semantic summary processed by NLP
            }
        )

    return slides_payload, len(unique_keywords)


def _generate_all_summary(processor: SlideProcessor) -> str:
    """
    Generate global summary for all slides using TextSummarizer.
    
    Raises:
        RuntimeError: If TextSummarizer initialization fails (consistent with PDFExtractor behavior).
        This ensures dependency issues are visible rather than silently masked.
    """
    try:
        summarizer = TextSummarizer()
        slides_data_for_summary = [
            {
                "page_number": slide.page_number,
                "summary": slide.summary
            }
            for slide in processor.slides
        ]
        return summarizer.generate_global_summary(slides_data_for_summary)
    except RuntimeError as e:
        # RuntimeError from TextSummarizer indicates missing dependencies (ginza, ja-ginza)
        # This is the same error that would fail PDFExtractor, so we should propagate it
        # for consistency and visibility
        logger.error(
            "Failed to generate all_summary: TextSummarizer initialization failed. "
            "This indicates missing NLP dependencies (ginza, ja-ginza). "
            "Error: %s",
            str(e)
        )
        raise
    except Exception as e:
        # Other exceptions (e.g., processing errors) should also be logged and raised
        # to avoid masking real problems
        logger.error(
            "Failed to generate all_summary: Unexpected error during summarization. "
            "Error: %s",
            str(e),
            exc_info=True
        )
        raise RuntimeError(
            f"Failed to generate global summary: {str(e)}"
        ) from e


@router.post("/upload")
async def upload_slide(
    file: UploadFile = File(..., description="PDF slide deck to process"),
    presentation_id: Optional[str] = None,
    use_embeddings: bool = True,
) -> Dict[str, Any]:
    """Receive a PDF, process it with SlideProcessor and return JSON data."""
    if file.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    temp_path: Optional[Path] = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_file:
            temp_path = Path(tmp_file.name)
            contents = await file.read()
            tmp_file.write(contents)

        processor = SlideProcessor(use_embeddings=use_embeddings)
        stats = processor.process_pdf(str(temp_path))
        slides_payload, unique_keyword_count = _build_slide_payload(processor)
        all_summary = _generate_all_summary(processor)

        response: Dict[str, Any] = {
            "filename": file.filename,
            "presentation_id": presentation_id,
            "statistics": stats,
            "slides": slides_payload,
            "keywords_count": stats.get("keywords_count", unique_keyword_count),
            "slide_count": stats.get("slide_count", len(slides_payload)),
            "has_embeddings": bool(stats.get("has_embeddings", False)),
            "all_summary": all_summary,
        }

        return response

    except PDFProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard against unexpected errors
        raise HTTPException(status_code=500, detail=f"Slide processing error: {exc}") from exc
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


@router.post("/process", response_model=SlideProcessingResponse)
async def process_slide(request: SlideProcessingRequest) -> SlideProcessingResponse:
    """Process a slide deck stored in GCS and return structured data."""
    temp_path: Optional[Path] = None
    try:
        bucket_name, object_name = _parse_gcs_uri(request.gcs_uri)
        temp_path = _download_gcs_file(bucket_name, object_name)

        processor = SlideProcessor(use_embeddings=request.use_embeddings)
        stats = processor.process_pdf(str(temp_path))
        slides_payload, unique_keyword_count = _build_slide_payload(processor)
        all_summary = _generate_all_summary(processor)

        slide_models = [
            SlideDetails(
                slide_id=slide["slide_id"],
                title=slide.get("title"),
                headings=slide.get("headings", []),
                bullets=slide.get("bullets", []),
                body=slide.get("body", []),
                keywords=slide.get("keywords", []),
                all_text=slide.get("all_text", ""),
                summary=slide.get("summary", ""),
            )
            for slide in slides_payload
        ]

        return SlideProcessingResponse(
            lecture_id=request.lecture_id,
            original_name=request.original_name,
            slide_count=stats.get("slide_count", len(slides_payload)),
            keywords_count=stats.get("keywords_count", unique_keyword_count),
            has_embeddings=bool(stats.get("has_embeddings", False)),
            all_summary=all_summary,
            slides=slide_models,
        )

    except PDFProcessingError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except gcs_exceptions.GoogleAPIError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"GCS access error while downloading slide deck: {exc}",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:  # pragma: no cover - safeguard against unexpected errors
        raise HTTPException(status_code=500, detail=f"Slide processing error: {exc}") from exc
    finally:
        if temp_path and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


