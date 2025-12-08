"""
Teaching Intention Analysis System (Week 11-12)

Analyzes how teachers communicate different types of information throughout their presentation.
Classifies speech segments into intention categories to reveal teaching patterns and strategies.
"""

import json
import logging
import re
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Load phrase dictionary
PHRASES_FILE = Path(__file__).parent / "intention_phrases.json"
try:
    with open(PHRASES_FILE, 'r', encoding='utf-8') as f:
        INTENTION_PHRASES = json.load(f)
except FileNotFoundError:
    logger.error(f"Intention phrases dictionary not found: {PHRASES_FILE}")
    INTENTION_PHRASES = {}


@dataclass
class IntentionSegment:
    """Represents a segment with classified teaching intention."""
    segment_id: str
    text: str
    start_time: float
    end_time: float
    slide_page: Optional[int]
    intention_category: str  # 'explanation', 'emphasis', 'example', 'comparison', 'warning', 'summary', 'question', 'mixed'
    confidence_score: float  # 0.0 to 1.0
    key_phrases: List[str] = field(default_factory=list)
    word_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@dataclass
class IntentionStatistics:
    """Statistics about intention distribution."""
    total_segments: int
    total_duration: float
    by_category: Dict[str, Dict[str, float]]  # category -> {count, duration, percentage}
    timeline: List[Dict[str, any]]  # Chronological intention flow


