#!/bin/bash
# Script to push a single Docker image to Docker Hub
# Usage: ./push-single-image.sh <image-name>
# Example: ./push-single-image.sh speech-to-text

set -e

# Docker Hub username
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sagiri2k4}"

# Check if image name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <image-name>"
    echo ""
    echo "Available images:"
    echo "  - backend"
    echo "  - frontend"
    echo "  - speech-to-text"
    echo ""
    echo "Example:"
    echo "  $0 speech-to-text"
    exit 1
fi

IMAGE_NAME="$1"

# Validate image name
if [[ ! "$IMAGE_NAME" =~ ^(backend|frontend|speech-to-text)$ ]]; then
    echo "❌ Error: Invalid image name: $IMAGE_NAME"
    echo "Valid names: backend, frontend, speech-to-text"
    exit 1
fi

echo "=== Pushing $IMAGE_NAME to Docker Hub ==="
echo "Docker Hub Username: $DOCKER_HUB_USERNAME"
echo ""

# Check if logged in
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo "⚠️  Not logged in to Docker Hub"
    echo "Please login first:"
    echo "  ./login-dockerhub.sh"
    echo "  or"
    echo "  docker login -u $DOCKER_HUB_USERNAME"
    exit 1
fi

# Check if local image exists
LOCAL_IMAGE="itss-nihongo-$IMAGE_NAME:latest"
if ! docker images "$LOCAL_IMAGE" --format "{{.Repository}}:{{.Tag}}" | grep -q "$LOCAL_IMAGE"; then
    echo "⚠️  Local image not found: $LOCAL_IMAGE"
    echo "Building image first..."
    docker compose build "$IMAGE_NAME"
fi

# Tag for Docker Hub
DOCKER_HUB_TAG="$DOCKER_HUB_USERNAME/itss-nihongo-$IMAGE_NAME:latest"
echo "Tagging $LOCAL_IMAGE as $DOCKER_HUB_TAG..."
docker tag "$LOCAL_IMAGE" "$DOCKER_HUB_TAG"

# Push to Docker Hub
echo "Pushing $DOCKER_HUB_TAG to Docker Hub..."
docker push "$DOCKER_HUB_TAG"

echo ""
echo "✅ $IMAGE_NAME pushed successfully!"
echo "Image available at: https://hub.docker.com/r/$DOCKER_HUB_USERNAME/itss-nihongo-$IMAGE_NAME"

