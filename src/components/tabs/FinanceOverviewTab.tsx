'use client';

import { assetBreakdown, expenseBreakdown, type FinanceAction, financeActions, fmtFull, type GameState, incomeBreakdown, netWorth, useT, yearExpenses, yearIncome } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= v11.53 — FINANCE OVERVIEW =================
// Detailed financial dashboard: cash flow summary, income/expense/asset
// breakdowns as clickable tables (each row navigates to the relevant tab),
// + a priority-sorted action-suggestion list ("you have idle cash — deposit
// to savings" etc). Designed to be the entry tab of the Finance group.
export function FinanceOverviewTab({ s, onNav }: { s: GameState; act: Act; onNav: (k: string) => void }) {
  const { t } = useT();
  const yi = yearIncome(s);
  const ye = yearExpenses(s);
  const netY = yi - ye;
  const netM = netY / 12;
  const nw = netWorth(s);
  const income = incomeBreakdown(s);
  const expenses = expenseBreakdown(s);
  const assets = assetBreakdown(s);
  const liabilities = s.bank.loan > 0 ? [{ id: 'loan', label: 'Loan', amount: s.bank.loan, link: 'bank' }] : [];
  const actions = financeActions(s);
  const priorityLabel = (p: FinanceAction['priority']): string =>
    p === 'high' ? t('fo.priorityHigh') : p === 'medium' ? t('fo.priorityMedium') : t('fo.priorityLow');
  const priorityColor = (p: FinanceAction['priority']): string =>
    p === 'high' ? 'var(--brick)' : p === 'medium' ? 'var(--amber, #c47b2c)' : 'var(--mute)';
  // Row renderer for income/expense/asset/liability tables — clickable.
  // v13.9 — uses fmtFull() so large income/asset figures (> 100 tỷ) stay
  // readable with thousand separators.
  const renderRow = (item: { id: string; label: string; amount: number; link: string }, idx: number, kind: 'income' | 'expense' | 'asset' | 'liab') => (
    <tr key={item.id + idx} className="fo-row" onClick={() => onNav(item.link)} style={{ cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
      <td style={{ padding: '7px 10px', fontWeight: 600 }}>{item.label}</td>
      <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 700,
        color: kind === 'income' ? 'var(--up)' : kind === 'expense' || kind === 'liab' ? 'var(--down)' : 'var(--ink)' }}>
        {kind === 'income' ? '+' : kind === 'expense' || kind === 'liab' ? '−' : ''}{fmtFull(item.amount)}
        <span className="mini" style={{ opacity: .6, fontWeight: 400 }}>{t('fo.perYear')}</span>
      </td>
      <td style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--accent)', fontSize: '.74rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {t('fo.viewTab')} →
      </td>
    </tr>
  );
  return (
    <>
      {/* Cash flow summary card */}
      {/* v13.9 — fmtFull() so billion-dollar incomes/expenses stay readable. */}
      <div className="card" style={{ marginBottom: 10, padding: 14 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)' }}>{t('fo.title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
          <div>
            <div className="mini" style={{ opacity: .7 }}>{t('fo.income')}</div>
            <b className="num-full" style={{ fontSize: '1.1rem', color: 'var(--up)' }}>+{fmtFull(yi)}<span className="mini" style={{ fontWeight: 400, opacity: .6 }}>{t('fo.perYear')}</span></b>
            <div className="mini" style={{ opacity: .7 }}>+{fmtFull(yi / 12)}{t('fo.perMonth')}</div>
          </div>
          <div>
            <div className="mini" style={{ opacity: .7 }}>{t('fo.expenses')}</div>
            <b className="num-full" style={{ fontSize: '1.1rem', color: 'var(--down)' }}>−{fmtFull(ye)}<span className="mini" style={{ fontWeight: 400, opacity: .6 }}>{t('fo.perYear')}</span></b>
            <div className="mini" style={{ opacity: .7 }}>−{fmtFull(ye / 12)}{t('fo.perMonth')}</div>
          </div>
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: netY >= 0 ? 'rgba(46,158,91,.08)' : 'rgba(192,57,43,.08)', border: `1px solid ${netY >= 0 ? 'rgba(46,158,91,.25)' : 'rgba(192,57,43,.25)'}` }}>
          <span className="mini" style={{ opacity: .7 }}>{t('fo.net')}</span>
          <b className="num-full" style={{ fontSize: '1.2rem', color: netY >= 0 ? 'var(--up)' : 'var(--down)', marginLeft: 6 }}>
            {netY >= 0 ? '+' : '−'}{fmtFull(Math.abs(netY))}<span className="mini" style={{ fontWeight: 400, opacity: .6 }}>{t('fo.perYear')}</span>
          </b>
          <span className="mini" style={{ marginLeft: 8, opacity: .7 }}>
            · {netM >= 0 ? '+' : '−'}{fmtFull(Math.abs(netM))}{t('fo.perMonth')}
          </span>
        </div>
        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 4px' }}>
          <span className="mini" style={{ opacity: .7 }}>{t('fo.netWorth')}</span>
          <b className="num-full" style={{ fontSize: '1rem', color: 'var(--accent)' }}>{fmtFull(nw)}</b>
        </div>
      </div>

      {/* Action suggestions */}
      <h3>💡 {t('fo.actions')}</h3>
      {actions.length === 0 ? (
        <div className="card" style={{ marginBottom: 10, padding: 12, color: 'var(--sage)', fontWeight: 600 }}>✓ {t('fo.noActions')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {actions.map(a => (
            <button key={a.id} className="card" onClick={() => onNav(a.link)} style={{
              padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
              borderLeft: `3px solid ${priorityColor(a.priority)}`,
              background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                <span className="tag" style={{
                  fontSize: '.68rem', fontWeight: 700,
                  background: priorityColor(a.priority),
                  color: '#fff',
                  padding: '1px 7px', borderRadius: 999,
                }}>{priorityLabel(a.priority)}</span>
                <span className="mini" style={{ color: 'var(--accent)', fontWeight: 700 }}>{t('fo.viewTab')} →</span>
              </div>
              <div style={{ fontSize: '.86rem', lineHeight: 1.45 }}>{a.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* Income + Expense tables side by side on desktop, stacked on mobile */}
      <div className="fo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="modal-head" style={{ padding: '10px 12px' }}><h2 style={{ fontSize: '.95rem' }}>📈 {t('fo.incomeSources')}</h2></div>
          {income.length === 0 ? (
            <p className="sub" style={{ padding: 12 }}>—</p>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
              <tbody>
                {income.map((it, i) => renderRow(it, i, 'income'))}
                <tr style={{ background: 'var(--paper2)', borderTop: '2px solid var(--line)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800 }}>{t('fo.income')}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, color: 'var(--up)', fontVariantNumeric: 'tabular-nums' }}>+{fmtFull(yi)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="modal-head" style={{ padding: '10px 12px' }}><h2 style={{ fontSize: '.95rem' }}>📉 {t('fo.expenseItems')}</h2></div>
          {expenses.length === 0 ? (
            <p className="sub" style={{ padding: 12 }}>—</p>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
              <tbody>
                {expenses.map((it, i) => renderRow(it, i, 'expense'))}
                <tr style={{ background: 'var(--paper2)', borderTop: '2px solid var(--line)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800 }}>{t('fo.expenses')}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, color: 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>−{fmtFull(ye)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Assets + Liabilities tables */}
      <div className="fo-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="modal-head" style={{ padding: '10px 12px' }}><h2 style={{ fontSize: '.95rem' }}>💼 {t('fo.assets')}</h2></div>
          {assets.length === 0 ? (
            <p className="sub" style={{ padding: 12 }}>—</p>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
              <tbody>
                {assets.map((it, i) => renderRow(it, i, 'asset'))}
                <tr style={{ background: 'var(--paper2)', borderTop: '2px solid var(--line)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800 }}>{t('fo.assets')}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(assets.reduce((a, b) => a + b.amount, 0))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="modal-head" style={{ padding: '10px 12px' }}><h2 style={{ fontSize: '.95rem' }}>📉 {t('fo.liabilities')}</h2></div>
          {liabilities.length === 0 ? (
            <p className="sub" style={{ padding: 12 }}>—</p>
          ) : (
            <table style={{ width: '100%', fontSize: '.82rem', borderCollapse: 'collapse' }}>
              <tbody>
                {liabilities.map((it, i) => renderRow(it, i, 'liab'))}
                <tr style={{ background: 'var(--paper2)', borderTop: '2px solid var(--line)' }}>
                  <td style={{ padding: '7px 10px', fontWeight: 800 }}>{t('fo.liabilities')}</td>
                  <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontWeight: 800, color: 'var(--down)', fontVariantNumeric: 'tabular-nums' }}>−{fmtFull(liabilities.reduce((a, b) => a + b.amount, 0))}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="mini" style={{ textAlign: 'center', opacity: .7, marginTop: 6 }}>{t('fo.tapHint')}</p>
    </>
  );
}
