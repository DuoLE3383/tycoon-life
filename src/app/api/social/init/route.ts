// v11.27 — identity upsert + full first paint.
// POST /api/social/init { uid, name, avatar, level?, nw? }
// → { me, messages, edges, gifts, board, online, people }
import { NextResponse } from 'next/server';
import {
  db, upsertPlayer, touchSeen, validUid, clampStr, clampEmoji, clampAmount,
  listMessages, edgesFor, giftsFor, topPlayers, onlinePlayers, profilesOf,
} from '@/lib/server/socialDb';

export async function POST(req: Request) {
  try {
    db(); // ensure schema
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = b.uid;
    if (!validUid(uid)) return NextResponse.json({ error: 'bad-uid' }, { status: 400 });
    const me = upsertPlayer(uid, {
      name: clampStr(b.name, 24) || undefined,
      avatar: b.avatar !== undefined ? clampEmoji(b.avatar) : undefined,
      level: b.level !== undefined ? Number(b.level) : undefined,
      nw: b.nw !== undefined ? clampAmount(b.nw) : undefined,
    });
    touchSeen(uid);
    const edges = edgesFor(uid);
    const gifts = giftsFor(uid);
    const otherIds = [...edges.map(e => (e.a === uid ? e.b : e.a)), ...gifts.map(g => (g.from === uid ? g.to : g.from))];
    const people = profilesOf(otherIds);
    return NextResponse.json({
      me,
      messages: listMessages(),
      edges,
      gifts,
      board: topPlayers(),
      online: onlinePlayers(),
      people,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'init-failed' }, { status: 500 });
  }
}
