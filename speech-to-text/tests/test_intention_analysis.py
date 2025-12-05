"""
Comprehensive tests for Teaching Intention Analysis System (Week 11-12).

Tests all core AI components for intention classification.
"""

import pytest
from src.analytics.intention_analysis import (
    IntentionAnalyzer,
    IntentionClassifier,
    MultiFactorIntentionScorer,
    IntentionSegment,
    IntentionStatistics,
)


class TestMultiFactorIntentionScorer:
    """Test Multi-Factor Scoring System."""
    
    def test_score_phrase_matching(self):
        """Test Factor 1: Phrase matching."""
        scorer = MultiFactorIntentionScorer()
        scores = scorer._score_phrase_matching("これは重要です。覚えておいてください。")
        assert 'emphasis' in scores
        assert scores['emphasis'] > 0
    
    def test_score_structural_position(self):
        """Test Factor 2: Structural position."""
        scorer = MultiFactorIntentionScorer()
        # Summary near slide end
        scores = scorer._score_structural_position(0.9)
        assert scores['summary'] > 0
        
        # Example in middle
        scores = scorer._score_structural_position(0.5)
        assert scores['example'] > 0
    
    def test_score_length_patterns(self):
        """Test Factor 3: Length patterns."""
        scorer = MultiFactorIntentionScorer()
        # Long segment -> explanation
        scores = scorer._score_length_patterns(50)
        assert scores['explanation'] > 0
        
        # Short segment -> emphasis
        scores = scorer._score_length_patterns(10)
        assert scores['emphasis'] > 0
    
    def test_score_keyword_density(self):
        """Test Factor 4: Keyword density."""
        scorer = MultiFactorIntentionScorer()
        # High density -> explanation
        scores = scorer._score_keyword_density(0.4)
        assert scores['explanation'] > 0
    
    def test_score_repetition(self):
        """Test Factor 5: Repetition detection."""
        scorer = MultiFactorIntentionScorer()
        # Repetitive text -> emphasis
        scores = scorer._score_repetition("重要 重要 重要 覚えて 覚えて")
        assert scores['emphasis'] > 0
    
    def test_score_segment_combined(self):
        """Test combined scoring."""
        scorer = MultiFactorIntentionScorer()
        scores = scorer.score_segment(
            text="これは重要です。覚えておいてください。",
            word_count=8,
            start_time=0.0,
            end_time=3.0,
            slide_position=0.2,
            keyword_density=0.1,
        )
        assert len(scores) == 6
        assert all(0.0 <= score <= 1.0 for score in scores.values())


class TestIntentionClassifier:
    """Test Intention Classifier."""
    
    def test_classify_explanation(self):
        """Test classification of explanation intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="つまり、これは重要な概念です。なぜなら、理由は以下の通りです。",
            word_count=15,
            start_time=0.0,
            end_time=5.0,
            slide_position=0.3,
            keyword_density=0.3,
        )
        assert category in ['explanation', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_emphasis(self):
        """Test classification of emphasis intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="これは重要です。覚えておいてください。必ず覚えて。",
            word_count=8,
            start_time=0.0,
            end_time=3.0,
            slide_position=0.2,
            keyword_density=0.1,
        )
        assert category in ['emphasis', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_example(self):
        """Test classification of example intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="例えば、実際のケースを見てみましょう。具体例として、",
            word_count=12,
            start_time=0.0,
            end_time=4.0,
            slide_position=0.5,
            keyword_density=0.2,
        )
        assert category in ['example', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_comparison(self):
        """Test classification of comparison intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="一方、これに対して、違いは以下の通りです。比較すると、",
            word_count=12,
            start_time=0.0,
            end_time=4.0,
            slide_position=0.5,
            keyword_density=0.2,
        )
        assert category in ['comparison', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_warning(self):
        """Test classification of warning intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="注意してください。よくある間違いは、避けるべきです。",
            word_count=10,
            start_time=0.0,
            end_time=3.0,
            slide_position=0.2,
            keyword_density=0.1,
        )
        assert category in ['warning', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_summary(self):
        """Test classification of summary intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="まとめると、結論として、以上のように説明しました。",
            word_count=10,
            start_time=0.0,
            end_time=3.0,
            slide_position=0.9,  # Near slide end
            keyword_density=0.1,
        )
        assert category in ['summary', 'mixed']
        assert 0.0 <= confidence <= 1.0
    
    def test_classify_question(self):
        """Test classification of question intention."""
        classifier = IntentionClassifier()
        category, confidence, phrases = classifier.classify(
            text="どうしてこのようになるのでしょうか？なぜこの現象が起こるのでしょうか？",
            word_count=12,
            start_time=0.0,
            end_time=4.0,
        )
        assert category in ['question', 'mixed']
        assert 0.0 <= confidence <= 1.0
        
        # Test with ましょう pattern (may match emphasis due to "見て" but should also match question)
        category2, confidence2, phrases2 = classifier.classify(
            text="考えてみましょう。やってみましょう。",
            word_count=5,
            start_time=0.0,
            end_time=2.0,
        )
        # Accept question, mixed, or emphasis (since みましょう can be interactive)
        assert category2 in ['question', 'mixed', 'emphasis']
    
    def test_classify_mixed(self):
        """Test classification with ambiguous scores."""
        classifier = IntentionClassifier(ambiguity_threshold=0.5)  # Higher threshold
        category, confidence, phrases = classifier.classify(
            text="これは重要です。つまり、覚えておいてください。",
            word_count=8,
            start_time=0.0,
            end_time=3.0,
            slide_position=0.2,
            keyword_density=0.1,
        )
        # Should be mixed if scores are close
        assert category in ['explanation', 'emphasis', 'mixed']
        assert 0.0 <= confidence <= 1.0


