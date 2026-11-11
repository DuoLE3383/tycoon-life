'use client';

import { acceptBizOffer, BIZ, bizBrandOf, bizCost, bizCosts, bizMarketShare, bizMultiplier, bizNet, type BizOffer, bizRevenue, BOTS, branchCount, branchNet, buyFacLine, buyFarmLine, capitalPathCost, FAC_LINES, facIncome, FARM_LINES, farmIncome, fmt, franchiseBranch, type GameState, investBizRnd, MANAGER_MONTHLY, meets, negotiateBizSell, openBranch, openBranchCapital, pushBizOffer, REG_MULT, useState, useT, worldYear } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';
import { BrandEditorModal } from '@/components/modals/BrandEditorModal';



// ================= BUSINESS =================
export function BizTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  const mult = bizMultiplier(s);
  // v11.20 — P&L summary (annualised).
  const revenue = bizRevenue(s);
  const costs = bizCosts(s);
  const net = bizNet(s);
  const share = bizMarketShare(s);
  const hasBranches = BIZ.some(b => branchCount(s, b.id) > 0);
  // v12.1 — per-business revenue breakdown (matches bizRevenue's formula):
  //   per branch: b.inc * REG_MULT[br.r % REG_MULT.length] * br.mood
  // plus farm/fac line income as separate contributors. Used to surface
  // which chain actually drives the player's revenue.
  const perBizRows = BIZ.map(b => {
    const branches = s.branches[b.id] || [];
    const rev = branches.reduce((acc, br) => acc + b.inc * REG_MULT[br.r % REG_MULT.length] * br.mood, 0);
    return { id: b.id, name: bizBrandOf(s, b.id).name, ind: b.ind, n: branches.length, rev };
  }).filter(r => r.rev > 0);
  const farmRev = farmIncome(s);
  const facRev = facIncome(s);
  if (farmRev > 0) perBizRows.push({ id: 'farm', name: t('biz.perBizFarm', 'Farm lines'), ind: t('biz.perBizOther', 'Other'), n: FARM_LINES.filter(l => s.farm[l.id]).length, rev: farmRev });
  if (facRev > 0) perBizRows.push({ id: 'fac', name: t('biz.perBizFac', 'Factory lines'), ind: t('biz.perBizOther', 'Other'), n: FAC_LINES.filter(l => s.fac[l.id]).length, rev: facRev });
  const perBizTotal = perBizRows.reduce((a, r) => a + r.rev, 0) || 1;
  // v12.1 — market share vs NPC competitors (BOTS). Each bot's branch count
  // is estimated from its net worth: floor(NW / 500_000), clamped to [1, 20].
  // National share = playerBranches / (playerBranches + sameNationBots).
  // International share = playerBranches / (playerBranches + allBots).
  const playerBranches = BIZ.reduce((n, b) => n + branchCount(s, b.id), 0);
  const botBranches = (nw: number) => Math.max(1, Math.min(20, Math.round(nw / 500_000)));
  const npcSameNationBranches = BOTS.reduce((sum, [, , nat, , v]) => sum + (nat === s.nation ? botBranches(v) : 0), 0);
  const npcAllBranches = BOTS.reduce((sum, [, , , , v]) => sum + botBranches(v), 0);
  const nationalShare = playerBranches / Math.max(1, playerBranches + npcSameNationBranches);
  const intlShare = playerBranches / Math.max(1, playerBranches + npcAllBranches);
  // v11.50 — Esc-to-close for the bizOffer sell-negotiation modal.
  const [bizOffer, setBizOffer] = useState<BizOffer | null>(null);
  useEscapeKey(() => setBizOffer(null), !!bizOffer);
  const closeBizOffer = () => setBizOffer(null);
  // v11.50 — brand customization modal state (per-biz). Null = closed.
  const [editingBrand, setEditingBrand] = useState<{ bizId: string; name: string; logo: string } | null>(null);
  useEscapeKey(() => setEditingBrand(null), !!editingBrand);
  const closeBrandEditor = () => setEditingBrand(null);
  // v11.20 — R&D investment state. Local input for the amount; the actual
  // investment runs through investBizRnd() in the engine.
  const [rndAmount, setRndAmount] = useState(50000);
  const rndActive = s.bizRnd && s.day <= s.bizRnd.untilDay ? s.bizRnd : null;
  const rndLeftDays = rndActive ? Math.max(0, Math.round(rndActive.untilDay - s.day)) : 0;
  const rndPct = rndActive ? Math.round((rndActive.boostMult - 1) * 100) : 0;
  return (
    <>
      {/* v11.20 — P&L summary card (annualised). Shows revenue, costs, net,
          market share, and the R&D investment panel. Previously the player
          only saw per-branch chips; now they get a top-level financial view. */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('biz.pnlTitle')}</div>
        {!hasBranches ? (
          <p className="sub" style={{ margin: '4px 0 0' }}>{t('biz.noBranches')}</p>
        ) : (
          <>
            <div className="lb"><span>{t('biz.revenue')}</span><b className="up">{fmt(revenue)}</b></div>
            <div className="lb"><span>{t('biz.costs')}</span><b className="down">−{fmt(costs)}</b></div>
            <div className="lb"><span>{t('biz.net')}</span><b className={net >= 0 ? 'up' : 'down'}>{net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}</b></div>
            <div className="lb"><span>{t('biz.marketShareLocal')}</span><b>{t('biz.marketShareVal', '', { n: (share * 100).toFixed(1) })}</b></div>

            {/* v12.1 — per-business revenue breakdown. Each row shows the
                business name, its branch count, its annual revenue
                contribution, and a horizontal bar proportional to its share
                of the player's total revenue. Surfaces which chain actually
                drives the top line. */}
            {perBizRows.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>
                  {t('biz.perBizRevenue')}
                </div>
                {perBizRows
                  .slice()
                  .sort((a, b) => b.rev - a.rev)
                  .map(r => {
                    const pct = (r.rev / perBizTotal) * 100;
                    return (
                      <div key={r.id} style={{ marginBottom: 5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '.78rem' }}>
                          <span><b>{r.name}</b> <span className="mini" style={{ opacity: .65 }}>· {r.ind} · {r.n}× · {pct.toFixed(0)}%</span></span>
                          <b className="up" style={{ fontVariantNumeric: 'tabular-nums' }}>+{fmt(r.rev)}</b>
                        </div>
                        <div style={{ height: 6, borderRadius: 999, background: 'var(--paper2)', overflow: 'hidden', marginTop: 3 }}>
                          <div style={{ width: pct + '%', height: '100%', background: 'linear-gradient(90deg,var(--accent),#a4916f)', borderRadius: 999, transition: 'width .4s ease' }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* v12.1 — National + International market share vs NPC rivals.
                National share compares the player's total branch count vs
                NPC competitors (BOTS) in the same nation. International
                share compares vs all NPCs globally. Each bot's branch count
                is estimated from net worth (NW/500k, capped 1..20). */}
            <div style={{ marginTop: 10 }}>
              <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 4 }}>
                {t('biz.shareVsRivals')}
              </div>
              {/* National market share */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '.78rem' }}>
                  <span><b>{t('biz.nationalShare')}</b> <span className="mini" style={{ opacity: .65 }}>· {s.nation}</span></span>
                  <b style={{ fontVariantNumeric: 'tabular-nums' }}>{(nationalShare * 100).toFixed(1)}%</b>
                </div>
                <div style={{ height: 9, borderRadius: 999, background: 'var(--paper2)', overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: (nationalShare * 100) + '%', height: '100%', background: 'var(--sage)', borderRadius: 999, transition: 'width .4s ease' }} />
                </div>
                <div className="mini" style={{ opacity: .65, marginTop: 2 }}>
                  {t('biz.shareVsDetail', '', { you: playerBranches, them: npcSameNationBranches })}
                </div>
              </div>
              {/* International market share */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, fontSize: '.78rem' }}>
                  <span><b>{t('biz.intlShare')}</b> <span className="mini" style={{ opacity: .65 }}>· {t('biz.intlScope', 'global')}</span></span>
                  <b style={{ fontVariantNumeric: 'tabular-nums' }}>{(intlShare * 100).toFixed(1)}%</b>
                </div>
                <div style={{ height: 9, borderRadius: 999, background: 'var(--paper2)', overflow: 'hidden', marginTop: 4 }}>
                  <div style={{ width: (intlShare * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 999, transition: 'width .4s ease' }} />
                </div>
                <div className="mini" style={{ opacity: .65, marginTop: 2 }}>
                  {t('biz.shareVsDetail', '', { you: playerBranches, them: npcAllBranches })}
                </div>
              </div>
            </div>
          </>
        )}
        {/* R&D investment panel */}
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('biz.rndTitle')}</div>
        <p className="sub" style={{ margin: '4px 0 0' }}>{t('biz.rndBlurb')}</p>
        {rndActive && (
          <div className="mini" style={{ marginTop: 4, padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)', color: 'var(--sage)' }}>
            {t('biz.rndActive', '', { n: rndPct, d: Math.round(rndActive.untilDay), left: rndLeftDays })}
          </div>
        )}
        <div className="trade" style={{ marginTop: 6, gap: 8, alignItems: 'flex-end' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('biz.rndAmount')}</span>
            <input type="number" min={50000} step={10000} value={rndAmount}
              onChange={e => setRndAmount(Math.max(50000, +e.target.value || 50000))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <button className="tbuy" disabled={s.money < rndAmount || rndAmount < 50000}
            onClick={() => act(st => {
              if (rndAmount < 50000) return t('biz.rndErrMin');
              if (st.money < rndAmount) return t('biz.rndErrCash');
              const r = investBizRnd(st, rndAmount);
              if (!r) return t('biz.rndErrCash');
              return t('biz.rndResult', '', { amt: fmt(rndAmount), n: r.pct.toFixed(1) });
            })}>{t('biz.rndInvest')}</button>
        </div>
      </div>
      {/* v11 — two-path explainer */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.twoPaths')}</div>
        <p className="sub" style={{ margin: '4px 0 0' }}>{t('v11.twoPathsNote')}</p>
      </div>
      {/* v12.3 — degree requirement explanation card (user: "bằng cấp là sao??") */}
      <div className="card" style={{ marginBottom: 10, padding: 10, background: 'rgba(127,127,127,.04)', border: '1px dashed var(--line)' }}>
        <div className="mini" style={{ fontWeight: 700, opacity: .8 }}>🎓 {t('biz.degreeTitle', 'Degree requirements')}</div>
        <p className="sub" style={{ margin: '4px 0 0', fontSize: '.78rem', lineHeight: 1.45 }}>{t('biz.degreeExplain')}</p>
      </div>
      {/* v11.50 — franchise explainer card (clear economics + when-to-use tip). */}
      <div className="card" style={{ marginBottom: 10, padding: 12, background: 'linear-gradient(180deg,rgba(125,148,132,.06) 0%,rgba(125,148,132,0) 60%)', border: '1px solid rgba(125,148,132,.3)' }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--sage)' }}>{t('biz.franchiseTitle')}</div>
        <p className="sub" style={{ margin: '6px 0 6px' }}>{t('biz.franchiseExplain')}</p>
        <div className="mini" style={{ padding: '6px 10px', background: 'rgba(0,0,0,.04)', borderRadius: 6, fontWeight: 600 }}>{t('biz.franchiseMath')}</div>
        <p className="mini" style={{ marginTop: 6, color: 'var(--accent)', fontWeight: 600 }}>💡 {t('biz.franchiseWhen')}</p>
      </div>
      {/* v11.50 — brand customization explainer */}
      {hasBranches && (
        <div className="card" style={{ marginBottom: 10, padding: 10 }}>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('biz.brandTitle')}</div>
          <p className="sub" style={{ margin: '4px 0 0' }}>{t('biz.brandNote')}</p>
        </div>
      )}
      {BIZ.map(b => {
        const n = branchCount(s, b.id), c = bizCost(s, b), ok = meets(s, b.req);
        const cap = capitalPathCost(s, b);
        const managerMo = MANAGER_MONTHLY(b.base);
        const closureChance = Math.max(1, Math.min(35, Math.round((0.04 + (s.eraBiz < 0.9 ? 0.08 : 0) + (n > 5 ? 0.01 * (n - 5) : 0)) * 100)));
        const brand = bizBrandOf(s, b.id);
        const hasBrand = !!s.brands?.[b.id];
        return <Row key={b.id} art={b.art} right={<div className="trade" style={{ flexWrap: 'wrap' }}>
          {/* Degree path */}
          <Btn ic={ok ? (n ? 'ic-up' : 'ic-plus') : 'ic-x'} label={t('v11.degreePath') + ': ' + fmt(c)} kind={ok ? '' : 'ghost'} disabled={!ok || s.money < c} onClick={() => act(st => openBranch(st, b.id))} />
          {/* Capital path */}
          <Btn ic="ic-coins" label={t('v11.capitalPath') + ': ' + fmt(cap)} kind="ghost" disabled={s.money < cap + cap * 0.2} onClick={() => act(st => openBranchCapital(st, b.id))} />
        </div>}>
          <b>{brand.logo ? <span style={{ marginRight: 4 }}>{brand.logo}</span> : null}{brand.name} <span className="tag">{b.ind}</span> <span className="tag">{n} {t('branches')}</span>{hasBrand && <span className="tag" style={{ color: 'var(--accent)', borderColor: 'rgba(202,138,4,.4)' }}>★</span>}</b>
          <span className="sub">{n ? t('chain') + ': ' : t('openIn', '', { r: b.reg[0] }) + ' (+' + fmt(b.inc * 1.25 * 12) + t('ifSteady') + ') · '}{t('requires')} {reqLabel(b.req)}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('v11.capitalPathSummary', '', { cost: fmt(cap), manager: fmt(managerMo), chance: closureChance })}</span>
          {n > 0 && <div>{(s.branches[b.id] || []).map((br, i) => {
            const net = branchNet(s, b, br) * mult;
            const isCapital = br.paid > c * 1.5; // paid ≥1.5× normal → capital path
            const isFranchised = !!br.franchised;
            return <span key={i} className={'brchip ' + (net >= 0 ? 'up' : 'dn')}>{b.reg[br.r % b.reg.length]} · {net >= 0 ? '+' : ''}{fmt(net)}/mo · {br.mood >= 1.35 ? t('booming') : br.mood <= .55 ? t('struggling') : t('steady')}{isCapital ? ' · ' + t('v11.manager') : ''}{isFranchised ? ' · ' + t('biz.franchised') : ''}</span>;
          })}
          {/* v11.37 — franchise + negotiate-sell + v11.50 brand actions per business */}
          <div className="biz-actions" style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Btn ic="ic-up" label={t('biz.franchiseBtn')} kind="ghost" disabled={!(s.branches[b.id] || []).some(br => !br.franchised)} onClick={() => {
              const idx = (s.branches[b.id] || []).findIndex(br => !br.franchised);
              if (idx >= 0) act(st => franchiseBranch(st, b.id, idx));
            }} />
            <Btn ic="ic-coins" label={t('biz.sellBtn')} kind="danger" disabled={branchCount(s, b.id) === 0} onClick={() => {
              const offer = negotiateBizSell(s, b.id, 0);
              if (offer) setBizOffer(offer);
            }} />
            {/* v11.50 — brand customization button (only shown when the player owns ≥1 branch). */}
            {n > 0 && (
              <Btn ic="ic-star" label={t('biz.brandBtn')} kind="ghost" onClick={() => setEditingBrand({ bizId: b.id, name: brand.name, logo: brand.logo })} />
            )}
          </div>
          </div>}
        </Row>;
      })}
      <h3>{t('farmLines')}</h3>
      {FARM_LINES.map(l => {
        const owned = s.farm[l.id];
        const why = !branchCount(s, 'farm') ? t('farmFirst') : worldYear(s) < l.since ? t('unlocksIn', '', { y: l.since }) : s.money < l.cost ? t('needLicence') : '';
        return <Row key={l.id} art="b-farm" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('active') : why || t('expand')} disabled={!!owned || !!why} onClick={() => act(st => buyFarmLine(st, l.id))} />}>
          <b>{t('farm.' + l.id, l.name)}{owned ? ' · ' + t('active') : ''}</b><span className="sub">+{fmt(l.inc)}{t('perYear')} · {t('setup')} {fmt(l.cost)} · {t('since')} {l.since}</span>
        </Row>;
      })}
      <h3>{t('facLines')}</h3>
      {FAC_LINES.map(l => {
        const owned = s.fac[l.id];
        const why = !branchCount(s, 'fac') ? t('facFirst') : worldYear(s) < l.since ? t('unlocksIn', '', { y: l.since }) :
          (l.food && !branchCount(s, 'farm')) ? t('farmFirst') : (l.needs && !s.fac[l.needs]) ? t('needsUpstream', '', { x: t('fac.' + l.needs, FAC_LINES.find(x => x.id === l.needs)!.name) }) : s.money < l.cost ? t('needLicence') : '';
        return <Row key={l.id} art="b-fac" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('active') : why || t('build')} disabled={!!owned || !!why} onClick={() => act(st => buyFacLine(st, l.id))} />}>
          <b>{t('fac.' + l.id, l.name)}{owned ? ' · ' + t('active') : ''}</b>
          <span className="sub">+{fmt(l.inc * (l.food && branchCount(s, 'farm') ? 1.3 : 1))}{t('perYear')}{l.food ? ' · ' + t('farmSupply') : ''}{l.needs ? ' · ' + t('needsUpstream', '', { x: t('fac.' + l.needs, FAC_LINES.find(x => x.id === l.needs)!.name) }) : ''} · {t('setup')} {fmt(l.cost)} · {t('since')} {l.since}</span>
        </Row>;
      })}
      <p className="sub">{t('bizNote')}</p>
      {/* v11.37 — negotiate-sell offer modal */}
      {bizOffer && (
        <div className="modal-overlay" onClick={closeBizOffer}>
          <div className="modal-box edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>🤝 {t('biz.sellBtn')}</h2>
              <button className="modal-x" onClick={closeBizOffer} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-preview">
                <span className="edit-preview-av" style={{ fontSize: '2rem' }}>🏢</span>
                <div>
                  <b className="big">{t('biz.' + bizOffer.bizId)}</b>
                  <div className="mini">{t('biz.offerFrom')} {bizOffer.buyerName}</div>
                </div>
              </div>
              {bizOffer.offer > 0 ? (
                <div className="field">
                  <b style={{ fontSize: '1.3rem', color: 'var(--accent)' }}>{fmt(bizOffer.offer)}</b>
                  {!bizOffer.pushed && <span className="mini">{t('biz.pushOffer')} — 75% chance buyer accepts, 25% walk.</span>}
                  {bizOffer.pushed && <span className="mini" style={{ color: 'var(--sage)' }}>✓ {t('biz.pushOffer')} thành công!</span>}
                </div>
              ) : (
                <div className="field">
                  <b style={{ color: 'var(--brick)' }}>❌ {t('biz.buyerWalked')}</b>
                  <span className="mini">The buyer pulled out after you pushed for more.</span>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn-ghost" onClick={closeBizOffer}>{t('edit.cancel', 'Cancel')} (Esc)</button>
              {!bizOffer.pushed && bizOffer.offer > 0 && (
                <button className="btn-primary" onClick={() => {
                  const pushed = pushBizOffer(s, bizOffer);
                  if (pushed) setBizOffer(pushed);
                }}>{t('biz.pushOffer')}</button>
              )}
              {bizOffer.offer > 0 && (
                <button className="btn-primary" onClick={() => {
                  act(st => acceptBizOffer(st, bizOffer));
                  closeBizOffer();
                }}>{t('biz.acceptOffer')} {fmt(bizOffer.offer)}</button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* v11.50 — Brand customization modal. Lets the player rename + re-logo
          a biz chain they own. Brand shows on the biz row + branch chips. */}
      {editingBrand && (
        <BrandEditorModal
          s={s}
          act={act}
          editing={editingBrand}
          onClose={closeBrandEditor}
        />
      )}
    </>
  );
}
