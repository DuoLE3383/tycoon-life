'use client';

import { CHECKUP_CD, CHECKUP_COST, decayPerYear, DIET_COST, doWell, effWellCd, fmt, type GameState, GYM_CD, GYM_COST, healthMult, healthState, healthWarnings, toggleDiet, TREAT_CD, TREAT_COST, useT, wellLeft, wellReady } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= HEALTH =================
export function HealthTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const hp = Math.round(s.health), stIdx = healthState(s.health);
  const rows: { id: string; art: string; name: string; cost: number; cd: number; gain: number; free?: boolean }[] = [
    // v11.40 — free options first (rest + self-train), then paid gym/checkup/treat,
    // then timed recovery (7-day + 30-day). Free options cost $0 so low-cash
    // players can still recover health.
    { id: 'rest', art: 'w-lotus', name: t('hp.rest', 'Rest'), cost: 0, cd: 1, gain: 3, free: true },
    { id: 'selftrain', art: 'w-gym', name: t('hp.selftrain', 'Self-train'), cost: 0, cd: 1, gain: 4, free: true },
    { id: 'gym', art: 'w-gym', name: t('workout'), cost: GYM_COST, cd: GYM_CD, gain: 6 },
    { id: 'checkup', art: 'w-doc', name: t('checkup'), cost: CHECKUP_COST, cd: CHECKUP_CD, gain: 15 },
    { id: 'treat', art: 'w-treat', name: t('treat'), cost: TREAT_COST, cd: TREAT_CD, gain: 45 },
    { id: 'rest7', art: 'w-lotus', name: t('hp.rest7', '7-day rest cure'), cost: 0, cd: 7, gain: 20, free: true },
    { id: 'rest30', art: 'w-lotus', name: t('hp.rest30', '30-day sabbatical'), cost: 0, cd: 30, gain: 50, free: true },
  ];
  return (
    <>
      <HealthAlerts s={s} />
      <div className="card" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: '1.05rem' }}>{t('healthTitle')}</b>
        <p className="sub" style={{ marginTop: 4 }}>{t('healthSub')}</p>
        <div className="famewrap"><span className="mini">{t('health')}</span><div className="famebar"><i style={{ width: hp + '%', background: hp < 40 ? 'var(--brick)' : 'var(--sage)' }} /></div><b>{hp}</b></div>
        <div className="mini">{t('hp.state.' + stIdx)} · {t('hp.decay', '', { n: decayPerYear(s).toLocaleString('vi-VN') })}</div>
      </div>
      {rows.map(r => {
        const left = wellLeft(s, r.id), ready = wellReady(s, r.id), ecd = effWellCd(s, r.id);
        return <Row key={r.id} art={r.art} right={<Btn ic="ic-plus" dp={{ 'data-well': r.id }}
          label={!ready && left > 0 ? t('gig.cooldown', '', { n: left }) : r.free ? `${r.name} · FREE` : `${r.name} · ${fmt(r.cost)}`}
          kind={r.free ? 'sageb' : ''}
          disabled={!ready} onClick={() => act(st => doWell(st, r.id, t))} />}>
          <b>{r.name}{r.free && <span className="tag" style={{ marginLeft: 6, background: 'var(--sage)', color: '#fff' }}>FREE</span>}</b>
          <span className="sub">
            +{r.gain} {t('health').toLowerCase()} · {t('gig.cooldown', '', { n: ecd })}
            {r.id === 'checkup' && ecd !== CHECKUP_CD ? ' ⚡' : ''}
          </span>
        </Row>;
      })}
      <p className="sub">{t('hp.checkupDyn')}</p>
      <p className="sub">{t('hp.treatInfo')}</p>
      <Row art="w-diet" right={<Btn ic={s.diet ? 'ic-check' : 'ic-plus'} label={s.diet ? 'ON' : 'OFF'} kind="ghost" onClick={() => act(st => toggleDiet(st, t))} />}>
        <b>{t('diet')}: {s.diet ? 'ON' : 'OFF'}</b>
        <span className="sub">{t('hp.dietInfo', '', { x: DIET_COST })}</span>
      </Row>
      <p className="sub">{t('hp.affect', '', { x: healthMult(s).toFixed(2) })}</p>
    </>
  );
}



export function HealthAlerts({ s }: { s: GameState }) {
  const { t } = useT();
  const warnings = healthWarnings(s);
  if (!warnings.length) return null;
  return (
    <div className="card" role="status" style={{ marginBottom: 10, borderColor: s.health < 40 ? 'var(--brick)' : 'var(--gold)' }}>
      <b>{t('hp.adviceTitle')}</b>
      {warnings.map(warning => <p key={warning} className="sub" style={{ margin: '5px 0 0' }}>• {t('hp.advice.' + warning)}</p>)}
    </div>
  );
}
