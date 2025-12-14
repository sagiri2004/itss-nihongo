"""
Audio chunk handler and validator for streaming pipeline.

Handles:
- Chunk size validation tolerating 100-300ms audio buffers
- Buffer management
- Chunk timing control
- LINEAR16 format validation
"""

import logging
import time
from typing import Optional
from dataclasses import dataclass

from .errors import AudioChunkError

logger = logging.getLogger(__name__)


@dataclass
class AudioChunkMetrics:
    """Metrics for monitoring audio chunk processing."""
    total_chunks: int = 0
    total_bytes: int = 0
    valid_chunks: int = 0
    invalid_chunks: int = 0
    avg_chunk_size: float = 0.0
    last_chunk_time: float = 0.0


class AudioChunkValidator:
    """
    Validates audio chunks for streaming.
    
    Requirements:
    - Format: LINEAR16 (16-bit signed PCM)
    - Sample Rate: 16kHz
    - Channels: Mono
    - Chunk Size: 3200-9600 bytes (~100-300ms)
    """
    
    # Chunk size limits for 16kHz mono LINEAR16
    MIN_CHUNK_SIZE = 3200  # 100ms: 16000 samples/s * 0.1s * 2 bytes
    MAX_CHUNK_SIZE = 9600  # 300ms: tolerance for browser audio buffers
    
    # Audio format constants
    SAMPLE_RATE = 16000  # 16kHz
    BYTES_PER_SAMPLE = 2  # 16-bit = 2 bytes
    CHANNELS = 1  # Mono
    
    @classmethod
    def validate_chunk_size(cls, chunk: bytes) -> bool:
        """
        Validate chunk size is within acceptable range.
        
        Args:
            chunk: Audio chunk bytes
            
        Returns:
            True if valid, False otherwise
        """
        size = len(chunk)
        return cls.MIN_CHUNK_SIZE <= size <= cls.MAX_CHUNK_SIZE
    
    @classmethod
    def calculate_chunk_duration_ms(cls, chunk: bytes) -> float:
        """
        Calculate audio duration in milliseconds.
        
        Args:
            chunk: Audio chunk bytes
            
        Returns:
            Duration in milliseconds
        """
        num_samples = len(chunk) // cls.BYTES_PER_SAMPLE
        duration_seconds = num_samples / cls.SAMPLE_RATE
        return duration_seconds * 1000
    
    @classmethod
    def validate_chunk(cls, chunk: bytes, strict: bool = True) -> None:
        """
        Validate audio chunk meets all requirements.
        
        Args:
            chunk: Audio chunk bytes
            strict: If True, raise exception on invalid chunk.
                   If False, only log warning.
                   
        Raises:
            AudioChunkError: If chunk is invalid and strict=True
        """
        if not chunk:
            error_msg = "Empty audio chunk"
            if strict:
                raise AudioChunkError(error_msg)
            logger.warning(error_msg)
            return
        
        size = len(chunk)
        
        # Check size
        if not cls.validate_chunk_size(chunk):
            error_msg = (
                f"Invalid chunk size: {size} bytes. "
                f"Expected: {cls.MIN_CHUNK_SIZE}-{cls.MAX_CHUNK_SIZE} bytes "
                f"(~100-300ms at 16kHz mono LINEAR16)"
            )
            if strict:
                raise AudioChunkError(error_msg)
            logger.warning(error_msg)
            return
        
        # Check alignment (must be even for 16-bit samples)
        if size % cls.BYTES_PER_SAMPLE != 0:
            error_msg = (
                f"Chunk size {size} not aligned to {cls.BYTES_PER_SAMPLE} bytes. "
                "LINEAR16 requires even byte count."
            )
            if strict:
                raise AudioChunkError(error_msg)
            logger.warning(error_msg)
            return
        
        duration_ms = cls.calculate_chunk_duration_ms(chunk)
        logger.debug(
            f"Valid chunk: {size} bytes, {duration_ms:.1f}ms duration"
        )


