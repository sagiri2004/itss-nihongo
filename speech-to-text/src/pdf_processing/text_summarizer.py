"""
Text Summarizer Module (NLP Edition with spaCy)

Uses spaCy/GiNZA for intelligent text reconstruction, sentence segmentation,
and semantic summarization of slide content.

Supports LLM-based summarization (OpenAI, Claude, Gemini) with fallback
to extractive methods.
"""

import logging
import os
import re
from pathlib import Path
from typing import List, Dict, Optional

# #region agent log
# Ensure .env is loaded before any other imports that might need it
from dotenv import load_dotenv

# Load .env from speech-to-text directory
BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENV_PATH = BASE_DIR / ".env"
if ENV_PATH.exists():
    load_dotenv(ENV_PATH, override=True)
else:
    # Fallback to current directory
    load_dotenv(override=True)

# Debug log
DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
try:
    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
        import json
        import time
        log_entry = {
            "timestamp": int(time.time() * 1000),
            "location": "text_summarizer.py:15",
            "message": "text_summarizer module import - loading .env",
            "data": {
                "ENV_PATH": str(ENV_PATH),
                "ENV_PATH_exists": ENV_PATH.exists(),
                "GOOGLE_API_KEY_set": bool(os.getenv("GOOGLE_API_KEY")),
                "GOOGLE_API_KEY_length": len(os.getenv("GOOGLE_API_KEY", "")),
            },
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "D"
        }
        f.write(json.dumps(log_entry) + "\n")
except Exception:
    pass
# #endregion

logger = logging.getLogger(__name__)


