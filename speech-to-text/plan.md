# SPEECH-TO-TEXT SYSTEM IMPLEMENTATION PLAN
## Real-Time Japanese Presentation Recording with Slide Synchronization

---

## EXECUTIVE SUMMARY

This document outlines the complete implementation plan for building a real-time presentation recording system using Google Cloud Speech-to-Text V2 API. The system is specifically designed for Japanese language presentations with automatic slide synchronization and keyword highlighting capabilities.

### Core Workflow

The system follows a streamlined two-phase workflow that provides an optimal user experience:

1. **Slide Preparation Phase**: User uploads PDF slides, and the system extracts text, analyzes structure, generates keyword indexes, and creates semantic embeddings. This processing must complete before recording can begin.

2. **Recording Phase**: Once slides are processed, the user starts recording. The system captures audio in real-time, transcribes it using Google Cloud Speech-to-Text V2 API, matches transcript segments against processed slides, and displays synchronized highlights as the presentation unfolds.

This approach eliminates the complexity of handling pre-recorded audio files and focuses entirely on delivering a smooth, real-time presentation capture experience. The implementation is divided into four major phases spanning approximately eight to ten weeks, with clear deliverables and success metrics for each phase.

**Current Status**: Phase 1 has been completed with all Google Cloud infrastructure established and tested. The V2 API integration has been validated achieving ninety-seven percent transcription accuracy using LINEAR16 audio format. The system uses Google Cloud Storage exclusively, with no AWS dependencies.

---

## PHASE 1: FOUNDATION AND SETUP (Week 1-2)

### Phase Overview

The foundation phase establishes all necessary infrastructure for the entire system. This includes setting up Google Cloud Platform services, implementing reliable file storage operations, and building audio format conversion capabilities. Think of this phase as preparing your workshop with all the right tools before you start building anything. Without a solid foundation, you will encounter problems later that are difficult to fix, so it's worth investing time to get this right from the start.

### Week 1: Google Cloud Platform Setup

The first week focuses on getting your Google Cloud infrastructure ready and understanding the V2 APIs through hands-on exploration. You begin by creating a new Google Cloud project specifically for this speech processing system, keeping it separate from any other projects for clean billing and access management. Within this project, you need to enable three essential APIs through the Google Cloud Console.

The first API is Cloud Speech-to-Text V2 API, which is the core service you will use for transcription. Unlike the older V1 API, the V2 version uses the batch_recognize method for long audio and provides better accuracy with Japanese language content. The second API is Cloud Translation for translating transcript text from Japanese to other languages like English or Vietnamese, which is an optional feature but valuable for international audiences. The third API is Cloud Storage, which you will use for storing PDF files, processed slide data, and recording results.

After enabling APIs, you must set up authentication carefully. Create a service account with appropriate permissions, specifically Speech-to-Text Admin and Cloud Translation API Admin roles. Download the service account JSON key file and store it securely outside your code repository. This key will be used by your Python application to authenticate with Google Cloud. Never commit this key to version control. Instead, load it from environment variables or a secure secret management system. Configure your development environment to use this service account by setting the GOOGLE_APPLICATION_CREDENTIALS environment variable to point to your key file.

Next, you need to create a Google Cloud Storage bucket for all file storage. Name it something descriptive like "speech-processing-intermediate" and choose an appropriate region based on where most of your users will be located. For example, if your users are primarily in Southeast Asia, choose asia-southeast1 region for Singapore. Create a clear directory structure within this bucket. Use "presentations/{presentation_id}/input/" for original uploaded PDFs, "presentations/{presentation_id}/slides/" for processed slide data, and "presentations/{presentation_id}/results/" for recording transcripts and matches. This organization makes it easy to find all files related to a specific presentation and manage the lifecycle of different data types.

Set up lifecycle rules on this bucket to manage storage costs automatically. For temporary processing files, you might create lifecycle policies that delete files older than seven days if they're in specific prefixes. However, for the main presentation data including slides and results, you typically want to keep these indefinitely until users explicitly delete them. The lifecycle rules help prevent storage costs from growing unexpectedly due to forgotten temporary files.

The final setup task is installing the necessary SDK and testing basic connectivity. Install the Google Cloud Speech-to-Text V2 Python client library version 2.x using pip install google-cloud-speech. Also install the Cloud Storage library using pip install google-cloud-storage. Write a simple test script that authenticates using your service account, lists buckets to verify connectivity, creates a test file in your bucket, downloads it back, and verifies the content matches. This validation step ensures everything is configured correctly before you build the actual processing pipeline. If this test fails, you can troubleshoot authentication and permissions issues now rather than discovering them later when you're deep into implementation.

### Week 2: GCS Storage Operations and Audio Conversion

The second week focuses on building reliable Google Cloud Storage operations and implementing audio format conversion that optimizes transcription quality. These capabilities form the backbone of your entire system, so they need to be robust and well-tested.

**GCS Storage Implementation**

Implement a comprehensive GCS storage service class that handles all file operations with proper error handling and retry logic. The core operations you need are upload_file which takes a local file path and uploads it to a specified GCS path, download_file which retrieves a file from GCS to local storage for processing, delete_file which removes specific files from GCS, list_files with a prefix parameter that returns all files matching a pattern, and cleanup_presentation which removes all files associated with a presentation ID in one operation.

Add comprehensive error handling for the various failures that can occur with network operations. Network issues during transfer are common, so implement automatic retry with exponential backoff. When a transfer fails due to a transient network error, wait one second and retry. If it fails again, wait two seconds, then four seconds, up to a maximum of thirty-two seconds. After five failed attempts, give up and raise an error. After successful transfer, verify file integrity by comparing the file size of what you uploaded with what GCS reports. Log all operations with details including GCS URI, file size, operation duration, and any errors encountered. This logging becomes invaluable when debugging issues in production.

The implementation should handle large files efficiently by using resumable uploads for files over five megabytes. Google Cloud Storage supports resumable uploads where you can restart from where you left off if the connection drops during a large file transfer. This is essential for PDF files which can sometimes be tens of megabytes for presentations with many high-resolution images.

**Audio Format Conversion**

Implement audio format conversion to LINEAR16 format, which provides optimal transcription accuracy with Google's Speech-to-Text API. LINEAR16 is uncompressed sixteen-bit PCM audio, and while it creates larger files than MP3, the accuracy improvement is substantial. In your testing, you found that LINEAR16 format improved transcription accuracy by fifty-three percent compared to MP3 for Japanese content.

Use the soundfile and librosa libraries which are compatible with Python 3.13. The conversion process involves loading any input format including MP3, WAV, M4A, or FLAC, resampling to sixteen kilohertz which is the optimal sample rate for speech recognition, converting to mono channel since stereo provides no benefit for speech and doubles file size, and converting to sixteen-bit depth. Additionally, apply volume normalization to negative one dBFS target to ensure consistent audio levels across different recordings. Some recordings might be very quiet while others are very loud, and normalizing helps the speech recognition system work consistently.

Store converted audio temporarily in a local directory or in memory buffer before uploading to GCS. For the real-time recording workflow, audio comes directly from the user's microphone already in the correct format, so conversion is only needed if you later add a feature to process pre-recorded files. However, having this conversion capability available is valuable for testing and for handling various input sources.

**Result Storage Service**

Implement a dedicated result storage service specifically for managing transcription outputs. This service provides methods like save_transcription_result which takes a structured transcription object and saves three JSON files: transcript.json containing the full text and segments, words.json containing word-level timestamps and confidence scores, and metadata.json containing processing statistics and costs. Use atomic operations to prevent corrupted partial files. When writing a file, first write to a temporary name, then rename to the final name once writing is complete. This ensures that if your process crashes mid-write, you don't end up with a corrupted file that appears complete but has missing data.

Add retry logic with exponential backoff for upload failures. If uploading a results file fails, retry a few times before giving up. This handles transient network issues gracefully. The storage service should also provide methods to check if results exist for a presentation and to retrieve results for display to users.

