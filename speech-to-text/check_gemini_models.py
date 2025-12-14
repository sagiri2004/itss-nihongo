#!/usr/bin/env python3
"""
Script to check available Gemini models and their capabilities.
"""

import os
import sys
from pathlib import Path

# Load .env manually (in case dotenv not available)
env_path = Path(__file__).parent / ".env"
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ[key.strip()] = value.strip().strip('"').strip("'")

import google.generativeai as genai

# Configure API
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ GOOGLE_API_KEY not found in environment")
    exit(1)

genai.configure(api_key=api_key)

print("🔍 Checking available Gemini models...\n")

# List all available models
try:
    models = genai.list_models()
    
    print("=" * 80)
    print("AVAILABLE MODELS:")
    print("=" * 80)
    
    available_models = []
    for model in models:
        # Only show models that support generateContent
        if 'generateContent' in model.supported_generation_methods:
            model_name = model.name.replace('models/', '')
            available_models.append(model_name)
            print(f"✅ {model_name}")
            print(f"   Display Name: {model.display_name}")
            print(f"   Description: {model.description}")
            print(f"   Supported Methods: {', '.join(model.supported_generation_methods)}")
            print()
    
    print("=" * 80)
    print(f"\n📊 Total models with generateContent: {len(available_models)}")
    print("\n🎯 Recommended models to try:")
    for model_name in available_models:
        print(f"   - {model_name}")
    
    # Test each model
    print("\n" + "=" * 80)
    print("TESTING MODELS:")
    print("=" * 80)
    
    test_prompt = "こんにちは。これはテストです。"
    
    for model_name in available_models[:5]:  # Test first 5 models
        try:
            print(f"\n🧪 Testing: {model_name}")
            model = genai.GenerativeModel(model_name)
            
            response = model.generate_content(
                test_prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 50,
                }
            )
            
            print(f"   ✅ SUCCESS - Response: {response.text[:50]}...")
            
        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "429" in error_msg:
                print(f"   ⚠️  QUOTA EXCEEDED - Model works but quota limit reached")
            elif "404" in error_msg or "not found" in error_msg.lower():
                print(f"   ❌ NOT FOUND - {error_msg[:100]}")
            else:
                print(f"   ❌ ERROR - {error_msg[:100]}")
    
    print("\n" + "=" * 80)
    print("💡 RECOMMENDATION:")
    print("=" * 80)
    
    # Recommend based on available models
    if "gemini-2.0-flash-exp" in available_models:
        print("   Use: gemini-2.0-flash-exp (latest experimental)")
    elif "gemini-2.0-flash" in available_models:
        print("   Use: gemini-2.0-flash (recommended)")
    elif "gemini-1.5-flash" in available_models:
        print("   Use: gemini-1.5-flash")
    elif "gemini-1.5-pro" in available_models:
        print("   Use: gemini-1.5-pro")
    elif available_models:
        print(f"   Use: {available_models[0]} (first available)")
    else:
        print("   ⚠️  No models available with generateContent support")
    
except Exception as e:
    print(f"❌ Error listing models: {e}")
    import traceback
    traceback.print_exc()