class MultiFactorIntentionScorer:
    """
    Multi-Factor Scoring System for intention classification.
    
    Factor 1: Phrase matching - counts category-specific phrases
    Factor 2: Structural position - considers where segment appears
    Factor 3: Length patterns - recognizes typical lengths per category
    Factor 4: Keyword density - relates high density to explanations
    Factor 5: Repetition detection - identifies emphasis through repetition
    """
    
    def __init__(self, phrase_dict: Dict = None):
        """
        Initialize scorer with phrase dictionary.
        
        Args:
            phrase_dict: Dictionary of intention categories and their phrases
        """
        self.phrase_dict = phrase_dict or INTENTION_PHRASES
        
        # Compile regex patterns for each category
        self.compiled_patterns = {}
        for category, data in self.phrase_dict.items():
            phrases = data.get('phrases', [])
            self.compiled_patterns[category] = [
                re.compile(p, re.IGNORECASE) for p in phrases
            ]
        
        # Length patterns (typical word counts per category)
        self.length_patterns = {
            'explanation': (20, 100),  # Longer segments
            'emphasis': (5, 30),       # Shorter segments
            'example': (10, 50),      # Medium segments
            'comparison': (15, 60),    # Medium-long segments
            'warning': (5, 40),       # Short to medium
            'summary': (10, 50),       # Medium segments
            'question': (3, 25),       # Short to medium (questions are usually brief)
        }
    
    def score_segment(
        self,
        text: str,
        word_count: int,
        start_time: float,
        end_time: float,
        slide_position: Optional[float] = None,  # 0.0 (start) to 1.0 (end) of slide
        keyword_density: float = 0.0,  # Ratio of keywords to total words
    ) -> Dict[str, float]:
        """
        Score segment for all intention categories.
        
        Args:
            text: Segment text
            word_count: Number of words in segment
            start_time: Start timestamp
            end_time: End timestamp
            slide_position: Position within slide (0.0 = start, 1.0 = end)
            keyword_density: Ratio of keywords to total words
            
        Returns:
            Dictionary of category -> score (0.0 to 1.0)
        """
        scores = {
            'explanation': 0.0,
            'emphasis': 0.0,
            'example': 0.0,
            'comparison': 0.0,
            'warning': 0.0,
            'summary': 0.0,
        }
        
        # Factor 1: Phrase matching (0-40 points)
        phrase_scores = self._score_phrase_matching(text)
        for category in scores:
            scores[category] += phrase_scores.get(category, 0.0) * 0.4
        
        # Factor 2: Structural position (0-20 points)
        position_scores = self._score_structural_position(slide_position)
        for category in scores:
            scores[category] += position_scores.get(category, 0.0) * 0.2
        
        # Factor 3: Length patterns (0-15 points)
        length_scores = self._score_length_patterns(word_count)
        for category in scores:
            scores[category] += length_scores.get(category, 0.0) * 0.15
        
        # Factor 4: Keyword density (0-15 points)
        density_scores = self._score_keyword_density(keyword_density)
        for category in scores:
            scores[category] += density_scores.get(category, 0.0) * 0.15
        
        # Factor 5: Repetition detection (0-10 points)
        repetition_scores = self._score_repetition(text)
        for category in scores:
            scores[category] += repetition_scores.get(category, 0.0) * 0.1
        
        # Normalize to 0-1.0
        max_score = max(scores.values()) if scores.values() else 1.0
        if max_score > 0:
            for category in scores:
                scores[category] = min(1.0, scores[category] / max_score)
        
        return scores
    
    def _score_phrase_matching(self, text: str) -> Dict[str, float]:
        """Factor 1: Count category-specific phrases."""
        scores = {}
        for category, patterns in self.compiled_patterns.items():
            count = sum(1 for pattern in patterns if pattern.search(text))
            # Normalize: more matches = higher score (max 10 matches = 1.0)
            scores[category] = min(1.0, count / 10.0)
        return scores
    
    def _score_structural_position(self, slide_position: Optional[float]) -> Dict[str, float]:
        """Factor 2: Consider where segment appears in slide."""
        scores = {cat: 0.0 for cat in self.compiled_patterns.keys()}
        
        if slide_position is None:
            return scores
        
        # Summary typically near slide end (0.7-1.0)
        if slide_position >= 0.7:
            scores['summary'] = 1.0
        
        # Examples often in middle sections (0.3-0.7)
        if 0.3 <= slide_position <= 0.7:
            scores['example'] = 0.8
        
        # Explanations can appear anywhere but more common in first half
        if slide_position <= 0.5:
            scores['explanation'] = 0.6
        
        return scores
    
    def _score_length_patterns(self, word_count: int) -> Dict[str, float]:
        """Factor 3: Recognize typical lengths per category."""
        scores = {}
        for category, (min_words, max_words) in self.length_patterns.items():
            if min_words <= word_count <= max_words:
                # Within ideal range
                scores[category] = 1.0
            elif word_count < min_words:
                # Too short, partial score
                scores[category] = word_count / min_words if min_words > 0 else 0.0
            else:
                # Too long, partial score
                scores[category] = max_words / word_count if word_count > 0 else 0.0
        return scores
    
    def _score_keyword_density(self, keyword_density: float) -> Dict[str, float]:
        """Factor 4: High keyword density relates to explanations."""
        scores = {cat: 0.0 for cat in self.compiled_patterns.keys()}
        
        # High density (>= 0.3) suggests explanation
        if keyword_density >= 0.3:
            scores['explanation'] = 1.0
        elif keyword_density >= 0.2:
            scores['explanation'] = 0.7
        
        return scores
    
    def _score_repetition(self, text: str) -> Dict[str, float]:
        """Factor 5: Detect repetition for emphasis."""
        scores = {cat: 0.0 for cat in self.compiled_patterns.keys()}
        
        # Simple repetition detection: repeated words or phrases
        words = text.split()
        if len(words) > 0:
            word_counts = {}
            for word in words:
                word_counts[word] = word_counts.get(word, 0) + 1
            
            # Count repeated words (appearing 2+ times)
            repeated_count = sum(1 for count in word_counts.values() if count >= 2)
            repetition_ratio = repeated_count / len(words) if len(words) > 0 else 0.0
            
            # High repetition suggests emphasis
            if repetition_ratio > 0.1:
                scores['emphasis'] = min(1.0, repetition_ratio * 5.0)
        
        return scores