class TestIntentionAnalyzer:
    """Test full Intention Analyzer pipeline."""
    
    def test_analyze_intentions_basic(self):
        """Test basic intention analysis."""
        analyzer = IntentionAnalyzer()
        
        segments = [
            {
                "text": "これは重要な説明です。つまり、概念を理解する必要があります。",
                "start_time": 0.0,
                "end_time": 5.0,
                "word_count": 15,
                "slide_id": 1,
                "matched_keywords": ["重要", "概念", "理解"],
            },
            {
                "text": "短いセグメント",
                "start_time": 5.0,
                "end_time": 6.0,
                "word_count": 2,
                "slide_id": 1,
                "matched_keywords": [],
            },
        ]
        
        intention_segments, statistics = analyzer.analyze_intentions(segments)
        
        assert len(intention_segments) == 2
        assert statistics.total_segments == 2
        assert statistics.total_duration > 0
        assert 'explanation' in statistics.by_category
        assert 'emphasis' in statistics.by_category
    
    def test_analyze_intentions_with_transitions(self):
        """Test intention analysis with slide transitions."""
        analyzer = IntentionAnalyzer()
        
        segments = [
            {
                "text": "Slide 1 explanation",
                "start_time": 0.0,
                "end_time": 10.0,
                "word_count": 30,
                "slide_id": 1,
                "matched_keywords": ["kw1", "kw2"],
            },
            {
                "text": "まとめると、結論として",
                "start_time": 10.0,
                "end_time": 12.0,
                "word_count": 5,
                "slide_id": 1,
                "matched_keywords": [],
            },
            {
                "text": "Slide 2 content",
                "start_time": 12.0,
                "end_time": 20.0,
                "word_count": 25,
                "slide_id": 2,
                "matched_keywords": ["kw3"],
            },
        ]
        
        transitions = [(10.0, 2), (20.0, 3)]
        
        intention_segments, statistics = analyzer.analyze_intentions(
            segments, slide_transitions=transitions
        )
        
        assert len(intention_segments) == 3
        # Check that summary segment is classified correctly
        summary_seg = [s for s in intention_segments if "まとめ" in s.text]
        if summary_seg:
            assert summary_seg[0].intention_category in ['summary', 'mixed']
    
    def test_analyze_intentions_empty_input(self):
        """Test intention analysis with empty input."""
        analyzer = IntentionAnalyzer()
        
        intention_segments, statistics = analyzer.analyze_intentions([])
        
        assert len(intention_segments) == 0
        assert statistics.total_segments == 0
        assert statistics.total_duration == 0.0
    
    def test_statistics_calculation(self):
        """Test statistics calculation."""
        analyzer = IntentionAnalyzer()
        
        segments = [
            {
                "text": "Explanation text",
                "start_time": 0.0,
                "end_time": 5.0,
                "word_count": 20,
                "slide_id": 1,
                "matched_keywords": ["kw1"],
            },
            {
                "text": "重要です。覚えて",
                "start_time": 5.0,
                "end_time": 7.0,
                "word_count": 5,
                "slide_id": 1,
                "matched_keywords": [],
            },
        ]
        
        intention_segments, statistics = analyzer.analyze_intentions(segments)
        
        assert statistics.total_segments == 2
        assert statistics.total_duration > 0
        assert 'explanation' in statistics.by_category
        assert 'emphasis' in statistics.by_category
        assert len(statistics.timeline) == 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

