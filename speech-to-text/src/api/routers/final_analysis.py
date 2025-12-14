"""
Final Analysis API endpoint for comprehensive lecture evaluation.

Analyzes all slide transcripts and global summary to provide comprehensive feedback.
"""

import json
import logging
import os
import re
from typing import List, Dict, Any, Optional
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import google.generativeai as genai

logger = logging.getLogger(__name__)

router = APIRouter()

# Load Google API key
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    from dotenv import load_dotenv
    load_dotenv(ENV_PATH, override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)


class SlideTranscript(BaseModel):
    slide_page_number: int
    transcript_text: str
    slide_summary: Optional[str] = None
    slide_image_url: Optional[str] = None  # URL của slide image từ GCP


class FinalAnalysisRequest(BaseModel):
    lecture_id: int
    global_summary: Optional[str] = None
    slide_transcripts: List[SlideTranscript] = Field(default_factory=list)


class SlideAnalysis(BaseModel):
    slide_page_number: int
    score: float
    feedback: str
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class FinalAnalysisResponse(BaseModel):
    id: Optional[int] = None
    lecture_id: int
    overall_score: float
    overall_feedback: str
    content_coverage: float
    structure_quality: float
    clarity_score: float
    engagement_score: float
    time_management: float
    slide_analyses: List[SlideAnalysis] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


def create_analysis_prompt(global_summary: Optional[str], slide_transcripts: List[SlideTranscript]) -> tuple[str, List[str]]:
    """
    Create prompt for Gemini to analyze the entire lecture. Returns analysis in Japanese.
    Returns: (prompt_text, image_urls) - prompt text and list of image URLs for vision API
    """
    
    prompt_parts = []
    image_urls = []
    
    prompt_parts.append("""あなたは教育プレゼンテーションの評価・分析の専門家です。
以下の情報に基づいて、講義全体を分析する任務を担います：
1. スライドの全体概要（global summary）
2. 各スライドの画像（提供されている場合）
3. 録音されたすべてのスライドからのトランスクリプト

**重要な注意事項：**
- 各スライドには画像が提供されている場合があります。画像を注意深く確認し、スライドの内容を理解してください。
- トランスクリプトとスライド画像を照合して、講師がスライドの内容を正確に説明しているかを評価してください。
- 一部のスライドにはトランスクリプトがあるが、まだ要約（summary）が生成されていない場合があります。その場合でも、スライド画像とトランスクリプトを基に評価してください。

以下の評価基準に基づいて講義を評価し、詳細で有用なフィードバックを提供してください：

**評価基準：**
1. **コンテンツカバレッジ（Content Coverage）**: 講師がスライドの主要なポイントを十分に説明しているかを評価
2. **構造の質（Structure Quality）**: 内容の構成と提示方法が論理的で一貫性があるかを評価
3. **明確性（Clarity）**: 表現や説明が理解しやすいかを評価
4. **エンゲージメント（Engagement）**: プレゼンテーションが魅力的で興味を引くかを評価
5. **時間管理（Time Management）**: 各部分への時間配分が適切かを評価

**出力要件：**
以下の構造のJSONオブジェクトを返してください（JSONのみを返し、追加のテキストは含めないでください）。
すべてのテキスト（フィードバック、強み、改善点、推奨事項など）は日本語で記述してください：

{
  "overall_score": <0.0から1.0の数値>,
  "overall_feedback": "<講義全体に関する総合的なコメント（日本語）>",
  "content_coverage": <0.0から1.0の数値>,
  "structure_quality": <0.0から1.0の数値>,
  "clarity_score": <0.0から1.0の数値>,
  "engagement_score": <0.0から1.0の数値>,
  "time_management": <0.0から1.0の数値>,
  "slide_analyses": [
    {
      "slide_page_number": <ページ番号>,
      "score": <0.0から1.0の数値>,
      "feedback": "<このスライドに関するコメント（日本語）>",
      "strengths": ["<強み1（日本語）>", "<強み2（日本語）>", ...],
      "improvements": ["<改善点1（日本語）>", "<改善点2（日本語）>", ...]
    },
    ...
  ],
  "strengths": ["<総合的な強み1（日本語）>", "<総合的な強み2（日本語）>", ...],
  "improvements": ["<総合的な改善点1（日本語）>", "<総合的な改善点2（日本語）>", ...],
  "recommendations": ["<具体的な推奨事項1（日本語）>", "<具体的な推奨事項2（日本語）>", ...]
}

**注意事項：**
- 公平で客観的な評価を行ってください
- 具体的で実行可能なフィードバックを提供してください
- 強みと改善点の両方に焦点を当ててください
- 有効なJSON形式であることを確認してください
- すべてのテキストフィールドは必ず日本語で記述してください

""")
    
    if global_summary:
        prompt_parts.append(f"\n**スライドの全体概要（Global Summary）：**\n{global_summary}\n")
    
    prompt_parts.append("\n**各スライドの詳細：**\n")
    for transcript in slide_transcripts:
        prompt_parts.append(f"\n--- スライド {transcript.slide_page_number} ---")
        
        # Thêm slide image URL nếu có
        if transcript.slide_image_url:
            image_urls.append(transcript.slide_image_url)
            prompt_parts.append(f"[スライド画像 {transcript.slide_page_number} を参照してください]")
        
        if transcript.slide_summary:
            prompt_parts.append(f"スライドの要約: {transcript.slide_summary}")
        else:
            prompt_parts.append(f"スライドの要約: (まだ生成されていません - スライド画像とトランスクリプトを基に評価してください)")
        
        prompt_parts.append(f"トランスクリプト:\n{transcript.transcript_text}\n")
    
    prompt_parts.append("""
**分析のポイント：**
- 各スライドについて、スライド画像の内容とトランスクリプトを照合してください
- スライドの要約がない場合でも、画像とトランスクリプトから内容を理解して評価してください
- 講師がスライドの主要なポイントを正確に説明しているかを確認してください
- スライドの視覚的な要素（図表、グラフ、箇条書きなど）が適切に説明されているかを評価してください

上記の要件に従って分析し、JSONを返してください。すべてのテキストは日本語で記述してください。""")
    
    return "\n".join(prompt_parts), image_urls


