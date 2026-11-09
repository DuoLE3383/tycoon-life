'use client';
// MOGUL v10.4 — React edition. Two-level grouped nav, a systems links map,
// gigs, levels, social, the cosmic frontier, EN/VI/中文, LLM oracle with
// random kind dispatch (luck / setback / life-stage / story), pre-owned
// market + social listings, and a Hall of Fame tab.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Art, Ic, ART_DEFS } from '@/lib/art';
import { useGame, getState, persist, bump, resetState, reincarnateState } from '@/lib/store';
import {
  START, END_AGE, RETIRE, RESALE_FEE, FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, ALLNEWS, eraOf, NATIONS, INTERESTS, TALENTS, PATHS,
  analyze, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES, BIZ, FARM_LINES, FAC_LINES, ITEM_BY, ITEM_IMAGES, USED_IMAGES, STOCKS, ASSET_DEPRECIATION_RATE,
  CLUBS, JOBS, GIGS, SPACE_LINES, TABS, GROUPS, xpNeed, ITEMS, USED_MARKET, HALL_OF_FAME, itemRarity, RARITY_COLOR, NPCS, NPC_BY, PETS, PET_BY, MAX_PETS, type Rarity, type FieldKey, type Req,
} from '@/lib/gameData';
import {
  fmt, taxOf, fresh, begin, tick, stageOf, worldYear, branchCount, bizCost, clubMult, branchNet, fameBonus, bizMultiplier,
  bizIncome, yearIncome, living, lotValue, upkeep, assetVal, bizVal, stockVal, netWorth,
  effYears, tuitionOf, meets, reqText, knowledgeText, snapshot, dateOf,
  processDay, yearEnd,
  doGig, gigReady, gigLock, gigPay, addPost, buySpace, spaceIncome, socialIncome, levelMult,
  openBranch, buyFarmLine, buyFacLine, buyItem, sellLot, trade, joinClub, foundClub,
  hire, enrollDeg, enrollLic, bankOp, donate, applyEventChoice, applyAIChoice, currentEvent, studyWorkMult,
  spaceUpgradeReady, startSpaceUpgrade, spaceUpgradeDays, spaceMultiplier, SPACE_TRAVEL_COST,
  recordActivity, studyPace, sleepHealthMult, sleepHoursOptions,
  gameOverTier, botRows, type AIEvent, type AIEventKind, type GameState,
  doWell, toggleDiet, wellReady, wellLeft, healthMult, healthState, healthWarnings, spiritState, decayPerYear,
  jobsOf, jobIncome, studyTuition, type Religion, RELIGIONS,
  spiritBizMult, cosmicMult, GYM_COST, GYM_CD, CHECKUP_COST, CHECKUP_CD, DIET_COST,
  TEMPLE_COST, TEMPLE_CD, RETREAT_COST, RETREAT_CD, FAITH_PRACTICE_COST, FAITH_PRACTICE_CD,
  ACHIEVEMENTS, checkAch,
  buyUsedItem, sellUsed, usedItemValue, postItemListing, playerHallEntry, recordHallOnGameOver,
  auctionItem, repairLot, repairUsed, repairSkill, repairCost,
  choiceRisk, type ChoiceRisk,
  creativePost,
  relationState, interactNPC, proposeToNPC,
  adoptPet, careForPet, abandonPet, petFameBonus,
} from '@/lib/engine';
import { localTwist, pickKind } from '@/lib/story';
import { useT, LANGS, type Lang } from '@/lib/i18n';

const asset = (p: string) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + p;

// Test/debug hook: lets automation (and power users) drive the engine from the console.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__tycoon = {
    getState, persist, bump, processDay, yearEnd, spaceIncome, tick,
  };
}

export default function Page() {
  const { s } = useGame();
  const { t } = useT();
  const [tab, setTab] = useState('home');
  const [lastTab, setLastTab] = useState<Record<string, string>>({});
  const activeGroup = GROUPS.find(g => g[3].some(([k]) => k === tab))?.[0] || 'life';
  const curSubs = (GROUPS.find(g => g[0] === activeGroup) || GROUPS[0])[3];
  const [rankBoard, setRankBoard] = useState<'all' | 'young' | 'industry' | 'nation'>('all');
  const [curCat, setCurCat] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNoteKey, setAiNoteKey] = useState('oracle.note');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const achToast = useCallback((got: string[]) => {
    const names = got.map(id => t('ach.' + id));
    showToast(names.length === 1 ? t('ach.unlocked', '', { n: names[0] }) : names.join(' · '));
  }, [showToast, t]);

  const act = useCallback((fn: (st: GameState) => string | null | void) => {
    const st = getState();
    const msg = fn(st);
    if (typeof msg === 'string' && msg) {
      showToast(msg);
      recordActivity(st, msg);
    }
    const got = checkAch(st);
    if (got.length) achToast(got);
    persist(); bump();
  }, [showToast, achToast]);

  // game clock
  useEffect(() => {
    let last = Date.now();
    let lastPersist = last;
    const iv = setInterval(() => {
      const st = getState();
      if (document.hidden) { last = Date.now(); return; }
      const now = Date.now();
      const res = tick(st, now - last);
      last = now;
      if (res.yearToast) showToast(res.yearToast);
      if (res.gameJustOver) showToast(t('livedToast'));
      const got = checkAch(st);
      if (got.length) achToast(got);
      if (now - lastPersist >= 3000) {
        persist();
        lastPersist = now;
      }
      bump();
    }, 250);
    const onVis = () => { last = Date.now(); };
    const onUnload = () => persist();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      persist();
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [showToast, achToast, t]);

  const askAI = useCallback(async () => {
    setAiBusy(true); setAiNoteKey('oracle.thinking');
    const st = getState();
    // v10.4 — pick a kind FIRST so the popup is randomly one of:
    //   luck / badluck / lifestage / story
    // The chosen kind is sent to the LLM prompt (when reachable) and to the
    // local template fallback so both stay aligned.
    const snap = snapshot(st);
    const kind: AIEventKind = pickKind(snap);
    let ev: AIEvent | null = null;
    // Static GitHub Pages build ships NEXT_PUBLIC_HAS_BACKEND=0 → the built-in
    // story engine answers instantly. Self-hosted builds (npm dev/start) call
    // the real LLM endpoint at /api/story and fall back locally on failure.
    const hasBackend = process.env.NEXT_PUBLIC_HAS_BACKEND !== '0';
    if (hasBackend) {
      try {
        const res = await fetch(asset('/api/story'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: snap, used: st.story.used, kind })
        });
        if (res.ok) {
          const j = await res.json();
          if (j && j.title && j.choices) ev = { ...j, source: j.source || 'backend', kind: j.kind || kind };
        }
      } catch { /* fall through to local */ }
    }
    if (!ev) { try { ev = localTwist(snap, st.story.used, kind); } catch { ev = null; } }
    if (ev) {
      st.aiEv = ev;
      setAiNoteKey(
        ev.source === 'backend-local' ? 'oracle.backend-local'
        : ev.source === 'backend' ? 'oracle.backend'
        : 'oracle.local'
      );
      bump(); persist();
    } else setAiNoteKey('oracle.fail');
    setAiBusy(false);
  }, []);

  const stageName = (st: GameState) => t('stage.' + STAGES.indexOf(stageOf(st.age)), stageOf(st.age).name);
  const eraName = (y: number) => t('era.' + eraOf(y).from, eraOf(y).name);

  return (
    <div className="tgame">
      <div dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
      <div className="wrap">
        <Header s={s} eraName={eraName} />
        <AgeBox s={s} t={t} />
        <nav role="tablist" className="tnav gnav" aria-label="Sections">
          {GROUPS.map(([gid, gn, gic, subs]) => (
            <button key={gid} role="tab" aria-selected={activeGroup === gid} data-g={gid}
              onClick={() => setTab(lastTab[gid] || subs[0][0])}>
              {Ic({ id: gic, className: 'si navsi' })}{t('grp.' + gid, gn)}
            </button>
          ))}
        </nav>
        <nav role="tablist" className="tnav subnav" aria-label="Sub-sections">
          {curSubs.map(([k, n, ic]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-t={k}
              onClick={() => { setTab(k); setLastTab(lt => ({ ...lt, [activeGroup]: k })); }}>
              {Ic({ id: ic, className: 'si navsi' })}{t('tab.' + k, n)}
            </button>
          ))}
        </nav>
        <main id="tview" key={tab} className="enter">
          {tab === 'home' && <HomeTab s={s} act={act} askAI={askAI} aiBusy={aiBusy} aiNote={t(aiNoteKey)} eraName={eraName} />}
          {tab === 'career' && <CareerTab s={s} act={act} />}
          {tab === 'edu' && <EduTab s={s} act={act} />}
          {tab === 'biz' && <BizTab s={s} act={act} />}
          {tab === 'space' && <SpaceTab s={s} act={act} />}
          {tab === 'health' && <HealthTab s={s} act={act} />}
          {tab === 'spirit' && <SpiritTab s={s} act={act} />}
          {tab === 'pets' && <PetsTab s={s} act={act} />}
          {tab === 'assets' && <AssetsTab s={s} act={act} curCat={curCat} setCurCat={setCurCat} />}
          {tab === 'markets' && <StockTab s={s} act={act} qtyMap={qtyMap} setQtyMap={setQtyMap} />}
          {tab === 'social' && <SocialTab s={s} act={act} />}
          {tab === 'relations' && <RelationsTab s={s} act={act} />}
          {tab === 'club' && <ClubTab s={s} act={act} />}
          {tab === 'bank' && <BankTab s={s} act={act} />}
          {tab === 'rank' && <RankTab s={s} board={rankBoard} setBoard={setRankBoard} />}
          {tab === 'fame' && <FameTab s={s} />}
          {tab === 'links' && <LinksTab s={s} />}
        </main>
        <footer className="mini tfoot">
          <span>{t('footer')}</span>
          <button className="newlife-btn" type="button"
            onClick={() => { if (typeof window !== 'undefined' && window.confirm(t('reincarnate.confirm'))) { reincarnateState(); showToast(t('reincarnate.toast')); } }}>
            {t('newLife')}
          </button>
        </footer>
      </div>

      {toast && <div id="ttoast" key={toast.id} className="on">{toast.msg}</div>}

      {!s.started && <Intro onBegin={opts => act(st => { begin(st, opts); showToast(`${t('begin')}: ${opts.name} 🎉`); })} />}
      {(s.pending || s.aiEv) && <EventModal s={s} act={act} />}
      {s.over && <GameOver s={s} onAgain={() => { reincarnateState(); showToast(t('reincarnate.toast')); }} />}
    </div>
  );
}

// ================= shared bits =================
type Act = (fn: (st: GameState) => string | null | void) => void;
type TFn = ReturnType<typeof useT>['t'];

