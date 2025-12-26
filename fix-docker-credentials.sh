#!/bin/bash
# Script to fix Docker credential store issue
# This configures Docker to use file-based credential store instead of 'pass'

set -e

DOCKER_CONFIG_DIR="$HOME/.docker"
DOCKER_CONFIG_FILE="$DOCKER_CONFIG_DIR/config.json"

echo "=== Fixing Docker credential store ==="
echo ""

# Create .docker directory if it doesn't exist
mkdir -p "$DOCKER_CONFIG_DIR"

# Backup existing config if it exists
if [ -f "$DOCKER_CONFIG_FILE" ]; then
    echo "Backing up existing config..."
    cp "$DOCKER_CONFIG_FILE" "$DOCKER_CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Check if config.json exists and has credential store
if [ -f "$DOCKER_CONFIG_FILE" ]; then
    # Remove credential store if it's set (pass, desktop, etc.)
    if grep -q '"credsStore"' "$DOCKER_CONFIG_FILE"; then
        CREDS_STORE=$(grep -o '"credsStore": "[^"]*"' "$DOCKER_CONFIG_FILE" | cut -d'"' -f4)
        echo "Found credential store: $CREDS_STORE"
        echo "Removing credential store from config (will use file-based storage)..."
        # Use jq if available, otherwise use sed
        if command -v jq &> /dev/null; then
            jq 'del(.credsStore)' "$DOCKER_CONFIG_FILE" > "$DOCKER_CONFIG_FILE.tmp" && mv "$DOCKER_CONFIG_FILE.tmp" "$DOCKER_CONFIG_FILE"
        else
            # Fallback: use sed to remove credsStore line
            sed -i '/"credsStore"/d' "$DOCKER_CONFIG_FILE"
        fi
        echo "✅ Removed credential store configuration"
    else
        echo "No credential store found in config"
    fi
else
    # Create minimal config.json
    echo "Creating Docker config file..."
    cat > "$DOCKER_CONFIG_FILE" <<EOF
{
  "auths": {}
}
EOF
    echo "✅ Created Docker config file"
fi

echo ""
echo "=== Docker credential store fixed ==="
echo ""
echo "Docker will now use file-based credential storage instead of 'pass'."
echo "You can now login without credential store errors:"
echo "  ./login-dockerhub.sh"
echo ""

