// v11.29 — admin gift log + moderation. v11.35 extended with admin-send.
// v12.2 — tryDb() pattern so SQLite failures return graceful 503 instead of 500.
// GET  /api/admin/gifts?key=…&limit= → { gifts }
// POST /api/admin/gifts { key, action, … }
//   action='delete' { id }                 → { ok }                 (v11.29)
//   action='send'   { to, amount, note? }  → { ok, gift }           (v11.35)
import { NextResponse } from 'next/server';
import { adminListGifts, adminDeleteGift, adminSendGift } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

type DbLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
};
// v12.2 — lazy SQLite loader. Returns null when better-sqlite3 / the DB file
// can't be opened. Handlers below respond with a graceful 503 instead of 500.
async function tryDb(): Promise<DbLike | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as DbLike;
  } catch (e) {
    console.error('[admin/gifts] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ error: 'sqlite-unavailable', gifts: [] }, { status: 503 });
  try {
    const u = new URL(req.url);
    const limit = Math.min(400, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 100)));
    return NextResponse.json({ gifts: adminListGifts(limit) });
  } catch (e) {
    console.error('[admin/gifts] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed', gifts: [] }, { status: 500 });
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
    if (action === 'delete') {
      const id = Math.round(Number(b.id));
      if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      return NextResponse.json({ ok: adminDeleteGift(id) });
    }
    if (action === 'send') {
      const to = String(b.to ?? '').trim();
      const amount = Number(b.amount);
      const note = String(b.note ?? '');
      if (!to) return NextResponse.json({ ok: false, error: 'bad-to' }, { status: 400 });
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, error: 'bad-amount' }, { status: 400 });
      const gift = adminSendGift(to, amount, note);
      if (!gift) return NextResponse.json({ ok: false, error: 'unknown-recipient' }, { status: 404 });
      return NextResponse.json({ ok: true, gift });
    }
    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    console.error('[admin/gifts] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'gift-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