class IntentionClassifier:
    """
    Rule-based classifier for teaching intentions.
    
    Uses Multi-Factor Scoring System to classify segments into intention categories.
    Handles ambiguous cases by allowing "Mixed" when scores are close (within 20%).
    """
    
    def __init__(self, phrase_dict: Dict = None, ambiguity_threshold: float = 0.2):
        """
        Initialize classifier.
        
        Args:
            phrase_dict: Dictionary of intention categories and phrases
            ambiguity_threshold: Threshold for "Mixed" classification (0-1)
        """
        self.scorer = MultiFactorIntentionScorer(phrase_dict)
        self.ambiguity_threshold = ambiguity_threshold
    
    def classify(
        self,
        text: str,
        word_count: int,
        start_time: float,
        end_time: float,
        slide_position: Optional[float] = None,
        keyword_density: float = 0.0,
    ) -> Tuple[str, float, List[str]]:
        """
        Classify segment into intention category.
        
        Args:
            text: Segment text
            word_count: Number of words
            start_time: Start timestamp
            end_time: End timestamp
            slide_position: Position within slide (0.0-1.0)
            keyword_density: Ratio of keywords to total words
            
        Returns:
            Tuple of (intention_category, confidence_score, key_phrases)
        """
        # Get scores for all categories
        scores = self.scorer.score_segment(
            text=text,
            word_count=word_count,
            start_time=start_time,
            end_time=end_time,
            slide_position=slide_position,
            keyword_density=keyword_density,
        )
        
        # Find highest score
        max_score = max(scores.values())
        if max_score == 0:
            return ('explanation', 0.0, [])  # Default
        
        # Find winners (categories with max score)
        winners = [cat for cat, score in scores.items() if score == max_score]
        
        # Check for ambiguity (scores within threshold)
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_scores) > 1:
            second_score = sorted_scores[1][1]
            if second_score > 0 and (max_score - second_score) / max_score < self.ambiguity_threshold:
                # Scores are close - return "mixed"
                top_categories = [cat for cat, score in sorted_scores[:2] if score > 0]
                return ('mixed', max_score, top_categories)
        
        # Single clear winner
        category = winners[0]
        confidence = max_score
        
        # Extract key phrases that matched
        key_phrases = self._extract_key_phrases(text, category)
        
        return (category, confidence, key_phrases)
    
    def _extract_key_phrases(self, text: str, category: str) -> List[str]:
        """Extract phrases from text that match the category."""
        if category not in self.scorer.compiled_patterns:
            return []
        
        matched_phrases = []
        patterns = self.scorer.compiled_patterns[category]
        
        for pattern in patterns:
            if pattern.search(text):
                # Try to extract the matched phrase
                match = pattern.search(text)
                if match:
                    matched_phrases.append(match.group(0))
        
        return list(set(matched_phrases))  # Remove duplicates


