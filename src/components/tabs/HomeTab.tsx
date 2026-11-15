'use client';

import { ACHIEVEMENTS, ALLNEWS, Art, asset, assetVal, bizIncome, bizVal, dateOf, eraOf, fmt, type GameState, Ic, jobIncome, jobsOf, RETIRE, sleepHealthMult, sleepHealthRecovery, socialIncome, spaceIncome, stockVal, travel, TRAVEL, travelCooldownLeft, travelReady, useEffect, useState, useT, worldYear, xpNeed, yearIncome } from '@/components/gameDeps';
import { type Act, Btn, Row, type TFn, useEscapeKey, useReqLabel } from '@/components/shared';
import { HealthAlerts } from '@/components/tabs/HealthTab';
import { createPortal } from 'react-dom';



// ================= v11.40 — TRAVEL SECTION =================
export function TravelSection({ s, act, t }: { s: GameState; act: Act; t: TFn }) {
  const [open, setOpen] = useState(false);
  // v11.50 — Esc-to-close.
  useEscapeKey(() => setOpen(false), open);
  const close = () => setOpen(false);
  return (
    <>
      <button className={'gigs-trigger'} style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 50%),var(--slate)', borderColor: 'var(--slate)', color: '#fff' }} onClick={() => setOpen(o => !o)}>
        <Art id="i-jet" className="si" />
        <span>{t('travel.title', 'Travel')}</span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="tgame">
        <div className="modal-overlay" onClick={close}>
          <div className="modal-box gigs-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>✈️ {t('travel.title', 'Travel')}</h2>
              <button className="modal-x" onClick={close} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <p className="mini" style={{ marginBottom: 10 }}>{t('travel.intro', 'Take a trip to refresh your spirit and health.')}</p>
              {TRAVEL.map(d => {
                const ready = travelReady(s, d.id);
                const cdLeft = travelCooldownLeft(s, d.id);
                const locked = d.minLevel && s.level < d.minLevel;
                return (
                  <div key={d.id} className="card" style={{ marginBottom: 8, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Art id={d.icon} />
                      <div style={{ flex: 1 }}>
                        <b>{t('travel.dest.' + d.id, d.nameVi)}</b>
                        <div className="mini">{t('travel.days', '{n} days', { n: d.days })} · {fmt(d.cost)}</div>
                      </div>
                      <Btn ic="i-jet" label={t('travel.go', 'Travel')} kind={ready ? 'sageb' : 'ghost'} disabled={!ready}
                        onClick={() => act(st => travel(st, d.id))} />
                    </div>
                    <div className="mini" style={{ marginTop: 4 }}>
                      {t('travel.spiritBoost', 'Spirit +{n}', { n: d.spirit })}
                      {' · '}{t('travel.healthBoost', 'Health +{n}', { n: d.health })}
                      {d.fame > 0 && ' · ' + t('travel.fameBoost', 'Fame +{n}', { n: d.fame })}
                      {locked && ` · 🔒 ${t('requires', 'Requires')} ${t('lvl', 'Lv')} ${d.minLevel}`}
                      {!ready && !locked && cdLeft > 0 && ` · ⏳ ${cdLeft}d`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>,
        document.body,
      )}
    </>
  );
}



// ================= HOME =================
export function HomeTab({ s, act, askAI, aiBusy, aiNote, eraName, onNav }: { s: GameState; act: Act; askAI: () => void; aiBusy: boolean; aiNote: string; eraName: (y: number) => string; onNav: (k: string) => void }) {
  const { t, lang } = useT();
  const y = worldYear(s), era = eraOf(y), news = ALLNEWS[y] || [];
  const activeJobs = jobsOf(s);
  const activeStudies = [s.study, s.sideStudy].filter((study): study is NonNullable<typeof study> => !!study);
  const studyTxt = activeStudies.length
    ? activeStudies.map(study => `${study.name} · ${Math.max(0, (study.end - s.day) / 365.25).toFixed(1)} ${t('years')}`).join(' · ')
    : t('notStudying');
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  // v11.49 — surface recovery rate at 7h+ (separate from decay mult).
  const healthChange = Math.round((sleepHealthMult(s.sleepHours) - 1) * 100);
  const recoveryRate = sleepHealthRecovery(s.sleepHours);
  const healthChangeText = recoveryRate > 0
    ? `+${(recoveryRate * 100).toFixed(0)}%/day recovery`
    : `${healthChange > 0 ? '+' : ''}${healthChange}% decay`;
  const timelineLocale = { en: 'en-US', vi: 'vi-VN', zh: 'zh-CN' }[lang];
  const incRows: [string, number][] = [
    [t('inc.salary'), jobIncome(s)],
    [t('inc.biz'), bizIncome(s)],
    [t('inc.social'), socialIncome(s)],
    [t('inc.space'), spaceIncome(s)],
    [t('inc.pension'), s.age >= RETIRE ? 18000 : 0],
  ];
  const assetRows: [string, number][] = [
    [t('asset.cash'), s.money],
    [t('asset.stocks'), stockVal(s)],
    [t('asset.property'), assetVal(s)],
    [t('asset.biz'), bizVal(s)],
    [t('asset.bank'), s.bank.dep],
    [t('asset.loans'), -s.bank.loan],
  ];
  return (
    <>
      {/* v11.47 — HomeTab is now MINIMAL. The dashboard (PinZone) is above
          and contains all charts + stats. HomeTab only has:
          - Health alerts (compact, only shows when warnings exist)
          - Tutorial hint (only for new players)
          - Quick action buttons (gigs, travel)
          - "More info" popup for guide/news/achievements/timeline/log
          No scrolling needed for the main dashboard. */}
      <HealthAlerts s={s} />

      {s.money < 500 && yearIncome(s) === 0 && Object.keys(s.gigs || {}).length === 0 && (
        <div className="tutorial-hint" role="status">
          <b>👋 {t('tutorial.welcome', 'Welcome! First steps')}</b>
          <p className="sub">{t('tutorial.gigHint', 'Tap "Quick gigs" to earn your first cash')}</p>
        </div>
      )}

      {/* v13.31 - Travel / More / Quick gigs da gom ve PinZone, duoi Social Media. Khong render o day nua de khoi trung nut. */}

      {/* v12 — compact rotating Tips card. One tip at a time, advances every
          30 seconds (or sooner if the user clicks a dot). Six curated tips
          point at underused features (used market, sleep recovery, savings
          interest, franchising, tuition discount, Finance Overview tab). */}
      <TipsCard t={t} onNav={onNav} />

      {aiBusy && <p className="sub">{t('oracle.thinking')}</p>}
      {!aiBusy && aiNote && <p className="sub">{aiNote}</p>}
    </>
  );
}



// ================= v12 — TIPS CARD =================
// Compact rotating-tips card below the HomeTab quick actions. One tip visible
// at a time, advances every 30 seconds OR when the user clicks a dot. Six
// curated evergreen tips that point at underused features (used market, sleep
// recovery, savings interest, franchising, tuition discount, Finance Overview).
// The whole card stays small (single row + dots) so it doesn't push the rest
// of the dashboard down. Tapping the card body navigates to the relevant tab.
const TIP_KEYS = ['tip.1', 'tip.2', 'tip.3', 'tip.4', 'tip.5', 'tip.6'] as const


// Each tip's "go to" tab — tapping the card body navigates here.
const TIP_LINKS: Record<string, string> = {
  'tip.1': 'assets',        // used market lives in the assets tab
  'tip.2': 'home',          // sleep schedule is on the PinZone / home
  'tip.3': 'bank',          // savings → bank tab
  'tip.4': 'biz',           // franchise a branch → biz tab
  'tip.5': 'edu',           // study → edu tab
  'tip.6': 'finance-overview', // finance overview tab
}


const TIP_ICONS: Record<string, string> = {
  'tip.1': '💡', 'tip.2': '😴', 'tip.3': '🏦',
  'tip.4': '🏪', 'tip.5': '🎓', 'tip.6': '📊',
}


export function TipsCard({ t, onNav }: { t: TFn; onNav: (k: string) => void }) {
  // v12.12 — start at index 0 on both server and client to avoid React #418
  // hydration mismatch (Math.random() in the initializer gave server and
  // client different tip text). The useEffect below picks a random index
  // AFTER hydration, so the first paint matches and the rotation still feels
  // random per session.
  const [idx, setIdx] = useState(0);
  // v12 — advance every 30 seconds. Re-uses one interval; cleanup on unmount.
  // The index wraps via modulo so it always lands on a valid tip.
  useEffect(() => {
    // After hydration, jump to a random tip so different sessions start on
    // different tips (preserves the v11.39 UX intent without breaking SSR).
    setIdx(Math.floor(Math.random() * TIP_KEYS.length));
    const iv = setInterval(() => setIdx(i => (i + 1) % TIP_KEYS.length), 30000);
    return () => clearInterval(iv);
  }, []);
  const key = TIP_KEYS[idx];
  const link = TIP_LINKS[key];
  return (
    <div className="tips-card" role="status">
      <span className="tips-ic">{TIP_ICONS[key]}</span>
      {/* key={key} forces the fade animation to re-trigger on each rotation */}
      <button className="tips-tx" key={key} onClick={() => onNav(link)} style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', color: 'inherit', font: 'inherit' }}>
        {t(key)} <span className="mini" style={{ marginLeft: 6, color: 'var(--accent)', fontWeight: 700 }}>→</span>
      </button>
      <span className="tips-dots" aria-hidden>
        {TIP_KEYS.map((k, i) => (
          <span key={k} className={'tips-dot' + (i === idx ? ' on' : '')} onClick={() => setIdx(i)} style={{ cursor: 'pointer' }} />
        ))}
      </span>
    </div>
  );
}



// ================= v11.47 — MORE INFO POPUP =================
// Consolidates guide, world news, ecosystem, achievements, timeline, life log
// into ONE popup so the home tab doesn't scroll. Accessible via a "More" button.
export function MoreInfoPopup({ s, t, lang, eraName, y, news, timelineLocale, onNav }: {
  s: GameState; t: TFn; lang: string; eraName: (y: number) => string; y: number;
  news: string[]; timelineLocale: string; onNav: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'guide' | 'news' | 'ach' | 'timeline' | 'log'>('guide');
  // v11.50 — Esc-to-close + click-outside.
  useEscapeKey(() => setOpen(false), open);
  const close = () => setOpen(false);
  return (
    <>
      <button className="gigs-trigger" style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.12) 0%,rgba(255,255,255,0) 50%),var(--slate)', borderColor: 'var(--slate)', color: '#fff' }} onClick={() => setOpen(true)}>
        <Art id="ic-link" className="si" />
        <span>{t('more.btn', 'More')}</span>
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="tgame">
        <div className="modal-overlay" onClick={close}>
          <div className="modal-box gigs-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-head">
              <h2>📋 {t('more.title', 'More info')}</h2>
              <button className="modal-x" onClick={close} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              <div className="nav-popups" style={{ marginBottom: 10 }}>
                {(['guide', 'news', 'ach', 'timeline', 'log'] as const).map(sec => (
                  <button key={sec} className={'nav-popup-btn' + (section === sec ? ' on' : '')} onClick={() => setSection(sec)}>
                    <span>{sec === 'guide' ? t('guide') : sec === 'news' ? t('inWorld', '', { y, era: eraName(y) }) : sec === 'ach' ? t('achTitle') : sec === 'timeline' ? t('dailyTimeline') : t('lifeLog')}</span>
                  </button>
                ))}
              </div>
              {section === 'guide' && (
                <div>
                  {/* v11.54 — guide images are now clickable: tap one to jump
                      straight to the Business tab to start that venture. */}
                  <div className="imgs">
                    {[['/img/cafe.jpg', 'biz.cafe', 'biz'], ['/img/farm.jpg', 'biz.farm', 'biz'], ['/img/factory.jpg', 'biz.fac', 'biz'], ['/img/tech.jpg', 'biz.tech', 'biz'], ['/img/hotel.jpg', 'biz.hotel', 'biz']].map(([src, k, link]) => (
                      <button key={src} className="imcard nav-link" style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0, textAlign: 'left' }}
                        onClick={() => { close(); onNav(link); }}>
                        <img src={asset(src)} alt={t(k)} loading="lazy" />
                        <span>{t(k)} <span className="mini" style={{ color: 'var(--accent)', fontWeight: 700 }}>→</span></span>
                      </button>
                    ))}
                  </div>
                  <p className="sub">{t('guide.1')}</p><p className="sub">{t('guide.2')}</p><p className="sub">{t('guide.3')}</p>
                  <p className="sub">{t('guide.4')}</p><p className="sub">{t('guide.5')}</p><p className="sub">{t('guide.6')}</p><p className="sub">{t('guide.7')}</p>
                </div>
              )}
              {section === 'news' && (
                <div>{news.length ? news.map(n => <p className="news" key={n}>• {n}</p>) : <p className="news">• {t('quietYear', '', { era: eraName(y) })}</p>}</div>
              )}
              {section === 'ach' && (
                <div>
                  <p className="mini" style={{ marginBottom: 8 }}>{t('achNote')}</p>
                  <div className="achgrid">
                    {ACHIEVEMENTS.map(a => {
                      const on = s.ach.includes(a.id);
                      return <div key={a.id} className={'ach' + (on ? ' on' : '')}>{Ic({ id: on ? 'ic-trophy' : 'ic-lock', className: 'si' })}<span><b>{t('ach.' + a.id)}</b><span className="sub" style={{ display: 'block' }}>{t('achd.' + a.id)}</span></span></div>;
                    })}
                  </div>
                </div>
              )}
              {section === 'timeline' && (
                <div className="feed">
                  {[...s.timeline].reverse().slice(0, 45).map(({ day, entries }) => (
                    <div key={day}>
                      <b>{dateOf(s, day).toLocaleDateString(timelineLocale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</b>
                      {entries.map((entry, index) => <div key={index} style={{ padding: '4px 0 0 10px' }}>{entry}</div>)}
                    </div>
                  ))}
                  <p className="mini">{t('timelineNote')}</p>
                </div>
              )}
              {section === 'log' && (
                <div className="feed">{s.log.slice(-16).reverse().map((x, i) => <div key={i}>{x}</div>)}</div>
              )}
            </div>
          </div>
        </div>
        </div>,
        document.body,
      )}
    </>
  );
}