### Phase 1 Deliverables

By the end of Phase 1, you should have a fully functional development environment with verified Google Cloud V2 API access and working GCS storage operations. The specific deliverables include a documented Google Cloud project with all V2 APIs enabled and service account properly configured with appropriate roles and permissions. You should have a GCSStorage class implementing upload, download, delete, list, and cleanup operations with comprehensive error handling and automatic retry on transient failures. An audio conversion service should support LINEAR16 format conversion with volume normalization for optimal quality. A GCSResultStorage class should manage transcription result files in structured format with atomic writes. Finally, you should have a suite of at least six integration tests validating all GCS operations with various file sizes and formats, ensuring your foundation is solid.

You should also have documentation covering setup instructions for team members including step-by-step authentication configuration, bucket naming conventions explaining your directory structure, and file path structures in GCS documenting where different types of files are stored. This documentation ensures other team members can replicate your setup and understand the system architecture without having to reverse-engineer it from code.

**Phase 1 Status**: Completed successfully. All six integration tests are passing consistently. GCS operations work reliably with files ranging from small JSON files of a few kilobytes to large PDF files of fifty megabytes. Audio conversion achieves the target ninety-seven percent transcription accuracy when using LINEAR16 format. Error handling catches and logs failures appropriately with automatic retry on transient network errors.

---

## PHASE 2: PDF SLIDE PROCESSING PIPELINE (Week 3-5)

### Phase Overview

Phase 2 builds the PDF slide processing pipeline that must complete before users can start recording. This is a critical prerequisite because the system needs processed slide content including text, keywords, and semantic embeddings ready in memory for real-time matching during recording. The workflow is straightforward from the user's perspective: upload PDF slides, wait while the system processes them, then start recording once processing completes. However, behind the scenes, substantial work happens during that processing time.

The processing must be fast enough that users don't experience frustrating delays. A typical thirty-page presentation should process in under sixty seconds total. This target balances thoroughness of processing with user experience. If processing takes several minutes, users might abandon the system or question whether it's working. The processing pipeline needs to extract text reliably from various PDF formats, handle Japanese language properly with correct tokenization and normalization, build searchable indexes for fast keyword lookup, and generate semantic embeddings for matching similar concepts even when exact words differ.

### Week 3: PDF Text Extraction and Structure Analysis

Week 3 focuses on reliably extracting text and understanding slide structure from PDF files. PDF processing is more challenging than it might first appear because PDFs can have many different internal structures. Some PDFs have native text that's easy to extract, while others have text rendered as images requiring OCR. PDFs can have multi-column layouts, tables, headers and footers, and various font encodings especially for Japanese text. Your extraction pipeline needs to handle all these variations gracefully.

**PDF Text Extraction Implementation**

Start by implementing PDF text extraction using PyMuPDF, which is also called fitz in Python. This library is fast and handles most PDF formats well. The basic approach is to open the PDF file, iterate through each page, extract text with position information, and store the results in a structured format. For each page, PyMuPDF returns text blocks with their coordinates on the page. These coordinates help you understand the layout and identify structural elements like titles versus body text.

However, not all PDFs have extractable text. Some PDFs, especially older scanned documents or those created from images, have text rendered as graphics. For these cases, you need OCR which stands for Optical Character Recognition. Implement a detection mechanism that checks whether extracted text seems suspiciously sparse. If a page has very few characters extracted but clearly contains text when you look at the PDF visually, trigger OCR processing. You can use Tesseract for local OCR or Google Cloud Vision API for cloud-based OCR. Google Cloud Vision API typically provides better accuracy for Japanese text but adds processing time and cost. For the initial implementation, try Tesseract first since it's free and see if accuracy is acceptable.

When extracting Japanese text, pay attention to encoding issues. Japanese text can be encoded in various ways including UTF-8, Shift-JIS, or EUC-JP. Modern PDFs usually use UTF-8, but older PDFs might use legacy encodings. Ensure your extraction pipeline correctly decodes text regardless of encoding. Test with various PDF samples including ones created with different tools like PowerPoint, Keynote, Google Slides, and LaTeX beamer to ensure broad compatibility.

**Structure Identification**

After extracting raw text, parse it to identify structural hierarchy within slides. Slides typically follow predictable patterns with titles at the top in large fonts, section headings in medium fonts, bullet points with specific markers or indentation, and body text in regular paragraphs. Use heuristics based on font size, position, and formatting to classify each text block.

For titles, look for text positioned in the top twenty percent of the page with font size at least one point five times the average font size on that page. For bullet points, look for specific Unicode characters like bullet points, circles, or squares, or text blocks with consistent indentation. Label each text block with its structural type including title, heading, bullet, or body. Store this structural information alongside the text because it's important for matching later. When someone mentions a topic that appears in a slide title, that's a much stronger match signal than if it appears in small body text at the bottom of the slide.

**Japanese Text Processing**

Implement Japanese-specific text normalization and cleaning. Japanese text presents unique challenges because it uses three writing systems: hiragana for grammatical elements and native words, katakana for foreign loanwords and emphasis, and kanji for content words borrowed from Chinese. The same concept might be written in different scripts, so normalization is essential for robust matching.

Convert full-width alphanumeric characters to half-width for consistency. In Japanese text, numbers and English letters are sometimes written in full-width form which takes two bytes per character instead of one. Normalizing these to half-width ensures that "０１２３" and "0123" are treated as the same number. Normalize punctuation marks to standard forms since Japanese has multiple variants of common punctuation. Remove formatting artifacts like excessive whitespace, soft hyphens, or invisible characters that sometimes appear in extracted PDF text.

Detect and extract furigana where available. Furigana are small hiragana characters written above kanji to indicate pronunciation. This pronunciation information is valuable because the same kanji can be pronounced differently in different contexts, and speech recognition might transcribe the pronunciation in hiragana when the slides show kanji. Preserving this relationship helps matching.

**Quality Validation**

Implement validation checks to ensure extraction quality before allowing users to proceed to recording. Calculate text density per page, measured as characters per square inch, to detect extraction failures. A page with very low text density might indicate that extraction failed or OCR is needed. Check that at least seventy percent of pages have meaningful text content, defined as more than twenty characters per page. If too many pages fail this check, the PDF might be corrupted, have unusual encoding, or consist primarily of images without text.

Verify that extracted text is not garbled. Sometimes encoding issues cause text to appear as random characters or question marks. Detect this by checking for excessive non-alphanumeric characters or repeated unknown character markers. If extraction quality is below threshold, return a clear error message to the user requesting a different file format or better quality PDF. Provide specific guidance like "This PDF appears to contain scanned images. Please upload a PDF with text layers or a higher quality scan."

**Storage of Extracted Content**

Store extracted text in structured JSON format in GCS under "presentations/{presentation_id}/slides/extracted.json". Design a clear schema with page_number, original_text, structural_elements array containing objects with type and text and position, detected_language for each text block, and extraction_metadata documenting whether OCR was used, extraction confidence, and processing time. Use consistent field naming and include comments in your schema documentation explaining what each field represents. This structured format makes it easy to load and process the data in subsequent steps.

### Week 4: Japanese NLP Processing and Indexing

Week 4 focuses on processing the extracted Japanese text to prepare for matching. This involves tokenization which breaks text into meaningful units, normalization which standardizes variants of the same word, keyword extraction which identifies the most important terms, and index building which enables fast lookup during real-time matching.

**Japanese Tokenization**

Implement Japanese text tokenization using MeCab, which is the most widely used Japanese morphological analyzer. Unlike English where words are separated by spaces, Japanese text flows continuously without word boundaries. MeCab uses a dictionary and statistical model to break text into morphemes, which are the smallest meaningful units. Install MeCab and its Python binding, then install a dictionary such as mecab-ipadic for general text or specialized dictionaries for technical domains if your presentations are in specific fields like medicine or engineering.

