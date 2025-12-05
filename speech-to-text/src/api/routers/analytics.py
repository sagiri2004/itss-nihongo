"""
Analytics API endpoints for Phase 5: Teaching Analytics Features.

Core AI endpoints without UI dependencies.
"""

import logging
from typing import Any, Dict, List, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ...analytics.context_extraction import (
    ContextExtractor,
    ExportGenerator,
)
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter()


class ContextExtractionRequest(BaseModel):
    """Request for context extraction analysis."""
    
    presentation_id: str = Field(..., alias="presentation_id")
    segments: List[Dict[str, Any]] = Field(..., alias="segments")
    slide_transitions: List[Dict[str, Any]] = Field(default_factory=list, alias="slide_transitions")
    min_importance_threshold: float = Field(30.0, alias="min_importance_threshold")
    
    class Config:
        populate_by_name = True


class ContextExtractionResponse(BaseModel):
    """Response from context extraction analysis."""
    
    presentation_id: str = Field(..., alias="presentation_id")
    total_contexts: int = Field(..., alias="total_contexts")
    contexts: List[Dict[str, Any]] = Field(..., alias="contexts")
    statistics: Dict[str, Any] = Field(..., alias="statistics")
    generated_at: str = Field(..., alias="generated_at")
    
    class Config:
        populate_by_name = True


@router.post("/context-extraction", response_model=ContextExtractionResponse)
async def extract_contexts(request: ContextExtractionRequest) -> ContextExtractionResponse:
    """
    Extract important teaching contexts from transcript segments.
    
    This endpoint implements Week 9-10: Context Extraction System.
    Analyzes transcript segments to identify important teaching moments.
    """
    try:
        # Convert slide_transitions format
        slide_transitions = [
            (tran.get('timestamp', 0.0), tran.get('slide_id'))
            for tran in request.slide_transitions
        ]
        
        # Initialize extractor
        extractor = ContextExtractor(
            min_importance_threshold=request.min_importance_threshold,
        )
        
        # Extract contexts
        contexts = extractor.extract_contexts(
            segments=request.segments,
            slide_transitions=slide_transitions,
        )
        
        # Generate statistics
        stats = ExportGenerator._calculate_statistics(contexts)
        
        # Convert contexts to dict
        contexts_dict = [
            {
                "context_id": ctx.context_id,
                "start_time": ctx.start_time,
                "end_time": ctx.end_time,
                "slide_page": ctx.slide_page,
                "text": ctx.text,
                "context_type": ctx.context_type,
                "importance_score": ctx.importance_score,
                "keywords_matched": ctx.keywords_matched,
                "teacher_notes": ctx.teacher_notes,
                "created_at": ctx.created_at,
            }
            for ctx in contexts
        ]
        
        return ContextExtractionResponse(
            presentation_id=request.presentation_id,
            total_contexts=len(contexts),
            contexts=contexts_dict,
            statistics=stats,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
        
    except Exception as e:
        logger.error(f"Context extraction failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Context extraction failed: {str(e)}"
        ) from e


@router.post("/context-extraction/export/json")
async def export_contexts_json(request: ContextExtractionRequest) -> Dict[str, Any]:
    """Export contexts as JSON."""
    try:
        slide_transitions = [
            (tran.get('timestamp', 0.0), tran.get('slide_id'))
            for tran in request.slide_transitions
        ]
        
        extractor = ContextExtractor(
            min_importance_threshold=request.min_importance_threshold,
        )
        
        contexts = extractor.extract_contexts(
            segments=request.segments,
            slide_transitions=slide_transitions,
        )
        
        return ExportGenerator.export_json(contexts)
        
    except Exception as e:
        logger.error(f"JSON export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"JSON export failed: {str(e)}"
        ) from e


@router.post("/context-extraction/export/text")
async def export_contexts_text(request: ContextExtractionRequest) -> Dict[str, str]:
    """Export contexts as formatted text report."""
    try:
        slide_transitions = [
            (tran.get('timestamp', 0.0), tran.get('slide_id'))
            for tran in request.slide_transitions
        ]
        
        extractor = ContextExtractor(
            min_importance_threshold=request.min_importance_threshold,
        )
        
        contexts = extractor.extract_contexts(
            segments=request.segments,
            slide_transitions=slide_transitions,
        )
        
        text_report = ExportGenerator.export_text(contexts)
        
        return {
            "format": "text",
            "content": text_report,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
        
    except Exception as e:
        logger.error(f"Text export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Text export failed: {str(e)}"
        ) from e


@router.post("/context-extraction/export/html")
async def export_contexts_html(
    request: ContextExtractionRequest,
    total_duration: float = Field(3600.0, description="Total recording duration in seconds"),
) -> Dict[str, str]:
    """Export contexts as HTML timeline visualization."""
    try:
        slide_transitions = [
            (tran.get('timestamp', 0.0), tran.get('slide_id'))
            for tran in request.slide_transitions
        ]
        
        extractor = ContextExtractor(
            min_importance_threshold=request.min_importance_threshold,
        )
        
        contexts = extractor.extract_contexts(
            segments=request.segments,
            slide_transitions=slide_transitions,
        )
        
        html_timeline = ExportGenerator.export_html_timeline(contexts, total_duration)
        
        return {
            "format": "html",
            "content": html_timeline,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }
        
    except Exception as e:
        logger.error(f"HTML export failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"HTML export failed: {str(e)}"
        ) from e

