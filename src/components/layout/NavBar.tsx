'use client';

import { Ic } from '@/lib/art';
import { GROUPS } from '@/lib/gameData';
import { useT } from '@/lib/i18n';

export function NavBar({ tab, lastTab, onSelectTab }: {
  tab: string;
  lastTab: Record<string, string>;
  onSelectTab: (tabId: string, groupId: string, remember: boolean) => void;
}) {
  const { t } = useT();
  const activeGroup = GROUPS.find(g => g[3].some(([key]) => key === tab))?.[0] || 'life';
  const curSubs = (GROUPS.find(g => g[0] === activeGroup) || GROUPS[0])[3];

  return (
    <>
      <nav role="tablist" className="tnav gnav" aria-label="Sections">
        {GROUPS.map(([gid, gn, gic, subs]) => (
          <button key={gid} role="tab" aria-selected={activeGroup === gid} data-g={gid}
            onClick={() => onSelectTab(lastTab[gid] || subs[0][0], gid, false)}>
            {Ic({ id: gic, className: 'si navsi' })}{t('grp.' + gid, gn)}
          </button>
        ))}
      </nav>
      <nav role="tablist" className="tnav subnav" aria-label="Sub-sections">
        {curSubs.map(([key, name, icon]) => (
          <button key={key} role="tab" aria-selected={tab === key} data-t={key}
            onClick={() => onSelectTab(key, activeGroup, true)}>
            {Ic({ id: icon, className: 'si navsi' })}{t('tab.' + key, name)}
          </button>
        ))}
      </nav>
    </>
  );
}
