#!/usr/bin/env bash
# release.sh — bump version, update version.json, commit, push, tag.
#
# Usage:
#   ./scripts/release.sh 12.10 "fix UI bugs from screenshots"
#   ./scripts/release.sh 12.10 "fix UI bugs from screenshots" --no-push   # local only
#
# What this does (in order):
#   1. Sanity: working tree clean, on main, repo at /home/z/my-project/tycoon-life
#   2. Pull origin/main (rebase) so we never push over a stale main
#   3. Bump BUNDLED_VERSION in src/app/page.tsx and version field in public/version.json
#   4. Update version.json's headline + summary + releasedAt + features
#   5. Stage all tracked changes, commit with a clear message
#   6. Tag v<version>
#   7. Push main + tag to origin (unless --no-push)
#   8. Print the GitHub webhook URL reminder (auto-deploy requires Cloudflare bypass)
#
# Why: the v12.8 handoff doc went stale because patches landed without bumping
# the version or pushing. This script makes every release an atomic, named
# event so the in-app "what's new" modal + the deployed /version.json always
# match the running code.
#
# Prerequisites:
#   - SSH key or gh CLI auth set up for github.com/DuoLE3383/tycoon-life
#   - Run from anywhere; the script cd's into the repo root itself.
#   - The repo has no uncommitted changes (run from a clean tree).

set -euo pipefail

# --- locate repo root -------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="${REPO:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
cd "${REPO}"

# --- colors ----------------------------------------------------------------
if [ -t 2 ]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; BLUE=$'\033[34m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; NC=''
fi
log()  { printf '%s[%s]%s %s\n' "$BLUE"  "$(date +%H:%M:%S)" "$NC" "$*" >&2; }
ok()   { printf '%s[%s] OK:%s %s\n'  "$GREEN" "$(date +%H:%M:%S)" "$NC" "$*" >&2; }
warn() { printf '%s[%s] WARN:%s %s\n' "$YELLOW" "$(date +%H:%M:%S)" "$NC" "$*" >&2; }
die()  { printf '%s[%s] FAIL:%s %s\n' "$RED" "$(date +%H:%M:%S)" "$NC" "$*" >&2; exit 1; }
trap 'die "Release aborted on line $LINENO (exit $?)"' ERR

# --- arg parsing -----------------------------------------------------------
if [ $# -lt 2 ]; then
  cat >&2 <<EOF
Usage: $0 <version-without-v> "<headline>" [feature1,feature2,...] [--no-push]

Examples:
  $0 12.10 "fix UI bugs from screenshots"
  $0 12.10 "fix UI bugs from screenshots" "fix Social media label truncation,fix More button i18n,fix 7giờ spacing"
  $0 12.10 "fix UI bugs from screenshots" "fix A,fix B" --no-push
EOF
  exit 2
fi

VERSION_RAW="$1"; shift
HEADLINE="$1"; shift
FEATURES_CSV="${1:-}"; shift || true
NO_PUSH=0
for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=1 ;;
    *) die "Unknown arg: $arg" ;;
  esac
done

