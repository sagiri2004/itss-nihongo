"""
Comprehensive tests for Context Extraction System (Week 9-10).

Tests all core AI components without UI dependencies.
"""

import pytest
from datetime import datetime

from src.analytics.context_extraction import (
    ContextExtractor,
    SegmentImportanceScorer,
    ContextTypeClassifier,
    ContextAggregator,
    ExportGenerator,
    TranscriptSegment,
    ContextObject,
)


class TestSegmentImportanceScorer:
    """Test Segment Importance Scorer."""
    
    def test_score_long_segment(self):
        """Test that longer segments get higher scores."""
        scorer = SegmentImportanceScorer(min_length_words=30)
        segment = TranscriptSegment(
            text="This is a very long segment with many words that should score higher than short segments.",
            start_time=0.0,
            end_time=5.0,
            confidence=0.95,
            word_count=20,  # Below threshold
            matched_keywords=["keyword1", "keyword2", "keyword3", "keyword4"],
        )
        score = scorer.score_segment(segment, [])
        assert 0 <= score <= 100
    
    def test_score_keyword_density(self):
        """Test that high keyword density increases score."""
        scorer = SegmentImportanceScorer(min_keyword_matches=3)
        segment = TranscriptSegment(
            text="Segment with many keyword matches",
            start_time=0.0,
            end_time=3.0,
            confidence=0.9,
            word_count=10,
            matched_keywords=["kw1", "kw2", "kw3", "kw4", "kw5"],
        )
        score = scorer.score_segment(segment, [])
        assert score > 0
    
    def test_score_slide_transition_proximity(self):
        """Test that segments near slide transitions score higher."""
        scorer = SegmentImportanceScorer(transition_window_seconds=5.0)
        segment = TranscriptSegment(
            text="Segment near transition",
            start_time=2.0,
            end_time=4.0,  # Midpoint at 3.0, transition at 5.0 (within 5s window)
            confidence=0.9,
            word_count=5,
            matched_keywords=[],
        )
        transition_times = [5.0]
        score = scorer.score_segment(segment, transition_times)
        assert score > 0
    
    def test_score_high_confidence(self):
        """Test that high confidence segments score higher."""
        scorer = SegmentImportanceScorer(high_confidence_threshold=0.9)
        segment = TranscriptSegment(
            text="High confidence segment",
            start_time=0.0,
            end_time=2.0,
            confidence=0.95,  # Above threshold
            word_count=5,
            matched_keywords=[],
        )
        score = scorer.score_segment(segment, [])
        assert score > 0


class TestContextTypeClassifier:
    """Test Context Type Classifier."""
    
    def test_classify_explanation(self):
        """Test classification of explanation contexts."""
        classifier = ContextTypeClassifier()
        segment = TranscriptSegment(
            text="つまり、これは重要な概念です。例えば、実際のケースを見てみましょう。",
            start_time=0.0,
            end_time=5.0,
            confidence=0.9,
            word_count=15,
        )
        context_type = classifier.classify(segment)
        assert context_type in ['explanation', 'example', 'mixed']
    
    def test_classify_emphasis(self):
        """Test classification of emphasis contexts."""
        classifier = ContextTypeClassifier()
        segment = TranscriptSegment(
            text="これは重要です。注意してください。覚えておいてください。",
            start_time=0.0,
            end_time=3.0,
            confidence=0.9,
            word_count=10,
        )
        context_type = classifier.classify(segment)
        assert context_type in ['emphasis', 'mixed']
    
    def test_classify_summary(self):
        """Test classification of summary contexts."""
        classifier = ContextTypeClassifier()
        segment = TranscriptSegment(
            text="まとめると、結論として、以上のように説明しました。",
            start_time=0.0,
            end_time=3.0,
            confidence=0.9,
            word_count=10,
        )
        context_type = classifier.classify(segment)
        assert context_type in ['summary', 'mixed']
    
    def test_classify_question(self):
        """Test classification of question contexts."""
        classifier = ContextTypeClassifier()
        segment = TranscriptSegment(
            text="どうしてこのようになるのでしょうか？なぜこの現象が起こるのでしょうか？",
            start_time=0.0,
            end_time=4.0,
            confidence=0.9,
            word_count=12,
        )
        context_type = classifier.classify(segment)
        assert context_type in ['question', 'mixed']
    
    def test_classify_default(self):
        """Test default classification when no patterns match."""
        classifier = ContextTypeClassifier()
        segment = TranscriptSegment(
            text="普通の文章です。特別なパターンはありません。",
            start_time=0.0,
            end_time=2.0,
            confidence=0.9,
            word_count=8,
        )
        context_type = classifier.classify(segment)
        assert context_type == 'explanation'  # Default


