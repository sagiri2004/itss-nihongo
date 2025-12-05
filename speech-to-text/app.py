#!/usr/bin/env python3
"""
Streamlit Real-Time Presentation App with PyAudio

Upload PDF slides, process them, then record with server-side PyAudio for real-time transcription.
"""

import streamlit as st
import os
import sys
import json
import tempfile
from pathlib import Path
import uuid
import queue
import threading
import numpy as np
import logging
import time
import pyaudio

logger = logging.getLogger(__name__)

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.google_cloud.gcs_storage import GCSStorage
from src.slide_processing import SlideProcessor
from src.streaming.session_manager import StreamingSessionManager

# Audio parameters for PyAudio
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms chunks
CHANNELS = 1
FORMAT = pyaudio.paInt16

# Page configuration
st.set_page_config(
    page_title="Real-Time Presentation Transcription",
    page_icon="🎤",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'slides_processed' not in st.session_state:
    st.session_state.slides_processed = False
if 'presentation_id' not in st.session_state:
    st.session_state.presentation_id = None
if 'slide_count' not in st.session_state:
    st.session_state.slide_count = 0
if 'slide_processor' not in st.session_state:
    st.session_state.slide_processor = None
if 'transcripts' not in st.session_state:
    st.session_state.transcripts = []
if 'current_slide' not in st.session_state:
    st.session_state.current_slide = None
if 'session_manager' not in st.session_state:
    st.session_state.session_manager = None
if 'recording_session_id' not in st.session_state:
    st.session_state.recording_session_id = None
if 'recording_active' not in st.session_state:
    st.session_state.recording_active = False
if 'audio_thread' not in st.session_state:
    st.session_state.audio_thread = None
if 'result_queue' not in st.session_state:
    st.session_state.result_queue = queue.Queue()
if 'export_file_path' not in st.session_state:
    st.session_state.export_file_path = None


# Sidebar - Configuration
st.sidebar.header("⚙️ Configuration")

# Load credentials
default_creds = str(Path(__file__).resolve().with_name("speech-processing-prod-9ffbefa55e2c.json"))
credentials_path = st.sidebar.text_input(
    "GCP Credentials Path",
    value=os.getenv('GOOGLE_APPLICATION_CREDENTIALS', default_creds)
)

# Get project ID from credentials
project_id = None
if os.path.exists(credentials_path):
    with open(credentials_path) as f:
        creds = json.load(f)
        project_id = creds.get('project_id')
    st.sidebar.success(f"✅ Connected to project: {project_id}")
else:
    st.sidebar.error("❌ Credentials file not found")

# GCS bucket
bucket_name = st.sidebar.text_input(
    "GCS Bucket Name",
    value=os.getenv('GCS_BUCKET_NAME', 'speech-processing-intermediate')
)

# Main content
st.title("🎤 Real-Time Presentation Transcription")
st.markdown("Upload PDF slides, process them, then record in browser for live transcription with slide matching.")

st.divider()

# Step 1: Upload and Process Slides
if not st.session_state.slides_processed:
    st.header("📄 Step 1: Upload & Process Slides")
    
    pdf_file = st.file_uploader(
        "Choose a PDF file",
        type=['pdf'],
        help="Upload your presentation slides"
    )
    
    if pdf_file:
        st.success(f"✅ PDF loaded: {pdf_file.name} ({pdf_file.size / 1024:.1f} KB)")
        
        process_button = st.button(
            "🚀 Process Slides for Real-Time Recognition",
            type="primary",
            use_container_width=True
        )
        
        if process_button:
            with st.spinner("Processing slides..."):
                try:
                    # Generate presentation ID
                    st.session_state.presentation_id = f"live-{uuid.uuid4().hex[:8]}"
                    
                    # Create progress indicators
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    # Save PDF temporarily
                    status_text.text("📁 Saving PDF...")
                    progress_bar.progress(20)
                    
                    with tempfile.TemporaryDirectory() as temp_dir:
                        pdf_path = os.path.join(temp_dir, pdf_file.name)
                        with open(pdf_path, 'wb') as f:
                            f.write(pdf_file.getvalue())
                        
                        # Upload to GCS
                        status_text.text("☁️ Uploading to Google Cloud Storage...")
                        progress_bar.progress(40)
                        
                        storage = GCSStorage(
                            credentials_path=credentials_path,
                            bucket_name=bucket_name
                        )
                        
                        pdf_gcs_path = f"temp/{st.session_state.presentation_id}/slides.pdf"
                        pdf_gcs_uri = storage.upload_file(pdf_path, pdf_gcs_path)
                        
                        # Process PDF with SlideProcessor
                        status_text.text("🔍 Extracting keywords and building index...")
                        progress_bar.progress(80)
                        
                        slide_processor = SlideProcessor(use_embeddings=True)
                        result = slide_processor.process_pdf(pdf_path)
                        
                        st.session_state.slide_processor = slide_processor
                        st.session_state.slide_count = result.get('slide_count', 0)
                        
                        # Export full results to file in result folder
                        status_text.text("💾 Exporting results...")
                        progress_bar.progress(90)
                        
                        try:
                            # Create result folder if not exists
                            result_dir = Path(__file__).parent / "result"
                            result_dir.mkdir(exist_ok=True)
                            
                            # Export file
                            export_filename = f"{Path(pdf_file.name).stem}_processing_results.json"
                            export_path = result_dir / export_filename
                            slide_processor.export_full_results(str(export_path), format="json")
                            
                            st.session_state.export_file_path = str(export_path)
                            logger.info(f"Exported results to: {export_path}")
                        except Exception as e:
                            logger.error(f"Failed to export results: {e}", exc_info=True)
                            st.session_state.export_file_path = None
                        
                        progress_bar.progress(100)
                        status_text.text("✅ Slides processed!")
                        
                        st.session_state.slides_processed = True
                        
                        st.success(f"""
                        🎉 Slides processed successfully!
                        - Total slides: {result.get('slide_count', 0)}
                        - Keywords extracted: {result.get('keywords_count', 0)}
                        - Embeddings: {'Yes' if result.get('has_embeddings') else 'No'}
                        - Ready for real-time recording!
                        """)
                        
                        # Show file path
                        if st.session_state.get('export_file_path'):
                            st.info(f"📁 Results exported to: `{st.session_state.export_file_path}`")
                        
                        st.rerun()
                        
                except Exception as e:
                    st.error(f"❌ Error processing slides: {str(e)}")
                    import traceback
                    st.code(traceback.format_exc())

# Step 2: Real-Time Recording with WebRTC
else:
    st.header("🎙️ Step 2: Real-Time Browser Recording")
    st.info(f"📑 Presentation ready: {st.session_state.slide_count} slides processed")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("🎤 Microphone Recording")
        
        # Result callback for streaming (runs in background thread - can't access session_state)
        def handle_result(result):
            """Handle transcription results from Google Cloud"""
            # Result is a StreamingResult object
            is_final = getattr(result, 'is_final', False)
            text = getattr(result, 'text', '')
            confidence = getattr(result, 'confidence', 0)
            
            # Print to console (can't update session_state from thread)
            if is_final:
                print(f"✅ FINAL: {text} (conf: {confidence:.2%})")
            else:
                print(f"⏳ INTERIM: {text}")
            
            # Store in thread-safe queue
            if not hasattr(st.session_state, 'result_queue'):
                st.session_state.result_queue = queue.Queue()
            
            try:
                result_dict = {
                    'is_final': is_final,
                    'text': text,
                    'confidence': confidence,
                    'timestamp': getattr(result, 'timestamp', None)
                }
                st.session_state.result_queue.put(result_dict)
            except:
                pass  # Ignore if queue not available
        
        
        
        # Initialize session manager
        if st.session_state.session_manager is None and project_id:
            try:
                st.session_state.session_manager = StreamingSessionManager(
                    credentials_path=credentials_path,
                    project_id=project_id,
                    result_callback=handle_result
                )
            except Exception as e:
                st.error(f"Failed to initialize: {e}")
                st.session_state.session_manager = None
        
        # PyAudio Recording Controls
        if st.session_state.session_manager:
            st.info("✨ Using PyAudio (server-side microphone capture)")
            
            col_start, col_stop = st.columns(2)
            
            with col_start:
                start_btn = st.button(
                    "🔴 START Recording",
                    disabled=st.session_state.recording_active,
                    use_container_width=True,
                    type="primary"
                )
            
            with col_stop:
                stop_btn = st.button(
                    "⏹️ STOP Recording",
                    disabled=not st.session_state.recording_active,
                    use_container_width=True
                )
            
            # Handle START
            if start_btn and not st.session_state.recording_active:
                session_id = f"pyaudio-{uuid.uuid4().hex[:8]}"
                st.session_state.session_manager.create_session(
                    session_id=session_id,
                    presentation_id=st.session_state.presentation_id
                )
                st.session_state.recording_session_id = session_id
                
                # Capture references for thread (can't access session_state in thread)
                session_mgr = st.session_state.session_manager
                
                # Shared flag for stopping thread
                class RecordingState:
                    active = True
                
                st.session_state.recording_state = RecordingState
                
                # Start audio capture thread
                def audio_capture_worker(session_manager, sess_id, recording_state):
                    session = session_manager.get_session(sess_id)
                    
                    p = pyaudio.PyAudio()
                    stream = p.open(
                        format=FORMAT,
                        channels=CHANNELS,
                        rate=RATE,
                        input=True,
                        frames_per_buffer=CHUNK
                    )
                    
                    # Start continuous capture in background FIRST (like demo)
                    def continuous_capture():
                        while recording_state.active:
                            try:
                                data = stream.read(CHUNK, exception_on_overflow=False)
                                session.audio_queue.put(data, timeout=0.1)
                                session.total_chunks_sent += 1
                                session.total_bytes_sent += len(data)
                            except Exception as e:
                                print(f"Audio capture error: {e}")
                                break
                    
                    capture_thread = threading.Thread(target=continuous_capture, daemon=True)
                    capture_thread.start()
                    
                    # Wait for buffering
                    print("🔊 Buffering audio...")
                    time.sleep(0.5)  # Buffer ~500ms
                    
                    print(f"🚀 Starting Google Cloud session (audio already streaming)...")
                    
                    # NOW start session with continuous audio already flowing
                    try:
                        session_manager.start_session(
                            sess_id,
                            language_code="ja-JP",
                            model="latest_long",
                            enable_interim_results=True
                        )
                    except Exception as e:
                        print(f"Session error: {e}")
                        recording_state.active = False
                    
                    # Wait for recording to stop
                    capture_thread.join()
                    
                    stream.stop_stream()
                    stream.close()
                    p.terminate()
                    print("🛑 Recording stopped")
                
                st.session_state.recording_active = True
                st.session_state.audio_thread = threading.Thread(
                    target=audio_capture_worker,
                    args=(session_mgr, session_id, st.session_state.recording_state),
                    daemon=True
                )
                st.session_state.audio_thread.start()
                st.rerun()
            
            # Handle STOP
            if stop_btn and st.session_state.recording_active:
                st.session_state.recording_active = False
                if hasattr(st.session_state, 'recording_state'):
                    st.session_state.recording_state.active = False
                if st.session_state.recording_session_id:
                    try:
                        st.session_state.session_manager.close_session(
                            st.session_state.recording_session_id
                        )
                    except:
                        pass
                st.rerun()
            
            # Status
            if st.session_state.recording_active:
                st.success("🔴 Recording active (PyAudio)")
                time.sleep(0.5)
                st.rerun()
            else:
                st.info("⏸️ Not recording")
        else:
            st.warning("⚠️ Session manager not initialized")
        
        st.divider()
        
        # Transcription display
        st.subheader("📝 Live Transcription")
        
        # Process results from queue (populated by background thread)
        if hasattr(st.session_state, 'result_queue'):
            try:
                while True:
                    result = st.session_state.result_queue.get_nowait()
                    st.session_state.transcripts.append(result)
                    
                    # Match against slides
                    if result['is_final'] and st.session_state.slide_processor:
                        match = st.session_state.slide_processor.match_segment(
                            text=result['text'],
                            timestamp=result.get('timestamp')
                        )
                        if match:
                            st.session_state.current_slide = match.slide_id
            except queue.Empty:
                pass  # No more results in queue
        
        # Show stats
        if st.session_state.transcripts:
            st.caption(f"Total results: {len(st.session_state.transcripts)}")
        
        transcript_container = st.container()
        
        with transcript_container:
            if st.session_state.transcripts:
                st.markdown("---")
                for i, trans in enumerate(reversed(st.session_state.transcripts[-10:])):  # Show last 10
                    is_final = trans.get('is_final', False)
                    text = trans.get('text', '')
                    confidence = trans.get('confidence', 0)
                    
                    if is_final:
                        st.markdown(f"✅ **{text}** _(confidence: {confidence:.2%})_")
                    else:
                        st.markdown(f"⏳ _{text}_ (interim)")
            else:
                st.info("🎤 Waiting for speech... Speak in Japanese")
    
    with col2:
        st.subheader("📊 Current Slide")
        
        if st.session_state.current_slide:
            slide_info = st.session_state.slide_processor.get_slide_info(st.session_state.current_slide)
            if slide_info:
                st.success(f"**Slide {st.session_state.current_slide}**")
                st.write(f"**Title:** {slide_info.get('title', 'Untitled')}")
                
                content = slide_info.get('content', '')
                st.write("**Content:**")
                st.write(content[:200] + "..." if len(content) > 200 else content)
                
                if 'keywords' in slide_info:
                    st.write(f"**Keywords:** {', '.join(slide_info['keywords'][:5])}")
        else:
            st.info("No slide matched yet")
        
        st.divider()
        
        # Slide preview
        st.subheader("📑 All Slides")
        for i in range(1, min(st.session_state.slide_count + 1, 4)):
            slide_info = st.session_state.slide_processor.get_slide_info(i)
            if slide_info:  # Check if slide_info is not None
                title = slide_info.get('title', 'Untitled') or 'Untitled'
                with st.expander(f"Slide {i}: {title[:30]}"):
                    content = slide_info.get('content', 'No content')
                    st.write(content[:150] + "..." if len(content) > 150 else content)
            else:
                st.warning(f"Slide {i}: No information available")
        
        st.divider()
        
        if st.button("🔄 Process New Slides", use_container_width=True):
            # Clean up session
            if st.session_state.session_manager and st.session_state.recording_session_id:
                try:
                    st.session_state.session_manager.close_session(st.session_state.recording_session_id)
                except:
                    pass
            
            st.session_state.slides_processed = False
            st.session_state.slide_processor = None
            st.session_state.transcripts = []
            st.session_state.current_slide = None
            st.session_state.session_manager = None
            st.session_state.recording_session_id = None
            st.rerun()

# Footer
st.divider()
st.markdown("""
<div style='text-align: center; color: gray; padding: 20px;'>
    <p>🎤 Real-Time Presentation Transcription | Google Cloud Speech-to-Text V2 API</p>
    <p style='font-size: 12px;'>WebRTC browser recording with live slide matching</p>
</div>
""", unsafe_allow_html=True)
