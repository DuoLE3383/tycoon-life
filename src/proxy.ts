// v11.30 — Host-based routing for the VPS (Next.js 16 `proxy` convention,
// replaces the old middleware.ts). Ignored by the static GitHub Pages build:
// that build sets pageExtensions to ['tsx'] only, so this .ts file is skipped.
//
// mogul.huyenbao.com is dedicated to the ADMIN console:
//   mogul.huyenbao.com/        → 302 → /admin   (game-management console)
//   mogul.huyenbao.com/game    → rewrite → /    (full game + SQLite social API)
//   mogul.huyenbao.com/api/*   → untouched      (social + admin endpoints)
// Any other host (huyenbao.com, localhost, LAN IP, dev…) is untouched, so the
// game stays at / everywhere else and local dev is unaffected.
import { NextResponse, type NextRequest } from 'next/server';

const isMogulHost = (host: string) => {
  const h = (host || '').toLowerCase().split(':')[0];
  return h === 'mogul.huyenbao.com' || h.endsWith('.mogul.huyenbao.com');
};

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get('host') ?? '';

  if (isMogulHost(host)) {
    // Admin console is the front door of the mogul domain.
    if (pathname === '/') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url, 302);
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
