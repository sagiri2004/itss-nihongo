#!/usr/bin/env python3
"""
Test script for Gemini LLM Summarizer
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print("Warning: .env file not found. Loading from environment...")
    load_dotenv()

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

def test_gemini_connection():
    """Test basic Gemini API connection"""
    print("=" * 60)
    print("Test 1: Basic Gemini API Connection")
    print("=" * 60)
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            print("❌ GOOGLE_API_KEY not found in environment")
            return False
        
        print(f"✓ API Key found: {api_key[:10]}...")
        
        genai.configure(api_key=api_key)
        # Try newer models first
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
        except:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
            except:
                model = genai.GenerativeModel("gemini-pro")
        
        response = model.generate_content("Xin chào, bạn có thể tóm tắt không? Hãy trả lời ngắn gọn.")
        print(f"✓ API Response: {response.text[:100]}...")
        print("✅ Gemini API connection successful!\n")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}\n")
        return False

def test_llm_summarizer():
    """Test LLM Summarizer initialization"""
    print("=" * 60)
    print("Test 2: LLM Summarizer Initialization")
    print("=" * 60)
    
    try:
        from pdf_processing.llm_summarizer import LLMSummarizer
        
        summarizer = LLMSummarizer()
        
        if summarizer.client:
            print(f"✓ LLM Summarizer initialized with provider: {summarizer.provider}")
            print("✅ LLM Summarizer ready!\n")
            return True
        else:
            print("⚠️  LLM Summarizer initialized but no client available")
            print("   (This is OK if API key is not set)\n")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        return False

def test_text_summarizer_integration():
    """Test TextSummarizer with LLM integration"""
    print("=" * 60)
    print("Test 3: TextSummarizer with LLM Integration")
    print("=" * 60)
    
    try:
        from pdf_processing.text_summarizer import TextSummarizer
        
        summarizer = TextSummarizer()
        
        if summarizer.llm_summarizer and summarizer.llm_summarizer.client:
            print(f"✓ TextSummarizer initialized with LLM: {summarizer.llm_summarizer.provider}")
        else:
            print("⚠️  TextSummarizer initialized without LLM (using extractive method)")
        
        # Test with sample data
        slides_data = [
            {
                "page_number": 1,
                "summary": "授業のはじめにチームリーダはチームの出席者をSlackで報告してください。"
            },
            {
                "page_number": 2,
                "summary": "このプレゼンテーションでは、Webアプリケーションのスプリント2バックログ作成について説明します。"
            },
            {
                "page_number": 3,
                "summary": "主な内容は、チームメンバーの出席管理、クラス名とチーム名の報告、学籍番号と名前の記載方法についてです。"
            }
        ]
        
        print("\n📝 Testing global summary generation...")
        summary = summarizer.generate_global_summary(slides_data)
        
        if summary:
            print(f"✓ Summary generated ({len(summary)} characters):")
            print(f"  {summary[:200]}...")
            print("✅ Summary generation successful!\n")
            return True
        else:
            print("⚠️  Summary is empty\n")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("\n" + "=" * 60)
    print("Gemini LLM Summarizer Test Suite")
    print("=" * 60 + "\n")
    
    results = []
    
    # Test 1: Basic connection
    results.append(("Basic Connection", test_gemini_connection()))
    
    # Test 2: LLM Summarizer
    results.append(("LLM Summarizer", test_llm_summarizer()))
    
    # Test 3: Integration
    results.append(("TextSummarizer Integration", test_text_summarizer_integration()))
    
    # Summary
    print("=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    all_passed = all(result for _, result in results)
    
    if all_passed:
        print("\n🎉 All tests passed! Gemini LLM Summarizer is ready to use.")
    else:
        print("\n⚠️  Some tests failed. Check the errors above.")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())

