'use client';
// Tycoon Life v8 — React edition. Grouped tabs, gigs, levels, social, the
// cosmic frontier, EN/VI/中文, LLM oracle (backend + local fallback).
import { useCallback, useEffect, useRef, useState } from 'react';
import { Art, Ic, ART_DEFS } from '@/lib/art';
import { useGame, getState, persist, bump, resetState } from '@/lib/store';
import {
  START, END_AGE, RETIRE, RESALE_FEE, FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, ALLNEWS, eraOf, NATIONS, INTERESTS, TALENTS, PATHS,
  analyze, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES, BIZ, FARM_LINES, FAC_LINES, ITEM_BY, STOCKS,
  CLUBS, JOBS, GIGS, SPACE_LINES, TABS, xpNeed, ITEMS, type FieldKey, type Req,
} from '@/lib/gameData';
import {
  fmt, taxOf, fresh, begin, tick, stageOf, worldYear, branchCount, bizCost, clubMult, branchNet,
  bizIncome, jobOf, yearIncome, living, lotValue, upkeep, assetVal, bizVal, stockVal, netWorth,
  effYears, tuitionOf, meets, reqText, knowledgeText, snapshot,
  processDay, yearEnd,
  doGig, gigReady, gigLock, gigPay, addPost, buySpace, spaceIncome, socialIncome, levelMult,
  openBranch, buyFarmLine, buyFacLine, buyItem, sellLot, trade, joinClub, foundClub,
  hire, enrollDeg, enrollLic, bankOp, donate, applyEventChoice, applyAIChoice, currentEvent,
  gameOverTier, botRows, type AIEvent, type GameState,
} from '@/lib/engine';
import { localTwist } from '@/lib/story';
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
  const [rankBoard, setRankBoard] = useState<'all' | 'young' | 'industry' | 'nation'>('all');
  const [curCat, setCurCat] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setAiNote(t('oracle.note')); }, [t]);

  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const act = useCallback((fn: (st: GameState) => string | null | void) => {
    const st = getState();
    const msg = fn(st);
    if (typeof msg === 'string' && msg) showToast(msg);
    persist(); bump();
  }, [showToast]);

  // game clock
  useEffect(() => {
    let last = Date.now();
    const iv = setInterval(() => {
      const st = getState();
      if (document.hidden) { last = Date.now(); return; }
      const now = Date.now();
      const res = tick(st, now - last);
      last = now;
      if (res.yearToast) showToast(res.yearToast);
      if (res.gameJustOver) showToast(t('livedToast'));
      persist(); bump();
    }, 250);
    const onVis = () => { last = Date.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [showToast, t]);

  const askAI = useCallback(async () => {
    setAiBusy(true); setAiNote(t('oracle.thinking'));
    const st = getState();
    let ev: AIEvent | null = null;
    // Static GitHub Pages build ships NEXT_PUBLIC_HAS_BACKEND=0 → the built-in
    // story engine answers instantly. Self-hosted builds (npm dev/start) call
    // the real LLM endpoint at /api/story and fall back locally on failure.
    const hasBackend = process.env.NEXT_PUBLIC_HAS_BACKEND !== '0';
    if (hasBackend) {
      try {
        const res = await fetch(asset('/api/story'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: snapshot(st), used: st.story.used })
        });
        if (res.ok) {
          const j = await res.json();
          if (j && j.title && j.choices) ev = { ...j, source: 'backend' };
        }
      } catch { /* fall through to local */ }
    }
    if (!ev) { try { ev = localTwist(snapshot(st), st.story.used); } catch { ev = null; } }
    if (ev) {
      st.aiEv = ev;
      setAiNote(ev.source === 'backend' ? t('oracle.backend') : t('oracle.local'));
      bump(); persist();
    } else setAiNote(t('oracle.fail'));
    setAiBusy(false);
  }, [t]);

  const stageName = (st: GameState) => t('stage.' + STAGES.indexOf(stageOf(st.age)), stageOf(st.age).name);
  const eraName = (y: number) => t('era.' + eraOf(y).from, eraOf(y).name);

  return (
    <div className="tgame">
      <div dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
      <div className="wrap">
        <Header s={s} onReset={resetState} eraName={eraName} />
        <AgeBox s={s} t={t} />
        <nav role="tablist" className="tnav">
          {TABS.map(([k, n, ic]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-t={k}
              onClick={() => setTab(k)}>{Ic({ id: ic, className: 'si navsi' })}{t('tab.' + k, n)}</button>
          ))}
        </nav>
        <main id="tview" key={tab} className="enter">
          {tab === 'home' && <HomeTab s={s} act={act} askAI={askAI} aiBusy={aiBusy} aiNote={aiNote} eraName={eraName} />}
          {tab === 'career' && <CareerTab s={s} act={act} />}
          {tab === 'biz' && <BizTab s={s} act={act} />}
          {tab === 'space' && <SpaceTab s={s} act={act} />}
          {tab === 'shop' && <ShopTab s={s} act={act} curCat={curCat} setCurCat={setCurCat} />}
          {tab === 'stock' && <StockTab s={s} act={act} qtyMap={qtyMap} setQtyMap={setQtyMap} />}
          {tab === 'social' && <SocialTab s={s} act={act} />}
          {tab === 'club' && <ClubTab s={s} act={act} />}
          {tab === 'bank' && <BankTab s={s} act={act} />}
          {tab === 'rank' && <RankTab s={s} board={rankBoard} setBoard={setRankBoard} />}
        </main>
        <footer className="mini tfoot">{t('footer')}</footer>
      </div>

      {toast && <div id="ttoast" key={toast.id} className="on">{toast.msg}</div>}

      {!s.started && <Intro onBegin={opts => act(st => { begin(st, opts); showToast(`${t('begin')}: ${opts.name} 🎉`); })} />}
      {(s.pending || s.aiEv) && <EventModal s={s} act={act} />}
      {s.over && <GameOver s={s} onAgain={resetState} />}
    </div>
  );
}

