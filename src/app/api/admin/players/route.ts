// v11.29 — admin player management.
// GET  /api/admin/players?key=…&q=<search>&limit= → { players: AdminPlayerRow[] }
// POST /api/admin/players { key, action, uid, … }
//   action=update { uid, name?, avatar?, level?, nw? } → { ok, player }
//   action=ban    { uid }                             → { ok }
//   action=unban  { uid }                             → { ok }
//   action=delete { uid }                             → { ok }  (wipes player + chat + edges + gifts)
import { NextResponse } from 'next/server';
import {
  db, validUid, listPlayersAdmin, adminUpdatePlayer, adminSetBanned, adminDeletePlayer,
} from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  try {
    db();
    const u = new URL(req.url);
    const q = u.searchParams.get('q') ?? '';
    const limit = Math.min(500, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 200)));
    return NextResponse.json({ players: listPlayersAdmin(q, limit) });
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
    const uid = b.uid;
    if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    const action = String(b.action ?? '');

    if (action === 'update') {
      const patch: { name?: string; avatar?: string; level?: number; nw?: number } = {};
      if (b.name !== undefined) patch.name = String(b.name);
      if (b.avatar !== undefined) patch.avatar = String(b.avatar);
      if (b.level !== undefined) { const n = Math.round(Number(b.level)); if (!Number.isFinite(n)) return NextResponse.json({ ok: false, error: 'bad-level' }, { status: 400 }); patch.level = n; }
      if (b.nw !== undefined) { const n = Number(b.nw); if (!Number.isFinite(n)) return NextResponse.json({ ok: false, error: 'bad-nw' }, { status: 400 }); patch.nw = n; }
      const player = adminUpdatePlayer(uid, patch);
      if (!player) return NextResponse.json({ ok: false, error: 'unknown-uid' }, { status: 404 });
      return NextResponse.json({ ok: true, player });
    }
    if (action === 'ban') return NextResponse.json({ ok: adminSetBanned(uid, true) });
    if (action === 'unban') return NextResponse.json({ ok: adminSetBanned(uid, false) });
    if (action === 'delete') { adminDeletePlayer(uid); return NextResponse.json({ ok: true }); }

    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'player-failed' }, { status: 500 });
  }
}
