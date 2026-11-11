'use client';

import { asset, buySpace, fmt, type GameState, SPACE_LINES, SPACE_TRAVEL_COST, spaceIncome, spaceUpgradeDays, spaceUpgradeReady, startSpaceUpgrade, useT, worldYear, xpNeed } from '@/components/gameDeps';
import { type Act, Btn, Row } from '@/components/shared';
import { Btn, Row } from '@/components/shared';



// ================= SPACE =================
export function SpaceTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const y = worldYear(s);
  return (
    <>
      <div className="card hero">
        <div className="heroimg" style={{ backgroundImage: 'url(' + asset('/img/space.jpg') + ')' }} aria-hidden="true" />
        <div className="herobody">
          <b className="big">{t('spaceTitle')}</b>
          <div className="sub" style={{ marginTop: 4 }}>{t('spaceTeaser', '', { lvl: SPACE_LINES[0].lvl })}</div>
          <div className="sub" style={{ marginTop: 6 }}>{t('lvl')} {s.level} · {s.xp}/{xpNeed(s.level)} XP{spaceIncome(s) > 0 ? ` · ${t('inc.space')} +${fmt(spaceIncome(s))}${t('perYear')}` : ''}</div>
        </div>
      </div>
      <Row art="s-orb" right={<Btn ic={s.spaceTravel ? 'ic-check' : 'ic-up'}
        label={s.spaceTravel ? t('spaceTravelReady') : s.spaceUpgrade ? t('spaceTravelWaiting', '', { n: Math.max(0, Math.ceil(s.spaceUpgrade.completesDay - s.day)) }) : t('spaceTravelStart')}
        disabled={s.spaceTravel || !!s.spaceUpgrade || !spaceUpgradeReady(s)}
        onClick={() => act(st => startSpaceUpgrade(st))} />}>
        <b>{t('spaceTravelTitle')}</b>
        <span className="sub">{s.spaceTravel ? t('spaceTravelBonus') : `${t('setup')} ${fmt(SPACE_TRAVEL_COST)} · ${spaceUpgradeDays} ${t('spaceDays')}`}</span>
        {!s.spaceTravel && !s.spaceUpgrade && <span className="sub" style={{ display: 'block' }}>{t('spaceTravelRequirement')}</span>}
      </Row>
      {SPACE_LINES.map(l => {
        const owned = s.space[l.id];
        const lvlOk = s.level >= l.lvl, yrOk = y >= l.since, moneyOk = s.money >= l.cost;
        const why = !lvlOk ? t('lvlReq', '', { n: l.lvl }) : !yrOk ? t('unlocksIn', '', { y: l.since }) : !moneyOk ? t('needLicence') : '';
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('founded') : why || t('found')} disabled={!!owned || !!why} onClick={() => act(st => buySpace(st, l.id))} />}>
          <b>{t('space.' + l.id, l.name)} <span className="tag">{t('lvlReq', '', { n: l.lvl })}</span> <span className="tag">{t('since')} {l.since}</span></b>
          <span className="sub">+{fmt(l.inc)}{t('perYear')} · {t('setup')} {fmt(l.cost)}</span>
          <span className="sub" style={{ display: 'block' }}>{l.desc}</span>
        </Row>;
      })}
      <p className="sub">{t('spaceNote')}</p>
    </>
  );
}
