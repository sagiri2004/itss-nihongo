#!/bin/bash
# Run server with proper reload exclusions to avoid file watch limit

cd "$(dirname "$0")"

# Activate venv if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Run uvicorn with reload but exclude venv and other large directories
uvicorn src.api.main:app \
    --host 0.0.0.0 \
    --port 8010 \
    --reload \
    --reload-dir src \
    --reload-exclude "venv/*" \
    --reload-exclude "*/venv/*" \
    --reload-exclude "**/__pycache__/*" \
    --reload-exclude "**/*.pyc"

