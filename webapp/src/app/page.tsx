'use client';
// Tycoon Life — React edition with an LLM story backend (/api/story).
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Art, Ic, ART_DEFS } from '@/lib/art';
import {
  useGame, getState, persist, bump, resetState,
} from '@/lib/store';
import {
  START, END_AGE, RETIRE, RESALE_FEE, FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT, OWN_CLUB_MAX_MEMBERS,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, ALLNEWS, eraOf, NATIONS, INTERESTS, TALENTS, PATHS,
  analyze, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES, BIZ, FARM_LINES, FAC_LINES, ITEM_BY, STOCKS,
  CLUBS, JOBS, TABS, type FieldKey,
} from '@/lib/gameData';
import {
  fmt, taxOf, fresh, begin, tick, stageOf, worldYear, branchCount, bizCost, clubMult, branchNet,
  bizIncome, jobOf, yearIncome, living, lotValue, upkeep, assetVal, bizVal, stockVal, netWorth,
  clickVal, effYears, tuitionOf, lineReady, meets, reqText, knowledgeText, snapshot,
  doWork, openBranch, buyFarmLine, buyFacLine, buyItem, sellLot, trade, joinClub, foundClub,
  hire, enrollDeg, enrollLic, bankOp, donate, applyEventChoice, applyAIChoice, currentEvent,
  gameOverTier, botRows, playerIndustry, type AIEvent, type GameState,
} from '@/lib/engine';

export default function Page() {
  const { s } = useGame();
  const [tab, setTab] = useState('life');
  const [rankBoard, setRankBoard] = useState<'all' | 'young' | 'industry' | 'nation'>('all');
  const [curCat, setCurCat] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('The AI oracle writes a brand-new chapter of your life — different every time.');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ id: Date.now(), msg });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const act = useCallback((fn: (st: GameState) => string | null | void) => {
    const st = getState();
    const msg = fn(st);
    if (typeof msg === 'string') showToast(msg);
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
      if (res.gameJustOver) showToast('You lived to 90.');
      persist(); bump();
    }, 250);
    const onVis = () => { last = Date.now(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, [showToast]);

  const askAI = useCallback(async () => {
    setAiBusy(true); setAiNote('The oracle is thinking…');
    try {
      const res = await fetch('/api/story', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: snapshot(getState()), used: getState().story.used })
      });
      if (res.ok) {
        const ev = await res.json();
        if (ev && ev.title && ev.choices) {
          const e: AIEvent = { ...ev, source: 'backend' };
          getState().aiEv = e;
          setAiNote('Written fresh by the LLM backend — it remembers your past twists and avoids repeating them.');
          bump(); persist();
        }
      } else setAiNote('Backend unreachable — try again later.');
    } catch { setAiNote('Backend unreachable — try again later.'); }
    setAiBusy(false);
  }, []);

  return (
    <div className="tgame">
      <style>{''}</style>
      <div dangerouslySetInnerHTML={{ __html: ART_DEFS }} />
      <div className="wrap">
        <Header s={s} onReset={resetState} />
        <AgeBox s={s} />
        <nav role="tablist" className="tnav">
          {TABS.map(([k, n, ic]) => (
            <button key={k} role="tab" aria-selected={tab === k} data-t={k}
              onClick={() => setTab(k)}>{Ic({ id: ic, className: 'si navsi' })}{n}</button>
          ))}
        </nav>
        <main id="tview" key={tab} className="enter">
          {tab === 'life' && <LifeTab s={s} act={act} askAI={askAI} aiBusy={aiBusy} aiNote={aiNote} />}
          {tab === 'biz' && <BizTab s={s} act={act} />}
          {tab === 'shop' && <ShopTab s={s} act={act} curCat={curCat} setCurCat={setCurCat} />}
          {tab === 'stock' && <StockTab s={s} act={act} qtyMap={qtyMap} setQtyMap={setQtyMap} />}
          {tab === 'club' && <ClubTab s={s} act={act} />}
          {tab === 'bank' && <BankTab s={s} act={act} />}
          {tab === 'rank' && <RankTab s={s} board={rankBoard} setBoard={setRankBoard} />}
        </main>
        <footer className="mini tfoot">Time pauses while the tab is closed.</footer>
      </div>

      {toast && <div id="ttoast" key={toast.id} className="on">{toast.msg}</div>}

      {!s.started && <Intro onBegin={opts => act(st => { begin(st, opts); showToast(`Good luck, ${opts.name}!`); })} />}
      {(s.pending || s.aiEv) && (
        <EventModal s={s} act={act} />
      )}
      {s.over && <GameOver s={s} onAgain={resetState} />}
    </div>
  );
}

