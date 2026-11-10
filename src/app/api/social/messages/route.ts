// v11.27 — global chat.
// GET  /api/social/messages → { messages }
// POST /api/social/messages { uid, text } → { ok, message } | { ok:false, flood }
import { NextResponse } from 'next/server';
import { db, listMessages, insertMessage, validUid } from '@/lib/server/socialDb';

export function GET() {
  try {
    db();
    return NextResponse.json({ messages: listMessages() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'list-failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    db();
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (!validUid(b.uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    const r = insertMessage(b.uid, String(b.text ?? ''));
    if (!r.ok) return NextResponse.json({ ok: false, flood: true });
    return NextResponse.json({ ok: true, message: r.row });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'send-failed' }, { status: 500 });
  }
}
