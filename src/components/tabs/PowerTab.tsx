'use client';

import { ADVOCACY_ACTIONS, BOTS, breakWith, doAdvocacy, doTransparency, electionParamsFor, fmt, type GameState, Ic, INFLUENCE_SOURCE_LABELS, type Lang, netWorth, nextTierOf, offerAlliance, POWER_TIERS, powerTierOf, runElection, TRANSPARENCY_ACTIONS, useT, worldYear } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= POWER (v11.3) =================
// Power & influence tab. Shows the player's current power tier (driven
// by net worth), the influence resource + its sources, and the advocacy
// actions they can spend influence on. Tier unlocks at $10M / $100M /
// $1B / $10B; influence comes from charity, club chair, board seats,
// media ownership. Diminishing returns on influence gain so it's
// harder to climb past 1000.
export function PowerTab({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  const tier = powerTierOf(s);
  const tierIdx = POWER_TIERS.findIndex(r => r.tier === tier);
  const next = nextTierOf(s);
  const nw = netWorth(s);
  const tierLabel = (POWER_TIERS[tierIdx] || POWER_TIERS[0]);
  const showTier = (l: Lang) => l === 'vi' ? tierLabel.vi : l === 'zh' ? tierLabel.zh : tierLabel.en;
  const params = electionParamsFor(s.nation);
  const electionResult = s.power?.elections?.[s.nation];
  const canRunElection = tierIdx >= POWER_TIERS.findIndex(r => r.tier === 'national_power')
    && (s.power?.influence || 0) >= 80
    && (s.power?.scrutiny || 0) < 95
    && (!electionResult || electionResult.status !== 'won' || electionResult.termEnds <= s.lastDay);
  // Bot rows for alliances/rivals UI (runElection expects {name, nation, nw}[]).
  const botRows = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, ind, nw: v * Math.pow(1.12, Math.max(0, s.age - 18)) }));
  // v11.18 — pick the explanation key for the current tier.
  const tierExplainKey: Record<string, string> = {
    'none': 'pw.explainMogul',
    'industry_mogul': 'pw.explainMogul',
    'influencer': 'pw.explainInfluencer',
    'national_power': 'pw.explainNational',
    'state_leader': 'pw.explainState',
  };
  return (<>
    {/* v11.50 — top-level "What is Power?" intro card. New players land here
        confused about what Power even is; this gives them the elevator pitch
        + the 5 tiers + the 4 influence sources + the 3 things they can DO. */}
    <div className="card" style={{ marginBottom: 10, padding: 14, background: 'linear-gradient(180deg,rgba(202,138,4,.06) 0%,rgba(202,138,4,0) 60%)', border: '1px solid rgba(202,138,4,.25)' }}>
      <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)' }}>{t('pw.introTitle')}</div>
      <p className="sub" style={{ margin: '6px 0 8px' }}>{t('pw.introBody')}</p>
      <ul className="explain-bullets" style={{ margin: '0 0 8px', paddingLeft: 0, listStyle: 'none' }}>
        <li><Ic id="ic-heart" className="si bul-ic" /><span>{t('pw.source.charity')}</span></li>
        <li><Ic id="ic-crown" className="si bul-ic" /><span>{t('pw.source.clubChair')}</span></li>
        <li><Ic id="t-biz" className="si bul-ic" /><span>{t('pw.source.board')}</span></li>
        <li><Ic id="t-social" className="si bul-ic" /><span>{t('pw.source.media')}</span></li>
      </ul>
      <div className="mini" style={{ marginTop: 8, marginBottom: 4, fontWeight: 650 }}>{t('pw.tiersLabel')}</div>
      <div className="sub" style={{ fontSize: '.78rem', lineHeight: 1.5 }}>{t('pw.tierList')}</div>
      <div className="mini" style={{ marginTop: 10, marginBottom: 4, fontWeight: 650 }}>{t('pw.whatYouCanDo')}</div>
      <ul className="explain-bullets" style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
        <li><Ic id="ic-check" className="si bul-ic" /><span>{t('pw.do.advocacy')}</span></li>
        <li><Ic id="ic-check" className="si bul-ic" /><span>{t('pw.do.transparency')}</span></li>
        <li><Ic id="ic-crown" className="si bul-ic" /><span>{t('pw.do.election')}</span></li>
      </ul>
      <p className="mini" style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(202,138,4,.08)', borderRadius: 8, color: 'var(--accent)', fontWeight: 600 }}>💡 {t('pw.introTip')}</p>
    </div>
    {/* Current tier + next-threshold hint */}
    <Row art="t-power">
      <b>{t('v11.powerCurrentTier')} <span className={tier === 'none' ? 'down' : 'up'}>{showTier(lang)}</span></b>
      <span className="sub">{t('v11.powerNetWorth', '', { v: fmt(nw) })}</span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {next
          ? t('v11.powerNextTier', '', { tier: next.label, v: fmt(next.min) })
          : t('v11.powerTopTier')}
      </span>
      {/* v11.23 — explanation: bullet list with icons (was dense prose) */}
      <div className="mini" style={{ display: 'block', marginTop: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
        <b style={{ opacity: .85, fontSize: '.78rem' }}>{t('pw.explainTitle')}</b>
        <ul className="explain-bullets">
          {t((tierExplainKey[tier] || 'pw.explainMogul') + '.bullets').split('||').map((b, i) => (
            <li key={i}><Ic id={i === 0 ? 'ic-check' : i === 1 ? 'ic-xp' : 'ic-x'} className="si bul-ic" /><span>{b}</span></li>
          ))}
        </ul>
      </div>
      <span className="mini" style={{ display: 'block', marginTop: 4, opacity: .65 }}>{t('pw.hardening')}</span>
    </Row>

    {/* Influence resource + sources */}
    <Row art="s-coin">
      {/* v12.1 — Influence number made prominent (large accent-colored metric)
          with a clear "Influence points:" label, so the bare number is no
          longer ambiguous. The detailed explanation lives below the blurb. */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <span className="mini" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('pw.influencePointsLabel')}</span>
        <b className="up" style={{
          fontSize: '2rem', fontWeight: 800, lineHeight: 1,
          color: 'var(--accent)',
          fontVariantNumeric: 'tabular-nums',
        }}>{s.power?.influence || 0}</b>
      </div>
      <span className="sub">{t('v11.influenceBlurb')}</span>
      {/* v12.1 — explicit explanation of what influence IS + how to gain it.
          Addressed the "tiêu 40 là tiêu cái gì" confusion. */}
      <span className="mini" style={{ display: 'block', marginTop: 6, padding: '8px 10px', border: '1px solid rgba(202,138,4,.3)', borderRadius: 8, background: 'rgba(202,138,4,.06)', color: 'var(--ink)', opacity: .92 }}>
        💡 {t('pw.influenceExplain')}
      </span>
      <span className="mini" style={{ display: 'block', marginTop: 6 }}>
        {t('v11.influenceSources')}:{' '}
        {(s.power?.influenceLog || []).slice(-5).reverse().map(e => {
          const src = INFLUENCE_SOURCE_LABELS[e.source as keyof typeof INFLUENCE_SOURCE_LABELS];
          const label = src ? (lang === 'vi' ? src.vi : lang === 'zh' ? src.zh : src.en) : e.source;
          return `${label} +${e.amount}`;
        }).join(' · ') || t('v11.noSourcesYet')}
      </span>
      {s.power?.foundationMult && (
        <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--green)' }}>
          {t('v11.foundationActive', '', { x: ((s.power.foundationMult - 1) * 100).toFixed(0) })}
        </span>
      )}
      {s.power?.boardNomineeBiz && (
        <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--green)' }}>
          {t('v11.boardNomineeActive', '', { x: ((s.power.boardNomineeBiz - 1) * 100).toFixed(0) })}
        </span>
      )}
    </Row>

    {/* v11.4 — Scrutiny meter */}
    <Row art="s-tech">
      {/* v12.1 — Scrutiny number also made prominent with a clear label and
          accent colour (red ≥80, amber ≥50, sage otherwise). The /100 suffix
          and short explanation tell the player exactly what the metric means. */}
      {(() => {
        const sc = s.power?.scrutiny || 0;
        const scColor = sc >= 80 ? 'var(--brick)' : sc >= 50 ? 'var(--amber, #c47b2c)' : 'var(--sage)';
        return (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span className="mini" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('pw.scrutinyPointsLabel')}</span>
            <b style={{
              fontSize: '2rem', fontWeight: 800, lineHeight: 1,
              color: scColor,
              fontVariantNumeric: 'tabular-nums',
            }}>{sc}<span style={{ fontSize: '1rem', opacity: .6 }}> / 100</span></b>
          </div>
        );
      })()}
      <span className="sub">{t('v11.scrutinyBlurb')}</span>
      <span className="mini" style={{ display: 'block', marginTop: 4 }}>
        {t('v11.transparencyLabel')}: {s.power?.transparency || 0}/100
        {((s.power?.scrutiny || 0) >= 80) && <span className="down"> · {t('v11.scrutinyHigh')}</span>}
      </span>
      {/* v11.18 — scrutiny explanation (kept; the prominent number above is
          now the headline, this is the supporting detail). */}
      <span className="mini" style={{ display: 'block', marginTop: 6, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)', opacity: .85 }}>
        {t('pw.scrutinyExplain')}
      </span>
    </Row>
    {/* v11.4 — Transparency actions */}
    {TRANSPARENCY_ACTIONS.map(a => {
      const labelLang = (l: Lang): string => l === 'vi' ? a.label.vi : l === 'zh' ? a.label.zh : a.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? a.desc.vi : l === 'zh' ? a.desc.zh : a.desc.en;
      return <Row key={a.id} art="s-tech"
        right={<button className="tbuy" disabled={a.cost > 0 && (s.power?.influence || 0) < a.cost}
          onClick={() => act(g => {
            const r = doTransparency(g, a.id);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : r.reason || 'failed';
            return t('v11.transparencyDone', '', { action: labelLang(lang) });
          })}>{a.cost > 0 ? t('v11.advocacyBtn', '', { x: a.cost }) : t('v11.transparencyAcceptRiskBtn')}</button>}>
        <b>{labelLang(lang)}</b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* Advocacy actions — spend influence here */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.advocacyTitle')}</h3>
    {ADVOCACY_ACTIONS.map(a => {
      const reqIdx = POWER_TIERS.findIndex(r => r.tier === a.minTier);
      const locked = tierIdx < reqIdx;
      const notEnough = (s.power?.influence || 0) < a.cost;
      const labelLang = (l: Lang): string => l === 'vi' ? a.label.vi : l === 'zh' ? a.label.zh : a.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? a.desc.vi : l === 'zh' ? a.desc.zh : a.desc.en;
      return <Row key={a.id} art="s-tech"
        right={<button className="tbuy" disabled={locked || notEnough}
          onClick={() => act(g => {
            const r = doAdvocacy(g, a.id, worldYear(g));
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'wrongTier' ? t('v11.advocacyNeedTier')
              : r.reason || 'failed';
            return t('v11.advocacyDone', '', { action: labelLang(lang) });
          })}>{t('v11.advocacyBtn', '', { x: a.cost })}</button>}>
        <b>{labelLang(lang)} <span className="mini">{locked ? `(${t('v11.tier')} ${POWER_TIERS[reqIdx].label})` : ''}</span></b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* v11.4 — Election panel */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.electionTitle')}</h3>
    <Row art="t-rank">
      <b>{t('v11.electionInNation', '', { nation: s.nation })}</b>
      <span className="sub">
        {params ? `opponent strength ${params.opponentStrength} · randomness ±${params.randomness}% · term ${params.termLength}yr` : ''}
      </span>
      {electionResult && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.electionLastResult', '', {
            status: electionResult.status,
            year: electionResult.year,
            opp: electionResult.opponent,
            margin: electionResult.margin.toFixed(1),
          })}
        </span>
      )}
      <div className="trade" style={{ marginTop: 4 }}>
        <button className="tbuy" disabled={!canRunElection}
          onClick={() => act(g => {
            const r = runElection(g, undefined, botRows, worldYear(g));
            if (!r.ok) {
              return r.reason === 'wrongTier' ? t('v11.electionNeedTier')
                : r.reason === 'termActive' ? t('v11.electionTermActive')
                : r.reason === 'scrutinyTooHigh' ? t('v11.electionScrutinyHigh')
                : r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
                : r.reason || 'failed';
            }
            return r.result === 'won'
              ? t('v11.electionWon', '', { opp: r.opponent || '?', margin: (r.margin || 0).toFixed(1) })
              : t('v11.electionLost', '', { opp: r.opponent || '?', margin: Math.abs(r.margin || 0).toFixed(1) });
          })}>{t('v11.electionRun', '', { x: 80 })}</button>
      </div>
    </Row>

    {/* v11.4 — Alliances & Rivals */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.alliancesRivalsTitle')}</h3>
    {botRows.slice(0, 6).map(b => {
      const ally = s.power?.alliances?.find(a => a.bot === b.name);
      const rival = s.power?.rivals?.find(r => r.bot === b.name);
      return <Row key={b.name} art="j-mgr"
        right={<div className="trade">
          <button className="tbuy" disabled={(s.power?.influence || 0) < 20}
            onClick={() => act(g => {
              const r = offerAlliance(g, b.name);
              if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : 'failed';
              return t('v11.allianceDone', '', { bot: b.name });
            })}>{ally ? `+${t('v11.refresh')}` : t('v11.ally')}</button>
          <button className="tsell" onClick={() => act(g => {
            const r = breakWith(g, b.name);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : 'failed';
            return t('v11.rivalDone', '', { bot: b.name });
          })}>{t('v11.break')}</button>
        </div>}>
        <b>{b.name} <span className="mini">{b.nation} · {b.ind}</span></b>
        <span className="sub">
          {ally && <span className="up">alliance {ally.strength}</span>}
          {rival && <span className="down"> · rival {rival.hostility}</span>}
          {!ally && !rival && <span>{t('v11.neutral')}</span>}
        </span>
      </Row>;
    })}
  </>);
}
