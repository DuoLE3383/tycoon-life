// Shared authentication for every /api/admin/* route.
// Secrets are accepted only through Authorization or X-Admin-Key headers.
// POST handlers may also pass bodyKey for compatibility with server clients.
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (v: string) => createHash('sha256').update(v).digest();
function eqConstTime(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** Returns a 403 response when the request is not authorised. */
export function adminGuard(req: Request, bodyKey?: unknown): NextResponse | null {
  const expected = process.env.ADMIN_KEY ?? '';
  if (!expected) return NextResponse.json({ error: 'admin-key-not-set' }, { status: 403 });
  const authorization = req.headers.get('authorization') ?? '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1] ?? '';
  const headerKey = req.headers.get('x-admin-key') ?? bearer;
  const provided = headerKey || (typeof bodyKey === 'string' ? bodyKey : '');
  if (!provided || !eqConstTime(provided, expected)) {
    return NextResponse.json({ error: 'bad-key' }, { status: 403 });
  }
  return null;
}

/** Parse a JSON body without throwing. */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json() as Record<string, unknown>; } catch { return {}; }
}