class IntentionAnalyzer:
    """
    Main orchestrator for intention analysis.
    
    Analyzes all transcript segments to classify teaching intentions.
    Generates distribution statistics and timeline visualization.
    """
    
    def __init__(self, phrase_dict: Dict = None):
        """
        Initialize analyzer.
        
        Args:
            phrase_dict: Dictionary of intention categories and phrases
        """
        self.classifier = IntentionClassifier(phrase_dict)
        self.phrase_dict = phrase_dict or INTENTION_PHRASES
    
    def analyze_intentions(
        self,
        segments: List[Dict],
        slide_transitions: List[Tuple[float, int]] = None,
    ) -> Tuple[List[IntentionSegment], IntentionStatistics]:
        """
        Analyze intentions for all segments.
        
        Args:
            segments: List of segment dicts with:
                - text: str
                - start_time: float
                - end_time: float
                - word_count: int (optional)
                - slide_id: Optional[int]
                - matched_keywords: List[str] (optional)
            slide_transitions: List of (timestamp, slide_id) tuples
            
        Returns:
            Tuple of (intention_segments, statistics)
        """
        logger.info(f"Analyzing intentions for {len(segments)} segments")
        
        if slide_transitions is None:
            slide_transitions = []
        
        # Create slide position map
        slide_positions = self._calculate_slide_positions(segments, slide_transitions)
        
        # Classify each segment
        intention_segments = []
        for i, seg_dict in enumerate(segments):
            text = seg_dict.get('text', '')
            start_time = seg_dict.get('start_time', 0.0)
            end_time = seg_dict.get('end_time', 0.0)
            word_count = seg_dict.get('word_count', 0)
            if word_count == 0:
                word_count = len(text.split())
            
            slide_id = seg_dict.get('slide_id')
            matched_keywords = seg_dict.get('matched_keywords', [])
            
            # Calculate keyword density
            keyword_density = len(matched_keywords) / word_count if word_count > 0 else 0.0
            
            # Get slide position
            slide_position = slide_positions.get(i)
            
            # Classify
            category, confidence, key_phrases = self.classifier.classify(
                text=text,
                word_count=word_count,
                start_time=start_time,
                end_time=end_time,
                slide_position=slide_position,
                keyword_density=keyword_density,
            )
            
            intention_segment = IntentionSegment(
                segment_id=str(uuid.uuid4()),
                text=text,
                start_time=start_time,
                end_time=end_time,
                slide_page=slide_id,
                intention_category=category,
                confidence_score=confidence,
                key_phrases=key_phrases,
                word_count=word_count,
            )
            intention_segments.append(intention_segment)
        
        # Generate statistics
        statistics = self._calculate_statistics(intention_segments)
        
        logger.info(f"Analyzed {len(intention_segments)} segments")
        
        return intention_segments, statistics
    
    def _calculate_slide_positions(
        self,
        segments: List[Dict],
        slide_transitions: List[Tuple[float, int]],
    ) -> Dict[int, float]:
        """
        Calculate position of each segment within its slide (0.0 = start, 1.0 = end).
        
        Returns:
            Dictionary of segment_index -> position (0.0-1.0)
        """
        positions = {}
        
        if not slide_transitions:
            return positions
        
        # Group segments by slide
        slide_segments: Dict[int, List[Tuple[int, Dict]]] = {}
        for i, seg in enumerate(segments):
            slide_id = seg.get('slide_id')
            if slide_id is not None:
                if slide_id not in slide_segments:
                    slide_segments[slide_id] = []
                slide_segments[slide_id].append((i, seg))
        
        # Calculate position for each slide
        for slide_id, seg_list in slide_segments.items():
            if not seg_list:
                continue
            
            # Sort by start_time
            seg_list.sort(key=lambda x: x[1].get('start_time', 0.0))
            
            # Calculate positions
            total_duration = seg_list[-1][1].get('end_time', 0.0) - seg_list[0][1].get('start_time', 0.0)
            if total_duration > 0:
                for idx, (seg_idx, seg) in enumerate(seg_list):
                    seg_start = seg.get('start_time', 0.0)
                    slide_start = seg_list[0][1].get('start_time', 0.0)
                    position = (seg_start - slide_start) / total_duration
                    positions[seg_idx] = position
            else:
                # All segments at same time, assign evenly
                for idx, (seg_idx, _) in enumerate(seg_list):
                    positions[seg_idx] = idx / len(seg_list) if len(seg_list) > 1 else 0.5
        
        return positions
    
    def _calculate_statistics(
        self,
        intention_segments: List[IntentionSegment],
    ) -> IntentionStatistics:
        """Calculate intention distribution statistics."""
        total_segments = len(intention_segments)
        total_duration = sum(
            (seg.end_time - seg.start_time) for seg in intention_segments
        )
        
        # Count by category
        by_category = {}
        for category in ['explanation', 'emphasis', 'example', 'comparison', 'warning', 'summary', 'question', 'mixed']:
            category_segments = [s for s in intention_segments if s.intention_category == category]
            category_duration = sum(
                (s.end_time - s.start_time) for s in category_segments
            )
            category_percentage = (category_duration / total_duration * 100) if total_duration > 0 else 0.0
            
            by_category[category] = {
                'count': len(category_segments),
                'duration': category_duration,
                'percentage': category_percentage,
            }
        
        # Create timeline (chronological flow)
        timeline = []
        for seg in sorted(intention_segments, key=lambda x: x.start_time):
            timeline.append({
                'start_time': seg.start_time,
                'end_time': seg.end_time,
                'category': seg.intention_category,
                'confidence': seg.confidence_score,
                'slide_page': seg.slide_page,
            })
        
        return IntentionStatistics(
            total_segments=total_segments,
            total_duration=total_duration,
            by_category=by_category,
            timeline=timeline,
        )

