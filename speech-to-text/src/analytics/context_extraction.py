"""
Context Extraction System (Week 9-10)

Automatically identifies important teaching moments from recorded lectures.
Core AI components without UI dependencies.
"""

import logging
import re
import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


@dataclass
class TranscriptSegment:
    """Represents a transcript segment with metadata."""
    text: str
    start_time: float
    end_time: float
    confidence: float
    word_count: int
    slide_id: Optional[int] = None
    matched_keywords: List[str] = field(default_factory=list)
    timestamp: Optional[float] = None  # Event timestamp if available


@dataclass
class ContextObject:
    """Represents an extracted context."""
    context_id: str
    start_time: float
    end_time: float
    slide_page: Optional[int]
    text: str
    context_type: str  # 'explanation', 'emphasis', 'example', 'summary', 'question'
    importance_score: float  # 0-100
    keywords_matched: List[str] = field(default_factory=list)
    teacher_notes: str = ""  # Initially empty, can be added later
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SegmentImportanceScorer:
    """
    Evaluates each transcript segment using multiple heuristics.
    
    Factors:
    - Length: Longer segments (>30 words) = higher score
    - Keyword density: High keyword matches (>3) = higher score
    - Slide transitions: Segments near slide changes (within 5s) = higher score
    - Confidence: High confidence (>90%) = higher score
    """
    
    def __init__(
        self,
        min_length_words: int = 30,
        min_keyword_matches: int = 3,
        transition_window_seconds: float = 5.0,
        high_confidence_threshold: float = 0.9,
    ):
        """
        Initialize importance scorer.
        
        Args:
            min_length_words: Minimum words for length boost
            min_keyword_matches: Minimum keyword matches for density boost
            transition_window_seconds: Time window around slide transitions
            high_confidence_threshold: Confidence threshold for reliability boost
        """
        self.min_length_words = min_length_words
        self.min_keyword_matches = min_keyword_matches
        self.transition_window_seconds = transition_window_seconds
        self.high_confidence_threshold = high_confidence_threshold
    
    def score_segment(
        self,
        segment: TranscriptSegment,
        slide_transitions: List[float],
    ) -> float:
        """
        Calculate importance score for a segment (0-100).
        
        Args:
            segment: Transcript segment to score
            slide_transitions: List of timestamps when slides changed
            
        Returns:
            Importance score from 0 to 100
        """
        score = 0.0
        
        # Factor 1: Length (0-30 points)
        if segment.word_count >= self.min_length_words:
            length_score = min(30.0, (segment.word_count / self.min_length_words) * 15.0)
            score += length_score
        
        # Factor 2: Keyword density (0-30 points)
        keyword_count = len(segment.matched_keywords)
        if keyword_count >= self.min_keyword_matches:
            density_score = min(30.0, (keyword_count / self.min_keyword_matches) * 15.0)
            score += density_score
        
        # Factor 3: Slide transition proximity (0-20 points)
        segment_mid_time = (segment.start_time + segment.end_time) / 2.0
        for transition_time in slide_transitions:
            time_diff = abs(segment_mid_time - transition_time)
            if time_diff <= self.transition_window_seconds:
                # Closer to transition = higher score
                proximity_score = 20.0 * (1.0 - time_diff / self.transition_window_seconds)
                score += proximity_score
                break  # Only count closest transition
        
        # Factor 4: Confidence (0-20 points)
        if segment.confidence >= self.high_confidence_threshold:
            confidence_score = 20.0 * segment.confidence
            score += confidence_score
        
        # Normalize to 0-100
        return min(100.0, score)


