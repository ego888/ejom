#!/bin/bash

# Check if a commit message is provided
if [ -z "$1" ]; then
  echo "Error: Commit message is required."
  echo "Usage: ./gitpush.sh \"Your commit message\""
  exit 1
fi

if [ -z "$2" ]; then
  echo "Error: Branch name is required."
  echo "Usage: ./gitpushNewBranch.sh \"message\"" \"branch\""
fi

# Git commands
git checkout -b "$2"
git add .
git commit -m "$1"
git push origin "$2"