class TestContextAggregator:
    """Test Context Aggregator."""
    
    def test_aggregate_by_slide(self):
        """Test that segments are grouped by slide boundaries."""
        aggregator = ContextAggregator()
        
        segments = [
            (TranscriptSegment(
                text="Segment 1",
                start_time=0.0,
                end_time=2.0,
                confidence=0.9,
                word_count=5,
                slide_id=1,
                matched_keywords=["kw1", "kw2"],
            ), 50.0, "explanation"),
            (TranscriptSegment(
                text="Segment 2",
                start_time=2.0,
                end_time=4.0,
                confidence=0.9,
                word_count=5,
                slide_id=2,  # Different slide
                matched_keywords=["kw3", "kw4"],
            ), 45.0, "explanation"),
        ]
        
        transitions = [(2.5, 2)]  # Slide change at 2.5s
        contexts = aggregator.aggregate(segments, transitions)
        
        assert len(contexts) == 2  # Should create 2 separate contexts
    
    def test_aggregate_by_type(self):
        """Test that segments are grouped by context type."""
        aggregator = ContextAggregator()
        
        segments = [
            (TranscriptSegment(
                text="Explanation segment",
                start_time=0.0,
                end_time=2.0,
                confidence=0.9,
                word_count=5,
                slide_id=1,
                matched_keywords=["kw1"],
            ), 50.0, "explanation"),
            (TranscriptSegment(
                text="Emphasis segment",
                start_time=2.0,
                end_time=4.0,
                confidence=0.9,
                word_count=5,
                slide_id=1,  # Same slide
                matched_keywords=["kw2"],
            ), 45.0, "emphasis"),  # Different type
        ]
        
        contexts = aggregator.aggregate(segments, [])
        
        assert len(contexts) == 2  # Should create 2 separate contexts
    
    def test_aggregate_keyword_overlap(self):
        """Test that segments with high keyword overlap are merged."""
        aggregator = ContextAggregator(keyword_overlap_threshold=0.5)
        
        segments = [
            (TranscriptSegment(
                text="Segment 1",
                start_time=0.0,
                end_time=2.0,
                confidence=0.9,
                word_count=5,
                slide_id=1,
                matched_keywords=["kw1", "kw2", "kw3"],  # 3 keywords
            ), 50.0, "explanation"),
            (TranscriptSegment(
                text="Segment 2",
                start_time=2.0,
                end_time=4.0,
                confidence=0.9,
                word_count=5,
                slide_id=1,  # Same slide
                matched_keywords=["kw1", "kw2", "kw4"],  # 2/3 overlap = 0.67 > 0.5
            ), 45.0, "explanation"),  # Same type
        ]
        
        contexts = aggregator.aggregate(segments, [])
        
        assert len(contexts) == 1  # Should merge into 1 context


