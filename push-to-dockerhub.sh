#!/bin/bash
# Script to tag and push Docker images to Docker Hub

set -e

# Docker Hub username (change this to your Docker Hub username)
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sagiri2k4}"

# Image names
IMAGES=(
    "backend"
    "frontend"
    "speech-to-text"
)

echo "=== Pushing images to Docker Hub ==="
echo "Docker Hub Username: $DOCKER_HUB_USERNAME"
echo ""

# Login to Docker Hub (if not already logged in)
echo "Checking Docker Hub login..."
if ! docker info | grep -q "Username"; then
    echo "Please login to Docker Hub:"
    echo ""
    echo "Option 1: Interactive login (username + password)"
    echo "  docker login -u sagiri2k4"
    echo ""
    echo "Option 2: Non-interactive login (with password from stdin)"
    echo "  echo 'your-password' | docker login -u sagiri2k4 --password-stdin"
    echo ""
    echo "Option 3: Using environment variables"
    echo "  export DOCKER_HUB_PASSWORD=your-password"
    echo "  echo \$DOCKER_HUB_PASSWORD | docker login -u sagiri2k4 --password-stdin"
    echo ""
    
    # Try to use environment variable if available
    if [ -n "$DOCKER_HUB_PASSWORD" ]; then
        echo "Using DOCKER_HUB_PASSWORD from environment..."
        LOGIN_OUTPUT=$(echo "$DOCKER_HUB_PASSWORD" | docker login -u "$DOCKER_HUB_USERNAME" --password-stdin 2>&1)
        LOGIN_EXIT_CODE=$?
        
        # Check if login was successful (even if credential store failed)
        if echo "$LOGIN_OUTPUT" | grep -qi "login succeeded\|succeeded" || [ $LOGIN_EXIT_CODE -eq 0 ]; then
            echo "✅ Login successful!"
            if echo "$LOGIN_OUTPUT" | grep -qi "error storing credentials"; then
                echo "⚠️  Warning: Could not save credentials to credential store, but login succeeded."
            fi
        else
            echo "❌ Login failed. Please check your credentials."
            exit 1
        fi
    else
        # Interactive login
        docker login -u "$DOCKER_HUB_USERNAME"
    fi
fi

# Build and push each image
for image in "${IMAGES[@]}"; do
    echo ""
    echo "=== Processing $image ==="
    
    # Build the image
    echo "Building $image..."
    docker compose build "$image"
    
    # Get the image ID
    IMAGE_ID=$(docker compose images -q "$image" 2>/dev/null || docker images "itss-nihongo-$image" --format "{{.ID}}" | head -1)
    
    if [ -z "$IMAGE_ID" ]; then
        echo "Warning: Could not find image for $image"
        continue
    fi
    
    # Tag for Docker Hub
    DOCKER_HUB_TAG="$DOCKER_HUB_USERNAME/itss-nihongo-$image:latest"
    echo "Tagging as $DOCKER_HUB_TAG..."
    docker tag "$IMAGE_ID" "$DOCKER_HUB_TAG"
    
    # Push to Docker Hub
    echo "Pushing $DOCKER_HUB_TAG to Docker Hub..."
    docker push "$DOCKER_HUB_TAG"
    
    echo "✅ $image pushed successfully!"
done

echo ""
echo "=== All images pushed to Docker Hub ==="
echo ""
echo "Images available at:"
for image in "${IMAGES[@]}"; do
    echo "  - $DOCKER_HUB_USERNAME/itss-nihongo-$image:latest"
done

