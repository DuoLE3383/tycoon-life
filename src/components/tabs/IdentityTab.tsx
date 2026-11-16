'use client';
import { useState } from '@/components/gameDeps';
import { NATIONS, LANGUAGES, NATION_LANGUAGES, displayNation, fmt, type GameState, langCost, langDays, canLearnLang, startLangStudy, canApplyCitizenship, applyCitizenship, travelToNation, netWorth } from '@/components/gameDeps';
import { type Act, Btn, Row } from '@/components/shared';
import { useT } from '@/lib/i18n';
export function IdentityTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const [nation, setNation] = useState(s.nation);
  const nw = netWorth(s);
  const studying = s.langStudy;
  const pending = s.citizenshipApplied;
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('id.current')}</span><b>{displayNation(s.nation)}</b></div>
        <div className="lb"><span>{t('id.origin')}</span><b>{displayNation(s.originNation || s.nation)}</b></div>
        <div className="lb"><span>{t('id.netWorth')}</span><b>{fmt(nw)}</b></div>
        <div className="lb"><span>Fame</span><b>{Math.round(s.fame)}</b></div>
        {pending ? <div className="mini" style={{ marginTop: 6 }}>{t('id.pending', '', { nation: displayNation(pending.nation), days: Math.max(0, pending.endDay - s.day) })}</div> : null}
        {studying ? <div className="mini" style={{ marginTop: 6 }}>{t('id.studying', '', { lang: studying.lang, level: studying.targetLevel, days: Math.max(0, studying.endDay - s.day) })}</div> : null}
      </div>
      <div className="lb" style={{ marginBottom: 6 }}><b>{t('id.langTitle')}</b><span className="sub">{t('id.langHint')}</span></div>
      {LANGUAGES.map((lang) => {
        const cur = s.langs?.[lang] ?? 0;
        const target = cur + 1;
        const cost = cur < 5 ? langCost(cur, target) : 0;
        const days = cur < 5 ? langDays(target) : 0;
        const busy = !!studying;
        return <Row key={lang} art="t-cap" right={<Btn ic="ic-check" label={cur >= 5 ? t('id.fluent') : t('id.studyBtn', '', { target, cost: fmt(cost), days })} disabled={cur >= 5 || busy || !canLearnLang(s, lang)} onClick={() => act(st => { startLangStudy(st, lang); })} />}>
          <b>{lang}</b><span className="sub">Level {cur}/5{cur >= 4 ? ' ' + t('id.langEligible') : ''}</span>
        </Row>;
      })}
      <div className="lb" style={{ marginTop: 14, marginBottom: 6 }}><b>{t('id.title')}</b><span className="sub">{t('id.require')}</span></div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('id.choose')}</span></div>
        <select className="qty" style={{ width: '100%', marginTop: 6 }} value={nation} onChange={e => setNation(e.target.value)}>
          {NATIONS.map(n => <option key={n} value={n}>{displayNation(n)}</option>)}
        </select>
        {(() => {
          const reqLangs = NATION_LANGUAGES[nation] ?? [];
          const res = s.residency?.[nation] ?? 0;
          const check = canApplyCitizenship(s, nation);
          const trips = Math.floor(res / 7);
          const travelCost = 2000 + trips * 500;
          return (<>
            <div className="lb" style={{ marginTop: 8 }}><span>{t('id.reqLang')}</span><b>{reqLangs.map(l => `${l} Lv ${s.langs?.[l] ?? 0}`).join(' / ')}</b></div>
            <div className="lb"><span>{t('id.residency')}</span><b>{t('id.resDays', '', { res })}</b></div>
            <div className="lb"><span>{t('id.condition')}</span><b>{check.ok ? t('id.eligible') : check.reason}</b></div>
            <div className="trade" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Btn ic="ic-plane" label={t('id.travel', '', { nation: displayNation(nation), cost: fmt(travelCost) })} disabled={(s.travelLastDay > 0 && s.lastDay - s.travelLastDay < 14) || s.money < travelCost} onClick={() => act(st => { travelToNation(st, nation); })} />
              <Btn ic="ic-crown" label={t('id.apply')} disabled={!check.ok} onClick={() => act(st => { applyCitizenship(st, nation); })} />
            </div>
          </>);
        })()}
      </div>
    </>
  );
}
