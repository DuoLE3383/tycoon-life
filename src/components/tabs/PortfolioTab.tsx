'use client';

import { assetVal, bizVal, cashFlowLastDays, fmtFull, type GameState, ITEM_BY, lotValue, netWorth, portfolioIncome, portfolioInvested, portfolioRealizedGains, portfolioROI, portfolioUnrealizedGains, stocksOf, stockVal, TX_CAP, type TxKind, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';
import { DonutChart } from '@/components/charts';



// ================= v11.49 — PORTFOLIO DASHBOARD =================
// Brings together P&L tracking, ROI per holding, asset allocation, and the
// transaction ledger. Reads from s.transactions + s.costBasis which the
// engine populates from every buy/sell/income/expense/transfer event.
export function PortfolioTab({ s }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  const nw = netWorth(s);
  const realized = portfolioRealizedGains(s);
  const unrealized = portfolioUnrealizedGains(s);
  const invested = portfolioInvested(s);
  const income = portfolioIncome(s);
  const roi = portfolioROI(s);
  const cashFlow = cashFlowLastDays(s, 30);
  // Stock holdings with non-zero qty. v14.1 — iterates stocksOf(s) so custom
  // + overridden tickers appear here alongside the built-in catalogue (this
  // keeps the Portfolio tab consistent with the StockTab summary card and
  // the engine's portfolioUnrealizedGains, both of which already use it).
  const stockHoldings = stocksOf(s).map(x => {
    const qty = s.stk[x.id] || 0;
    if (qty <= 0) return null;
    const basis = s.costBasis[x.id] || 0;
    const value = qty * s.prices[x.id];
    const pnl = value - basis;
    const roiPct = basis > 0 ? (pnl / basis) * 100 : 0;
    return { id: x.id, name: t('stock.' + x.id, x.name), qty, basis, value, pnl, roiPct };
  }).filter((h): h is NonNullable<typeof h> => !!h);
  // Lot (item) holdings — current value vs `paid`.
  const lotHoldings = s.lots.map((l, i) => {
    const it = ITEM_BY[l.id];
    if (!it) return null;
    const value = lotValue(s, l);
    const pnl = value - l.paid;
    const roiPct = l.paid > 0 ? (pnl / l.paid) * 100 : 0;
    return { idx: i, id: l.id, name: it.name, qty: 1, basis: l.paid, value, pnl, roiPct };
  }).filter((h): h is NonNullable<typeof h> => !!h);
  // All holdings combined for the table.
  const allHoldings = [...stockHoldings, ...lotHoldings].sort((a, b) => b.value - a.value);
  // Asset allocation breakdown for the donut chart.
  const cashVal = Math.max(0, s.money);
  const bankVal = Math.max(0, s.bank.dep);
  const stkVal = stockVal(s);
  const aVal = assetVal(s);
  const bVal = bizVal(s);
  const loanVal = Math.max(0, s.bank.loan);
  const allocationSegs = [
    { label: t('cash'), value: cashVal, color: 'var(--accent)' },
    { label: t('savings'), value: bankVal, color: '#7d9484' },
    { label: t('tab.markets'), value: stkVal, color: '#b3895f' },
    { label: t('tab.assets'), value: aVal, color: '#a85f52' },
    { label: t('tab.biz'), value: bVal, color: '#8d7f9b' },
  ].filter(seg => seg.value > 0);
  // Recent transactions (last 25 for display).
  const recentTx = s.transactions.slice(-25).reverse();
  const txKindLabel = (k: TxKind): string => ({
    buy: t('pf.kindBuy'), sell: t('pf.kindSell'), income: t('pf.kindIncome'),
    expense: t('pf.kindExpense'), transfer: t('pf.kindTransfer'), dividend: t('pf.kindDividend'),
  }[k] || k);
  // v13.9 — table cells + summary now use fmtFull() (full $ + thousand
  // separators) so positions > 100 tỷ stay readable. Compact fmt() is
  // still used by chips/badges outside this tab.
  const txSign = (k: TxKind, amount: number): string => {
    if (k === 'sell' || k === 'income' || k === 'dividend') return '+' + fmtFull(amount);
    if (k === 'transfer') return (amount >= 0 ? '+' : '−') + fmtFull(Math.abs(amount));
    return (amount >= 0 ? '+' : '−') + fmtFull(Math.abs(amount));
  };
  const txColor = (k: TxKind, amount: number): string => {
    if (k === 'sell' || k === 'income' || k === 'dividend') return 'var(--up)';
    if (k === 'transfer') return amount >= 0 ? 'var(--up)' : 'var(--down)';
    return amount >= 0 ? 'var(--up)' : 'var(--down)';
  };
  const pct = (n: number | null): string => n == null ? '—' : (n * 100).toFixed(1) + '%';
  const pnlText = (n: number): { text: string; color: string } => ({
    text: (n >= 0 ? '+' : '−') + fmtFull(Math.abs(n)),
    color: n >= 0 ? 'var(--up)' : 'var(--down)',
  });
  const roiPctText = (n: number): { text: string; color: string } => ({
    text: (n >= 0 ? '+' : '') + n.toFixed(1) + '%',
    color: n >= 0 ? 'var(--up)' : 'var(--down)',
  });
  return (
    <>
      {/* Summary card */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('pf.netWorth')}</span><b className="num-full">{fmtFull(nw)}</b></div>
        <div className="lb"><span>{t('pf.invested')}</span><b className="num-full">{fmtFull(invested)}</b></div>
        <div className="lb"><span>{t('pf.income')}</span><b className="num-full" style={{ color: 'var(--up)' }}>+{fmtFull(income)}</b></div>
        <div className="lb"><span>{t('pf.realized')}</span><b className="num-full" style={{ color: realized >= 0 ? 'var(--up)' : 'var(--down)' }}>{pnlText(realized).text}</b></div>
        <div className="lb"><span>{t('pf.unrealized')}</span><b className="num-full" style={{ color: unrealized >= 0 ? 'var(--up)' : 'var(--down)' }}>{pnlText(unrealized).text}</b></div>
        <div className="lb"><span>{t('pf.roi')}</span><b style={{ color: (roi ?? 0) >= 0 ? 'var(--up)' : 'var(--down)' }}>{pct(roi)}</b></div>
        <div className="lb"><span>{t('pf.cashFlow30')}</span><b className="num-full" style={{ color: cashFlow >= 0 ? 'var(--up)' : 'var(--down)' }}>{(cashFlow >= 0 ? '+' : '−') + fmtFull(Math.abs(cashFlow))}</b></div>
        {loanVal > 0 && <div className="lb"><span style={{ color: 'var(--mute)' }}>Loan</span><b className="num-full" style={{ color: 'var(--brick)' }}>−{fmtFull(loanVal)}</b></div>}
      </div>

      {/* Allocation donut */}
      {allocationSegs.length > 0 && (
        <>
          <h3>{t('pf.allocation')}</h3>
          <div className="dash-chart-box" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
            <DonutChart segs={allocationSegs} size={120} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {allocationSegs.map(seg => (
                <div key={seg.label} className="lb">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: seg.color }} />
                    {seg.label}
                  </span>
                  <b className="num-full">{fmtFull(seg.value)}</b>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Holdings table */}
      <h3>{t('pf.holdings')}</h3>
      {allHoldings.length === 0 ? (
        <p className="sub">{t('pf.noHoldings')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--paper2)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>{t('pf.asset')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.qty')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.cost')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.value')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.pnl')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.roiCol')}</th>
              </tr>
            </thead>
            <tbody>
              {allHoldings.slice(0, 20).map(h => {
                const pnlInfo = pnlText(h.pnl);
                const roiInfo = roiPctText(h.roiPct);
                return (
                  <tr key={h.id + (h as { idx?: number }).idx} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 8px' }}>{h.name}</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px' }}>{h.qty}</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtFull(h.basis)}</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px' }}>{fmtFull(h.value)}</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px', color: pnlInfo.color, fontWeight: 600 }}>{pnlInfo.text}</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px', color: roiInfo.color, fontWeight: 600 }}>{roiInfo.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Transaction ledger */}
      <h3>{t('pf.txLog')} <span className="mini" style={{ fontWeight: 400 }}>· {s.transactions.length}/{TX_CAP}</span></h3>
      {recentTx.length === 0 ? (
        <p className="sub">{t('pf.empty')}</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--paper2)', borderBottom: '1px solid var(--line)' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>{t('pf.day')}</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>{t('pf.kind')}</th>
                <th style={{ textAlign: 'left', padding: '6px 8px' }}>{t('pf.asset')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.amount')}</th>
                <th style={{ textAlign: 'right', padding: '6px 8px' }}>{t('pf.pnl')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTx.map(tx => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '6px 8px', color: 'var(--mute)' }}>D{tx.day}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <span className="tag" style={{ fontSize: 10 }}>{txKindLabel(tx.kind)}</span>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{tx.name}{tx.qty > 1 ? ` ×${tx.qty}` : ''}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px', color: txColor(tx.kind, tx.amount), fontWeight: 600 }}>{txSign(tx.kind, tx.amount)}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '6px 8px', color: (tx.realizedPnL || 0) >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>
                    {tx.realizedPnL != null ? pnlText(tx.realizedPnL).text : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Suppress unused-lang warning (lang is used elsewhere via useT consumer pattern). */}
      <span style={{ display: 'none' }}>{lang}</span>
    </>
  );
}