// ================= pieces =================
function Header({ s, onReset }: { s: GameState; onReset: () => void }) {
  return (
    <header className="top">
      <div className="brand">
        <Art id="s-coin" className="logo" />
        <div><h1>Tycoon Life <span className="mini">React + LLM</span></h1>
          <div className="mini">Build an empire before you turn 90</div></div>
      </div>
      <div><div className="mini">Cash</div><div id="tcash" style={{ color: s.money < 0 ? '#ff4d6d' : undefined }}>{fmt(s.money)}</div>
        <div className="mini">Net worth {fmt(netWorth(s))} · {yearIncome(s) >= 0 ? '+' : ''}{fmt(yearIncome(s))}/yr</div></div>
      <button className="ghost tsmall" onClick={onReset}>New life</button>
    </header>
  );
}

function AgeBox({ s }: { s: GameState }) {
  const a = s.age, st = stageOf(a), pct = (a - START) / (END_AGE - START) * 100;
  const p = (x: number) => ((x - START) / (END_AGE - START) * 100).toFixed(2) + '%';
  const d = new Date(Date.UTC(s.byear + 18, 8, 1) + Math.floor(s.lastDay) * 864e5);
  const dstr = d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const marks: [number, string][] = [[START, 'Start'], [22, 'Degree'], [26, 'Career'], [RETIRE, 'Retire'], [END_AGE, 'End']];
  return (
    <section className="card age">
      <div className="agehead"><b>{s.name} · Age {Math.floor(a)}</b>
        <span className="tag" style={{ background: st.color }}>{st.name}</span>
        <span className="mini">{dstr}</span>
        <span className="mini">Fame {s.fame} · {s.nation}</span></div>
      <div className="track" style={{ background: `linear-gradient(90deg,#2ec4b6 0 ${p(22)},#ff9f1c ${p(22)} ${p(26)},#ff5d8f ${p(26)} ${p(RETIRE)},#9d4edd ${p(RETIRE)})` }}>
        <div className="shade" style={{ left: pct + '%' }} /><div className="mark" style={{ left: pct + '%' }} />
      </div>
      <div className="ms">{marks.map(([m, t]) => <span key={t} style={{ left: p(m) }}>{m} {t}</span>)}</div>
    </section>
  );
}

function Row({ art, children, right }: { art: string; children: React.ReactNode; right?: React.ReactNode }) {
  return <div className="row">{art && <Art id={art} />}<div className="info">{children}</div>{right}</div>;
}
function Btn({ ic, label, onClick, disabled, kind }: { ic: string; label: string; onClick?: () => void; disabled?: boolean; kind?: string }) {
  return (
    <button className={'ibtn ' + (kind || '')} onClick={onClick} disabled={disabled}>
      <span className="ic">{Ic({ id: ic, className: 'bsi' })}</span><span>{label}</span>
    </button>
  );
}

