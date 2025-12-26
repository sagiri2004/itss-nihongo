"""
PDF Processing Module for Phase 4: Slide Synchronization

This module provides functionality to extract and process content from PDF slides
for matching with speech transcripts.

Components:
- PDFExtractor: Extract text and structure from PDF files
- KeywordIndexer: TF-IDF based keyword extraction and indexing
- TextSummarizer: Text summarization (LLM-based)
"""

from .pdf_extractor import PDFExtractor
from .keyword_indexer import KeywordIndexer
from .text_summarizer import TextSummarizer

__all__ = [
    'PDFExtractor',
    'KeywordIndexer',
    'TextSummarizer',
]