function Row({ art, image, children, right }: { art: string; image?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="row">{image ? <img className="rowimg" src={asset(image)} alt="" loading="lazy" /> : (art && <Art id={art} />)}<div className="info">{children}</div>{right}</div>;
}
function Btn({ ic, label, onClick, disabled, kind, dp }: { ic: string; label: string; onClick?: () => void; disabled?: boolean; kind?: string; dp?: Record<string, string> }) {
  return (
    <button className={'ibtn ' + (kind || '')} onClick={onClick} disabled={disabled} {...dp}>
      <Ic id={ic} className="bsi" /><span>{label}</span>
    </button>
  );
}
// reqText() is engine-side English; empty requirements get a translated label.
function useReqLabel() {
  const { t } = useT();
  return (req?: Req) => (req && Object.keys(req).length ? reqText(req) : t('noReq'));
}

function Header({ s, eraName }: { s: GameState; eraName: (y: number) => string }) {
  const { t, lang, setLang } = useT();
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const cur = document.documentElement.getAttribute('data-theme');
    if (cur === 'light' || cur === 'dark') {
      const timer = window.setTimeout(() => setTheme(cur), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const flipTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('tycoon_theme', next); } catch { /* ignore */ }
    setTheme(next);
  };
  return (
    <header className="top">
      <div className="brand">
        <Art id="s-coin" className="logo" />
        <div><h1>MOGUL <span className="mini">v10.5</span></h1>
          <div className="mini">{s.started ? `${s.nation} · ${eraName(worldYear(s))}` : t('tagline')}</div></div>
      </div>
      <div><div className="mini">{t('cash')}</div><div id="tcash" style={{ color: s.money < 0 ? 'var(--brick)' : undefined }}>{fmt(s.money)}</div>
        <div className="mini">{t('netWorth')} {fmt(netWorth(s))} · {yearIncome(s) >= 0 ? '+' : ''}{fmt(yearIncome(s))}{t('perYear')}</div></div>
      <div className="hstack">
        <span className="lvlchip" title={t('level')}><Ic id="ic-xp" className="bsi" />{t('lvl')} {s.level}
          <span className="bar"><i style={{ width: xpPct + '%' }} /></span></span>
        <span className="lang" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </span>
        <button id="themeBtn" data-theme-btn className="ghost tsmall" style={{ padding: '6px 10px', lineHeight: 0 }}
          onClick={flipTheme} aria-label={t('theme')} title={t('theme')}>
          <Ic id={theme === 'dark' ? 'ic-sun' : 'ic-moon'} className="bsi" />
        </button>
      </div>
    </header>
  );
}

function AgeBox({ s, t }: { s: GameState; t: TFn }) {
  const a = s.age, st = stageOf(a), pct = (a - START) / (END_AGE - START) * 100;
  const p = (x: number) => ((x - START) / (END_AGE - START) * 100).toFixed(2) + '%';
  const d = new Date(Date.UTC(s.byear + 18, 8, 1) + Math.floor(s.lastDay) * 864e5);
  const dstr = d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const marks: [number, string][] = [[START, String(START)], [RETIRE, '65'], [END_AGE, '90']];
  return (
    <section className="card age">
      <div className="agehead"><b>{s.name} · {t('age')} {Math.floor(a)}</b>
        <span className="tag dark">{t('stage.' + STAGES.indexOf(st), st.name)}</span>
        <span className="mini">{dstr}</span>
        <span className="hpill"><Ic id="w-heart" className="bsi" />{Math.round(s.health)}</span>
        <span className="hpill"><Ic id="w-lotus" className="bsi" />{Math.round(s.spirit)}</span>
        <span className="mini">{t('fame')} {s.fame} · {t('followers')} {s.social.followers.toLocaleString()}</span></div>
      <div className="track" style={{ background: `linear-gradient(90deg,#8fae9b 0 ${p(22)},#c9b68e ${p(22)} ${p(26)},#c08a80 ${p(26)} ${p(RETIRE)},#9b93a8 ${p(RETIRE)})` }}>
        <div className="shade" style={{ left: pct + '%' }} /><div className="mark" style={{ left: pct + '%' }} />
      </div>
      <div className="ms">{marks.map(([m, lb]) => <span key={lb + m} style={{ left: p(m) }}>{lb}</span>)}</div>
    </section>
  );
}

// ================= HOME =================
function HomeTab({ s, act, askAI, aiBusy, aiNote, eraName }: { s: GameState; act: Act; askAI: () => void; aiBusy: boolean; aiNote: string; eraName: (y: number) => string }) {
  const { t, lang } = useT();
  const y = worldYear(s), era = eraOf(y), news = ALLNEWS[y] || [];
  const activeJobs = jobsOf(s);
  const activeStudies = [s.study, s.sideStudy].filter((study): study is NonNullable<typeof study> => !!study);
  const studyTxt = activeStudies.length
    ? activeStudies.map(study => `${study.name} · ${Math.max(0, (study.end - s.day) / 365.25).toFixed(1)} ${t('years')}`).join(' · ')
    : t('notStudying');
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  const healthChange = Math.round((sleepHealthMult(s.sleepHours) - 1) * 100);
  const healthChangeText = `${healthChange > 0 ? '+' : ''}${healthChange}%`;
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
      <div className="card hero">
        <div className="heroimg" style={{ backgroundImage: 'url(' + asset('/img/hero-city-v10.jpg') + ')' }} aria-hidden="true" />
        <div className="herobody">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Art id={stageOf(s.age).art} />
            <div>
              <b className="big">{s.name}, {t('stage.' + STAGES.indexOf(stageOf(s.age)), stageOf(s.age).name)}</b>
              <div className="sub">{activeJobs.length ? t('workingAs', '', {
                j: activeJobs.map(job => t('job.' + job.id, job.name)).join(' · '),
                s: fmt(jobIncome(s))
              }) : t('notEmployed')}</div>
              <div className="sub">{t('knowledge')}: {knowledgeText(s)}</div>
              <div className="sub">{t('study')}: {studyTxt}</div>
              <div className="sub">{t('rentBills')}: {fmt((living(Math.floor(s.age)) + upkeep(s) + studyTuition(s)) / 12)}{t('perMonth')}</div>
            </div>
          </div>
          <div className="mini" style={{ marginTop: 10 }}>{t('level')} {s.level} · {s.xp}/{xpNeed(s.level)} XP · +{((s.level - 1) * 2).toFixed(0)}% {t('inc.total').toLowerCase()}</div>
          <div className="xpbar"><i style={{ width: xpPct + '%' }} /></div>
          <div className="wbars">
            <div className="wrow"><span className="mini wl">{t('health')}</span><div className="wbar"><i style={{ width: s.health + '%', background: s.health < 40 ? 'var(--brick)' : 'var(--sage)' }} /></div><span className="mini">{Math.round(s.health)}/100</span></div>
            <div className="wrow"><span className="mini wl">{t('spirit')}</span><div className="wbar"><i style={{ width: s.spirit + '%', background: 'var(--slate)' }} /></div><span className="mini">{Math.round(s.spirit)}/100</span></div>
          </div>
        </div>
      </div>

      <HealthAlerts s={s} />

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="field" style={{ marginBottom: 4 }}>
          <label htmlFor="sleep-hours">{t('sleepSchedule')}</label>
          <select id="sleep-hours" value={s.sleepHours} onChange={e => act(st => {
            st.sleepHours = Number(e.target.value);
            return t('sleepSet', '', { n: st.sleepHours });
          })}>
            {sleepHoursOptions.map(hours => <option key={hours} value={hours}>{hours} {t('sleepHourUnit')}</option>)}
          </select>
        </div>
        <span className="mini">{t('sleepEffects', '', {
          p: Math.round((studyPace(s.sleepHours) - 1) * 100),
          h: healthChangeText
        })}</span>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('worth')} · {t('netWorth')}</span><b>{fmt(netWorth(s))}</b></div>
        {/* v10.5 — color-coded asset breakdown bar (per design image 3) */}
        {(() => {
          const cash = Math.max(0, s.money);
          const stocks = Math.max(0, stockVal(s));
          const property = Math.max(0, assetVal(s));
          const biz = Math.max(0, bizVal(s));
          const bank = Math.max(0, s.bank.dep);
          const used = s.used.reduce((a, u) => a + usedItemValue(s, u), 0);
          const total = Math.max(1, cash + stocks + property + biz + bank + used);
          const segs: [string, number, string, string][] = [
            [t('asset.cash'), cash, '#c9a070', fmt(cash)],
            [t('asset.stocks'), stocks, '#5b8a72', fmt(stocks)],
            [t('asset.property'), property, '#6a7d92', fmt(property)],
            [t('asset.biz'), biz, '#9c6a4a', fmt(biz)],
            [t('asset.bank'), bank, '#7a6a8e', fmt(bank)],
            [t('asset.used'), used, '#a3524a', fmt(used)],
          ];
          return (
            <div style={{ marginTop: 8, marginBottom: 8 }}>
              <div className="asset-bar" role="img" aria-label={t('assetBreakdown')}>
                {segs.map(([label, v, color]) => (
                  v > 0 && (
                    <div key={label} className="asset-seg" style={{ width: (v / total * 100).toFixed(2) + '%', background: color }}
                      title={`${label}: ${fmt(v)}`} />
                  )
                ))}
              </div>
              <div className="asset-legend">
                {segs.map(([label, v, color, txt]) => (
                  <span key={label} className="asset-leg-item"><span className="sw" style={{ background: color }} />{label} <b>{v > 0 ? txt : '—'}</b></span>
                ))}
              </div>
            </div>
          );
        })()}
        <div className="lb" style={{ marginTop: 8 }}><span><b>{t('incomeBreakdown')}</b></span><b>+{fmt(yearIncome(s))}{t('perYear')}</b></div>
        {incRows.map(([k, v]) => v > 0 ? <div key={k} className="lb"><span>{k}</span><span className="up">+{fmt(v)}</span></div> : null)}
      </div>

      <h3>{t('gigs')}</h3>
      <div className="gigs">
        {GIGS.map(g => {
          const ready = gigReady(s, g), lock = gigLock(s, g);
          const left = s.gigs[g.id] != null ? Math.max(0, g.cd - (s.lastDay - s.gigs[g.id])) : 0;
          return (
            <button key={g.id} className="gig" data-gig={g.id} disabled={!ready}
              onClick={() => act(st => doGig(st, g.id))}>
              <Art id={g.icon} />
              <span><b>{t('gig.' + g.id, g.id)}</b>
                <span className="sub" style={{ display: 'block' }}>
                  {!ready && lock ? t('gig.need', '', { x: lock })
                    : !ready ? t('gig.cooldown', '', { n: left })
                      : <span className="pay">+{fmt(gigPay(s, g))}</span>}
                </span></span>
            </button>
          );
        })}
      </div>

      <button id="twork" className="ibtn ghost tai" style={{ width: '100%', justifyContent: 'center', margin: '12px 0 4px' }} onClick={askAI} disabled={aiBusy}>
        {Ic({ id: 'ic-ai', className: 'si' })}<span>{aiBusy ? t('oracle.thinking') : t('oracle.ask')}</span>
      </button>
      <p className="sub">{aiNote}</p>

      <h3>{t('inWorld', '', { y, era: eraName(y) })}</h3>
      <div className="card" style={{ marginBottom: 10 }}>
        {news.length ? news.map(n => <p className="news" key={n}>• {n}</p>) : <p className="news">• {t('quietYear', '', { era: eraName(y) })}</p>}
      </div>

      <details className="fold" id="guide">
        <summary>{t('guide')}</summary>
        <div className="foldbody">
          <div className="imgs">
            {[['/img/cafe.jpg', 'biz.cafe'], ['/img/farm.jpg', 'biz.farm'], ['/img/factory.jpg', 'biz.fac'], ['/img/tech.jpg', 'biz.tech'], ['/img/hotel.jpg', 'biz.hotel']].map(([src, k]) => (
              <div key={src} className="imcard"><img src={asset(src)} alt={t(k)} loading="lazy" /><span>{t(k)}</span></div>
            ))}
          </div>
          <p className="sub">{t('guide.1')}</p>
          <p className="sub">{t('guide.2')}</p>
          <p className="sub">{t('guide.3')}</p>
          <p className="sub">{t('guide.4')}</p>
          <p className="sub">{t('guide.5')}</p>
          <p className="sub">{t('guide.6')}</p>
        </div>
      </details>
      <details className="fold" id="ach">
        <summary>{t('achTitle')} · {s.ach.length}/{ACHIEVEMENTS.length}</summary>
        <div className="foldbody">
          <p className="mini" style={{ marginBottom: 8 }}>{t('achNote')}</p>
          <div className="achgrid">
            {ACHIEVEMENTS.map(a => {
              const on = s.ach.includes(a.id);
              return (
                <div key={a.id} className={'ach' + (on ? ' on' : '')}>
                  {Ic({ id: on ? 'ic-trophy' : 'ic-lock', className: 'si' })}
                  <span><b>{t('ach.' + a.id)}</b><span className="sub" style={{ display: 'block' }}>{t('achd.' + a.id)}</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </details>
      <details className="fold">
        <summary>{t('dailyTimeline')}</summary>
        <div className="foldbody">
          <div className="feed">
            {[...s.timeline].reverse().slice(0, 45).map(({ day, entries }) => (
              <div key={day}>
                <b>{dateOf(s, day).toLocaleDateString(timelineLocale, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}</b>
                {entries.map((entry, index) => <div key={index} style={{ padding: '4px 0 0 10px', border: 0 }}>{entry}</div>)}
              </div>
            ))}
          </div>
          <p className="mini">{t('timelineNote')}</p>
        </div>
      </details>
      <details className="fold">
        <summary>{t('lifeLog')}</summary>
        <div className="foldbody"><div className="feed">{s.log.slice(-16).reverse().map((x, i) => <div key={i}>{x}</div>)}</div></div>
      </details>
    </>
  );
}

// ================= JOBS =================
function CareerTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  const activeJobs = jobsOf(s);
  return (
    <>
      <h3>{t('jobs')}</h3>
      {JOBS.map(jb => {
        const mine = activeJobs.some(job => job.id === jb.id);
        const studyingFullTime = jb.ft && (s.study || s.sideStudy);
        const sameSlot = activeJobs.find(job => job.ft === jb.ft);
        const lock = mine ? '' : !meets(s, jb.req) ? t('requires') + ' ' + reqLabel(jb.req)
          : s.age >= RETIRE ? t('stage.3')
            : sameSlot ? t('jobSlotOccupied', '', { j: t('job.' + sameSlot.id, sameSlot.name) }) : '';
        return <Row key={jb.id} art={jb.art} right={<Btn ic={mine ? 'ic-x' : 'ic-plus'} label={mine ? t('quit') : (lock || t('apply'))} kind={mine ? 'ghost' : ''} disabled={!mine && !!lock}
          onClick={() => act(st => hire(st, jb.id))} />}>
          <b>{t('job.' + jb.id, jb.name)}{mine && ' · ' + t('current')}</b>
          <span className="sub">{fmt(jb.salary * (studyWorkMult(s) < 1 && jb.ft && mine ? studyWorkMult(s) : 1))}{t('perYear')} · {t('requires')} {reqLabel(jb.req)}{studyingFullTime && mine ? ` · ${t('studyWorkNote')}` : ''}</span>
        </Row>;
      })}
      <p className="sub">{t('multiJobNote')}</p>
      <p className="sub">{t('eduNote')}</p>
    </>
  );
}

// ================= EDUCATION =================
function EduTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const studies = [s.study, s.sideStudy].filter((study): study is NonNullable<typeof study> => !!study);
  const slotsFull = studies.length >= 2;
  return (
    <>
      <h3>{t('degrees')}</h3>
      <p className="sub">{t('multiStudyNote')}</p>
      {(Object.keys(FIELDS) as FieldKey[]).map(f => {
        const F = FIELDS[f], cur = s.deg[f], max = F.names.length;
        if (cur >= max) return <Row key={f} art={F.art} right={<Btn ic="ic-check" label={t('done')} disabled />}><b>{t('field.' + f, F.name)}: {F.names[cur - 1]}</b><span className="sub">{t('highest')}</span></Row>;
        const L = cur + 1;
        const ongoing = studies.some(study => study.kind === 'deg' && study.field === f);
        const reason = ongoing ? t('inProgress') : slotsFull ? t('busy') : s.age > F.maxAge[L - 1] ? t('tooOld') : '';
        const years = effYears(s, f, L);
        return <Row key={f} art={F.art} right={<Btn ic="ic-cap" label={reason || t('enroll')} disabled={!!reason} onClick={() => act(st => enrollDeg(st, f))} />}>
          <b>{t('field.' + f, F.name)}: {F.names[L - 1]}</b>
          <span className="sub">{years.toFixed(1)} {t('years')}{s.topField && s.topField !== f ? ` · ${t('studyExtraTime')}` : ''} · {F.tuition[L - 1] ? fmt(tuitionOf(s, f, L)) + t('perYear') + ' ' + t('tuition') + (s.topField === f ? ' (−20%)' : '') : t('funded')}{cur ? ' · ' + t('buildsOn') + ' ' + F.names[cur - 1] : ''}</span>
        </Row>;
      })}
      <h3>{t('licences')}</h3>
      {LICENSES.map(l => {
        const owned = !!s.lic[l.id];
        const studying = studies.some(course => course.kind === 'lic' && course.id === l.id);
        const busy = slotsFull;
        const label = owned ? t('done') : studying ? t('inProgress') : busy ? t('busy') : s.money < l.cost ? t('needLicence') : t('enroll');
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-cap'} label={owned ? t('done') : label} disabled={owned || !!studying || busy || s.money < l.cost}
          onClick={() => act(st => enrollLic(st, l.id))} />}>
          <b>{t('lic.' + l.id, l.name)}</b><span className="sub">{fmt(l.cost)} {t('fee')} · {t('dayCourse', '', { n: l.days })} · {t('neededFor')} {Object.keys(LIC_FOR).filter(k => LIC_FOR[k] === l.id).join(', ')}</span>
          {studies.length === 1 && <span className="sub" style={{ display: 'block' }}>{t('parallelStudyNote')}</span>}
        </Row>;
      })}
      <p className="sub">{t('eduTip')}</p>
    </>
  );
}

// ================= BUSINESS =================
function BizTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  const mult = bizMultiplier(s);
  return (
    <>
      {BIZ.map(b => {
        const n = branchCount(s, b.id), c = bizCost(s, b), ok = meets(s, b.req);
        return <Row key={b.id} art={b.art} right={<Btn ic={ok ? (n ? 'ic-up' : 'ic-plus') : 'ic-x'} label={!ok ? t('needDegree') : n ? t('openBranch') + ' · ' + fmt(c) : t('open') + ' · ' + fmt(c)} disabled={!ok || s.money < c} onClick={() => act(st => openBranch(st, b.id))} />}>
          <b>{t('biz.' + b.id, b.name)} <span className="tag">{b.ind}</span> <span className="tag">{n} {t('branches')}</span></b>
          <span className="sub">{n ? t('chain') + ': ' : t('openIn', '', { r: b.reg[0] }) + ' (+' + fmt(b.inc * 1.25 * 12) + t('ifSteady') + ') · '}{t('requires')} {reqLabel(b.req)}</span>
          {n > 0 && <div>{(s.branches[b.id] || []).map((br, i) => {
            const net = branchNet(s, b, br) * mult;
            return <span key={i} className={'brchip ' + (net >= 0 ? 'up' : 'dn')}>{b.reg[br.r % b.reg.length]} · {net >= 0 ? '+' : ''}{fmt(net)}/mo · {br.mood >= 1.35 ? t('booming') : br.mood <= .55 ? t('struggling') : t('steady')}</span>;
          })}</div>}
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
    </>
  );
}

// ================= SPACE =================
function SpaceTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const y = worldYear(s);
  return (
    <>
      <div className="card hero">
        <div className="heroimg" style={{ backgroundImage: 'url(' + asset('/img/space.jpg') + ')' }} aria-hidden="true" />
        <div className="herobody">
          <b className="big">{t('spaceTitle')}</b>
          <div className="sub" style={{ marginTop: 4 }}>{t('spaceTeaser', '', { lvl: SPACE_LINES[0].lvl })}</div>
          <div className="sub" style={{ marginTop: 6 }}>{t('lvl')} {s.level} · {s.xp}/{xpNeed(s.level)} XP{spaceIncome(s) > 0 ? ` · ${t('inc.space')} +${fmt(spaceIncome(s))}${t('perYear')}` : ''}</div>
        </div>
      </div>
      <Row art="s-orb" right={<Btn ic={s.spaceTravel ? 'ic-check' : 'ic-up'}
        label={s.spaceTravel ? t('spaceTravelReady') : s.spaceUpgrade ? t('spaceTravelWaiting', '', { n: Math.max(0, Math.ceil(s.spaceUpgrade.completesDay - s.day)) }) : t('spaceTravelStart')}
        disabled={s.spaceTravel || !!s.spaceUpgrade || !spaceUpgradeReady(s)}
        onClick={() => act(st => startSpaceUpgrade(st))} />}>
        <b>{t('spaceTravelTitle')}</b>
        <span className="sub">{s.spaceTravel ? t('spaceTravelBonus') : `${t('setup')} ${fmt(SPACE_TRAVEL_COST)} · ${spaceUpgradeDays} ${t('spaceDays')}`}</span>
        {!s.spaceTravel && !s.spaceUpgrade && <span className="sub" style={{ display: 'block' }}>{t('spaceTravelRequirement')}</span>}
      </Row>
      {SPACE_LINES.map(l => {
        const owned = s.space[l.id];
        const lvlOk = s.level >= l.lvl, yrOk = y >= l.since, moneyOk = s.money >= l.cost;
        const why = !lvlOk ? t('lvlReq', '', { n: l.lvl }) : !yrOk ? t('unlocksIn', '', { y: l.since }) : !moneyOk ? t('needLicence') : '';
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('founded') : why || t('found')} disabled={!!owned || !!why} onClick={() => act(st => buySpace(st, l.id))} />}>
          <b>{t('space.' + l.id, l.name)} <span className="tag">{t('lvlReq', '', { n: l.lvl })}</span> <span className="tag">{t('since')} {l.since}</span></b>
          <span className="sub">+{fmt(l.inc)}{t('perYear')} · {t('setup')} {fmt(l.cost)}</span>
          <span className="sub" style={{ display: 'block' }}>{l.desc}</span>
        </Row>;
      })}
      <p className="sub">{t('spaceNote')}</p>
    </>
  );
}

