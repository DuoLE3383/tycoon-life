// v11.29 — admin stats for the /admin dashboard.
// v12.2 — tryDb() pattern so SQLite failures return graceful 503 + empty
// stats payload instead of crashing with 500.
// GET /api/admin/stats?key=ADMIN_KEY
// ADMIN_KEY is a server-only env var; without it every request is rejected,
// so a public deployment never leaks player data.
import { NextResponse } from 'next/server';
import { adminStats } from '@/lib/server/socialDb';
import { adminGuard } from '@/lib/server/adminAuth';

type DbLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
};
async function tryDb(): Promise<DbLike | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as DbLike;
  } catch (e) {
    console.error('[admin/stats] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable', players: 0, messages: 0, gifts: 0, edges: 0, top: [] }, { status: 503 });
  try {
    return NextResponse.json(adminStats());
  } catch (e) {
    console.error('[admin/stats] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'stats-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
