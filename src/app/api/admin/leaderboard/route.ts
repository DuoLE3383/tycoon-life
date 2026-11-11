// v11.35 — admin leaderboard management for the comprehensive dashboard.
// v12.2 — tryDb() pattern so SQLite failures return graceful 503 instead of 500.
// GET  /api/admin/leaderboard?key=…&limit= → { top: AdminTopRow[] }
// POST /api/admin/leaderboard { key, action:'reset' } → { ok, reset }
import { NextResponse } from 'next/server';
import { adminTopPlayers, adminResetLeaderboard } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

type DbLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
};
async function tryDb(): Promise<DbLike | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as DbLike;
  } catch (e) {
    console.error('[admin/leaderboard] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ error: 'sqlite-unavailable', top: [] }, { status: 503 });
  try {
    const u = new URL(req.url);
    const limit = Math.min(500, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 50)));
    return NextResponse.json({ top: adminTopPlayers(limit) });
  } catch (e) {
    console.error('[admin/leaderboard] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed', top: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
  try {
    if (String(b.action ?? '') !== 'reset') return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
    const reset = adminResetLeaderboard();
    return NextResponse.json({ ok: true, reset });
  } catch (e) {
    console.error('[admin/leaderboard] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'reset-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