// ================= HEALTH =================
function HealthTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const hp = Math.round(s.health), stIdx = healthState(s.health);
  const rows: { id: string; art: string; name: string; cost: number; cd: number; gain: number }[] = [
    { id: 'gym', art: 'w-gym', name: t('workout'), cost: GYM_COST, cd: GYM_CD, gain: 6 },
    { id: 'checkup', art: 'w-doc', name: t('checkup'), cost: CHECKUP_COST, cd: CHECKUP_CD, gain: 15 },
  ];
  return (
    <>
      <HealthAlerts s={s} />
      <div className="card" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: '1.05rem' }}>{t('healthTitle')}</b>
        <p className="sub" style={{ marginTop: 4 }}>{t('healthSub')}</p>
        <div className="famewrap"><span className="mini">{t('health')}</span><div className="famebar"><i style={{ width: hp + '%', background: hp < 40 ? 'var(--brick)' : 'var(--sage)' }} /></div><b>{hp}</b></div>
        <div className="mini">{t('hp.state.' + stIdx)} · {t('hp.decay', '', { n: decayPerYear(s).toLocaleString('en-US') })}</div>
      </div>
      {rows.map(r => {
        const left = wellLeft(s, r.id), ready = wellReady(s, r.id);
        return <Row key={r.id} art={r.art} right={<Btn ic="ic-plus" dp={{ 'data-well': r.id }}
          label={!ready && left > 0 ? t('gig.cooldown', '', { n: left }) : `${r.name} · ${fmt(r.cost)}`}
          disabled={!ready} onClick={() => act(st => doWell(st, r.id, t))} />}>
          <b>{r.name}</b>
          <span className="sub">+{r.gain} {t('health').toLowerCase()} · {t('gig.cooldown', '', { n: r.cd })}</span>
        </Row>;
      })}
      <Row art="w-diet" right={<Btn ic={s.diet ? 'ic-check' : 'ic-plus'} label={s.diet ? 'ON' : 'OFF'} kind="ghost" onClick={() => act(st => toggleDiet(st, t))} />}>
        <b>{t('diet')}: {s.diet ? 'ON' : 'OFF'}</b>
        <span className="sub">{t('hp.dietInfo', '', { x: DIET_COST })}</span>
      </Row>
      <p className="sub">{t('hp.affect', '', { x: healthMult(s).toFixed(2) })}</p>
    </>
  );
}

