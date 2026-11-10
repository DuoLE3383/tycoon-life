// v11.35 — admin system info for the comprehensive dashboard's "Hệ thống" tab.
// GET /api/admin/system?key=ADMIN_KEY
import { NextResponse } from 'next/server';
import { db, adminSystemInfo } from '@/lib/server/socialDb';
import { adminGuard } from '@/lib/server/adminAuth';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  try {
    db();
    return NextResponse.json(adminSystemInfo());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'system-failed' }, { status: 500 });
  }
}
