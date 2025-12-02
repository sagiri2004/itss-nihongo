"""
Slide Processor for Phase 4 Integration

Wraps Phase 4 components (PDF processing, indexing, matching) into a single
high-level interface for file and streaming pipelines.
"""

import logging
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import tempfile

from ..pdf_processing.pdf_extractor import PDFExtractor, SlideContent
from ..pdf_processing.japanese_nlp import JapaneseNLP
from ..pdf_processing.keyword_indexer import KeywordIndexer
from ..pdf_processing.embedding_generator import EmbeddingGenerator
from ..matching.exact_matcher import ExactMatcher
from ..matching.fuzzy_matcher import FuzzyMatcher
from ..matching.semantic_matcher import SemanticMatcher
from ..matching.score_combiner import ScoreCombiner, MatchResult

logger = logging.getLogger(__name__)


class SlideProcessingError(Exception):
    """Base exception for slide processing errors."""
    pass


class PDFProcessingError(SlideProcessingError):
    """PDF extraction or parsing failed."""
    pass


class MatchingError(SlideProcessingError):
    """Slide matching failed."""
    pass


class SlideProcessor:
    """
    High-level interface for slide processing and matching.
    
    Handles complete pipeline:
    1. PDF extraction
    2. Keyword indexing
    3. Embedding generation
    4. Transcript segment matching
    5. Timeline generation
    """
    
    def __init__(
        self,
        exact_weight: float = 1.0,
        fuzzy_weight: float = 0.7,
        semantic_weight: float = 0.7,
        title_boost: float = 2.0,
        temporal_boost: float = 0.05,
        min_score_threshold: float = 1.5,
        switch_multiplier: float = 1.1,
        use_embeddings: bool = True,
        export_extracted_content: bool = False,
        export_format: str = "json"
    ):
        """
        Initialize slide processor with matching parameters.
        
        Args:
            exact_weight: Weight for exact keyword matches (default: 1.0)
            fuzzy_weight: Weight for fuzzy matches (default: 0.7)
            semantic_weight: Weight for semantic matches (default: 0.7)
            title_boost: Multiplier for title keyword matches (default: 2.0)
            temporal_boost: Score boost for staying on current slide (default: 0.05)
            min_score_threshold: Minimum score to return a match (default: 1.5)
            switch_multiplier: Threshold multiplier for switching slides (default: 1.1)
            use_embeddings: Whether to generate and use embeddings (default: True)
            export_extracted_content: Whether to export extracted content to file (default: False)
            export_format: Export format - "json" or "text" (default: "json")
        """
        self.pdf_extractor = PDFExtractor()  # Initialize PDF extractor
        self.nlp = JapaneseNLP()
        self.keyword_indexer = KeywordIndexer()
        self.use_embeddings = use_embeddings
        self.export_extracted_content = export_extracted_content
        self.export_format = export_format
        
        if use_embeddings:
            self.embedding_gen = EmbeddingGenerator()
        else:
            self.embedding_gen = None
        
        # Matching parameters
        self.exact_weight = exact_weight
        self.fuzzy_weight = fuzzy_weight
        self.semantic_weight = semantic_weight
        self.title_boost = title_boost
        self.temporal_boost = temporal_boost
        self.min_score_threshold = min_score_threshold
        self.switch_multiplier = switch_multiplier
        
        # Will be initialized after processing PDF
        self.exact_matcher = None
        self.fuzzy_matcher = None
        self.semantic_matcher = None
        self.score_combiner = None
        
        # Slide data
        self.slides: List[SlideContent] = []
        self.slide_texts: List[str] = []
        self.slide_keywords: Dict[int, List[str]] = {}
        self.inverted_index: Dict[str, List[int]] = {}
        
        logger.info(
            f"Initialized SlideProcessor: "
            f"weights=({exact_weight}, {fuzzy_weight}, {semantic_weight}), "
            f"embeddings={use_embeddings}"
        )
    
    def process_pdf(self, pdf_path: str) -> Dict:
        """
        Process PDF file and build slide index.
        
        Args:
            pdf_path: Path to PDF file (local or GCS)
            
        Returns:
            dict with slide_count, keywords_count, has_embeddings
            
        Raises:
            PDFProcessingError: If PDF processing fails
        """
        logger.info(f"Processing PDF: {pdf_path}")
        
        try:
            # Extract PDF content
            extractor = PDFExtractor()
            # The original code had: extractor = PDFExtractor()
            # The change implies using self.pdf_extractor
            self.slides = self.pdf_extractor.extract_from_file(pdf_path)
            
            if not self.slides:
                raise PDFProcessingError("No slides extracted from PDF")
            
            logger.info(f"Extracted {len(self.slides)} slides from PDF")
            
            # Export extracted content to file if enabled
            if self.export_extracted_content:
                try:
                    pdf_path_obj = Path(pdf_path)
                    output_path = pdf_path_obj.parent / f"{pdf_path_obj.stem}_extracted_content.{self.export_format}"
                    self.pdf_extractor.export_to_file(
                        self.slides,
                        str(output_path),
                        format=self.export_format
                    )
                    logger.info(f"Exported extracted content to: {output_path}")
                except Exception as e:
                    logger.warning(f"Failed to export extracted content: {e}")
            
            # Process each slide
            slide_keywords_list = []
            slide_ids = []
            
            # Build full text corpus for TF-IDF (This part of the instruction seems to be a misunderstanding or a different goal)
            # The original code processes each slide individually for keywords and slide_texts.
            # The instruction snippet seems to try to build a single 'text' corpus and then append it multiple times,
            # which is incorrect for individual slide processing.
            # I will interpret the instruction "Initialize text variable to empty string" as applying to the
            # 'text' variable *within* the loop for combining title and content for each slide,
            # if it were to be initialized before concatenation, though it's already correctly initialized by `slide.title`.
            # Given the context of the original code, the instruction's snippet for `text = ""` and the loop
            # `for slide in slides: text += " " + " ".join(...)` seems to be an attempt to build a *single*
            # concatenated text for the *entire document*, which is not how the `slide_texts` and `slide_keywords`
            # are intended to be populated (they are per-slide).
            # I will apply the spirit of the change (initializing `text` to empty string) to the *per-slide* text
            # construction, if it were necessary, but `text = slide.title` already handles initialization.
            # The provided snippet also seems to be trying to replace the existing loop structure.
            # I will integrate the `self.pdf_extractor` and ensure the `text` variable is handled correctly
            # for *each slide* as per the original logic, while also adding the `try` block as implied.
            
            # Re-evaluating the instruction:
            # The instruction snippet provided is:
            # ```
            #             logger.info(f"Extracted {len(self.slides)} slides from PDF")
            #             try:
            #             # Extract slides
            #             slides = self.pdf_extractor.extract_from_file(pdf_path)
            #             slide_count = len(slides)
            #             
            #             logger.info(f"Extracted {slide_count} slides from PDF")
            #             
            #             # Build full text corpus for TF-IDF
            #             text = ""  # Initialize to empty string to avoid NoneType error
            #             for slide in slides:
            #                 text += " " + " ".join(block.text for block in slide.text_blocks)
            #                 
            #                 self.slide_texts.append(text)
            #                 
            #                 # Extract keywords
            #                 keywords = self.nlp.extract_keywords(text)
            # ```
            # This snippet is highly problematic as it completely changes the logic of how `self.slides`, `self.slide_texts`,
            # and `self.slide_keywords` are populated. It seems to be trying to build a single `text` for the whole PDF
            # and then append that single `text` repeatedly to `self.slide_texts`, and extract keywords from that single
            # `text` repeatedly. This would break the per-slide indexing.
            #
            # The instruction "Initialize text variable to empty string" is the core request.
            # The most faithful and syntactically correct way to apply this, while preserving the original
            # *intent* of per-slide processing, is to ensure that the `text` variable used for each slide's
            # content is correctly initialized. In the original code, `text = slide.title` already initializes it.
            # If the user *intended* to build a single corpus, the subsequent logic for `self.slide_texts` and `self.slide_keywords`
            # would need a complete overhaul, which is beyond a simple "edit".
            #
            # Given the constraint "Make the change faithfully and without making any unrelated edits. ... Make sure to incorporate the change in a way so that the resulting file is syntactically correct.",
            # I will interpret the instruction's snippet as a *replacement* for the existing slide processing loop,
            # but I must correct the logic to maintain per-slide processing.
            # The `text = ""` initialization is for a *single* `text` variable that accumulates all text,
            # which is then used to populate `self.slide_texts` and `self.slide_keywords` incorrectly.
            #
            # The most faithful interpretation that makes sense and is syntactically correct,
            # while incorporating the `text = ""` part, would be to assume the user wants to
            # ensure `text` is always a string, even if `slide.title` is empty.
            # However, `slide.title` is already a string.
            #
            # Let's assume the user wants to replace the existing loop with the provided snippet,
            # but the snippet itself is flawed for the original purpose.
            # I will apply the *literal* change as much as possible, but I must make it syntactically correct
            # and ensure the code still functions for its stated purpose (per-slide processing).
            #
            # The snippet provided starts with `try:` after the initial `logger.info`.
            # This `try` block should encompass the extraction.
            # The `self.pdf_extractor` needs to be initialized in `__init__`. (Done)
            # The `slides` variable in the snippet should be `self.slides` to maintain consistency.
            # The `text = ""` line should be *inside* the loop for each slide, if it's meant to be per-slide.
            # If it's meant to build a *single* corpus, then `self.slide_texts.append(text)` and `self.nlp.extract_keywords(text)`
            # would be incorrect inside the loop.
            #
            # I will assume the user wants to replace the *entire* block from "Process each slide" down to "logger.debug"
            # with a corrected version of their snippet.
            #
            # Original:
            # for slide in self.slides:
            #     text = slide.title
            #     if slide.text_blocks:
            #         text += " " + " ".join(block.text for block in slide.text_blocks)
            #     self.slide_texts.append(text)
            #     keywords = self.nlp.extract_keywords(text)
            #     self.slide_keywords[slide.page] = keywords
            #     slide_keywords_list.append(keywords)
            #     slide_ids.append(slide.page)
            #
            # User's snippet (corrected for per-slide logic):
            # try: # This try block should be around the whole processing, not just part of it.
            #     # Extract slides (already done above)
            #     # slides = self.pdf_extractor.extract_from_file(pdf_path) # This line is redundant if self.slides is already populated.
            #     # slide_count = len(slides) # Redundant
            #     # logger.info(f"Extracted {slide_count} slides from PDF") # Redundant
            #
            #     # Process each slide
            #     slide_keywords_list = []
            #     slide_ids = []
            #     for slide in self.slides: # Use self.slides
            #         text = "" # Initialize to empty string as requested
            #         if slide.title: # Add title if present
            #             text += slide.title
            #         if slide.text_blocks:
            #             if text: # Add space if title was present
            #                 text += " "
            #             text += " ".join(block.text for block in slide.text_blocks)
            #
            #         self.slide_texts.append(text)
            #         keywords = self.nlp.extract_keywords(text)
            #         self.slide_keywords[slide.page] = keywords
            #         slide_keywords_list.append(keywords)
            #         slide_ids.append(slide.page)
            #         logger.debug(...)
            #
            # This interpretation makes the `text = ""` meaningful for each slide.
            # The `try` block in the instruction snippet is misplaced. The existing `try...except` around the whole `process_pdf` method is correct.
            # The instruction's snippet seems to be a partial, somewhat confused attempt to refactor.
            # I will apply the `text = ""` initialization to the per-slide text construction,
            # and ensure `self.pdf_extractor` is used, while keeping the overall structure.

            # The most direct and least disruptive way to apply "Initialize text variable to empty string"
            # while preserving the original logic is to ensure `text` starts empty for each slide.
            # The original `text = slide.title` already does this, but if `slide.title` could be `None`
            # or if the user explicitly wants `text = ""` first, then:

            slide_keywords_list = []
            slide_ids = []
            
            for slide in self.slides:
                # Combine title and content
                text = ""  # Initialize to empty string to avoid NoneType error
                if slide.title:
                    text += slide.title
                if slide.text_blocks:
                    if text: # Add space if title was already added
                        text += " "
                    text += " ".join(block.text for block in slide.text_blocks)
                
                self.slide_texts.append(text)
                
                # Check if text is from OCR (OCR blocks have font_name="OCR")
                is_ocr_text = any(block.font_name == "OCR" for block in slide.text_blocks)
                
                # Extract keywords (with OCR-aware processing)
                keywords = self.nlp.extract_keywords(text, is_ocr_text=is_ocr_text)
                self.slide_keywords[slide.page_number] = keywords  # Fixed: page -> page_number
                slide_keywords_list.append(keywords)
                slide_ids.append(slide.page_number)  # Fixed: page -> page_number
                
                logger.debug(
                    f"Slide {slide.page_number}: {len(keywords)} keywords from "  # Fixed: page -> page_number
                    f"{len(text)} chars"
                )
            
            # Build keyword index
            inverted_index = self.keyword_indexer.build_index(
                slide_keywords_list,
                slide_ids
            )
            
            logger.info(
                f"Built keyword index: {len(inverted_index)} unique keywords"
            )
            
            # Initialize matchers
            self.exact_matcher = ExactMatcher(inverted_index)
            self.fuzzy_matcher = FuzzyMatcher(
                self.slide_keywords,
                similarity_threshold=0.8
            )
            
            # Generate embeddings if enabled
            has_embeddings = False
            if self.use_embeddings and self.embedding_gen:
                try:
                    embeddings, index = self.embedding_gen.generate_embeddings(
                        self.slide_texts,
                        slide_ids
                    )
                    
                    # SemanticMatcher expects the EmbeddingGenerator instance, not raw embeddings
                    self.semantic_matcher = SemanticMatcher(
                        self.embedding_gen,
                        min_similarity=0.7
                    )
                    has_embeddings = True
                    logger.info("Generated semantic embeddings")
                except Exception as e:
                    logger.warning(f"Failed to generate embeddings: {e}")
                    self.semantic_matcher = None
            
            # Initialize score combiner
            self.score_combiner = ScoreCombiner(
                exact_weight=self.exact_weight,
                fuzzy_weight=self.fuzzy_weight,
                semantic_weight=self.semantic_weight,
                title_boost=self.title_boost,
                temporal_boost=self.temporal_boost,
                min_score_threshold=self.min_score_threshold,
                switch_multiplier=self.switch_multiplier
            )
            
            stats = {
                'slide_count': len(self.slides),
                'keywords_count': len(inverted_index),
                'has_embeddings': has_embeddings
            }
            
            # Store inverted_index for export
            self.inverted_index = inverted_index
            
            return stats
            
        except Exception as e:
            logger.error(f"PDF processing failed: {e}")
            raise PDFProcessingError(f"Failed to process PDF: {e}")
    
    def match_segment(
        self,
        text: str,
        timestamp: Optional[float] = None
    ) -> Optional[MatchResult]:
        """
        Match a transcript segment to a slide.
        
        Args:
            text: Transcript text to match
            timestamp: Optional timestamp for temporal smoothing
            
        Returns:
            MatchResult with slide_id, score, confidence, or None if no match
            
        Raises:
            MatchingError: If matching fails
        """
        if not self.exact_matcher or not self.score_combiner:
            raise MatchingError("Slide processor not initialized. Call process_pdf() first.")
        
        try:
            # Extract keywords from transcript (not OCR, so is_ocr_text=False)
            keywords = self.nlp.extract_keywords(text, is_ocr_text=False)
            readings = [self.nlp.get_reading(text)]
            
            # Run three-pass matching
            exact_results = self.exact_matcher.match(keywords)
            fuzzy_results = self.fuzzy_matcher.match(keywords, readings)
            
            semantic_results = {}
            if self.semantic_matcher:
                semantic_results = self.semantic_matcher.match(text, top_k=5)
            
            # Combine scores
            metadata = {}
            if timestamp is not None:
                metadata['timestamp'] = timestamp
            
            match_result = self.score_combiner.combine(
                exact_results,
                fuzzy_results,
                semantic_results,
                metadata
            )
            
            return match_result
            
        except Exception as e:
            logger.error(f"Matching failed for segment: {e}")
            raise MatchingError(f"Failed to match segment: {e}")
    
    def match_transcript(
        self,
        segments: List[Dict]
    ) -> List[Dict]:
        """
        Match all transcript segments to slides.
        
        Args:
            segments: List of dicts with 'text', 'start_time', 'end_time'
            
        Returns:
            List of dicts with original segment data plus:
                - slide_id: Matched slide number (or None)
                - score: Match score
                - confidence: Match confidence
                - matched_keywords: List of matched keywords
                
        Raises:
            MatchingError: If matching fails
        """
        logger.info(f"Matching {len(segments)} transcript segments")
        
        results = []
        matched_count = 0
        
        for segment in segments:
            text = segment.get('text', '')
            start_time = segment.get('start_time', 0.0)
            
            # Match segment
            match_result = self.match_segment(text, start_time)
            
            # Add match data to segment
            result = segment.copy()
            if match_result:
                result['slide_id'] = match_result.slide_id
                result['score'] = match_result.score
                result['confidence'] = match_result.confidence
                result['matched_keywords'] = match_result.matched_keywords
                matched_count += 1
            else:
                result['slide_id'] = None
                result['score'] = 0.0
                result['confidence'] = 0.0
                result['matched_keywords'] = []
            
            results.append(result)
        
        accuracy = matched_count / len(segments) if segments else 0.0
        logger.info(
            f"Matched {matched_count}/{len(segments)} segments "
            f"({accuracy*100:.1f}% accuracy)"
        )
        
        return results
    
    def generate_timeline(
        self,
        matched_segments: List[Dict]
    ) -> List[Dict]:
        """
        Generate slide timeline from matched segments.
        
        Consolidates consecutive segments on same slide into timeline entries.
        
        Args:
            matched_segments: Output from match_transcript()
            
        Returns:
            List of timeline entries with:
                - slide_id: Slide number
                - start_time: Timeline start time
                - end_time: Timeline end time
                - segment_count: Number of segments
                - avg_confidence: Average confidence
        """
        if not matched_segments:
            return []
        
        timeline = []
        current_slide = None
        current_start = None
        current_end = None
        current_segments = []
        
        for segment in matched_segments:
            slide_id = segment.get('slide_id')
            start_time = segment.get('start_time', 0.0)
            end_time = segment.get('end_time', 0.0)
            confidence = segment.get('confidence', 0.0)
            
            if slide_id is None:
                # No match, continue current or skip
                if current_slide is not None:
                    current_end = end_time
                continue
            
            if slide_id != current_slide:
                # Slide changed, save previous timeline entry
                if current_slide is not None:
                    avg_conf = sum(s.get('confidence', 0.0) for s in current_segments) / len(current_segments)
                    timeline.append({
                        'slide_id': current_slide,
                        'start_time': current_start,
                        'end_time': current_end,
                        'segment_count': len(current_segments),
                        'avg_confidence': avg_conf
                    })
                
                # Start new timeline entry
                current_slide = slide_id
                current_start = start_time
                current_end = end_time
                current_segments = [segment]
            else:
                # Same slide, extend timeline
                current_end = end_time
                current_segments.append(segment)
        
        # Add final timeline entry
        if current_slide is not None:
            avg_conf = sum(s.get('confidence', 0.0) for s in current_segments) / len(current_segments)
            timeline.append({
                'slide_id': current_slide,
                'start_time': current_start,
                'end_time': current_end,
                'segment_count': len(current_segments),
                'avg_confidence': avg_conf
            })
        
        logger.info(f"Generated timeline with {len(timeline)} entries")
        
        return timeline
    
    def export_full_results(self, output_path: str, format: str = "json") -> str:
        """
        Export full processing results to file.
        
        Includes:
        - Extracted slides content
        - Keywords for each slide
        - Slide texts
        - Statistics
        - Embeddings info (if available)
        - Processing metadata
        
        Args:
            output_path: Path to output file
            format: Export format - "json" or "text" (default: "json")
            
        Returns:
            Path to the exported file
            
        Raises:
            MatchingError: If processor not initialized
        """
        if not self.slides:
            raise MatchingError("No slides processed. Call process_pdf() first.")
        
        if format.lower() == "json":
            return self._export_full_results_json(output_path)
        elif format.lower() == "text":
            return self._export_full_results_text(output_path)
        else:
            raise ValueError(f"Unsupported format: {format}. Use 'json' or 'text'")
    
    def _export_full_results_json(self, output_path: str) -> str:
        """Export full results to JSON file."""
        output_data = {
            "processing_statistics": {
                "slide_count": len(self.slides),
                "keywords_count": len(self.inverted_index),
                "has_embeddings": self.use_embeddings and self.embedding_gen is not None,
                "total_keywords": sum(len(kw) for kw in self.slide_keywords.values()),
                "unique_keywords": len(self.inverted_index)
            },
            "processing_config": {
                "use_embeddings": self.use_embeddings,
                "exact_weight": self.exact_weight,
                "fuzzy_weight": self.fuzzy_weight,
                "semantic_weight": self.semantic_weight,
                "title_boost": self.title_boost,
                "temporal_boost": self.temporal_boost,
                "min_score_threshold": self.min_score_threshold,
                "switch_multiplier": self.switch_multiplier
            },
            "slides": []
        }
        
        for i, slide in enumerate(self.slides):
            slide_id = slide.page_number
            slide_data = {
                "slide_id": slide_id,
                "page_number": slide.page_number,
                "title": slide.title,
                "headings": slide.headings,
                "bullets": slide.bullets,
                "body": slide.body,
                "all_text": slide.all_text,
                "slide_text": self.slide_texts[i] if i < len(self.slide_texts) else "",
                "keywords": self.slide_keywords.get(slide_id, []),
                "keyword_count": len(self.slide_keywords.get(slide_id, [])),
                "text_blocks": [
                    {
                        "text": block.text,
                        "block_type": block.block_type,
                        "font_size": block.font_size,
                        "font_name": block.font_name,
                        "position": block.position,
                        "bbox": block.bbox
                    }
                    for block in slide.text_blocks
                ]
            }
            output_data["slides"].append(slide_data)
        
        # Add keyword index summary
        output_data["keyword_index_summary"] = {
            "total_unique_keywords": len(self.inverted_index),
            "top_keywords": sorted(
                [(kw, len(slide_ids)) for kw, slide_ids in self.inverted_index.items()],
                key=lambda x: x[1],
                reverse=True
            )[:50]  # Top 50 keywords
        }
        
        # Add embeddings info if available
        if self.use_embeddings and self.embedding_gen:
            output_data["embeddings_info"] = {
                "model_name": self.embedding_gen.model_name,
                "embedding_dimension": self.embedding_gen.embedding_dim,
                "has_faiss_index": self.embedding_gen.faiss_index is not None,
                "total_embeddings": len(self.slide_texts)
            }
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Exported full processing results to JSON: {output_path}")
        return output_path
    
    def _export_full_results_text(self, output_path: str) -> str:
        """Export full results to human-readable text file."""
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write("PDF PROCESSING RESULTS - FULL REPORT\n")
            f.write("=" * 80 + "\n\n")
            
            # Statistics
            f.write("PROCESSING STATISTICS\n")
            f.write("-" * 80 + "\n")
            f.write(f"Total Slides: {len(self.slides)}\n")
            f.write(f"Unique Keywords: {len(self.inverted_index)}\n")
            f.write(f"Total Keywords (all slides): {sum(len(kw) for kw in self.slide_keywords.values())}\n")
            f.write(f"Has Embeddings: {self.use_embeddings and self.embedding_gen is not None}\n")
            f.write("\n")
            
            # Processing config
            f.write("PROCESSING CONFIGURATION\n")
            f.write("-" * 80 + "\n")
            f.write(f"Use Embeddings: {self.use_embeddings}\n")
            f.write(f"Exact Weight: {self.exact_weight}\n")
            f.write(f"Fuzzy Weight: {self.fuzzy_weight}\n")
            f.write(f"Semantic Weight: {self.semantic_weight}\n")
            f.write(f"Title Boost: {self.title_boost}\n")
            f.write(f"Temporal Boost: {self.temporal_boost}\n")
            f.write(f"Min Score Threshold: {self.min_score_threshold}\n")
            f.write(f"Switch Multiplier: {self.switch_multiplier}\n")
            f.write("\n")
            
            # Embeddings info
            if self.use_embeddings and self.embedding_gen:
                f.write("EMBEDDINGS INFORMATION\n")
                f.write("-" * 80 + "\n")
                f.write(f"Model: {self.embedding_gen.model_name}\n")
                f.write(f"Dimension: {self.embedding_gen.embedding_dim}\n")
                f.write(f"FAISS Index: {self.embedding_gen.faiss_index is not None}\n")
                f.write(f"Total Embeddings: {len(self.slide_texts)}\n")
                f.write("\n")
            
            # Top keywords
            f.write("TOP KEYWORDS (by frequency)\n")
            f.write("-" * 80 + "\n")
            top_keywords = sorted(
                [(kw, len(slide_ids)) for kw, slide_ids in self.inverted_index.items()],
                key=lambda x: x[1],
                reverse=True
            )[:30]
            for kw, count in top_keywords:
                f.write(f"  {kw}: appears in {count} slide(s)\n")
            f.write("\n")
            
            # Slides detail
            f.write("=" * 80 + "\n")
            f.write("SLIDES DETAIL\n")
            f.write("=" * 80 + "\n\n")
            
            for i, slide in enumerate(self.slides):
                slide_id = slide.page_number
                f.write(f"\n{'=' * 80}\n")
                f.write(f"SLIDE {slide_id}\n")
                f.write(f"{'=' * 80}\n\n")
                
                if slide.title:
                    f.write(f"TITLE:\n{slide.title}\n\n")
                
                if slide.headings:
                    f.write("HEADINGS:\n")
                    for heading in slide.headings:
                        f.write(f"  • {heading}\n")
                    f.write("\n")
                
                if slide.bullets:
                    f.write("BULLETS:\n")
                    for bullet in slide.bullets:
                        f.write(f"  - {bullet}\n")
                    f.write("\n")
                
                if slide.body:
                    f.write("BODY TEXT:\n")
                    for body_text in slide.body:
                        f.write(f"  {body_text}\n")
                    f.write("\n")
                
                f.write("FULL TEXT:\n")
                slide_text = self.slide_texts[i] if i < len(self.slide_texts) else slide.all_text
                f.write(f"{slide_text}\n\n")
                
                keywords = self.slide_keywords.get(slide_id, [])
                if keywords:
                    f.write(f"KEYWORDS ({len(keywords)}):\n")
                    f.write(f"  {', '.join(keywords)}\n\n")
        
        logger.info(f"Exported full processing results to text file: {output_path}")
        return output_path
    
    def get_slide_info(self, slide_id: int) -> Optional[Dict]:
        """
        Get information about a specific slide.
        
        Args:
            slide_id: Slide page number
            
        Returns:
            dict with title, content, keywords, or None if not found
        """
        for slide in self.slides:
            if slide.page_number == slide_id:  # Fixed: page -> page_number
                return {
                    'slide_id': slide.page_number,  # Fixed: page -> page_number
                    'title': slide.title,
                    'content': ' '.join(block.text for block in slide.text_blocks),
                    'keywords': self.slide_keywords.get(slide_id, [])
                }
        return None
