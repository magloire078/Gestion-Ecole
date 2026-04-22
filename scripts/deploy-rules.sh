#!/usr/bin/env bash
#
# Safely deploy firestore.rules to a Firebase project.
#
# What this script does:
#   1. Runs the rules test suite against the emulator (blocks on failure)
#   2. Shows a diff between local rules and currently-deployed rules
#   3. Prompts for confirmation
#   4. Deploys via firebase CLI
#
# Usage:
#   PROJECT=<firebase-project-id> ./scripts/deploy-rules.sh
#
# Optional:
#   SKIP_TESTS=1 PROJECT=... ./scripts/deploy-rules.sh   # skip pretests (not recommended)

set -euo pipefail

if [[ -z "${PROJECT:-}" ]]; then
  echo "ERROR: Set PROJECT=<firebase-project-id> before running." >&2
  exit 1
fi

cd "$(dirname "$0")/.."

if ! command -v firebase >/dev/null; then
  echo "ERROR: firebase CLI not installed. Run: npm i -g firebase-tools" >&2
  exit 1
fi

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  echo "==> Running rules test suite..."
  npm run test:rules
else
  echo "==> SKIP_TESTS=1 — skipping test suite (not recommended)"
fi

echo
echo "==> Fetching currently-deployed rules for project '$PROJECT'..."
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
if firebase firestore:rules:get --project "$PROJECT" > "$tmpdir/remote.rules" 2>/dev/null; then
  if diff -u "$tmpdir/remote.rules" firestore.rules > "$tmpdir/diff.patch"; then
    echo "No changes vs deployed rules. Nothing to do."
    exit 0
  fi
  echo "==> Diff (remote → local):"
  cat "$tmpdir/diff.patch"
else
  echo "==> No remote rules returned (new project or CLI change). Deploying from scratch."
fi

echo
read -r -p "Deploy these rules to project '$PROJECT'? [y/N] " reply
if [[ ! "$reply" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Deploying..."
firebase deploy --only firestore:rules --project "$PROJECT"
echo "==> Done."
