// v11.35 — admin leaderboard management for the comprehensive dashboard.
// GET  /api/admin/leaderboard?key=…&limit= → { top: AdminTopRow[] }
// POST /api/admin/leaderboard { key, action:'reset' } → { ok, reset }
import { NextResponse } from 'next/server';
import { db, adminTopPlayers, adminResetLeaderboard } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  try {
    db();
    const u = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 50)));
    return NextResponse.json({ top: adminTopPlayers(limit) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  try {
    db();
    if (String(b.action ?? '') !== 'reset') return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
    const reset = adminResetLeaderboard();
    return NextResponse.json({ ok: true, reset });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'reset-failed' }, { status: 500 });
  }
}
