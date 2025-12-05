"""
Japanese NLP Module for Text Processing

Provides Japanese text tokenization, normalization, and processing
using MeCab tokenizer.
"""

import MeCab
import unicodedata
import re
from typing import List, Set, Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class Token:
    """Represents a tokenized word"""
    surface: str  # Original text
    base_form: str  # Dictionary form
    reading: str  # Hiragana reading
    pos: str  # Part of speech
    pos_detail: str  # Detailed POS


class JapaneseNLP:
    """
    Japanese text processing with MeCab tokenizer.
    
    Provides:
    - Tokenization into morphemes
    - Text normalization (full-width to half-width, kanji numbers)
    - Stop word removal
    - Reading extraction (furigana)
    """
    
    # Japanese stop words (particles, common verbs, etc.)
    JAPANESE_STOP_WORDS = {
        # Particles
        'は', 'の', 'を', 'に', 'が', 'と', 'で', 'から', 'まで', 'より',
        'へ', 'や', 'か', 'も', 'ね', 'よ', 'な', 'わ', 'ば', 'ど',
        # Common verbs and auxiliaries
        'する', 'ある', 'いる', 'なる', 'れる', 'られる', 'せる', 'させる',
        'です', 'ます', 'ません', 'でした', 'ました', 'ない', 'た', 'だ',
        # Demonstratives
        'この', 'その', 'あの', 'どの', 'こう', 'そう', 'ああ', 'どう',
        'ここ', 'そこ', 'あそこ', 'どこ', 'こちら', 'そちら', 'あちら', 'どちら',
        # Common words
        'こと', 'もの', 'ため', 'よう', 'ところ', 'とき', 'ほど', 'くらい',
        # Additional functional words (based on JSON analysis)
        'なし', 'あり',  # Nashi (không có), Ari (có) - common in tables
        'さん', 'くん', 'ちゃん',  # Honorifics
        'スライド', 'ページ',  # Slide metadata
        # Katakana forms (common in technical contexts)
        'スル', 'コト', 'イル', 'ナシ',  # Katakana versions of suru, koto, iru, nashi
    }
    
    # English stop words
    ENGLISH_STOP_WORDS = {
        'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
        'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
        'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
        'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
        'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each',
        'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
        'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
        # OCR noise patterns (based on JSON analysis)
        'ee', 'ae', 'mm', 'oo', 'ii', 'uu', 'aa',  # Repeated letters from OCR errors
        'th', 'ph', 'ch', 'ng',  # Vietnamese consonants standing alone (OCR word splitting errors)
    }
    
    # Vietnamese stop words
    VIETNAMESE_STOP_WORDS = {
        'của', 'là', 'các', 'những', 'để', 'với', 'trong', 'trên', 'về',
        'cho', 'từ', 'đến', 'và', 'hoặc', 'nhưng', 'mà', 'nếu', 'thì',
        'khi', 'sau', 'trước', 'đã', 'đang', 'sẽ', 'có', 'không', 'được',
        'bị', 'bởi', 'vì', 'do', 'nên', 'nữa', 'rồi', 'cũng', 'đều',
        'mỗi', 'mọi', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy',
        'tám', 'chín', 'mười', 'này', 'đó', 'kia', 'đây', 'đấy'
    }
    
    # Combined stop words
    STOP_WORDS = JAPANESE_STOP_WORDS | ENGLISH_STOP_WORDS | VIETNAMESE_STOP_WORDS
    
    # Kanji numbers to Arabic
    KANJI_NUMBERS = {
        '零': '0', '〇': '0', 'ゼロ': '0',
        '一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
        '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
        '百': '100', '千': '1000', '万': '10000',
    }
    
    def __init__(self, use_stop_words: bool = True):
        """
        Initialize Japanese NLP processor.
        
        Args:
            use_stop_words: Whether to filter stop words
        """
        self.use_stop_words = use_stop_words
        
        try:
            # Initialize MeCab with ipadic dictionary
            self.mecab = MeCab.Tagger()
            logger.info("MeCab tokenizer initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize MeCab: {e}")
            raise
            
    def tokenize(self, text: str) -> List[Token]:
        """
        Tokenize Japanese text into morphemes.
        
        Args:
            text: Input text
            
        Returns:
            List of Token objects
        """
        if not text:
            return []
            
        tokens = []
        node = self.mecab.parseToNode(text)
        
        while node:
            if node.surface:  # Skip BOS/EOS nodes
                features = node.feature.split(',')
                
                token = Token(
                    surface=node.surface,
                    base_form=features[6] if len(features) > 6 else node.surface,
                    reading=features[7] if len(features) > 7 else node.surface,
                    pos=features[0] if len(features) > 0 else "unknown",
                    pos_detail=features[1] if len(features) > 1 else "unknown"
                )
                tokens.append(token)
                
            node = node.next
            
        return tokens
        
    def _is_japanese_text(self, text: str) -> bool:
        """
        Check if text contains Japanese characters.
        
        Uses lightweight regex check instead of langdetect.
        """
        return bool(re.search(r'[\u3000-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', text))
    
    def _tokenize_latin(self, text: str) -> List[str]:
        """
        Tokenize Latin text (English/Vietnamese) using regex.
        
        Splits on whitespace and punctuation, keeps alphanumeric tokens.
        """
        # Normalize text first (NFKC)
        normalized = unicodedata.normalize('NFKC', text)
        
        # Split on whitespace and punctuation
        tokens = re.findall(r'\b\w+\b', normalized)
        
        # Filter: keep only meaningful tokens
        result = []
        for token in tokens:
            # Skip single characters (except 'I', 'a' in English context)
            if len(token) < 2:
                continue
            # Skip pure numbers (unless they're part of technical terms)
            if token.isdigit() and len(token) < 3:
                continue
            result.append(token.lower())
        
        return result
    
    def extract_keywords(self, text: str, is_ocr_text: bool = False) -> List[str]:
        """
        Extract content keywords using hybrid approach.
        
        - Japanese text: Uses MeCab tokenization
        - Latin text: Uses regex tokenization
        - Mixed content: MeCab handles it (keeps "GitHub" as one token)
        - OCR text: Uses more lenient fallback (70% threshold instead of 50%)
        
        Args:
            text: Input text
            is_ocr_text: Whether text comes from OCR (more lenient fallback)
            
        Returns:
            List of keyword base forms
        """
        if not text:
            return []
        
        # Normalize text first (NFKC for full-width/half-width)
        normalized = unicodedata.normalize('NFKC', text)
        
        # Check if contains Japanese
        has_japanese = self._is_japanese_text(normalized)
        
        keywords = []
        
        if has_japanese:
            # Use MeCab for Japanese (handles mixed content well)
            try:
                tokens = self.tokenize(normalized)
                
                if not tokens:
                    # Empty tokens, fallback to regex
                    latin_tokens = self._tokenize_latin(normalized)
                    keywords.extend(latin_tokens)
                else:
                    # Check if MeCab failed (too many unknown/single char tokens)
                    # OCR text: more lenient threshold (70% vs 50%)
                    threshold = 0.7 if is_ocr_text else 0.5
                    unknown_count = sum(1 for t in tokens if t.pos == 'unknown' or len(t.surface) == 1)
                    
                    if unknown_count > len(tokens) * threshold:
                        # MeCab failed, fallback to regex (only log if not OCR)
                        if not is_ocr_text:
                            logger.debug(f"MeCab returned too many unknowns ({unknown_count}/{len(tokens)}), falling back to regex")
                        latin_tokens = self._tokenize_latin(normalized)
                        keywords.extend(latin_tokens)
                    else:
                        # Process MeCab tokens
                        for token in tokens:
                            # Keep nouns, verbs, and adjectives
                            if token.pos in ['名詞', '動詞', '形容詞']:
                                # Generalized stopwords check (Hiragana normalization)
                                if self.use_stop_words:
                                    # Check base form
                                    if token.base_form in self.STOP_WORDS:
                                        continue
                                    # Convert Katakana -> Hiragana to check stopwords
                                    # Example: デキル (dekiru in Katakana) -> できる (in Hiragana)
                                    hiragana_form = self.to_hiragana(token.base_form)
                                    if hiragana_form in self.STOP_WORDS:
                                        continue
                                
                                # Skip single character words
                                if len(token.base_form) < 2:
                                    continue
                                keywords.append(token.base_form)
            except Exception as e:
                # Only log if not OCR (OCR errors are expected)
                if not is_ocr_text:
                    logger.warning(f"MeCab tokenization failed: {e}, falling back to regex")
                # Fallback to regex
                latin_tokens = self._tokenize_latin(normalized)
                keywords.extend(latin_tokens)
        else:
            # Pure Latin text - use regex tokenization
            latin_tokens = self._tokenize_latin(normalized)
            keywords.extend(latin_tokens)
        
        # Generalized noise filtering (Final validation)
        valid_keywords = []
        
        for kw in keywords:
            # Rule 1: Japanese text - Keep (already filtered stopwords above)
            if self._is_japanese_text(kw):
                valid_keywords.append(kw)
                continue
            
            # Rule 2: Latin text (English/Vietnamese) - Filter using Regex Rules (Generalization)
            
            # Rule A: Filter repeated character patterns (OCR Noise: aaa, mmm, zz)
            if re.match(r'^(.)\1+$', kw):
                continue  # Skip repeated character words
            
            # Rule B: Filter single character words (except numbers)
            if len(kw) < 2 and not kw.isdigit():
                continue  # Skip single char words
            
            # Rule C: Smart 2-character word handling
            if len(kw) == 2:
                # Keep: UPPERCASE (IT, AI, UI), Numbers (5G)
                # Skip: lowercase (is, at, mm, hh) -> Stopwords/Noise
                if not kw.isupper() and not kw.isdigit():
                    continue  # Skip lowercase 2-char words
            
            # Rule D: Stop words check
            if self.use_stop_words:
                if kw.lower() in self.ENGLISH_STOP_WORDS or kw.lower() in self.VIETNAMESE_STOP_WORDS:
                    continue
            
            valid_keywords.append(kw)
        
        return valid_keywords
        
    def normalize_text(self, text: str) -> str:
        """
        Normalize Japanese text.
        
        - Convert full-width to half-width (alphanumeric)
        - Convert kanji numbers to Arabic
        - Normalize whitespace
        
        Args:
            text: Input text
            
        Returns:
            Normalized text
        """
        if not text:
            return ""
            
        # Convert full-width alphanumeric to half-width
        text = self._full_to_half(text)
        
        # Convert kanji numbers to Arabic
        text = self._kanji_to_arabic(text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
        
    def _full_to_half(self, text: str) -> str:
        """Convert full-width alphanumeric to half-width"""
        result = []
        for char in text:
            code = ord(char)
            # Full-width alphanumeric range: 0xFF01-0xFF5E
            # Convert to half-width: 0x0021-0x007E
            if 0xFF01 <= code <= 0xFF5E:
                result.append(chr(code - 0xFEE0))
            else:
                result.append(char)
        return ''.join(result)
        
    def _kanji_to_arabic(self, text: str) -> str:
        """Convert simple kanji numbers to Arabic numerals"""
        for kanji, arabic in self.KANJI_NUMBERS.items():
            text = text.replace(kanji, arabic)
        return text
        
    def get_reading(self, text: str) -> str:
        """
        Get hiragana reading of text.
        
        Args:
            text: Input text
            
        Returns:
            Hiragana reading
        """
        tokens = self.tokenize(text)
        readings = [token.reading for token in tokens]
        return ''.join(readings)
        
    def to_hiragana(self, text: str) -> str:
        """
        Convert katakana to hiragana.
        
        Args:
            text: Input text
            
        Returns:
            Text with katakana converted to hiragana
        """
        result = []
        for char in text:
            code = ord(char)
            # Katakana range: 0x30A0-0x30FF
            # Hiragana range: 0x3040-0x309F
            if 0x30A0 <= code <= 0x30FF:
                result.append(chr(code - 0x60))
            else:
                result.append(char)
        return ''.join(result)
        
    def segment_sentences(self, text: str) -> List[str]:
        """
        Segment text into sentences using Japanese punctuation.
        
        Args:
            text: Input text
            
        Returns:
            List of sentences
        """
        # Japanese sentence endings
        endings = ['。', '！', '？', '!', '?']
        
        sentences = []
        current = []
        
        for char in text:
            current.append(char)
            if char in endings:
                sentence = ''.join(current).strip()
                if sentence:
                    sentences.append(sentence)
                current = []
                
        # Add remaining text
        if current:
            sentence = ''.join(current).strip()
            if sentence:
                sentences.append(sentence)
                
        return sentences
        
    def extract_content_words(self, text: str, 
                             include_pos: Optional[Set[str]] = None) -> List[str]:
        """
        Extract content words (non-functional words).
        
        Args:
            text: Input text
            include_pos: POS tags to include (default: nouns, verbs, adjectives)
            
        Returns:
            List of content words
        """
        if include_pos is None:
            include_pos = {'名詞', '動詞', '形容詞'}
            
        tokens = self.tokenize(text)
        words = []
        
        for token in tokens:
            if token.pos in include_pos:
                if not self.use_stop_words or token.base_form not in self.STOP_WORDS:
                    words.append(token.base_form)
                    
        return words
