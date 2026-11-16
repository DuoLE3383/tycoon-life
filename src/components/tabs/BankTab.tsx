'use client';

import { bankOp, donate, fameBonus, fmtFull, type GameState, Ic, LOAN_RATE, maxLoanOf, SAVE_RATE, TAX_BRACKETS, TAX_FREE, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// v12.6 — AMOUNT INPUT ROW with thousand separators.
// Reusable row with a number input (formatted with thousand dots) + optional
// "All" button + submit button. Replaces the old hard-coded +$10K / +$100K
// buttons with a flexible input where the player can type any amount.
// v12.7 — added thousand separator formatting (1,000,000 style) for readability.
export function formatThousands(n: string): string {
  const digits = n.replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}


export function parseAmount(s: string): number {
  return Math.max(1, Math.floor(Number(s.replace(/[^\d]/g, '')) || 0));
}


export function AmountRow({ label, sub, icon, max, allLabel, allAction, onSubmit, danger }: {
  label: string; sub: string; icon: string; max: number;
  allLabel?: string; allAction?: () => void; onSubmit: (amt: number) => void;
  danger?: boolean;
}) {
  const [val, setVal] = useState('');
  const submit = () => {
    const amt = parseAmount(val);
    if (amt > 0) { onSubmit(amt); setVal(''); }
  };
  return (
    <Row art="ic-coins" right={<div className="trade" style={{ gap: 5 }}>
      <input className="qty" type="text" inputMode="numeric" placeholder="0" value={val}
        onChange={e => setVal(formatThousands(e.target.value))}
        onKeyDown={e => { if (e.key === 'Enter') submit(); }}
        style={{ width: 120, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
        aria-label={label} />
      <button className={danger ? 'tsell' : 'tbuy'} disabled={!val || parseAmount(val) <= 0} onClick={submit}>
        <Ic id={icon} className="bsi" /><span>{label}</span>
      </button>
      {allLabel && allAction && (
        <button className="ibtn ghost" style={{ minWidth: 'auto', padding: '5px 10px', fontSize: '.78rem' }} disabled={max <= 0} onClick={allAction}>{allLabel}</button>
      )}
    </div>}>
      <b>{label}</b><span className="sub">{sub}</span>
    </Row>
  );
}



// ================= BANK =================
export function BankTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  // v11.57 — use the new maxLoanOf helper that includes income-based credit.
  const loanInfo = maxLoanOf(s);
  const maxLoan = loanInfo.total;
  let marginal = 0; { let lo = 0; for (const [hi, rate] of TAX_BRACKETS) { if (s.yIncome > lo) marginal = rate; lo = hi; } }
  const fameTxt = s.fame >= 1000 ? t('fameIconic') : s.fame >= 300 ? t('fameHousehold') : s.fame >= 100 ? t('fameFamous') : s.fame >= 25 ? t('fameWell') : s.fame > 0 ? t('fameGetting') : t('fameLevels');
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('savings')} ({(SAVE_RATE * 100).toFixed(0)}%{t('perYear')})</span><b className="num-full">{fmtFull(s.bank.dep)}</b></div>
        <div className="lb"><span>{t('loan')} ({(LOAN_RATE * 100).toFixed(0)}%{t('perYear')})</span><b className="num-full" style={{ color: s.bank.loan > 0 ? 'var(--brick)' : undefined }}>{fmtFull(s.bank.loan)}</b></div>
        <div className="lb"><span>{t('incomeYear')}</span><b className="num-full">{fmtFull(s.yIncome)}</b></div>
        <div className="lb"><span>{t('bracket', '', { x: '$' + TAX_FREE.toLocaleString('en-US') })}</span><b>{(marginal * 100).toFixed(0)}{t('marginal')}</b></div>
        <div className="lb"><span>{t('lastTax')}</span><b className="num-full">{fmtFull(s.yTax)}</b></div>
        {/* v11.57 — credit limit breakdown showing base + income credit.
            v13.9 — fmtFull() so credit limits in the billions stay readable. */}
        <div className="lb" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: '8px 13px' }}>
          <span className="mini" style={{ fontWeight: 700, opacity: .8 }}>{t('bank.creditBreakdown')}</span>
          <span className="mini"><span style={{ opacity: .6 }}>{t('bank.baseCredit')}:</span> <b className="num-full">{fmtFull(loanInfo.base)}</b></span>
          {loanInfo.incomeCredit > 0 && (
            <span className="mini" style={{ color: 'var(--sage)' }}><span style={{ opacity: .6 }}>{t('bank.incomeCredit')}:</span> <b className="num-full">+{fmtFull(loanInfo.incomeCredit)}</b></span>
          )}
          <span className="mini"><span style={{ opacity: .6 }}>{t('bank.existingLoan')}:</span> <b className="num-full" style={{ color: 'var(--brick)' }}>−{fmtFull(loanInfo.existing)}</b></span>
          <span className="mini" style={{ fontWeight: 700 }}><span style={{ opacity: .6 }}>{t('bank.available')}:</span> <b className="num-full" style={{ color: 'var(--accent)' }}>{fmtFull(loanInfo.total)}</b></span>
          {loanInfo.incomeCredit > 0 && <span className="mini" style={{ opacity: .55, fontStyle: 'italic' }}>{t('bank.incomeCreditNote')}</span>}
        </div>
      </div>
      <h3>{t('savings')}</h3>
      <AmountRow label={t('deposit')} sub={t('whileSleep', '', { x: fmtFull(s.bank.dep * SAVE_RATE) })} icon="ic-plus" max={Math.floor(s.money)} allLabel={t('allIn')} allAction={() => act(st => bankOp(st, 'dep', 'all'))} onSubmit={amt => act(st => bankOp(st, 'dep', amt))} />
      <AmountRow label={t('withdraw')} sub={t('moveCash')} icon="ic-down" danger max={Math.floor(s.bank.dep)} allLabel={t('allOut')} allAction={() => act(st => bankOp(st, 'wd', 'all'))} onSubmit={amt => act(st => bankOp(st, 'wd', amt))} />
      <h3>{t('loan')}</h3>
      <AmountRow label={t('borrow')} sub={t('upTo', '', { x: fmtFull(maxLoan) })} icon="ic-up" max={maxLoan} allLabel={t('borrowMax')} allAction={() => act(st => bankOp(st, 'loan', 'all'))} onSubmit={amt => act(st => bankOp(st, 'loan', amt))} />
      <AmountRow label={t('repay')} sub={t('owe', '', { x: fmtFull(s.bank.loan), i: fmtFull(s.bank.loan * LOAN_RATE) })} icon="ic-check" danger max={Math.min(s.bank.loan, Math.floor(s.money))} allLabel={t('repayAll')} allAction={() => act(st => bankOp(st, 'repay', 'all'))} onSubmit={amt => act(st => bankOp(st, 'repay', amt))} />
      <h3>{t('charityFame')}</h3>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="famewrap"><span className="mini">{t('fame')}</span><div className="famebar"><i style={{ width: Math.min(100, Math.log10(Math.max(1, s.fame + 1)) * 25) + '%' }} /></div><b>{Math.round(s.fame)}</b></div>
        <div className="mini">{fameTxt} · {t('bizIncomeFame', '', { n: ((fameBonus(s) - 1) * 100).toFixed(1) })}</div>
      </div>
      <AmountRow label={t('donate')} sub={`${t('totalDonated')}: ${fmtFull(s.donated)} · ${t('fameFades')}`} icon="ic-heart" max={Math.floor(s.money)} onSubmit={amt => act(st => donate(st, amt))} />
    </>
  );
}
