#!/bin/bash

# Check if a commit message is provided
if [ -z "$1" ]; then
  echo "Error: Commit message is required."
  echo "Usage: ./gitpush.sh \"Your commit message\""
  exit 1
fi

# Git commands
git add .
git commit -m "$1"
git push origin main


