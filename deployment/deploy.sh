#!/usr/bin/env bash
# Deploys ATELIER to a VPS over SSH: syncs the sources, builds the image on the server,
# restarts the stack and runs smoke checks.
#   Usage: deployment/deploy.sh user@host [remote_dir]
set -euo pipefail

TARGET="${1:?Usage: deploy.sh user@host [remote_dir]}"
REMOTE_DIR="${2:-/opt/atelier}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "→ Syncing sources to $TARGET:$REMOTE_DIR"
rsync -az --delete \
  --exclude '.git' --exclude 'node_modules' --exclude 'target' --exclude 'dist' --exclude '.angular' \
  --exclude 'deployment/.env.prod' \
  "$ROOT/" "$TARGET:$REMOTE_DIR/"

echo "→ Building and starting the stack"
ssh "$TARGET" "cd $REMOTE_DIR && test -f deployment/.env.prod || { echo 'Missing deployment/.env.prod'; exit 1; } \
  && docker compose -f deployment/compose.prod.yaml --env-file deployment/.env.prod up -d --build --remove-orphans \
  && docker image prune -f >/dev/null"

echo "→ Waiting for readiness"
ssh "$TARGET" 'for i in $(seq 1 60); do curl -fsS http://127.0.0.1:8080/actuator/health/readiness >/dev/null && exit 0; sleep 3; done; exit 1'

echo "→ Smoke checks"
ssh "$TARGET" 'set -e
  curl -fsS http://127.0.0.1:8080/ | grep -q "<at-root>"
  curl -fsS http://127.0.0.1:8080/artworks | grep -q "<at-root>"
  curl -fsS "http://127.0.0.1:8080/api/artworks?size=1" | grep -q "content"
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/api/studio/artists)
  test "$code" = "401"'
echo "✓ ATELIER is up"