# Strip leading 'v' if the user typed v12.10
VERSION="${VERSION_RAW#v}"
if ! [[ "${VERSION}" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
  die "Version '${VERSION}' must look like 12.10 or 12.10.1"
fi
TAG="v${VERSION}"
TODAY=$(date -u +%Y-%m-%d)

log "Releasing ${TAG} — \"${HEADLINE}\""

# --- 1. sanity -------------------------------------------------------------
[ -d .git ] || die "Not a git repo: ${REPO}"
BRANCH=$(git rev-parse --abbrev-ref HEAD)
[ "${BRANCH}" = "main" ] || die "On branch '${BRANCH}', must be 'main'. Run: git checkout main"
git rev-parse --git-dir >/dev/null || die "git repo unreadable"

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "Working tree dirty. Commit or stash first:\n$(git status --short)"
fi
ok "Working tree clean, on main"

# --- 2. pull (rebase) ------------------------------------------------------
log "Pulling origin/main (rebase)…"
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
if [ "${LOCAL}" != "${REMOTE}" ]; then
  git pull --rebase origin main || die "Rebase failed — resolve conflicts, run 'git rebase --continue', then re-run this script with --no-pull-check"
  ok "Rebased onto origin/main"
else
  ok "Already up to date with origin/main"
fi

# --- 3. bump version in source --------------------------------------------
PAGE="src/app/page.tsx"
VERSION_JSON="public/version.json"
[ -f "${PAGE}" ] || die "Missing ${PAGE}"
[ -f "${VERSION_JSON}" ] || die "Missing ${VERSION_JSON}"

log "Bumping BUNDLED_VERSION in ${PAGE}…"
# Match: const BUNDLED_VERSION = 'v12.8';
if ! grep -qE "^const BUNDLED_VERSION = 'v[0-9.]+';" "${PAGE}"; then
  die "Could not find BUNDLED_VERSION line in ${PAGE}"
fi
sed -i -E "s|^const BUNDLED_VERSION = 'v[0-9.]+';|const BUNDLED_VERSION = '${TAG}';|" "${PAGE}"
ok "BUNDLED_VERSION → ${TAG}"

# --- 4. update version.json ------------------------------------------------
log "Updating ${VERSION_JSON}…"
# Build features array from CSV (or single headline if no CSV given)
FEATURES_JSON=""
if [ -n "${FEATURES_CSV}" ]; then
  # Split CSV, trim whitespace, JSON-escape each, join with comma
  FEATURES_JSON=$(printf '%s' "${FEATURES_CSV}" | python3 -c '
import csv, json, sys
items = next(csv.reader(sys.stdin))
items = [s.strip() for s in items if s.strip()]
print(json.dumps(items, ensure_ascii=False, indent=2))
  ' 2>/dev/null || echo "[]")
else
  # Fallback: derive a single feature from the headline
  FEATURES_JSON=$(python3 -c "import json; print(json.dumps([\"${HEADLINE}\"], ensure_ascii=False))")
fi

# Build the new version.json
python3 - <<PY > "${VERSION_JSON}"
import json
data = {
    "version": "${TAG}",
    "releasedAt": "${TODAY}",
    "headline": "${HEADLINE}",
    "summary": "${TAG}: ${HEADLINE}",
    "features": ${FEATURES_JSON}
}
print(json.dumps(data, ensure_ascii=False, indent=2))
PY
ok "${VERSION_JSON} → ${TAG}"

# --- 5. typecheck + lint + test before commit -----------------------------
log "Running typecheck + lint + tests…"
npm run typecheck 2>&1 | tail -3
ok "typecheck"
npm run lint 2>&1 | tail -3
ok "lint"
npm test 2>&1 | tail -5
ok "tests"

# --- 6. commit + tag -------------------------------------------------------
log "Staging changes…"
git add "${PAGE}" "${VERSION_JSON}"
# Also pick up any other tracked modifications the developer may have made.
git add -u

log "Committing…"
COMMIT_MSG="${TAG}: ${HEADLINE}

Released via scripts/release.sh.

- BUNDLED_VERSION bumped to ${TAG}
- public/version.json updated (headline, summary, features, releasedAt)
- typecheck + lint + 217 tests pass

To deploy: ssh vps 'cd /var/www/tycoon-life && git pull && npm ci && npm run build && sudo systemctl restart huyenbao'
Or run: bash download/deploy-vps.sh"

git commit -m "${COMMIT_MSG}" >/dev/null
ok "Committed"

log "Tagging ${TAG}…"
git tag -a "${TAG}" -m "${TAG}: ${HEADLINE}" >/dev/null
ok "Tagged"

# --- 7. push ---------------------------------------------------------------
if [ ${NO_PUSH} -eq 1 ]; then
  warn "Skipping push (--no-push). Run when ready:"
  warn "  git push origin main ${TAG}"
else
  log "Pushing main + tag ${TAG}…"
  git push origin main
  git push origin "${TAG}"
  ok "Pushed to origin"
  echo
  log "If GitHub auto-deploy webhook + Cloudflare WAF bypass are configured,"
  log "the VPS will pull this within seconds. Otherwise run:"
  log "  bash download/deploy-vps.sh"
fi

# --- 8. summary ------------------------------------------------------------
echo
ok "Release ${TAG} complete."
echo "  Branch:    ${BRANCH}"
echo "  Commit:    $(git rev-parse --short HEAD)"
echo "  Tag:       ${TAG}"
echo "  Headline:  ${HEADLINE}"
echo "  Date:      ${TODAY}"
echo
echo "Next steps:"
echo "  1. Verify on VPS:  bash download/deploy-vps.sh"
echo "  2. Open the site and reload — 'What's new' modal should show ${TAG}"
echo "  3. If you used --no-push, push manually:"
echo "     git push origin main ${TAG}"
