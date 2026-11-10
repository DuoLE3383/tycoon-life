// v11.29 — admin gift log + moderation.
// GET  /api/admin/gifts?key=…&limit= → { gifts }
// POST /api/admin/gifts { key, action:'delete', id } → { ok }
import { NextResponse } from 'next/server';
import { db, adminListGifts, adminDeleteGift } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  try {
    db();
    const u = new URL(req.url);
    const limit = Math.min(400, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 100)));
    return NextResponse.json({ gifts: adminListGifts(limit) });
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
    if (String(b.action ?? '') !== 'delete') return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
    const id = Math.round(Number(b.id));
    if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
    return NextResponse.json({ ok: adminDeleteGift(id) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'gift-failed' }, { status: 500 });
  }
}
