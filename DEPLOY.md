# Auto-deploy setup — HuenBao VPS

This repo ships with a GitHub webhook + deploy script that auto-deploys on
every push to `main`. Once configured, `git push origin main` triggers:

1. GitHub sends a signed POST to `https://mogul.huyenbao.com/api/deploy`
2. The route verifies the HMAC-SHA256 signature with a shared secret
3. The route spawns `scripts/deploy.sh` (detached, fire-and-forget)
4. The script does `git fetch + reset --hard origin/main → npm ci → npm run build → sudo systemctl restart huyenbao`
5. The new build is live within ~60 seconds

This doc walks through the 4 pieces you need on the VPS + GitHub.

---

## 1. VPS — sudoers entry (let the service restart itself)

The Next.js process runs as a systemd service user. `systemctl restart`
normally needs root. Add a passwordless sudoers entry so the deploy script
can restart the service without prompting:

```bash
# Replace `huyenbao` with the actual service user if different.
echo "huyenbao ALL=(root) NOPASSWD: /usr/bin/systemctl restart huyenbao" | \
  sudo tee /etc/sudoers.d/huyenbao-deploy
sudo chmod 0440 /etc/sudoers.d/huyenbao-deploy

# Sanity check:
sudo -u huyenbao sudo -n systemctl restart huyenbao   # should not prompt
```

This grants ONLY `systemctl restart huyenbao` — nothing else. The service
user can't gain other root privileges through this entry.

## 2. VPS — env vars on the systemd unit

Edit the service file (`/etc/systemd/system/huyenbao.service` or wherever it
lives) and add the webhook secret + repo path as env vars:

```ini
[Service]
Environment="DEPLOY_WEBHOOK_SECRET=<your-random-secret>"
Environment="DEPLOY_REPO_PATH=/var/www/tycoon-life"
Environment="DEPLOY_BRANCH=main"
# Optional overrides (defaults shown):
# Environment="DEPLOY_SCRIPT=scripts/deploy.sh"
# Environment="DEPLOY_LOG_FILE=/var/log/huyenbao-deploy.log"
```

Generate the secret locally:
```bash
openssl rand -hex 32   # 64 hex chars — copy this exactly into both places
```

Reload systemd after editing:
```bash
sudo systemctl daemon-reload
sudo systemctl restart huyenbao
```

## 3. VPS — log file (so you can watch deploys)

The script logs to `/var/log/huyenbao-deploy.log`. Create it + give the
service user write access:

```bash
sudo touch /var/log/huyenbao-deploy.log
sudo chown huyenbao:huyenbao /var/log/huyenbao-deploy.log
# Optional: rotate it so it doesn't grow forever.
echo '/var/log/huyenbao-deploy.log {
  monthly
  rotate 6
  compress
  missingok
  notifempty
}' | sudo tee /etc/logrotate.d/huyenbao-deploy
```

Watch a deploy live:
```bash
tail -f /var/log/huyenbao-deploy.log
```

## 4. GitHub — webhook configuration

In the repo: **Settings → Webhooks → Add webhook**

- **Payload URL**: `https://mogul.huyenbao.com/api/deploy`
- **Content type**: `application/json`
- **Secret**: paste the same `openssl rand -hex 32` value you put in the
  systemd unit env var. **Must match exactly** or signature verification fails.
- **Which events**: *Just the push event.*
- **Active**: ✓

Click **Add webhook**. GitHub will send a `ping` event immediately — the
route logs it as `ignored event: ping` and returns 200, so the webhook
shows green ✓ in GitHub.

## 5. Verify

### Quick GET check (no secret required):
```bash
curl https://mogul.huyenbao.com/api/deploy
# → {"ok":true,"configured":true,"branch":"main","repoPath":"/var/www/tycoon-life",...}
```

### Trigger a real deploy:
Make any commit + push:
```bash
git commit --allow-empty -m "test: deploy webhook" && git push origin main
```

Within ~5 seconds you should see in `/var/log/huyenbao-deploy.log`:
```
[deploy-webhook] 2026-11-10T... ref=refs/heads/main commit=abc1234 by=yourname repo=DuoLE3383/tycoon-life
===========================================================
[deploy] ... start
[deploy] fetching origin...
[deploy] now at: abc1234 — test: deploy webhook
[deploy] npm ci...
[deploy] npm run build...
[deploy] restarting service...
[deploy] ... done — service restarted.
```

The site reloads with the new build within ~60 seconds (build time).

### If something goes wrong:
- **Webhook shows red ✗ in GitHub**: check the **Recent Deliveries** tab —
  the response body explains which check failed (`bad-signature` /
  `deploy-not-configured` / `ignored ref`).
- **Webhook is green but no deploy happens**: tail the log file — if there's
  no `[deploy-webhook]` line at all, the spawn failed (check `repoPath` /
  `script` env vars; the script must be executable: `chmod +x scripts/deploy.sh`).
- **Deploy starts but `systemctl restart` fails**: the sudoers entry is
  missing or has the wrong service user. See step 1.

---

## Security notes

- The webhook secret is the only thing protecting the endpoint from random
  attackers triggering a deploy. **Use the full 64-hex-char `openssl rand`
  output**, not a short passphrase.
- The route is **fail-closed**: if `DEPLOY_WEBHOOK_SECRET` is unset, every
  POST returns 503 (deploy disabled). A misconfigured prod can't be triggered.
- Signature comparison uses `timingSafeEqual` so the secret can't leak via
  timing side-channels.
- Only `push` events to `refs/heads/main` trigger a deploy. Pushes to other
  branches, PRs, issues, etc. are logged + ignored.
- The deploy script does `git reset --hard origin/main` — **any local edits
  on the VPS checkout are discarded**. Never edit files directly on the VPS;
  always push via git.
- The sudoers entry grants ONLY `systemctl restart huyenbao`. The service
  user gains no other root privileges.

## Manual deploy (fallback)

If the webhook is broken or you want to deploy a specific commit by hand:
```bash
ssh vps
cd /var/www/tycoon-life
git fetch origin && git reset --hard origin/main
npm ci && npm run build
sudo systemctl restart huyenbao
tail -f /var/log/huyenbao-deploy.log
```