For each text block extracted from slides, run MeCab tokenization to get individual words with their properties. MeCab returns the surface form which is how the word appears in text, part of speech like noun, verb, or adjective, base form which is the dictionary form of the word, and reading in hiragana. The base form is particularly important because Japanese verbs and adjectives conjugate extensively. For example, the verb "食べる" meaning "to eat" might appear as "食べた" meaning "ate", "食べない" meaning "doesn't eat", or various other forms. Normalizing to the base form "食べる" ensures these all match.

Extract content words by filtering out function words. Function words include particles like は (wa), が (ga), を (wo), auxiliary verbs, and common filler words like えーと (eeto, meaning "um"). These words carry little semantic meaning and aren't useful for matching. Focus on nouns, verbs, adjectives, and proper nouns since these carry the actual content. For a typical slide with fifty words, you might extract ten to fifteen content words after filtering.

**Text Normalization**

Normalize tokenized text for robust matching. Convert all text to base forms using MeCab's output. Normalize verb and adjective conjugations to dictionary forms. Convert numbers written in kanji to Arabic numerals and vice versa for flexibility. For example, "三つ" meaning "three" becomes "3", while "3月" meaning "March" keeps the number. Standardize variations in katakana foreign words which can be written multiple ways. For example, "コンピュータ" and "コンピューター" both mean "computer" but have slightly different spellings.

Create normalized versions of all text while preserving original text for display. Store both in your processed data structure. The normalized text is used internally for matching, while the original text is shown to users in the interface. This separation allows flexible matching without affecting display quality. Users see the slides exactly as designed, but the system can match robustly against variations.

**Keyword Extraction with TF-IDF**

Implement TF-IDF scoring to identify important keywords in slides. TF-IDF stands for Term Frequency-Inverse Document Frequency. It's a statistical measure that evaluates how important a word is to a document in a collection. The term frequency measures how often a word appears in a slide, while inverse document frequency measures how rare the word is across all slides. Words with high TF-IDF are important to that specific slide but not common across all slides, making them excellent discriminators.

Calculate TF-IDF scores for each content word on each slide. For term frequency, use normalized counts to avoid bias toward longer slides. For inverse document frequency, use the formula IDF equals log of total number of slides divided by number of slides containing the term. Multiply TF by IDF to get the TF-IDF score. Extract the top ten to twenty keywords per slide based on these scores. These keywords become the primary matching signals during real-time transcription.

Store keywords with their scores, positions in original text, and structural context like whether they appeared in titles or bullet points. Title keywords should be marked as such since they're more important indicators of slide topic than keywords buried in body text. Sort keywords by score in descending order so you can prioritize high-importance terms during matching.

**Inverted Index Construction**

Build an inverted index mapping each keyword to all locations where it appears. An inverted index is like the index at the back of a book that tells you which pages contain specific terms. The structure is a dictionary where keys are normalized keywords and values are lists of occurrences. Each occurrence records slide_number, position_in_text, element_type indicating whether it's in a title, heading, bullet, or body, and tfidf_weight from the keyword extraction.

This index enables constant-time lookup during matching. When a transcript segment arrives during recording, you tokenize it to extract words, then look up each word in the inverted index. The lookup is instant, taking only microseconds regardless of how many slides you have. Without an inverted index, you would need to scan through all slides looking for matches, which would take too long for real-time performance.

Optimize the index structure for fast loading. When a recording session starts, this index needs to load into memory quickly. Use efficient serialization with JSON for human readability during development, but consider switching to MessagePack or pickle for faster loading in production. Test loading time with typical presentation sizes. A thirty-slide presentation with five hundred total keywords should load in under one hundred milliseconds.

**Result Storage**

Store processed results in GCS under "presentations/{presentation_id}/slides/" with three files. First, processed.json contains all pages with tokenized_text arrays of words with their properties, normalized_forms mapping original words to normalized versions, structural_information with element types and positions, and keywords_per_page listing the top keywords with scores. Second, index.json contains the inverted keyword index as a flat dictionary for fast lookup. Third, metadata.json contains processing statistics like total_pages, total_keywords, total_unique_keywords, languages_detected, processing_time_seconds, and processed_at timestamp.

Use clean, consistent JSON formatting with proper indentation for debugging. Include version numbers in your schemas so you can evolve the format over time. For example, add a "schema_version": 1 field that you increment when making breaking changes. This versioning helps handle presentations processed with older code versions.

### Week 5: Embedding Generation and Quality Assurance

Week 5 completes the PDF processing pipeline by adding semantic understanding through embeddings and thoroughly testing the entire pipeline with diverse documents to ensure production readiness.

**Embedding Model Selection**

Choose an appropriate multilingual or Japanese-specific sentence transformer model for generating embeddings. Embeddings are dense vector representations of text that capture semantic meaning. Text with similar meanings has similar embeddings, even if the exact words differ. This enables matching when speakers paraphrase slide content rather than using identical words.

Candidate models include "paraphrase-multilingual-mpnet-base-v2" which supports one hundred plus languages including Japanese and produces embeddings of seven hundred sixty-eight dimensions, "sonoisa/sentence-bert-base-ja-mean-tokens" which is specifically trained on Japanese text and produces seven hundred sixty-eight dimensional embeddings, or "sentence-transformers/distiluse-base-multilingual-cased-v2" which is faster with slightly lower quality producing five hundred twelve dimensional embeddings.

Test several models on sample presentations to compare quality versus speed. Load a test presentation, generate embeddings with each model, then manually check whether similar content produces similar embeddings. For example, if one slide says "機械学習の基礎" meaning "machine learning basics" and another says "機械学習入門" meaning "introduction to machine learning", their embeddings should be similar since both are about machine learning fundamentals. Use cosine similarity to measure embedding similarity, with values from zero meaning completely different to one meaning identical.

Benchmark processing speed for each model. For a thirty-slide presentation with one hundred fifty text blocks, measure how long it takes to generate all embeddings. On a modern CPU, this should take thirty to ninety seconds depending on model complexity. If your server has GPU available, embedding generation accelerates significantly, potentially completing in ten seconds or less.

**Embedding Generation Process**

For each slide, generate separate embeddings for different structural elements since they have different semantic scopes. Encode the slide title as one embedding capturing the main topic. Encode each bullet point as individual embeddings since they represent distinct ideas. Encode body paragraphs as separate embeddings for detailed content. This granular approach provides better matching precision than encoding entire slides as single embeddings.

Process embeddings in batches for efficiency. Most sentence transformer models accept lists of texts and encode them in parallel. Batch fifty to one hundred text blocks at once rather than encoding them one at a time. This batching reduces overhead and improves throughput. Use GPU acceleration if available by moving the model to GPU with model.to('cuda'). This dramatically speeds up encoding, sometimes by ten times or more.

Store metadata mapping each embedding to its source. Create a mapping file that records for each embedding index: slide_number, element_type like title, bullet, or body, element_position within the slide, and original_text for debugging. This mapping lets you trace matches back to specific slide elements when debugging why certain matches occurred.

**Embedding Storage and Indexing**

Store embeddings in an efficient binary format for fast loading. Save as a numpy array with shape (num_text_blocks, embedding_dimension) using numpy.save which creates a .npy file. For a presentation with one hundred fifty text blocks using seven hundred sixty-eight dimensional embeddings, this creates a file of about nine hundred kilobytes. This format loads in milliseconds and uses minimal memory.

For real-time similarity search during recording, load embeddings into a FAISS index. FAISS stands for Facebook AI Similarity Search and provides efficient nearest neighbor search in high-dimensional spaces. Build a FAISS IndexFlatIP index which uses inner product for exact cosine similarity search after normalizing embeddings to unit length. This index fits entirely in memory for typical presentations and provides sub-millisecond search times.

