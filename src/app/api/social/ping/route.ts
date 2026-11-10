// v11.27 — liveness probe so the client can auto-detect the SQLite backend.
// GET /api/social/ping → { ok: true, backend: 'sqlite' }
import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: true, backend: 'sqlite' });
}