function HealthAlerts({ s }: { s: GameState }) {
  const { t } = useT();
  const warnings = healthWarnings(s);
  if (!warnings.length) return null;
  return (
    <div className="card" role="status" style={{ marginBottom: 10, borderColor: s.health < 40 ? 'var(--brick)' : 'var(--gold)' }}>
      <b>{t('hp.adviceTitle')}</b>
      {warnings.map(warning => <p key={warning} className="sub" style={{ margin: '5px 0 0' }}>• {t('hp.advice.' + warning)}</p>)}
    </div>
  );
}

// ================= MIND & SPIRIT =================
function SpiritTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const sp = Math.round(s.spirit), stIdx = spiritState(s.spirit);
  const rows: { id: string; art: string; name: string; cost: number; cd: number; gain: number }[] = [
    { id: 'meditate', art: 'w-lotus', name: t('meditate'), cost: 0, cd: 1, gain: 4 },
    { id: 'temple', art: 'w-temple', name: t('temple'), cost: TEMPLE_COST, cd: TEMPLE_CD, gain: 6 },
    { id: 'retreat', art: 'w-retreat', name: t('retreat'), cost: RETREAT_COST, cd: RETREAT_CD, gain: 25 },
  ];
  const perks: { on: boolean; label: string; need: number }[] = [
    { on: s.spirit >= 70, label: t('sp.peace'), need: 70 },
    { on: s.spirit >= 70, label: t('sp.aging'), need: 70 },
    { on: s.spirit >= 80, label: t('sp.cosmic'), need: 80 },
  ];
  const rowsWithFaith = [
    ...rows,
    { id: 'faithPractice', art: 'w-lotus', name: t('faith.action.' + s.religion), cost: FAITH_PRACTICE_COST, cd: FAITH_PRACTICE_CD, gain: 3 }
  ];
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: '1.05rem' }}>{t('spiritTitle')}</b>
        <p className="sub" style={{ marginTop: 4 }}>{t('spiritSub')}</p>
        <p className="sub"><b>{t('religion')}:</b> {t('religion.' + s.religion)} · {t('faith.guidance.' + s.religion)}</p>
        <div className="famewrap"><span className="mini">{t('spirit')}</span><div className="famebar"><i style={{ width: sp + '%', background: 'var(--slate)' }} /></div><b>{sp}</b></div>
        <div className="mini">{t('sp.state.' + stIdx)} · {t('karma')}: {s.karma}</div>
      </div>
      {rowsWithFaith.map(r => {
        const left = wellLeft(s, r.id), ready = wellReady(s, r.id);
        return <Row key={r.id} art={r.art} right={<Btn ic="ic-plus" dp={{ 'data-well': r.id }}
          label={!ready && left > 0 ? t('gig.cooldown', '', { n: left }) : r.cost ? `${r.name} · ${fmt(r.cost)}` : r.name}
          disabled={!ready} onClick={() => act(st => doWell(st, r.id, t))} />}>
          <b>{r.name}</b>
          <span className="sub">{r.id === 'faithPractice' ? t('faith.practiceInfo') : `+${r.gain} ${t('spirit').toLowerCase()} · ${t('gig.cooldown', '', { n: r.cd })}${r.cost ? ` · ${fmt(r.cost)}` : ''}`}</span>
        </Row>;
      })}
      <h3>{t('sp.perks')}</h3>
      {perks.map((p, i) => <div key={i} className={'perkrow' + (p.on ? ' on' : '')}>
        <Ic id={p.on ? 'ic-check' : 'ic-lock'} className="bsi" /><span>{p.label}</span>
        <span className="mini">{p.on ? '✓' : t('sp.locked', '', { n: p.need })}</span>
      </div>)}
    </>
  );
}

// ================= ASSETS (was ShopTab) =================
// v10.5: renamed from ShopTab. The "buy/sell" of physical items now lives
// under the Portfolio → Assets tab, alongside the player's owned items +
// pre-owned market + social listings + (new) repair/restore workshop.
const CATART: Record<string, string> = { 'Sport bike': 'i-bike', 'Phone': 'i-phone', 'Watch': 'i-watch', 'Jewelry': 'i-ring', 'Suit': 'i-suit', 'Car': 'i-lambo', 'Property': 'i-house', 'Yacht': 'i-yacht', 'Private jet': 'i-jet', 'Art': 'i-art' };