function LifeTab({ s, act, askAI, aiBusy, aiNote }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void; askAI: () => void; aiBusy: boolean; aiNote: string }) {
  const y = worldYear(s), era = eraOf(y), news = ALLNEWS[y] || [];
  const j = jobOf(s);
  const studyTxt = s.study ? `${s.study.name} · ${Math.max(0, (s.study.end - s.day) / 365.25).toFixed(1)} yr left` : 'Not studying';
  return (
    <>
      <div className="card hero"><Art id={st_art(s)} />
        <div><b>{s.name}, {stageOf(s.age).name}</b>
          <div className="sub">{j ? `Working as ${j.name} · ${fmt(j.salary)}/yr` : 'Not employed'}</div>
          <div className="sub">Knowledge: {knowledgeText(s)}</div>
          <div className="sub">Study: {studyTxt}</div>
          <div className="sub">Rent & bills: {fmt((living(Math.floor(s.age)) + upkeep(s) + (s.study && s.study.kind === 'deg' ? s.study.tuition : 0)) / 12)}/month</div>
        </div></div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="mini" style={{ marginBottom: 6 }}>In the world, {y} — {era.name}</div>
        {news.map(n => <p className="news" key={n}>• {n}</p>)}
        {!news.length && <p className="news">• A quiet year in the {era.name}.</p>}
      </div>
      <button id="twork" onClick={() => act(st => { doWork(st); })}>{Ic({ id: 'ic-coins', className: 'si' })}<span>Side hustle · +{fmt(clickVal(s))}</span></button>
      <button className="ibtn ghost tai" style={{ width: '100%', justifyContent: 'center', margin: '8px 0 4px' }} onClick={askAI} disabled={aiBusy}>
        {Ic({ id: 'ic-ai', className: 'si' })}<span>{aiBusy ? 'The oracle is thinking…' : 'Ask the AI oracle for a life twist'}</span>
      </button>
      <p className="sub">{aiNote}</p>
      <p className="sub">Paychecks every 2 weeks. Progressive income tax (0\u201335%) billed every 1 January. Rent, bills, branch profits and bank interest settle monthly.</p>
      <h3>Jobs</h3>
      {JOBS.map(jb => {
        const mine = s.job === jb.id;
        const lock = !meets(s, jb.req) ? 'Locked' : (jb.ft && s.study) ? 'Finish studies' : s.age >= RETIRE ? 'Retired' : '';
        return <Row key={jb.id} art={jb.art} right={<Btn ic={mine ? 'ic-x' : 'ic-plus'} label={mine ? 'Quit' : (lock || 'Apply')} kind={mine ? 'ghost' : ''} disabled={!mine && !!lock}
          onClick={() => act(st => hire(st, jb.id))} />}>
          <b>{jb.name}{mine && ' · current'}</b>
          <span className="sub">{fmt(jb.salary)}/yr · requires {reqText(jb.req)}</span>
        </Row>;
      })}
      <h3>Degrees</h3>
      {(Object.keys(FIELDS) as FieldKey[]).map(f => {
        const F = FIELDS[f], cur = s.deg[f], max = F.names.length;
        if (cur >= max) return <Row key={f} art={F.art} right={<Btn ic="ic-check" label="Done" disabled />}><b>{F.name}: {F.names[cur - 1]}</b><span className="sub">Highest level completed</span></Row>;
        const L = cur + 1;
        const reason = s.study ? (s.study.kind === 'deg' && s.study.field === f ? 'In progress' : 'Busy') : s.age > F.maxAge[L - 1] ? 'Too old' : (jobOf(s) && jobOf(s)!.ft) ? 'Quit job first' : '';
        return <Row key={f} art={F.art} right={<Btn ic="ic-cap" label={reason || 'Enroll'} disabled={!!reason} onClick={() => act(st => enrollDeg(st, f))} />}>
          <b>{F.name}: {F.names[L - 1]}</b>
          <span className="sub">{effYears(s, f, L).toFixed(1)} years · {F.tuition[L - 1] ? fmt(tuitionOf(s, f, L)) + '/yr tuition' + (s.topField === f ? ' (−20% talent)' : '') : 'funded'}{cur ? ' · builds on ' + F.names[cur - 1] : ''}</span>
        </Row>;
      })}
      <h3>Licences</h3>
      {LICENSES.map(l => {
        const owned = !!s.lic[l.id], studying = s.study && s.study.kind === 'lic' && s.study.id === l.id;
        const label = owned ? 'Licensed' : studying ? 'In progress' : s.study ? 'Busy' : s.money < l.cost ? 'Need ' + fmt(l.cost) : 'Enroll';
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-cap'} label disabled={owned || !!studying || !!s.study || s.money < l.cost}
          onClick={() => act(st => enrollLic(st, l.id))} />}>
          <b>{l.name}</b><span className="sub">{fmt(l.cost)} fee · {l.days}-day course · needed for {Object.keys(LIC_FOR).filter(k => LIC_FOR[k] === l.id).join(', ')}</span>
        </Row>;
      })}
      <h3>Life log</h3>
      <div className="card feed">{s.log.slice(-16).reverse().map((x, i) => <div key={i}>{x}</div>) || <div className="sub">Nothing yet.</div>}</div>
    </>
  );
}
const st_art = (s: GameState) => stageOf(s.age).art;