// ================= shared bits =================
type Act = (fn: (st: GameState) => string | null | void) => void;
type TFn = ReturnType<typeof useT>['t'];

function Row({ art, children, right }: { art: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="row">{art && <Art id={art} />}<div className="info">{children}</div>{right}</div>;
}
function Btn({ ic, label, onClick, disabled, kind }: { ic: string; label: string; onClick?: () => void; disabled?: boolean; kind?: string }) {
  return (
    <button className={'ibtn ' + (kind || '')} onClick={onClick} disabled={disabled}>
      <Ic id={ic} className="bsi" /><span>{label}</span>
    </button>
  );
}
// reqText() is engine-side English; empty requirements get a translated label.
function useReqLabel() {
  const { t } = useT();
  return (req?: Req) => (req && Object.keys(req).length ? reqText(req) : t('noReq'));
}

function Header({ s, onReset, eraName }: { s: GameState; onReset: () => void; eraName: (y: number) => string }) {
  const { t, lang, setLang } = useT();
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  return (
    <header className="top">
      <div className="brand">
        <Art id="s-coin" className="logo" />
        <div><h1>Tycoon Life <span className="mini">v8</span></h1>
          <div className="mini">{s.started ? `${s.nation} · ${eraName(worldYear(s))}` : 'Build an empire before you turn 90'}</div></div>
      </div>
      <div><div className="mini">{t('cash')}</div><div id="tcash" style={{ color: s.money < 0 ? 'var(--brick)' : undefined }}>{fmt(s.money)}</div>
        <div className="mini">{t('netWorth')} {fmt(netWorth(s))} · {yearIncome(s) >= 0 ? '+' : ''}{fmt(yearIncome(s))}{t('perYear')}</div></div>
      <div className="hstack">
        <span className="lvlchip" title={t('level')}><Ic id="ic-xp" className="bsi" />{t('lvl')} {s.level}
          <span className="bar"><i style={{ width: xpPct + '%' }} /></span></span>
        <span className="lang" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </span>
        <button className="ghost tsmall" onClick={onReset}>{t('newLife')}</button>
      </div>
    </header>
  );
}

function AgeBox({ s, t }: { s: GameState; t: TFn }) {
  const a = s.age, st = stageOf(a), pct = (a - START) / (END_AGE - START) * 100;
  const p = (x: number) => ((x - START) / (END_AGE - START) * 100).toFixed(2) + '%';
  const d = new Date(Date.UTC(s.byear + 18, 8, 1) + Math.floor(s.lastDay) * 864e5);
  const dstr = d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const marks: [number, string][] = [[START, String(START)], [22, t('degrees')], [26, t('jobs')], [RETIRE, t('stage.3')], [END_AGE, '90']];
  return (
    <section className="card age">
      <div className="agehead"><b>{s.name} · {t('age')} {Math.floor(a)}</b>
        <span className="tag dark">{t('stage.' + STAGES.indexOf(st), st.name)}</span>
        <span className="mini">{dstr}</span>
        <span className="mini">{t('fame')} {s.fame} · {t('followers')} {s.social.followers.toLocaleString()}</span></div>
      <div className="track" style={{ background: `linear-gradient(90deg,#8fae9b 0 ${p(22)},#c9b68e ${p(22)} ${p(26)},#c08a80 ${p(26)} ${p(RETIRE)},#9b93a8 ${p(RETIRE)})` }}>
        <div className="shade" style={{ left: pct + '%' }} /><div className="mark" style={{ left: pct + '%' }} />
      </div>
      <div className="ms">{marks.map(([m, lb]) => <span key={lb + m} style={{ left: p(m) }}>{m} {lb}</span>)}</div>
    </section>
  );
}

// ================= HOME =================
function HomeTab({ s, act, askAI, aiBusy, aiNote, eraName }: { s: GameState; act: Act; askAI: () => void; aiBusy: boolean; aiNote: string; eraName: (y: number) => string }) {
  const { t } = useT();
  const y = worldYear(s), era = eraOf(y), news = ALLNEWS[y] || [];
  const j = jobOf(s);
  const studyTxt = s.study ? `${s.study.name} · ${Math.max(0, (s.study.end - s.day) / 365.25).toFixed(1)} ${t('years')}` : t('notStudying');
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  const incRows: [string, number][] = [
    [t('inc.salary'), j ? j.salary : 0],
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
        <div className="heroimg" style={{ backgroundImage: 'url(' + asset('/img/hero-city.jpg') + ')' }} aria-hidden="true" />
        <div className="herobody">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Art id={stageOf(s.age).art} />
            <div>
              <b className="big">{s.name}, {t('stage.' + STAGES.indexOf(stageOf(s.age)), stageOf(s.age).name)}</b>
              <div className="sub">{j ? t('workingAs', '', { j: t('job.' + j.id, j.name), s: fmt(j.salary) }) : t('notEmployed')}</div>
              <div className="sub">{t('knowledge')}: {knowledgeText(s)}</div>
              <div className="sub">{t('study')}: {studyTxt}</div>
              <div className="sub">{t('rentBills')}: {fmt((living(Math.floor(s.age)) + upkeep(s) + (s.study && s.study.kind === 'deg' ? s.study.tuition : 0)) / 12)}{t('perMonth')}</div>
            </div>
          </div>
          <div className="mini" style={{ marginTop: 10 }}>{t('level')} {s.level} · {s.xp}/{xpNeed(s.level)} XP · +{((s.level - 1) * 2).toFixed(0)}% {t('inc.total').toLowerCase()}</div>
          <div className="xpbar"><i style={{ width: xpPct + '%' }} /></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>{t('worth')} · {t('netWorth')}</span><b>{fmt(netWorth(s))}</b></div>
        {assetRows.map(([k, v]) => <div key={k} className="lb"><span>{k}</span><span style={{ color: v < 0 ? 'var(--brick)' : undefined }}>{fmt(v)}</span></div>)}
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
      <details className="fold">
        <summary>{t('lifeLog')}</summary>
        <div className="foldbody"><div className="feed">{s.log.slice(-16).reverse().map((x, i) => <div key={i}>{x}</div>)}</div></div>
      </details>
    </>
  );
}

// ================= CAREER =================
function CareerTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  return (
    <>
      <h3>{t('jobs')}</h3>
      {JOBS.map(jb => {
        const mine = s.job === jb.id;
        const lock = !mine && !meets(s, jb.req) ? t('requires') + ' ' + reqLabel(jb.req) : (jb.ft && s.study) ? t('inProgress') : s.age >= RETIRE ? t('stage.3') : '';
        return <Row key={jb.id} art={jb.art} right={<Btn ic={mine ? 'ic-x' : 'ic-plus'} label={mine ? t('quit') : (lock || t('apply'))} kind={mine ? 'ghost' : ''} disabled={!mine && !!lock}
          onClick={() => act(st => hire(st, jb.id))} />}>
          <b>{t('job.' + jb.id, jb.name)}{mine && ' · ' + t('current')}</b>
          <span className="sub">{fmt(jb.salary)}{t('perYear')} · {t('requires')} {reqLabel(jb.req)}</span>
        </Row>;
      })}
      <h3>{t('degrees')}</h3>
      {(Object.keys(FIELDS) as FieldKey[]).map(f => {
        const F = FIELDS[f], cur = s.deg[f], max = F.names.length;
        if (cur >= max) return <Row key={f} art={F.art} right={<Btn ic="ic-check" label={t('done')} disabled />}><b>{t('field.' + f, F.name)}: {F.names[cur - 1]}</b><span className="sub">{t('highest')}</span></Row>;
        const L = cur + 1;
        const reason = s.study ? (s.study.kind === 'deg' && s.study.field === f ? t('inProgress') : t('busy')) : s.age > F.maxAge[L - 1] ? t('tooOld') : (jobOf(s) && jobOf(s)!.ft) ? t('quitFirst') : '';
        return <Row key={f} art={F.art} right={<Btn ic="ic-cap" label={reason || t('enroll')} disabled={!!reason} onClick={() => act(st => enrollDeg(st, f))} />}>
          <b>{t('field.' + f, F.name)}: {F.names[L - 1]}</b>
          <span className="sub">{effYears(s, f, L).toFixed(1)} {t('years')} · {F.tuition[L - 1] ? fmt(tuitionOf(s, f, L)) + t('perYear') + ' ' + t('tuition') + (s.topField === f ? ' (−20%)' : '') : t('funded')}{cur ? ' · ' + t('buildsOn') + ' ' + F.names[cur - 1] : ''}</span>
        </Row>;
      })}
      <h3>{t('licences')}</h3>
      {LICENSES.map(l => {
        const owned = !!s.lic[l.id], studying = s.study && s.study.kind === 'lic' && s.study.id === l.id;
        const label = owned ? t('done') : studying ? t('inProgress') : s.study ? t('busy') : s.money < l.cost ? t('needLicence') : t('enroll');
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-cap'} label={owned ? t('done') : label} disabled={owned || !!studying || !!s.study || s.money < l.cost}
          onClick={() => act(st => enrollLic(st, l.id))} />}>
          <b>{t('lic.' + l.id, l.name)}</b><span className="sub">{fmt(l.cost)} {t('fee')} · {t('dayCourse', '', { n: l.days })} · {t('neededFor')} {Object.keys(LIC_FOR).filter(k => LIC_FOR[k] === l.id).join(', ')}</span>
        </Row>;
      })}
    </>
  );
}

