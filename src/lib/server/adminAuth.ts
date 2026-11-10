// v11.29 — shared auth for every /api/admin/* route.
//
// ADMIN_KEY is a server-only env var. Without it every request is rejected
// (fail-closed), so a public deployment never leaks player data. The key is
// compared in constant time against a SHA-256 digest to avoid leaking its
// length or contents through timing.
//
// GET routes pass the key as ?key=…; POST routes may pass it in the JSON
// body ({ key }) or the query string — both are accepted for convenience.
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (v: string) => createHash('sha256').update(v).digest();

function eqConstTime(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}

/** Returns a 403 NextResponse when the request is NOT authorised, else null. */
export function adminGuard(req: Request, bodyKey?: unknown): NextResponse | null {
  const expected = process.env.ADMIN_KEY ?? '';
  if (!expected) return NextResponse.json({ error: 'admin-key-not-set' }, { status: 403 });
  const q = new URL(req.url).searchParams.get('key') ?? '';
  const provided = typeof bodyKey === 'string' && bodyKey ? bodyKey : q;
  if (typeof provided !== 'string' || !provided || !eqConstTime(provided, expected)) {
    return NextResponse.json({ error: 'bad-key' }, { status: 403 });
  }
  return null;
}

/** Small helper: parse the JSON body of a POST request (never throws). */
export async function readBody(req: Request): Promise<Record<string, unknown>> {
  try { return await req.json() as Record<string, unknown>; } catch { return {}; }
}