function AssetsTab({ s, act, curCat, setCurCat }: { s: GameState; act: Act; curCat: string | null; setCurCat: (c: string | null) => void }) {
  const { t } = useT();
  const cats = [...new Set(ITEMS.map(i => i.cat))];
  // Surface 6 used listings, shuffled deterministically by the current
  // game-year so the listings rotate as the player ages.
  const y = worldYear(s);
  const usedShown = useMemo(() => {
    const seed = y * 7 + s.level;
    const arr = [...USED_MARKET];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * (i + 3) + 13) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const filtered = arr.filter(u => !s.used.some(owned => owned.id === u.id));
    return filtered.slice(0, 6);
  }, [y, s.level, s.used.length]);
  return (
    <>
      {/* ---- pre-owned: items the player already owns (with sell + list + auction + repair) ---- */}
      {s.lots.length > 0 && (<><h3>{t('myItems')}</h3>
        {s.lots.map((l, idx) => {
          const it = ITEM_BY[l.id], v = lotValue(s, l), resale = v * (1 - RESALE_FEE);
          const rar = itemRarity(it);
          const cond = l.condition == null ? 100 : l.condition;
          const condTxt = cond >= 80 ? 'mint' : cond >= 60 ? 'good' : cond >= 40 ? 'fair' : 'rough';
          const ask = v * 1.4;
          const repCost = repairCost(s, it.price, rar);
          return <Row key={idx} art={it.art} image={ITEM_IMAGES[l.id]} right={<div className="trade" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {cond < 100 && <Btn ic="ic-bag" label={t('workshop.repair') + ' ' + fmt(repCost)} kind="ghost" disabled={s.money < repCost} onClick={() => act(st => repairLot(st, idx))} />}
            <Btn ic="ic-up" label={t('auction.btn')} kind="ghost" disabled={s.money < ask * 0.03} onClick={() => act(st => auctionItem(st, 'lot', idx))} />
            <Btn ic="ic-social" label={t('used.listLot')} kind="ghost" onClick={() => act(st => postItemListing(st, 'lot', idx))} />
            <Btn ic="ic-down" label={t('sell') + ' ' + fmt(resale)} kind="ghost" onClick={() => act(st => sellLot(st, idx))} />
          </div>}>
            <b>{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name} <span className="rarity-chip" data-rarity={rar} style={{ '--rc': RARITY_COLOR[rar] } as React.CSSProperties}>{t('rarity.' + rar)}</span></b>
            <span className="sub">
              <span className="cond-pill" data-cond={condTxt}>{t('used.cond')} {cond} · {condTxt}</span>
              {' · '}{t('paid')} {fmt(l.paid)} · {t('worthNow')} {fmt(v)} · {v >= l.paid ? t('gains', '', { n: ((v / l.paid - 1) * 100).toFixed(0) }) : t('loses', '', { n: ((1 - v / l.paid) * 100).toFixed(0) })}
            </span>
            <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('auction.ask')} {fmt(ask)} · {t('auction.fee')} · {t('auction.sellChance', '', { n: Math.round(rar === 'legendary' ? 85 : rar === 'rare' ? 75 : rar === 'uncommon' ? 55 : 40) })}</span>
          </Row>;
        })}</>)}
      {/* ---- pre-owned: items the player bought used ---- */}
      {s.used.length > 0 && (<><h3>{t('used.mine')}</h3>
        {s.used.map((u, idx) => {
          const v = usedItemValue(s, u), resale = v * (1 - RESALE_FEE);
          const condTxt = u.condition >= 80 ? 'mint' : u.condition >= 60 ? 'good' : u.condition >= 40 ? 'fair' : 'rough';
          const rar = itemRarity(u);
          const ask = v * 1.4;
          const repCost = repairCost(s, u.paid, rar);
          return <Row key={u.id} art={u.art} image={USED_IMAGES[u.id]} right={<div className="trade" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {u.condition < 100 && <Btn ic="ic-bag" label={t('workshop.repair') + ' ' + fmt(repCost)} kind="ghost" disabled={s.money < repCost} onClick={() => act(st => repairUsed(st, idx))} />}
            <Btn ic="ic-up" label={t('auction.btn')} kind="ghost" disabled={s.money < ask * 0.03} onClick={() => act(st => auctionItem(st, 'used', idx))} />
            <Btn ic="ic-social" label={t('used.list')} kind="ghost" onClick={() => act(st => postItemListing(st, 'used', idx))} />
            <Btn ic="ic-down" label={t('used.sell') + ' ' + fmt(resale)} kind="ghost" onClick={() => act(st => sellUsed(st, idx))} />
          </div>}>
            <b>{u.brand ? <span className="bchip" style={{ background: u.c }}>{u.brand}</span> : null}{u.name} <span className="rarity-chip" data-rarity={rar} style={{ '--rc': RARITY_COLOR[rar] } as React.CSSProperties}>{t('rarity.' + rar)}</span></b>
            <span className="sub">
              <span className="cond-pill" data-cond={condTxt}>{t('used.cond')} {u.condition} · {condTxt}</span>
              {' · '}{t('used.age', '', { n: u.ageYears })} · {t('paid')} {fmt(u.paid)} · {t('worthNow')} {fmt(v)}
            </span>
            <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('auction.ask')} {fmt(ask)} · {t('auction.sellChance', '', { n: Math.round(rar === 'legendary' ? 85 : rar === 'rare' ? 75 : rar === 'uncommon' ? 55 : 40) })}</span>
            <span className="mini" style={{ display: 'block', marginTop: 2, fontStyle: 'italic' }}>{u.story}</span>
          </Row>;
        })}</>)}
      {/* ---- pre-owned market listings ---- */}
      <h3>{t('used.title')}</h3>
      <p className="sub">{t('used.sub')}</p>
      <div className="grid">
        {usedShown.length === 0
          ? <span className="sub">{t('used.empty')}</span>
          : usedShown.map(u => {
            const off = Math.max(0, Math.round((1 - u.askPrice / u.newPrice) * 100));
            const condTxt = u.condition >= 80 ? 'mint' : u.condition >= 60 ? 'good' : u.condition >= 40 ? 'fair' : 'rough';
            return <button key={u.id} className="tile used-tile" disabled={s.money < u.askPrice}
              onClick={() => act(st => buyUsedItem(st, u))}>
              {USED_IMAGES[u.id]
                ? <img className="tile-photo" src={asset(USED_IMAGES[u.id])} alt={u.name} loading="lazy" />
                : <Art id={u.art} />}
              <span>
                <b>{u.brand ? <span className="bchip" style={{ background: u.c }}>{u.brand}</span> : null}{u.name} <span className="rarity-chip" data-rarity={itemRarity(u)} style={{ '--rc': RARITY_COLOR[itemRarity(u)] } as React.CSSProperties}>{t('rarity.' + itemRarity(u))}</span></b>
                <span className="sub" style={{ display: 'block' }}>
                  <span className="cond-pill" data-cond={condTxt}>{t('used.cond')} {u.condition}</span>
                  {' · '}{t('used.age', '', { n: u.ageYears })}
                </span>
                <span className="sub" style={{ display: 'block' }}>{t('used.ask')} <b>{fmt(u.askPrice)}</b> · <span className="up">{t('used.discount', '', { n: off })}</span></span>
              </span>
            </button>;
          })}
      </div>
      {/* ---- new-item catalogue (the original shop) ---- */}
      <h3>{t('catalogue')}</h3>
      <div className="grid">
        {cats.map(c => {
          const list = ITEMS.filter(i => i.cat === c);
          const lo = Math.min(...list.map(i => i.price)), hi = Math.max(...list.map(i => i.price));
          const need = LIC_FOR[c], have = !need || s.lic[need];
          return <button key={c} className="tile" onClick={() => setCurCat(c)}>
            <Art id={CATART[c] || 'ic-bag'} />
            <span><b>{t('cat.' + c, c)}</b><span className="sub" style={{ display: 'block' }}>{list.length} {t('items')} · {fmt(lo)} – {fmt(hi)}{need && !have ? ' · ' + t('licenceNeeded') : ''}</span></span>
          </button>;
        })}
      </div>
      <p className="sub">{t('tapCategory')}</p>
      {curCat && (
        <div className="modal on" onClick={e => { if (e.target === e.currentTarget) setCurCat(null); }}>
          <div className="mcard">
            <div className="mhead"><h2>{t('cat.' + curCat, curCat)}</h2><button className="ibtn ghost" onClick={() => setCurCat(null)}><Ic id="ic-x" className="bsi" /><span>✕</span></button></div>
            <div className="sub" style={{ marginBottom: 8 }}>{ITEMS.filter(i => i.cat === curCat).length} {t('items')}{LIC_FOR[curCat] ? ` · ${t('lic.' + LIC_FOR[curCat], LIC_BY[LIC_FOR[curCat]].name)}${s.lic[LIC_FOR[curCat]] ? ' ✓' : ''}` : ''}</div>
            {ITEMS.filter(i => i.cat === curCat).map(i => {
              const need = LIC_FOR[curCat], locked = need && !s.lic[need];
              const irar = itemRarity(i);
              return <Row key={i.id} art={i.art} image={ITEM_IMAGES[i.id]} right={<Btn ic={locked ? 'ic-lock' : 'ic-bag'} label={locked ? t('needLicence') : fmt(i.price)} disabled={!!locked || s.money < i.price} onClick={() => act(st => buyItem(st, i.id))} />}>
                <b>{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name} <span className="rarity-chip" data-rarity={irar} style={{ '--rc': RARITY_COLOR[irar] } as React.CSSProperties}>{t('rarity.' + irar)}</span></b>
                <span className="sub">+{i.lux} {t('status')} · {t('loses', '', { n: (Math.abs(Math.min(i.rate, ASSET_DEPRECIATION_RATE)) * 100).toFixed(0) })} · {t('upkeep')} {fmt(i.price * 0.02)}{t('perYear')}</span>
              </Row>;
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ================= STOCKS =================
function StockTab({ s, act, qtyMap, setQtyMap }: { s: GameState; act: Act; qtyMap: Record<string, number>; setQtyMap: (m: Record<string, number>) => void }) {
  const { t } = useT();
  return (
    <>
      {STOCKS.map(st => {
        const p = s.prices[st.id], h = s.hist[st.id];
        const ch = h.length > 1 ? (p / h[h.length - 2] - 1) * 100 : 0, q = s.stk[st.id] || 0;
        const mn = Math.min(...h), mx = Math.max(...h), r = (mx - mn) || 1;
        const pts = h.map((v, i) => `${(i / Math.max(h.length - 1, 1) * 96).toFixed(1)},${(28 - (v - mn) / r * 24).toFixed(1)}`).join(' ');
        return <Row key={st.id} art={st.art}
          right={<div className="trade">
            <input className="qty" type="number" min={1} step={1} value={qtyMap[st.id] || 1} aria-label={`Quantity for ${st.id}`}
              onChange={e => setQtyMap({ ...qtyMap, [st.id]: Math.max(1, Math.floor(+e.target.value || 1)) })} />
            <button className="tsell" disabled={!q} onClick={() => act(g => { const r2 = trade(g, st.id, 'sell', qtyMap[st.id] || 1); return r2.msg; })}>{t('sellS')}</button>
            <button className="tbuy" disabled={s.money < p} onClick={() => act(g => { const r2 = trade(g, st.id, 'buy', qtyMap[st.id] || 1); return r2.ok ? r2.msg : null; })}>{t('buy')}</button>
          </div>}>
          <b>{st.id} <span className={ch >= 0 ? 'up' : 'down'}>{ch >= 0 ? '▲' : '▼'}{Math.abs(ch).toFixed(1)}%</span></b>
          <span className="sub">{st.name} · {fmt(p)} · {t('hold', '', { n: q })}</span>
          <svg className="spark" viewBox="0 0 96 30"><polyline fill="none" stroke={h[h.length - 1] >= h[0] ? '#4f7d5f' : '#a3524a'} strokeWidth="2.4" points={pts} /></svg>
        </Row>;
      })}
      <p className="sub">{t('stockNote')}</p>
    </>
  );
}

// ================= SOCIAL =================
function SocialTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const ann = socialIncome(s);
  const canHype = BIZ.some(b => branchCount(s, b.id) > 0);
  const canCharity = s.donated > 0;
  const [aiBusy, setAiBusy] = useState(false);
  // v10.5 — generate a post from the local LLM at 0.0.0.0:8888. Falls back
  // to creativePost() if the LLM is unreachable. Mirrors the /api/story
  // pattern: backend local → local template fallback.
  const aiPost = async () => {
    setAiBusy(true);
    let text: string | null = null;
    const hasBackend = process.env.NEXT_PUBLIC_HAS_BACKEND !== '0';
    if (hasBackend) {
      try {
        const snap = snapshot(getState());
        const res = await fetch(asset('/api/post'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: snap })
        });
        if (res.ok) {
          const j = await res.json() as { text?: string; source?: string };
          if (j && typeof j.text === 'string' && j.text.trim()) text = j.text.slice(0, 240);
        }
      } catch { /* fall through to local */ }
    }
    if (!text) text = creativePost(getState(), canHype ? 'hype' : 'update');
    act(st => { addPost(st, text!, 1.4); return t('posted', '', { n: st.social.followers.toLocaleString() }); });
    setAiBusy(false);
  };
  return (
    <>
      <div className="card sprof">
        <Art id={stageOf(s.age).art} className="avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b className="big">@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'mogul'}
            {s.social.verified && <span className="vbadge" title={t('verified')}>✓</span>}</b>
          <div className="mini">{s.nation} · {t('fame')} {Math.round(s.fame)}</div>
          <div className="sstat">
            <div><b>{s.social.followers.toLocaleString()}</b><div className="mini">{t('followers')}</div></div>
            <div><b>{s.social.posts.length}</b><div className="mini">{t('posts')}</div></div>
            <div><b>{ann > 0 ? '+' + fmt(ann) : '—'}</b><div className="mini">{t('adRevenue')}{t('perYear')}</div></div>
          </div>
        </div>
      </div>
      <h3>{t('posts')}</h3>
      <div className="trade" style={{ justifyContent: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
        <Btn ic="ic-ai" label={aiBusy ? t('divine.thinking') : t('postAi')} disabled={aiBusy} onClick={aiPost} />
        <Btn ic="ic-plus" label={t('postUpdate')} onClick={() => act(st => { addPost(st, creativePost(st, 'update'), 1); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-up" label={t('postHype')} disabled={!canHype} onClick={() => act(st => { addPost(st, creativePost(st, 'hype'), 1.6); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-heart" label={t('postCharity')} disabled={!canCharity} onClick={() => act(st => { addPost(st, creativePost(st, 'charity'), 1.4); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-star" label={t('postMilestone')} onClick={() => act(st => { addPost(st, creativePost(st, 'milestone'), 1.5); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
      </div>
      <div className="card">
        {s.social.posts.length ? s.social.posts.map((p, i) => (
          <div className="post" key={i}>
            <Art id={stageOf(s.age).art} className="pav" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '.9rem' }}>@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'mogul'}{s.social.verified && <span className="vbadge">✓</span>}</b>
              <div style={{ fontSize: '.92rem' }}>{p.t}</div>
              <span className="mini">♥ {p.likes.toLocaleString()} · {t('followers')} +{Math.round(p.likes * 0.3).toLocaleString()}</span>
            </div>
            <span className="plikes">♥ {p.likes.toLocaleString()}</span>
          </div>
        )) : <div className="sub">{t('noPosts')}</div>}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>{t('socialNote')}</p>
      <p className="sub">{t('socialDynamics')}</p>
      {canHype ? null : <p className="sub">{t('needBiz')}</p>}
      {canCharity ? null : <p className="sub">{t('needDonated')}</p>}
    </>
  );
}

// ================= CLUBS =================
function ClubTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const nw = netWorth(s);
  const [name, setName] = useState('');
  return (
    <>
      {CLUBS.map(c => {
        const mine = s.club === c.id, ok = nw >= c.min;
        return <Row key={c.id} art={c.art} right={<Btn ic={mine ? 'ic-check' : 'ic-crown'} label={mine ? t('member') : !ok ? t('minNw') + ' ' + fmt(c.min) : t('join') + ' · ' + fmt(c.fee)} disabled={mine || !ok || s.money < c.fee} onClick={() => act(st => joinClub(st, c.id))} />}>
          <b>{t('club.' + c.id, c.name)}{mine ? ' · ' + t('member') : ''}</b><span className="sub">{t('minNw')} {fmt(c.min)} · {t('fee')} {fmt(c.fee)} · {t('inc.biz')} ×{c.mult}</span>
        </Row>;
      })}
      {s.club === 'own'
        ? <Row art="c-own" right={<Btn ic="ic-check" label={t('member')} disabled />}><b>{s.ownClub}</b><span className="sub">{t('yourOwn')} · {t('inc.biz')} ×{OWN_CLUB_MULT}</span></Row>
        : nw >= FOUND_MIN_NW && (
          <Row art="c-own" right={<Btn ic="ic-crown" label={t('found') + ' · ' + fmt(FOUND_COST)} disabled={s.money < FOUND_COST} onClick={() => act(st => foundClub(st, name))} />}>
            <b>{t('foundOwn')}</b>
            <input className="qty" style={{ width: '100%', marginTop: 6 }} maxLength={30} placeholder={`e.g. ${s.name}’s circle`} value={name} onChange={e => setName(e.target.value)} />
          </Row>
        )}
      <p className="sub">{t('oneClub', '', { x: fmt(FOUND_MIN_NW) })}</p>
    </>
  );
}

// ================= PETS / COMPANIONS (v10.5) =================
// Adopt up to MAX_PETS (3). Each pet type has upfront cost, monthly upkeep,
// and passive bonuses (spirit regen per day + fame per year) that ONLY apply
// when the pet is happy (≥30). Neglected exotic pets can drain player health.
function PetsTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const totalBonus = petFameBonus(s);
  return (
    <>
      <h3>{t('tab.pets')}</h3>
      <p className="sub">{t('pets.sub')}</p>
      {totalBonus > 0 && <p className="mini" style={{ marginTop: 4 }}>{t('pets.fameBonus', '', { n: totalBonus })}</p>}
      {/* Owned pets */}
      {s.pets.length > 0 && (
        <>
          <h3>{t('pets.mine')}</h3>
          {s.pets.map((pet, idx) => {
            const def = PET_BY[pet.typeId]; if (!def) return null;
            const hColor = pet.happiness >= 60 ? 'var(--sage)' : pet.happiness >= 30 ? '#c9a070' : 'var(--brick)';
            const healthColor = pet.health >= 60 ? 'var(--sage)' : pet.health >= 30 ? '#c9a070' : 'var(--brick)';
            return <Row key={idx} art={def.art} right={<div className="trade" style={{ flexWrap: 'wrap' }}>
              <Btn ic="ic-bag" label={t('pets.feed') + ' ' + fmt(Math.round(def.upkeep * 0.5))} kind="ghost" disabled={s.money < Math.round(def.upkeep * 0.5)} onClick={() => act(st => careForPet(st, idx, 'feed'))} />
              <Btn ic="ic-heart" label={t('pets.play')} kind="ghost" onClick={() => act(st => careForPet(st, idx, 'play'))} />
              {(pet.typeId === 'dog' || pet.typeId === 'horse') && <Btn ic="ic-paw" label={t('pets.walk')} kind="ghost" onClick={() => act(st => careForPet(st, idx, 'walk'))} />}
              <Btn ic="ic-x" label={t('pets.rehome')} kind="ghost" onClick={() => act(st => abandonPet(st, idx))} />
            </div>}>
              <b>{pet.name} <span className="tag">{def.name}</span></b>
              <div className="famewrap" style={{ marginTop: 6 }}>
                <span className="mini">{t('pets.happiness')}</span>
                <div className="famebar"><i style={{ width: pet.happiness + '%', background: hColor }} /></div>
                <b>{Math.round(pet.happiness)}</b>
              </div>
              <div className="famewrap" style={{ marginTop: 4 }}>
                <span className="mini">{t('pets.health')}</span>
                <div className="famebar"><i style={{ width: pet.health + '%', background: healthColor }} /></div>
                <b>{Math.round(pet.health)}</b>
              </div>
              <span className="sub" style={{ display: 'block', marginTop: 4 }}>{def.blurb}</span>
              <span className="mini" style={{ display: 'block' }}>+{def.spiritBonus.toFixed(2)} {t('pets.spiritPerDay')} · +{def.fameBonus} {t('pets.famePerYear')}{def.healthDrain > 0 ? ` · ${t('pets.exoticWarn')}` : ''}</span>
            </Row>;
          })}
        </>
      )}
      {/* Adoption grid */}
      {s.pets.length < MAX_PETS && (
        <>
          <h3>{t('pets.adopt')}</h3>
          <div className="grid">
            {PETS.map(p => {
              const owned = s.pets.some(pet => pet.typeId === p.id);
              return <button key={p.id} className="tile" disabled={owned || s.money < p.cost}
                onClick={() => { act(st => adoptPet(st, p.id, name)); setName(''); }}>
                <Art id={p.art} />
                <span>
                  <b>{p.name}</b>
                  <span className="sub" style={{ display: 'block' }}>{p.blurb}</span>
                  <span className="sub" style={{ display: 'block' }}>{t('pets.cost')} {fmt(p.cost)} · {t('pets.upkeep')} {fmt(p.upkeep)}/mo · +{p.spiritBonus.toFixed(2)} {t('pets.spiritPerDay')} · +{p.fameBonus} {t('pets.famePerYear')}</span>
                </span>
              </button>;
            })}
          </div>
          <input className="qty" style={{ width: '100%', marginTop: 8 }} maxLength={24} placeholder={t('pets.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
          <p className="sub">{t('pets.adoptNote', '', { n: MAX_PETS - s.pets.length })}</p>
        </>
      )}
      {s.pets.length >= MAX_PETS && <p className="sub">{t('pets.maxReached')}</p>}
    </>
  );
}

// ================= RELATIONS (v10.5) =================
// 8 NPCs (4 male, 4 female), each with their own interests, nation, career,
// and personality. Friendship derives from shared interests (each shared
// interest = +5 base, each clashing vibe = -2) plus the player's interaction
// history. Romance is per-NPC, only meaningful with one at a time.
function RelationsTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const playerInts = new Set(s.ints);
  return (
    <>
      <h3>{t('relations.title')}</h3>
      <p className="sub">{t('relations.sub')}</p>
      {NPCS.map(npc => {
        const r = relationState(s, npc.id);
        const shared = npc.interests.filter(i => playerInts.has(i));
        const clash = npc.interests.filter(i => !playerInts.has(i));
        const fPct = (r.friendship + 100) / 2; // -100..100 → 0..100
        const fColor = r.friendship >= 50 ? 'var(--sage)' : r.friendship >= 0 ? '#c9a070' : 'var(--brick)';
        const fLabel = r.friendship >= 70 ? t('relations.bond') : r.friendship >= 30 ? t('relations.warm') : r.friendship >= 0 ? t('relations.cool') : r.friendship >= -30 ? t('relations.frost') : t('relations.hostile');
        const canPropose = r.friendship >= 70 && r.romance >= 60 && !s.married;
        return (
          <div key={npc.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Art id={npc.art} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{npc.name} <span className="tag">{npc.gender === 'f' ? '♀' : '♂'} · {npc.age} · {npc.nation}</span></b>
                <div className="sub">{npc.career} · {t('relations.vibe.' + npc.vibe)}</div>
                <div className="mini" style={{ marginTop: 4, fontStyle: 'italic' }}>{npc.blurb}</div>
              </div>
            </div>
            <div className="famewrap" style={{ marginTop: 8 }}>
              <span className="mini">{t('relations.friendship')}</span>
              <div className="famebar"><i style={{ width: fPct + '%', background: fColor }} /></div>
              <b>{Math.round(r.friendship)}</b>
            </div>
            <div className="mini">{fLabel} · {t('relations.romance')}: {Math.round(r.romance)}/100 · {t('relations.interactions', '', { n: r.interactions })}</div>
            <div className="mini" style={{ marginTop: 4 }}>
              {t('relations.shared')}: {shared.length ? shared.map(i => <span key={i} className="tag" style={{ background: '#e6f4ea', color: '#1e6b35', marginLeft: 3 }}>+{i}</span>) : <span className="mini">{t('relations.none')}</span>}
              {clash.length > 0 && <>  ·  {t('relations.clash')}: {clash.map(i => <span key={i} className="tag" style={{ background: '#faeae9', color: '#9c4a42', marginLeft: 3 }}>−{i}</span>)}</>}
            </div>
            <div className="trade" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <Btn ic="ic-heart" label={t('relations.talk')} kind="ghost" onClick={() => act(st => interactNPC(st, npc.id, 'talk'))} />
              <Btn ic="ic-bag" label={t('relations.gift') + ' ' + fmt(Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1)))))} kind="ghost" disabled={s.money < Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1))))} onClick={() => act(st => interactNPC(st, npc.id, 'gift'))} />
              <Btn ic="ic-check" label={t('relations.help') + ' $1K'} kind="ghost" disabled={s.money < 1000} onClick={() => act(st => interactNPC(st, npc.id, 'help'))} />
              <Btn ic="ic-x" label={t('relations.argue')} kind="ghost" onClick={() => act(st => interactNPC(st, npc.id, 'argue'))} />
              {canPropose && <Btn ic="ic-star" label={s.partner ? t('relations.marry') : t('relations.date')} kind="sageb" onClick={() => act(st => proposeToNPC(st, npc.id))} />}
            </div>
          </div>
        );
      })}
      <p className="sub">{t('relations.note')}</p>
    </>
  );
}

