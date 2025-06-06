#!/bin/bash

# Check if a commit message is provided
if [ -z "$1" ]; then
  echo "Error: Commit message is required."
  echo "Usage: ./gitpush.sh \"Your commit message\""
  exit 1
fi

# Get current branch name
branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" != "main" ]; then
  echo "⚠️  You're pushing to '$branch' instead of 'main'. Continue? (y/N): "
  read confirm
  confirm=$(echo "$confirm" | tr '[:upper:]' '[:lower:]')
  if [[ "$confirm" != "y" && "$confirm" != "yes" ]]; then
    echo "❌ Push aborted."
    exit 1
  fi
fi

# Git commands
git add .
git commit -m "$1"
git push origin "$branch"

