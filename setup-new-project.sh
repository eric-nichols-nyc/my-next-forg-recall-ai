#!/bin/bash

# Script to set up a new project from the my-next-forge boilerplate
# Usage: ./setup-new-project.sh <new-repo-name> <github-username>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./setup-new-project.sh <new-repo-name> <github-username>"
  echo "Example: ./setup-new-project.sh my-awesome-app eric-nichols-nyc"
  exit 1
fi

NEW_REPO_NAME=$1
GITHUB_USER=$2
BOILERPLATE_REPO="my-next-forge"

echo "🚀 Setting up new project: $NEW_REPO_NAME"
echo ""

# Check if we're in a git repo
if [ ! -d ".git" ]; then
  echo "❌ Error: Not in a git repository"
  exit 1
fi

# Check current remote
CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [[ "$CURRENT_REMOTE" == *"$BOILERPLATE_REPO"* ]]; then
  echo "⚠️  Warning: This repo is still connected to the boilerplate!"
  echo "   Current remote: $CURRENT_REMOTE"
  echo ""
  read -p "Remove boilerplate remote and set up new one? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Removing boilerplate remote..."
    git remote remove origin

    echo "📝 Adding new remote: git@github.com:$GITHUB_USER/$NEW_REPO_NAME.git"
    git remote add origin "git@github.com:$GITHUB_USER/$NEW_REPO_NAME.git"

    echo "✅ Remote updated!"
    echo ""
    echo "Current remotes:"
    git remote -v
    echo ""
    echo "⚠️  IMPORTANT: Make sure you've created the repository on GitHub first!"
    echo "   Then run: git push -u origin main"
  else
    echo "Cancelled."
    exit 0
  fi
else
  echo "✅ Remote is already set to: $CURRENT_REMOTE"
fi



