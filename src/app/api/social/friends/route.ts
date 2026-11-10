// v11.27 — friends: list, add-by-code, accept/decline, remove.
// GET  /api/social/friends?uid=… → { edges, people }
// POST /api/social/friends { uid, action, … }
//   action=add      { code }    → { result: sent|auto|exists|self|notfound|fail }
//   action=accept   { edgeId }  → { ok }
//   action=decline  { edgeId }  → { ok }
//   action=remove   { targetUid } → { ok }
import { NextResponse } from 'next/server';
import {
  db, validUid, validCode, getPlayer, getPlayerByCode, edgesFor, profilesOf,
  edgeBetween, addEdge, acceptEdge, deleteEdge, removeFriendship, touchSeen,
} from '@/lib/server/socialDb';

export function GET(req: Request) {
  try {
    db();
    const uid = new URL(req.url).searchParams.get('uid') ?? '';
    if (!validUid(uid)) return NextResponse.json({ error: 'bad-uid' }, { status: 400 });
    touchSeen(uid);
    const edges = edgesFor(uid);
    return NextResponse.json({ edges, people: profilesOf(edges.map(e => (e.a === uid ? e.b : e.a))) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    db();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = b.uid;
    if (!validUid(uid)) return NextResponse.json({ error: 'bad-uid' }, { status: 400 });
    if (!getPlayer(uid)) return NextResponse.json({ error: 'unknown-uid' }, { status: 404 });
    touchSeen(uid);
    const action = String(b.action ?? '');

    if (action === 'add') {
      const code = String(b.code ?? '').trim().toUpperCase();
      if (!validCode(code)) return NextResponse.json({ result: 'notfound' });
      if (getPlayer(uid)?.code === code) return NextResponse.json({ result: 'self' });
      const target = getPlayerByCode(code);
      if (!target) return NextResponse.json({ result: 'notfound' });
      if (target.id === uid) return NextResponse.json({ result: 'self' });
      const ex = edgeBetween(uid, target.id);
      if (ex) {
        if (ex.status === 'accepted' || ex.a === uid) return NextResponse.json({ result: 'exists' });
        acceptEdge(ex.id); // they invited me — mutual add auto-accepts
        return NextResponse.json({ result: 'auto' });
      }
      addEdge(uid, target.id);
      return NextResponse.json({ result: 'sent' });
    }

    if (action === 'accept' || action === 'decline') {
      const id = String(b.edgeId ?? '');
      const edges = edgesFor(uid);
      const edge = edges.find(e => e.id === id && e.b === uid && e.status === 'pending');
      if (!edge) return NextResponse.json({ ok: false, error: 'no-edge' }, { status: 404 });
      if (action === 'accept') acceptEdge(Number(edge.id));
      else deleteEdge(Number(edge.id));
      return NextResponse.json({ ok: true });
    }

    if (action === 'remove') {
      const other = b.targetUid;
      if (!validUid(other)) return NextResponse.json({ ok: false, error: 'bad-target' }, { status: 400 });
      removeFriendship(uid, other);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'friend-failed' }, { status: 500 });
  }
}