// ================= BUSINESS =================
function BizTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  const mult = clubMult(s) * (1 + .15 * s.deg.business) * (1 + s.fame * .002) * s.eraBiz * levelMult(s);
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
        return <Row key={l.id} art="b-farm" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('active') : why || t('expand')} disabled={owned || !!why} onClick={() => act(st => buyFarmLine(st, l.id))} />}>
          <b>{t('farm.' + l.id, l.name)}{owned ? ' · ' + t('active') : ''}</b><span className="sub">+{fmt(l.inc)}{t('perYear')} · {t('setup')} {fmt(l.cost)} · {t('since')} {l.since}</span>
        </Row>;
      })}
      <h3>{t('facLines')}</h3>
      {FAC_LINES.map(l => {
        const owned = s.fac[l.id];
        const why = !branchCount(s, 'fac') ? t('facFirst') : worldYear(s) < l.since ? t('unlocksIn', '', { y: l.since }) :
          (l.food && !branchCount(s, 'farm')) ? t('farmFirst') : (l.needs && !s.fac[l.needs]) ? t('needsUpstream', '', { x: t('fac.' + l.needs, FAC_LINES.find(x => x.id === l.needs)!.name) }) : s.money < l.cost ? t('needLicence') : '';
        return <Row key={l.id} art="b-fac" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('active') : why || t('build')} disabled={owned || !!why} onClick={() => act(st => buyFacLine(st, l.id))} />}>
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
      {SPACE_LINES.map(l => {
        const owned = s.space[l.id];
        const lvlOk = s.level >= l.lvl, yrOk = y >= l.since, moneyOk = s.money >= l.cost;
        const why = !lvlOk ? t('lvlReq', '', { n: l.lvl }) : !yrOk ? t('unlocksIn', '', { y: l.since }) : !moneyOk ? t('needLicence') : '';
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? t('founded') : why || t('found')} disabled={owned || !!why} onClick={() => act(st => buySpace(st, l.id))} />}>
          <b>{t('space.' + l.id, l.name)} <span className="tag">{t('lvlReq', '', { n: l.lvl })}</span> <span className="tag">{t('since')} {l.since}</span></b>
          <span className="sub">+{fmt(l.inc)}{t('perYear')} · {t('setup')} {fmt(l.cost)}</span>
          <span className="sub" style={{ display: 'block' }}>{l.desc}</span>
        </Row>;
      })}
      <p className="sub">{t('spaceNote')}</p>
    </>
  );
}

