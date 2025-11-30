#!/bin/bash
# Run Streamlit Testing App

echo "🚀 Starting Speech-to-Text Testing App..."
echo ""

# Activate virtual environment
if [ -d "venv" ]; then
    echo "🔧 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  Warning: venv directory not found. Please create it with: python -m venv venv"
    exit 1
fi

# Install dependencies if needed
if ! command -v streamlit &> /dev/null; then
    echo "📦 Installing Streamlit..."
    pip install -r requirements-streamlit.txt
fi

# Set environment variables if not already set
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    export GOOGLE_APPLICATION_CREDENTIALS="${SCRIPT_DIR}/speech-processing-prod-9ffbefa55e2c.json"
    echo "📝 Using default credentials: $GOOGLE_APPLICATION_CREDENTIALS"
fi

if [ -z "$GCS_BUCKET_NAME" ]; then
    export GCS_BUCKET_NAME="speech-processing-intermediate"
    echo "🪣 Using default bucket: $GCS_BUCKET_NAME"
fi

echo ""
echo "🌐 Starting Streamlit app..."
echo ""

streamlit run app.py
