// v11.29 — admin player management. v12.2 — tryDb() so SQLite failures no
// longer 500 the whole dashboard. Each branch falls through to a graceful
// JSON error instead of crashing the route.
// GET  /api/admin/players?key=…&q=<search>&limit= → { players: AdminPlayerRow[] }
// POST /api/admin/players { key, action, uid, … }
//   action=update { uid, name?, avatar?, level?, nw? } → { ok, player }
//   action=ban    { uid }                             → { ok }
//   action=unban  { uid }                             → { ok }
//   action=delete { uid }                             → { ok }  (wipes player + chat + edges + gifts)
import { NextResponse } from 'next/server';
import {
  validUid, listPlayersAdmin, adminUpdatePlayer, adminSetBanned, adminDeletePlayer,
} from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

// v12.2 — lazy SQLite loader (mirrors /api/admin/game/route.ts). Returns null
// when better-sqlite3 or the DB file can't be initialised (permissions,
// missing data/ dir, native-module issue). Every handler below checks the
// result and responds with a graceful 503 instead of crashing with 500.
type DbLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
};
async function tryDb(): Promise<DbLike | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as DbLike;
  } catch (e) {
    console.error('[admin/players] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ error: 'sqlite-unavailable', players: [] }, { status: 503 });
  try {
    const u = new URL(req.url);
    const q = u.searchParams.get('q') ?? '';
    const limit = Math.min(500, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 200)));
    return NextResponse.json({ players: listPlayersAdmin(q, limit) });
  } catch (e) {
    console.error('[admin/players] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed', players: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
  try {
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
    console.error('[admin/players] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'player-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
