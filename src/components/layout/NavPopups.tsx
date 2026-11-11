'use client';

import { entityTierOf, type GameState, GROUPS, Ic, useState } from '@/components/gameDeps';
import { type TFn } from '@/components/shared';



// ================= v11.45 — NAV POPUP MENUS =================
// Replaces the old gnav + subnav horizontal bars with compact dropdown
// popups. Each group is a button; clicking opens a popup with the group's
// sub-tabs as clickable links. Saves vertical space + groups related links.
export function NavPopups({ s, t, activeGroup, tab, onNav, comm }: {
  s: GameState; t: TFn; activeGroup: string; tab: string;
  onNav: (gid: string, k: string) => void;
  comm: { ready: boolean; incoming: unknown[]; unclaimedGifts: unknown[] };
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  return (
    <nav className="nav-popups" aria-label="Sections">
      {GROUPS.map(([gid, gn, gic, subs]) => {
        const isWorld = gid === 'world';
        const visibleSubs = isWorld ? subs.filter(([k]) => k !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation') : subs;
        const isActive = activeGroup === gid;
        return (
          <div key={gid} className="nav-popup-wrap">
            <button className={'nav-popup-btn' + (isActive ? ' on' : '') + (openGroup === gid ? ' open' : '')}
              onClick={() => setOpenGroup(openGroup === gid ? null : gid)}
              aria-expanded={openGroup === gid}>
              {Ic({ id: gic, className: 'si navsi' })}
              <span>{t('grp.' + gid, gn)}</span>
            </button>
            {openGroup === gid && (
              <div className="nav-popup-menu" onClick={() => setOpenGroup(null)}>
                <div className="nav-popup-menu-inner" onClick={e => e.stopPropagation()}>
                  {visibleSubs.map(([k, n, ic]) => (
                    <button key={k} className={'nav-popup-link' + (tab === k ? ' on' : '')}
                      onClick={() => { onNav(gid, k); setOpenGroup(null); }}>
                      {Ic({ id: ic, className: 'si navsi' })}
                      <span>{t('tab.' + k, n)}</span>
                      {k === 'friends' && comm.ready && (comm.incoming.length > 0 || comm.unclaimedGifts.length > 0) && <span className="navdot" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
