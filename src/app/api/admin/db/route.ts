// v11.29 — database maintenance for the /admin dashboard.
// POST /api/admin/db { key, action }
//   action=vacuum        → { ok }            (compact the SQLite file)
//   action=clearMessages → { ok, removed }   (wipe the whole chat log — destructive)
import { NextResponse } from 'next/server';
import { db, adminVacuum, adminClearMessages } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  try {
    db();
    const action = String(b.action ?? '');
    if (action === 'vacuum') { adminVacuum(); return NextResponse.json({ ok: true }); }
    if (action === 'clearMessages') return NextResponse.json({ ok: true, removed: adminClearMessages() });
    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'db-failed' }, { status: 500 });
  }
}
