// v11.27 — liveness probe so the client can auto-detect the SQLite backend.
// GET /api/social/ping → { ok: true, backend: 'sqlite' }
// v14 — GET now accepts an optional ?uid= query param. When provided, the
// response also includes `actions: [...]` — the player's pending ADMIN_ACTION
// queue (rows the admin dashboard wrote via /api/admin/game). Each entry has
// { id, action, payload, ts } and is consumed by applyAdminActions() on the
// client. The actions are unapplied rows addressed to the player's uid OR
// to the broadcast sentinel (gig-config overrides, server-wide events).
// v14 — POST /api/social/ping { uid, ackId } acks a delivered action so the
// next poll doesn't re-deliver it. The acker must include their own uid;
// applyAdminActions on the client already guards against uid mismatch
// (an action whose payload.uid doesn't match s.uid is skipped), so this
// endpoint just clears the row's applied_at timestamp.
import { NextResponse } from 'next/server';
import { listPendingAdminActions, ackAdminAction, validUid } from '@/lib/server/socialDb';

export function GET(req: Request) {
  const url = new URL(req.url);
  const uid = (url.searchParams.get('uid') || '').trim();
  const base: { ok: true; backend: 'sqlite'; actions?: ReturnType<typeof listPendingAdminActions> } = { ok: true, backend: 'sqlite' };
  // v14 — only attach the actions queue when the caller passes a valid uid.
  // The existing probe in social.ts doesn't pass ?uid=, so it still sees the
  // bare { ok, backend } response and its `j.backend === 'sqlite'` check
  // keeps working unchanged.
  if (uid && validUid(uid)) {
    try {
      base.actions = listPendingAdminActions(uid);
    } catch {
      // SQLite unavailable or table missing — return an empty queue rather
      // than 500'ing, so the polling loop on the client doesn't break.
      base.actions = [];
    }
  }
  return NextResponse.json(base);
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = String(b.uid || '').trim();
    const ackId = Math.round(Number(b.ackId));
    if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    if (!Number.isFinite(ackId) || ackId <= 0) return NextResponse.json({ ok: false, error: 'bad-ack-id' }, { status: 400 });
    const ok = ackAdminAction(ackId, uid);
    return NextResponse.json({ ok, acked: ackId });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'ack-failed' }, { status: 500 });
  }
}
