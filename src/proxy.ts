// v11.35 — Host-based routing for the VPS (Next.js 16 `proxy` convention,
// replaces the old middleware.ts). Ignored by the static GitHub Pages build:
// that build sets pageExtensions to ['tsx'] only, so this .ts file is skipped.
//
// v13.3 — /admin (and /admin/) now rewrites to the standalone static file
// /admin.html — a self-contained dark admin dashboard with embedded CSS+JS,
// no React, no build step. The legacy React /ads dashboard stays for backward
// compatibility. The /adm bookmark still rewrites to /ads.
//
// mogul.huyenbao.com is now GAME-FIRST. The comprehensive admin dashboard lives
// at /ads (React) and /admin (standalone HTML); the old /adm bookmark silently
// rewrites to /ads. The game is served at the root, exactly like every other host.
//   mogul.huyenbao.com/        → game (native, no rewrite — same as huyenbao.com)
//   mogul.huyenbao.com/game    → rewrite → /             (alias; URL stays /game)
//   mogul.huyenbao.com/adm     → rewrite → /ads          (alias; URL stays /adm)
//   mogul.huyenbao.com/admin   → rewrite → /admin.html   (alias; URL stays /admin)
//   mogul.huyenbao.com/admin.html → served as static file (Next public dir)
//   mogul.huyenbao.com/ads     → admin dashboard (comprehensive React game control)
//   mogul.huyenbao.com/api/*   → untouched      (social + /api/admin endpoints,
//                                 still guarded by the ADMIN_KEY env var)
// Any other host (huyenbao.com, localhost, LAN IP, dev…) is untouched, so the
// game stays at / everywhere and local dev is unaffected.
import { NextResponse, type NextRequest } from 'next/server';

const isMogulHost = (host: string) => {
  const h = (host || '').toLowerCase().split(':')[0];
  return h === 'mogul.huyenbao.com' || h.endsWith('.mogul.huyenbao.com');
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('host') ?? '';

  if (isMogulHost(host)) {
    if (pathname === '/game' || pathname === '/game/') {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.search = '';
      return NextResponse.rewrite(url);
    }
    if (pathname === '/adm' || pathname === '/adm/') {
      const url = req.nextUrl.clone();
      url.pathname = '/ads';
      url.search = '';
      return NextResponse.rewrite(url);
    }
    // v13.3 — /admin → standalone HTML dashboard (served from /public/admin.html).
    // Rewriting instead of redirecting keeps the friendly /admin URL visible.
    if (pathname === '/admin' || pathname === '/admin/') {
      const url = req.nextUrl.clone();
      url.pathname = '/admin.html';
      url.search = '';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/game', '/game/', '/adm', '/adm/', '/admin', '/admin/'],
};