function BizTab({ s, act }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void }) {
  const mult = clubMult(s) * (1 + .15 * s.deg.business) * (1 + s.fame * .002) * s.eraBiz;
  return (
    <>
      {BIZ.map(b => {
        const n = branchCount(s, b.id), c = bizCost(s, b), ok = meets(s, b.req);
        return <Row key={b.id} art={b.art} right={<Btn ic={ok ? (n ? 'ic-up' : 'ic-plus') : 'ic-x'} label={!ok ? 'Need degree' : n ? `Open branch · ${fmt(c)}` : `Open · ${fmt(c)}`} disabled={!ok || s.money < c} onClick={() => act(st => openBranch(st, b.id))} />}>
          <b>{b.name} <span className="tag">{b.ind}</span> <span className="tag">{n} branch{n === 1 ? '' : 'es'}</span></b>
          <span className="sub">{n ? 'Chain: ' : 'Open a branch in ' + b.reg[0] + ' (+' + fmt(b.inc * 1.25 * 12) + '/yr if steady) · '}needs {reqText(b.req)}</span>
          {n > 0 && <div>{(s.branches[b.id] || []).map((br, i) => {
            const net = branchNet(s, b, br) * mult;
            return <span key={i} className={'brchip ' + (net >= 0 ? 'up' : 'dn')}>{b.reg[br.r % b.reg.length]} · {net >= 0 ? '+' : ''}{fmt(net)}/mo · {br.mood >= 1.35 ? 'booming' : br.mood <= .55 ? 'struggling' : 'steady'}</span>;
          })}</div>}
        </Row>;
      })}
      <h3>Farm expansion lines</h3>
      {FARM_LINES.map(l => {
        const owned = s.farm[l.id];
        const why = !branchCount(s, 'farm') ? 'Open a farm branch first' : worldYear(s) < l.since ? 'Unlocks in ' + l.since : s.money < l.cost ? 'Need ' + fmt(l.cost) : '';
        return <Row key={l.id} art="b-farm" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? 'Active' : why || 'Expand'} disabled={owned || !!why} onClick={() => act(st => buyFarmLine(st, l.id))} />}>
          <b>{l.name}{owned ? ' · active' : ''}</b><span className="sub">+{fmt(l.inc)}/yr · setup {fmt(l.cost)} · since {l.since}</span>
        </Row>;
      })}
      <h3>Factory production lines</h3>
      {FAC_LINES.map(l => {
        const owned = s.fac[l.id];
        const why = !branchCount(s, 'fac') ? 'Open a factory branch first' : worldYear(s) < l.since ? 'Unlocks in ' + l.since :
          (l.food && !branchCount(s, 'farm')) ? 'Needs a farm branch' : (l.needs && !s.fac[l.needs]) ? 'Needs upstream line' : s.money < l.cost ? 'Need ' + fmt(l.cost) : '';
        return <Row key={l.id} art="b-fac" right={<Btn ic={owned ? 'ic-check' : 'ic-up'} label={owned ? 'Active' : why || 'Build'} disabled={owned || !!why} onClick={() => act(st => buyFacLine(st, l.id))} />}>
          <b>{l.name}{owned ? ' · active' : ''}</b>
          <span className="sub">+{fmt(l.inc * (l.food && branchCount(s, 'farm') ? 1.3 : 1))}/yr{l.food ? ' · farm supply +30%' : ''}{l.needs ? ' · needs ' + FAC_LINES.find(x => x.id === l.needs)!.name : ''} · setup {fmt(l.cost)} · since {l.since}</span>
        </Row>;
      })}
      <p className="sub">Every purchase opens a branch in a named region with its own mood — branches can boom or run at a loss. Farm lines supply food factories (+30%). Each branch costs 35% more.</p>
    </>
  );
}

