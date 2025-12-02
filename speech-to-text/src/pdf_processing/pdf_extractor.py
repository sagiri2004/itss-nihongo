"""
PDF Text Extractor for Japanese Slides

Extracts text, structure, and metadata from PDF files using PyMuPDF.
Supports Japanese text and identifies slide structure (titles, bullets, body).
"""

import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from pathlib import Path
import json
import logging
import re
import unicodedata

logger = logging.getLogger(__name__)


@dataclass
class TextBlock:
    """Represents a text block extracted from PDF"""
    text: str
    page_number: int
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)
    font_size: float
    font_name: str
    block_type: str  # 'title', 'heading', 'bullet', 'body'
    position: int  # Position within page


@dataclass
class SlideContent:
    """Represents processed content from one slide"""
    page_number: int
    title: Optional[str]
    headings: List[str]
    bullets: List[str]
    body: List[str]
    all_text: str
    text_blocks: List[TextBlock]


class PDFExtractor:
    """
    Extract text and structure from PDF slides.
    
    Uses PyMuPDF to extract text with position and font information,
    then identifies slide structure based on heuristics.
    """
    
    def __init__(self, 
                 title_font_size_threshold: float = 18.0,
                 heading_font_size_threshold: float = 14.0,
                 bullet_chars: str = "•●○◦▪▫■□-・",
                 header_footer_threshold: float = 0.1,
                 enable_coordinate_sorting: bool = True,
                 enable_noise_filtering: bool = True,
                 enable_header_footer_filtering: bool = True):
        """
        Initialize PDF extractor.
        
        Args:
            title_font_size_threshold: Font size threshold for title detection
            heading_font_size_threshold: Font size threshold for heading detection
            bullet_chars: Characters that indicate bullet points
            header_footer_threshold: Percentage of page height for header/footer zones (default: 0.1 = 10%)
            enable_coordinate_sorting: Enable smart coordinate-based sorting
            enable_noise_filtering: Enable noise/garbage text filtering
            enable_header_footer_filtering: Enable header/footer removal
        """
        self.title_font_size_threshold = title_font_size_threshold
        self.heading_font_size_threshold = heading_font_size_threshold
        self.bullet_chars = bullet_chars
        self.header_footer_threshold = header_footer_threshold
        self.enable_coordinate_sorting = enable_coordinate_sorting
        self.enable_noise_filtering = enable_noise_filtering
        self.enable_header_footer_filtering = enable_header_footer_filtering
        
        # Whitelist for technical acronyms (exempt from caps ratio check)
        self.acronym_whitelist = {
            'API', 'AWS', 'DB', 'UI', 'UX', 'JSON', 'XML', 'HTTP', 'HTTPS',
            'REST', 'SOAP', 'SQL', 'NoSQL', 'HTML', 'CSS', 'JS', 'TS',
            'GitHub', 'Git', 'SVN', 'CI', 'CD', 'IDE', 'SDK', 'OS',
            'CPU', 'GPU', 'RAM', 'SSD', 'HDD', 'URL', 'URI', 'JWT'
        }
        
        # Pattern for page numbers in footer
        self.page_number_patterns = [
            re.compile(r'^\d+$'),  # "1", "23"
            re.compile(r'^\d+\s*/\s*\d+$'),  # "1/34", "1 / 34"
            re.compile(r'^Page\s+\d+$', re.IGNORECASE),  # "Page 1"
            re.compile(r'^ページ\s*\d+$'),  # "ページ 1"
        ]
        
    def extract_from_file(self, pdf_path: str) -> List[SlideContent]:
        """
        Extract content from PDF file.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            List of SlideContent objects, one per page
        """
        logger.info(f"Extracting content from PDF: {pdf_path}")
        
        try:
            doc = fitz.open(pdf_path)
            slides = []
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                slide_content = self._extract_page_content(page, page_num + 1)
                slides.append(slide_content)
                
            doc.close()
            logger.info(f"Extracted {len(slides)} slides from PDF")
            return slides
            
        except Exception as e:
            logger.error(f"Error extracting PDF content: {e}")
            raise
            
    def _extract_page_content(self, page: fitz.Page, page_number: int) -> SlideContent:
        """Extract and structure content from a single page"""
        
        # Extract text blocks with metadata
        text_blocks = self._extract_text_blocks(page, page_number)
        
        # Get page dimensions for OCR decision
        page_rect = page.rect
        page_area = (page_rect.width / 72.0) * (page_rect.height / 72.0)  # Square inches
        all_text_preview = " ".join([block.text for block in text_blocks])
        
        # Generalized OCR trigger decision (Signal-to-Noise Ratio)
        if self._should_trigger_ocr(all_text_preview, page_area):
            logger.info(f"Page {page_number}: Low text quality detected (valid_ratio check). Fallback to OCR.")
            ocr_text = self._ocr_page(page)
            
            if ocr_text.strip():
                # Only use OCR if it provides more meaningful content than native text
                if len(ocr_text.strip()) > len(all_text_preview.strip()):
                    # Clean OCR text line-by-line to remove noise
                    cleaned_ocr_text = self._clean_ocr_text(ocr_text)
                    logger.info(f"Page {page_number}: OCR extracted {len(ocr_text)} chars, cleaned to {len(cleaned_ocr_text)} chars")
                    
                    if cleaned_ocr_text.strip():
                        # Create synthetic text block from cleaned OCR text
                        ocr_block = TextBlock(
                            text=cleaned_ocr_text,
                            page_number=page_number,
                            bbox=(0, 0, page_rect.width, page_rect.height),
                            font_size=12.0,  # Default
                            font_name="OCR",
                            block_type="body",
                            position=0
                        )
                        text_blocks = [ocr_block]
                    else:
                        logger.warning(f"Page {page_number}: OCR text was filtered out as noise")
                else:
                    logger.debug(f"Page {page_number}: OCR text not better than native, keeping native text")
            else:
                logger.error(f"Page {page_number}: OCR failed to extract text")
        
        # Classify blocks by type
        classified_blocks = self._classify_blocks(text_blocks)
        
        # Organize into structure
        title = self._extract_title(classified_blocks)
        headings = self._extract_headings(classified_blocks)
        bullets = self._extract_bullets(classified_blocks)
        body = self._extract_body(classified_blocks)
        
        # Clean special characters from all text components
        title = self._clean_special_characters(title) if title else None
        headings = [self._clean_special_characters(h) for h in headings]
        bullets = [self._clean_special_characters(b) for b in bullets]
        body = [self._clean_special_characters(b) for b in body]
        
        # Combine all text
        all_text = " ".join([
            title or "",
            " ".join(headings),
            " ".join(bullets),
            " ".join(body)
        ]).strip()
        
        return SlideContent(
            page_number=page_number,
            title=title,
            headings=headings,
            bullets=bullets,
            body=body,
            all_text=all_text,
            text_blocks=text_blocks
        )
        
    def _extract_text_blocks(self, page: fitz.Page, page_number: int) -> List[TextBlock]:
        """
        Extract raw text blocks with metadata from page.
        
        Includes coordinate-based sorting and noise filtering.
        """
        text_blocks = []
        blocks = page.get_text("dict")["blocks"]
        page_rect = page.rect
        page_height = page_rect.height
        
        for block_idx, block in enumerate(blocks):
            if block["type"] == 0:  # Text block
                for line in block.get("lines", []):
                    for span in line.get("spans", []):
                        text = span["text"].strip()
                        if not text:
                            continue
                        
                        # Noise filtering
                        if self.enable_noise_filtering and self._is_noise(text):
                            logger.debug(f"Filtered noise text: {text[:50]}")
                            continue
                        
                        bbox = (span["bbox"][0], span["bbox"][1], 
                               span["bbox"][2], span["bbox"][3])
                        
                        # Header/Footer filtering (skip for first page)
                        if (self.enable_header_footer_filtering and 
                            page_number > 1 and 
                            self._is_header_footer(bbox, page_height, text)):
                            logger.debug(f"Filtered header/footer: {text[:50]}")
                            continue
                        
                        text_block = TextBlock(
                            text=text,
                            page_number=page_number,
                            bbox=bbox,
                            font_size=span["size"],
                            font_name=span["font"],
                            block_type="unknown",  # Will be classified later
                            position=block_idx
                        )
                        text_blocks.append(text_block)
        
        # Coordinate-based sorting (Priority 1)
        if self.enable_coordinate_sorting:
            text_blocks = self._sort_text_blocks_by_coordinates(text_blocks)
        
        return text_blocks
    
    def _sort_text_blocks_by_coordinates(self, text_blocks: List[TextBlock]) -> List[TextBlock]:
        """
        Sort text blocks by coordinates: top-to-bottom, then left-to-right.
        Uses adaptive tolerance based on font height.
        """
        if not text_blocks:
            return text_blocks
        
        def get_sort_key(block: TextBlock) -> Tuple[float, float]:
            """Return (y, x) for sorting"""
            x0, y0, x1, y1 = block.bbox
            # Use top-left corner (y0, x0)
            # Normalize Y with adaptive tolerance grouping
            return (y0, x0)
        
        # First pass: Sort by Y (top to bottom) with adaptive tolerance
        sorted_blocks = sorted(text_blocks, key=get_sort_key)
        
        # Group blocks into rows based on adaptive Y tolerance
        rows = []
        current_row = [sorted_blocks[0]]
        current_y = sorted_blocks[0].bbox[1]
        
        for block in sorted_blocks[1:]:
            y0 = block.bbox[1]
            # Adaptive tolerance: font_height * 0.5
            font_height = block.font_size * 1.2  # Approximate line height
            tolerance = font_height * 0.5
            
            if abs(y0 - current_y) <= tolerance:
                # Same row
                current_row.append(block)
            else:
                # New row - sort current row by X, then add to rows
                current_row.sort(key=lambda b: b.bbox[0])
                rows.append(current_row)
                current_row = [block]
                current_y = y0
        
        # Sort last row
        if current_row:
            current_row.sort(key=lambda b: b.bbox[0])
            rows.append(current_row)
        
        # Flatten rows back to list
        result = []
        for row in rows:
            result.extend(row)
        
        return result
    
    def _is_noise(self, text: str) -> bool:
        """
        Check if text is noise/garbage.
        
        Returns True if text should be filtered out.
        """
        # Clean text for analysis
        cleaned = text.strip()
        
        # Rule 1: Too short and not a number
        if len(cleaned) < 2 and not cleaned.isdigit():
            return True
        
        # Rule 2: Check for alternating case pattern (xXy, aRb)
        if re.search(r'[a-z][A-Z][a-z]', cleaned):
            return True
        
        # Rule 3: Check for repeated characters (aaaa, xxxx)
        if re.search(r'(.)\1{3,}', cleaned):
            return True
        
        # Rule 4: Check caps ratio (but allow acronyms)
        if len(cleaned) >= 3:
            caps_count = sum(1 for c in cleaned if c.isupper())
            caps_ratio = caps_count / len(cleaned)
            
            # If > 70% caps and not in whitelist
            if caps_ratio > 0.7 and cleaned.upper() not in self.acronym_whitelist:
                return True
        
        # Rule 5: Unicode garbage (Private Use, Not Assigned)
        for char in cleaned:
            category = unicodedata.category(char)
            if category in ('Co', 'Cn'):  # Private Use, Not Assigned
                return True
        
        return False
    
    def _is_header_footer(self, bbox: Tuple[float, float, float, float], 
                         page_height: float, text: str) -> bool:
        """
        Check if text block is in header/footer zone.
        
        Args:
            bbox: Bounding box (x0, y0, x1, y1)
            page_height: Total page height
            text: Text content
            
        Returns:
            True if should be filtered as header/footer
        """
        x0, y0, x1, y1 = bbox
        threshold_pixels = page_height * self.header_footer_threshold
        
        # Check if in header zone (top 10%)
        if y0 < threshold_pixels:
            return True
        
        # Check if in footer zone (bottom 10%)
        if y0 > (page_height - threshold_pixels):
            # Additional check: page number pattern
            cleaned_text = text.strip()
            for pattern in self.page_number_patterns:
                if pattern.match(cleaned_text):
                    return True
            return True
        
        return False
        
    def _classify_blocks(self, text_blocks: List[TextBlock]) -> List[TextBlock]:
        """Classify text blocks by type (title, heading, bullet, body)"""
        
        if not text_blocks:
            return text_blocks
            
        # Find max font size for relative comparison
        max_font_size = max(block.font_size for block in text_blocks)
        
        for block in text_blocks:
            # Classify by font size and position
            if block.position == 0 and block.font_size >= self.title_font_size_threshold:
                block.block_type = "title"
            elif block.font_size >= self.heading_font_size_threshold:
                block.block_type = "heading"
            elif any(block.text.startswith(char) for char in self.bullet_chars):
                block.block_type = "bullet"
            else:
                block.block_type = "body"
                
        return text_blocks
        
    def _extract_title(self, text_blocks: List[TextBlock]) -> Optional[str]:
        """Extract slide title (first title block)"""
        titles = [block.text for block in text_blocks if block.block_type == "title"]
        return titles[0] if titles else None
        
    def _extract_headings(self, text_blocks: List[TextBlock]) -> List[str]:
        """Extract headings"""
        return [block.text for block in text_blocks if block.block_type == "heading"]
        
    def _extract_bullets(self, text_blocks: List[TextBlock]) -> List[str]:
        """Extract bullet points"""
        bullets = []
        for block in text_blocks:
            if block.block_type == "bullet":
                # Remove bullet character
                text = block.text
                for char in self.bullet_chars:
                    if text.startswith(char):
                        text = text[len(char):].strip()
                        break
                bullets.append(text)
        return bullets
        
    def _extract_body(self, text_blocks: List[TextBlock]) -> List[str]:
        """Extract body text"""
        return [block.text for block in text_blocks if block.block_type == "body"]
    
    def _should_trigger_ocr(self, text: str, page_area: float) -> bool:
        """
        Generalized decision: Should OCR be triggered?
        
        Uses Signal-to-Noise Ratio instead of hardcoded thresholds.
        Works for any PDF type (Native, Scan, Hybrid).
        
        Args:
            text: Extracted native text from PDF
            page_area: Page area in square inches
            
        Returns:
            True if OCR should be triggered (text quality is low)
        """
        clean_text = text.strip()
        
        # Rule 1: Empty text -> Definitely need OCR
        if not clean_text:
            return True
        
        char_count = len(clean_text)
        
        # Rule 2: Minimum content check (generalized)
        # A slide page should have at least some meaningful content
        # Using relative threshold: at least 50 chars for a typical slide
        if char_count < 50:
            return True
        
        # Rule 3: Text quality check (Garbage Detection)
        # Count valid alphanumeric characters
        valid_chars = sum(1 for c in clean_text if c.isalnum())
        valid_ratio = valid_chars / char_count if char_count > 0 else 0
        
        # If less than 50% are valid characters -> Text layer is corrupted
        # (too many special chars, spaces, or garbage)
        if valid_ratio < 0.5:
            return True
        
        # Rule 4: Encoding error detection (Mojibake)
        # Check for Private Use Area (Co) and Not Assigned (Cn) characters
        unknown_chars = sum(
            1 for c in clean_text 
            if unicodedata.category(c) in ('Co', 'Cn')
        )
        if char_count > 0 and (unknown_chars / char_count) > 0.1:
            # More than 10% unknown characters -> Encoding issue
            return True
        
        # Rule 5: Density check (as fallback)
        # Calculate characters per square inch
        density = char_count / page_area if page_area > 0 else 0
        # Very low density suggests scanned content
        MIN_DENSITY = 5.0  # Lower threshold for generalization
        if density < MIN_DENSITY:
            return True
        
        return False
    
    def _clean_ocr_text(self, ocr_text: str) -> str:
        """
        Clean OCR text line-by-line to remove noise.
        
        Filters out noise lines and cleans table characters using generalized rules.
        
        Args:
            ocr_text: Raw OCR output text
            
        Returns:
            Cleaned OCR text
        """
        if not ocr_text:
            return ocr_text
        
        lines = ocr_text.split('\n')
        valid_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Apply noise filtering to each line
            if self.enable_noise_filtering and self._is_noise(line):
                logger.debug(f"Filtered OCR noise line: {line[:50]}")
                continue
            
            # Generalized table character cleaning
            # Detect if line contains too many table separators (likely a table border line)
            table_separator_count = len(re.findall(r'[|│┃]', line))
            if table_separator_count > 3:
                # Line has too many separators -> likely table border, replace with space
                line = re.sub(r'[|│┃]', ' ', line)
            else:
                # Few separators -> might be intentional, just normalize
                line = re.sub(r'[|│┃]{2,}', ' ', line)  # Multiple consecutive separators
            
            # Clean other common OCR artifacts
            line = re.sub(r'[|_]{2,}', ' ', line)  # Multiple | or _ together
            
            # Normalize whitespace
            line = re.sub(r'\s+', ' ', line).strip()
            
            if line:  # Only add non-empty lines
                valid_lines.append(line)
        
        return '\n'.join(valid_lines)
    
    def _clean_special_characters(self, text: str) -> str:
        """
        Clean special characters using generalized whitelist approach.
        
        Detects table patterns and handles them intelligently.
        Keeps: Letters (all languages), Numbers, Basic punctuation, Spaces
        Removes: Emoji, Symbols, Special characters, Table artifacts
        """
        if not text:
            return text
        
        # Generalized: Detect if text contains table-like patterns
        # If line has too many table separators, treat as table border
        table_separator_pattern = r'[|│┃┆┊]'
        table_separator_count = len(re.findall(table_separator_pattern, text))
        
        # If text has many table separators (>3), likely table structure
        # Replace separators with space to split words
        if table_separator_count > 3:
            text = re.sub(table_separator_pattern, ' ', text)
        else:
            # Few separators -> might be intentional, just normalize consecutive ones
            text = re.sub(r'[|│┃]{2,}', ' ', text)
        
        # Normalize Unicode (NFKC: full-width to half-width, etc.)
        text = unicodedata.normalize('NFKC', text)
        
        # Generalized: Keep only meaningful character categories
        # Remove Symbols (So), Marks (Mn, Mc, Me), and other non-text categories
        valid_chars = []
        for char in text:
            category = unicodedata.category(char)
            
            # Keep: Letter (L*), Number (N*), Space (Z*), Punctuation (P*)
            if category.startswith(('L', 'N', 'Z', 'P')):
                valid_chars.append(char)
            else:
                # Replace symbols, marks, etc. with space
                valid_chars.append(' ')
        
        # Normalize multiple spaces to single space
        cleaned = ''.join(valid_chars)
        cleaned = re.sub(r'\s+', ' ', cleaned)
        return cleaned.strip()
    
    def _ocr_page(self, page: fitz.Page) -> str:
        """
        Perform OCR on a PDF page using Tesseract.
        
        Per plan.md Phase 2 Week 3: "You can use Tesseract for local OCR or 
        Google Cloud Vision API for cloud-based OCR. For the initial implementation, 
        try Tesseract first since it's free."
        
        Args:
            page: PyMuPDF page object
            
        Returns:
            OCR'd text (empty string if OCR fails)
        """
        try:
            import pytesseract
            from PIL import Image
            import io
            
            # Render page as high-resolution image for better OCR
            # Priority 4: Scale up 2-3x for better OCR accuracy
            zoom = 2.5  # 2.5x zoom for clarity (increased from 2.0)
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            img = Image.open(io.BytesIO(img_data))
            
            # Run Tesseract OCR with multi-language support
            # Priority: Japanese (main), then English, then Vietnamese
            # PSM 6 = Assume a single uniform block of text
            text = pytesseract.image_to_string(
                img,
                lang='jpn+eng+vie',  # Japanese + English + Vietnamese
                config='--psm 6'
            )
            
            return text.strip()
            
        except ImportError:
            logger.warning(
                "Tesseract not available. Install with: "
                "brew install tesseract tesseract-lang (macOS) or "
                "apt-get install tesseract-ocr tesseract-ocr-jpn (Ubuntu)"
            )
            return ""
        except Exception as e:
            logger.error(f"OCR failed: {e}")
            return ""
        
    def extract_metadata(self, pdf_path: str) -> Dict[str, Any]:
        """
        Extract PDF metadata.
        
        Args:
            pdf_path: Path to PDF file
            
        Returns:
            Dictionary with metadata (page_count, title, author, etc.)
        """
        try:
            doc = fitz.open(pdf_path)
            metadata = {
                "page_count": len(doc),
                "title": doc.metadata.get("title", ""),
                "author": doc.metadata.get("author", ""),
                "subject": doc.metadata.get("subject", ""),
                "creator": doc.metadata.get("creator", ""),
                "producer": doc.metadata.get("producer", ""),
                "format": doc.metadata.get("format", ""),
            }
            doc.close()
            return metadata
        except Exception as e:
            logger.error(f"Error extracting PDF metadata: {e}")
            raise
    
    def export_to_file(
        self,
        slides: List[SlideContent],
        output_path: str,
        format: str = "json"
    ) -> str:
        """
        Export extracted slide content to a file for inspection.
        
        Args:
            slides: List of SlideContent objects to export
            output_path: Path to output file
            format: Export format - "json" or "text" (default: "json")
            
        Returns:
            Path to the exported file
            
        Raises:
            ValueError: If format is not supported
        """
        output_file = Path(output_path)
        
        if format.lower() == "json":
            return self._export_json(slides, output_file)
        elif format.lower() == "text":
            return self._export_text(slides, output_file)
        else:
            raise ValueError(f"Unsupported format: {format}. Use 'json' or 'text'")
    
    def _export_json(self, slides: List[SlideContent], output_file: Path) -> str:
        """Export slides to JSON file."""
        output_data = {
            "total_slides": len(slides),
            "slides": []
        }
        
        for slide in slides:
            slide_data = {
                "page_number": slide.page_number,
                "title": slide.title,
                "headings": slide.headings,
                "bullets": slide.bullets,
                "body": slide.body,
                "all_text": slide.all_text,
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
        
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Exported {len(slides)} slides to JSON: {output_file}")
        return str(output_file)
    
    def _export_text(self, slides: List[SlideContent], output_file: Path) -> str:
        """Export slides to human-readable text file."""
        with open(output_file, "w", encoding="utf-8") as f:
            f.write("=" * 80 + "\n")
            f.write(f"PDF EXTRACTION RESULTS - {len(slides)} SLIDES\n")
            f.write("=" * 80 + "\n\n")
            
            for slide in slides:
                f.write(f"\n{'=' * 80}\n")
                f.write(f"SLIDE {slide.page_number}\n")
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
                
                f.write("ALL TEXT:\n")
                f.write(f"{slide.all_text}\n\n")
                
                if slide.text_blocks:
                    f.write("TEXT BLOCKS (with metadata):\n")
                    for i, block in enumerate(slide.text_blocks, 1):
                        f.write(f"  Block {i} [{block.block_type}]:\n")
                        f.write(f"    Text: {block.text}\n")
                        f.write(f"    Font: {block.font_name} ({block.font_size}pt)\n")
                        f.write(f"    Position: {block.position}\n")
                        f.write(f"    BBox: {block.bbox}\n")
                        f.write("\n")
                
                f.write("\n")
        
        logger.info(f"Exported {len(slides)} slides to text file: {output_file}")
        return str(output_file)