// ================= BANK =================
function BankTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const maxLoan = Math.max(0, Math.floor(netWorth(s) * .5 - s.bank.loan));
  let marginal = 0; { let lo = 0; for (const [hi, rate] of TAX_BRACKETS) { if (s.yIncome > lo) marginal = rate; lo = hi; } }
  const fameTxt = s.fame >= 1000 ? t('fameIconic') : s.fame >= 300 ? t('fameHousehold') : s.fame >= 100 ? t('fameFamous') : s.fame >= 25 ? t('fameWell') : s.fame > 0 ? t('fameGetting') : t('fameLevels');
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('savings')} ({(SAVE_RATE * 100).toFixed(0)}%{t('perYear')})</span><b>{fmt(s.bank.dep)}</b></div>
        <div className="lb"><span>{t('loan')} ({(LOAN_RATE * 100).toFixed(0)}%{t('perYear')})</span><b style={{ color: s.bank.loan > 0 ? 'var(--brick)' : undefined }}>{fmt(s.bank.loan)}</b></div>
        <div className="lb"><span>{t('incomeYear')}</span><b>{fmt(s.yIncome)}</b></div>
        <div className="lb"><span>{t('bracket', '', { x: '$' + TAX_FREE.toLocaleString() })}</span><b>{(marginal * 100).toFixed(0)}{t('marginal')}</b></div>
        <div className="lb"><span>{t('lastTax')}</span><b>{fmt(s.yTax)}</b></div>
      </div>
      <h3>{t('savings')}</h3>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-plus" label="+$10K" disabled={s.money < 10000} onClick={() => act(st => bankOp(st, 'dep', 10000))} />
        <Btn ic="ic-plus" label="+$100K" disabled={s.money < 100000} onClick={() => act(st => bankOp(st, 'dep', 100000))} />
        <Btn ic="ic-plus" label={t('allIn')} disabled={s.money <= 0} onClick={() => act(st => bankOp(st, 'dep', 'all'))} />
      </div>}>
        <b>{t('deposit')}</b><span className="sub">{t('whileSleep', '', { x: fmt(s.bank.dep * SAVE_RATE) })}</span>
      </Row>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-down" label="−$10K" kind="ghost" disabled={s.bank.dep < 10000} onClick={() => act(st => bankOp(st, 'wd', 10000))} />
        <Btn ic="ic-down" label="−$100K" kind="ghost" disabled={s.bank.dep < 100000} onClick={() => act(st => bankOp(st, 'wd', 100000))} />
        <Btn ic="ic-down" label={t('allOut')} kind="ghost" disabled={s.bank.dep <= 0} onClick={() => act(st => bankOp(st, 'wd', 'all'))} />
      </div>}>
        <b>{t('withdraw')}</b><span className="sub">{t('moveCash')}</span>
      </Row>
      <h3>{t('loan')}</h3>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-up" label={'$100K'} disabled={maxLoan < 100000} onClick={() => act(st => bankOp(st, 'loan', 100000))} />
        <Btn ic="ic-up" label={t('borrowMax')} disabled={maxLoan <= 0} onClick={() => act(st => bankOp(st, 'loan', 'all'))} />
      </div>}>
        <b>{t('borrow')}</b><span className="sub">{t('upTo', '', { x: fmt(maxLoan) })}</span>
      </Row>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-check" label={'$10K'} disabled={s.bank.loan <= 0 || s.money < 10000} onClick={() => act(st => bankOp(st, 'repay', 10000))} />
        <Btn ic="ic-check" label={t('repayAll')} disabled={s.bank.loan <= 0} onClick={() => act(st => bankOp(st, 'repay', 'all'))} />
      </div>}>
        <b>{t('repay')}</b><span className="sub">{t('owe', '', { x: fmt(s.bank.loan), i: fmt(s.bank.loan * LOAN_RATE) })}</span>
      </Row>
      <h3>{t('charityFame')}</h3>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="famewrap"><span className="mini">{t('fame')}</span><div className="famebar"><i style={{ width: Math.min(100, Math.log10(Math.max(1, s.fame + 1)) * 25) + '%' }} /></div><b>{Math.round(s.fame)}</b></div>
        <div className="mini">{fameTxt} · {t('bizIncomeFame', '', { n: ((fameBonus(s) - 1) * 100).toFixed(1) })}</div>
      </div>
      <Row art="i-art" right={<div className="trade">
        <Btn ic="ic-heart" label="+$1K" disabled={s.money < 1000} onClick={() => act(st => donate(st, 1000))} />
        <Btn ic="ic-heart" label="+$10K" disabled={s.money < 10000} onClick={() => act(st => donate(st, 10000))} />
        <Btn ic="ic-heart" label="+$100K" disabled={s.money < 100000} onClick={() => act(st => donate(st, 100000))} />
      </div>}>
        <b>{t('donate')}</b><span className="sub">{t('totalDonated')}: {fmt(s.donated)} · {t('fameFades')}</span>
      </Row>
    </>
  );
}

