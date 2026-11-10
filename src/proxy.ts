// v11.32 — Host-based routing for the VPS (Next.js 16 `proxy` convention,
// replaces the old middleware.ts). Ignored by the static GitHub Pages build:
// that build sets pageExtensions to ['tsx'] only, so this .ts file is skipped.
//
// mogul.huyenbao.com is dedicated to the HIDDEN admin console. The real route
// lives at /adm; the old /admin path no longer exists (404 everywhere).
//   mogul.huyenbao.com/        → rewrite → /adm (URL bar stays on the root —
//                                 visitors can't see where the console lives)
//   mogul.huyenbao.com/adm     → the console, directly
//   mogul.huyenbao.com/admin   → 404 (route removed in v11.32)
//   mogul.huyenbao.com/game    → rewrite → /    (full game + SQLite social API)
//   mogul.huyenbao.com/api/*   → untouched      (social + /api/admin endpoints,
//                                 still guarded by the ADMIN_KEY env var)
// Any other host (huyenbao.com, localhost, LAN IP, dev…) is untouched, so the
// game stays at / everywhere else and local dev is unaffected.
import { NextResponse, type NextRequest } from 'next/server';

const isMogulHost = (host: string) => {
  const h = (host || '').toLowerCase().split(':')[0];
  return h === 'mogul.huyenbao.com' || h.endsWith('.mogul.huyenbao.com');
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') ?? '';

  if (isMogulHost(host)) {
    // Hidden front door: serve the console at the root WITHOUT changing the
    // URL (rewrite, not redirect) — /adm never shows up in the address bar.
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/adm';
      return NextResponse.rewrite(url);
    }
    // Escape hatch: the full game (with social backend) stays reachable.
    if (pathname === '/game') {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/game'],
};
