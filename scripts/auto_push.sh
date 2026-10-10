#!/bin/bash
# Auto-push helper: commits all current changes and pushes to GitHub main.
# .env files are gitignored — secrets are never staged or pushed.
# Usage: /app/scripts/auto_push.sh "commit message describing the feature"
set -e
cd /app
git add -A
if git diff --cached --quiet; then
  echo "nothing to commit — working tree clean"
  exit 0
fi
# safety net: never commit env files even if ignore rules change
git reset -q backend/.env frontend/.env 2>/dev/null || true
MSG="${1:-feature update}"
git commit -q -m "$MSG"
git push -q origin main
echo "pushed to GitHub main: $(git log --oneline -1)"