class ContextTypeClassifier:
    """
    Categorizes high-scoring segments into meaningful types using Japanese phrase patterns.
    
    Types:
    - Explanation: "つまり", "例えば", "なぜなら"
    - Emphasis: "重要", "注意", "覚えて"
    - Example: "例として", "実際に"
    - Summary: "まとめると", "結論", "以上"
    - Question: "どう", "なぜ", "何"
    """
    
    def __init__(self):
        """Initialize classifier with Japanese teaching phrase patterns."""
        # Explanation patterns
        self.explanation_patterns = [
            r'つまり', r'すなわち', r'言い換えれば',
            r'例えば', r'例として', r'例を挙げると',
            r'なぜなら', r'というのは', r'理由は',
            r'つまり', r'要するに', r'換言すれば',
        ]
        
        # Emphasis patterns
        self.emphasis_patterns = [
            r'重要', r'重要な', r'重要性',
            r'注意', r'注意して', r'注意すべき',
            r'覚えて', r'覚えておいて', r'記憶',
            r'必ず', r'絶対', r'確実に',
            r'特に', r'とりわけ', r'殊に',
        ]
        
        # Example patterns
        self.example_patterns = [
            r'例として', r'例えば', r'例を挙げると',
            r'実際に', r'実際の', r'実例',
            r'ケース', r'場合', r'事例',
            r'具体的に', r'具体例', r'具体',
        ]
        
        # Summary patterns
        self.summary_patterns = [
            r'まとめると', r'まとめて', r'まとめ',
            r'結論', r'結論として', r'結論的に',
            r'以上', r'以上で', r'以上のように',
            r'要約', r'要約すると', r'要するに',
        ]
        
        # Question patterns
        self.question_patterns = [
            r'どう', r'どのように', r'どうして',
            r'なぜ', r'なんで', r'どういう',
            r'何', r'どんな', r'どの',
            r'？', r'\?',  # Question marks
        ]
        
        # Compile regex patterns
        self.explanation_regex = [re.compile(p, re.IGNORECASE) for p in self.explanation_patterns]
        self.emphasis_regex = [re.compile(p, re.IGNORECASE) for p in self.emphasis_patterns]
        self.example_regex = [re.compile(p, re.IGNORECASE) for p in self.example_patterns]
        self.summary_regex = [re.compile(p, re.IGNORECASE) for p in self.summary_patterns]
        self.question_regex = [re.compile(p, re.IGNORECASE) for p in self.question_patterns]
    
    def classify(self, segment: TranscriptSegment) -> str:
        """
        Classify segment into context type.
        
        Args:
            segment: Transcript segment to classify
            
        Returns:
            Context type: 'explanation', 'emphasis', 'example', 'summary', 'question', or 'mixed'
        """
        text = segment.text
        scores = {
            'explanation': 0,
            'emphasis': 0,
            'example': 0,
            'summary': 0,
            'question': 0,
        }
        
        # Count pattern matches
        for pattern in self.explanation_regex:
            if pattern.search(text):
                scores['explanation'] += 1
        
        for pattern in self.emphasis_regex:
            if pattern.search(text):
                scores['emphasis'] += 1
        
        for pattern in self.example_regex:
            if pattern.search(text):
                scores['example'] += 1
        
        for pattern in self.summary_regex:
            if pattern.search(text):
                scores['summary'] += 1
        
        for pattern in self.question_regex:
            if pattern.search(text):
                scores['question'] += 1
        
        # Find highest score
        max_score = max(scores.values())
        if max_score == 0:
            return 'explanation'  # Default to explanation if no patterns match
        
        # Check for ties (within 20% = mixed)
        winners = [k for k, v in scores.items() if v == max_score]
        if len(winners) > 1:
            # Check if scores are close (within 20%)
            second_max = sorted(scores.values(), reverse=True)[1] if len(scores) > 1 else 0
            if second_max > 0 and (max_score - second_max) / max_score < 0.2:
                return 'mixed'
        
        return winners[0]


