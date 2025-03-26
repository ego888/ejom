#!/bin/bash

# Prompt user for confirmation
read -p "📥 This will pull the latest changes. Your local files (including .gitignored ones) will NOT be touched. Continue? (y/N): " confirm

# Convert input to lowercase
confirm=$(echo "$confirm" | tr '[:upper:]' '[:lower:]')

if [[ "$confirm" == "y" || "$confirm" == "yes" ]]; then
  echo "🔄 Fetching and pulling latest changes..."
  git pull origin multiuser  # Replace 'main' with your branch name if different
  echo "✅ Update complete! Your local setup files were not affected."
else
  echo "❌ Operation canceled."
fi

