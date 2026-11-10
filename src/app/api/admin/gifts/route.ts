// v11.29 — admin gift log + moderation. v11.35 extended with admin-send.
// GET  /api/admin/gifts?key=…&limit= → { gifts }
// POST /api/admin/gifts { key, action, … }
//   action='delete' { id }                 → { ok }                 (v11.29)
//   action='send'   { to, amount, note? }  → { ok, gift }           (v11.35)
import { NextResponse } from 'next/server';
import { db, adminListGifts, adminDeleteGift, adminSendGift } from '@/lib/server/socialDb';
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
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'gift-failed' }, { status: 500 });
  }
}
