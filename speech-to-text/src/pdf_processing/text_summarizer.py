"""
Text Summarizer Module (NLP Edition with spaCy)

Uses spaCy/GiNZA for intelligent text reconstruction, sentence segmentation,
and semantic summarization of slide content.
"""

import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class TextSummarizer:
    """
    Text summarizer using spaCy/GiNZA for Japanese text processing.
    
    Provides:
    - Intelligent line joining (reconstruct broken lines)
    - Grammar-aware sentence segmentation
    - Semantic slide summarization
    """
    
    def __init__(self):
        """Initialize NLP model (prefer GiNZA Electra for IT Japanese)."""
        self.nlp = None
        
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
        Generate semantic summary with full context.
        
        Combines title, headings, bullets, and body into a coherent summary
        using NLP for proper sentence reconstruction.
        
        Args:
            title: Slide title (optional)
            headings: List of headings
            bullets: List of bullet points
            body: List of body text blocks
            all_text_raw: Raw concatenated text
            
        Returns:
            Semantic summary with proper grammar and structure
        """
        # If slide has very little structure, use all raw text processed by NLP
        if not title and not headings and not bullets and not body:
            return self.reconstruct_text(all_text_raw)
        
        parts = []
        
        # Always include title first to provide context
        if title:
            reconstructed_title = self.reconstruct_text(title)
            if reconstructed_title:
                parts.append(f"【{reconstructed_title}】")
        
        # Combine heading and body into complete sentences
        content_source = headings + bullets + body
        if content_source:
            # Join all content into one block, then process with NLP
            # to maintain narrative flow
            raw_content = "".join(content_source)
            processed_content = self.reconstruct_text(raw_content)
            if processed_content:
                parts.append(processed_content)
        
        # If no parts were generated, fallback to processed raw text
        if not parts:
            return self.reconstruct_text(all_text_raw)
        
        return "。".join(parts)

    def generate_global_summary(self, slides_data: List[Dict]) -> str:
        """
        Generate summary for entire document.
        
        Args:
            slides_data: List of slide dictionaries with 'page_number' and 'summary'
            
        Returns:
            Complete document summary with all slide summaries
        """
        doc_content = ["=== DOCUMENT CONTENT START ==="]
        
        for slide in slides_data:
            page = slide.get('page_number', '?')
            # Get summary that was processed at slide level
            content = slide.get('summary', '').strip()
            if content:
                doc_content.append(f"[Page {page}]\n{content}")
        return "。".join(doc_content)