// ================= SHOP =================
const CATART: Record<string, string> = { 'Sport bike': 'i-bike', 'Phone': 'i-phone', 'Watch': 'i-watch', 'Jewelry': 'i-ring', 'Suit': 'i-suit', 'Car': 'i-lambo', 'Property': 'i-house', 'Yacht': 'i-yacht', 'Private jet': 'i-jet', 'Art': 'i-art' };

function ShopTab({ s, act, curCat, setCurCat }: { s: GameState; act: Act; curCat: string | null; setCurCat: (c: string | null) => void }) {
  const { t } = useT();
  const cats = [...new Set(ITEMS.map(i => i.cat))];
  return (
    <>
      {s.lots.length > 0 && (<><h3>{t('myItems')}</h3>
        {s.lots.map((l, idx) => {
          const it = ITEM_BY[l.id], v = lotValue(s, l), resale = v * (1 - RESALE_FEE);
          return <Row key={idx} art={it.art} right={<Btn ic="ic-down" label={t('sell') + ' ' + fmt(resale)} kind="ghost" onClick={() => act(st => sellLot(st, idx))} />}>
            <b>{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name}</b>
            <span className="sub">{t('paid')} {fmt(l.paid)} · {t('worthNow')} {fmt(v)} · {v >= l.paid ? t('gains', '', { n: ((v / l.paid - 1) * 100).toFixed(0) }) : t('loses', '', { n: ((1 - v / l.paid) * 100).toFixed(0) })}</span>
          </Row>;
        })}</>)}
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
              return <Row key={i.id} art={i.art} right={<Btn ic={locked ? 'ic-lock' : 'ic-bag'} label={locked ? t('needLicence') : fmt(i.price)} disabled={!!locked || s.money < i.price} onClick={() => act(st => buyItem(st, i.id))} />}>
                <b>{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name}</b>
                <span className="sub">+{i.lux} {t('status')} · {i.rate >= 0 ? t('gains', '', { n: (i.rate * 100).toFixed(0) }) : t('loses', '', { n: (Math.abs(i.rate) * 100).toFixed(0) })} · {t('upkeep')} {fmt(i.price * 0.02)}{t('perYear')}</span>
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
  return (
    <>
      <div className="card sprof">
        <Art id={stageOf(s.age).art} className="avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b className="big">@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'tycoon'}
            {s.social.verified && <span className="vbadge" title={t('verified')}>✓</span>}</b>
          <div className="mini">{s.nation} · {t('fame')} {s.fame}/100</div>
          <div className="sstat">
            <div><b>{s.social.followers.toLocaleString()}</b><div className="mini">{t('followers')}</div></div>
            <div><b>{s.social.posts.length}</b><div className="mini">{t('posts')}</div></div>
            <div><b>{ann > 0 ? '+' + fmt(ann) : '—'}</b><div className="mini">{t('adRevenue')}{t('perYear')}</div></div>
          </div>
        </div>
      </div>
      <h3>{t('posts')}</h3>
      <div className="trade" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
        <Btn ic="ic-plus" label={t('postUpdate')} onClick={() => act(st => { addPost(st, 'Just a life update from my little corner of the world.', 1); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-up" label={t('postHype')} disabled={!canHype} onClick={() => act(st => { addPost(st, 'Behind the scenes at my company today. We are just getting started.', 1.6); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-heart" label={t('postCharity')} disabled={!canCharity} onClick={() => act(st => { addPost(st, 'Proud to support causes bigger than any of us. Join me?', 1.4); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
      </div>
      <div className="card">
        {s.social.posts.length ? s.social.posts.map((p, i) => (
          <div className="post" key={i}>
            <Art id={stageOf(s.age).art} className="pav" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '.9rem' }}>@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'tycoon'}{s.social.verified && <span className="vbadge">✓</span>}</b>
              <div style={{ fontSize: '.92rem' }}>{p.t}</div>
              <span className="mini">♥ {p.likes.toLocaleString()} · {t('followers')} +{Math.round(p.likes * 0.3).toLocaleString()}</span>
            </div>
            <span className="plikes">♥ {p.likes.toLocaleString()}</span>
          </div>
        )) : <div className="sub">{t('noPosts')}</div>}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>{t('socialNote')}</p>
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

// ================= BANK =================
function BankTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const maxLoan = Math.max(0, Math.floor(netWorth(s) * .5 - s.bank.loan));
  let marginal = 0; { let lo = 0; for (const [hi, rate] of TAX_BRACKETS) { if (s.yIncome > lo) marginal = rate; lo = hi; } }
  const fameTxt = s.fame >= 80 ? t('fameHousehold') : s.fame >= 50 ? t('fameFamous') : s.fame >= 25 ? t('fameWell') : s.fame > 0 ? t('fameGetting') : t('fameLevels');
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
        <div className="famewrap"><span className="mini">{t('fame')}</span><div className="famebar"><i style={{ width: s.fame + '%' }} /></div><b>{s.fame}</b></div>
        <div className="mini">{fameTxt} · {t('bizIncomeFame', '', { n: (s.fame * .2).toFixed(1) })}</div>
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

// ================= INTRO =================
function Intro({ onBegin }: { onBegin: (o: { name: string; byear: number; nation: string; ints: string[]; tals: string[] }) => void }) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [byear, setByear] = useState(1992);
  const [nation, setNation] = useState('Vietnam');
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
      <div className="field"><label>{t('name')}</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label>{t('birthYear')}</label>
        <select value={byear} onChange={e => setByear(+e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      <div className="field"><label>{t('country')}</label>
        <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{t('nat.' + n, n)}</option>)}</select></div>
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
      <button className="ibtn" style={{ width: '100%' }} onClick={() => onBegin({ name: name || 'Alex', byear, nation, ints, tals })}>
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
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <div className="mini">{isAI ? t('aiTwist') : t('lifeEvent')}</div>
      <h2>{ev.title}</h2>
      <p style={{ margin: '0 0 14px' }}>{ev.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(() => {
          const anyOk = ev.choices.some(c => ((c as { cost?: number }).cost || 0) <= s.money);
          return ev.choices.map((c, i) => {
            const cost = (c as { cost?: number }).cost || 0;
            return <Btn key={i} ic={['ic-plus', 'ic-check', 'ic-up'][i % 3]}
              label={c.l + (cost ? ' · ' + fmt(cost) : '')}
              disabled={cost > s.money && anyOk}
              onClick={() => act(st => isAI ? applyAIChoice(st, i) : applyEventChoice(st, i))} />;
          });
        })()}
      </div>
    </div></div>
  );
}

function GameOver({ s, onAgain }: { s: GameState; onAgain: () => void }) {
  const { t } = useT();
  const { tier, nw } = gameOverTier(s);
  const tierKey = 'tier.' + ({ 'Humble beginnings': 'humble', 'Comfortable life': 'comfortable', 'Tycoon': 'tycoon', 'Billionaire': 'billionaire', 'Legend': 'legend' } as Record<string, string>)[tier];
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <h2>{t(tierKey, tier)}</h2>
      <div>{t('livedTo')} <b>{fmt(nw)}</b>.<br />
        <span className="mini">{t('finalLine', '', { k: knowledgeText(s), f: s.fame, d: fmt(s.donated), l: s.level, fo: s.social.followers.toLocaleString() })}</span></div>
      <button className="ibtn" style={{ marginTop: 16 }} onClick={onAgain}>
        <Ic id="ic-plus" className="bsi" /><span>{t('liveAgain')}</span>
      </button>
    </div></div>
  );
}