class ContextAggregator:
    """
    Groups related segments that discuss the same topic.
    
    Uses slide boundaries as natural grouping points and merges consecutive
    segments of the same type that share significant keyword overlap (>50%).
    """
    
    def __init__(self, keyword_overlap_threshold: float = 0.5):
        """
        Initialize aggregator.
        
        Args:
            keyword_overlap_threshold: Minimum keyword overlap (0-1) to merge segments
        """
        self.keyword_overlap_threshold = keyword_overlap_threshold
    
    def aggregate(
        self,
        scored_segments: List[Tuple[TranscriptSegment, float, str]],
        slide_transitions: List[Tuple[float, int]],  # (timestamp, slide_id)
    ) -> List[ContextObject]:
        """
        Aggregate segments into context objects.
        
        Args:
            scored_segments: List of (segment, importance_score, context_type)
            slide_transitions: List of (timestamp, slide_id) when slides changed
            
        Returns:
            List of ContextObject instances
        """
        if not scored_segments:
            return []
        
        contexts = []
        current_group: List[Tuple[TranscriptSegment, float, str]] = []
        current_type: Optional[str] = None
        current_slide: Optional[int] = None
        
        # Create slide transition map
        transition_map = {ts: slide_id for ts, slide_id in slide_transitions}
        
        for segment, importance_score, context_type in scored_segments:
            # Determine slide for this segment
            segment_slide = segment.slide_id
            if segment_slide is None:
                # Try to infer from transitions
                segment_mid = (segment.start_time + segment.end_time) / 2.0
                for ts, slide_id in sorted(slide_transitions):
                    if segment_mid >= ts:
                        segment_slide = slide_id
                    else:
                        break
            
            # Check if we should start a new group
            should_start_new = False
            
            if not current_group:
                should_start_new = True
            elif current_type != context_type:
                # Type changed - finalize current group
                should_start_new = True
            elif current_slide != segment_slide:
                # Slide changed - finalize current group
                should_start_new = True
            elif current_group:
                # Check keyword overlap with last segment in group
                last_segment = current_group[-1][0]
                overlap = self._calculate_keyword_overlap(
                    last_segment.matched_keywords,
                    segment.matched_keywords
                )
                if overlap < self.keyword_overlap_threshold:
                    # Low overlap - finalize current group
                    should_start_new = True
            
            if should_start_new:
                # Finalize current group
                if current_group:
                    context = self._create_context_from_group(
                        current_group, current_slide, transition_map
                    )
                    contexts.append(context)
                
                # Start new group
                current_group = [(segment, importance_score, context_type)]
                current_type = context_type
                current_slide = segment_slide
            else:
                # Add to current group
                current_group.append((segment, importance_score, context_type))
        
        # Finalize last group
        if current_group:
            context = self._create_context_from_group(
                current_group, current_slide, transition_map
            )
            contexts.append(context)
        
        return contexts
    
    def _calculate_keyword_overlap(
        self,
        keywords1: List[str],
        keywords2: List[str]
    ) -> float:
        """Calculate keyword overlap ratio (0-1)."""
        if not keywords1 or not keywords2:
            return 0.0
        
        set1 = set(keywords1)
        set2 = set(keywords2)
        intersection = set1 & set2
        union = set1 | set2
        
        if not union:
            return 0.0
        
        return len(intersection) / len(union)
    
    def _create_context_from_group(
        self,
        group: List[Tuple[TranscriptSegment, float, str]],
        slide_id: Optional[int],
        transition_map: Dict[float, int],
    ) -> ContextObject:
        """Create ContextObject from a group of segments."""
        if not group:
            raise ValueError("Cannot create context from empty group")
        
        # Combine text
        combined_text = " ".join(seg.text for seg, _, _ in group)
        
        # Calculate time range
        start_time = min(seg.start_time for seg, _, _ in group)
        end_time = max(seg.end_time for seg, _, _ in group)
        
        # Average importance score
        avg_importance = sum(score for _, score, _ in group) / len(group)
        
        # Collect all keywords
        all_keywords = []
        for seg, _, _ in group:
            all_keywords.extend(seg.matched_keywords)
        unique_keywords = list(set(all_keywords))
        
        # Get context type (should be same for all in group)
        context_type = group[0][2]
        
        return ContextObject(
            context_id=str(uuid.uuid4()),
            start_time=start_time,
            end_time=end_time,
            slide_page=slide_id,
            text=combined_text,
            context_type=context_type,
            importance_score=avg_importance,
            keywords_matched=unique_keywords,
        )


