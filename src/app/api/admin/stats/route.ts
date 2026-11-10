// v11.29 — admin stats for the /admin dashboard.
// GET /api/admin/stats?key=ADMIN_KEY
// ADMIN_KEY is a server-only env var; without it every request is rejected,
// so a public deployment never leaks player data.
import { NextResponse } from 'next/server';
import { db, adminStats } from '@/lib/server/socialDb';
import { adminGuard } from '@/lib/server/adminAuth';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  try {
    db();
    return NextResponse.json(adminStats());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'stats-failed' }, { status: 500 });
  }
}