const CATART: Record<string, string> = { 'Sport bike': 'i-bike', 'Phone': 'i-phone', 'Watch': 'i-watch', 'Jewelry': 'i-ring', 'Suit': 'i-suit', 'Car': 'i-lambo', 'Property': 'i-house', 'Yacht': 'i-yacht', 'Private jet': 'i-jet', 'Art': 'i-art' };

function ShopTab({ s, act, curCat, setCurCat }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void; curCat: string | null; setCurCat: (c: string | null) => void }) {
  const cats = [...new Set(ITEMS.map(i => i.cat))];
  return (
    <>
      {s.lots.length > 0 && (<><h3>My items</h3>
        {s.lots.map((l, idx) => {
          const it = ITEM_BY[l.id], v = lotValue(s, l), resale = v * (1 - RESALE_FEE);
          return <Row key={idx} art={it.art} right={<Btn ic="ic-down" label={'Sell ' + fmt(resale)} kind="ghost" onClick={() => act(st => sellLot(st, idx))} />}>
            <b>{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name}</b>
            <span className="sub">Paid {fmt(l.paid)} · worth now {fmt(v)} · {v >= l.paid ? 'up' : 'down'} {Math.abs((v / l.paid - 1) * 100).toFixed(0)}%</span>
          </Row>;
        })}</>)}
      <h3>Catalogue</h3>
      <div className="grid">
        {cats.map(c => {
          const list = ITEMS.filter(i => i.cat === c);
          const lo = Math.min(...list.map(i => i.price)), hi = Math.max(...list.map(i => i.price));
          const need = LIC_FOR[c], have = !need || s.lic[need];
          return <button key={c} className="tile" onClick={() => setCurCat(c)}>
            <Art id={CATART[c] || 'ic-bag'} />
            <span><b>{c}</b><span className="sub">{list.length} items · {fmt(lo)} \u2013 {fmt(hi)}{need && !have ? ' · licence needed' : ''}</span></span>
          </button>;
        })}
      </div>
      <p className="sub">Tap a category to browse. Resale = market value − {RESALE_FEE * 100}% fee.</p>
      {curCat && (
        <div className="modal on" onClick={e => { if (e.target === e.currentTarget) setCurCat(null); }}>
          <div className="mcard">
            <div className="mhead"><h2>{curCat}</h2><button className="ibtn ghost" onClick={() => setCurCat(null)}><span className="ic">{Ic({ id: 'ic-x', className: 'bsi' })}</span><span>Close</span></button></div>
            <div className="sub" style={{ marginBottom: 8 }}>{ITEMS.filter(i => i.cat === curCat).length} items{LIC_FOR[curCat] ? ` · requires ${LIC_BY[LIC_FOR[curCat]].name}${s.lic[LIC_FOR[curCat]] ? ' ✔' : ''}` : ''}</div>
            {ITEMS.filter(i => i.cat === curCat).map(i => {
              const need = LIC_FOR[curCat], locked = need && !s.lic[need];
              return <Row key={i.id} art={i.art} right={<Btn ic={locked ? 'ic-lock' : 'ic-bag'} label={locked ? 'Need licence' : fmt(i.price)} disabled={!!locked || s.money < i.price} onClick={() => act(st => buyItem(st, i.id))} />}>
                <b>{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name}</b>
                <span className="sub">+{i.lux} status · {i.rate >= 0 ? 'gains' : 'loses'} ~{Math.abs(i.rate * 100).toFixed(0)}%/yr · upkeep {fmt(i.price * 0.02)}/yr</span>
              </Row>;
            })}
          </div>
        </div>
      )}
    </>
  );
}

