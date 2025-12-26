#!/bin/bash
# Script to login to Docker Hub using username and password

set -e

DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sagiri2k4}"

echo "=== Docker Hub Login ==="
echo "Username: $DOCKER_HUB_USERNAME"
echo ""

# Check if already logged in
if docker info 2>/dev/null | grep -q "Username"; then
    CURRENT_USER=$(docker info 2>/dev/null | grep "Username" | awk '{print $2}')
    echo "Already logged in as: $CURRENT_USER"
    read -p "Do you want to login again? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping current login."
        exit 0
    fi
    docker logout 2>/dev/null || true
fi

# Method 1: Use environment variable (most secure)
if [ -n "$DOCKER_HUB_PASSWORD" ]; then
    echo "Using DOCKER_HUB_PASSWORD from environment..."
    # Try to login, ignore credential store errors
    LOGIN_OUTPUT=$(echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin 2>&1)
    LOGIN_EXIT_CODE=$?
    
    # Check if login was successful (even if credential store failed)
    if echo "$LOGIN_OUTPUT" | grep -qi "login succeeded\|succeeded"; then
        echo "✅ Login successful!"
        # Warn about credential store if needed
        if echo "$LOGIN_OUTPUT" | grep -qi "error storing credentials"; then
            echo "⚠️  Warning: Could not save credentials to credential store, but login succeeded."
            echo "   You may need to login again after restarting Docker."
        fi
        exit 0
    elif [ $LOGIN_EXIT_CODE -eq 0 ]; then
        echo "✅ Login successful!"
        exit 0
    else
        echo "❌ Login failed. Please check your credentials."
        echo "Error output: $LOGIN_OUTPUT"
        exit 1
    fi
fi

# Method 2: Prompt for password
echo "Please enter your Docker Hub password:"
read -s DOCKER_HUB_PASSWORD
echo ""

if [ -z "$DOCKER_HUB_PASSWORD" ]; then
    echo "❌ Error: Password cannot be empty"
    exit 1
fi

# Try to login, ignore credential store errors
LOGIN_OUTPUT=$(echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin 2>&1)
LOGIN_EXIT_CODE=$?

# Check if login was successful (even if credential store failed)
if echo "$LOGIN_OUTPUT" | grep -qi "login succeeded\|succeeded"; then
    echo "✅ Login successful!"
    # Warn about credential store if needed
    if echo "$LOGIN_OUTPUT" | grep -qi "error storing credentials"; then
        echo "⚠️  Warning: Could not save credentials to credential store, but login succeeded."
        echo "   You may need to login again after restarting Docker."
    fi
    exit 0
elif [ $LOGIN_EXIT_CODE -eq 0 ]; then
    echo "✅ Login successful!"
    exit 0
else
    echo "❌ Login failed. Please check your credentials."
    echo "Error output: $LOGIN_OUTPUT"
    exit 1
fi

