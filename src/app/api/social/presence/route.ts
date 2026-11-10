// v11.27 — presence heartbeat: keeps the caller "online" and returns who else is.
// POST /api/social/presence { uid } → { online }
import { NextResponse } from 'next/server';
import { db, validUid, getPlayer, touchSeen, onlinePlayers } from '@/lib/server/socialDb';

export async function POST(req: Request) {
  try {
    db();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = b.uid;
    if (!validUid(uid)) return NextResponse.json({ error: 'bad-uid' }, { status: 400 });
    if (getPlayer(uid)) touchSeen(uid); // unknown uids are never listed online
    return NextResponse.json({ online: onlinePlayers() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'presence-failed' }, { status: 500 });
  }
}