@router.post("/final-analysis", response_model=FinalAnalysisResponse)
async def analyze_final_lecture(request: FinalAnalysisRequest) -> FinalAnalysisResponse:
    """
    Analyze the entire lecture comprehensively based on global summary and all transcripts.
    Returns analysis results in Japanese.
    """
    try:
        if not GOOGLE_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="Google API key not configured"
            )
        
        if not request.slide_transcripts:
            raise HTTPException(
                status_code=400,
                detail="At least one slide transcript is required"
            )
        
        # Log request data
        logger.info("=== Final Analysis Request Received ===")
        logger.info(f"Lecture ID: {request.lecture_id}")
        logger.info(f"Global Summary: {request.global_summary[:200] if request.global_summary else 'None'}...")
        logger.info(f"Number of slide transcripts: {len(request.slide_transcripts)}")
        for i, transcript in enumerate(request.slide_transcripts):
            logger.info(f"  Slide {i+1}: page={transcript.slide_page_number}, "
                       f"transcript_length={len(transcript.transcript_text) if transcript.transcript_text else 0}, "
                       f"summary={'present' if transcript.slide_summary else 'None'}, "
                       f"image_url={'present' if transcript.slide_image_url else 'None'}")
        logger.info("========================================")
        
        # Tạo prompt và lấy image URLs
        prompt, image_urls = create_analysis_prompt(request.global_summary, request.slide_transcripts)
        
        logger.info(f"Prompt length: {len(prompt)} characters")
        logger.info(f"Number of images: {len(image_urls)}")
        if image_urls:
            logger.info(f"Image URLs: {image_urls}")
        
        # Gọi Gemini - thử các model names khác nhau (giống như analysis.py)
        # Sử dụng model hỗ trợ vision nếu có images
        model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        model = None
        last_error = None
        
        model_names = [
            model_name,
            "gemini-1.5-flash",
            "gemini-1.5-pro",  # Pro model tốt hơn cho vision
            "gemini-flash-latest",
            "gemini-2.0-flash-001",
            "gemini-2.0-flash",
            "gemini-pro",
        ]
        
        for name in model_names:
            try:
                model = genai.GenerativeModel(name)
                # Test với một prompt đơn giản
                _ = model.generate_content("test")
                logger.info(f"Using Gemini model: {name} for final analysis")
                break
            except Exception as e:
                last_error = e
                logger.debug(f"Model {name} failed: {e}")
                continue
        
        if not model:
            error_msg = f"Could not initialize Gemini model. Tried: {model_names}. Last error: {last_error}"
            logger.error(error_msg)
            raise HTTPException(
                status_code=500,
                detail=error_msg
            )
        
        # Tạo content với images nếu có
        if image_urls:
            # Nếu có images, tạo content parts với images
            import urllib.request
            from io import BytesIO
            from PIL import Image as PILImage
            import fitz  # PyMuPDF for PDF page extraction
            
            content_parts = [prompt]
            image_count = 0
            
            for img_url in image_urls:
                try:
                    # Check if URL is PDF with page parameter
                    if "#page=" in img_url:
                        # Extract PDF URL and page number
                        pdf_url = img_url.split("#page=")[0]
                        page_num = int(img_url.split("#page=")[1]) - 1  # 0-indexed
                        
                        # Download PDF
                        with urllib.request.urlopen(pdf_url) as response:
                            pdf_data = response.read()
                        
                        # Extract page as image using PyMuPDF
                        pdf_doc = fitz.open(stream=pdf_data, filetype="pdf")
                        if page_num < len(pdf_doc):
                            page = pdf_doc[page_num]
                            # Render page as image (zoom factor 2 for better quality)
                            mat = fitz.Matrix(2.0, 2.0)
                            pix = page.get_pixmap(matrix=mat)
                            # Convert to PIL Image
                            img = PILImage.frombytes("RGB", [pix.width, pix.height], pix.samples)
                            content_parts.append(img)
                            image_count += 1
                            logger.info(f"Extracted page {page_num + 1} from PDF and added to content")
                        pdf_doc.close()
                    else:
                        # Regular image URL
                        with urllib.request.urlopen(img_url) as response:
                            img_data = response.read()
                            img = PILImage.open(BytesIO(img_data))
                            content_parts.append(img)
                            image_count += 1
                            logger.debug(f"Added image from URL: {img_url}")
                except Exception as e:
                    logger.warning(f"Failed to load image from {img_url}: {e}. Continuing without image.")
                    # Nếu không load được image, chỉ dùng text prompt
                    pass
            
            # Generate với images
            logger.info(f"Generating content with {image_count} images...")
            response = model.generate_content(content_parts)
        else:
            # Không có images, chỉ dùng text prompt
            logger.info("Generating content with text only...")
            response = model.generate_content(prompt)
        
        # Parse JSON từ response
        if not response or not response.text:
            logger.error("Gemini API returned empty response!")
            raise HTTPException(
                status_code=500,
                detail="Gemini API returned empty response"
            )
        
        response_text = response.text.strip()
        
        logger.info("=== Gemini API Raw Response ===")
        logger.info(f"Response length: {len(response_text)} characters")
        logger.info(f"Full response text:\n{response_text}")
        logger.info("================================")
        
        # Loại bỏ markdown code blocks nếu có
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        response_text = response_text.strip()
        
        # Parse JSON với error handling tốt hơn
        try:
            analysis_data = json.loads(response_text)
            logger.info("=== Parsed Analysis Data ===")
            logger.info(f"Overall Score: {analysis_data.get('overall_score')}")
            logger.info(f"Content Coverage: {analysis_data.get('content_coverage')}")
            logger.info(f"Structure Quality: {analysis_data.get('structure_quality')}")
            logger.info(f"Clarity Score: {analysis_data.get('clarity_score')}")
            logger.info(f"Engagement Score: {analysis_data.get('engagement_score')}")
            logger.info(f"Time Management: {analysis_data.get('time_management')}")
            logger.info(f"Number of slide analyses: {len(analysis_data.get('slide_analyses', []))}")
            logger.info("============================")
        except json.JSONDecodeError:
            # Nếu không parse được JSON, thử extract JSON từ text
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                analysis_data = json.loads(json_match.group())
            else:
                logger.error(f"Failed to extract JSON from response: {response_text[:500]}")
                raise
        
        # Helper function to safely get float value
        def get_float_value(data: Dict[str, Any], key: str, default: float = 0.0) -> float:
            value = data.get(key)
            if value is None:
                logger.warning(f"Missing or null value for {key}, using default {default}")
                return default
            try:
                return float(value)
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid value for {key}: {value}, using default {default}. Error: {e}")
                return default
        
        # Helper function to safely get string value
        def get_string_value(data: Dict[str, Any], key: str, default: str = "") -> str:
            value = data.get(key)
            if value is None:
                logger.warning(f"Missing or null value for {key}, using default")
                return default
            return str(value) if value else default
        
        # Convert slide_analyses
        slide_analyses = [
            SlideAnalysis(
                slide_page_number=sa.get("slide_page_number", 0),
                score=get_float_value(sa, "score", 0.0),
                feedback=get_string_value(sa, "feedback", ""),
                strengths=sa.get("strengths", []) or [],
                improvements=sa.get("improvements", []) or []
            )
            for sa in analysis_data.get("slide_analyses", [])
        ]
        
        # Build response with validated values
        response_data = FinalAnalysisResponse(
            lecture_id=request.lecture_id,
            overall_score=get_float_value(analysis_data, "overall_score", 0.0),
            overall_feedback=get_string_value(analysis_data, "overall_feedback", "分析結果が利用できませんでした。"),
            content_coverage=get_float_value(analysis_data, "content_coverage", 0.0),
            structure_quality=get_float_value(analysis_data, "structure_quality", 0.0),
            clarity_score=get_float_value(analysis_data, "clarity_score", 0.0),
            engagement_score=get_float_value(analysis_data, "engagement_score", 0.0),
            time_management=get_float_value(analysis_data, "time_management", 0.0),
            slide_analyses=slide_analyses,
            strengths=analysis_data.get("strengths", []) or [],
            improvements=analysis_data.get("improvements", []) or [],
            recommendations=analysis_data.get("recommendations", []) or []
        )
        
        logger.info("=== Final Response Data ===")
        logger.info(f"Lecture ID: {response_data.lecture_id}")
        logger.info(f"Overall Score: {response_data.overall_score}")
        logger.info(f"Content Coverage: {response_data.content_coverage}")
        logger.info(f"Structure Quality: {response_data.structure_quality}")
        logger.info(f"Clarity Score: {response_data.clarity_score}")
        logger.info(f"Engagement Score: {response_data.engagement_score}")
        logger.info(f"Time Management: {response_data.time_management}")
        logger.info(f"Overall Feedback: {response_data.overall_feedback[:200] if response_data.overall_feedback else 'None'}...")
        logger.info(f"Number of slide analyses: {len(response_data.slide_analyses)}")
        logger.info(f"Number of strengths: {len(response_data.strengths)}")
        logger.info(f"Number of improvements: {len(response_data.improvements)}")
        logger.info(f"Number of recommendations: {len(response_data.recommendations)}")
        logger.info("===========================")
        
        return response_data
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini response as JSON: {e}")
        if 'response_text' in locals():
            logger.error(f"Response text: {response_text[:500]}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse analysis response: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Final analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Final analysis failed: {str(e)}"
        ) from e