Alternatively, for larger deployments with many presentations, consider using an approximate nearest neighbor index like IndexIVFFlat which trades slight accuracy loss for much faster search on huge datasets. For single-presentation matching during recording, the exact index IndexFlatIP is sufficient since you're only searching through one hundred to three hundred embeddings.

**Comprehensive Testing**

Create a test suite with diverse PDF samples to validate your processing pipeline. Collect or create test PDFs including text-heavy academic slides with dense paragraphs and citations, image-heavy marketing slides with minimal text and large graphics, technical presentations with code snippets, formulas, and diagrams, mixed Japanese and English content, multi-column layouts with complex positioning, and low-quality scanned documents requiring aggressive OCR.

Test the complete pipeline from PDF upload through embedding generation. For each test PDF, measure processing time broken down by extraction, tokenization, indexing, and embedding generation. Manually verify sample pages to check extraction accuracy. Open the PDF, look at a slide, then check whether your extracted text matches what you see. Check keyword quality by reviewing the top keywords per slide and verifying they actually represent important concepts on those slides. Test embedding quality by checking cosine similarity between conceptually similar and dissimilar slides.

Document processing time targets with specific benchmarks. For a thirty-page text-heavy presentation, target twenty seconds for extraction, twenty seconds for tokenization and indexing, and twenty seconds for embedding generation, totaling sixty seconds. For image-heavy presentations requiring OCR, allow up to one hundred twenty seconds total. These targets ensure users don't experience frustrating waits before they can start recording.

**Error Handling**

Implement robust error handling for common PDF processing failures. If extraction produces empty results for most pages, check whether the PDF is encrypted and needs password unlocking, try OCR with higher quality settings, or return clear error requiring user to reupload. If tokenization fails due to unusual text encoding, fall back to character-level segmentation where you simply split on whitespace and punctuation. If embedding generation fails due to out-of-memory errors, process in smaller batches of twenty-five text blocks instead of fifty.

Log all processing steps with timing and quality metrics. Track pages_requiring_ocr, average_extraction_confidence, total_keywords_extracted, unique_keywords, average_keywords_per_page, embedding_generation_time, and any_errors_encountered. This logging helps debug issues when users report problems. If someone says their slides didn't process correctly, you can look at the logs and see exactly what happened during processing including which pages had issues and how long each step took.

### Phase 2 Deliverables

At the end of Phase 2, you should have a production-ready PDF processing pipeline that reliably prepares slides for real-time matching during recording. Your deliverables include a PDF processing module with reliable text extraction using PyMuPDF with automatic OCR fallback for image-based slides, structure identification that classifies text as titles, headings, bullets, or body, quality validation that detects and reports extraction failures clearly, and fast processing completing in under sixty seconds for typical thirty-page presentations.

You should have a Japanese NLP pipeline with MeCab tokenization that extracts content words and provides base forms, text normalization handling conjugations, numbers, and katakana variants, TF-IDF keyword extraction identifying the top ten to twenty terms per slide, and inverted index construction enabling instant keyword lookup during matching.

Your embedding generation system should include a multilingual sentence transformer integration tested for quality on Japanese content, granular embedding per structural element rather than per entire slide, efficient storage as numpy arrays for fast loading, and FAISS index construction for sub-millisecond similarity search.

The storage layer should save files to presentations/{id}/slides/ including extracted.json with raw text, processed.json with tokens and keywords, index.json with inverted index, embeddings.npy with vector representations, and metadata.json with statistics. Your test suite should cover diverse PDF formats and qualities, validate extraction accuracy and keyword quality, meet performance benchmarks, and handle edge cases gracefully.

Finally, your documentation should explain PDF processing configuration and parameters, Japanese NLP pipeline details including normalization rules, embedding model selection and tuning process, and storage schemas with example files.

### Phase 2 Success Metrics

Phase 2 success is measured by processing speed, extraction quality, keyword relevance, embedding effectiveness, index performance, and error handling robustness. For processing speed, aim for under sixty seconds for thirty-page presentations broken down as extraction in twenty seconds, tokenization and indexing in twenty seconds, and embedding generation in twenty seconds. For extraction quality, achieve ninety-five percent or higher success rate defined as at least seventy percent of pages with meaningful text extracted. Native text PDFs should achieve ninety-nine percent success while scanned documents requiring OCR achieve ninety percent success.

For keyword quality, manual review should show that eighty-five percent or more of extracted keywords actually represent important concepts on their slides. The top three keywords per slide should directly relate to the slide's main topic. For embedding quality, similar slides should have cosine similarity above point seven, while different topics should have similarity below point three. For index performance, keyword lookup should average under one millisecond enabling real-time matching. For error handling, the system should provide clear error messages for unsupported formats, implement automatic fallback strategies like retrying with OCR when extraction fails, and maintain comprehensive logging for debugging.

---

## PHASE 3: REAL-TIME STREAMING TRANSCRIPTION (Week 6-7)

### Phase Overview

Phase 3 implements the core real-time streaming transcription system that processes live audio as the user records their presentation. This is the heart of your system and the only transcription mode users will experience. The streaming pipeline must accept audio chunks in real-time from the user's microphone, send them continuously to Google Cloud Speech-to-Text V2 API, receive both interim and final transcription results, match final results against pre-processed slides, and forward everything to the frontend with minimal delay so users see captions and highlights appearing naturally as they speak.

The streaming session begins only after PDF processing completes. When the user clicks "Start Recording", your backend loads the processed slide data from Phase 2 into memory, establishes a streaming connection with Google Cloud, and opens a WebSocket to the frontend. From that point forward, every audio chunk must be processed with sub-second latency to provide a smooth experience. This phase is more complex than simple file processing because you must maintain continuous bidirectional connections, handle session timeouts gracefully, process results asynchronously while receiving new audio, and ensure everything happens fast enough that users perceive natural real-time behavior without noticeable lag.

### Week 6: Streaming Recognition Implementation

Week 6 focuses on building the core streaming functionality including establishing connections, handling audio chunks, and processing results. The Google Cloud Speech-to-Text V2 API uses bidirectional gRPC streaming, which is quite different from simple REST APIs. You maintain an open connection where you continuously send audio chunks upstream to Google and continuously receive recognition results downstream from Google on the same connection.

**Understanding the Streaming API Architecture**

Unlike file processing where you send one request and poll for completion, streaming uses a long-lived bidirectional connection. The flow works as follows. First, you create a streaming recognize request containing configuration parameters like language, model, and audio encoding. Then you send audio chunks in a continuous loop as the user speaks. Google processes these chunks and sends back responses asynchronously on the same connection. The connection stays open until you explicitly close it or until it times out after approximately five minutes of continuous audio or one minute of silence.

The V2 streaming API uses StreamingRecognizeRequest for configuration and audio data. The first request contains the config with recognizer path like "projects/{project_id}/locations/global/recognizers/_", streaming_config with language code, model selection, interim results flag, and audio encoding. Subsequent requests contain only audio_content with raw audio bytes. Google responds with StreamingRecognizeResponse containing results which are arrays of StreamingRecognitionResult objects.

**Implementing the Streaming Session Manager**

Build a session manager class that handles the complete lifecycle of streaming sessions. When a user clicks "Start Recording", the frontend sends a start_session request with the presentation_id. Your session manager loads the processed slide data from GCS into memory structures optimized for fast lookup during matching. This includes loading the keyword inverted index as a Python dictionary, loading embeddings as a numpy array, building a FAISS index from the embeddings, loading normalized text for each slide, and loading structural information about which text blocks are titles versus body.

After loading slide data, establish the streaming connection with Google Cloud. Create the recognizer name using your project ID. Build the streaming configuration specifying language as "ja-JP" for Japanese, model as "latest_long" which provides the best accuracy you validated in Phase 1, interim_results as True to get preliminary transcriptions while the user speaks, single_utterance as False since presentations are continuous speech, enable_automatic_punctuation as True for readable text, and audio_encoding as LINEAR16 matching the format from the frontend.

