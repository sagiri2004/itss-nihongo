"""
LLM-based Summarizer Module

Provides advanced summarization using LLM APIs (OpenAI, Claude, Gemini)
with fallback to extractive methods.
"""

import logging
import os
import re
from pathlib import Path
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class LLMSummarizer:
    """
    LLM-based summarizer for high-quality summaries.
    
    Supports:
    - OpenAI GPT-4/GPT-3.5
    - Anthropic Claude
    - Google Gemini
    - Fallback to extractive methods
    """
    
    def __init__(self, provider: Optional[str] = None):
        """
        Initialize LLM summarizer.
        
        Args:
            provider: LLM provider ('openai', 'claude', 'gemini', or None for auto-detect)
        """
        # #region agent log
        # Debug: Check environment variables at initialization
        google_key = os.getenv("GOOGLE_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        provider_env = os.getenv("LLM_SUMMARIZER_PROVIDER", "")
        
        # Write to debug log
        DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
        try:
            with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
                import json
                import time
                log_entry = {
                    "timestamp": int(time.time() * 1000),
                    "location": "llm_summarizer.py:26",
                    "message": "LLMSummarizer.__init__ - checking env vars",
                    "data": {
                        "GOOGLE_API_KEY_set": bool(google_key),
                        "GOOGLE_API_KEY_length": len(google_key) if google_key else 0,
                        "OPENAI_API_KEY_set": bool(openai_key),
                        "ANTHROPIC_API_KEY_set": bool(anthropic_key),
                        "LLM_SUMMARIZER_PROVIDER": provider_env,
                        "provider_param": provider
                    },
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B"
                }
                f.write(json.dumps(log_entry) + "\n")
        except Exception as e:
            pass
        
        logger.debug(f"LLMSummarizer.__init__: GOOGLE_API_KEY={'SET' if google_key else 'NOT SET'}, "
                    f"OPENAI_API_KEY={'SET' if openai_key else 'NOT SET'}, "
                    f"ANTHROPIC_API_KEY={'SET' if anthropic_key else 'NOT SET'}, "
                    f"LLM_SUMMARIZER_PROVIDER={provider_env}")
        # #endregion
        
        self.provider = provider or os.getenv("LLM_SUMMARIZER_PROVIDER", "").lower()
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize LLM client based on provider and available API keys.
        
        Priority: Force Gemini if GOOGLE_API_KEY is available, otherwise check other providers.
        """
        # #region agent log
        logger.debug(f"LLMSummarizer._initialize_client: provider={self.provider}")
        # #endregion
        
        # Force Gemini if GOOGLE_API_KEY is available (highest priority)
        google_key = os.getenv("GOOGLE_API_KEY")
        if google_key:
            try:
                import google.generativeai as genai
                # #region agent log
                DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
                try:
                    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
                        import json
                        import time
                        log_entry = {
                            "timestamp": int(time.time() * 1000),
                            "location": "llm_summarizer.py:88",
                            "message": "LLMSummarizer._initialize_client - Force Gemini (GOOGLE_API_KEY found)",
                            "data": {
                                "provider": self.provider,
                                "api_key_set": bool(google_key),
                                "api_key_length": len(google_key) if google_key else 0,
                            },
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "F"
                        }
                        f.write(json.dumps(log_entry) + "\n")
                except Exception as e:
                    pass
                # #endregion
                
                genai.configure(api_key=google_key)
                self.client = genai
                self.provider = "gemini"
                logger.info("Initialized Google Gemini client for summarization (forced)")
                return
            except ImportError:
                logger.warning("google-generativeai package not installed. Install with: pip install google-generativeai")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini client: {e}")
        
        # Fallback to other providers only if Gemini is not available
        if self.provider == "openai" or (not self.provider and os.getenv("OPENAI_API_KEY")):
            try:
                import openai
                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    self.client = openai.OpenAI(api_key=api_key)
                    self.provider = "openai"
                    logger.info("Initialized OpenAI client for summarization")
                    return
            except ImportError:
                logger.warning("openai package not installed. Install with: pip install openai")
        
        if self.provider == "claude" or (not self.provider and os.getenv("ANTHROPIC_API_KEY")):
            try:
                import anthropic
                api_key = os.getenv("ANTHROPIC_API_KEY")
                if api_key:
                    self.client = anthropic.Anthropic(api_key=api_key)
                    self.provider = "claude"
                    logger.info("Initialized Anthropic Claude client for summarization")
                    return
            except ImportError:
                logger.warning("anthropic package not installed. Install with: pip install anthropic")
        
        # Legacy Gemini check (should not reach here if GOOGLE_API_KEY is set)
        if self.provider == "gemini" or (not self.provider and os.getenv("GOOGLE_API_KEY")):
            try:
                import google.generativeai as genai
                api_key = os.getenv("GOOGLE_API_KEY")
                # #region agent log
                DEBUG_LOG_PATH = Path("/home/sagiri/Code/itss-nihongo/.cursor/debug.log")
                try:
                    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
                        import json
                        import time
                        log_entry = {
                            "timestamp": int(time.time() * 1000),
                            "location": "llm_summarizer.py:63",
                            "message": "LLMSummarizer._initialize_client - Gemini check",
                            "data": {
                                "provider": self.provider,
                                "api_key_set": bool(api_key),
                                "api_key_length": len(api_key) if api_key else 0,
                                "api_key_value": api_key[:20] + "..." if api_key and len(api_key) > 20 else api_key
                            },
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C"
                        }
                        f.write(json.dumps(log_entry) + "\n")
                except Exception as e:
                    pass
                
                logger.debug(f"LLMSummarizer._initialize_client: Checking Gemini - api_key={'SET' if api_key else 'NOT SET'}, length={len(api_key) if api_key else 0}")
                # #endregion
                if api_key:
                    genai.configure(api_key=api_key)
                    self.client = genai
                    self.provider = "gemini"
                    logger.info("Initialized Google Gemini client for summarization")
                    return
                else:
                    # #region agent log
                    logger.warning("GOOGLE_API_KEY environment variable is empty or None")
                    # #endregion
            except ImportError:
                logger.warning("google-generativeai package not installed. Install with: pip install google-generativeai")
        
        # No LLM available, will use fallback
        self.client = None
        self.provider = None
        logger.info("No LLM API configured. Will use extractive summarization fallback.")
    
    def summarize_global(self, slides_data: List[Dict], max_sentences: int = 5) -> Optional[str]:
        """
        Generate global summary using LLM.
        
        Args:
            slides_data: List of slide dictionaries with 'page_number' and 'summary'
            max_sentences: Maximum number of sentences in summary
            
        Returns:
            Summary text or None if LLM not available
        """
        if not self.client:
            return None
        
        # Collect all summaries
        summaries = []
        for slide in slides_data:
            summary = slide.get('summary', '').strip()
            if summary:
                summaries.append(summary)
        
        if not summaries:
            return None
        
        # Combine summaries
        combined_text = "。".join(summaries)
        
        # Limit input length (most LLMs have token limits)
        max_input_length = 8000  # Conservative limit
        if len(combined_text) > max_input_length:
            # Take first part and last part
            combined_text = combined_text[:max_input_length//2] + "..." + combined_text[-max_input_length//2:]
        
        # Create prompt
        prompt = self._create_summary_prompt(combined_text, max_sentences)
        
        try:
            if self.provider == "openai":
                return self._summarize_openai(prompt)
            elif self.provider == "claude":
                return self._summarize_claude(prompt)
            elif self.provider == "gemini":
                return self._summarize_gemini(prompt)
        except Exception as e:
            logger.error(f"LLM summarization failed: {e}")
            return None
    
    def _create_summary_prompt(self, text: str, max_sentences: int) -> str:
        """Create prompt for LLM summarization with clear format requirements."""
        return f"""あなたは日本語のプレゼンテーション資料を要約する専門家です。

【指示】
- 以下のスライド内容を読み、主要なテーマと重要なポイントを抽出してください
- 要約は{max_sentences}文以内で簡潔にまとめてください
- 各文は明確で分かりやすく、重要な情報を含めてください
- マークダウンや箇条書きは使用せず、通常の文章形式で出力してください
- 余計な装飾や記号は使用しないでください

【スライド内容】
{text}

【要約】
（ここに要約を記入してください。{max_sentences}文以内で簡潔に。）"""
    
    def _summarize_openai(self, prompt: str) -> str:
        """Summarize using OpenAI API."""
        model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "あなたは日本語のプレゼンテーション資料を要約する専門家です。簡潔で分かりやすい要約を作成してください。"},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        return response.choices[0].message.content.strip()
    
    def _summarize_claude(self, prompt: str) -> str:
        """Summarize using Anthropic Claude API."""
        model = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")
        
        message = self.client.messages.create(
            model=model,
            max_tokens=500,
            temperature=0.3,
            system="あなたは日本語のプレゼンテーション資料を要約する専門家です。簡潔で分かりやすい要約を作成してください。",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        return message.content[0].text.strip()
    
    def _summarize_gemini(self, prompt: str) -> str:
        """Summarize using Google Gemini API with improved prompts and format control."""
        # Try different model names (prioritize free/available models first)
        # Based on testing: gemini-1.5-flash is available and free
        model_names = [
            os.getenv("GEMINI_MODEL", "gemini-1.5-flash"),  # Default to tested free model
            "gemini-1.5-flash",  # ✅ Tested: Available and free
            "gemini-1.5-flash-lite",  # Lightweight alternative
            "gemini-flash-latest",  # Latest stable flash
            "gemini-2.0-flash-001",  # Stable 2.0 version
            "gemini-2.0-flash",  # 2.0 flash
            "gemini-2.0-flash-lite-001",  # Lightweight 2.0
            "gemini-2.5-pro",  # Pro version (may have quota limits)
            "gemini-1.5-flash",  # Older version
            "gemini-1.5-pro",  # Older pro version
            "gemini-pro",  # Legacy
        ]
        
        model = None
        last_error = None
        
        for model_name in model_names:
            try:
                model = self.client.GenerativeModel(model_name)
                # Test if model works by trying to generate
                break
            except Exception as e:
                last_error = e
                continue
        
        if model is None:
            raise RuntimeError(f"Could not initialize Gemini model. Tried: {model_names}. Last error: {last_error}")
        
        # Generation config for concise, focused output
        generation_config = {
            "temperature": 0.2,  # Lower temperature for more focused output
            "max_output_tokens": 500,
            "top_p": 0.8,  # Nucleus sampling for better quality
            "top_k": 40,  # Limit vocabulary for more focused responses
        }
        
        # System instruction for Gemini (using system_instruction parameter if available)
        system_instruction = """あなたは日本語のプレゼンテーション資料を要約する専門家です。

重要なルール:
1. 要約は指定された文数以内で簡潔にまとめる
2. 主要なテーマと重要なポイントを抽出する
3. マークダウン、箇条書き、装飾記号は使用しない
4. 通常の文章形式で自然な日本語で出力する
5. 余計な説明や前置きは不要、要約のみを出力する"""
        
        try:
            # Try with system_instruction (newer Gemini models support this)
            response = model.generate_content(
                prompt,
                generation_config=generation_config,
                system_instruction=system_instruction
            )
        except Exception:
            # Fallback for older models that don't support system_instruction
            full_prompt = f"{system_instruction}\n\n{prompt}"
            response = model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
        
        # Extract and clean the response text
        result_text = response.text.strip()
        
        # Remove any markdown formatting that might have been added
        # Remove markdown headers, bullets, etc.
        result_text = re.sub(r'^#+\s*', '', result_text, flags=re.MULTILINE)  # Remove headers
        result_text = re.sub(r'^\s*[-*+]\s*', '', result_text, flags=re.MULTILINE)  # Remove bullets
        result_text = re.sub(r'^\s*\d+\.\s*', '', result_text, flags=re.MULTILINE)  # Remove numbered lists
        result_text = re.sub(r'\*\*([^*]+)\*\*', r'\1', result_text)  # Remove bold
        result_text = re.sub(r'\*([^*]+)\*', r'\1', result_text)  # Remove italic
        
        # Clean up extra whitespace
        result_text = re.sub(r'\n\s*\n', '\n', result_text)  # Multiple newlines to single
        result_text = result_text.strip()
        
        return result_text

