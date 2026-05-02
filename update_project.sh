#!/bin/bash

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/update_log.txt"
BRANCH="main"

# Navigate to project directory
cd "$SCRIPT_DIR" || exit

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Fetch latest changes from remote
git fetch origin "$BRANCH"

# Check if local is behind remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" != "$REMOTE" ] || [ "$1" == "--force" ]; then
    echo "$(date): Updates detected or force rebuild. Pulling and rebuilding..." >> "$LOG_FILE"
    
    # Pull the changes
    git pull origin "$BRANCH"
    
    # Determine which profiles to run
    if [ "$FRONTEND_MODE" == "vite" ]; then
        echo "Running in VITE mode (Frontend served by Nginx)"
        COMPOSE_PROFILES=vite docker compose up -d --build -V >> "$LOG_FILE" 2>&1
    else
        echo "Running in DJANGO mode (Frontend served by Django)"
        docker compose up -d --build -V >> "$LOG_FILE" 2>&1
    fi
    
    echo "$(date): Update complete." >> "$LOG_FILE"
else
    echo "$(date): No updates found." >> "$LOG_FILE"
fi