Open the bidirectional gRPC stream by calling streaming_recognize on the speech client. Send the initial configuration request containing only the streaming_config. Start a background thread that listens for responses on this stream. This listener thread runs continuously, receiving results from Google and processing them until the stream closes. Store the session state including session_id, presentation_id, stream object, slide data structures, current highlighted slide, transcript buffer, and start time for tracking session duration.

**Audio Chunk Handling**

Implement the audio chunk handler that receives audio from the frontend and forwards it to Google. The frontend captures audio from the user's microphone and sends chunks via WebSocket. Each chunk should be approximately one hundred milliseconds of audio, which at sixteen kilohertz sampling rate with sixteen-bit depth equals three thousand two hundred bytes per chunk. The frontend sends chunks every one hundred to two hundred milliseconds providing a steady stream.

When a chunk arrives, minimal processing is needed since the frontend sends audio already in LINEAR16 format. Simply wrap the chunk in a StreamingRecognizeRequest with only the audio_content field set and send it on the gRPC stream. This forwarding happens immediately with no buffering to minimize latency. If chunks arrive faster than you can send, queue them briefly but keep the queue small to avoid building up latency.

Handle backpressure gracefully. If Google Cloud starts responding slowly or your network connection degrades, you might accumulate queued audio chunks. Implement monitoring that alerts when the queue exceeds ten chunks, indicating backpressure. In this situation, you might need to skip interim results or reduce audio quality temporarily, though this should be rare with proper connection quality.

**Result Processing and Streaming**

Implement the result handler that processes incoming responses from Google. The listener thread continuously receives StreamingRecognizeResponse objects from the gRPC stream. Each response can contain multiple results. For each result, check the is_final flag which indicates whether this is a preliminary or confirmed transcription.

For interim results where is_final is False, extract the transcript text, stability score indicating how stable the transcription is, and confidence estimate. Update your interim result buffer by replacing any previous interim result for the current utterance. Forward the interim result to the frontend via WebSocket with a message containing type as "interim", text with the transcript, timestamp, confidence, and stability. The frontend displays interim results in a different style, perhaps lighter gray or italic, so users know these are preliminary.

For final results where is_final is True, the transcription is confirmed and won't change. Extract the transcript text, word-level timing information including start_offset and end_offset for each word as Duration objects, and confidence score. Convert Duration objects to seconds using duration.seconds + duration.nanos divided by one billion. Create a segment object with unique segment_id, text, start_time and end_time calculated from word times, confidence, and words array for precise synchronization.

Clear the interim result buffer since the final result supersedes any interim results for this utterance. This segment is now ready for matching against slides, which happens in Phase 4. For now, simply forward the final result to the frontend with type as "final", the complete segment object, and placeholder for matching results that will be filled in later. Store the segment in a session buffer for eventual saving to GCS when the recording ends.

**Error Handling**

Add comprehensive error handling for streaming-specific issues. Handle stream interruption errors by attempting to reconnect automatically. If the gRPC connection drops unexpectedly, capture the error, log it, wait briefly, then establish a new streaming session with the same configuration. Resume from where you left off by continuing to send audio chunks. Users should see a brief "Reconnecting..." message but minimal disruption.

Handle timeout errors proactively. Google automatically closes streaming sessions after approximately five minutes of continuous audio. Rather than letting this happen unexpectedly, implement a timer that tracks session duration and triggers graceful renewal at four and a half minutes. Finish processing any buffered audio in the current session, wait for remaining results, close the session cleanly, open a new session with identical configuration, and resume streaming. This renewal should be invisible to users.

Handle rate limit errors by implementing backpressure and retry logic. If Google returns a rate limit error, slow down audio sending briefly by adding small delays between chunks. This situation should be rare with proper planning, but graceful handling prevents failures. Handle audio format errors by validating that chunks are actually LINEAR16 format before sending. If the frontend accidentally sends audio in the wrong format, detect it early and request the frontend to fix its configuration rather than sending invalid data to Google.

### Week 7: Session Management and Optimization

Week 7 focuses on optimizing the streaming pipeline for production use and implementing robust session management for long presentations. Google Cloud streaming sessions have time limits and various constraints that need careful handling to provide seamless user experience.

**Implementing Intelligent Session Renewal**

For presentations longer than five minutes, implement seamless session renewal. The renewal process must be invisible to users, with no interruption in audio capture or caption display. Start by tracking session duration from the moment the first audio chunk is sent. Set a renewal threshold at four minutes and thirty seconds, which provides thirty seconds of buffer before the five-minute timeout.

When the threshold is reached, begin the renewal process. Stop sending new audio chunks on the current stream and mark the stream as "finishing". Continue to receive and process any remaining results from Google since there might be a few seconds of transcription results still coming for audio sent just before you stopped. Once all results are received, close the current gRPC stream gracefully. Immediately open a new gRPC stream with identical configuration. Send the configuration request and resume sending audio chunks. Buffer any audio chunks that arrived during the brief transition, typically only one or two chunks totaling two hundred milliseconds of audio, and send them as soon as the new stream is ready.

Log session boundaries for debugging and analytics, but don't expose them to users. Track session_renewal_count in your metadata. In your logs, record when renewal started, how long the transition took, whether any audio was buffered, and when the new session was established. This logging helps diagnose issues if users report missing audio or glitches.

**Optimizing End-to-End Latency**

Measure and optimize latency throughout the streaming pipeline. Break down total latency into components including frontend capture to backend receive, backend audio forwarding to Google, Google's recognition processing, Google response to backend receive, backend processing including matching, and backend to frontend display. Your target is total latency under eight hundred milliseconds measured at the ninety-fifth percentile, meaning ninety-five percent of transcripts should appear within eight hundred milliseconds of when the words were spoken.

Identify bottlenecks through careful measurement. Add timing instrumentation at key points in your pipeline. Log timestamps when audio chunks are received, when they're sent to Google, when results are received from Google, when matching completes, and when results are sent to the frontend. Analyze these logs to see where time is being spent. Common bottlenecks include network latency to Google Cloud which can be reduced by deploying your backend in the same region as Google Cloud Speech services, JSON serialization and deserialization which can be optimized by using more efficient protocols or reducing message size, and matching algorithm taking too long which is addressed in Phase 4.

Consider implementing audio preprocessing if input quality varies significantly. Real-time audio from microphones often has background noise, varying volume, and audio artifacts. Add real-time noise suppression using libraries like RNNoise which provides excellent noise reduction with low latency. Implement automatic gain control to normalize volume so both quiet and loud speakers are transcribed consistently. These preprocessing steps add some latency, perhaps fifty to one hundred milliseconds, but can significantly improve transcription quality which indirectly improves user experience by reducing recognition errors.

**Handling Silence Periods**

Implement intelligent silence detection and handling. When the speaker pauses, you continue receiving audio chunks that contain only silence. Detect silence using audio level analysis where chunks with RMS energy below a threshold are considered silent, or voice activity detection using libraries like WebRTC VAD which more robustly distinguishes speech from silence. When silence is detected for more than two seconds, consider stopping audio transmission temporarily to save API costs and reduce unnecessary processing. Resume sending when speech is detected again.

Be careful with silence handling to not cut off sentence endings or miss short words during pauses. Implement hysteresis where you require sustained silence before stopping and require sustained speech before resuming. Add padding where you continue sending audio for one second after detecting silence before actually stopping, ensuring sentence endings aren't truncated. Similarly, start sending audio half a second before detecting speech to avoid missing the beginning of utterances.

**Building a Monitoring Dashboard**

Create a real-time monitoring dashboard for streaming sessions. Track active_session_count showing how many users are currently recording, average_session_duration to understand typical usage patterns, interim_result_frequency measuring how often Google sends preliminary results, final_result_frequency measuring confirmed transcriptions, average_confidence_scores to detect quality issues, latency_percentiles at p50, p95, and p99, error_rates broken down by error type, and cost_per_minute_of_audio to monitor expenses.

