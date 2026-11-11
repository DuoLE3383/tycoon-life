'use client';

import { actCourtRecognition, actDeclareAutonomy, actDeclareIndependence, type Constitution, constitutionById, CONSTITUTIONS, ENTITY_TIERS, entityTierOf, fmt, type GameState, Ic, type Lang, netWorth, nextEntityTier, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= EMPIRE (v11.5) =================
// Entity tab: shows the player's current entity tier (conglomerate →
// autonomous → nation → empire → federation), thresholds for each,
// and the actions to step up (declare autonomy, court recognition,
// declare independence). Empires/federations are stubbed — v11.7 will
// wire star-system control + galactic geography.
export function EntityTab({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  const tier = entityTierOf(s);
  const tierIdx = ENTITY_TIERS.findIndex(r => r.tier === tier);
  const next = nextEntityTier(s);
  const nw = netWorth(s);
  const inf = s.power?.influence || 0;
  const [pickedConst, setPickedConst] = useState<Constitution>('democratic');
  const [currency, setCurrency] = useState<string>('');
  const tierLabel = (l: Lang, idx: number) => {
    const r = ENTITY_TIERS[idx];
    return l === 'vi' ? r.label.vi : l === 'zh' ? r.label.zh : r.label.en;
  };
  // v11.18 — explanation key for each entity tier.
  const entityExplainKey: Record<string, string> = {
    'none': 'emp.explainConglomerate',
    'conglomerate': 'emp.explainConglomerate',
    'autonomous': 'emp.explainAutonomous',
    'nation': 'emp.explainNation',
    'empire': 'emp.explainEmpire',
    'federation': 'emp.explainFederation',
  };
  return (<>
    {/* Current tier + next-threshold hint */}
    <Row art="b-corp">
      <b>{t('v11.entityCurrentTier')} <span className={tier === 'none' ? 'down' : 'up'}>{tierLabel(lang, tierIdx)}</span></b>
      <span className="sub">
        {t('v11.entityNetWorth', '', { v: fmt(nw) })} · {t('v11.entityInfluence', '', { x: inf })}
      </span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {next
          ? t('v11.entityNextTier', '', { tier: next.tier, v: fmt(next.min), x: next.minInfluence })
          : t('v11.entityTopTier')}
      </span>
      {/* v11.23 — explanation: bullet list with icons (was dense prose) */}
      <div className="mini" style={{ display: 'block', marginTop: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
        <b style={{ opacity: .85, fontSize: '.78rem' }}>{t('emp.explainTitle')}</b>
        <ul className="explain-bullets">
          {t((entityExplainKey[tier] || 'emp.explainConglomerate') + '.bullets').split('||').map((b, i) => (
            <li key={i}><Ic id={i === 0 ? 'ic-check' : i === 1 ? 'ic-xp' : 'ic-star'} className="si bul-ic" /><span>{b}</span></li>
          ))}
        </ul>
      </div>
      {s.entity?.originNation && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.entityOrigin', '', { nation: s.entity.originNation })}
        </span>
      )}
      {s.entity?.currency && s.entity.currency !== 'USD' && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.entityCurrency', '', { c: s.entity.currency, i: ((s.entity.inflation || 0) * 100).toFixed(1) })}
        </span>
      )}
    </Row>

    {/* v11.41 — "What to do" guidance card. Explains the current tier, what
        the player needs to step up, and WHY each threshold matters. Replaces
        the confusing cup icon + opaque ladder with clear actionable text. */}
    <div className="card" style={{ marginBottom: 10, padding: 12, background: 'rgba(176,138,62,.06)', border: '1px solid var(--accent)' }}>
      <b style={{ fontSize: '.95rem' }}>🎯 {t('empire.guide', 'Your path to empire')}</b>
      <p className="sub" style={{ marginTop: 6 }}>
        {tier === 'none' && t('empire.guide.none', 'You are a private citizen. Grow your net worth to $1M to become a Conglomerate — the first step on the empire ladder. Buy businesses, invest in stocks, and build wealth.')}
        {tier === 'conglomerate' && t('empire.guide.conglomerate', 'You run a conglomerate. To step up to Autonomous Territory: reach $75M net worth + 60 influence (via advocacy actions in the Power tab). Then declare autonomy.')}
        {tier === 'autonomous' && t('empire.guide.autonomous', 'You govern an autonomous territory. To become a Nation: court recognition from ≥3 other nations (30 influence each), then declare independence. Pick a constitution first.')}
        {tier === 'nation' && t('empire.guide.nation', 'You founded a sovereign nation. To reach Interstellar Empire: $7.5B net worth + 550 influence + control 5 star systems (Cosmic tab unlocks here). Run elections to grow influence.')}
        {tier === 'empire' && t('empire.guide.empire', 'Your interstellar empire spans ≥5 star systems. To form a Galactic Federation: $50B net worth + 2000 influence + unify 50% of known space. The Cosmic tab is now unlocked.')}
        {tier === 'federation' && t('empire.guide.federation', 'You lead a Galactic Federation — the highest tier. You have unified ≥50% of known space. This is the endgame.')}
      </p>
      {next && (
        <p className="mini" style={{ marginTop: 8, color: 'var(--accent)' }}>
          {t('empire.next', 'Next tier')}: {tierLabel(lang, tierIdx + 1)} —
          {nw < next.min && ` ${t('netWorth')}: ${fmt(nw)}/${fmt(next.min)} ·`}
          {inf < next.minInfluence && ` ${t('v11.tier')} inf: ${inf}/${next.minInfluence}`}
          {nw >= next.min && inf >= next.minInfluence && ` ✅ ${t('empire.ready', 'Ready to step up!')}`}
        </p>
      )}
    </div>

    {/* Entity tiers ladder */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.entityLadderTitle')}</h3>
    {ENTITY_TIERS.map((r, i) => {
      const reached = i <= tierIdx;
      const labelLang = (l: Lang): string => l === 'vi' ? r.label.vi : l === 'zh' ? r.label.zh : r.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? r.desc.vi : l === 'zh' ? r.desc.zh : r.desc.en;
      return <Row key={r.tier} art={reached ? 'b-corp' : 'ic-x'}
        right={<span className={reached ? 'up' : 'down'}>{reached ? '✓' : '—'}</span>}>
        <b>{labelLang(lang)} <span className="mini">({fmt(r.minNetWorth)} · {t('v11.tier')} inf {r.minInfluence}{r.extra ? ` · ${r.extra}` : ''})</span></b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* Declare autonomy — only available at conglomerate tier */}
    {tier === 'conglomerate' && (
      <Row art="b-corp"
        right={<button className="tbuy" disabled={nw < 50_000_000 || inf < 50}
          onClick={() => act(g => {
            const r = actDeclareAutonomy(g);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'noNetWorth' ? t('v11.entityNeedNetWorth', '', { v: fmt(50_000_000) })
              : r.reason || 'failed';
            return t('v11.entityAutonomyDone');
          })}>{t('v11.entityDeclareAutonomy')}</button>}>
        <b>{t('v11.entityDeclareAutonomy')}</b>
        <span className="sub">{t('v11.entityAutonomyBlurb', '', { v: fmt(50_000_000), x: 50 })}</span>
      </Row>
    )}

    {/* Court recognition — only at autonomous tier, costs 30 influence */}
    {tier === 'autonomous' && (
      <Row art="s-coin"
        right={<button className="tbuy" disabled={inf < 30 || (s.entity?.recognition || 0) >= 12}
          onClick={() => act(g => {
            const r = actCourtRecognition(g);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'maxRecognition' ? t('v11.entityMaxRecognition')
              : r.reason || 'failed';
            return t('v11.entityRecognitionDone', '', { x: s.entity?.recognition || 0 });
          })}>{t('v11.entityCourtRecognition')}</button>}>
        <b>{t('v11.entityCourtRecognition')} <span className="mini">({t('v11.entityRecognitionProgress', '', { cur: s.entity?.recognition || 0, need: 3 })})</span></b>
        <span className="sub">{t('v11.entityRecognitionBlurb', '', { x: 30 })}</span>
      </Row>
    )}

    {/* Declare independence — only at autonomous tier with ≥3 recognition */}
    {tier === 'autonomous' && (
      <>
        <h3 style={{ margin: '12px 0 4px' }}>{t('v11.entityIndependenceTitle')}</h3>
        {/* Constitution picker */}
        {CONSTITUTIONS.map(c => {
          const labelLang = (l: Lang): string => l === 'vi' ? c.label.vi : l === 'zh' ? c.label.zh : c.label.en;
          const descLang = (l: Lang): string => l === 'vi' ? c.desc.vi : l === 'zh' ? c.desc.zh : c.desc.en;
          const picked = pickedConst === c.id;
          return <Row key={c.id} art="b-corp"
            right={<input type="radio" checked={picked} onChange={() => setPickedConst(c.id)} aria-label={c.id} />}>
            <b>{labelLang(lang)} <span className="mini">biz ×{c.bizMult.toFixed(2)} · tax {(c.taxRate * 100).toFixed(0)}% · upkeep ×{c.militaryUpkeepMult.toFixed(2)}</span></b>
            <span className="sub">{descLang(lang)}</span>
          </Row>;
        })}
        {/* Currency input */}
        <Row art="s-coin">
          <b>{t('v11.entityCurrencyLabel')}</b>
          <input className="qty" type="text" maxLength={3} value={currency} placeholder="NEW"
            onChange={e => setCurrency(e.target.value.toUpperCase().slice(0, 3))} aria-label="currency" />
          <span className="sub">{t('v11.entityCurrencyBlurb')}</span>
        </Row>
        {/* Declare button */}
        <Row art="b-corp"
          right={<button className="tbuy" disabled={inf < 200 || nw < 500_000_000 || (s.entity?.recognition || 0) < 3}
            onClick={() => act(g => {
              const r = actDeclareIndependence(g, pickedConst, currency || 'NEW');
              if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
                : r.reason === 'noNetWorth' ? t('v11.entityNeedNetWorth', '', { v: fmt(500_000_000) })
                : r.reason === 'noRecognition' ? t('v11.entityNeedRecognition')
                : r.reason || 'failed';
              return t('v11.entityIndependenceDone', '', { c: currency || 'NEW' });
            })}>{t('v11.entityDeclareIndependence')}</button>}>
          <b>{t('v11.entityDeclareIndependence')}</b>
          <span className="sub">{t('v11.entityIndependenceBlurb', '', { v: fmt(500_000_000), x: 200, rec: 3 })}</span>
        </Row>
      </>
    )}

    {/* Constitution display (only at nation+ tier) */}
    {(tier === 'nation' || tier === 'empire' || tier === 'federation') && s.entity?.constitution && (
      <Row art="b-corp">
        <b>{t('v11.entityConstitutionActive')} <span className="up">
          {(() => {
            const c = constitutionById(s.entity.constitution!);
            return lang === 'vi' ? c.label.vi : lang === 'zh' ? c.label.zh : c.label.en;
          })()}
        </span></b>
        <span className="sub">
          {(() => {
            const c = constitutionById(s.entity.constitution!);
            return lang === 'vi' ? c.desc.vi : lang === 'zh' ? c.desc.zh : c.desc.en;
          })()}
        </span>
      </Row>
    )}

    {/* v11.5 stub: empire + federation tiers gated behind v11.7 */}
    {(tier === 'nation') && (
      <p className="sub">{t('v11.entityStubEmpire')}</p>
    )}
    {(tier === 'empire' || tier === 'federation') && (
      <p className="sub">{t('v11.entityStubGalaxy')}</p>
    )}
  </>);
}
