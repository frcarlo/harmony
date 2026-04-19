#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE="ha-dashboard-nuxt:latest"
STACK="ha-dashboard"

cd "$SCRIPT_DIR"

echo "==> Build Docker Image..."
docker build -f Dockerfile.nuxt -t "$IMAGE" .

echo "==> Deploy Stack '$STACK'..."
docker stack deploy -c compose.yml "$STACK" --with-registry-auth --detach=false
docker service update --force "${STACK}_ha-dashboard" 2>/dev/null || true

echo "==> Warte auf Service..."
sleep 3
docker stack services "$STACK"

echo ""
echo "==> Fertig! https://dashboard.carlo-cloud.de"
