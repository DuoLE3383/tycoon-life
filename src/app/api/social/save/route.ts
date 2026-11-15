// v13.30 - Cloud save: POST { uid, data } luu full GameState, GET ?uid=... tai ve.
// Data la JSON string cua GameState, toi da ~2MB. Chi chu save moi duoc ghi / doc save cua minh.
import { NextResponse } from 'next/server';
import { saveGameState, getGameState, validUid } from '@/lib/server/socialDb';

export async function GET(req: Request) {
  const uid = (new URL(req.url).searchParams.get('uid') || '').trim();
  if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
  const row = getGameState(uid);
  if (!row) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: row.data, updated_at: row.updated_at });
}

export async function POST(req: Request) {
  try {
    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    const uid = String(b.uid || '').trim();
    const data = typeof b.data === 'string' ? b.data : '';
    if (!validUid(uid)) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    if (!data || data.length > 2_000_000) return NextResponse.json({ ok: false, error: 'bad-data' }, { status: 400 });
    try { const j = JSON.parse(data); if (!j || j.started !== true) throw new Error('not-started'); } catch { return NextResponse.json({ ok: false, error: 'bad-data' }, { status: 400 }); }
    const ok = saveGameState(uid, data);
    return NextResponse.json({ ok });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'save-failed' }, { status: 500 });
  }
}
