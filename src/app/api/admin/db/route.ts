// v11.29 — database maintenance for the /admin dashboard.
// v12.2 — tryDb() pattern so SQLite failures return graceful 503 instead of 500.
// POST /api/admin/db { key, action }
//   action=vacuum        → { ok }            (compact the SQLite file)
//   action=clearMessages → { ok, removed }   (wipe the whole chat log — destructive)
import { NextResponse } from 'next/server';
import { adminVacuum, adminClearMessages } from '@/lib/server/socialDb';
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
    console.error('[admin/db] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
  try {
    const action = String(b.action ?? '');
    if (action === 'vacuum') { adminVacuum(); return NextResponse.json({ ok: true }); }
    if (action === 'clearMessages') return NextResponse.json({ ok: true, removed: adminClearMessages() });
    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    console.error('[admin/db] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'db-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
