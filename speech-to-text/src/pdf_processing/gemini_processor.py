"""
Gemini-based PDF Processor

Uses Google Gemini API to process PDF slides and extract:
- Keywords for each slide
- Summary for each slide
- Global summary for all slides
"""

import logging
import os
import re
import json
import base64
from pathlib import Path
from typing import List, Dict, Optional, Any

import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiProcessor:
    """Process PDF slides using Gemini API."""
    
    def __init__(self):
        """Initialize Gemini client."""
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)
        self.client = genai
        
        # Get model name from env or use default
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize Gemini model."""
        try:
            self.model = self.client.GenerativeModel(self.model_name)
            logger.info(f"Initialized Gemini model: {self.model_name}")
        except Exception as e:
            # Try fallback models
            fallback_models = [
                "gemini-1.5-flash-lite",
                "gemini-flash-latest",
                "gemini-2.0-flash-001",
            ]
            for fallback in fallback_models:
                try:
                    self.model = self.client.GenerativeModel(fallback)
                    self.model_name = fallback
                    logger.info(f"Using fallback model: {fallback}")
                    return
                except Exception:
                    continue
            raise RuntimeError(f"Could not initialize any Gemini model. Last error: {e}")
    
    def process_pdf(self, pdf_path: str) -> Dict[str, Any]:
        """
        Process entire PDF file in one request and extract keywords and summaries for all slides.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dictionary with:
            - slide_count: int
            - slides: List[Dict] with slide_id, keywords, summary
            - all_summary: str
        """
        pdf_path_obj = Path(pdf_path)
        if not pdf_path_obj.exists():
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Read PDF file
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        # Get page count
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            total_pages = len(doc)
            doc.close()
        except ImportError:
            logger.warning("PyMuPDF not available, cannot determine page count")
            total_pages = 1
        
        logger.info(f"Processing entire PDF with {total_pages} pages using Gemini (single request)")
        
        # Process entire PDF in one request
        try:
            result = self._process_entire_pdf(pdf_path, pdf_bytes, total_pages)
            return result
        except Exception as e:
            logger.error(f"Error processing PDF with Gemini: {e}")
            # Return empty result on error
            return {
                "slide_count": 0,
                "keywords_count": 0,
                "slides": [],
                "all_summary": "",
            }
    
    def _process_entire_pdf(self, pdf_path: str, pdf_bytes: bytes, total_pages: int) -> Dict[str, Any]:
        """Process entire PDF in one request and extract all slides data."""
        
        # Create comprehensive prompt for Gemini
        prompt = f"""あなたは日本語のプレゼンテーション資料を分析する専門家です。

【タスク】
PDFファイル全体を分析し、各スライド（ページ）について以下を抽出してください：

1. **キーワード**: 各スライドの重要なキーワードを5-10個抽出してください。名詞や専門用語を優先し、接続詞や助詞は除外してください。

2. **要約**: 各スライドの内容を1-3文で簡潔に要約してください。

3. **全体要約**: 全スライドを読み、プレゼンテーション全体の要約を5文以内で作成してください。

【出力形式】
以下のJSON形式で出力してください（マークダウンや装飾は使用しない）：

{{
  "slides": [
    {{
      "slide_id": 1,
      "keywords": ["キーワード1", "キーワード2", "キーワード3"],
      "summary": "スライド1の要約"
    }},
    {{
      "slide_id": 2,
      "keywords": ["キーワード4", "キーワード5"],
      "summary": "スライド2の要約"
    }}
  ],
  "all_summary": "プレゼンテーション全体の要約"
}}