function StockTab({ s, act, qtyMap, setQtyMap }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void; qtyMap: Record<string, number>; setQtyMap: (m: Record<string, number>) => void }) {
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
            <button className="tsell" disabled={!q} onClick={() => act(g => { const r = trade(g, st.id, 'sell', qtyMap[st.id] || 1); return r.ok ? r.msg : r.msg; })}>Sell</button>
            <button className="tbuy" disabled={s.money < p} onClick={() => act(g => { const r2 = trade(g, st.id, 'buy', qtyMap[st.id] || 1); return r2.ok ? r2.msg : null; })}>Buy</button>
          </div>}>
          <b>{st.id} <span className={ch >= 0 ? 'up' : 'down'}>{ch >= 0 ? '\u25b2' : '\u25bc'}{Math.abs(ch).toFixed(1)}%</span></b>
          <span className="sub">{st.name} · {fmt(p)} · you hold {q}</span>
          <svg className="spark" viewBox="0 0 96 30"><polyline fill="none" stroke={h[h.length - 1] >= h[0] ? '#06d6a0' : '#ff4d6d'} strokeWidth="2.4" points={pts} /></svg>
        </Row>;
      })}
      <p className="sub">Prices move every 3 seconds. Buy in green, sell in red — set the quantity first.</p>
    </>
  );
}

function ClubTab({ s, act }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void }) {
  const nw = netWorth(s);
  const [name, setName] = useState('');
  return (
    <>
      {CLUBS.map(c => {
        const mine = s.club === c.id, ok = nw >= c.min;
        return <Row key={c.id} art={c.art} right={<Btn ic={mine ? 'ic-check' : 'ic-crown'} label={mine ? 'Member' : !ok ? 'Need ' + fmt(c.min) : 'Join · ' + fmt(c.fee)} disabled={mine || !ok || s.money < c.fee} onClick={() => act(st => joinClub(st, c.id))} />}>
          <b>{c.name}{mine ? ' · member' : ''}</b><span className="sub">Min net worth {fmt(c.min)} · fee {fmt(c.fee)} · income ×{c.mult}</span>
        </Row>;
      })}
      {s.club === 'own'
        ? <Row art="c-own" right={<Btn ic="ic-check" label="Member" disabled />}><b>{s.ownClub}</b><span className="sub">Your own club · income ×{OWN_CLUB_MULT}</span></Row>
        : nw >= FOUND_MIN_NW && (
          <Row art="c-own" right={<Btn ic="ic-crown" label={'Found · ' + fmt(FOUND_COST)} disabled={s.money < FOUND_COST} onClick={() => act(st => foundClub(st, name))} />}>
            <b>Found your own club</b>
            <input className="qty" style={{ width: '100%', marginTop: 6 }} maxLength={30} placeholder={`e.g. ${s.name}’s circle`} value={name} onChange={e => setName(e.target.value)} />
          </Row>
        )}
      <p className="sub">One club at a time. Founding needs {fmt(FOUND_MIN_NW)} net worth and lifts business income ×{OWN_CLUB_MULT}.</p>
    </>
  );
}

