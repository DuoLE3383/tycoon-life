'use client';

import { assetVal, eraOf, bizIncome, bizVal, END_AGE, fmt, type GameState, healthState, Ic, jobIncome, jobsOf, living, netWorth, RETIRE, sleepHealthMult, sleepHealthRecovery, sleepHoursOptions, socialIncome, spaceIncome, stageOf, STAGES, START, stockVal, studyPace, studyTuition, upkeep, usedItemValue, useT, xpNeed, yearIncome } from '@/components/gameDeps';
import { type Act, Btn, Row, type TFn, useEscapeKey, useReqLabel } from '@/components/shared';
import { BarChart, DonutChart } from '@/components/charts';
import { GigsPopup } from '@/components/modals/GigsPopup';
import { TravelSection, MoreInfoPopup } from '@/components/tabs/HomeTab';
import { ALLNEWS, worldYear } from '@/components/gameDeps';



// v11.28 — PinZone replaces the old AgeBox. The life overview (age + stage +
// the four "needs attention" numbers from the v11.27 dashboard) is now ONE
// compact card, PINNED to the top of the viewport (position:sticky) so the
// numbers that matter stay visible on every tab while the player scrolls.
// Warnings only render when something actually needs attention — no permanent
// "all good" banner eating vertical space.
export function PinZone({ s, t, onEdit, act, onNav, expanded, onToggleExpand }: { s: GameState; t: TFn; onEdit: () => void; act: Act; onNav: (k: string) => void; expanded: boolean; onToggleExpand: () => void }) {
  const { t: _t } = useT();
  const a = s.age, st = stageOf(a), pct = (a - START) / (END_AGE - START) * 100;
  const p = (x: number) => ((x - START) / (END_AGE - START) * 100).toFixed(2) + '%';
  const d = new Date(Date.UTC(s.byear + 18, 8, 1) + Math.floor(s.lastDay) * 864e5);
  const dstr = d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const marks: [number, string][] = [[START, String(START)], [RETIRE, '65'], [END_AGE, '90']];
  const yi = yearIncome(s);
  // v11.55 — structured warnings with severity + link, rendered as a
  // prominent banner at the TOP of the PinZone (was a single line at the
  // bottom, easy to miss). Each warning is clickable → relevant tab.
  type Warning = { id: string; key: string; severity: 'critical' | 'warn' | 'info'; link: string };
  const warns: Warning[] = [];
  if (s.health < 20) warns.push({ id: 'critical', key: 'att.critical', severity: 'critical', link: 'health' });
  else if (s.health < 40) warns.push({ id: 'low', key: 'att.low', severity: 'critical', link: 'health' });
  else if (s.health < 60) warns.push({ id: 'recover', key: 'att.recover', severity: 'warn', link: 'health' });
  if (s.sleepHours < 7) warns.push({ id: 'sleep', key: 'att.sleep', severity: 'warn', link: 'home' });
  if (s.sleepDebt > 21) warns.push({ id: 'sleepDebtHigh', key: 'sleepDebt.high', severity: 'critical', link: 'home' });
  if (s.money < 0) warns.push({ id: 'debt', key: 'att.debt', severity: 'critical', link: 'bank' });
  else if (s.money < 1000 && s.bank.dep < 1000) warns.push({ id: 'lowCash', key: 'att.lowCash', severity: 'warn', link: 'bank' });
  if (yi < 0) warns.push({ id: 'negative', key: 'att.negative', severity: 'critical', link: 'finance-overview' });
  if (s.bank.loan > netWorth(s) * 0.3) warns.push({ id: 'highLoan', key: 'att.highLoan', severity: 'warn', link: 'bank' });
  if (!s.diet && s.health < 70) warns.push({ id: 'diet', key: 'att.diet', severity: 'info', link: 'health' });
  // v13.49 — banner hoa don: hien moi tab (PinZone pin tren cung). Khong dung t(key)
  // de khoi them key dich: text tieng Viet truc tiep.
  const unpaidBills = (s.bills || []).filter((b) => !b.paid);
  const overdueBills = unpaidBills.filter((b) => s.day > b.dueDay);
  const billsDueTotal = unpaidBills.reduce((a, b) => a + b.amount + b.penalty, 0);
  const activeJobs = jobsOf(s);
  const activeStudies = [s.study, s.sideStudy].filter((study): study is NonNullable<typeof study> => !!study);
  const studyTxt = activeStudies.length
    ? activeStudies.map(study => `${study.name} · ${Math.max(0, (study.end - s.day) / 365.25).toFixed(1)} ${t('years')}`).join(' · ')
    : t('notStudying');
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  // v11.42 — sleep + asset + income data (merged from HomeTab cards)
  // v11.49 — also surface recovery rate at 7h+ (separate from decay mult).
  const healthChange = Math.round((sleepHealthMult(s.sleepHours) - 1) * 100);
  const recoveryRate = sleepHealthRecovery(s.sleepHours);
  const healthChangeText = recoveryRate > 0
    ? `+${(recoveryRate * 100).toFixed(0)}%/day recovery`
    : `${healthChange > 0 ? '+' : ''}${healthChange}%`;
  const incRows: [string, number][] = [
    [t('inc.salary'), jobIncome(s)],
    [t('inc.biz'), bizIncome(s)],
    [t('inc.social'), socialIncome(s)],
    [t('inc.space'), spaceIncome(s)],
    [t('inc.pension'), s.age >= RETIRE ? 18000 : 0],
  ];
  const cash = Math.max(0, s.money);
  const stocks = Math.max(0, stockVal(s));
  const property = Math.max(0, assetVal(s));
  const biz = Math.max(0, bizVal(s));
  const bank = Math.max(0, s.bank.dep);
  const used = s.used.reduce((acc, u) => acc + usedItemValue(s, u), 0);
  const totalAssets = Math.max(1, cash + stocks + property + biz + bank + used);
  const assetSegs: [string, number, string][] = [
    [t('asset.cash'), cash, '#d4a55a'],
    [t('asset.stocks'), stocks, '#4a9d7f'],
    [t('asset.property'), property, '#5b8ab0'],
    [t('asset.biz'), biz, '#b8704a'],
    [t('asset.bank'), bank, '#8a7ab5'],
    [t('asset.used'), used, '#c46b5e'],
  ];
  const nw = netWorth(s);
  // v13.31 - Quick actions gom ve giua, duoi Social Media: Travel / More / Quick gigs + Followers
  const { lang } = useT();
  const _y = worldYear(s), _news = ALLNEWS[_y] || [];
  const _timelineLocale = { en: 'en-US', vi: 'vi-VN', zh: 'zh-CN' }[lang];
  const healthColor = s.health < 20 ? 'var(--brick)' : s.health < 40 ? 'var(--amber, #c47b2c)' : s.health < 60 ? 'var(--warn, #d8b13a)' : 'var(--sage)';
  // v12.13 — mobile-first collapse. When NOT expanded the .pinzone-collapsed
  // class is applied; the @media (max-width:700px) rules in globals.css hide
  // the warning banner + dash-charts + age track + marks. Desktop is untouched
  // (no rule outside the media block, so the class is a no-op on wide screens).
  return (
    <section className={'card age pinzone pinzone-v55' + (expanded ? '' : ' pinzone-collapsed')} data-life={healthState(s.health)}>
      {/* v11.55 — WARNING BANNER at the top (was at the bottom, easy to miss).
          Each warning is a clickable chip → relevant tab. Critical = red,
          warn = orange, info = muted. */}
      {unpaidBills.length > 0 && (
        <div role="status" aria-live="polite" onClick={() => onNav('finance-overview')} style={{ cursor: 'pointer', marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: overdueBills.length > 0 ? 'rgba(192,57,43,.12)' : 'rgba(212,165,90,.14)', border: `1px solid ${overdueBills.length > 0 ? 'rgba(192,57,43,.5)' : 'rgba(212,165,90,.5)'}` }}>
          <span>{overdueBills.length > 0 ? '🔴' : '🟠'}</span>{' '}
          <b>{overdueBills.length > 0 ? `Có ${overdueBills.length} hóa đơn quá hạn!` : `Có ${unpaidBills.length} hóa đơn cần thanh toán`}</b>{' '}
          <span className="mini">— tổng {fmt(billsDueTotal)}{overdueBills.length > 0 ? ' (đã gồm tiền phạt)' : ''} · bấm để trả →</span>
        </div>
      )}
      {warns.length > 0 && (
        <div className="pinzone-warns" role="status" aria-live="polite">
          {warns.map(w => (
            <button key={w.id} className={'pwarn pwarn-' + w.severity} onClick={() => onNav(w.link)}>
              <span className="pwarn-ic">{w.severity === 'critical' ? '🔴' : w.severity === 'warn' ? '🟠' : 'ℹ️'}</span>
              <span className="pwarn-tx">{t(w.key)}</span>
              <span className="pwarn-go">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Row 1: Identity — avatar + name + edit + age + stage + date */}
      <div className="agehead identity-row">
        <span className="avchip" data-tip={t('edit.profile', 'Cài đặt / Đổi nhân vật')}>{s.avatar}</span>
        <b>{s.name}</b>
        {/* v12 — small UID chip next to the name. Surfaces the player's stable
            life identifier (used by the social layer + admin dashboard) without
            dominating the bar. Last 6 chars are usually enough to tell two
            same-name players apart in a glance; the full UID is on the admin
            dashboard player list. Empty on fresh games (pre-begin) — hidden. */}
        {s.uid && <code className="uid-chip" title={`UID: ${s.uid}`}>{s.uid.slice(-6)}</code>}
        <button className="pin-edit" onClick={onEdit} title={t('edit.profile', 'Cài đặt / Đổi nhân vật')} aria-label={t('edit.profile', 'Cài đặt / Đổi nhân vật')}>✏️</button>
        <span className="sep">·</span>
        <span className="mini">{t('age')} {Math.floor(a)}</span>
        <span className="tag dark">{t('stage.' + STAGES.indexOf(st), st.name)}</span>
        <span className="mini" style={{ marginLeft: 'auto' }}>{dstr}</span>
        {/* v12.13 — mobile-only collapse toggle. Hidden on desktop via CSS
            (.pinzone-toggle {display:none} at root, shown in @media). Tapping
            flips pzExpanded in the parent, which toggles .pinzone-collapsed. */}
        <button type="button" className="pinzone-toggle"
          onClick={onToggleExpand}
          aria-label={expanded ? 'Collapse dashboard' : 'Expand dashboard'}
          aria-expanded={expanded}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Row 2: Key stats — bigger chips, clear grouping, color-coded */}
      <div className="agehead stats-row">
        <span className={'cash-chip' + (s.money < 1000 ? ' low' : '')} data-tip={t('cash')}><Ic id="s-coin" className="bsi" />{fmt(s.money)}</span>
        <span className={'hpill hpill-big'} data-life={healthState(s.health)} style={{ color: healthColor }} title={t('health')}>
          <Ic id="w-heart" className="bsi" />{Math.round(s.health)}
        </span>
        <span className="hpill hpill-big"><Ic id="w-lotus" className="bsi" />{Math.round(s.spirit)}</span>
        <span className="pchip pchip-big" data-tip={`Lv ${s.level} · ${s.xp}/${xpNeed(s.level)} XP (${xpPct}%)`}>⭐ {s.level}</span>
        {(nw > 0 || yi !== 0) && <span className="pchip pchip-big nw-chip" data-tip={t('netWorth')}><Ic id="t-bank" className="bsi" />{fmt(nw)}</span>}
        {yi !== 0 && <span className={'pchip pchip-big income-chip ' + (yi >= 0 ? 'up' : 'down')} data-tip={t('inc.total', 'Income/yr')}>{yi >= 0 ? '+' : ''}{fmt(yi)}{t('perYear')}</span>}
      </div>

      {/* Row 3: Charts — bigger donut + bar + sleep, 3-col desktop / 1-col mobile */}
      {nw > 0 && (
        <div className="dash-charts" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Asset donut chart */}
          <button className="dash-chart-box nav-link" onClick={() => onNav('assets')}>
            <span className="mini wl">{t('netWorth')} · {fmt(nw)}</span>
            <div className="dash-chart-wrap">
              <DonutChart size={72} segs={assetSegs.filter(([, v]) => v > 0).map(([label, value, color]) => ({ label, value, color }))} />
              <div className="dash-chart-legend">
                {assetSegs.filter(([, v]) => v > 0).map(([label, v, color]) => (
                  <span key={label} className="asset-leg-item"><span className="sw" style={{ background: color }} />{label} <b>{fmt(v)}</b></span>
                ))}
              </div>
            </div>
          </button>
          {/* Income bar chart - v13.49c: doi xuong duoi Net Worth (cot trai), khoi cot giua */}
          <button className="dash-chart-box nav-link" onClick={() => onNav('finance-overview')}>
            <span className="mini wl">{t('incomeBreakdown')} · +{fmt(yi)}{t('perYear')}</span>
            <div className="dash-chart-wrap">
              <BarChart
                rows={incRows.filter(([, v]) => v > 0).map(([label, value]) => ({ label, value, color: '#4a9d7f' }))}
                maxVal={Math.max(...incRows.map(([, v]) => v), 1)}
              />
            </div>
          </button>
          </div>
          {/* Quick info: sleep + identity */}
          <div className="dash-chart-box">
            <div className="pinzone-sleep sleep-card-v2">
              {/* Block 1 — Status: giờ ngủ + badge */}
              <div className="sleep-block sleep-status">
                <label className="mini wl" htmlFor="sleep-hours-pin">{t('sleepSchedule')}</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <select id="sleep-hours-pin" value={s.sleepHours} onChange={e => act(st => { st.sleepHours = Number(e.target.value); return t('sleepSet', '', { n: st.sleepHours }); })}>
                    {sleepHoursOptions.map(hours => <option key={hours} value={hours}>{hours} {t('sleepHourUnit')}{hours === 12 ? ' ✓' : ''}</option>)}
                  </select>
                  <span className="tag" style={{ background: s.sleepHours >= 7 ? 'var(--up)' : s.sleepHours >= 5 ? 'var(--warn, #c47b2c)' : 'var(--brick)', color: '#fff' }}>
                    {s.sleepHours >= 7 ? t('sleep.rested') : s.sleepHours >= 5 ? t('sleep.tired') : t('sleep.exhausted')}
                  </span>
                </div>
              </div>
              {/* Block 2 — Effects: Study / Health riêng, không gộp chuỗi */}
              <div className="sleep-block sleep-effects">
                <span className="mini" style={{ color: '#7BC9A2' }}>{t('sleep.studyPace', '', { p: Math.round((studyPace(s.sleepHours) - 1) * 100) })}</span>
                <span className="mini" style={{ color: Number(healthChange) < 0 ? 'var(--brick)' : 'var(--mute)' }}>{t('sleep.healthEffect', '', { h: healthChangeText })}</span>
              </div>
              {/* Block 3 — Debt: chỉ hiện khi > 0 */}
              {s.sleepDebt > 0 && (
                <div className="sleep-block sleep-debt">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: s.sleepDebt > 21 ? 'var(--brick)' : s.sleepDebt > 7 ? 'var(--warn, #c47b2c)' : 'var(--mute)' }}>
                      {t('sleepDebt')}: {Math.round(s.sleepDebt)}h
                    </span>
                    <span className="tag" style={{ fontSize: 9, background: s.sleepDebt > 21 ? 'var(--brick)' : s.sleepDebt > 7 ? 'var(--warn, #c47b2c)' : 'var(--mute)', color: '#fff' }}>
                      {s.sleepDebt > 21 ? t('sleepDebt.high') : s.sleepDebt > 7 ? t('sleepDebt.mid') : t('sleepDebt.low')}
                    </span>
                  </div>
                  <div style={{ color: 'var(--mute)' }}>{t('sleepDebtNote')}</div>
                </div>
              )}
            </div>
            {/* Block riêng — Jobs / Study / Rent, không nhét vào Sleep nữa */}
            <div className="pinzone-bills">
              {activeJobs.length > 0 && <span className="sub">{activeJobs.map(j => t('job.' + j.id, j.name)).join(' + ')}</span>}
              {activeStudies.length > 0 && <span className="sub">{studyTxt}</span>}
              <span className="sub">{t('rentBills')}: {fmt((living(Math.floor(s.age)) + upkeep(s) + studyTuition(s)) / 12)}{t('perMonth')}</span>
            </div>
          </div>
        </div>
      )}

      {/* v13.34 - Actions: hang rieng full-width, khong nhet vao cot giua */}
      <div className="pin-actions-bar">
        <span className="pin-followers">👥 <b>{s.social.followers.toLocaleString('vi-VN')}</b> <span>{t('followers')}</span> <em>+{fmt(socialIncome(s))}{t('perYear')}</em></span>
        <span className="pin-actions-btns">
          <GigsPopup s={s} act={act} t={t} />
          <TravelSection s={s} act={act} t={t} />
          <MoreInfoPopup s={s} t={t} lang={lang} eraName={(y: number) => eraOf(y).name} y={_y} news={_news} timelineLocale={_timelineLocale} onNav={onNav} />
        </span>
      </div>

      {/* Row 4: Age track */}
      <div className="track slim" style={{ background: `linear-gradient(90deg,#8fae9b 0 ${p(22)},#c9b68e ${p(22)} ${p(26)},#c08a80 ${p(26)} ${p(RETIRE)},#9b93a8 ${p(RETIRE)})` }}>
        <div className="shade" style={{ left: pct + '%' }} /><div className="mark" style={{ left: pct + '%' }} />
      </div>
      <div className="ms">{marks.map(([m, lb]) => <span key={lb + m} style={{ left: p(m) }}>{lb}</span>)}</div>
    </section>
  );
}
