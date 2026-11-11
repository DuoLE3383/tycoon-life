'use client';

import { Ic } from '@/lib/art';
import { entityTierOf, GROUPS, type GameState } from '@/components/gameDeps';
import type { TFn } from '@/components/shared';

type SubTabs = (typeof GROUPS)[number][3];

export function NavBar({ s, t, tab, activeGroup, curSubs, friendActivity, onSelectGroup, onSelectTab }: {
  s: GameState;
  t: TFn;
  tab: string;
  activeGroup: string;
  curSubs: SubTabs;
  friendActivity: boolean;
  onSelectGroup: (groupId: string, firstTab: string) => void;
  onSelectTab: (tabId: string) => void;
}) {
  const visibleSubs = activeGroup === 'world'
    ? curSubs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
    : curSubs;
  return (
    <>
      <nav role="tablist" className="tnav gnav" aria-label="Sections">
        {GROUPS.map(([gid, name, icon, subs]) => {
          const visible = gid === 'world'
            ? subs.filter(([key]) => key !== 'space' || entityTierOf(s) === 'empire' || entityTierOf(s) === 'federation')
            : subs;
          return (
            <button key={gid} role="tab" aria-selected={activeGroup === gid} data-g={gid}
              onClick={() => onSelectGroup(gid, visible[0][0])}>
              {Ic({ id: icon, className: 'si navsi' })}{t('grp.' + gid, name)}
            </button>
          );
        })}
      </nav>
      {visibleSubs.length > 1 && (
        <nav role="tablist" className="tnav subnav" aria-label="Sub-sections">
          {visibleSubs.map(([key, name, icon]) => (
            <button key={key} role="tab" aria-selected={tab === key} data-t={key}
              data-tip={t('ttab.' + key, '')}
              onClick={() => onSelectTab(key)}>
              {Ic({ id: icon, className: 'si navsi' })}{t('tab.' + key, name)}
              {key === 'friends' && friendActivity && <span className="navdot" />}
            </button>
          ))}
        </nav>
      )}
    </>
  );
}
