// v11.35 — admin system info for the comprehensive dashboard's "Hệ thống" tab.
// v12.2 — tryDb() pattern so SQLite failures return graceful 503 instead of 500.
// GET /api/admin/system?key=ADMIN_KEY
import { NextResponse } from 'next/server';
import { adminSystemInfo } from '@/lib/server/socialDb';
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
    console.error('[admin/system] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
  try {
    return NextResponse.json(adminSystemInfo());
  } catch (e) {
    console.error('[admin/system] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'system-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
