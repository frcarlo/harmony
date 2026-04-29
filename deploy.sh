#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK="harmony"
SKIP_BUILD=false

for arg in "$@"; do
  case "$arg" in
    --no-build|--deploy-only|-d) SKIP_BUILD=true ;;
  esac
done

cd "$SCRIPT_DIR"

IMAGE=$(grep 'image:' compose.yml | head -1 | awk '{print $2}')
echo "==> Image: $IMAGE"

if [[ "$SKIP_BUILD" == "true" ]]; then
  echo "==> Skipping build/pull (--no-build)"
elif [[ "$IMAGE" == *"ghcr.io"* || "$IMAGE" == *"/"* ]]; then
  echo "==> Pulling image from registry..."
  docker pull "$IMAGE"
else
  echo "==> Building local image..."
  docker build -f Dockerfile.nuxt -t "$IMAGE" .
fi

echo "==> Deploy Stack '$STACK'..."
docker stack deploy -c compose.yml "$STACK" --with-registry-auth --resolve-image never --detach=false
docker service update --force "${STACK}_ha-dashboard" 2>/dev/null || true

echo "==> Warte auf Service..."
sleep 3
docker stack services "$STACK"

echo ""
echo "==> Fertig! https://dashboard.carlo-cloud.de"