Display these metrics in a web dashboard that updates every few seconds. Use color coding where green indicates normal operation, yellow indicates warning thresholds approached, and red indicates problems requiring immediate attention. Set up alerts for high error rates when more than five percent of operations fail in a five-minute window, high latency when p95 latency exceeds one second, stuck sessions that remain active for over three hours suggesting they weren't properly closed, and cost spikes when hourly costs exceed expected thresholds.

**Testing Infrastructure for Streaming**

Build testing infrastructure that simulates real streaming scenarios. Create a test harness that reads audio from a file and sends chunks at realistic intervals, simulating what the frontend would send. This allows repeatable testing without needing someone to actually speak. Create test cases for continuous speech without pauses testing sustained high-throughput, speech with frequent pauses testing silence handling, very fast speech with high word rate testing whether the system keeps up, very slow speech with long pauses testing timeout handling, and sessions exceeding five minutes testing renewal logic.

For each test case, measure latency distribution using histograms and percentiles, accuracy by comparing transcriptions to known ground truth, resource usage including CPU and memory, and cost by tracking API calls. Run these tests regularly, ideally as part of your CI/CD pipeline, to catch regressions early. If you make changes that accidentally increase latency or reduce accuracy, automated testing alerts you before deploying to production.

### Phase 3 Deliverables

At the end of Phase 3, you should have a production-ready real-time streaming transcription system. Your deliverables include a streaming recognition service that accepts real-time audio chunks via WebSocket, returns interim and final transcription results with sub-second latency, handles multiple concurrent streaming sessions with proper isolation, and integrates cleanly with the Google Cloud Speech-to-Text V2 API.

Your session management system should handle session lifecycle from creation through recording to graceful shutdown, session renewal before timeout for presentations longer than five minutes without audio loss, and error recovery including automatic reconnection on connection failures and graceful degradation on API errors.

The audio preprocessing pipeline should validate audio format and quality, optionally perform noise suppression and volume normalization if needed, implement silence detection to optimize costs, and ensure minimal latency addition from any processing.

Your result streaming interface should deliver transcriptions to the frontend with minimal latency, clearly distinguish interim results shown in progress from final results confirmed for matching, include accurate timestamps for synchronization, and handle backpressure gracefully if the frontend can't keep up.

Comprehensive monitoring should track streaming metrics in real-time via a dashboard showing session health including active count and average duration, latency distributions at multiple percentiles, accuracy through confidence scores, and costs per session. Implement alerting for anomalies including error rate spikes, latency degradation, or cost overruns.

Testing infrastructure should validate streaming behavior with simulated audio streams of various types, measure latency under different conditions, perform stress testing with concurrent sessions, and provide regression testing for continuous integration.

Documentation should cover streaming API specifications including configuration parameters and performance characteristics, session management details explaining renewal logic and timeout handling, WebSocket protocol definitions for frontend integration, latency optimization techniques and benchmarks, and monitoring and debugging procedures including log locations and error interpretation.

### Phase 3 Success Metrics

Success in Phase 3 is primarily measured by latency and reliability in real-time scenarios. For latency, achieve end-to-end latency under eight hundred milliseconds at the ninety-fifth percentile, measured from when audio is spoken to when transcript appears on screen. Session establishment should complete in under five hundred milliseconds from when the user clicks "Start Recording" to when the system is ready to accept audio. Session renewal should complete without dropping audio chunks or missing interim results, with the transition taking under two hundred milliseconds.

For scalability, handle at least twenty concurrent streaming sessions without performance degradation, with linear scaling by adding more backend instances. For reliability, achieve uptime above ninety-nine point five percent measured per session, meaning fewer than point five percent of sessions experience errors requiring reconnection. For accuracy, interim results should achieve at least eighty percent of final result accuracy, providing good enough quality for readable closed captions while users speak. Final results should achieve the same ninety percent plus accuracy validated in Phase 1 for the underlying speech recognition.

---

## PHASE 4: REAL-TIME SLIDE MATCHING AND INTEGRATION (Week 8-10)

### Phase Overview

Phase 4 integrates the slide matching algorithm with the real-time streaming pipeline to provide live slide highlighting during presentations. The matching algorithm must identify which slide corresponds to the current transcript segment quickly enough that highlighting updates appear instantaneous to users. This requires completing all processing within one hundred to two hundred milliseconds per segment, which is challenging given the complexity of matching that involves keyword lookup, fuzzy string comparison, and semantic similarity computation.

The algorithm combines three complementary matching techniques. Exact keyword matching provides high precision by looking up transcript words in the pre-built inverted index. Fuzzy matching handles speech recognition errors and variations by computing edit distance between similar words. Semantic matching uses embeddings to capture paraphrased content where speakers explain concepts differently than written on slides. These techniques are combined with intelligent weighting and temporal smoothing to produce accurate, stable highlighting that enhances user experience rather than distracting from the presentation.

### Week 8: Real-Time Matching Algorithm Implementation

Week 8 focuses on building the core matching algorithm optimized for real-time performance. Every architectural decision prioritizes speed while maintaining accuracy, since highlighting must feel instantaneous to users.

**Memory-Resident Data Structures**

When a recording session starts after PDF processing completes, load all processed slide data into memory for ultra-fast access during matching. Design memory structures for efficient lookup rather than minimizing memory usage, since modern servers have plenty of RAM. A typical thirty-slide presentation requires one to two gigabytes of memory including all data structures.

Load the inverted keyword index as a Python dictionary mapping normalized keywords to lists of occurrences. Each occurrence contains slide_number, position, element_type, and tfidf_weight. This dictionary provides O(1) constant-time lookup for any keyword. Load slide embeddings as a numpy array with shape (num_blocks, embedding_dim). For example, one hundred fifty text blocks with seven hundred sixty-eight dimensional embeddings creates an array of shape (150, 768). Build a FAISS IndexFlatIP index from these embeddings by normalizing them to unit length and adding to the index. This enables fast similarity search.

Load normalized text for each slide as another dictionary mapping slide_number to normalized_text string. This enables fuzzy matching where you need to compute edit distance against slide text. Load structural information as a dictionary mapping slide_number and element_position to element_type like title or body. This helps boost matches in important elements like titles.

Precompute and cache everything possible to avoid repeated calculations. For instance, pre-normalize all slide keywords once rather than normalizing during each lookup. Cache the FAISS index completely built rather than rebuilding it for each query. These optimizations reduce matching latency from potentially several hundred milliseconds to under two hundred milliseconds consistently.

**Three-Pass Matching Strategy**

Implement a matching strategy with three complementary passes that together provide robust matching across different types of content and speech patterns.

The first pass is exact keyword matching using the inverted index. When a final transcript segment arrives, tokenize it using the same MeCab tokenizer used for slides. This tokenization takes only a few milliseconds for typical segments of ten to twenty words. Extract content words by filtering out particles and common words. For each content word, look it up in the keyword index. The lookup is essentially instant since dictionaries provide constant-time access. For each matching keyword, retrieve the list of slides containing it along with TF-IDF weights. Aggregate matches by slide, summing the TF-IDF weights of all matched keywords for each slide. This gives you a score indicating keyword overlap strength.

The second pass is fuzzy matching for words that didn't match exactly. Speech recognition sometimes transcribes words slightly differently than they appear on slides, especially for proper nouns, technical terms, or words not in Google's vocabulary. For each transcript word that didn't match any keyword exactly, compute edit distance against nearby keywords. Use rapid fuzz library which provides fast approximate string matching. Set a similarity threshold of point eight, meaning words must be at least eighty percent similar to match. Apply a discount factor of point seven to fuzzy match scores since they're less reliable than exact matches. This pass catches recognition errors and spelling variations.

The third pass is semantic matching using embeddings. Encode the transcript segment as an embedding vector using the same sentence transformer model used for slides. Query the FAISS index with this vector to find the top five most similar slide text blocks. The FAISS search returns cosine similarities since you used IndexFlatIP with normalized vectors. Filter results to only those with similarity above point seven, indicating reasonable semantic relevance. This pass catches paraphrased content where the speaker explains a concept using completely different words than the slides.

