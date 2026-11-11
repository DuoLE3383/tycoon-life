'use client';

import { Art, effDemand, effEraBiz, effLoanRate, effRisk, fmt, fmtFull, type GameState, Ic, researchCost, researchMarket, stocksOf, trade, useT } from '@/components/gameDeps';
import { type Act, Row } from '@/components/shared';
import { Row } from '@/components/shared';



// ================= STOCKS =================
// v11.2 — StockTab now also shows the active crisis banner (if any) and
// the market-research panel. Research costs a fee scaled by era (cheap
// before 1990, rises after); the brief is cached on s.researchBrief until
// the next Jan 1. The noise model lives in researchMarket() — false
// negatives ~15%, false positives ~10%.
// v14.1 — the per-stock rows now also surface portfolio info that used to
// live only in the separate Portfolio tab: holdings value, cost basis,
// unrealized P&L (green/red), ROI%. A summary card at the top rolls those
// numbers up across all owned tickers (built-in + custom). The tab also
// iterates stocksOf(s) so admin-created / overridden stocks show up here
// immediately, with the same sparkline + trade buttons.
export function StockTab({ s, act, qtyMap, setQtyMap }: { s: GameState; act: Act; qtyMap: Record<string, number>; setQtyMap: (m: Record<string, number>) => void }) {
  const { t } = useT();
  const cost = researchCost(s);
  // v14.1 — single source of truth for the catalogue: built-ins + overridden
  // + custom. The pulse card + per-stock rows both consume this so a newly
  // created admin ticker appears in both places on the next render.
  const stocks = stocksOf(s);
  // Summary numbers across all owned stocks (cost basis lives on s.costBasis,
  // unrealized P&L = current value − cost basis per holding).
  const totalValue = stocks.reduce((a, x) => a + (s.stk[x.id] || 0) * s.prices[x.id], 0);
  const totalBasis = stocks.reduce((a, x) => a + (s.costBasis[x.id] || 0), 0);
  const totalPnL = totalValue - totalBasis;
  const overallRoi = totalBasis > 0 ? (totalPnL / totalBasis) * 100 : null;
  return (
    <>
      {/* v11.2 — active crisis banner. effEraBiz / effLoanRate / effRisk /
          effDemand surface the live crisis modifiers; the banner tells the
          player what's currently hitting their portfolio. */}
      {s.crisis && (
        <Row art="s-coin">
          <b>{t('v11.crisisActive')} <span className="down">▼</span></b>
          <span className="sub">{s.crisis.cause} · {s.crisis.yearsLeft} {t('v11.crisisYearsLeft')}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>
            {effEraBiz(s) < 1 && <>biz −{((1 - effEraBiz(s)) * 100).toFixed(0)}% · </>}
            {effLoanRate(s) > 0.07 && <>loan +{((effLoanRate(s) / 0.06 - 1) * 100).toFixed(0)}% · </>}
            {effRisk(s) > 0 && <>closure +{(effRisk(s) * 100).toFixed(0)}% · </>}
            {effDemand(s) < 1 && <>demand −{((1 - effDemand(s)) * 100).toFixed(0)}%</>}
          </span>
        </Row>
      )}
      {/* v11.2 — research panel. Button runs researchMarket and shows the
          returned brief; cached on s.researchBrief so it stays visible. */}
      <Row art="s-tech">
        <b>{t('v11.researchTitle')}</b>
        <span className="sub">{t('v11.researchBlurb')}</span>
        <div className="trade" style={{ marginTop: 4 }}>
          <button className="tbuy" disabled={s.money < cost}
            onClick={() => act(g => {
              const r = researchMarket(g);
              if (!r.ok && r.lines.length) return r.lines[0];
              return null;
            })}>{t('v11.researchBtn', '', { x: fmt(cost) })}</button>
        </div>
        {s.researchBrief && (
          <div className="mini" style={{ display: 'block', marginTop: 6, padding: '6px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, lineHeight: 1.5 }}>
            {s.researchBrief.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}
      </Row>
      {/* v14.1 — portfolio summary card. Rolls up value / cost basis / P&L /
          ROI across every owned ticker (built-in + custom) so the player
          gets the headline numbers without flipping to the Portfolio tab.
          Only renders when the player actually owns something (avoids a
          row of zeros confusing a fresh player).
          v13.9 — compact 2-column layout (Total Value | Total P&L + ROI%)
          with full thousand-separated numbers so billion-dollar portfolios
          stay readable. */}
      {totalValue > 0 && (
        <div className="card stk-summary" style={{ marginBottom: 10 }}>
          <div className="stk-summary-col">
            <div className="mini" style={{ opacity: .75 }}>{t('mk.portfolio')} · {t('pf.value')}</div>
            <b className="num-full stk-summary-num">{fmtFull(totalValue)}</b>
            <div className="mini" style={{ opacity: .65 }}>{t('pf.cost')} <span className="num-full">{fmtFull(totalBasis)}</span></div>
          </div>
          <div className="stk-summary-col">
            <div className="mini" style={{ opacity: .75 }}>{t('pf.unrealized')}</div>
            <b className="num-full stk-summary-num" style={{ color: totalPnL >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {(totalPnL >= 0 ? '+' : '−') + fmtFull(Math.abs(totalPnL))}
            </b>
            <div className="mini" style={{ color: (overallRoi ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {t('pf.roiCol')}: {overallRoi == null ? '—' : (overallRoi >= 0 ? '+' : '') + overallRoi.toFixed(1) + '%'}
            </div>
          </div>
        </div>
      )}
      {/* v11.27 — portfolio pulse: today's movers (best + worst tickers by
          daily % change). v13.9 — compact one-liner so it doesn't compete
          with the summary card above. */}
      {(() => {
        const movers = stocks.map(x => { const hh = s.hist[x.id] || []; return { id: x.id, ch: hh.length > 1 ? (s.prices[x.id] / hh[hh.length - 2] - 1) * 100 : 0 }; }).sort((a, b) => b.ch - a.ch);
        const best = movers[0], worst = movers[movers.length - 1];
        if (!best) return null;
        return (
          <div className="card stk-movers" style={{ marginBottom: 10 }}>
            <span className="mini" style={{ opacity: .75 }}>{t('mk.movers')}: </span>
            <span className="mini">📈 <b className="up">{best.id} +{best.ch.toFixed(1)}%</b></span>
            <span className="mini"> · </span>
            <span className="mini">📉 <b className={worst.ch >= 0 ? 'up' : 'down'}>{worst.id} {worst.ch.toFixed(1)}%</b></span>
          </div>
        );
      })()}
      {stocks.map(st => {
        const p = s.prices[st.id], h = s.hist[st.id] || [];
        const ch = h.length > 1 ? (p / h[h.length - 2] - 1) * 100 : 0, q = s.stk[st.id] || 0;
        // v14.1 — per-stock portfolio breakdown. Only meaningful when the
        // player owns shares; otherwise the right column shows a "—" hint
        // so the card stays compact for the dozens of tickers a fresh
        // player hasn't touched yet.
        const owned = q > 0;
        const value = owned ? q * p : 0;
        const basis = owned ? (s.costBasis[st.id] || 0) : 0;
        const pnl = owned ? value - basis : 0;
        const roiPct = owned && basis > 0 ? (pnl / basis) * 100 : null;
        // Sparkline points: cap at the last 30 history values so the chart
        // stays readable when the history array is full (60 points). The
        // viewBox stays 96×30; we just rescale the x axis to the slice.
        const spark = h.slice(-30);
        const mn = spark.length ? Math.min(...spark) : p, mx = spark.length ? Math.max(...spark) : p, r = (mx - mn) || 1;
        const pts = spark.map((v, i) => `${(i / Math.max(spark.length - 1, 1) * 96).toFixed(1)},${(28 - (v - mn) / r * 24).toFixed(1)}`).join(' ');
        // v13.9 — clean card layout: left (name + price + daily badge +
        // sparkline) | right (holdings + P&L + ROI%) | bottom (qty + buy/
        // sell / MAX / All). Replaces the cramped single-row layout that
        // packed everything into one .info block with the trade buttons on
        // the right edge. Uses fmtFull() for every dollar amount so very
        // large positions ($100B+) stay readable.
        return (
          <div key={st.id} className="card stk-card">
            <div className="stk-card-main">
              <div className="stk-card-left">
                <div className="stk-card-title">
                  <Art id={st.art} className="ca" />
                  <b>{st.id}</b>
                  <span className={'stk-daily ' + (ch >= 0 ? 'up' : 'down')}>
                    {ch >= 0 ? '▲' : '▼'}{Math.abs(ch).toFixed(1)}%
                  </span>
                </div>
                <div className="sub stk-card-name">{st.name}</div>
                <div className="stk-card-price num-full">{fmtFull(p)}</div>
                <svg className="spark stk-card-spark" viewBox="0 0 96 30" preserveAspectRatio="none">
                  <polyline fill="none" stroke={spark.length && spark[spark.length - 1] >= spark[0] ? '#4f7d5f' : '#a3524a'} strokeWidth="2.4" points={pts} />
                </svg>
              </div>
              {owned ? (
                <div className="stk-card-right">
                  <div className="lb"><span>{t('hold', '', { n: q })}</span><b className="num-full">{fmtFull(value)}</b></div>
                  <div className="lb"><span>{t('pf.cost')}</span><b className="num-full">{fmtFull(basis)}</b></div>
                  <div className="lb"><span>{t('pf.pnl')}</span><b className="num-full" style={{ color: pnl >= 0 ? 'var(--up)' : 'var(--down)' }}>{(pnl >= 0 ? '+' : '−') + fmtFull(Math.abs(pnl))}</b></div>
                  <div className="lb"><span>{t('pf.roiCol')}</span><b style={{ color: (roiPct ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>{roiPct == null ? '—' : (roiPct >= 0 ? '+' : '') + roiPct.toFixed(1) + '%'}</b></div>
                </div>
              ) : (
                <div className="stk-card-right stk-card-none">
                  <span className="mini" style={{ opacity: .55 }}>— {t('hold', '', { n: 0 })} —</span>
                </div>
              )}
            </div>
            <div className="stk-card-trade">
              <input className="qty" type="number" min={1} step={1} value={qtyMap[st.id] || 1} aria-label={`Quantity for ${st.id}`}
                onChange={e => setQtyMap({ ...qtyMap, [st.id]: Math.max(1, Math.floor(+e.target.value || 1)) })} />
              <button className="tsell" disabled={!q} onClick={() => act(g => { const r2 = trade(g, st.id, 'sell', qtyMap[st.id] || 1); return r2.msg; })}>{t('sellS')}</button>
              <button className="tbuy" disabled={s.money < p} onClick={() => act(g => { const r2 = trade(g, st.id, 'buy', qtyMap[st.id] || 1); return r2.ok ? r2.msg : null; })}>{t('buy')}</button>
              {/* v11.27 — one-tap MAX buy (spend all affordable cash) / ALL sell (entire holding) */}
              <button className="tquick" title={t('mk.buyMax')} disabled={s.money < p} onClick={() => act(g => { const q2 = Math.max(1, Math.floor(g.money / Math.max(1, g.prices[st.id]))); return trade(g, st.id, 'buy', q2).msg; })}>{t('mk.max')}</button>
              <button className="tquick" title={t('mk.sellAll')} disabled={!q} onClick={() => act(g => trade(g, st.id, 'sell', g.stk[st.id] || 0).msg)}>{t('mk.all')}</button>
            </div>
          </div>
        );
      })}
      {/* v11.19 — crypto hook: link to the companion Elliott Wave crypto app.
          COIN in-game is a BTC proxy; for real-time crypto charts + Elliott
          analysis, the player can jump to the dedicated crypto app. */}
      <Row art="s-coin">
        <b>{t('mk.cryptoHookTitle')}</b>
        <span className="sub">{t('mk.cryptoHookBlurb')}</span>
        <div className="trade" style={{ marginTop: 6 }}>
          <a className="ibtn" href="https://elliott.huyenbao.com/" target="_blank" rel="noopener noreferrer">
            <Ic id="ic-up" className="bsi" /><span>{t('mk.cryptoHookBtn')}</span>
          </a>
        </div>
      </Row>
      <p className="sub">{t('stockNote')}</p>
      <p className="mini" style={{ opacity: .6, marginTop: 4 }}>{t('mk.realPricesNote')}</p>
    </>
  );
}