// ================= RANKING =================
function RankTab({ s, board, setBoard }: { s: GameState; board: string; setBoard: (b: 'all' | 'young' | 'industry' | 'nation') => void }) {
  const { t } = useT();
  const rows = botRows(s);
  const tabs: [string, string][] = [['all', t('rank.all')], ['young', t('rank.young')], ['industry', t('rank.industry')], ['nation', t('rank.nation')]];
  let body: React.ReactNode = null;
  if (board === 'young') {
    const list = rows.filter(r => r.a <= 35 && r.v >= 1e6).sort((a, b) => b.v - a.v).slice(0, 12);
    body = list.map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} {t('yrs')} · {r.nat}</span></span><span>{fmt(r.v)}</span></div>);
    if (!list.length) body = <div className="lb"><span>{t('noYoung')}</span></div>;
  } else if (board === 'industry') {
    const inds = [...new Set(rows.map(r => r.ind).filter(i => i && i !== '—'))];
    body = inds.map(ind => {
      const l = rows.filter(r => r.ind === ind).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={ind} className={'lb' + (lead.me ? ' me' : '')}><span>{ind}: {lead.n}{lead.me ? ' — ' + t('youLead') : me > -1 ? ` (${t('youAre', '', { n: me + 1 })})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else if (board === 'nation') {
    const nats = [...new Set(rows.map(r => r.nat))];
    body = nats.map(nat => {
      const l = rows.filter(r => r.nat === nat).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={nat} className={'lb' + (lead.me ? ' me' : '')}><span>{nat}: {lead.n}{me > -1 ? ` (${t('youAre', '', { n: me + 1 })})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else {
    body = [...rows].sort((a, b) => b.v - a.v).slice(0, 15).map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} {t('yrs')} · {r.nat} · {r.ind}</span></span><span>{fmt(r.v)}</span></div>);
  }
  return (<>
    <div className="rt">{tabs.map(([k, l]) => <button key={k} data-rt={k} aria-pressed={board === k} onClick={() => setBoard(k as 'all')}>{l}</button>)}</div>
    {body}
    <p className="sub">{t('rankNote')}</p>
  </>);
}

// ================= HALL OF FAME (v10.4) =================
// Split off from the World group's Ranking tab: where Ranking is the live
// leaderboard of fictional rivals scaled to the player's age, the Hall of
// Fame is a curated wall of REAL tycoons + the player's own past lives,
// each with a one-line note. The player's current run shows at the top as
// "in progress" until the game over modal writes the final entry.
function FameTab({ s }: { s: GameState }) {
  const { t } = useT();
  // Player's past lives — recorded at each reincarnation in s.pastLives.
  // Most-recent first so the chain reads top-down.
  const playerEntries = useMemo(() => {
    const out: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string; kind: 'player' }[] = [];
    if (s.hall) out.push({ ...s.hall, kind: 'player' });
    return out;
  }, [s.hall]);
  const pastLifeEntries = useMemo(() => (s.pastLives || []).slice().reverse().map(e => ({ ...e, kind: 'player' as const })), [s.pastLives]);
  // A handful of "rivals" — fictional note snippets drawn from BOTS so the
  // wall feels alive. Marked kind 'rival' so the chip distinguishes them.
  const rivalEntries = useMemo(() => {
    // Defined inline to avoid importing BOTS into the page (it's already
    // imported for the engine but keeping it local to RankTab keeps the
    // surface tight). We pull from the botRows() helper instead.
    return botRows(s).filter(r => !r.me).slice(0, 4).map(r => ({
      name: r.n, nation: r.nat, era: eraOf(worldYear(s)).name,
      industry: r.ind, peakNetWorth: fmt(r.v),
      note: `${r.nat} ${r.ind} tycoon — still active in ${worldYear(s)}.`,
      livedTo: r.a, tier: r.v >= 1e9 ? 'Billionaire' : r.v >= 1e8 ? 'Tycoon' : 'Comfortable',
      kind: 'rival' as const
    }));
  }, [s]);
  // Player's current life preview
  const currentLife = useMemo(() => {
    if (s.over || !s.started) return null;
    const entry = playerHallEntry(s);
    return { ...entry, note: t('fame.youDesc') };
  }, [s]);
  return (
    <>
      <h3>{t('fame.title')}</h3>
      <p className="sub">{t('fame.sub')}</p>

      {currentLife && (
        <>
          <h3>{t('fame.you')}</h3>
          <div className="hof-card me">
            <div className="hof-head">
              <span className="hof-kind" data-kind="player">{t('fame.kind.player')}</span>
              <b>{currentLife.name}</b>
              <span className="tag">{currentLife.nation}</span>
            </div>
            <div className="sub">{t('fame.era')}: {currentLife.era} · {t('fame.industry')}: {currentLife.industry} · {t('fame.peak')}: {currentLife.peakNetWorth}</div>
            <p className="mini" style={{ marginTop: 6, fontStyle: 'italic' }}>{currentLife.note}</p>
          </div>
        </>
      )}

      {playerEntries.length > 0 && (
        <>
          <h3>{t('fame.player')}</h3>
          {playerEntries.map((e, i) => (
            <div key={'p' + i} className="hof-card">
              <div className="hof-head">
                <span className="hof-kind" data-kind="player">{t('fame.kind.player')}</span>
                <b>{e.name}</b>
                <span className="tag">{e.nation}</span>
              </div>
              <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
              <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
            </div>
          ))}
        </>
      )}
      {playerEntries.length === 0 && !currentLife && pastLifeEntries.length === 0 && <p className="sub">{t('fame.empty')}</p>}

      {pastLifeEntries.length > 0 && (
        <>
          <h3>{t('fame.pastLives')}</h3>
          <p className="sub">{t('fame.pastLivesNote')}</p>
          {pastLifeEntries.map((e, i) => (
            <div key={'pl' + i} className="hof-card">
              <div className="hof-head">
                <span className="hof-kind" data-kind="player">#{pastLifeEntries.length - i}</span>
                <b>{e.name}</b>
                <span className="tag">{e.nation}</span>
                {e.cause && <span className="tag dark" style={{ fontSize: '.66rem' }}>{e.cause === 'reincarnated' ? '↻' : e.cause === 'health' ? '†' : '⌂'}</span>}
              </div>
              <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
              <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
            </div>
          ))}
        </>
      )}

      <h3>{t('fame.real')}</h3>
      {HALL_OF_FAME.map(h => (
        <div key={h.id} className="hof-card">
          <div className="hof-head">
            <span className="hof-kind" data-kind="real">{t('fame.kind.real')}</span>
            <b>{h.name}</b>
            <span className="tag">{h.nation}</span>
          </div>
          <div className="sub">{t('fame.era')}: {h.era} · {t('fame.industry')}: {h.industry} · {t('fame.peak')}: {h.peakNetWorth}</div>
          <p className="mini" style={{ marginTop: 6, fontStyle: 'italic' }}>{h.note}</p>
        </div>
      ))}

      <h3>{t('fame.rivals')}</h3>
      {rivalEntries.map((e, i) => (
        <div key={'r' + i} className="hof-card">
          <div className="hof-head">
            <span className="hof-kind" data-kind="rival">{t('fame.kind.rival')}</span>
            <b>{e.name}</b>
            <span className="tag">{e.nation}</span>
          </div>
          <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
          <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
        </div>
      ))}
    </>
  );
}

// ================= LINKS — how the systems connect (v9) =================
const LNODES: { id: string; x: number; y: number; w?: number }[] = [
  { id: 'edu', x: 20, y: 40 }, { id: 'job', x: 240, y: 40 }, { id: 'biz', x: 460, y: 40 }, { id: 'space', x: 680, y: 40 },
  { id: 'health', x: 20, y: 190 }, { id: 'level', x: 240, y: 190 }, { id: 'club', x: 460, y: 190 }, { id: 'fame', x: 680, y: 190 },
  { id: 'spirit', x: 20, y: 340 }, { id: 'social', x: 240, y: 340 }, { id: 'bank', x: 460, y: 340 }, { id: 'charity', x: 680, y: 340 },
  { id: 'income', x: 285, y: 486, w: 260 },
];
const NW = 150, NH = 52, IH = 58;
const LKEY: Record<string, string> = {
  edu: 'tab.edu', job: 'tab.career', biz: 'tab.biz', space: 'tab.space',
  health: 'tab.health', level: 'level', club: 'tab.club', fame: 'fame',
  spirit: 'ln.node.spirit', social: 'tab.social', bank: 'tab.bank', charity: 'ln.node.charity', income: 'ln.income',
};
type LEdge = [string, string, boolean, string?];
const LEDGES: LEdge[] = [
  ['edu', 'job', true], ['edu', 'biz', true, 'M 170 54 C 300 0 380 0 468 38'],
  ['job', 'income', true, 'M 340 92 C 420 180 420 300 414 484'],
  ['biz', 'income', true, 'M 500 92 C 420 220 415 330 414 484'],
  ['space', 'income', true, 'M 720 92 C 640 240 560 400 470 488'],
  ['social', 'income', true], ['bank', 'income', false],
  ['level', 'income', true, 'M 340 242 C 424 300 428 380 410 484'],
  ['health', 'income', false, 'M 95 242 C 190 320 210 420 302 482'],
  ['spirit', 'health', false], ['spirit', 'biz', false], ['spirit', 'space', false],
  ['fame', 'biz', true], ['fame', 'social', false], ['club', 'biz', true], ['charity', 'fame', true],
];
const cut = (x: string, n = 21) => (x.length > n ? x.slice(0, n - 1) + '…' : x);

