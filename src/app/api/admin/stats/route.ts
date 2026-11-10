// v11.27 — admin stats for the /admin dashboard.
// GET /api/admin/stats?key=ADMIN_KEY
// ADMIN_KEY is a server-only env var; without it every request is rejected,
// so a public deployment never leaks player data.
import { NextResponse } from 'next/server';
import { db, adminStats } from '@/lib/server/socialDb';

export function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('key') ?? '';
  const expected = process.env.ADMIN_KEY ?? '';
  if (!expected || key.length !== expected.length || key !== expected) {
    return NextResponse.json({ error: expected ? 'bad-key' : 'admin-key-not-set' }, { status: 403 });
  }
  try {
    db();
    return NextResponse.json(adminStats());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'stats-failed' }, { status: 500 });
  }
}