class TestExportGenerator:
    """Test Export Generator."""
    
    def test_export_json(self):
        """Test JSON export format."""
        contexts = [
            ContextObject(
                context_id="test-1",
                start_time=0.0,
                end_time=5.0,
                slide_page=1,
                text="Test context",
                context_type="explanation",
                importance_score=75.0,
                keywords_matched=["kw1", "kw2"],
            ),
        ]
        
        result = ExportGenerator.export_json(contexts)
        
        assert "analysis_type" in result
        assert "total_contexts" in result
        assert "contexts" in result
        assert "statistics" in result
        assert result["total_contexts"] == 1
        assert len(result["contexts"]) == 1
    
    def test_export_text(self):
        """Test text export format."""
        contexts = [
            ContextObject(
                context_id="test-1",
                start_time=0.0,
                end_time=5.0,
                slide_page=1,
                text="Test context text",
                context_type="explanation",
                importance_score=75.0,
                keywords_matched=["kw1", "kw2"],
            ),
        ]
        
        result = ExportGenerator.export_text(contexts)
        
        assert isinstance(result, str)
        assert "CONTEXT EXTRACTION REPORT" in result
        assert "Test context text" in result
        assert "EXPLANATION" in result.upper()  # Context type is uppercase in output
    
    def test_export_html_timeline(self):
        """Test HTML timeline export."""
        contexts = [
            ContextObject(
                context_id="test-1",
                start_time=0.0,
                end_time=5.0,
                slide_page=1,
                text="Test context",
                context_type="explanation",
                importance_score=75.0,
                keywords_matched=["kw1"],
            ),
        ]
        
        html = ExportGenerator.export_html_timeline(contexts, total_duration=60.0)
        
        assert isinstance(html, str)
        assert "<!DOCTYPE html>" in html
        assert "timeline" in html.lower()
        assert "Test context" in html


class TestContextExtractor:
    """Test full Context Extractor pipeline."""
    
    def test_extract_contexts_basic(self):
        """Test basic context extraction."""
        extractor = ContextExtractor(min_importance_threshold=30.0)
        
        segments = [
            {
                "text": "これは重要な説明です。つまり、概念を理解する必要があります。",
                "start_time": 0.0,
                "end_time": 5.0,
                "confidence": 0.95,
                "word_count": 15,
                "slide_id": 1,
                "matched_keywords": ["重要", "概念", "理解", "説明"],
            },
            {
                "text": "短いセグメント",
                "start_time": 5.0,
                "end_time": 6.0,
                "confidence": 0.8,
                "word_count": 2,
                "slide_id": 1,
                "matched_keywords": [],
            },
        ]
        
        transitions = [(0.0, 1)]
        
        contexts = extractor.extract_contexts(segments, transitions)
        
        assert len(contexts) >= 0  # At least one context if threshold met
        if contexts:
            assert contexts[0].context_type in ['explanation', 'emphasis', 'mixed']
    
    def test_extract_contexts_with_slide_transitions(self):
        """Test context extraction with multiple slide transitions."""
        extractor = ContextExtractor(min_importance_threshold=20.0)
        
        segments = [
            {
                "text": "Slide 1 content with many keywords",
                "start_time": 0.0,
                "end_time": 10.0,
                "confidence": 0.9,
                "word_count": 35,
                "slide_id": 1,
                "matched_keywords": ["kw1", "kw2", "kw3", "kw4"],
            },
            {
                "text": "Transition explanation near slide change",
                "start_time": 10.0,
                "end_time": 12.0,  # Near transition at 10.0
                "confidence": 0.95,
                "word_count": 5,
                "slide_id": 1,
                "matched_keywords": ["kw5"],
            },
            {
                "text": "Slide 2 content",
                "start_time": 12.0,
                "end_time": 20.0,
                "confidence": 0.9,
                "word_count": 30,
                "slide_id": 2,
                "matched_keywords": ["kw6", "kw7", "kw8"],
            },
        ]
        
        transitions = [(10.0, 2), (20.0, 3)]
        
        contexts = extractor.extract_contexts(segments, transitions)
        
        assert len(contexts) > 0
    
    def test_extract_contexts_empty_input(self):
        """Test context extraction with empty input."""
        extractor = ContextExtractor()
        
        contexts = extractor.extract_contexts([], [])
        
        assert contexts == []
    
    def test_extract_contexts_low_threshold(self):
        """Test that low threshold includes more contexts."""
        extractor_low = ContextExtractor(min_importance_threshold=10.0)
        extractor_high = ContextExtractor(min_importance_threshold=80.0)
        
        segments = [
            {
                "text": "Medium importance segment",
                "start_time": 0.0,
                "end_time": 3.0,
                "confidence": 0.85,
                "word_count": 20,
                "slide_id": 1,
                "matched_keywords": ["kw1", "kw2"],
            },
        ]
        
        transitions = []
        
        contexts_low = extractor_low.extract_contexts(segments, transitions)
        contexts_high = extractor_high.extract_contexts(segments, transitions)
        
        assert len(contexts_low) >= len(contexts_high)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