class AudioChunkHandler:
    """
    Handles audio chunk buffering and processing for streaming.
    
    Features:
    - Chunk validation
    - Buffer management (keep minimal for low latency)
    - Timing control
    - Metrics tracking
    - Server-side buffering for small chunks (Accumulator)
    - WAV header detection and removal
    - Large chunk splitting
    """
    
    # WAV header constants
    WAV_HEADER_MAGIC = b'RIFF'
    WAV_HEADER_SIZE = 44  # Standard WAV header size
    
    def __init__(
        self,
        max_buffer_size: int = 2,
        strict_validation: bool = False  # Changed to False for robustness
    ):
        """
        Initialize audio chunk handler.
        
        Args:
            max_buffer_size: Maximum chunks to buffer (keep small for latency)
            strict_validation: Whether to raise exceptions on invalid chunks
        """
        self.max_buffer_size = max_buffer_size
        self.strict_validation = strict_validation
        self.validator = AudioChunkValidator()
        self.metrics = AudioChunkMetrics()
        self.buffer = []
        
        # Accumulator for small chunks (< MIN_CHUNK_SIZE)
        self.accumulator = bytearray()
        self.wav_header_removed = False  # Track if WAV header already removed
        
        logger.info(
            f"AudioChunkHandler initialized: "
            f"max_buffer_size={max_buffer_size}, "
            f"strict_validation={strict_validation}"
        )
    
    def _detect_and_remove_wav_header(self, chunk: bytes) -> bytes:
        """
        Detect and remove WAV header from first chunk.
        
        Args:
            chunk: Raw audio bytes (may contain WAV header)
            
        Returns:
            Audio bytes with WAV header removed if detected
        """
        if self.wav_header_removed:
            return chunk
        
        # Check if this is the first chunk and contains WAV header
        if len(chunk) >= self.WAV_HEADER_SIZE:
            if chunk[:4] == self.WAV_HEADER_MAGIC:
                logger.warning(
                    f"Detected WAV header in first chunk. "
                    f"Removing {self.WAV_HEADER_SIZE} bytes."
                )
                self.wav_header_removed = True
                return chunk[self.WAV_HEADER_SIZE:]
        
        self.wav_header_removed = True  # Mark as processed even if no header
        return chunk
    
    def _split_large_chunk(self, chunk: bytes) -> list[bytes]:
        """
        Split large chunk (> MAX_CHUNK_SIZE) into smaller chunks.
        
        Args:
            chunk: Large audio chunk bytes
            
        Returns:
            List of chunks, each within size limits
        """
        if len(chunk) <= self.validator.MAX_CHUNK_SIZE:
            return [chunk]
        
        chunks = []
        # Split into chunks of optimal size (6400 bytes = 200ms)
        optimal_size = 6400  # 200ms
        
        for i in range(0, len(chunk), optimal_size):
            split_chunk = chunk[i:i + optimal_size]
            if split_chunk:
                chunks.append(split_chunk)
        
        logger.info(
            f"Split large chunk ({len(chunk)} bytes) into {len(chunks)} chunks"
        )
        return chunks
    
    def _flush_accumulator(self, force: bool = False) -> list[bytes]:
        """
        Flush accumulator buffer, returning ready chunks.
        
        Args:
            force: If True, flush even if < MIN_CHUNK_SIZE (for final chunk)
            
        Returns:
            List of ready chunks to send
        """
        if not self.accumulator:
            return []
        
        chunks_to_send = []
        
        if force:
            # Force flush: send whatever is left (even if < MIN_CHUNK_SIZE)
            if len(self.accumulator) > 0:
                # Ensure even byte count
                if len(self.accumulator) % 2 != 0:
                    self.accumulator.append(0)  # Pad with zero
                chunks_to_send.append(bytes(self.accumulator))
                logger.debug(
                    f"Force flushed accumulator: {len(self.accumulator)} bytes"
                )
                self.accumulator.clear()
        else:
            # Normal flush: only send if >= MIN_CHUNK_SIZE
            while len(self.accumulator) >= self.validator.MIN_CHUNK_SIZE:
                chunk = bytes(self.accumulator[:self.validator.MIN_CHUNK_SIZE])
                chunks_to_send.append(chunk)
                self.accumulator = self.accumulator[self.validator.MIN_CHUNK_SIZE:]
                logger.debug(
                    f"Flushed chunk from accumulator: {len(chunk)} bytes"
                )
        
        return chunks_to_send
    
    def process_chunk(self, chunk: bytes) -> list[bytes]:
        """
        Process incoming audio chunk with robust handling.
        
        Handles:
        - WAV header detection and removal (first chunk only)
        - Large chunk splitting (> 9600 bytes)
        - Small chunk accumulation (< 3200 bytes)
        
        Args:
            chunk: Raw audio bytes (LINEAR16, may have WAV header)
            
        Returns:
            List of ready chunks to send (empty if chunk is buffered)
            
        Raises:
            AudioChunkError: If chunk is invalid and strict_validation=True
        """
        if not chunk:
            if self.strict_validation:
                raise AudioChunkError("Empty audio chunk")
            logger.warning("Empty audio chunk received")
            return []
        
        self.metrics.total_chunks += 1
        self.metrics.total_bytes += len(chunk)
        
        try:
            # Step 1: Remove WAV header if present (first chunk only)
            chunk = self._detect_and_remove_wav_header(chunk)
            
            if not chunk:
                return []
            
            # Step 2: Check alignment (must be even for 16-bit samples)
            if len(chunk) % 2 != 0:
                logger.warning(
                    f"Chunk size {len(chunk)} not aligned. Padding with zero."
                )
                chunk = chunk + b'\x00'  # Pad with zero
            
            # Step 3: Handle large chunks (> MAX_CHUNK_SIZE)
            if len(chunk) > self.validator.MAX_CHUNK_SIZE:
                large_chunks = self._split_large_chunk(chunk)
                ready_chunks = []
                
                for split_chunk in large_chunks:
                    # Process each split chunk (may need accumulation)
                    result = self.process_chunk(split_chunk)
                    ready_chunks.extend(result)
                
                return ready_chunks
            
            # Step 4: Handle small chunks (< MIN_CHUNK_SIZE)
            if len(chunk) < self.validator.MIN_CHUNK_SIZE:
                # Add to accumulator
                self.accumulator.extend(chunk)
                logger.debug(
                    f"Buffered small chunk ({len(chunk)} bytes) in accumulator. "
                    f"Total: {len(self.accumulator)} bytes"
                )
                
                # Try to flush if accumulator has enough data
                return self._flush_accumulator(force=False)
            
            # Step 5: Normal chunk (MIN_CHUNK_SIZE <= size <= MAX_CHUNK_SIZE)
            # First, flush any accumulated data
            ready_chunks = self._flush_accumulator(force=False)
            
            # Add current chunk - IMPORTANT: Even if exactly MIN_CHUNK_SIZE, send it immediately
            # Don't buffer it - we need chunks in queue ASAP for Google API
            ready_chunks.append(chunk)
            
            logger.debug(
                f"Processed normal chunk: {len(chunk)} bytes, "
                f"ready_chunks={len(ready_chunks)}, "
                f"accumulator_size={len(self.accumulator)}"
            )
            
            # Update metrics
            self.metrics.valid_chunks += 1
            self.metrics.avg_chunk_size = (
                self.metrics.total_bytes / self.metrics.valid_chunks
            )
            self.metrics.last_chunk_time = time.time()
            
            # Add to buffer if not full (for metrics/debugging)
            if len(self.buffer) < self.max_buffer_size:
                self.buffer.append(chunk)
            else:
                self.buffer.pop(0)
                self.buffer.append(chunk)
            
            return ready_chunks
            
        except AudioChunkError as e:
            self.metrics.invalid_chunks += 1
            logger.error(f"Invalid audio chunk: {e}")
            if self.strict_validation:
                raise
            return []
    
    def flush_all(self) -> list[bytes]:
        """
        Flush all accumulated data (call when session stops).
        
        Returns:
            List of remaining chunks (may include small final chunk)
        """
        return self._flush_accumulator(force=True)
    
    def get_buffered_chunks(self, clear: bool = True) -> list:
        """
        Get all buffered chunks.
        
        Args:
            clear: Whether to clear buffer after getting chunks
            
        Returns:
            List of audio chunk bytes
        """
        chunks = self.buffer.copy()
        if clear:
            self.buffer.clear()
        return chunks
    
    def get_metrics(self) -> AudioChunkMetrics:
        """Get current metrics."""
        return self.metrics
    
    def reset_metrics(self):
        """Reset metrics counters."""
        self.metrics = AudioChunkMetrics()
        logger.debug("Audio chunk metrics reset")
    
    def reset(self):
        """Reset handler state (clear accumulator and buffer)."""
        self.accumulator.clear()
        self.buffer.clear()
        self.wav_header_removed = False
        self.reset_metrics()
        logger.debug("Audio chunk handler reset")

