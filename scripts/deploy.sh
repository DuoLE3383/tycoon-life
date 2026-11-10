#!/usr/bin/env bash
# v11.52 — VPS deploy script, triggered by /api/deploy webhook on push to main.
#
# What it does:
#   1. cd into the repo (path comes from DEPLOY_REPO_PATH env or defaults to
#      the script's own parent — so it works regardless of where the repo lives)
#   2. git fetch + reset --hard origin/main (clean sync — discards local edits)
#   3. npm ci (install exact deps from lockfile)
#   4. npm run build (Next.js production build)
#   5. sudo systemctl restart huyenbao (brings the new build up)
#
# The script is invoked detached from the Next.js webhook handler, so it
# survives the `systemctl restart` that kills the webhook's parent process.
# Logs to /var/log/huyenbao-deploy.log (creates it if missing).
#
# Sudoers requirement (the systemd unit's user must be able to restart itself):
#   echo "huyenbao ALL=(root) NOPASSWD: /usr/bin/systemctl restart huyenbao" | \
#     sudo tee /etc/sudoers.d/huyenbao-deploy
#   sudo chmod 0440 /etc/sudoers.d/huyenbao-deploy
# (replace `huyenbao` with the actual service user if different)
#
# Exit codes:
#   0 = success (deploy finished, service restarted)
#   non-zero = a step failed; check the log file for which one
set -euo pipefail

# Resolve repo path: prefer DEPLOY_REPO_PATH env, else use script's parent dir.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_PATH="${DEPLOY_REPO_PATH:-$(dirname "$SCRIPT_DIR")}"
LOG_FILE="${DEPLOY_LOG_FILE:-/var/log/huyenbao-deploy.log}"
BRANCH="${DEPLOY_BRANCH:-main}"

# Make sure the log file exists + is writable (best-effort).
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
touch "$LOG_FILE" 2>/dev/null || true

# Redirect all output (stdout + stderr) to the log file AND keep this script
# quiet on its own stdout so the webhook's spawn() doesn't capture noise.
exec >> "$LOG_FILE" 2>&1

echo ""
echo "==========================================================="
echo "[deploy] $(date -Iseconds) start"
echo "[deploy] repo=$REPO_PATH branch=$BRANCH"
echo "[deploy] commit=${DEPLOY_COMMIT:-unknown} pushed_by=${DEPLOY_PUSHER:-unknown}"
echo "[deploy] repo_full_name=${DEPLOY_REPO_FULL_NAME:-unknown}"
echo "==========================================================="

cd "$REPO_PATH"

# 1. Pull the latest from origin. Use fetch + reset --hard so local edits
#    (if any) are discarded — the VPS checkout should never have local changes.
echo "[deploy] fetching origin..."
git fetch --quiet origin "$BRANCH"
git reset --hard "origin/$BRANCH"
echo "[deploy] now at: $(git rev-parse --short HEAD) — $(git log -1 --pretty=%s)"

# 2. Install deps. npm ci is reproducible from the lockfile.
echo "[deploy] npm ci..."
npm ci --no-audit --no-fund

# 3. Build the Next.js production bundle.
echo "[deploy] npm run build..."
npm run build

# 4. Restart the systemd service. Requires the sudoers entry above.
echo "[deploy] restarting service..."
if command -v sudo >/dev/null 2>&1; then
  sudo systemctl restart huyenbao
else
  systemctl restart huyenbao
fi

echo "[deploy] $(date -Iseconds) done — service restarted."
echo "==========================================================="
