// v11.35 — Host-based routing for the VPS (Next.js 16 `proxy` convention,
// replaces the old middleware.ts). Ignored by the static GitHub Pages build:
// that build sets pageExtensions to ['tsx'] only, so this .ts file is skipped.
//
// mogul.huyenbao.com is now GAME-FIRST. The comprehensive admin dashboard lives
// at /ads; the old /adm bookmark silently rewrites there. The game is served at
// the root, exactly like every other host.
//   mogul.huyenbao.com/        → game (native, no rewrite — same as huyenbao.com)
//   mogul.huyenbao.com/game    → rewrite → /    (alias; URL stays /game)
//   mogul.huyenbao.com/adm     → rewrite → /ads (alias; URL stays /adm)
//   mogul.huyenbao.com/admin   → 404            (route never existed; Next default)
//   mogul.huyenbao.com/ads     → admin dashboard (comprehensive game control)
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/game', '/game/', '/adm', '/adm/'],
};