class TextSummarizer:
    """
    Text summarizer using spaCy/GiNZA for Japanese text processing.
    
    Provides:
    - Intelligent line joining (reconstruct broken lines)
    - Grammar-aware sentence segmentation
    - Semantic slide summarization
    """
    
    def __init__(self, use_llm: Optional[bool] = None):
        """
        Initialize NLP model (prefer GiNZA Electra for IT Japanese).
        
        Args:
            use_llm: Whether to use LLM for summarization 
                    - None = auto-detect from env (USE_LLM_SUMMARIZER)
                    - True = force use LLM (will fail if not available)
                    - False = force use extractive method
        """
        self.nlp = None
        self.llm_summarizer = None
        
        # Try to initialize LLM summarizer if available
        if use_llm is None:
            use_llm = os.getenv("USE_LLM_SUMMARIZER", "true").lower() == "true"  # Default to True
        
        if use_llm:
            try:
                # #region agent log
                DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
                try:
                    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
                        import json
                        import time
                        log_entry = {
                            "timestamp": int(time.time() * 1000),
                            "location": "text_summarizer.py:46",
                            "message": "TextSummarizer.__init__ - before LLMSummarizer init",
                            "data": {
                                "use_llm": use_llm,
                                "GOOGLE_API_KEY_set": bool(os.getenv("GOOGLE_API_KEY")),
                                "GOOGLE_API_KEY_length": len(os.getenv("GOOGLE_API_KEY", "")),
                                "USE_LLM_SUMMARIZER": os.getenv("USE_LLM_SUMMARIZER"),
                                "LLM_SUMMARIZER_PROVIDER": os.getenv("LLM_SUMMARIZER_PROVIDER"),
                            },
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "E"
                        }
                        f.write(json.dumps(log_entry) + "\n")
                except Exception:
                    pass
                # #endregion
                
                from .llm_summarizer import LLMSummarizer
                self.llm_summarizer = LLMSummarizer()
                
                # #region agent log
                try:
                    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
                        log_entry = {
                            "timestamp": int(time.time() * 1000),
                            "location": "text_summarizer.py:70",
                            "message": "TextSummarizer.__init__ - after LLMSummarizer init",
                            "data": {
                                "llm_summarizer_client_set": bool(self.llm_summarizer.client),
                                "llm_summarizer_provider": self.llm_summarizer.provider,
                            },
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "E"
                        }
                        f.write(json.dumps(log_entry) + "\n")
                except Exception:
                    pass
                # #endregion
                
                if self.llm_summarizer.client:
                    logger.info(f"LLM summarizer available: {self.llm_summarizer.provider}")
                else:
                    if use_llm is True:  # Force mode
                        logger.warning("LLM summarizer requested but not available. Check API keys.")
                    else:
                        logger.info("LLM summarizer not available, will use extractive method")
            except Exception as e:
                if use_llm is True:  # Force mode
                    logger.error(f"Failed to initialize LLM summarizer (force mode): {e}")
                    raise
                else:
                    logger.warning(f"Failed to initialize LLM summarizer: {e}, using extractive method")
        
        try:
            import ja_ginza_electra
            self.nlp = __import__('spacy').load("ja_ginza_electra")
            logger.info("Loaded NLP model: ja_ginza_electra")
        except ImportError:
            try:
                import spacy
                self.nlp = spacy.load("ja_ginza")
                logger.info("Loaded NLP model: ja_ginza (Standard)")
            except Exception as e:
                error_msg = (
                    f"GiNZA NLP model is required but not found. "
                    f"Please install 'ginza' and 'ja-ginza' packages: "
                    f"pip install ginza ja-ginza. Error: {e}"
                )
                logger.error(error_msg)
                raise RuntimeError(error_msg) from e
        except Exception as e:
            error_msg = (
                f"Failed to load NLP model. "
                f"Please ensure 'ginza' and 'ja-ginza' are properly installed. Error: {e}"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
        
        if self.nlp is None:
            error_msg = (
                "NLP model failed to initialize. "
                "Please install 'ginza' and 'ja-ginza' packages: pip install ginza ja-ginza"
            )
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def reconstruct_text(self, text: str) -> str:
        """
        Use NLP to join broken lines and segment sentences accurately.
        
        Args:
            text: Raw text with potential line breaks
            
        Returns:
            Reconstructed text with proper sentence segmentation
            
        Raises:
            RuntimeError: If NLP model is not available
        """
        if not text:
            return ""
        
        if not self.nlp:
            raise RuntimeError("NLP model is not initialized. Cannot process text.")
        
        # 1. Pre-cleaning: Remove line breaks to create continuous text
        # Japanese doesn't need spaces when joining lines, Latin text does
        # For mixed text, remove \n and let spaCy analyze
        clean_text = text.replace('\n', '').replace('\r', '').strip()
        
        if not clean_text:
            return ""
        
        # 2. Parse with spaCy (Dependency Parsing)
        try:
            doc = self.nlp(clean_text)
            # 3. Segment sentences based on grammar
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            # Join sentences with newlines for readability
            return "。".join(sentences)
        except Exception as e:
            error_msg = f"Error in NLP processing: {e}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e

    def generate_slide_summary(
        self,
        title: Optional[str],
        headings: List[str],
        bullets: List[str],
        body: List[str],
        all_text_raw: str
    ) -> str:
        """
        Generate concise semantic summary.
        
        Creates a short, coherent summary (1-2 sentences) that describes:
        - What the slide is about (main topic)
        - Key points covered
        
        Args:
            title: Slide title (optional)
            headings: List of headings
            bullets: List of bullet points
            body: List of body text blocks
            all_text_raw: Raw concatenated text
            
        Returns:
            Concise summary (1-2 sentences) describing the slide's main content
        """
        # If slide has very little structure, use all raw text processed by NLP
        if not title and not headings and not bullets and not body:
            text = self.reconstruct_text(all_text_raw)
            return self._create_concise_summary(text)
        
        parts = []
        
        # Always include title first to provide context
        if title:
            reconstructed_title = self.reconstruct_text(title)
            if reconstructed_title:
                parts.append(reconstructed_title)
        
        # Combine heading and body into complete sentences
        content_source = headings + bullets + body
        if content_source:
            # Join all content into one block, then process with NLP
            raw_content = "".join(content_source)
            processed_content = self.reconstruct_text(raw_content)
            if processed_content:
                parts.append(processed_content)
        
        # If no parts were generated, fallback to processed raw text
        if not parts:
            text = self.reconstruct_text(all_text_raw)
            return self._create_concise_summary(text)
        
        # Combine parts and use NLP to create a concise summary
        combined = "。".join(parts)
        return self._create_concise_summary(combined)
    
    def _create_concise_summary(self, text: str) -> str:
        """
        Create a concise summary (1-2 sentences) from text.
        
        Args:
            text: Input text to summarize
            
        Returns:
            Concise summary (1-2 sentences)
        """
        if not text or not text.strip():
            return ""
        
        try:
            doc = self.nlp(text)
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            
            if not sentences:
                return text[:200] + "..." if len(text) > 200 else text
            
            # Select most informative sentences (prioritize longer, more complete sentences)
            # Limit to 1-2 sentences for concise summary
            sorted_sentences = sorted(sentences, key=lambda s: len(s), reverse=True)
            
            # Take top 1-2 sentences, but prefer sentences that are not too short
            selected = []
            for sent in sorted_sentences:
                if len(sent) >= 10:  # At least 10 characters
                    selected.append(sent)
                    if len(selected) >= 2:
                        break
            
            # If we don't have enough good sentences, take first 1-2 sentences by position
            if len(selected) < 2 and len(sentences) > len(selected):
                # Add first sentence if not already included
                if sentences[0] not in selected:
                    selected.insert(0, sentences[0])
                # Add second sentence if available and not too short
                if len(sentences) > 1 and len(selected) < 2:
                    if sentences[1] not in selected and len(sentences[1]) >= 10:
                        selected.append(sentences[1])
            
            # If still no good sentences, use first sentence
            if not selected:
                selected = [sentences[0]] if sentences else []
            
            # Join with proper punctuation
            summary = "。".join(selected[:2])  # Max 2 sentences
            
            # Ensure summary is not too long (max 300 characters)
            if len(summary) > 300:
                summary = summary[:297] + "..."
            
            return summary
                
        except Exception as e:
            logger.warning(f"Error creating concise summary: {e}, using truncated text")
            # Fallback: return first 200 characters
            return text[:200] + "..." if len(text) > 200 else text

    def generate_global_summary(self, slides_data: List[Dict]) -> str:
        """
        Generate concise semantic summary for entire document.
        
        Creates a short, coherent overview (under 5 sentences) that describes:
        - Main topic/theme of the presentation
        - Key content areas covered
        - Overall purpose and structure
        
        Uses LLM if available, otherwise falls back to extractive method.
        
        Args:
            slides_data: List of slide dictionaries with 'page_number' and 'summary'
            
        Returns:
            Concise document summary (under 5 sentences) describing the main topic and key points
        """
        if not slides_data:
            return ""
        
        # Collect all summaries
        summaries = []
        for slide in slides_data:
            summary = slide.get('summary', '').strip()
            if summary:
                summaries.append(summary)
        
        if not summaries:
            return ""
        
        # Try LLM summarization first if available
        if self.llm_summarizer and self.llm_summarizer.client:
            try:
                llm_summary = self.llm_summarizer.summarize_global(slides_data, max_sentences=5)
                if llm_summary:
                    logger.info("Generated summary using LLM")
                    return llm_summary
            except Exception as e:
                logger.warning(f"LLM summarization failed: {e}, falling back to extractive method")
        
        # Fallback to extractive method
        # Combine all summaries into one text block
        combined_text = "。".join(summaries)
        
        # Use NLP to create a concise overview (under 5 sentences)
        try:
            doc = self.nlp(combined_text)
            
            # Extract all sentences
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
            
            if not sentences:
                # Fallback: return first 300 characters
                return combined_text[:300] + "..." if len(combined_text) > 300 else combined_text
            
            # Strategy: Select most informative sentences
            # 1. Prioritize longer sentences (more informative)
            # 2. Prioritize sentences from early slides (usually contain main topic)
            # 3. Limit to 3-5 sentences maximum
            
            # Score sentences by length and position
            scored_sentences = []
            for idx, sent in enumerate(sentences):
                # Score = length * (early position bonus)
                # Early sentences (first 30%) get bonus
                position_bonus = 1.5 if idx < len(sentences) * 0.3 else 1.0
                score = len(sent) * position_bonus
                scored_sentences.append((score, idx, sent))
            
            # Sort by score (descending)
            scored_sentences.sort(key=lambda x: x[0], reverse=True)
            
            # Select top 3-5 sentences, but prioritize early ones for topic introduction
            selected = []
            selected_indices = set()
            
            # First: Always include first sentence if it's informative (usually main topic)
            if len(sentences) > 0 and len(sentences[0]) >= 20:
                selected.append((0, sentences[0]))
                selected_indices.add(0)
            
            # Then: Add top scored sentences (up to 4 more, total max 5)
            for score, idx, sent in scored_sentences:
                if idx not in selected_indices and len(sent) >= 15:
                    selected.append((idx, sent))
                    selected_indices.add(idx)
                    if len(selected) >= 5:  # Max 5 sentences
                        break
            
            # Sort selected sentences by original position to maintain flow
            selected.sort(key=lambda x: x[0])
            final_sentences = [sent for _, sent in selected]
            
            # Join with proper punctuation
            overview = "。".join(final_sentences)
            
            # Ensure summary is concise (max 500 characters)
            if len(overview) > 500:
                # Truncate but keep complete sentences
                truncated = overview[:497]
                last_period = truncated.rfind('。')
                if last_period > 300:  # Only truncate if we have at least 300 chars
                    overview = truncated[:last_period + 1]
                else:
                    overview = truncated + "..."
            
            return overview
                
        except Exception as e:
            logger.warning(f"Error generating semantic global summary: {e}, using fallback")
            # Fallback: return first few summaries combined (max 3)
            if len(summaries) <= 3:
                return "。".join(summaries)
            else:
                # Take first, middle, and last summary
                first = summaries[0]
                middle = summaries[len(summaries) // 2]
                last = summaries[-1]
                return f"{first}。{middle}。{last}"

