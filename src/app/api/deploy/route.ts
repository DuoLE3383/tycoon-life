// v11.52 — GitHub auto-deploy webhook.
//
// GitHub sends a POST here when a push happens (configured in the repo's
// Webhook settings). The endpoint verifies the X-Hub-Signature-256 HMAC,
// filters to push events on refs/heads/main, then fires the deploy script
// in the background (fire-and-forget) so the response returns immediately.
//
// Why fire-and-forget: the deploy script ends with `systemctl restart
// huyenbao`, which kills this very process. If we awaited the script, the
// response would never reach GitHub and the webhook would be marked failed.
//
// Required env var:
//   DEPLOY_WEBHOOK_SECRET — the secret you set in the GitHub webhook config.
//                           Without it the route returns 503 (deploy disabled)
//                           so a misconfigured prod can't be triggered.
//
// Optional env vars (defaults shown):
//   DEPLOY_REPO_PATH     — /var/www/tycoon-life (where the repo lives on the VPS)
//   DEPLOY_SCRIPT        — scripts/deploy.sh (relative to repo path)
//   DEPLOY_BRANCH        — main (only this ref triggers a deploy)
//
// Setup: see DEPLOY.md at the repo root for the full walk-through
// (GitHub webhook config, sudoers entry for `systemctl restart huyenbao`,
// env var in the systemd unit, log file rotation).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { NextResponse } from 'next/server';

// Runtime config — read once per request so env-var changes (e.g. after
// `systemctl daemon-reload`) take effect on the next webhook without a restart.
const SECRET = () => process.env.DEPLOY_WEBHOOK_SECRET ?? '';
const REPO_PATH = () => process.env.DEPLOY_REPO_PATH ?? '/var/www/tycoon-life';
const DEPLOY_SCRIPT = () => process.env.DEPLOY_SCRIPT ?? 'scripts/deploy.sh';
const DEPLOY_BRANCH = () => process.env.DEPLOY_BRANCH ?? 'main';

/** Constant-time HMAC-SHA256 comparison so the secret can't leak via timing. */
function verifySignature(body: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  // Both are hex strings of fixed length (sha256= + 64 hex chars = 71 chars),
  // so timingSafeEqual on the buffers is safe.
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const secret = SECRET();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'deploy-not-configured', msg: 'DEPLOY_WEBHOOK_SECRET env var is not set' },
      { status: 503 },
    );
  }

  // 1. Verify the GitHub HMAC signature (X-Hub-Signature-256).
  const signature = req.headers.get('x-hub-signature-256');
  const body = await req.text();
  if (!verifySignature(body, signature, secret)) {
    return NextResponse.json(
      { ok: false, error: 'bad-signature' },
      { status: 403 },
    );
  }

  // 2. Filter to push events on the configured branch.
  const event = req.headers.get('x-github-event');
  if (event !== 'push') {
    return NextResponse.json({ ok: true, msg: `ignored event: ${event}` });
  }

  let ref: string | undefined;
  let headCommit: string | undefined;
  let pushedBy: string | undefined;
  let repoFullName: string | undefined;
  try {
    const payload = JSON.parse(body) as {
      ref?: string;
      head_commit?: { id?: string };
      pusher?: { name?: string };
      repository?: { full_name?: string };
    };
    ref = payload.ref;
    headCommit = payload.head_commit?.id;
    pushedBy = payload.pusher?.name;
    repoFullName = payload.repository?.full_name;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const expectedRef = `refs/heads/${DEPLOY_BRANCH()}`;
  if (ref !== expectedRef) {
    return NextResponse.json({ ok: true, msg: `ignored ref: ${ref} (watching ${expectedRef})` });
  }

  // 3. Fire the deploy script in the background. We spawn detached + unref
  //    so the Node process can respond to GitHub immediately and the script
  //    keeps running after the response is sent (and after `systemctl restart`
  //    kills this process — the script is detached).
  const repoPath = REPO_PATH();
  const script = DEPLOY_SCRIPT();
  const logLine = `[deploy-webhook] ${new Date().toISOString()} ref=${ref} commit=${headCommit?.slice(0, 7) ?? '?'} by=${pushedBy ?? '?'} repo=${repoFullName ?? '?'}\n`;
  try {
    // Spawn bash with the script; detach so it survives the parent's death.
    const child = spawn('bash', [script], {
      cwd: repoPath,
      stdio: 'ignore',
      detached: true,
      env: {
        ...process.env,
        DEPLOY_COMMIT: headCommit ?? '',
        DEPLOY_PUSHER: pushedBy ?? '',
        DEPLOY_REPO_FULL_NAME: repoFullName ?? '',
      },
    });
    child.unref();
    // Best-effort log line so the operator can see in /var/log/huyenbao-deploy.log
    // (the script itself also logs there).
    try {
      const fs = await import('node:fs/promises');
      await fs.appendFile('/var/log/huyenbao-deploy.log', logLine);
    } catch {
      // Log file write is best-effort; the script logs to the same file.
    }
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'spawn-failed', msg: err instanceof Error ? err.message : 'spawn-error' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    msg: 'deploy triggered',
    branch: DEPLOY_BRANCH(),
    commit: headCommit?.slice(0, 7),
    pushedBy,
    repo: repoFullName,
  });
}

// GET endpoint — returns whether auto-deploy is configured (no secret leak).
// Useful for a quick `curl https://mogul.huyenbao.com/api/deploy` check.
export function GET() {
  const configured = !!SECRET();
  return NextResponse.json({
    ok: true,
    configured,
    branch: configured ? DEPLOY_BRANCH() : null,
    repoPath: configured ? REPO_PATH() : null,
    script: configured ? DEPLOY_SCRIPT() : null,
    msg: configured
      ? 'Auto-deploy is configured. POST from GitHub push webhook triggers it.'
      : 'Auto-deploy is NOT configured (DEPLOY_WEBHOOK_SECRET env var missing). See DEPLOY.md.',
  });
}

// Edge runtime can't use node:crypto spawn — force the Node.js runtime.
export const runtime = 'nodejs';
// Always run dynamically (never cache the webhook response).
export const dynamic = 'force-dynamic';
