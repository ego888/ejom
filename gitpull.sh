#!/bin/bash

# Prompt user for confirmation
read -p "⚠️ This will overwrite your local changes. Are you sure? (y/N): " confirm

# Convert input to lowercase
confirm=$(echo "$confirm" | tr '[:upper:]' '[:lower:]')

if [[ "$confirm" == "y" || "$confirm" == "yes" ]]; then
  echo "🔄 Fetching latest changes..."
  git fetch --all
  echo "⚠️ Resetting local changes to match remote..."
  git reset --hard origin/main  # Replace 'main' with your branch name
  echo "📥 Pulling latest changes..."
  git pull origin main
  echo "✅ Update complete!"
else
  echo "❌ Operation canceled."
fi