function LinksTab({ s }: { s: GameState }) {
  const { t } = useT();
  const box = (id: string) => LNODES.find(n => n.id === id)!;
  const cx = (n: { id: string; x: number; y: number; w?: number }) => n.x + (n.w || NW) / 2;
  const path = ([a, b, , d]: LEdge): string => {
    if (d) return d;
    const A = box(a), B = box(b);
    if (A.y === B.y) return `M ${A.x + (A.w || NW)} ${A.y + NH / 2} L ${B.x - 4} ${B.y + NH / 2}`;
    if (A.y < B.y) return `M ${cx(A)} ${A.y + NH} L ${cx(B)} ${B.y - 4}`;
    return `M ${cx(A)} ${A.y} L ${cx(B)} ${B.y + NH + 4}`;
  };
  const val = (id: string): string => {
    switch (id) {
      case 'edu': { const ds = (Object.keys(FIELDS) as FieldKey[]).filter(f => s.deg[f]).map(f => FIELDS[f].names[s.deg[f] - 1]); return cut(ds.length ? ds[ds.length - 1] : t('ln.edu.none')); }
      case 'job': { const current = jobsOf(s); return cut(current.length ? current.map(j => t('job.' + j.id, j.name)).join(' + ') : t('ln.job.none')); }
      case 'biz': return '+' + fmt(bizIncome(s)) + t('perYear');
      case 'space': return spaceIncome(s) > 0 ? '+' + fmt(spaceIncome(s)) + t('perYear') : '—';
      case 'health': return Math.round(s.health) + '/100';
      case 'level': return `${t('lvl')} ${s.level} · ×${levelMult(s).toFixed(2)}`;
      case 'club': return '×' + clubMult(s).toFixed(2);
      case 'fame': return String(Math.round(s.fame));
      case 'spirit': return Math.round(s.spirit) + '/100';
      case 'social': return s.social.followers.toLocaleString();
      case 'bank': return fmt(s.bank.dep) + (s.bank.loan > 0 ? ' · ' + fmt(-s.bank.loan) : '');
      case 'charity': return fmt(s.donated);
      case 'income': return '+' + fmt(yearIncome(s)) + t('perYear');
      default: return '';
    }
  };
  const rows: [string, string][] = [
    ['ln.f.eduJob', (() => { const k = knowledgeText(s); return k === 'None yet' ? '—' : cut(k, 26); })()],
    ['ln.f.eduBiz', '×' + (1 + .15 * s.deg.business).toFixed(2)],
    ['ln.f.jobInc', jobIncome(s) ? '+' + fmt(jobIncome(s)) + t('perYear') : '—'],
    ['ln.f.bizInc', '+' + fmt(bizIncome(s)) + t('perYear')],
    ['ln.f.spaceInc', '×' + spaceMultiplier(s).toFixed(2)],
    ['ln.f.socInc', '+' + fmt(socialIncome(s)) + t('perYear')],
    ['ln.f.bankInt', '+' + fmt(s.bank.dep * SAVE_RATE) + t('perYear')],
    ['ln.f.levelInc', '×' + levelMult(s).toFixed(2)],
    ['ln.f.healthGig', '×' + healthMult(s).toFixed(2)],
    ['ln.f.spiritHealth', s.spirit >= 70 ? '×0.85' : '—'],
    ['ln.f.spiritBiz', spiritBizMult(s) > 1 ? '×1.10' : '—'],
    ['ln.f.spiritSpace', cosmicMult(s) > 1 ? '×1.25' : '—'],
    ['ln.f.fameBiz', '×' + fameBonus(s).toFixed(3)],
    ['ln.f.fameSoc', s.fame > 0 ? '✓' : '—'],
    ['ln.f.clubBiz', '×' + clubMult(s).toFixed(2)],
    ['ln.f.bizCap', '×' + bizMultiplier(s).toFixed(2)],
    ['ln.f.charity', fmt(s.donated) + ' · karma ' + s.karma],
    ['ln.f.farm', branchCount(s, 'farm') ? '+30%' : '—'],
    ['ln.f.tax', fmt(taxOf(s.yIncome))],
    ['ln.f.era', '×' + s.eraBiz.toFixed(2)],
    ['ln.f.age', '−' + decayPerYear(s) + t('perYear')],
  ];
  return (
    <>
      <h3>{t('tab.links')}</h3>
      <p className="sub">{t('ln.sub')}</p>
      <div className="lnleg">
        <span className="mini"><span className="sw" />{t('ln.direct')}</span>
        <span className="mini"><span className="sw ind" />{t('ln.indirect')}</span>
      </div>
      <div className="lnwrap">
        <svg className="lnmap" viewBox="0 0 830 570" role="img" aria-label={t('tab.links')}>
        <defs>
          <marker id="lnA" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#8a7a5f" /></marker>
          <marker id="lnB" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#8ba2b8" /></marker>
        </defs>
        {LEDGES.map((e, i) => <path key={i} className={'ln-e' + (e[2] ? '' : ' ind')} d={path(e)} markerEnd={`url(#${e[2] ? 'lnA' : 'lnB'})`} />)}
        {LNODES.map(n => (
          <g key={n.id} className={'ln-node' + (n.id === 'income' ? ' big' : '')}>
            <rect x={n.x} y={n.y} width={n.w || NW} height={n.id === 'income' ? IH : NH} rx="13" />
            <text x={cx(n)} y={n.y + (n.id === 'income' ? 24 : 21)} className="ln-name">{t(LKEY[n.id], LKEY[n.id])}</text>
            <text x={cx(n)} y={n.y + (n.id === 'income' ? 44 : 40)} className="ln-val">{val(n.id)}</text>
          </g>
        ))}
      </svg>
      </div>
      <h3>{t('ln.formulas')}</h3>
      <div className="card">
        {rows.map(([k, v]) => <div key={k} className="lb"><span className="sub">{t(k)}</span><b>{v}</b></div>)}
      </div>
      <p className="sub">{t('ln.sub')}</p>
    </>
  );
}

// ================= INTRO =================
function Intro({ onBegin }: { onBegin: (o: { name: string; byear: number; nation: string; religion: Religion; ints: string[]; tals: string[] }) => void }) {
  const { t, lang, setLang } = useT();
  const [name, setName] = useState('');
  const [byear, setByear] = useState(1992);
  const [nation, setNation] = useState('Vietnam');
  const [religion, setReligion] = useState<Religion>('none');
  const [ints, setInts] = useState<string[]>([]);
  const [tals, setTals] = useState<string[]>([]);
  const years: number[] = [];
  const nowY = new Date().getUTCFullYear();
  for (let y = nowY - 126; y <= nowY - 18; y++) years.push(y);
  const a = analyze(ints, tals);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string, max: number) => {
    const i = arr.indexOf(id);
    if (i > -1) set(arr.filter(x => x !== id));
    else if (arr.length < max) set([...arr, id]);
  };
  return (
    <div className="modal on"><div className="mcard">
      <h2>{t('createLife')}</h2>
      <p className="mini" style={{ marginTop: 0 }}>{t('introSub')}</p>
      <div className="field"><label>{t('lang')}</label>
        <div className="lang" style={{ display: 'inline-flex' }} role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} type="button" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </div>
      </div>
      <div className="field"><label>{t('name')}</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label>{t('birthYear')}</label>
        <select value={byear} onChange={e => setByear(+e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      <div className="field"><label>{t('country')}</label>
        <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{t('nat.' + n, n)}</option>)}</select></div>
      <div className="field"><label>{t('religion')}</label>
        <select value={religion} onChange={e => setReligion(e.target.value as Religion)}>
          {RELIGIONS.map(option => <option key={option} value={option}>{t('religion.' + option)}</option>)}
        </select>
      </div>
      <div className="field"><label>{t('interests')}</label>
        <div className="chips">{INTERESTS.map(i => (
          <button key={i.id} className={'chip' + (ints.includes(i.id) ? ' on' : '')} onClick={() => toggle(ints, setInts, i.id, 3)}><Art id={i.art} className="ca" />{t('int.' + i.id, i.label)}</button>
        ))}</div></div>
      <div className="field"><label>{t('talents')}</label>
        <div className="chips">{TALENTS.map(tl => (
          <button key={tl.id} className={'chip' + (tals.includes(tl.id) ? ' on' : '')} onClick={() => toggle(tals, setTals, tl.id, 2)}><Art id={tl.art} className="ca" />{t('tal.' + tl.id, tl.label)}</button>
        ))}</div></div>
      <div className="preview">
        <p><b>{t('youTurn18', '', { y: byear + 18, era: t('era.' + eraOf(byear + 18).from, eraOf(byear + 18).name) })}</b></p>
        {a.top
          ? <><p><b>{t('strongest')}:</b> {t('field.' + a.top, FIELDS[a.top].name)}{a.second ? ' · ' + t('backup') + ': ' + t('field.' + a.second, FIELDS[a.second].name) : ''}</p>
            <p><b>{t('suggested')}:</b> {PATHS[a.top].jobs}</p>
            <div>{a.perks.map(p => <span key={p} className="perk">{p}</span>)}</div></>
          : <p className="mini">{t('pickHint')}</p>}
      </div>
      <button className="ibtn" style={{ width: '100%' }} onClick={() => onBegin({ name: name || 'Alex', byear, nation, religion, ints, tals })}>
        <Ic id="ic-plus" className="bsi" /><span>{t('begin')}</span>
      </button>
    </div></div>
  );
}

// ================= EVENT MODAL / GAME OVER =================
function EventModal({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const life = currentEvent(s);
  const ev = life ? { title: life.title, text: life.text, choices: life.choices.map(c => ({ l: c.l, cost: c.cost })) } : s.aiEv!;
  const isAI = !life;
  const kind: AIEventKind | undefined = isAI ? s.aiEv?.kind : undefined;
  const kindBadge = kind ? t('ev.kind.' + kind) : null;
  const nwHint = Math.max(100000, netWorth(s));
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <div className="mini">{isAI ? (kindBadge ? `${t('aiTwist')} · ${kindBadge}` : t('aiTwist')) : t('lifeEvent')}</div>
      {isAI && kind && <div className="evkind" data-kind={kind}>{kindBadge}</div>}
      <h2>{ev.title}</h2>
      <p style={{ margin: '0 0 14px' }}>{ev.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(() => {
          const anyOk = ev.choices.some(c => ((c as { cost?: number }).cost || 0) <= s.money);
          return ev.choices.map((c, i) => {
            const cost = (c as { cost?: number }).cost || 0;
            const extra: string[] = [];
            const cc = c as { money?: number; fame?: number; decline?: number; dropout?: unknown; liquidate?: unknown };
            if (cc.money) extra.push((cc.money > 0 ? '+' : '') + fmt(cc.money));
            if (cc.fame) extra.push(`fame ${cc.fame > 0 ? '+' : ''}${cc.fame}`);
            if (cc.decline) extra.push(`-${cc.decline}hp`);
            if (cc.dropout) extra.push('dropout');
            if (cc.liquidate) extra.push('liquidate');
            // v10.5 — colour the button by risk: green = safe 80/20, orange = medium 50/50, red = high 20/80
            const risk: ChoiceRisk = isAI
              ? choiceRisk(cc as Parameters<typeof choiceRisk>[0], nwHint)
              : 'medium';
            const riskLabel = risk === 'safe' ? t('risk.safe') : risk === 'medium' ? t('risk.medium') : t('risk.high');
            return <Btn key={i} ic={['ic-check', 'ic-up', 'ic-plus'][risk === 'safe' ? 0 : risk === 'medium' ? 2 : 1]}
              kind={risk === 'safe' ? 'sageb' : risk === 'high' ? 'danger' : ''}
              dp={{ 'data-risk': risk } as Record<string, string>}
              label={c.l + (cost ? ' · ' + fmt(cost) : '') + (extra.length ? ` (${extra.join(' · ')})` : '') + ` · ${riskLabel}`}
              disabled={cost > s.money && anyOk}
              onClick={() => act(st => isAI ? applyAIChoice(st, i) : applyEventChoice(st, i))} />;
          });
        })()}
      </div>
      <p className="mini" style={{ marginTop: 12 }}>
        <span className="risk-dot" data-risk="safe" />{t('risk.safe')} ·
        <span className="risk-dot" data-risk="medium" />{t('risk.medium')} ·
        <span className="risk-dot" data-risk="high" />{t('risk.high')}
      </p>
    </div></div>
  );
}

function GameOver({ s, onAgain }: { s: GameState; onAgain: () => void }) {
  const { t } = useT();
  // Record the player's hall entry as soon as the game-over modal mounts.
  useEffect(() => { recordHallOnGameOver(s); persist(); }, [s]);
  const { tier, nw } = gameOverTier(s);
  const tierKey = 'tier.' + ({ 'Humble beginnings': 'humble', 'Comfortable life': 'comfortable', 'Tycoon': 'tycoon', 'Billionaire': 'billionaire', 'Legend': 'legend' } as Record<string, string>)[tier];
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <h2>{t(tierKey, tier)}</h2>
      <div>{s.cause === 'health'
        ? <>{t('livedToHealth', '', { a: Math.floor(s.age) })} <b>{fmt(nw)}</b>.</>
        : <>{t('livedTo')} <b>{fmt(nw)}</b>.</>}<br />
        <span className="mini">{t('finalLine', '', { k: knowledgeText(s), f: s.fame, d: fmt(s.donated), ka: s.karma, l: s.level, fo: s.social.followers.toLocaleString() })}</span></div>
      <button className="ibtn" style={{ marginTop: 16 }} onClick={onAgain}>
        <Ic id="ic-plus" className="bsi" /><span>{t('liveAgain')}</span>
      </button>
    </div></div>
  );
}
