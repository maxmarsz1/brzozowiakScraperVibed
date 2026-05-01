#!/bin/bash

# Configuration
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/update_log.txt"
BRANCH="main" # Change this if you use a different branch name

# Navigate to project directory
cd "$SCRIPT_DIR" || exit

# Fetch latest changes from remote
git fetch origin "$BRANCH"

# Check if local is behind remote
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): New updates detected. Pulling and rebuilding..." >> "$LOG_FILE"
    
    # Pull the changes
    git pull origin "$BRANCH"
    
    # Rebuild and restart docker containers
    # --build ensures any code changes in Dockerfiles or requirements are picked up
    docker compose up -d --build >> "$LOG_FILE" 2>&1
    
    echo "$(date): Update complete." >> "$LOG_FILE"
else
    echo "$(date): No updates found." >> "$LOG_FILE"
fi