**Score Combination and Normalization**

Combine scores from all three passes using weighted sums that reflect the reliability of each matching technique. Exact keyword matches get weight one point zero since they're highly precise, indicating the exact same word appears in both transcript and slide. Fuzzy matches get weight point seven accounting for uncertainty, since similar words might be coincidental rather than true matches. Semantic matches get weight point five since embeddings can produce false positives when similar words appear in different contexts.

Add positional boosts based on where matches occur in slides. If a keyword matches in a slide title, multiply its contribution by one point five since titles are the strongest indicators of slide topic. Matches in headings get a boost of one point two. Matches in bullet points or body text get no boost, using their base weight. This positional weighting ensures that even a single title match can outweigh multiple body text matches, which aligns with how humans think about slide content.

Normalize combined scores by slide text length to prevent long slides from always scoring higher. Long slides with more text naturally match more keywords simply due to having more opportunities for matches. Divide raw scores by the square root of word count per slide. This normalization factor provides a reasonable balance, not over-penalizing length differences while still accounting for them. For example, a slide with one hundred words gets divided by ten, while a slide with four hundred words gets divided by twenty.

**Temporal Smoothing**

Implement temporal smoothing to prevent rapid slide changes that would be jarring for users. Presentations typically discuss one slide for several sentences before moving to the next, so you should maintain slide stability across consecutive segments.

Track the currently highlighted slide across segments. When scoring slides for a new segment, boost the current slide's score by thirty percent. This boost creates hysteresis, making it harder to switch away from the current slide than it is to stay on it. Only switch to a different slide if its score exceeds the current slide's boosted score by a factor of one point five. This multiplier means you need strong evidence before changing slides.

Maintain a history buffer of the last three to five matched slides with their timestamps and scores. Use this history to detect patterns. If the same slide matched two segments ago but a different slide matched in between, that intervening match might be a false positive. Consider jumping back to the earlier slide if the current segment also matches it strongly. This pattern recognition handles cases where speakers briefly mention something related to a different slide then return to their main topic.

**Thresholding and Confidence**

Set a minimum matching threshold to distinguish between legitimate matches and noise. If the highest scoring slide has a score below two point zero, return NO_MATCH rather than showing a weak highlight. During Q&A sessions or off-topic tangents, transcript segments might not match any slide well. It's better to temporarily remove highlighting than to show incorrect highlights that confuse users.

Calculate a confidence score for each match based on score magnitude, match type distribution, and consistency with recent history. A match with score above five including mostly exact keyword matches in the title with consistent neighboring matches gets confidence near one point zero. A match with score around three including mostly semantic matches with no recent history gets confidence around point five. Send this confidence to the frontend so it can style highlights appropriately, perhaps using full opacity for high confidence and partial transparency for medium confidence.

### Week 9: Performance Optimization and Testing

Week 9 focuses on optimizing the matching algorithm to consistently meet the sub-two-hundred-millisecond latency requirement and testing with realistic presentation scenarios to validate both performance and quality.

**Profiling and Bottleneck Identification**

Use Python profiling tools to measure where time is spent during matching and identify bottlenecks. Use cProfile for function-level profiling to see which functions consume the most time. Use line_profiler for line-by-line analysis of hot functions where you need fine-grained detail. Run the matching algorithm on sample transcript segments while profiling to collect timing data.

Common bottlenecks you might discover include tokenization taking too long if MeCab isn't initialized properly at the module level, embedding encoding being slow on CPU for semantic matching, fuzzy matching comparing against too many candidates when you should limit comparisons to top-scoring slides after exact matching, and JSON parsing being inefficient if you're loading slide data from disk repeatedly rather than keeping it in memory.

Optimize identified bottlenecks systematically. For tokenization, initialize the MeCab tagger once at session start and reuse it for all segments rather than creating a new tagger instance per segment. For embedding encoding, maintain a small LRU cache of recent segment embeddings since consecutive segments often have similar content. For fuzzy matching, only compare against keywords from the top ten slides after exact matching rather than all keywords from all slides. For data loading, ensure all slide data loads into memory at session start and stays resident throughout the recording.

Use compiled implementations where available. NumPy operations are already compiled C code. FAISS provides optimized C++ implementations for similarity search. Consider using Cython for critical paths if pure Python is still too slow after other optimizations. However, avoid premature optimization. Only optimize code paths proven by profiling to be bottlenecks. Clean, readable Python is often fast enough, and optimization adds complexity.

**Parallelization**

Consider implementing parallel processing where it's safe and beneficial. Run the three matching passes in parallel using threads since most operations either release Python's Global Interpreter Lock or are I/O bound. For instance, exact keyword matching, fuzzy matching, and embedding similarity search can run concurrently then combine results. This parallelization can reduce total matching time by thirty to fifty percent compared to sequential processing.

However, be cautious with parallelization complexity. Ensure thread safety when accessing shared data structures like the keyword index and embedding arrays. Use locks if necessary though most operations are read-only so conflicts are unlikely. Avoid race conditions when updating the current highlighted slide state since multiple segments might complete matching simultaneously. For the initial implementation, sequential processing is simpler and might be sufficient. Add parallelization only if profiling shows you need it to meet latency targets.

**Load Testing**

Simulate realistic presentation scenarios to validate performance under various conditions. Create test recordings with continuous speech at natural speaking pace, typically one hundred twenty to one hundred eighty words per minute for Japanese. Generate transcript segments arriving every two to five seconds as Google's streaming API would produce final results. Measure end-to-end matching latency from receiving a transcript segment to returning match results.

Test with varying presentation characteristics. Short presentations with ten slides and ten minutes duration to validate basic functionality. Typical presentations with thirty slides and thirty minutes duration representing your primary use case. Long presentations with sixty slides and one hour duration testing sustained performance. Dense text slides with many keywords seeing if matching slows down with more comparison operations. Sparse slides with few keywords testing minimum match scenarios. Mixed content with some slides being images-only testing NO_MATCH handling.

Stress test by simulating multiple concurrent recording sessions. Create ten to twenty simulated sessions running simultaneously, each processing audio independently. Each session maintains its own memory-resident slide data and matching state, so memory usage scales linearly. Validate that matching latency remains acceptable under load. Check that CPU usage stays reasonable with all sessions running. Monitor memory usage to ensure it doesn't grow unexpectedly indicating memory leaks.

**Quality Testing**

Beyond performance, validate matching quality with real presentation data. Manually annotate test presentations with correct slide matches for each transcript segment as ground truth. Record yourself or colleagues giving actual presentations using your test slides. Transcribe the audio using your streaming system. For each transcript segment, manually note which slide should be highlighted based on what was said. This creates a gold standard dataset for evaluation.

Run the matching algorithm and compare predicted matches against ground truth. Calculate precision as the percentage of predicted matches that are correct. If your algorithm predicted fifty matches and forty were correct, precision is eighty percent. Calculate recall as the percentage of true matches that were detected. If there were fifty true matches and your algorithm found forty, recall is eighty percent. Compute F1 score as the harmonic mean of precision and recall using the formula two times precision times recall divided by precision plus recall. Target an F1 score above point eight for good user experience.

Analyze mismatches to understand failure patterns. Review false positives where the algorithm matched a wrong slide. Common causes include similar content appearing on multiple slides causing ambiguous matches, speakers using words that coincidentally appear on unrelated slides, or temporal smoothing being too strong causing sticky matches that persist too long. Review false negatives where the algorithm missed a true match. Common causes include speakers deviating significantly from slide content with tangential examples, technical terms being transcribed incorrectly preventing keyword matches, or semantic similarity being too conservative with threshold too high.

