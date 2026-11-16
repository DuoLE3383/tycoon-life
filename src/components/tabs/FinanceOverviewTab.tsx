'use client';

import {
  assetBreakdown, bizCosts, bizMultiplier, bizNet, bizRndMult, bizRevenue, branchCount, clubMult,
  effEraBiz, effLoanRate, type ExpenseItem, expenseBreakdown, fameBonus, type FinanceAction,
  financeActions, fmt, fmtFull, type GameState, healthMult, incomeBreakdown, type IncomeSource,
  jobIncome, jobsOf, levelMult, lotValue, assetDepreciationYr, netWorth, spiritBizMult, stockVal, studyTuition,
  studyWorkMult, upkeep, useT, yearExpenses, yearIncome,
  payBill, billTotalDue, type Bill,
} from '@/components/gameDeps';
import { type Act } from '@/components/shared';



// ================= v11.53 — FINANCE OVERVIEW =================
// Detailed financial dashboard: cash flow summary, income/expense/asset
// breakdowns as clickable tables (each row navigates to the relevant tab),
// + a priority-sorted action-suggestion list ("you have idle cash — deposit
// to savings" etc). Designed to be the entry tab of the Finance group.
//
// v13.12 — three new diagnostic cards so the player can actually understand
// WHERE their profit/loss comes from and what to do about it:
//   1. P&L Diagnosis        — plain-language "you're profitable because X > Y"
//   2. Improvement Suggestions — exact-dollar-impact advice for the 5 highest-
//                              leverage levers (loan / biz expansion / stocks /
//                              tuition / upkeep). Each shows $X/yr saved/added.
//   3. Financial Relationships — how the multipliers chain together, with the
//                              player's current factor breakdown so they know
//                              which lever to pull next.
// The original cash-flow + tables + action-suggestions are kept below these.
const fmtColor = (v: number) => ({ color: v < 0 ? "var(--down)" : v > 0 ? "var(--up)" : "inherit" });
export function FinanceOverviewTab({ s, act, onNav }: { s: GameState; act: Act; onNav: (k: string) => void }) {
  const { t } = useT();
  const yi = yearIncome(s);
  const ye = yearExpenses(s);
  // v13.18 — depreciation memo: unrealized, NOT in ye. Shown as its own row.
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

  // ============= v13.12 — P&L DIAGNOSIS =============
  // Pick the single biggest income source + single biggest expense so we can
  // explain in plain language WHY the player is (or isn't) making money.
  // Falls back to "no income yet" / "living cost" when arrays are empty.
  const topIncome: IncomeSource | null = income[0] || null;
  const topExpense: ExpenseItem | null = expenses[0] || null;
  // v13.16 — diagnosis MUST compare TOTALS, not Top 1 vs Top 1: Top income $100B
  // vs Top expense $665K does not mean profitable if other expenses sum higher.
  const totalInc = income.reduce((a, x) => a + x.amount, 0);
  const totalExp = expenses.reduce((a, x) => a + x.amount, 0);
  const profitable = totalInc >= totalExp;
  // When the player has no income, the "biggest expense" is still informative
  // (it's what's bleeding them). When they have no expenses at all (a fresh
  // game with $0), they're neutral — show a "build income" hint instead.
  const hasAnyIncome = income.length > 0;
  const hasAnyExpense = expenses.length > 0;

  // ============= v13.12 — IMPROVEMENT SUGGESTIONS =============
  // Five high-leverage levers, each with an EXACT dollar impact. These
  // complement financeActions() (which gives general priority-sorted advice)
  // by showing the precise $/yr saved or added for the most common decisions.
  type Suggestion = { id: string; text: string; link: string; impact: number; impactLabel: string };
  const suggestions: Suggestion[] = [];

  // 1. LOAN — repaying a meaningful chunk stops the interest bleed on that
  //    chunk. We suggest repaying either the full loan (if the player can
  //    afford it from cash) or a sensible $10k slab (whichever is smaller).
  //    Savings = repaying × effLoanRate (annual interest avoided).
  if (s.bank.loan > 0) {
    const rate = effLoanRate(s);
    const interestYr = s.bank.loan * rate;
    const repay = Math.min(s.bank.loan, Math.max(10000, s.money));
    const save = repay * rate;
    suggestions.push({
      id: 'loan',
      link: 'bank',
      impact: save,
      impactLabel: `save ${fmt(save)}/yr`,
      text: `Loan ${fmtFull(s.bank.loan)} costs ${fmt(interestYr)}/yr in interest. Repaying ${fmt(repay)} would ${repay >= s.bank.loan ? 'clear it entirely' : 'cut the balance'} and save ${fmt(save)}/yr.`,
    });
  }

  // 2. BUSINESS EXPANSION — if the player has profitable branches, opening
  //    one more of the SAME kind adds roughly the per-branch average net.
  //    This is conservative (new branches cost upfront + grow with BRANCH_GROWTH
  //    = 1.35× per existing branch, so the actual first branch of a new type
  //    would pay more — but we don't want to overpromise). Zero branches → no
  //    suggestion (the financeActions "startbiz" already covers that case).
  const totalBranches = (() => {
    let n = 0;
    // BIZ isn't exported via gameDeps; we sum branch counts for known ids.
    // branchCount(s, id) returns 0 when the player has none of that type.
    for (const id of ['cafe', 'shop', 'street', 'gym', 'salon', 'farm', 'fac', 'restaurant', 'logistics', 'clinic', 'school', 'realestate', 'hotel', 'ret']) {
      n += branchCount(s, id);
    }
    return n;
  })();
  const bn = bizNet(s);
  if (totalBranches > 0 && bn > 0) {
    const perBranch = bn / totalBranches;
    suggestions.push({
      id: 'expand-biz',
      link: 'biz',
      impact: perBranch,
      impactLabel: `add ~${fmt(perBranch)}/yr`,
      text: `Your business nets ${fmt(bn)}/yr across ${totalBranches} branch${totalBranches === 1 ? '' : 'es'} — opening 1 more of the same type could add ~${fmt(perBranch)}/yr.`,
    });
  }

  // 3. STOCKS — show current holding value + suggest Portfolio tab for ROI.
  //    Dollar impact = unrealized gains (we don't have that helper here
  //    without portfolioRealizedGains, but the holding value itself is the
  //    relevant "capital at work" number — we point at Portfolio for ROI).
  const stk = stockVal(s);
  if (stk > 0) {
    suggestions.push({
      id: 'stocks',
      link: 'portfolio',
      impact: stk,
      impactLabel: `${fmt(stk)} invested`,
      text: `Your stocks are worth ${fmt(stk)} — check the Portfolio tab for per-holding ROI and realized gains.`,
    });
  }

  // 4. TUITION — graduating stops the tuition expense entirely. Show the
  //    exact $/yr bleed that disappears on graduation.
  const tuitionYr = studyTuition(s);
  if (tuitionYr > 0) {
    suggestions.push({
      id: 'tuition',
      link: 'edu',
      impact: tuitionYr,
      impactLabel: `stop ${fmt(tuitionYr)}/yr`,
      text: `You're paying ${fmt(tuitionYr)}/yr in tuition — graduating would stop this expense entirely.`,
    });
  }

  // 5. UPKEEP — owned lots cost lotValue × 2% per year in upkeep (+ crew cost
  //    for Yacht / Private jet). Selling the most expensive idle lot removes
  //    its 2% slice. We surface the total upkeep + the per-year savings from
  //    selling the top lot (which is the highest-impact single sale).
  const upk = upkeep(s);
  if (upk > 0 && s.lots.length > 0) {
    // Find the lot with the highest lotValue × 0.02 component (ignoring crew
    // cost since selling a Yacht also removes the crew cost — that's an even
    // bigger save, but we want a conservative single number).
    let topLotIdx = -1, topLotSave = 0;
    s.lots.forEach((l, i) => {
      const save = lotValue(s, l) * 0.02;
      if (save > topLotSave) { topLotSave = save; topLotIdx = i; }
    });
    const topLot = topLotIdx >= 0 ? s.lots[topLotIdx] : null;
    if (topLot) {
      suggestions.push({
        id: 'upkeep',
        link: 'assets',
        impact: topLotSave,
        impactLabel: `save ${fmt(topLotSave)}/yr`,
        text: `Your asset upkeep is ${fmt(upk)}/yr across ${s.lots.length} item${s.lots.length === 1 ? '' : 's'}. Selling your highest-value item would reduce it by ~${fmt(topLotSave)}/yr.`,
      });
    }
  }

  // ============= v13.12 — FINANCIAL RELATIONSHIPS =============
  // Show the actual multiplier chain so the player can see which lever moves
  // the needle most. bizMultiplier is the most important — it amplifies ALL
  // branch income, so even a +0.05 bump there can be worth more than a new
  // branch. We break each factor out with its current value.
  // BIZ_DEGREE_BONUS / BIZ_MULTIPLIER_CAP / LEVEL_INCOME_BONUS live in
  // gameData.ts but aren't re-exported through gameDeps.ts — we hardcode the
  // stable constants here with a comment so the breakdown still renders.
  const BIZ_DEGREE_BONUS = 0.15;        // gameData.ts: +15% per business degree level
  const BIZ_MULTIPLIER_CAP = 3;          // gameData.ts: hard cap on the biz multiplier
  const LEVEL_INCOME_BONUS = 0.02;       // gameData.ts: +2% per level above 1
  const bm = bizMultiplier(s);
  const bmFactors: { label: string; value: string; raw: number }[] = [
    { label: 'Club bonus', value: '×' + clubMult(s).toFixed(2), raw: clubMult(s) },
    { label: `Degree bonus (business Lv ${s.deg.business})`, value: '×' + (1 + BIZ_DEGREE_BONUS * s.deg.business).toFixed(2), raw: 1 + BIZ_DEGREE_BONUS * s.deg.business },
    { label: 'Fame bonus', value: '×' + fameBonus(s).toFixed(3), raw: fameBonus(s) },
    { label: `Era multiplier`, value: '×' + effEraBiz(s).toFixed(2), raw: effEraBiz(s) },
    { label: `Level bonus (Lv ${s.level})`, value: '×' + levelMult(s).toFixed(2), raw: levelMult(s) },
    { label: 'Spirit bonus (≥70)', value: '×' + spiritBizMult(s).toFixed(2), raw: spiritBizMult(s) },
    { label: 'R&D boost', value: '×' + bizRndMult(s).toFixed(2), raw: bizRndMult(s) },
  ];
  const bmProduct = bmFactors.reduce((a, f) => a * f.raw, 1);  // pre-cap product
  const bmCapped = Math.min(BIZ_MULTIPLIER_CAP, bmProduct);
  const isCapped = bmProduct > BIZ_MULTIPLIER_CAP;

  // jobIncome breakdown — base salary × studyWorkMult (only for FT jobs) ×
  // zodiac affinity (per job). Show one row per active job.
  const activeJobs = jobsOf(s);
  const swMult = studyWorkMult(s);  // 0.6 if FT job while studying, else 1
  const healthM = healthMult(s);    // 0.7–1.0 based on health

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

      {/* v13.49 — Bieu do dong tien: gop 200 giao dich gan nhat (TX_CAP) theo loai tai san.
          Giai thich lai lon ma tai san tut: dong tien (tien mat vao/ra) KHAC voi
          tong tai san (tien + gia tai san/co phieu/biz - no). Khau hao + gia tai san
          tut la mat gia phi tien mat, khong hien trong dong tien. */}
      {(() => {
        const labelFor = (a: string): string => ({ stock: 'Cổ phiếu', lot: 'Vật phẩm', biz: 'Kinh doanh', branch: 'Chi nhánh', farm: 'Trang trại', fac: 'Nhà máy', space: 'Bất động sản', bank: 'Ngân hàng', gig: 'Việc vặt', job: 'Lương', tuition: 'Học phí', donate: 'Từ thiện', biz_sell: 'Bán doanh nghiệp' } as Record<string, string>)[a] || a;
        // v13.49b — TACH: van hanh (income/expense/dividend = lai that, khop P&L) vs dau tu (buy/sell = mua/ban tai san, von).
        // Truoc day gop chung nen mua chi nhanh $5,14 nghìn tỷ bi dem nhu 'tien ra', lam Ròng -$1,02 nghìn tỷ du P&L +$1,55B.
        const groups = new Map<string, { inAmt: number; outAmt: number }>();
        for (const tx of s.transactions || []) {
          if (tx.kind === 'transfer' || tx.kind === 'buy' || tx.kind === 'sell') continue;
          const g = groups.get(tx.asset) || { inAmt: 0, outAmt: 0 };
          if (tx.amount >= 0) g.inAmt += tx.amount; else g.outAmt += Math.abs(tx.amount);
          groups.set(tx.asset, g);
        }
        const rows = [...groups.entries()].map(([asset, v]) => ({ asset, label: labelFor(asset), ...v, net: v.inAmt - v.outAmt })).sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
        const maxV = Math.max(1, ...rows.map((r) => Math.max(r.inAmt, r.outAmt)));
        const txIn = rows.reduce((a, r) => a + r.inAmt, 0);
        const txOut = rows.reduce((a, r) => a + r.outAmt, 0);
        const depr = assetDepreciationYr(s);
        return (
          <div className="card" style={{ marginBottom: 10, padding: 14 }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)', marginBottom: 6 }}>💸 Dòng tiền vận hành — 200 giao dịch gần nhất (không tính mua/bán tài sản)</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
              <span className="mini">Tiền vào: <b style={{ color: 'var(--up)' }}>+{fmtFull(txIn)}</b></span>
              <span className="mini">Tiền ra: <b style={{ color: 'var(--down)' }}>−{fmtFull(txOut)}</b></span>
              <span className="mini">Ròng giao dịch: <b style={{ color: txIn - txOut >= 0 ? 'var(--up)' : 'var(--down)' }}>{txIn - txOut >= 0 ? '+' : '−'}{fmtFull(Math.abs(txIn - txOut))}</b></span>
              <span className="mini">Khấu hao tài sản / năm (không phải tiền mặt): <b style={{ color: 'var(--down)' }}>−{fmtFull(depr)}</b></span>
            </div>
            {rows.length === 0 ? <p className="sub">Chưa có giao dịch nào.</p> : rows.map((r) => (
              <div key={r.asset} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.82rem' }}>
                  <b>{r.label}</b>
                  <span className="mini">+{fmtFull(r.inAmt)} · −{fmtFull(r.outAmt)} · Ròng <b style={{ color: r.net >= 0 ? 'var(--up)' : 'var(--down)' }}>{r.net >= 0 ? '+' : '−'}{fmtFull(Math.abs(r.net))}</b></span>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                  <div style={{ height: 10, borderRadius: 5, background: 'var(--up)', width: `${Math.max(2, (r.inAmt / maxV) * 100)}%`, opacity: .85 }} />
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  <div style={{ height: 10, borderRadius: 5, background: 'var(--down)', width: `${Math.max(2, (r.outAmt / maxV) * 100)}%`, opacity: .85 }} />
                </div>
              </div>
            ))}
            <p className="mini" style={{ opacity: .7, marginTop: 8 }}>Xanh = tiền vào, đỏ = tiền ra. Chỉ tính lãi vận hành nên khớp P&L. Tiền mua/bán chi nhánh, đất, đồ là dòng đầu tư (đổi tiền ↔ tài sản, tổng tài sản không đổi) nên không tính ở đây.</p>
          </div>
        );
      })()}

      {/* v13.49 — Hoa don phai tra: thang + thue nam. Da tra thi an khoi danh sach (giữ trong s.bills, paid=true). */}
      {(() => {
        const unpaid = (s.bills || []).filter((b: Bill) => !b.paid);
        if (unpaid.length === 0) return (
          <div className="card" style={{ marginBottom: 10, padding: 14, borderLeft: '3px solid var(--sage)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)', marginBottom: 6 }}>🧾 Hóa đơn cần thanh toán</div>
            <div style={{ fontSize: '.9rem' }}>✓ Hiện không có hóa đơn chưa trả.</div>
            <p className="mini" style={{ opacity: .7, marginTop: 6 }}>Hóa đơn tháng (tiền nhà + sinh hoạt + học phí) và Thuế thu nhập năm sẽ tự hiện ở đây khi đến hạn — hạn 14/30 ngày, quá hạn phạt +2%/tháng. Chơi tiếp qua tháng / qua năm để thấy hóa đơn đầu tiên.</p>
          </div>
        );
        return (
          <div className="card" style={{ marginBottom: 10, padding: 14, borderLeft: '3px solid var(--brick)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)', marginBottom: 6 }}>🧾 Hóa đơn cần thanh toán</div>
            {unpaid.map((b: Bill) => {
              const due = billTotalDue(b);
              const daysLeft = b.dueDay - s.day;
              const overdue = daysLeft < 0;
              return (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <div style={{ fontSize: '.9rem', fontWeight: 700 }}>{b.label}{b.kind === 'tax' ? ' · Thuế' : ''}</div>
                    <div className="mini" style={{ opacity: .7 }}>
                      {overdue ? `Quá hạn ${Math.abs(daysLeft).toFixed(2)} ngày · Phạt ${fmtFull(b.penalty)}` : `Còn ${daysLeft.toFixed(2)} ngày · Hạn ngày ${b.dueDay.toFixed(2)}`}
                      {' · '}Gốc {fmtFull(b.amount)}
                    </div>
                  </div>
                  <button className="btn" style={{ background: s.money < due ? "var(--mute)" : "var(--up)", color: "#fff", fontWeight: 800, padding: "10px 16px", borderRadius: 10, cursor: s.money < due ? "not-allowed" : "pointer", border: "none" }} disabled={s.money < due} onClick={() => act((st) => { const ok = payBill(st, b.id); return ok ? null : 'Không đủ tiền để trả hóa đơn này.'; })}>
                    Trả {fmtFull(due)}
                  </button>
                </div>
              );
            })}
            <p className="mini" style={{ opacity: .7, marginTop: 8 }}>Quá hạn: +2%/tháng phạt cộng dồn. Trả chậm không bị trừ tiền tự động nữa — nhưng phạt vẫn tăng mỗi tháng.</p>
          </div>
        );
      })()}

      {/* ============= v13.12 — P&L DIAGNOSIS ============= */}
      {/* Plain-language WHY the player is (or isn't) making money, with the
          single biggest income source + single biggest expense called out.
          The goal is to make the cash-flow numbers above actionable — instead
          of just "Income $50K / Expenses $30K / Net +$20K", the player sees
          "you're profitable because Salary ($50K) > Living ($18K)" so they
          know exactly which lever to pull. */}
      <div className="card" style={{ marginBottom: 10, padding: 14, borderLeft: `3px solid ${profitable ? 'var(--sage)' : 'var(--brick)'}` }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)', marginBottom: 6 }}>🩺 P&L Diagnosis</div>
        {profitable ? (
          <div style={{ fontSize: '.9rem', lineHeight: 1.5 }}>
            <b style={{ color: 'var(--sage)' }}>You're profitable</b>{' '}
            {hasAnyIncome && topExpense ? (
              <>because total income ({fmtFull(totalInc)}/yr) exceeds total expenses ({fmtFull(totalExp)}/yr). Top income: <b style={{ color: 'var(--up)' }}>{topIncome!.label}</b> ({fmtFull(topIncome!.amount)}/yr).</>
            ) : hasAnyIncome ? (
              <>because you have <b style={{ color: 'var(--up)' }}>{topIncome!.label}</b> ({fmtFull(topIncome!.amount)}/yr) and minimal expenses.</>
            ) : (
              <>with net zero or positive — you have no expenses yet, but also no income. Start a job or business to actually grow wealth.</>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '.9rem', lineHeight: 1.5 }}>
            <b style={{ color: 'var(--brick)' }}>You're losing money</b>{' '}
            {hasAnyExpense && hasAnyIncome ? (
              <>because total expenses ({fmtFull(totalExp)}/yr) exceed total income ({fmtFull(totalInc)}/yr). Biggest expense: <b style={{ color: 'var(--down)' }}>{topExpense!.label}</b> ({fmtFull(topExpense!.amount)}/yr).</>
            ) : hasAnyExpense ? (
              <>because <b style={{ color: 'var(--down)' }}>{topExpense!.label}</b> ({fmtFull(topExpense!.amount)}/yr) is bleeding cash with no income to offset it.</>
            ) : (
              <>— expenses exceed income. Increase revenue or cut costs below.</>
            )}
          </div>
        )}
        {/* Top income + top expense quick-jump chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {topIncome && (
            <button onClick={() => onNav(topIncome.link)} style={{ cursor: 'pointer', background: 'rgba(46,158,91,.08)', border: '1px solid rgba(46,158,91,.25)', borderRadius: 8, padding: '4px 9px', fontSize: '.76rem', color: 'var(--up)', fontWeight: 700 }}>
              Top income: {topIncome.label} · {fmtFull(topIncome.amount)}/yr →
            </button>
          )}
          {topExpense && (
            <button onClick={() => onNav(topExpense.link)} style={{ cursor: 'pointer', background: 'rgba(192,57,43,.08)', border: '1px solid rgba(192,57,43,.25)', borderRadius: 8, padding: '4px 9px', fontSize: '.76rem', color: 'var(--down)', fontWeight: 700 }}>
              Top expense: {topExpense.label} · {fmtFull(topExpense.amount)}/yr →
            </button>
          )}
        </div>
      </div>

      {/* ============= v13.12 — IMPROVEMENT SUGGESTIONS ============= */}
      {/* The 5 highest-leverage levers, each with an EXACT $/yr impact so the
          player can rank them by ROI and pick the biggest mover. Complements
          the general priority-sorted financeActions() below — that section
          says "you should do X", this one says "doing X is worth exactly $Y". */}
      <h3>🎯 Improvement Suggestions</h3>
      {suggestions.length === 0 ? (
        <div className="card" style={{ marginBottom: 10, padding: 12, color: 'var(--sage)', fontWeight: 600 }}>
          ✓ No high-leverage levers right now — your finances are clean. See general actions below.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {suggestions.map(s => (
            <button key={s.id} className="card" onClick={() => onNav(s.link)} style={{
              padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
              borderLeft: '3px solid var(--accent)',
              background: 'var(--card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3, gap: 8 }}>
                <span className="tag" style={{
                  fontSize: '.68rem', fontWeight: 700,
                  background: 'var(--accent)',
                  color: '#fff',
                  padding: '1px 7px', borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>{s.impactLabel}</span>
                <span className="mini" style={{ color: 'var(--accent)', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('fo.viewTab')} →</span>
              </div>
              <div style={{ fontSize: '.86rem', lineHeight: 1.45 }}>{s.text}</div>
            </button>
          ))}
        </div>
      )}

      {/* Action suggestions (general priority-sorted list) */}
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
                                {assetDepreciationYr(s) > 0 && (
                  <tr style={{ borderTop: '1px dashed var(--line)' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 600, opacity: .75 }}>Asset depreciation (unrealized)</td>
                    <td className="num-cell" style={{ textAlign: 'right', padding: '7px 10px', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--down)', opacity: .85 }}>−{fmtFull(assetDepreciationYr(s))}<span className="mini" style={{ opacity: .6, fontWeight: 400 }}>{t('fo.perYear')}</span></td>
                    <td style={{ textAlign: 'right', padding: '7px 10px', color: 'var(--accent)', fontSize: '.74rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('fo.viewTab')} →</td>
                  </tr>
                )}
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
      {/* v13.18 — depreciation is unrealized value loss, not cash spent. It is NOT included in Expenses total above. If Net worth falls while Net cash is +, this row is usually why. */}
      <div className="mini" style={{ opacity: .65, marginTop: -6, marginBottom: 10, padding: '0 4px' }}>Asset depreciation is unrealized — no cash leaves. It explains why net worth can fall while cash-flow Net is positive.</div>

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

      {/* ============= v13.12 — FINANCIAL RELATIONSHIPS ============= */}
      {/* Show how the multipliers chain together so the player knows which
          lever moves the needle most. bizMultiplier is the master dial — it
          amplifies ALL branch income, so a +0.05 there can outweigh a new
          branch. We render the current factor breakdown + the final capped
          value, and the jobIncome factors so career players see what's
          hurting their salary (studyWorkMult 0.6 while studying FT). */}
      <div className="card" style={{ marginBottom: 10, padding: 14 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--accent)', marginBottom: 6 }}>{t('fo.relTitle')}</div>

        {/* bizMultiplier breakdown */}
        <div style={{ fontSize: '.84rem', marginBottom: 6, lineHeight: 1.45 }}>
          {t('fo.bizMultExplain', '', { cap: BIZ_MULTIPLIER_CAP })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 12px', fontSize: '.82rem', marginBottom: 8, padding: '0 4px' }}>
          {bmFactors.map(f => (
            <div key={f.label} style={{ display: 'contents' }}>
              <span className="sub">{f.label}</span>
              <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: f.raw > 1 ? 'var(--up)' : 'var(--mute)' }}>{f.value}</b>
            </div>
          ))}
          <span className="sub" style={{ borderTop: '1px solid var(--line)', paddingTop: 4, marginTop: 2 }}>{t('fo.productPreCap')}</span>
          <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--line)', paddingTop: 4, marginTop: 2 }}>×{bmProduct.toFixed(3)}</b>
          <span className="sub" style={{ fontWeight: 700 }}>{t('fo.finalMult')} {isCapped ? t('fo.capped') : ''}</span>
          <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--accent)', fontWeight: 800 }}>×{bm.toFixed(3)}</b>
        </div>
        <div className="mini" style={{ opacity: .7, marginBottom: 10 }}>
          {t('fo.bizMath', '', { rev: fmtFull(bizRevenue(s)), mult: bm.toFixed(2), gross: fmtFull(Math.max(0, bizRevenue(s) * bm)), costs: fmtFull(bizCosts(s)) })}
        </div>

        {/* jobIncome breakdown */}
        <div style={{ fontSize: '.84rem', marginBottom: 6, lineHeight: 1.45, marginTop: 8 }}>
          {t('fo.jobExplain')}
        </div>
        {activeJobs.length === 0 ? (
          <div className="mini" style={{ opacity: .7, padding: '0 4px' }}>{t('fo.noJobs')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '3px 12px', fontSize: '.82rem', marginBottom: 8, padding: '0 4px' }}>
            {activeJobs.map(j => (
              <div key={j.id} style={{ display: 'contents' }}>
                <span className="sub">{t('job.' + j.id, j.name)} base</span>
                <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtFull(j.salary)}</b>
                <span className="sub" style={{ fontSize: '.74rem', opacity: .7 }}>× studyWorkMult {j.ft ? `(${swMult.toFixed(2)})` : '(n/a — PT)'}</span>
                <b style={{ textAlign: 'right', fontSize: '.78rem', opacity: .8 }}>×{j.ft ? swMult.toFixed(2) : '1.00'}</b>
              </div>
            ))}
            <span className="sub" style={{ borderTop: '1px solid var(--line)', paddingTop: 4, marginTop: 2 }}>Health multiplier (applies to gig pay)</span>
            <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderTop: '1px solid var(--line)', paddingTop: 4, marginTop: 2 }}>×{healthM.toFixed(2)}</b>
            <span className="sub" style={{ fontWeight: 700 }}>Total job income</span>
            <b style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--up)', fontWeight: 800 }}>+{fmtFull(jobIncome(s))}/yr</b>
          </div>
        )}
        <div className="mini" style={{ opacity: .65, fontStyle: 'italic' }}>
          Note: health multiplier applies to gig pay, not regular salary. Level bonus ({(LEVEL_INCOME_BONUS * 100).toFixed(0)}%/level) is part of bizMultiplier above, not job income.
        </div>
      </div>

      <p className="mini" style={{ textAlign: 'center', opacity: .7, marginTop: 6 }}>{t('fo.tapHint')}</p>
    </>
  );
}
