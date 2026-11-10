// v11.27 — money gifts between players (virtual currency).
// GET  /api/social/gifts?uid=… → { gifts }  (fromName resolved)
// POST /api/social/gifts { uid, action }
//   action=send  { to, amount, note } → { ok }  (must be an accepted friend)
//   action=claim { id }               → { ok }
import { NextResponse } from 'next/server';
import {
  db, validUid, clampAmount, clampStr, getPlayer, giftsFor, insertGift, claimGift,
  edgeBetween, touchSeen,
} from '@/lib/server/socialDb';

export function GET(req: Request) {
  try {
    db();
    const uid = new URL(req.url).searchParams.get('uid') ?? '';
    if (!validUid(uid)) return NextResponse.json({ error: 'bad-uid' }, { status: 400 });
    touchSeen(uid);
    return NextResponse.json({ gifts: giftsFor(uid) }); // fromName resolved server-side
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    db();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = b.uid;
    if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    if (!getPlayer(uid)) return NextResponse.json({ ok: false, error: 'unknown-uid' }, { status: 404 });
    touchSeen(uid);
    const action = String(b.action ?? '');

    if (action === 'send') {
      const to = b.to;
      const amount = clampAmount(b.amount);
      if (!validUid(to) || to === uid) return NextResponse.json({ ok: false, error: 'bad-target' }, { status: 400 });
      if (!(amount > 0)) return NextResponse.json({ ok: false, error: 'bad-amount' }, { status: 400 });
      // v11.27 server rule: gifts only between accepted friends (the Supabase
      // version trusted the client; on a self-hosted server we can be strict).
      const fr = edgeBetween(uid, to);
      if (!fr || fr.status !== 'accepted') return NextResponse.json({ ok: false, error: 'not-friends' }, { status: 403 });
      insertGift(uid, to, amount, clampStr(b.note, 120));
      return NextResponse.json({ ok: true });
    }

    if (action === 'claim') {
      const id = Math.round(Number(b.id));
      if (!Number.isFinite(id)) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      const ok = claimGift(id, uid);
      return NextResponse.json({ ok });
    }

    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'gift-failed' }, { status: 500 });
  }
}