function BankTab({ s, act }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void }) {
  const nw = netWorth(s), maxLoan = Math.max(0, Math.floor(nw * .5 - s.bank.loan));
  let marginal = 0; { let lo = 0; for (const [hi, rate] of TAX_BRACKETS) { if (s.yIncome > lo) marginal = rate; lo = hi; } }
  const fameTxt = s.fame >= 80 ? 'Household name' : s.fame >= 50 ? 'Famous' : s.fame >= 25 ? 'Well known' : s.fame > 0 ? 'Getting noticed' : 'Unknown';
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>Savings ({(SAVE_RATE * 100).toFixed(0)}%/yr, paid monthly)</span><b>{fmt(s.bank.dep)}</b></div>
        <div className="lb"><span>Loan ({(LOAN_RATE * 100).toFixed(0)}%/yr, billed monthly)</span><b style={{ color: s.bank.loan > 0 ? '#ff4d6d' : undefined }}>{fmt(s.bank.loan)}</b></div>
        <div className="lb"><span>Income this year (taxable)</span><b>{fmt(s.yIncome)}</b></div>
        <div className="lb"><span>Bracket (first ${TAX_FREE.toLocaleString()} tax-free)</span><b>{(marginal * 100).toFixed(0)}% marginal</b></div>
        <div className="lb"><span>Last tax bill</span><b>{fmt(s.yTax)}</b></div>
      </div>
      <h3>Savings</h3>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-plus" label="+$10K" disabled={s.money < 10000} onClick={() => act(st => bankOp(st, 'dep', 10000))} />
        <Btn ic="ic-plus" label="+$100K" disabled={s.money < 100000} onClick={() => act(st => bankOp(st, 'dep', 100000))} />
        <Btn ic="ic-plus" label="All in" disabled={s.money <= 0} onClick={() => act(st => bankOp(st, 'dep', 'all'))} />
      </div>}>
        <b>Deposit into savings</b><span className="sub">Earn {fmt(s.bank.dep * SAVE_RATE)}/yr while you sleep</span>
      </Row>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-down" label="−$10K" kind="ghost" disabled={s.bank.dep < 10000} onClick={() => act(st => bankOp(st, 'wd', 10000))} />
        <Btn ic="ic-down" label="−$100K" kind="ghost" disabled={s.bank.dep < 100000} onClick={() => act(st => bankOp(st, 'wd', 100000))} />
        <Btn ic="ic-down" label="All out" kind="ghost" disabled={s.bank.dep <= 0} onClick={() => act(st => bankOp(st, 'wd', 'all'))} />
      </div>}>
        <b>Withdraw</b><span className="sub">Move money back to cash</span>
      </Row>
      <h3>Loans</h3>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-up" label="Borrow 100K" disabled={maxLoan < 100000} onClick={() => act(st => bankOp(st, 'loan', 100000))} />
        <Btn ic="ic-up" label="Borrow max" disabled={maxLoan <= 0} onClick={() => act(st => bankOp(st, 'loan', 'all'))} />
      </div>}>
        <b>Borrow</b><span className="sub">Up to 50% of net worth · available {fmt(maxLoan)}</span>
      </Row>
      <Row art="ic-coins" right={<div className="trade">
        <Btn ic="ic-check" label="Repay 10K" disabled={s.bank.loan <= 0 || s.money < 10000} onClick={() => act(st => bankOp(st, 'repay', 10000))} />
        <Btn ic="ic-check" label="Repay all" disabled={s.bank.loan <= 0} onClick={() => act(st => bankOp(st, 'repay', 'all'))} />
      </div>}>
        <b>Repay</b><span className="sub">Owe {fmt(s.bank.loan)} · interest {fmt(s.bank.loan * LOAN_RATE)}/yr</span>
      </Row>
      <h3>Charity & fame</h3>
      <div className="card" style={{ marginBottom: 8 }}>
        <div className="famewrap"><span className="mini">Fame</span><div className="famebar"><i style={{ width: s.fame + '%' }} /></div><b>{s.fame}</b></div>
        <div className="mini">{fameTxt} · business income +{(s.fame * .2).toFixed(1)}% · fame fades each birthday</div>
      </div>
      <Row art="i-art" right={<div className="trade">
        <Btn ic="ic-heart" label="+$1K" disabled={s.money < 1000} onClick={() => act(st => donate(st, 1000))} />
        <Btn ic="ic-heart" label="+$10K" disabled={s.money < 10000} onClick={() => act(st => donate(st, 10000))} />
        <Btn ic="ic-heart" label="+$100K" disabled={s.money < 100000} onClick={() => act(st => donate(st, 100000))} />
      </div>}>
        <b>Donate to charity</b><span className="sub">Total donated: {fmt(s.donated)} · fame grows with every gift</span>
      </Row>
    </>
  );
}