Tune algorithm parameters based on quality testing results. Adjust keyword match weight between point eight and one point two from the base of one point zero. Adjust fuzzy match threshold between point seven and point nine from point eight. Adjust semantic similarity cutoff between point six and point eight from point seven. Adjust temporal smoothing strength between point two and point four from point three. Adjust minimum score threshold between one point five and three point zero from two point zero. Use a separate validation set for tuning to avoid overfitting to your test set. Document final parameter values with rationale for each choice based on empirical testing.

### Week 10: Integration, Error Handling, and Finalization

Week 10 brings all components together into a cohesive system, implements robust error handling that gracefully degrades when issues occur, and finalizes the implementation with comprehensive documentation.

**End-to-End Integration**

Build the complete workflow from user PDF upload through live recording to final results storage. When a user uploads a PDF, trigger the Phase 2 processing pipeline. Store the PDF in GCS under presentations/{id}/input/slides.pdf. Start PDF processing in background thread or async task. Update presentation status in database to "processing". Poll processing status and calculate progress percentage based on which processing steps have completed. When processing completes successfully, update status to "ready" and notify the frontend via WebSocket or server-sent events that the user can now start recording.

When the frontend requests to start recording by sending a start_session message with presentation_id, initialize a streaming session. Load slide data into memory from presentations/{id}/slides/ including extracted.json, processed.json, index.json, and embeddings.npy. Build memory-resident structures including keyword dictionary, FAISS index, and normalized text mapping. Establish Google Cloud streaming connection with proper configuration. Open WebSocket connection to frontend for bidirectional communication. Return session_ready message to frontend with session_id allowing the user to begin speaking.

During recording, handle the continuous flow. Audio chunks arrive from frontend via WebSocket. Forward chunks immediately to Google Cloud Speech streaming connection. Interim and final results arrive from Google asynchronously on separate thread. For final results, trigger matching algorithm with transcript segment. Send matched results to frontend via WebSocket with highlight updates including slide_page, matched_keywords, positions array, score, and confidence. Store each segment in session buffer for later saving.

After recording ends when user clicks "Stop Recording", finalize the session. Stop accepting new audio chunks. Close Google Cloud streaming connection gracefully. Process any remaining buffered data and wait for final results. Generate summary statistics including total_duration, word_count, average_confidence, session_renewals, total_cost. Save complete results to GCS under presentations/{id}/results/ including transcript.json, words.json, matches.json, timeline.json, optional translation.json, and metadata.json. Update database with presentation status "completed" and final statistics.

**Error Handling and Recovery**

Implement comprehensive error handling at every stage with graceful degradation rather than complete failures. During PDF processing, handle extraction failures by retrying with OCR if initial extraction returns too little text. If OCR also fails, return clear error message to user requesting better quality PDF with specific guidance like "This PDF could not be processed. Please ensure it's not password-protected and contains actual text rather than just images." During streaming, handle connection failures by attempting automatic reconnection with exponential backoff. After the first failure, wait one second and retry. After the second failure, wait two seconds. Continue up to five attempts before giving up and notifying the user of persistent connectivity issues.

Handle matching errors gracefully by logging errors but continuing to process subsequent segments. If matching throws an exception for one segment, catch it, log full details including segment text and stack trace, increment error counter, and return NO_MATCH for that segment rather than crashing the entire session. Fall back to keyword-only matching if embedding similarity fails due to model loading issues. Skip segments that cause repeated exceptions rather than blocking the pipeline.

Implement session recovery for scenarios where the backend service restarts during an active recording. Persist session state periodically to database or Redis cache including session_id, presentation_id, current_highlighted_slide, last_processed_timestamp, accumulated_segment_count, and streaming_connection_metadata. When service restarts, check for orphaned sessions in database where status is "recording" but backend connection is lost. Attempt to reconnect these sessions if the user's frontend is still active and sending heartbeat messages. Otherwise, mark sessions as "interrupted" and notify users that their recording was lost.

**Result Storage Schema**

Design the final result storage schema in GCS under presentations/{presentation_id}/results/ with consistent structure across all presentations. The transcript.json file contains full_text concatenating all segments, language code, overall_confidence averaged across segments, duration_seconds, word_count, and segments array with objects containing id, text, start_time, end_time, confidence. The words.json file contains an array of word objects with word text, start_time, end_time, confidence for precise playback synchronization.

The matches.json file contains an array of match objects with segment_id referencing transcript segment, slide_page number, matched_keywords array of strings, positions array of [start, end] character positions in slide text, score numeric matching score, match_types array like ["exact", "semantic"], confidence, timestamp. The timeline.json file contains an array of timeline events with timestamp and slide_page creating a simple mapping for synchronized playback. The optional translation.json file contains source_language, target_language, translated_text, segments array with translations per segment if translation feature is enabled.

The metadata.json file contains recording_start timestamp, recording_end timestamp, duration_seconds, model_used like "latest_long", features_enabled array, session_renewals count, average_confidence, cost_estimate_usd, errors array logging any issues encountered. Use consistent JSON schemas with version numbers like schema_version 1 to support future evolution. Include examples of each file format in documentation.

**Frontend Integration**

Define clear WebSocket protocols for real-time communication during recording sessions. Document message formats with type field indicating message type and additional fields specific to each type. Frontend to backend messages include start_session with presentation_id, audio_chunk with binary audio data and timestamp, stop_session with session_id, heartbeat for connection keepalive. Backend to frontend messages include session_ready with session_id, interim_result with text, timestamp, confidence, stability, final_result with complete segment and translation if enabled, highlight_update with slide_page, keywords, positions, score, confidence, error with error_code and message, session_ended with final summary.

Specify timing expectations. Audio chunks should arrive every one hundred milliseconds with chunk size of three thousand two hundred bytes for LINEAR16 at sixteen kilohertz. Interim results typically arrive every one to two seconds while user speaks continuously. Final results should have latency under one second from when speech ended. Highlight updates should arrive under two hundred milliseconds after final results. Provide error codes for various failure scenarios including AUTH_FAILED for authentication errors, INVALID_AUDIO for audio format problems, SESSION_TIMEOUT, PROCESSING_ERROR for internal failures, RATE_LIMIT_EXCEEDED if quotas are hit.

**Comprehensive Documentation**

Create documentation covering all aspects of the system. System architecture overview should include workflow diagrams showing the complete flow from PDF upload through recording to results, component diagrams showing how services interact, data flow diagrams showing how data moves through the pipeline. API specifications should document all endpoints with request and response formats, WebSocket protocol with all message types and examples, error codes with descriptions and resolution steps.

Configuration guide should explain all parameters including Google Cloud project settings, audio format requirements, matching algorithm parameters with tuning guidance, cost optimization settings. Deployment instructions should cover infrastructure requirements, dependency installation, environment variable configuration, service startup procedures, monitoring setup.

Developer documentation should provide guides for setting up development environment with step-by-step instructions, running tests with test data preparation, adding support for new languages beyond Japanese, tuning matching algorithm parameters based on feedback, debugging streaming issues with common problems and solutions. Include code examples showing how to use key APIs, real output samples from each processing stage, troubleshooting flowcharts for common issues.

### Phase 4 Deliverables

At the end of Phase 4, you should have a complete production-ready system. Your deliverables include a real-time matching engine with three-pass matching completing in under two hundred milliseconds, memory-resident data structures loaded at session start for fast access, temporal smoothing with configurable hysteresis preventing flickering, confidence scoring and thresholding avoiding false positive highlights.

Integration layer provides complete workflow from PDF upload through recording to final results, WebSocket protocol for real-time frontend communication, session management with initialization, monitoring, and finalization, GCS storage with consistent schemas across all presentations.

Error handling includes graceful degradation on failures without crashing sessions, automatic retry with exponential backoff for transient issues, session recovery after service restarts where possible, clear error messages for users when intervention is needed.

Performance achievements include matching latency consistently under two hundred milliseconds measured at ninety-fifth percentile, handling twenty plus concurrent sessions without degradation, memory usage under two gig