"""
API router for analyzing slide recordings with Gemini.
"""
import logging
import os
from typing import Dict, Any, List

import google.generativeai as genai
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
else:
    logger.warning("GOOGLE_API_KEY not found, Gemini analysis will not work")


class AnalysisRequest(BaseModel):
    """Request for analyzing a slide recording."""
    lecture_id: int = Field(..., description="Lecture ID")
    slide_page_number: int = Field(..., description="Slide page number")
    slide_content: str = Field(..., description="Content of the slide (text extracted from PDF)")
    slide_keywords: List[str] = Field(default_factory=list, description="Keywords from the slide")
    transcript_texts: List[str] = Field(..., description="List of transcript texts from recording")
    language_code: str = Field(default="ja-JP", description="Language code")


class AnalysisResponse(BaseModel):
    """Response from analysis."""
    context_accuracy: float = Field(..., description="Độ chính xác ngữ cảnh (0-1)")
    content_completeness: float = Field(..., description="Độ đầy đủ nội dung (0-1)")
    context_relevance: float = Field(..., description="Độ liên quan ngữ cảnh (0-1)")
    feedback: str = Field(..., description="Nhận xét chi tiết")
    suggestions: List[str] = Field(default_factory=list, description="Gợi ý cải thiện")


@router.post("/analyze-recording", response_model=AnalysisResponse)
async def analyze_recording(request: AnalysisRequest) -> AnalysisResponse:
    """
    Phân tích slide recording với Gemini API.
    Đánh giá: ngữ cảnh, độ chính xác, độ đầy đủ.
    """
    if not api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    try:
        # Combine all transcript texts
        full_transcript = " ".join(request.transcript_texts)
        
        # Prepare slide context
        slide_context = f"""
Nội dung slide:
{request.slide_content}

Từ khóa: {', '.join(request.slide_keywords) if request.slide_keywords else 'Không có'}
"""

        # Determine language for feedback
        is_japanese = request.language_code.startswith('ja')
        feedback_lang = "日本語" if is_japanese else "Tiếng Việt"
        
        # Create prompt for Gemini
        prompt = f"""
あなたは学生のプレゼンテーションを評価する教師です。

プレゼンテーションされたスライド:
{slide_context}

プレゼンテーション内容（録音から）:
{full_transcript}

以下の基準に基づいてこのプレゼンテーションを評価してください:

1. **文脈の正確性 (Context Accuracy)**: プレゼンテーション内容はスライドの内容と正確に一致していますか？ (0.0 - 1.0)
2. **内容の完全性 (Content Completeness)**: 学生はスライドの主要なポイントを完全に説明していますか？ (0.0 - 1.0)
3. **文脈の関連性 (Context Relevance)**: プレゼンテーション内容はスライドに関連し、適切ですか？ (0.0 - 1.0)

以下のJSON形式で結果を返してください:
{{
    "context_accuracy": <0.0から1.0の数値>,
    "content_completeness": <0.0から1.0の数値>,
    "context_relevance": <0.0から1.0の数値>,
    "feedback": "<日本語で詳細なフィードバック（200-300文字程度）>",
    "suggestions": [
        "<改善提案1>",
        "<改善提案2>",
        "<改善提案3>"
    ]
}}

JSONのみを返してください。追加のテキストは含めないでください。
"""

        # Initialize Gemini model
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        model = None
        last_error = None
        
        for name in [model_name, "gemini-1.5-flash", "gemini-flash-latest", "gemini-2.0-flash-001"]:
            try:
                model = genai.GenerativeModel(name)
                # Test with a simple prompt
                _ = model.generate_content("test")
                logger.info(f"Using Gemini model: {name}")
                break
            except Exception as e:
                last_error = e
                continue
        
        if not model:
            raise RuntimeError(f"Could not initialize Gemini model. Last error: {last_error}")

        # Generate analysis
        response = model.generate_content(prompt)
        result_text = response.text.strip()

        # Parse JSON response
        import json
        import re
        
        # Try to extract JSON from response (handle nested objects)
        # Find JSON object with balanced braces
        brace_count = 0
        start_idx = -1
        for i, char in enumerate(result_text):
            if char == '{':
                if start_idx == -1:
                    start_idx = i
                brace_count += 1
            elif char == '}':
                brace_count -= 1
                if brace_count == 0 and start_idx != -1:
                    json_str = result_text[start_idx:i+1]
                    try:
                        result_json = json.loads(json_str)
                        break
                    except json.JSONDecodeError:
                        start_idx = -1
                        brace_count = 0
        else:
            # Fallback: try parsing entire response as JSON
            try:
                result_json = json.loads(result_text)
            except json.JSONDecodeError:
                # Last resort: try to find JSON with regex
                json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
                if json_match:
                    result_json = json.loads(json_match.group())
                else:
                    raise ValueError("Could not extract JSON from response")

        # Validate and return
        return AnalysisResponse(
            context_accuracy=float(result_json.get("context_accuracy", 0.0)),
            content_completeness=float(result_json.get("content_completeness", 0.0)),
            context_relevance=float(result_json.get("context_relevance", 0.0)),
            feedback=result_json.get("feedback", "Không có nhận xét"),
            suggestions=result_json.get("suggestions", [])
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        logger.error(f"Response text: {result_text[:500]}")
        raise HTTPException(status_code=500, detail=f"Failed to parse analysis response: {str(e)}")
    except Exception as e:
        logger.error(f"Error analyzing recording: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

