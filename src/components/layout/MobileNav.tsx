'use client';

import { Ic } from '@/lib/art';
import { entityTierOf, GROUPS, type GameState } from '@/components/gameDeps';
import type { TFn } from '@/components/shared';

type SubTabs = (typeof GROUPS)[number][3];

export function MobileNav({ s, t, tab, activeGroup, curSubs, onSelectGroup, onSelectTab }: {
  s: GameState;
  t: TFn;
  tab: string;
  activeGroup: string;
  curSubs: SubTabs;
  onSelectGroup: (groupId: string, firstTab: string) => void;
  onSelectTab: (tabId: string) => void;
}) {
  const visibleSubs = activeGroup === 'world'
    ? curSubs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
    : curSubs;
  return (
    <div className="mobile-nav-shell">
      {visibleSubs.length > 1 && (
        <nav role="tablist" className="mobile-subnav" aria-label="Sub-sections">
          {visibleSubs.map(([key, name, icon]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key}
              className="mobile-subnav-btn" data-t={key}
              aria-label={t('tab.' + key, name)} title={t('tab.' + key, name)} onClick={() => onSelectTab(key)}>
              {Ic({ id: icon, className: 'si' })}
            </button>
          ))}
        </nav>
      )}
      <nav role="tablist" className="mobile-bottom-nav" aria-label="Sections">
        {GROUPS.map(([gid, name, icon, subs]) => {
          const visible = gid === 'world'
            ? subs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
            : subs;
          return (
            <button key={gid} type="button" role="tab" aria-selected={activeGroup === gid}
              className="mobile-nav-btn" data-g={gid}
              aria-label={t('grp.' + gid, name)} title={t('grp.' + gid, name)} aria-current={activeGroup === gid}
              onClick={() => onSelectGroup(gid, visible[0][0])}>
              {Ic({ id: icon, className: 'si' })}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