【注意事項】
- JSONのみを出力し、説明文やその他のテキストは含めないでください
- slides配列には全{total_pages}ページ分のデータを含めてください
- 各slide_idは1から{total_pages}までの連番にしてください
- keywordsは配列形式で、重複を避けてください
- summaryとall_summaryは通常の文章形式で、マークダウンは使用しないでください
- 空のスライドでもslide_idと空のkeywords、summaryを含めてください
"""
        
        try:
            # Upload PDF to Gemini
            # Gemini can process PDF files directly
            import fitz  # PyMuPDF
            doc = fitz.open(pdf_path)
            
            # For Gemini, we can send the PDF file directly
            # But we need to use the file upload API or send as base64
            # Let's try using the file upload method
            
            # Read PDF content as text (extract all text from all pages)
            all_text = ""
            for page_num in range(total_pages):
                page = doc[page_num]
                page_text = page.get_text()
                if page_text.strip():  # Only add non-empty pages
                    all_text += f"\n\n=== スライド {page_num + 1} ===\n{page_text}\n"
            
            doc.close()
            
            if not all_text.strip():
                logger.warning("PDF has no extractable text")
                return {
                    "slide_count": total_pages,
                    "keywords_count": 0,
                    "slides": [{"slide_id": i+1, "keywords": [], "summary": ""} for i in range(total_pages)],
                    "all_summary": "",
                }
            
            # Send to Gemini
            full_prompt = f"{prompt}\n\n【PDF内容】\n{all_text}"
            
            generation_config = {
                "temperature": 0.2,
                "max_output_tokens": 8000,  # Increase for multiple slides
                "top_p": 0.8,
                "top_k": 40,
            }
            
            logger.info(f"Sending entire PDF ({total_pages} pages) to Gemini in one request")
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            # Parse response
            result_text = response.text.strip()
            logger.debug(f"Gemini response length: {len(result_text)} characters")
            
            # Extract JSON from response
            result = self._parse_gemini_json_response(result_text, total_pages)
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing entire PDF with Gemini: {e}")
            raise
    
    def _parse_gemini_json_response(self, response_text: str, expected_slides: int) -> Dict[str, Any]:
        """Parse JSON response from Gemini."""
        # Try to find JSON block
        json_start = response_text.find("{")
        json_end = response_text.rfind("}") + 1
        
        if json_start < 0 or json_end <= json_start:
            logger.warning("No JSON found in Gemini response, trying to extract manually")
            return self._extract_data_manually(response_text, expected_slides)
        
        json_str = response_text[json_start:json_end]
        
        try:
            data = json.loads(json_str)
            
            # Validate structure
            if "slides" not in data:
                logger.warning("Response missing 'slides' field, trying manual extraction")
                return self._extract_data_manually(response_text, expected_slides)
            
            slides = data.get("slides", [])
            all_summary = data.get("all_summary", "")
            
            # Ensure all slides are present
            if len(slides) < expected_slides:
                logger.warning(f"Expected {expected_slides} slides but got {len(slides)}, filling missing slides")
                # Fill missing slides
                existing_ids = {s.get("slide_id", 0) for s in slides}
                for slide_id in range(1, expected_slides + 1):
                    if slide_id not in existing_ids:
                        slides.append({
                            "slide_id": slide_id,
                            "keywords": [],
                            "summary": ""
                        })
                # Sort by slide_id
                slides.sort(key=lambda x: x.get("slide_id", 0))
            
            # Count unique keywords
            all_keywords = set()
            for slide in slides:
                all_keywords.update(slide.get("keywords", []))
            
            return {
                "slide_count": len(slides),
                "keywords_count": len(all_keywords),
                "slides": slides,
                "all_summary": all_summary,
            }
            
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parsing failed: {e}, trying manual extraction")
            return self._extract_data_manually(response_text, expected_slides)
    
    def _extract_data_manually(self, response_text: str, expected_slides: int) -> Dict[str, Any]:
        """Manually extract data from response if JSON parsing fails."""
        slides = []
        all_summary = ""
        
        # Try to extract slides
        # Look for patterns like "slide_id": 1 or "スライド1"
        for slide_id in range(1, expected_slides + 1):
            keywords = []
            summary = ""
            
            # Try to find slide section
            slide_patterns = [
                rf'"slide_id"\s*:\s*{slide_id}',
                rf'スライド\s*{slide_id}',
                rf'Slide\s*{slide_id}',
            ]
            
            for pattern in slide_patterns:
                match = re.search(pattern, response_text, re.IGNORECASE)
                if match:
                    # Extract keywords and summary from this section
                    start_pos = match.start()
                    # Find next slide or end
                    next_slide_match = re.search(rf'"slide_id"\s*:\s*{slide_id + 1}|スライド\s*{slide_id + 1}', response_text[start_pos:], re.IGNORECASE)
                    end_pos = start_pos + (next_slide_match.start() if next_slide_match else len(response_text) - start_pos)
                    slide_section = response_text[start_pos:end_pos]
                    
                    # Extract keywords
                    kw_match = re.search(r'"keywords"\s*:\s*\[(.*?)\]', slide_section, re.DOTALL)
                    if kw_match:
                        kw_str = kw_match.group(1)
                        keywords = [k.strip().strip('"') for k in re.findall(r'"([^"]+)"', kw_str)]
                    
                    # Extract summary
                    summary_match = re.search(r'"summary"\s*:\s*"([^"]+)"', slide_section, re.DOTALL)
                    if summary_match:
                        summary = summary_match.group(1)
                    
                    break
            
            slides.append({
                "slide_id": slide_id,
                "keywords": keywords[:10],
                "summary": summary[:300]
            })
        
        # Try to extract all_summary
        summary_match = re.search(r'"all_summary"\s*:\s*"([^"]+)"', response_text, re.DOTALL)
        if summary_match:
            all_summary = summary_match.group(1)
        
        # Count unique keywords
        all_keywords = set()
        for slide in slides:
            all_keywords.update(slide.get("keywords", []))
        
        return {
            "slide_count": len(slides),
            "keywords_count": len(all_keywords),
            "slides": slides,
            "all_summary": all_summary,
        }
    

