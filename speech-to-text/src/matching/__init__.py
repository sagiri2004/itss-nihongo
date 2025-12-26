"""
Matching Module for Transcript-Slide Synchronization

Implements multi-pass matching algorithm:
1. Exact keyword matching
2. Fuzzy matching (Levenshtein distance)
3. Score combination with temporal smoothing

Note: Semantic matching (embedding-based) has been removed to reduce Docker image size.
All processing now uses Gemini API instead of local models.
"""

from .exact_matcher import ExactMatcher
from .fuzzy_matcher import FuzzyMatcher
from .score_combiner import ScoreCombiner, MatchResult

__all__ = [
    'ExactMatcher',
    'FuzzyMatcher',
    'ScoreCombiner',
    'MatchResult',
]
