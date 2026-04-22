#!/usr/bin/env bash
#
# Safely deploy Firebase security config (Firestore rules + indexes, Storage
# rules) to a Firebase project.
#
# What this script does:
#   1. Runs the Firestore rules test suite against the emulator (blocks on failure)
#   2. Shows a diff between local firestore.rules and currently-deployed rules
#   3. Prompts for confirmation
#   4. Deploys firestore:rules, firestore:indexes, storage:rules
#
# Usage:
#   PROJECT=<firebase-project-id> ./scripts/deploy-rules.sh
#
# Options:
#   SKIP_TESTS=1             # skip rules test suite (not recommended)
#   TARGETS=firestore:rules  # comma-separated subset to deploy
#                            # (default: firestore:rules,firestore:indexes,storage:rules)

set -euo pipefail

if [[ -z "${PROJECT:-}" ]]; then
  echo "ERROR: Set PROJECT=<firebase-project-id> before running." >&2
  exit 1
fi

TARGETS="${TARGETS:-firestore:rules,firestore:indexes,storage:rules}"

cd "$(dirname "$0")/.."

if ! command -v firebase >/dev/null; then
  echo "ERROR: firebase CLI not installed. Run: npm i -g firebase-tools" >&2
  exit 1
fi

if [[ "${SKIP_TESTS:-0}" != "1" ]]; then
  echo "==> Running Firestore rules test suite..."
  npm run test:rules
else
  echo "==> SKIP_TESTS=1 - skipping test suite (not recommended)"
fi

echo
echo "==> Fetching currently-deployed Firestore rules for project '$PROJECT'..."
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT
if firebase firestore:rules:get --project "$PROJECT" > "$tmpdir/remote.rules" 2>/dev/null; then
  if diff -u "$tmpdir/remote.rules" firestore.rules > "$tmpdir/diff.patch"; then
    echo "No changes in firestore.rules vs deployed."
  else
    echo "==> Firestore rules diff (remote -> local):"
    cat "$tmpdir/diff.patch"
  fi
else
  echo "==> No remote rules returned (new project or CLI change). Deploying from scratch."
fi

echo
echo "==> Deploy targets: $TARGETS"
read -r -p "Proceed with deployment to project '$PROJECT'? [y/N] " reply
if [[ ! "$reply" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 1
fi

echo "==> Deploying..."
firebase deploy --only "$TARGETS" --project "$PROJECT"
echo "==> Done."
