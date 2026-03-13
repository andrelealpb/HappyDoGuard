#!/bin/bash
set -e

DEPLOY_DIR="/opt/happydo-guard"
LOG_PREFIX="[deploy]"

echo "$LOG_PREFIX $(date '+%Y-%m-%d %H:%M:%S') Starting deploy..."

cd "$DEPLOY_DIR"

# Pull latest changes
echo "$LOG_PREFIX Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Rebuild and restart containers
echo "$LOG_PREFIX Building and restarting containers..."
docker compose up -d --build --remove-orphans

# Wait for health checks
echo "$LOG_PREFIX Waiting for services..."
sleep 10

# Check health
API_HEALTH=$(curl -sf http://localhost:8000/health || echo '{"status":"error"}')
RTMP_HEALTH=$(curl -sf http://localhost:8080/health || echo '{"status":"error"}')

echo "$LOG_PREFIX API:  $API_HEALTH"
echo "$LOG_PREFIX RTMP: $RTMP_HEALTH"

# Cleanup old images
docker image prune -f 2>/dev/null || true

echo "$LOG_PREFIX $(date '+%Y-%m-%d %H:%M:%S') Deploy complete!"