class ExportGenerator:
    """
    Produces analysis files in accessible formats.
    
    Formats:
    - JSON: Structured data for programmatic access
    - Text: Human-readable report organized by slide
    - HTML: Timeline visualization
    """
    
    @staticmethod
    def export_json(contexts: List[ContextObject]) -> Dict:
        """
        Export contexts as JSON structure.
        
        Args:
            contexts: List of ContextObject instances
            
        Returns:
            Dictionary with structured data
        """
        return {
            "analysis_type": "context_extraction",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_contexts": len(contexts),
            "contexts": [
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
            ],
            "statistics": ExportGenerator._calculate_statistics(contexts),
        }
    
    @staticmethod
    def export_text(contexts: List[ContextObject]) -> str:
        """
        Export contexts as formatted text report.
        
        Args:
            contexts: List of ContextObject instances
            
        Returns:
            Formatted text string
        """
        lines = [
            "=" * 70,
            "CONTEXT EXTRACTION REPORT",
            "=" * 70,
            f"Generated: {datetime.now(timezone.utc).isoformat()}",
            f"Total Contexts: {len(contexts)}",
            "",
        ]
        
        # Group by slide
        by_slide: Dict[Optional[int], List[ContextObject]] = {}
        for ctx in contexts:
            slide = ctx.slide_page
            if slide not in by_slide:
                by_slide[slide] = []
            by_slide[slide].append(ctx)
        
        # Sort slides
        sorted_slides = sorted([s for s in by_slide.keys() if s is not None])
        if None in by_slide:
            sorted_slides.append(None)
        
        for slide_id in sorted_slides:
            slide_contexts = by_slide[slide_id]
            slide_label = f"Slide {slide_id}" if slide_id is not None else "Unknown Slide"
            
            lines.extend([
                "",
                "-" * 70,
                f"{slide_label} ({len(slide_contexts)} contexts)",
                "-" * 70,
            ])
            
            # Sort by importance (descending)
            slide_contexts_sorted = sorted(
                slide_contexts,
                key=lambda x: x.importance_score,
                reverse=True
            )
            
            for i, ctx in enumerate(slide_contexts_sorted, 1):
                lines.extend([
                    "",
                    f"Context {i} [{ctx.context_type.upper()}]",
                    f"  Importance: {ctx.importance_score:.1f}/100",
                    f"  Time: {ctx.start_time:.1f}s - {ctx.end_time:.1f}s",
                    f"  Keywords: {', '.join(ctx.keywords_matched[:5])}" + (
                        f" (+{len(ctx.keywords_matched) - 5} more)" 
                        if len(ctx.keywords_matched) > 5 else ""
                    ),
                    f"  Text: {ctx.text[:200]}{'...' if len(ctx.text) > 200 else ''}",
                ])
        
        lines.extend([
            "",
            "=" * 70,
            "END OF REPORT",
            "=" * 70,
        ])
        
        return "\n".join(lines)
    
    @staticmethod
    def export_html_timeline(
        contexts: List[ContextObject],
        total_duration: float,
    ) -> str:
        """
        Export contexts as HTML timeline visualization.
        
        Args:
            contexts: List of ContextObject instances
            total_duration: Total recording duration in seconds
            
        Returns:
            HTML string with timeline visualization
        """
        # Type colors
        type_colors = {
            'explanation': '#4A90E2',
            'emphasis': '#E24A4A',
            'example': '#4AE24A',
            'summary': '#E2E24A',
            'question': '#E24AE2',
            'mixed': '#9B9B9B',
        }
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Context Extraction Timeline</title>
    <style>
        body {{
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }}
        .timeline-container {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        .timeline {{
            position: relative;
            height: 60px;
            background: #e0e0e0;
            border-radius: 4px;
            margin: 20px 0;
        }}
        .context-marker {{
            position: absolute;
            height: 100%;
            border-radius: 4px;
            opacity: 0.7;
            border: 2px solid rgba(0,0,0,0.2);
            cursor: pointer;
            transition: opacity 0.2s;
        }}
        .context-marker:hover {{
            opacity: 1;
            z-index: 10;
        }}
        .context-info {{
            margin: 10px 0;
            padding: 10px;
            background: #f9f9f9;
            border-left: 4px solid;
            border-radius: 4px;
        }}
        .legend {{
            display: flex;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
        }}
        .legend-item {{
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .legend-color {{
            width: 20px;
            height: 20px;
            border-radius: 4px;
        }}
        h1 {{
            color: #333;
        }}
        .stats {{
            background: #f0f0f0;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="timeline-container">
        <h1>Context Extraction Timeline</h1>
        <div class="stats">
            <strong>Total Duration:</strong> {total_duration:.1f}s<br>
            <strong>Total Contexts:</strong> {len(contexts)}<br>
            <strong>Generated:</strong> {datetime.now(timezone.utc).isoformat()}
        </div>
        
        <div class="legend">
"""
        
        for ctx_type, color in type_colors.items():
            html += f"""
            <div class="legend-item">
                <div class="legend-color" style="background: {color};"></div>
                <span>{ctx_type.capitalize()}</span>
            </div>
"""
        
        html += """
        </div>
        
        <div class="timeline" id="timeline">
"""
        
        # Add context markers
        for ctx in contexts:
            left_pct = (ctx.start_time / total_duration) * 100
            width_pct = ((ctx.end_time - ctx.start_time) / total_duration) * 100
            color = type_colors.get(ctx.context_type, '#9B9B9B')
            
            html += f"""
            <div class="context-marker" 
                 style="left: {left_pct}%; width: {width_pct}%; background: {color};"
                 title="{ctx.context_type} - {ctx.importance_score:.1f} - {ctx.text[:50]}...">
            </div>
"""
        
        html += """
        </div>
        
        <h2>Context Details</h2>
"""
        
        # Add context details
        for ctx in sorted(contexts, key=lambda x: x.start_time):
            color = type_colors.get(ctx.context_type, '#9B9B9B')
            html += f"""
        <div class="context-info" style="border-color: {color};">
            <strong>[{ctx.context_type.upper()}]</strong> 
            Slide {ctx.slide_page if ctx.slide_page else '?'} | 
            {ctx.start_time:.1f}s - {ctx.end_time:.1f}s | 
            Importance: {ctx.importance_score:.1f}/100<br>
            <em>{ctx.text[:150]}{'...' if len(ctx.text) > 150 else ''}</em><br>
            <small>Keywords: {', '.join(ctx.keywords_matched[:5])}</small>
        </div>
"""
        
        html += """
    </div>
</body>
</html>
"""
        
        return html
    
    @staticmethod
    def _calculate_statistics(contexts: List[ContextObject]) -> Dict:
        """Calculate statistics about contexts."""
        if not contexts:
            return {
                "total_contexts": 0,
                "by_type": {},
                "avg_importance": 0.0,
                "total_duration": 0.0,
            }
        
        by_type = {}
        total_importance = 0.0
        total_duration = 0.0
        
        for ctx in contexts:
            # Count by type
            ctx_type = ctx.context_type
            by_type[ctx_type] = by_type.get(ctx_type, 0) + 1
            
            # Sum importance
            total_importance += ctx.importance_score
            
            # Sum duration
            total_duration += (ctx.end_time - ctx.start_time)
        
        return {
            "total_contexts": len(contexts),
            "by_type": by_type,
            "avg_importance": total_importance / len(contexts),
            "total_duration": total_duration,
        }


class ContextExtractor:
    """
    Main orchestrator for context extraction.
    
    Combines all components to extract important teaching moments from transcripts.
    """
    
    def __init__(
        self,
        min_importance_threshold: float = 30.0,
        min_length_words: int = 30,
        min_keyword_matches: int = 3,
        transition_window_seconds: float = 5.0,
        high_confidence_threshold: float = 0.9,
        keyword_overlap_threshold: float = 0.5,
    ):
        """
        Initialize context extractor.
        
        Args:
            min_importance_threshold: Minimum importance score to include (0-100)
            min_length_words: Minimum words for length boost
            min_keyword_matches: Minimum keyword matches for density boost
            transition_window_seconds: Time window around slide transitions
            high_confidence_threshold: Confidence threshold for reliability boost
            keyword_overlap_threshold: Minimum keyword overlap to merge segments
        """
        self.min_importance_threshold = min_importance_threshold
        self.scorer = SegmentImportanceScorer(
            min_length_words=min_length_words,
            min_keyword_matches=min_keyword_matches,
            transition_window_seconds=transition_window_seconds,
            high_confidence_threshold=high_confidence_threshold,
        )
        self.classifier = ContextTypeClassifier()
        self.aggregator = ContextAggregator(
            keyword_overlap_threshold=keyword_overlap_threshold
        )
        self.export_generator = ExportGenerator()
    
    def extract_contexts(
        self,
        segments: List[Dict],
        slide_transitions: List[Tuple[float, int]],
    ) -> List[ContextObject]:
        """
        Extract contexts from transcript segments.
        
        Args:
            segments: List of segment dicts with:
                - text: str
                - start_time: float
                - end_time: float
                - confidence: float
                - word_count: int (optional, will estimate if missing)
                - slide_id: Optional[int]
                - matched_keywords: List[str]
                - timestamp: Optional[float]
            slide_transitions: List of (timestamp, slide_id) tuples
            
        Returns:
            List of ContextObject instances
        """
        logger.info(f"Extracting contexts from {len(segments)} segments")
        
        # Convert to TranscriptSegment objects
        transcript_segments = []
        for seg_dict in segments:
            text = seg_dict.get('text', '')
            word_count = seg_dict.get('word_count', 0)
            if word_count == 0:
                # Estimate word count (rough approximation for Japanese)
                word_count = len(text.split())
            
            segment = TranscriptSegment(
                text=text,
                start_time=seg_dict.get('start_time', 0.0),
                end_time=seg_dict.get('end_time', 0.0),
                confidence=seg_dict.get('confidence', 0.0),
                word_count=word_count,
                slide_id=seg_dict.get('slide_id'),
                matched_keywords=seg_dict.get('matched_keywords', []),
                timestamp=seg_dict.get('timestamp'),
            )
            transcript_segments.append(segment)
        
        # Step 1: Score segments
        transition_times = [ts for ts, _ in slide_transitions]
        scored_segments = []
        for segment in transcript_segments:
            importance_score = self.scorer.score_segment(segment, transition_times)
            if importance_score >= self.min_importance_threshold:
                context_type = self.classifier.classify(segment)
                scored_segments.append((segment, importance_score, context_type))
        
        logger.info(
            f"Scored {len(scored_segments)}/{len(transcript_segments)} segments "
            f"above threshold {self.min_importance_threshold}"
        )
        
        # Step 2: Aggregate related segments
        contexts = self.aggregator.aggregate(scored_segments, slide_transitions)
        
        logger.info(f"Extracted {len(contexts)} contexts")
        
        return contexts


@dataclass
class ContextExtractionResult:
    """Result of context extraction analysis."""
    presentation_id: str
    contexts: List[ContextObject]
    statistics: Dict
    generated_at: str
    parameters: Dict

