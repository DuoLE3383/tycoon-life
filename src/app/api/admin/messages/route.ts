// v11.29 — admin chat moderation + broadcast.
// v12.2 — tryDb() so SQLite failures return graceful 503 instead of 500.
// GET  /api/admin/messages?key=…&limit= → { messages } (newest first)
// POST /api/admin/messages { key, action, … }
//   action=delete     { id }  → { ok }
//   action=deleteUser { uid } → { ok, removed }
//   action=broadcast  { text } → { ok, message }  (posts as 📢 HuyenBao)
import { NextResponse } from 'next/server';
import {
  validUid, adminListMessages, adminDeleteMessage, adminDeleteMessagesByUser, adminBroadcast,
} from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

type DbLike = {
  exec: (sql: string) => void;
  prepare: (sql: string) => { run: (...args: unknown[]) => void; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
};
async function tryDb(): Promise<DbLike | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as DbLike;
  } catch (e) {
    console.error('[admin/messages] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const d = await tryDb();
  if (!d) return NextResponse.json({ error: 'sqlite-unavailable', messages: [] }, { status: 503 });
  try {
    const u = new URL(req.url);
    const limit = Math.min(400, Math.max(1, Math.round(Number(u.searchParams.get('limit')) || 120)));
    return NextResponse.json({ messages: adminListMessages(limit) });
  } catch (e) {
    console.error('[admin/messages] GET failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed', messages: [] }, { status: 500 });
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
      return NextResponse.json({ ok: adminDeleteMessage(id) });
    }
    if (action === 'deleteUser') {
      const uid = b.uid;
      if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
      return NextResponse.json({ ok: true, removed: adminDeleteMessagesByUser(uid) });
    }
    if (action === 'broadcast') {
      const text = String(b.text ?? '').trim();
      if (!text) return NextResponse.json({ ok: false, error: 'empty' }, { status: 400 });
      return NextResponse.json({ ok: true, message: adminBroadcast(text) });
    }

    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    console.error('[admin/messages] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'mod-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