function RankTab({ s, board, setBoard }: { s: GameState; board: string; setBoard: (b: 'all' | 'young' | 'industry' | 'nation') => void }) {
  const rows = botRows(s);
  const tabs: [string, string][] = [['all', 'Richest overall'], ['young', 'Young & rich'], ['industry', 'Industry leaders'], ['nation', 'Richest by nation']];
  let body: React.ReactNode = null;
  if (board === 'young') {
    const list = rows.filter(r => r.a <= 35 && r.v >= 1e6).sort((a, b) => b.v - a.v).slice(0, 12);
    body = (list.length ? list : []).map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} yrs · {r.nat}</span></span><span>{fmt(r.v)}</span></div>);
    if (!list.length) body = <div className="lb"><span>No millionaires under 35 yet — that could be you.</span></div>;
  } else if (board === 'industry') {
    const inds = [...new Set(rows.map(r => r.ind).filter(i => i && i !== '—'))];
    body = inds.map(ind => {
      const l = rows.filter(r => r.ind === ind).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={ind} className={'lb' + (lead.me ? ' me' : '')}><span>{ind}: {lead.n}{lead.me ? ' — you lead!' : me > -1 ? ` (you are #${me + 1})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else if (board === 'nation') {
    const nats = [...new Set(rows.map(r => r.nat))];
    body = nats.map(nat => {
      const l = rows.filter(r => r.nat === nat).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={nat} className={'lb' + (lead.me ? ' me' : '')}><span>{nat}: {lead.n}{me > -1 ? ` (you are #${me + 1})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else {
    body = [...rows].sort((a, b) => b.v - a.v).slice(0, 15).map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} yrs · {r.nat} · {r.ind}</span></span><span>{fmt(r.v)}</span></div>);
  }
  return (<>
    <div className="rt">{tabs.map(([k, l]) => <button key={k} data-rt={k} aria-pressed={board === k} onClick={() => setBoard(k as 'all')}>{l}</button>)}</div>
    {body}
    <p className="sub">Rivals are simulated; their fortunes grow about 12% a year.</p>
  </>);
}

function Intro({ onBegin }: { onBegin: (o: { name: string; byear: number; nation: string; ints: string[]; tals: string[] }) => void }) {
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
      <h2>Create your life</h2>
      <p className="mini" style={{ marginTop: 0 }}>You begin at 18 &mdash; the year you were born + 18. Your era shapes world events, prices and opportunities.</p>
      <div className="field"><label>Name</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label>Birth year</label>
        <select value={byear} onChange={e => setByear(+e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      <div className="field"><label>Country</label>
        <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
      <div className="field"><label>Interests (up to 3)</label>
        <div className="chips">{INTERESTS.map(i => (
          <button key={i.id} className={'chip' + (ints.includes(i.id) ? ' on' : '')} onClick={() => toggle(ints, setInts, i.id, 3)}><Art id={i.art} className="ca" />{i.label}</button>
        ))}</div></div>
      <div className="field"><label>Talents (up to 2)</label>
        <div className="chips">{TALENTS.map(t => (
          <button key={t.id} className={'chip' + (tals.includes(t.id) ? ' on' : '')} onClick={() => toggle(tals, setTals, t.id, 2)}><Art id={t.art} className="ca" />{t.label}</button>
        ))}</div></div>
      <div className="preview">
        <p><b>You turn 18 in {byear + 18}</b> — the {eraOf(byear + 18).name}.</p>
        {a.top
          ? <><p><b>Strongest path:</b> {FIELDS[a.top].name}{a.second ? ' · backup: ' + FIELDS[a.second].name : ''}</p>
            <p><b>Suggested:</b> {PATHS[a.top].jobs}</p>
            <div>{a.perks.map(p => <span key={p} className="perk">{p}</span>)}</div></>
          : <p className="mini">Pick interests and talents to see your suggested path.</p>}
      </div>
      <button className="ibtn" style={{ width: '100%' }} onClick={() => onBegin({ name: name || 'Alex', byear, nation, ints, tals })}>
        <span className="ic">{Ic({ id: 'ic-plus', className: 'bsi' })}</span><span>Begin my life</span>
      </button>
    </div></div>
  );
}

function EventModal({ s, act }: { s: GameState; act: (fn: (st: GameState) => string | null | void) => void }) {
  const life = currentEvent(s);
  const ev = life ? { title: life.title, text: life.text, choices: life.choices.map(c => ({ l: c.l, cost: c.cost })) } : s.aiEv!;
  const isAI = !life;
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <div className="mini">{isAI ? 'AI life twist — written for this exact moment' : 'Life event'}</div>
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
  const { tier, nw } = gameOverTier(s);
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <h2>{tier}</h2>
      <div>You lived to 90 with a net worth of <b>{fmt(nw)}</b>.<br />
        <span className="mini">Knowledge: {knowledgeText(s)} · Fame {s.fame} · Donated {fmt(s.donated)}</span></div>
      <button className="ibtn" style={{ marginTop: 16 }} onClick={onAgain}>
        <span className="ic">{Ic({ id: 'ic-plus', className: 'bsi' })}</span><span>Live again</span>
      </button>
    </div></div>
  );
}
