'use client';
// HuyenBao v11.27 — React edition. Two-level grouped nav, a systems links map,
// gigs, levels, social, the cosmic frontier, EN/VI/中文, LLM oracle with
// random kind dispatch (luck / setback / life-stage / story), pre-owned
// market + social listings, a Hall of Fame tab, and a real player-to-player
// community (chat / friends / gifts / global leaderboard — Supabase or
// same-device demo mode, see src/lib/social.ts).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Art, Ic, ART_DEFS } from '@/lib/art';
import { useGame, getState, persist, bump, resetState, reincarnateState } from '@/lib/store';
import {
  START, END_AGE, RETIRE, RESALE_FEE, FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, ALLNEWS, eraOf, NATIONS, NAME_POOLS, INTERESTS, TALENTS, PATHS,
  analyze, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES, BIZ, FARM_LINES, FAC_LINES, ITEM_BY, ITEM_IMAGES, USED_IMAGES, STOCKS, ASSET_DEPRECIATION_RATE,
  CLUBS, JOBS, GIGS, SPACE_LINES, TABS, GROUPS, xpNeed, ITEMS, USED_MARKET, HALL_OF_FAME, itemRarity, RARITY_COLOR, NPCS, NPC_BY, PETS, PET_BY, MAX_PETS, CREW_COST, SHORT_COURSES, SHORT_BY, BOTS, type Rarity, type FieldKey, type Req, type ItemDef, type UsedItem,
} from '@/lib/gameData';
import {
  fmt, taxOf, fresh, begin, tick, applyOffline, stageOf, worldYear, branchCount, bizCost, clubMult, branchNet, fameBonus, bizMultiplier,
  bizIncome, yearIncome, living, lotValue, upkeep, assetVal, bizVal, stockVal, netWorth,
  bizRevenue, bizCosts, bizNet, bizMarketShare, bizRndMult, investBizRnd,
  grantSpirit, spiritGainTodayLeft, SPIRIT_DAILY_CAP,
  effYears, tuitionOf, meets, reqText, knowledgeText, snapshot, dateOf,
  processDay, yearEnd,
  doGig, gigReady, gigLock, gigPay, addPost, buySpace, spaceIncome, socialIncome, levelMult, canPost, postCooldownLeft,
  openBranch, openBranchCapital, capitalPathCost, MANAGER_MONTHLY, rollBranchClosures, buyFarmLine, buyFacLine, buyItem, sellLot, trade, joinClub, leaveClub, foundClub,
  hire, enrollDeg, enrollLic, enrollShortCourse, dropStudySlot, changeInterest, bankOp, donate, applyEventChoice, applyAIChoice, currentEvent, studyWorkMult,
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
  // v11.2 — real events affecting market
  effEraBiz, effEraFac, effLoanRate, effRisk, effDemand, researchCost, researchMarket,
  // v11.3 — power & influence
  powerTierOf, powerTierIdx, nextTierOf, POWER_TIERS, ADVOCACY_ACTIONS,
  doAdvocacy, INFLUENCE_SOURCE_LABELS, type PowerTier, type InfluenceSource, type AdvocacyAction,
  // v11.4 — elections + scrutiny + alliances/rivals + endings
  ELECTION_PARAMS, electionParamsFor, runElection, TRANSPARENCY_ACTIONS, doTransparency,
  offerAlliance, breakWith, computeEnding, tickPowerV11_4,
  // v11.5 — entity system
  entityTierOf, qualifiedEntityTier, nextEntityTier, ENTITY_TIERS, CONSTITUTIONS, constitutionById,
  actDeclareAutonomy, actCourtRecognition, actDeclareIndependence,
  type EntityState, type EntityTier, type Constitution,
  // v11.6 — zodiac + tarot + psychic affinity
  ZODIAC, zodiacOf, zodiacById, freshPsychic, TAROT_CARDS, tarotDraw, togglePsychic, zodiacAffinityMult, zodiacIntroSuggestion,
  type ZodiacSign, type Gender, type ZodiacDef, type PsychicState,
  // v11.6 — MONTHS array renamed to avoid clashing with month names below
  MONTHS as MONTHS_NAMES,
} from '@/lib/engine';
import { localTwist, pickKind } from '@/lib/story';
import { ChatView, FriendsView, BoardView } from './community';
import { useCommunity } from '@/lib/social';
import { castHexagram, validateQuestion, type CastResult } from '@/lib/iching';
import { lapLaSo, type LaSo } from '@/lib/tuvi';
import { phanTichToanDien, HUONG, type PhongThuyReading, type Huong } from '@/lib/phongthuy';
import { drawCards, spreadLabels, TAROT_GHI_CHU, type TarotCard } from '@/lib/tarot';
import { useT, LANGS, type Lang } from '@/lib/i18n';

const asset = (p: string) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + p;

// Test/debug hook: lets automation (and power users) drive the engine from the console.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__tycoon = {
    getState, persist, bump, processDay, yearEnd, spaceIncome, tick,
  };
}

// v11.8 — the bundled version. The /version.json file in /public is polled
// every 5 minutes; if its version is newer than this, a "reload to update"
// banner appears even in a running session (no F5 needed).
const BUNDLED_VERSION = 'v11.27';
const VERSION_POLL_MS = 5 * 60 * 1000;
// v11.24 — 'what's new' modal is shown ONCE PER PLAYER per MAJOR version
// (tycoon_seen_v11), not once per patch release. Previously the key was
// per-patch (tycoon_seen_v11.21/.22/.23) so every version bump re-showed the
// SAME static v11 feature list — the "big update notification repeats!!!"
// complaint. Now it appears on first load of the v11 era only.
const SEEN_KEY = 'tycoon_seen_v11';

export default function Page() {
  const { s } = useGame();
  const { t, lang } = useT();
  const [tab, setTab] = useState('home');
  const [lastTab, setLastTab] = useState<Record<string, string>>({});
  const activeGroup = GROUPS.find(g => g[3].some(([k]) => k === tab))?.[0] || 'life';
  const curSubs = (GROUPS.find(g => g[0] === activeGroup) || GROUPS[0])[3];
  const [rankBoard, setRankBoard] = useState<'all' | 'young' | 'industry' | 'nation'>('all');
  const [curCat, setCurCat] = useState<string | null>(null);
  // v11.19 — toast queue. Previously a single toast slot: rapid showToast()
  // calls would overwrite each other and the player saw only the last one.
  // Now toasts are queued; each shows for its full duration before the next
  // appears, so milestone + ambient notifications don't disappear too fast.
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const toastQueue = useRef<{ id: number; msg: string }[]>([]);
  // Ref tracking whether a toast is currently showing — used to avoid the
  // stale-closure bug where multiple synchronous showToast() calls would all
  // see `toast === null` (the closure captures the value at call time, before
  // React re-renders) and overwrite each other. The ref is updated in the same
  // tick as setToast, so subsequent calls see it correctly.
  const toastShowing = useRef(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNoteKey, setAiNoteKey] = useState('oracle.note');
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  // v11 — version banner state. 'whatsNew' shows the V11 feature list once
  // per player (localStorage flag). 'reload' shows when /version.json reports
  // a newer version than the bundled one (polled every 5 min, no F5 needed).
  const [whatsNew, setWhatsNew] = useState(false);
  const [reloadPrompt, setReloadPrompt] = useState<{ version: string; headline: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show the "what's new in V11" modal on first load if not seen yet.
  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setWhatsNew(true);
    } catch { /* ignore */ }
  }, []);

  // Poll /version.json every 5 minutes — if the deployed version is newer
  // than the bundled one, surface a "reload to update" banner. This works
  // even in a long-running session without F5.
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(asset('/version.json'), { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json() as { version?: string; headline?: string };
        if (j.version && j.version !== BUNDLED_VERSION) {
          setReloadPrompt({ version: j.version, headline: j.headline || j.version });
        }
      } catch { /* ignore */ }
    };
    check();
    const iv = setInterval(check, VERSION_POLL_MS);
    return () => clearInterval(iv);
  }, []);

  const dismissWhatsNew = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    setWhatsNew(false);
  }, []);

  const showToast = useCallback((msg: string) => {
    // v11.19 — queue toasts instead of overwriting the current one. Each
    // toast displays for its full duration (3.5–8s, adaptive) before the
    // next appears. This fixes the "I see only one quick flash" complaint:
    // previously rapid showToast() calls from tick() (which can return up to
    // 5–10 toasts at once for milestones + ambient events) overwrote each
    // other and the player saw only the last.
    //
    // We use a ref (toastShowing) instead of the `toast` state to decide
    // whether to display immediately or queue — this avoids the stale-closure
    // bug where multiple synchronous calls would all see `toast === null`.
    const entry = { id: Date.now() + Math.floor(Math.random() * 1000), msg };
    if (toastShowing.current) {
      toastQueue.current.push(entry);
      return;
    }
    toastShowing.current = true;
    setToast(entry);
    const dur = Math.min(8000, Math.max(3500, msg.length * 55));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastShowing.current = false;
    }, dur);
  }, []);

  // v11.19 — drain the queue when the current toast expires. The setTimeout
  // above sets toastShowing=false + setToast(null); this effect then picks up
  // the next queued toast (if any) and shows it for its full duration.
  useEffect(() => {
    if (toastShowing.current) return; // current toast still showing
    if (toastQueue.current.length === 0) return;
    const next = toastQueue.current.shift()!;
    toastShowing.current = true;
    setToast(next);
    const dur = Math.min(8000, Math.max(3500, next.msg.length * 55));
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastShowing.current = false;
    }, dur);
  }, [toast]);

  // v11.25 — player-to-player community (chat / friends / gifts / leaderboard).
  // Singleton provider: Supabase when NEXT_PUBLIC_SUPABASE_* env vars are set
  // at build time, otherwise a same-device BroadcastChannel demo.
  const comm = useCommunity(s, showToast);

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
    // v11.12 — on mount, apply offline catch-up from s.lastSeen (covers the
    // tab being closed since the last session). Time advances at the slower
    // OFFLINE_DAY_MS rate (10 min/day) and unmonitored businesses face extra
    // risk. The summary is toasted so the player sees what happened while away.
    // v11.17 — also surface up to 3 milestone toasts the offline period
    // produced (graduation, scandal, etc.) so the player doesn't miss them.
    const st0 = getState();
    if (st0.started && !st0.over) {
      const off = applyOffline(st0, Math.random);
      if (off?.summary) showToast(off.summary);
      if (off?.toasts?.length) off.toasts.forEach((msg, i) => setTimeout(() => showToast(msg), 1200 + i * 1500));
      if (off?.gameJustOver) showToast(t('livedToast'));
      st0.lastSeen = Date.now();
      persist();
    }
    let last = Date.now();
    let lastPersist = last;
    const iv = setInterval(() => {
      const st = getState();
      // v11.12 — when the tab is hidden we DO NOT reset `last`; the visibility
      // handler below stamps lastSeen so the offline catch-up can compute the
      // real away-duration on return. Previously hidden time was simply paused.
      if (document.hidden) { return; }
      const now = Date.now();
      const res = tick(st, now - last);
      last = now;
      // Refresh lastSeen while actively playing so offline only counts real
      // away time (not the gap between 250ms ticks).
      st.lastSeen = now;
      if (res.yearToast) showToast(res.yearToast);
      // v11.17 — surface engine-emitted toasts (study complete, branch closure,
      // scandal, power promotion, ambient mini-events). Stagger each by 1.2s so
      // they don't all stack on top of each other; the toast component already
      // shows only the latest, so this queues them visually.
      if (res.toasts?.length) res.toasts.forEach((msg, i) => setTimeout(() => showToast(msg), i * 1200));
      if (res.gameJustOver) showToast(t('livedToast'));
      const got = checkAch(st);
      if (got.length) achToast(got);
      if (now - lastPersist >= 3000) {
        persist();
        lastPersist = now;
      }
      bump();
    }, 250);
    // v11.12 — visibility handler now distinguishes hidden vs visible:
    //   hidden  → stamp lastSeen + persist (so the away-duration is recorded)
    //   visible → run offline catch-up for the away period, toast the summary,
    //             then reset the visible clock `last`.
    const onVis = () => {
      if (document.hidden) {
        const st = getState();
        st.lastSeen = Date.now();
        persist();
      } else {
        const st = getState();
        if (st.started && !st.over) {
          const off = applyOffline(st, Math.random);
          if (off?.summary) showToast(off.summary);
          if (off?.gameJustOver) showToast(t('livedToast'));
          st.lastSeen = Date.now();
          persist();
        }
        last = Date.now();
      }
    };
    const onUnload = () => {
      // v11.12 — stamp lastSeen on close so the next session catches up.
      const st = getState();
      st.lastSeen = Date.now();
      persist();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      const st = getState();
      st.lastSeen = Date.now();
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
          body: JSON.stringify({ state: snap, used: st.story.used, kind, lang })
        });
        if (res.ok) {
          const j = await res.json();
          if (j && j.title && j.choices) ev = { ...j, source: j.source || 'backend', kind: j.kind || kind };
        }
      } catch { /* fall through to local */ }
    }
    if (!ev) { try { ev = localTwist(snap, st.story.used, kind, lang); } catch { ev = null; } }
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

  // v11 — random AI oracle popup. The engine sets s.aiEvPending with ~1%
  // chance per game-day; this effect watches the flag and triggers the
  // async askAI() fetch when it flips true. The popup then renders via
  // the existing EventModal — no click required.
  useEffect(() => {
    if (!s.aiEvPending || s.aiEv || s.pending || aiBusy) return;
    const st = getState();
    st.aiEvPending = false;
    persist();
    askAI();
  }, [s.aiEvPending, s.aiEv, s.pending, aiBusy, askAI]);

  const stageName = (st: GameState) => t('stage.' + STAGES.indexOf(stageOf(st.age)), stageOf(st.age).name);
  const eraName = (y: number) => t('era.' + eraOf(y).from, eraOf(y).name);

  return (
    <div className={'tgame life-' + healthState(s.health)}>
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
              data-tip={t('ttab.' + k, '')}
              onClick={() => { setTab(k); setLastTab(lt => ({ ...lt, [activeGroup]: k })); }}>
              {Ic({ id: ic, className: 'si navsi' })}{t('tab.' + k, n)}
              {k === 'friends' && comm.ready && (comm.incoming.length > 0 || comm.unclaimedGifts.length > 0) && <span className="navdot" />}
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
          {tab === 'friends' && <FriendsView s={s} act={act} comm={comm} toast={showToast} />}
          {tab === 'chat' && <ChatView comm={comm} />}
          {tab === 'lboard' && <BoardView comm={comm} />}
          {tab === 'bank' && <BankTab s={s} act={act} />}
          {tab === 'rank' && <RankTab s={s} board={rankBoard} setBoard={setRankBoard} />}
          {tab === 'power' && <PowerTab s={s} act={act} />}
          {tab === 'entity' && <EntityTab s={s} act={act} />}
          {tab === 'fame' && <FameTab s={s} />}
          {tab === 'links' && <LinksTab s={s} />}
        </main>
        <footer className="mini tfoot">
          {/* v11.10 — persistent legal disclaimer, visible on every tab */}
          <span style={{ opacity: .65, maxWidth: 560 }}>{t('disc.short')}</span>
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

      {/* v11 — reload-to-update banner (no F5 needed; polled every 5 min) */}
      {reloadPrompt && (
        <div className="reload-banner" role="alert">
          <span><b>{reloadPrompt.headline}</b> — {t('v11.reloadPrompt', '', { v: reloadPrompt.version })}</span>
          <button className="ibtn" onClick={() => { window.location.reload(); }}>{t('v11.reload')}</button>
          <button className="ibtn ghost" onClick={() => setReloadPrompt(null)}>{t('v11.later')}</button>
        </div>
      )}

      {/* v11 — what's-new modal, shown once per player per major version */}
      {whatsNew && <WhatsNewModal onDismiss={dismissWhatsNew} />}
    </div>
  );
}

// ================= v11 WHAT'S NEW MODAL =================
const V11_FEATURES: [string, string][] = [
  ['Used-market era filter', 'No more 2018 Ducati in a 2001 game — listings now respect the timeline.'],
  ['Jet / yacht crew hire', 'No licence needed — hire a crew instead, just pay monthly upkeep.'],
  ['Random AI oracle popups', 'Life twists fire on their own every so often — no click required.'],
  ['Enhanced character creation', 'Live preview, random button, confirm step, suggestion card.'],
  ['Life-choice arcs', 'Change interests, drop out, re-enroll, take short/accelerated courses.'],
  ['Per-degree roadmap', 'Each degree shows its goal, strengths, and career path.'],
  ['Business two-path', 'Degree route OR capital+manager route with monthly closure risk.'],
  ['IPO + conglomerate', 'Private → raise capital → IPO → conglomerate. Dividends, M&A, spinoffs.'],
  ['Real-event market shocks', '1929 / 1973 / 2008 / 2020 reshape valuation, rates, demand, closure odds.'],
  ['Bank credit overhaul', 'Loan limit from verified income + collateral + history. 18yo can\'t buy a mansion.'],
  ['Legal consequences', 'Hint under each choice cites the rule. Fines + XP loss + humorous punishments + cheat shortcuts.'],
];

function WhatsNewModal({ onDismiss }: { onDismiss: () => void }) {
  // v11.27 — language buttons inside the popup so players can switch
  // language without closing the modal first (user request).
  const { t, lang, setLang } = useT();
  return (
    <div className="modal on" onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="mcard" style={{ maxWidth: 580, textAlign: 'left' }}>
        <div className="mhead"><h2>✨ {t('v11.headline')}</h2><span className="mlang">{LANGS.map(l => <button key={l.id} className="ibtn ghost tsmall" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}</span><button className="ibtn ghost" onClick={onDismiss}><Ic id="ic-x" className="bsi" /><span>✕</span></button></div>
        <p className="sub" style={{ marginTop: 0 }}>{t('v11.summary')}</p>
        <ul style={{ margin: '12px 0', paddingLeft: 20, display: 'grid', gap: 8 }}>
          {V11_FEATURES.map(([title, desc]) => (
            <li key={title} style={{ listStyle: 'disc' }}>
              <b>{title}</b> — <span className="sub">{desc}</span>
            </li>
          ))}
        </ul>
        <button className="ibtn" style={{ width: '100%', marginTop: 12 }} onClick={onDismiss}>
          <Ic id="ic-check" className="bsi" /><span>{t('v11.gotIt')}</span>
        </button>
      </div>
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
        <div><h1><span className="mini">v11.27</span> HuyenBao</h1>
          <div className="mini">{s.started ? `${s.nation} · ${eraName(worldYear(s))}` : t('tagline')}</div></div>
      </div>
      <div><div className="mini">{t('cash')}</div><div id="tcash" style={{ color: s.money < 0 ? 'var(--brick)' : undefined }}>{fmt(s.money)}</div>
        <div className="mini">{t('netWorth')} {fmt(netWorth(s))} · {yearIncome(s) >= 0 ? '+' : ''}{fmt(yearIncome(s))}{t('perYear')}</div></div>
      <div className="hstack">
        <span className="lvlchip" data-tip={`Lv ${s.level} · ${s.xp}/${xpNeed(s.level)} XP (${xpPct}%) · next in ${Math.max(0, xpNeed(s.level) - s.xp)} XP`}><Ic id="ic-xp" className="bsi" />{t('lvl')} {s.level}
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
      {/* v11.27 — needs-attention strip: the four numbers that decide the run,
          colour-coded (debt / negative income red, health by severity) with a
          warning line aggregating health sanity checks. */}
      {(() => {
        const yi = yearIncome(s);
        const warns: string[] = [];
        if (s.health < 20) warns.push('att.critical');
        else if (s.health < 40) warns.push('att.low');
        else if (s.health < 60) warns.push('att.recover');
        if (s.sleepHours < 7) warns.push('att.sleep');
        if (!s.diet && s.health < 70) warns.push('att.diet');
        if (s.money < 0) warns.push('att.debt');
        if (yi < 0) warns.push('att.negative');
        return (
          <>
            <div className="attention" data-life={healthState(s.health)}>
              <div className="att-card"><span className={'att-v' + (s.money < 0 ? ' down' : '')}>{fmt(s.money)}</span><span className="att-l">{t('cash')}</span></div>
              <div className="att-card"><span className="att-v">{fmt(netWorth(s))}</span><span className="att-l">{t('netWorth')}</span></div>
              <div className="att-card"><span className={'att-v ' + (yi >= 0 ? 'up' : 'down')}>{yi >= 0 ? '+' : ''}{fmt(yi)}</span><span className="att-l">{t('inc.total')}</span></div>
              <div className="att-card"><span className="att-v" style={{ color: s.health < 40 ? 'var(--brick)' : s.health < 60 ? 'var(--gold)' : 'var(--sage)' }}>{Math.round(s.health)}</span><span className="att-l">{t('health')}</span></div>
            </div>
            {warns.length > 0
              ? <div className="att-warn" role="status">⚠ {warns.map(w => t(w)).join(' · ')}</div>
              : <div className="att-warn ok" role="status">✓ {t('att.allgood')}</div>}
          </>
        );
      })()}
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
              onClick={() => act(st => doGig(st, g.id, t))}>
              <Art id={g.icon} />
              <span><b>{t('gig.' + g.id, g.id)}</b>
                <span className="sub" style={{ display: 'block' }}>
                  {!ready && lock ? t('gig.need', '', { x: lock })
                    : !ready ? t('gig.cooldown', '', { n: left })
                      : <><span className="pay">+{fmt(gigPay(s, g))}</span>{g.hp ? <span className="hppay"> · {t('gig.hp', '', { n: g.hp })}</span> : null}</>}
                </span></span>
            </button>
          );
        })}
      </div>

      {/* v11.8 — manual "Ask AI" button removed. The oracle now fires only via
          the auto-popup effect (engine sets s.aiEvPending with ~3% chance/game-day).
          The status note below is kept so players still see where a twist came
          from after it pops up (e.g. "Written by backend LLM…"). */}
      {aiBusy && <p className="sub">{t('oracle.thinking')}</p>}
      {!aiBusy && aiNote && <p className="sub">{aiNote}</p>}

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
          <p className="sub">{t('guide.7')}</p>
        </div>
      </details>
      {/* v11.13 — ecosystem roadmap fold; points to ECOSYSTEM.md in the repo */}
      <details className="fold" id="ecosystem">
        <summary>{t('eco.title')}</summary>
        <div className="foldbody">
          <p className="sub">{t('eco.blurb')}</p>
          <ul className="sub" style={{ paddingLeft: 18, margin: '6px 0', lineHeight: 1.7 }}>
            <li>{t('eco.c1')}</li>
            <li>{t('eco.c2')}</li>
            <li>{t('eco.c3')}</li>
            <li>{t('eco.c4')}</li>
            <li>{t('eco.c5')}</li>
            <li>{t('eco.c6')}</li>
            <li>{t('eco.c7')}</li>
            <li>{t('eco.c8')}</li>
          </ul>
          <p className="mini" style={{ marginTop: 6 }}>
            <a href="https://github.com/DuoLE3383/tycoon-life/blob/main/ECOSYSTEM.md" target="_blank" rel="noopener noreferrer">{t('eco.viewGithub')} →</a>
          </p>
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
        const hasShort = s.shortCompleted?.some(id => SHORT_BY[id]?.field === f);
        return <Row key={f} art={F.art} right={<Btn ic="ic-cap" label={reason || t('enroll')} disabled={!!reason} onClick={() => act(st => enrollDeg(st, f))} />}>
          <b>{t('field.' + f, F.name)}: {F.names[L - 1]}</b>
          <span className="sub">{years.toFixed(1)} {t('years')}{s.topField && s.topField !== f ? ` · ${t('studyExtraTime')}` : ''} · {F.tuition[L - 1] ? fmt(tuitionOf(s, f, L)) + t('perYear') + ' ' + t('tuition') + (s.topField === f ? ' (−20%)' : '') : t('funded')}{hasShort ? ' (−10% short)' : ''}{cur ? ' · ' + t('buildsOn') + ' ' + F.names[cur - 1] : ''}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('schools')}: {F.schools.join(' · ')}</span>
          {/* v11 — per-degree roadmap (goal / strengths / careers) */}
          <span className="mini" style={{ display: 'block', marginTop: 2 }}><b>{t('v11.roadmap.goal')}</b>: {F.roadmap.goal}</span>
          <span className="mini" style={{ display: 'block' }}><b>{t('v11.roadmap.strengths')}</b>: {F.roadmap.strengths}</span>
          <span className="mini" style={{ display: 'block' }}><b>{t('v11.roadmap.careers')}</b>: {F.roadmap.careers}</span>
        </Row>;
      })}
      {/* v11 — drop-out buttons for ongoing studies */}
      {studies.length > 0 && (
        <>
          <h3>{t('v11.dropTitle')}</h3>
          {studies.map(study => {
            const slot = study === s.study ? 'study' : 'sideStudy';
            return <Row key={slot} art="ic-x" right={<Btn ic="ic-x" label={t('v11.drop')} kind="ghost" onClick={() => act(st => dropStudySlot(st, slot))} />}>
              <b>{study.name}</b>
              <span className="sub">{Math.max(0, (study.end - s.day) / 365.25).toFixed(1)} {t('years')} {t('remaining')}</span>
            </Row>;
          })}
        </>
      )}
      {/* v11 — short / accelerated courses */}
      <h3>{t('v11.shortCourses')}</h3>
      <p className="sub">{t('v11.shortNote')}</p>
      {SHORT_COURSES.map(c => {
        const done = s.shortCompleted?.includes(c.id);
        const studying = studies.some(course => course.kind === 'lic' && course.id === c.id);
        const busy = slotsFull;
        return <Row key={c.id} art={c.art} right={<Btn ic={done ? 'ic-check' : 'ic-cap'} label={done ? t('done') : studying ? t('inProgress') : busy ? t('busy') : s.money < c.cost ? t('needLicence') : t('enroll')} disabled={done || !!studying || busy || s.money < c.cost} onClick={() => act(st => enrollShortCourse(st, c.id))} />}>
          <b>{c.name}</b>
          <span className="sub">{fmt(c.cost)} {t('fee')} · {t('dayCourse', '', { n: c.days })} · {t('field.' + c.field, FIELDS[c.field].name)}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{c.blurb}</span>
        </Row>;
      })}
      {/* v11 — change interests mid-life */}
      <h3>{t('v11.pivotTitle')}</h3>
      <p className="sub">{t('v11.pivotNote')}</p>
      {s.ints.length === 0 && <p className="sub">{t('v11.noInterests')}</p>}
      {s.ints.map(id => {
        const cur = INTERESTS.find(i => i.id === id);
        return <Row key={id} art={cur?.art || 'ic-bag'} right={
          <select className="qty" style={{ width: 'auto', minWidth: 140 }} onChange={e => { if (e.target.value) act(st => changeInterest(st, id, e.target.value)); e.target.value = ''; }} disabled={s.money < 5000}>
            <option value="">{t('v11.swapTo')}…</option>
            {INTERESTS.filter(i => !s.ints.includes(i.id)).map(i => <option key={i.id} value={i.id}>{t('int.' + i.id, i.label)}</option>)}
          </select>
        }>
          <b>{t('int.' + id, cur?.label || id)}</b>
          <span className="sub">{t('v11.pivotCost')}: $5,000</span>
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
  // v11.20 — P&L summary (annualised).
  const revenue = bizRevenue(s);
  const costs = bizCosts(s);
  const net = bizNet(s);
  const share = bizMarketShare(s);
  const hasBranches = BIZ.some(b => branchCount(s, b.id) > 0);
  // v11.20 — R&D investment state. Local input for the amount; the actual
  // investment runs through investBizRnd() in the engine.
  const [rndAmount, setRndAmount] = useState(50000);
  const rndActive = s.bizRnd && s.day <= s.bizRnd.untilDay ? s.bizRnd : null;
  const rndLeftDays = rndActive ? Math.max(0, Math.round(rndActive.untilDay - s.day)) : 0;
  const rndPct = rndActive ? Math.round((rndActive.boostMult - 1) * 100) : 0;
  return (
    <>
      {/* v11.20 — P&L summary card (annualised). Shows revenue, costs, net,
          market share, and the R&D investment panel. Previously the player
          only saw per-branch chips; now they get a top-level financial view. */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('biz.pnlTitle')}</div>
        {!hasBranches ? (
          <p className="sub" style={{ margin: '4px 0 0' }}>{t('biz.noBranches')}</p>
        ) : (
          <>
            <div className="lb"><span>{t('biz.revenue')}</span><b className="up">{fmt(revenue)}</b></div>
            <div className="lb"><span>{t('biz.costs')}</span><b className="down">−{fmt(costs)}</b></div>
            <div className="lb"><span>{t('biz.net')}</span><b className={net >= 0 ? 'up' : 'down'}>{net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}</b></div>
            <div className="lb"><span>{t('biz.marketShare')}</span><b>{t('biz.marketShareVal', '', { n: (share * 100).toFixed(1) })}</b></div>
          </>
        )}
        {/* R&D investment panel */}
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('biz.rndTitle')}</div>
        <p className="sub" style={{ margin: '4px 0 0' }}>{t('biz.rndBlurb')}</p>
        {rndActive && (
          <div className="mini" style={{ marginTop: 4, padding: '5px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)', color: 'var(--sage)' }}>
            {t('biz.rndActive', '', { n: rndPct, d: Math.round(rndActive.untilDay), left: rndLeftDays })}
          </div>
        )}
        <div className="trade" style={{ marginTop: 6, gap: 8, alignItems: 'flex-end' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('biz.rndAmount')}</span>
            <input type="number" min={50000} step={10000} value={rndAmount}
              onChange={e => setRndAmount(Math.max(50000, +e.target.value || 50000))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <button className="tbuy" disabled={s.money < rndAmount || rndAmount < 50000}
            onClick={() => act(st => {
              if (rndAmount < 50000) return t('biz.rndErrMin');
              if (st.money < rndAmount) return t('biz.rndErrCash');
              const r = investBizRnd(st, rndAmount);
              if (!r) return t('biz.rndErrCash');
              return t('biz.rndResult', '', { amt: fmt(rndAmount), n: r.pct.toFixed(1) });
            })}>{t('biz.rndInvest')}</button>
        </div>
      </div>
      {/* v11 — two-path explainer */}
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.twoPaths')}</div>
        <p className="sub" style={{ margin: '4px 0 0' }}>{t('v11.twoPathsNote')}</p>
      </div>
      {BIZ.map(b => {
        const n = branchCount(s, b.id), c = bizCost(s, b), ok = meets(s, b.req);
        const cap = capitalPathCost(s, b);
        const managerMo = MANAGER_MONTHLY(b.base);
        const closureChance = Math.max(1, Math.min(35, Math.round((0.04 + (s.eraBiz < 0.9 ? 0.08 : 0) + (n > 5 ? 0.01 * (n - 5) : 0)) * 100)));
        return <Row key={b.id} art={b.art} right={<div className="trade" style={{ flexWrap: 'wrap' }}>
          {/* Degree path */}
          <Btn ic={ok ? (n ? 'ic-up' : 'ic-plus') : 'ic-x'} label={t('v11.degreePath') + ': ' + fmt(c)} kind={ok ? '' : 'ghost'} disabled={!ok || s.money < c} onClick={() => act(st => openBranch(st, b.id))} />
          {/* Capital path */}
          <Btn ic="ic-coins" label={t('v11.capitalPath') + ': ' + fmt(cap)} kind="ghost" disabled={s.money < cap + cap * 0.2} onClick={() => act(st => openBranchCapital(st, b.id))} />
        </div>}>
          <b>{t('biz.' + b.id, b.name)} <span className="tag">{b.ind}</span> <span className="tag">{n} {t('branches')}</span></b>
          <span className="sub">{n ? t('chain') + ': ' : t('openIn', '', { r: b.reg[0] }) + ' (+' + fmt(b.inc * 1.25 * 12) + t('ifSteady') + ') · '}{t('requires')} {reqLabel(b.req)}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('v11.capitalPathSummary', '', { cost: fmt(cap), manager: fmt(managerMo), chance: closureChance })}</span>
          {n > 0 && <div>{(s.branches[b.id] || []).map((br, i) => {
            const net = branchNet(s, b, br) * mult;
            const isCapital = br.paid > c * 1.5; // paid ≥1.5× normal → capital path
            return <span key={i} className={'brchip ' + (net >= 0 ? 'up' : 'dn')}>{b.reg[br.r % b.reg.length]} · {net >= 0 ? '+' : ''}{fmt(net)}/mo · {br.mood >= 1.35 ? t('booming') : br.mood <= .55 ? t('struggling') : t('steady')}{isCapital ? ' · ' + t('v11.manager') : ''}</span>;
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
  // v11.21 — daily contemplation cap remaining (for the spirit-panel note).
  const spiritLeft = spiritGainTodayLeft(s);
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

      {/* v11.6 — Tarot panel. Player opts in; monthly draws (30-day cooldown)
          give a cryptic hint about the season ahead. Drawn cards are logged
          for later reference. */}
      <h3 style={{ marginTop: 12 }}>{t('v11.tarotTitle')}</h3>
      <Row art="w-lotus"
        right={<button className="ibtn" onClick={() => act(g => {
          const on = togglePsychic(g);
          return on ? t('v11.tarotOptIn') + ' ✓' : t('v11.tarotOptOut') + ' ✓';
        })}>{s.psychic?.optedIn ? t('v11.tarotOptOut') : t('v11.tarotOptIn')}</button>}>
        <b>{t('v11.tarotTitle')}</b>
        <span className="sub">{t('v11.tarotBlurb')}</span>
        {s.psychic?.optedIn && (
          <div className="trade" style={{ marginTop: 4 }}>
            <button className="tbuy"
              disabled={(s.psychic?.lastDrawDay || 0) > 0 && s.lastDay - (s.psychic?.lastDrawDay || 0) < 30}
              onClick={() => act(g => {
                const r = tarotDraw(g);
                if (!r) return t('v11.tarotCooldown');
                return `${r.card}: ${r.meaning}`;
              })}>{t('v11.tarotDraw')}</button>
          </div>
        )}
      </Row>
      {s.psychic?.draws && s.psychic.draws.length > 0 && (
        <Row art="ic-star">
          <b className="mini">{t('v11.tarotRecent')}:</b>
          <span className="sub" style={{ display: 'block', marginTop: 2 }}>
            {s.psychic.draws.slice(-5).reverse().map(d => `${d.card}`).join(' · ')}
          </span>
        </Row>
      )}
      {/* v11.21 — Spirit panels now grant spirit points (capped per day). */}
      <div className="mini" style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.02)', borderRadius: 4, marginBottom: 6, opacity: .85 }}>
        {t('sp.spiritPanelNote', '', { cap: SPIRIT_DAILY_CAP })} · <b>{spiritLeft}/{SPIRIT_DAILY_CAP}</b> {t('left')}.
      </div>
      {/* v11.11 — Kinh Dịch (I Ching), first Huyen-Hoc-AI feature integrated into the main app */}
      <KinhDichPanel act={act} />
      {/* v11.14 — Tử Vi (紫微斗数), second Huyen-Hoc-AI feature integrated */}
      <TuViPanel s={s} act={act} />
      {/* v11.15 — Phong Thuỷ Bát Trạch (八宅), third Huyen-Hoc-AI feature integrated */}
      <PhongThuyPanel s={s} act={act} />
      {/* v11.16 — Tarot nâng cao (full 78-card deck + multi-card spreads), fourth Huyen-Hoc-AI feature integrated */}
      <TarotSpreadPanel act={act} />
    </>
  );
}

// v11.11 — Kinh Dịch (I Ching) panel. Casts 6 lines client-side via the
// deterministic engine (src/lib/iching.ts), then asks /api/divine for an LLM
// interpretation in the player's language. No save-state change: each cast is
// stateless (client-side throttle prevents spam). Mirrors the Huyen-Hoc-AI
// FastAPI coin-cast + King Wen lookup, but runs on the main app's own LLM.
function HexLines({ hex }: { hex: CastResult['primary'] }) {
  // Render the 6 hào top → bottom (reverse of the stored bottom → top order).
  // Yang = solid bar, yin = two segments; moving lines use the accent colour + a dot.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <div style={{ fontSize: '1.15rem', lineHeight: 1 }}>{hex.upper.symbol}{hex.lower.symbol}</div>
      {hex.lines.slice().reverse().map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', gap: l.yang ? 0 : 6, width: 60, height: 7 }}>
            {l.yang
              ? <div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} />
              : <><div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} /><div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} /></>}
          </div>
          {l.moving && <span style={{ fontSize: '.6rem', color: 'var(--accent)' }}>●</span>}
        </div>
      ))}
    </div>
  );
}

function KinhDichPanel({ act }: { act: Act }) {
  const { t, lang } = useT();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ cast: CastResult; reading: { interpretation: string; advice: string; verdict: 'CAT' | 'HUNG' | 'TINH'; verdictLabel: string; source: string } } | null>(null);
  const lastCastRef = useRef(0);
  const THROTTLE_MS = 8000; // client-side throttle — one cast per 8s
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;
  const qLen = question.trim().length;
  const canCast = !busy && qLen >= 5 && qLen <= 500;

  const doCast = async () => {
    setErr(null);
    try { validateQuestion(question, lang); }
    catch (e) { setErr((e as Error).message || t('kd.errQuestion')); return; }
    if (Date.now() - lastCastRef.current < THROTTLE_MS) { setErr(t('kd.throttle')); return; }
    lastCastRef.current = Date.now();
    setBusy(true);
    // Deterministic cast runs client-side; the LLM only interprets it.
    const cast = castHexagram();
    try {
      const res = await fetch('/api/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cast, question: question.trim(), lang })
      });
      if (!res.ok) throw new Error('fetch');
      const reading = await res.json();
      setResult({ cast, reading });
      // v11.21 — casting the I Ching is a contemplation act; grant a small
      // spirit boost (1-3 points) capped per game-day. The act callback
      // mutates s.spirit via grantSpirit() and surfaces the gain as a toast.
      act(st => {
        const g = grantSpirit(st, 2, 'Kinh Dịch cast');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Kinh Dịch' }) : null;
      });
    } catch {
      setErr(t('kd.errFetch'));
    } finally { setBusy(false); }
  };

  const verdictColor = result?.reading.verdict === 'CAT' ? 'var(--sage)'
    : result?.reading.verdict === 'HUNG' ? 'var(--brick)' : 'var(--slate)';

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('kd.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canCast} onClick={doCast}>
          <span>{busy ? t('kd.thinking') : t('kd.cast')}</span>
        </button>}>
        <b>{t('kd.title')}</b>
        <span className="sub">{t('kd.blurb')}</span>
        <textarea placeholder={t('kd.questionPh')} value={question}
          onChange={e => setQuestion(e.target.value)} maxLength={500} rows={2}
          style={{ width: '100%', marginTop: 6, padding: '6px 8px', border: '1px solid var(--line2)', borderRadius: 4, fontSize: '.9rem', background: 'transparent', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }}
          aria-label={t('kd.question')} />
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* primary + changed hexagram side by side with hào lines */}
          <div className="lb"><span>{t('kd.primary')}</span>
            <b>#{result.cast.primary.num} · {L(result.cast.primary.name)}</b></div>
          <div className="mini" style={{ marginTop: 2 }}>{L(result.cast.primary.theme)}</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '8px 0' }}>
            <HexLines hex={result.cast.primary} />
            {result.cast.changed && (
              <>
                <span className="mini" style={{ fontSize: '1rem' }}>→</span>
                <div>
                  <div className="mini">{t('kd.changed')}</div>
                  <div style={{ marginTop: 2 }}><HexLines hex={result.cast.changed} /></div>
                  <div className="mini" style={{ marginTop: 2 }}>
                    <b>#{result.cast.changed.num} · {L(result.cast.changed.name)}</b>
                  </div>
                  <div className="mini">{L(result.cast.changed.theme)}</div>
                </div>
              </>
            )}
          </div>
          <div className="mini">
            {result.cast.movingLines.length
              ? `${t('kd.moving')}: ${result.cast.movingLines.join(', ')}`
              : t('kd.staticCast')}
          </div>

          {/* verdict badge */}
          <div className="lb" style={{ marginTop: 8 }}><span>{t('kd.verdict')}</span>
            <b style={{ color: verdictColor }}>{result.reading.verdictLabel}</b></div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('kd.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.reading.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('kd.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.reading.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}

// v11.14 — Tử Vi (紫微斗数) panel. Builds a simplified natal chart (lá số)
// client-side via src/lib/tuvi.ts (ported from Huyen-Hoc-AI), using the
// character's byear + birthMonth + birthDay (v11.19: was day=15 default)
// plus an hour the player enters here. The LLM interpretation comes from
// /api/tuvi. No save-state change.
function TuViPanel({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  // v11.19 — seed day from the character's birthDay instead of mid-month 15.
  const [day, setDay] = useState(s.birthDay || 15);
  const [hour, setHour] = useState(12);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ laso: LaSo; reading: { interpretation: string; advice: string; source: string } } | null>(null);

  const canBuild = !busy && day >= 1 && day <= 31 && hour >= 0 && hour <= 23;

  const doBuild = async () => {
    setErr(null);
    if (!(day >= 1 && day <= 31)) { setErr(t('tv.errDate')); return; }
    setBusy(true);
    let laso: LaSo;
    try {
      laso = lapLaSo(day, s.birthMonth, s.byear, hour);
    } catch (e) {
      setErr((e as Error).message || t('tv.errDate'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/tuvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laso, lang })
      });
      if (!res.ok) throw new Error('fetch');
      const reading = await res.json();
      setResult({ laso, reading });
      // v11.21 — building the Tử Vi chart is a deep self-contemplation act;
      // grant 2-4 spirit (capped per game-day via grantSpirit).
      act(st => {
        const g = grantSpirit(st, 3, 'Tử Vi chart');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Tử Vi' }) : null;
      });
    } catch {
      setErr(t('tv.errFetch'));
    } finally { setBusy(false); }
  };

  // star-state → colour (Miếu/Vượng/Đắc = strong green, Bình = neutral, Hãm = red)
  const stateColor = (st: string) =>
    st === 'Hãm' ? 'var(--brick)' : (st === 'Miếu' || st === 'Vượng' || st === 'Đắc') ? 'var(--sage)' : 'var(--mute)';

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('tv.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canBuild} onClick={doBuild}>
          <span>{busy ? t('tv.thinking') : t('tv.build')}</span>
        </button>}>
        <b>{t('tv.title')}</b>
        <span className="sub">{t('tv.blurb')}</span>
        <span className="mini" style={{ display: 'block', marginTop: 4 }}>{t('tv.useGame')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10 }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('tv.birthDay')}</span>
            <input type="number" min={1} max={31} value={day}
              onChange={e => setDay(Math.max(1, Math.min(31, +e.target.value || 1)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('tv.birthHour')}</span>
            <input type="number" min={0} max={23} value={hour}
              onChange={e => setHour(Math.max(0, Math.min(23, +e.target.value || 0)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* chart summary */}
          <div className="lb"><span>{t('tv.solar')}</span><b>{result.laso.duongLich}</b></div>
          <div className="lb"><span>{t('tv.lunar')}</span><b>{result.laso.amLich}</b></div>
          <div className="lb"><span>{t('tv.yearCanChi')}</span><b>{result.laso.canChiNam}</b></div>
          <div className="lb"><span>{t('tv.birthHourLabel')}</span><b>{result.laso.gioSinh}</b></div>
          <div className="lb"><span>{t('tv.cuc')}</span><b>{result.laso.cuc}</b></div>
          <div className="lb"><span>{t('tv.menhAt')}</span><b>{result.laso.menhChi}</b></div>
          <div className="lb"><span>{t('tv.thanAt')}</span><b>{result.laso.thanChi}</b></div>
          <div className="lb"><span>{t('tv.tuviAt')}</span><b>{result.laso.tuViTai}</b></div>

          {/* 12-palace grid (4 cols × 3 rows) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, margin: '10px 0' }}>
            {result.laso.cung.map((p, i) => (
              <div key={i} style={{
                padding: '6px 7px', borderRadius: 8, border: '1px solid var(--line)',
                background: p.laMenh ? 'rgba(0,0,0,0.05)' : 'var(--card)',
                borderColor: p.laMenh ? 'var(--accent)' : p.laThan ? 'var(--line2)' : 'var(--line)',
                borderWidth: p.laMenh || p.laThan ? 2 : 1,
                minHeight: 64
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b style={{ fontSize: '.86rem' }}>{p.cung}</b>
                  <span className="mini" style={{ opacity: .7 }}>{p.diaChi}</span>
                </div>
                {p.chinhTinh.length ? (
                  <div style={{ marginTop: 3 }}>
                    {p.chinhTinh.map((st, j) => (
                      <div key={j} className="mini" style={{ color: stateColor(st.trangThai), fontWeight: 600 }}>
                        {st.sao} <span style={{ opacity: .7, fontWeight: 400 }}>({st.trangThai})</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="mini" style={{ opacity: .45, marginTop: 3 }}>{t('tv.note')}</div>}
                {p.phuTinh.length > 0 && (
                  <div className="mini" style={{ marginTop: 3, opacity: .7, fontSize: '.72rem' }}>{p.phuTinh.join(', ')}</div>
                )}
                {p.laMenh && <div className="mini" style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>★ Mệnh</div>}
                {!p.laMenh && p.laThan && <div className="mini" style={{ color: 'var(--slate)', fontWeight: 700, marginTop: 2 }}>Thân</div>}
              </div>
            ))}
          </div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 6 }}>{t('tv.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.reading.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('tv.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.reading.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{result.laso.ghiChu}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}

// v11.15 — Phong Thuỷ (Bát Trạch 八宅) panel. Computes a simplified feng-shui
// reading client-side via the deterministic engine (src/lib/phongthuy.ts),
// then asks /api/phongthuy for an LLM interpretation in the player's language.
// Uses the character's birth year + month (already collected) plus the day,
// gender, and house/kitchen/bedroom directions the player enters — no save
// change. Mirrors the Huyen-Hoc-AI FastAPI Bát Trạch + Cửu Tinh reference, but
// runs on the main app's own LLM (same client as /api/divine + /api/tuvi).
function PhongThuyPanel({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  // v11.19 — seed day from the character's birthDay instead of mid-month 15.
  const [day, setDay] = useState(s.birthDay || 15);
  const [gender, setGender] = useState<'nam' | 'nu'>('nam');
  const [houseDir, setHouseDir] = useState<Huong>('Nam');
  const [kitchenDir, setKitchenDir] = useState<Huong | ''>('');
  const [bedroomDir, setBedroomDir] = useState<Huong | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ reading: PhongThuyReading; interp: { interpretation: string; advice: string; source: string } } | null>(null);

  const canAnalyze = !busy && day >= 1 && day <= 31;

  const doAnalyze = async () => {
    setErr(null);
    if (!(day >= 1 && day <= 31)) { setErr(t('pt.errDate')); return; }
    setBusy(true);
    let reading: PhongThuyReading;
    try {
      reading = phanTichToanDien(
        day, s.birthMonth, s.byear, gender, houseDir,
        kitchenDir || undefined, bedroomDir || undefined,
      );
    } catch (e) {
      setErr((e as Error).message || t('pt.errDate'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/phongthuy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading, lang })
      });
      if (!res.ok) throw new Error('fetch');
      const interp = await res.json();
      setResult({ reading, interp });
      // v11.21 — phong thuỷ analysis aligns the player with their space;
      // grant 1-3 spirit (capped per game-day via grantSpirit).
      act(st => {
        const g = grantSpirit(st, 2, 'Phong Thuỷ analysis');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Phong Thuỷ' }) : null;
      });
    } catch {
      setErr(t('pt.errFetch'));
    } finally { setBusy(false); }
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4,
    background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: '.9rem',
  };

  const totColor = (tot: boolean) => tot ? 'var(--sage)' : 'var(--brick)';

  const matchRow = (label: string, r?: { huongNha: Huong; cung: string; tot: boolean; diemThamKhao: number }) => (
    <div className="lb">
      <span>{label}</span>
      <b>
        {r ? (
          <>
            <span style={{ color: totColor(r.tot) }}>{r.huongNha} → {r.cung}</span>
            {' '}
            <span className="mini" style={{ opacity: .65 }}>
              ({r.tot ? t('pt.totYes') : t('pt.totNo')}, {t('pt.score')} {r.diemThamKhao})
            </span>
          </>
        ) : <span className="mini" style={{ opacity: .5 }}>{t('pt.none')}</span>}
      </b>
    </div>
  );

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('pt.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canAnalyze} onClick={doAnalyze}>
          <span>{busy ? t('pt.thinking') : t('pt.analyze')}</span>
        </button>}>
        <b>{t('pt.title')}</b>
        <span className="sub">{t('pt.blurb')}</span>
        <span className="mini" style={{ display: 'block', marginTop: 4 }}>{t('pt.useGame')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10, flexWrap: 'wrap' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 80px' }}>
            <span>{t('pt.birthDay')}</span>
            <input type="number" min={1} max={31} value={day}
              onChange={e => setDay(Math.max(1, Math.min(31, +e.target.value || 1)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.gender')}</span>
            <select value={gender} onChange={e => setGender(e.target.value as 'nam' | 'nu')} style={selectStyle}>
              <option value="nam">{t('pt.male')}</option>
              <option value="nu">{t('pt.female')}</option>
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.houseDir')}</span>
            <select value={houseDir} onChange={e => setHouseDir(e.target.value as Huong)} style={selectStyle}>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.kitchenDir')}</span>
            <select value={kitchenDir} onChange={e => setKitchenDir(e.target.value as Huong | '')} style={selectStyle}>
              <option value="">{t('pt.none')}</option>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.bedroomDir')}</span>
            <select value={bedroomDir} onChange={e => setBedroomDir(e.target.value as Huong | '')} style={selectStyle}>
              <option value="">{t('pt.none')}</option>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* summary */}
          <div className="lb"><span>{t('pt.kua')}</span><b>{result.reading.cungPhi}</b></div>
          <div className="lb"><span>{t('pt.quai')}</span><b>{result.reading.quai}</b></div>
          <div className="lb"><span>{t('pt.group')}</span><b>{result.reading.nhom}</b></div>

          {/* 4 good directions */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.goodDirs')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
            {result.reading.huongTot.map((h, i) => (
              <div key={i} className="mini" style={{ padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--sage)' }}>{h.huong}</b>
                <span style={{ opacity: .75 }}> · {h.cung}</span>
              </div>
            ))}
          </div>

          {/* 4 bad directions */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.badDirs')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
            {result.reading.huongXau.map((h, i) => (
              <div key={i} className="mini" style={{ padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--brick)' }}>{h.huong}</b>
                <span style={{ opacity: .75 }}> · {h.cung}</span>
              </div>
            ))}
          </div>

          {/* direction matches */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('pt.houseMatch')}</div>
          <div style={{ marginTop: 4 }}>
            {matchRow(t('pt.houseDir'), result.reading.huongNha)}
            {matchRow(t('pt.kitchenDir'), result.reading.huongBep)}
            {matchRow(t('pt.bedroomDir'), result.reading.huongPhongNgu)}
          </div>

          {/* today's flying star */}
          <div className="lb" style={{ marginTop: 8 }}>
            <span>{t('pt.todayStar')}</span>
            <b>
              {result.reading.phiTinhHomNay.saoTrungCung} ({result.reading.phiTinhHomNay.saoInfo.ten}, {result.reading.phiTinhHomNay.saoInfo.hanh})
            </b>
          </div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('pt.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.interp.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{result.reading.ghiChu}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}

// v11.16 — Tarot nâng cao panel. Draws a 1/3/5-card spread client-side
// from the full 78-card deck (src/lib/tarot.ts), then asks /api/tarot for a
// multi-card LLM interpretation in the player's language. Stateles — no save
// change. Mirrors the Huyen-Hoc-AI FastAPI tarot.draw_cards + interpret_tarot,
// but runs on the main app's own LLM (same client as /api/divine + tuvi +
// phongthuy). The earlier v11.6 simple Tarot (1 card, 30-day cooldown) stays
// above; this panel is the full-spread upgrade.
function TarotSpreadPanel({ act }: { act: Act }) {
  const { t, lang } = useT();
  const [spread, setSpread] = useState<1 | 3 | 5>(3);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cards: TarotCard[];
    interp: {
      thongDiepChinh: string;
      luanGiaiTungLa: { viTri: string; la: string; yNghia: string; lienQuanCauHoi: string }[];
      tongHop: string;
      loiKhuyenCuThe: { hanhDong: string; thoiDiem: string; lyDo: string }[];
      canhBao: string[];
      cauChuc: string;
      source: string;
    };
  } | null>(null);

  const doDraw = async () => {
    setErr(null);
    setBusy(true);
    let cards: TarotCard[];
    try {
      cards = drawCards(spread);
    } catch (e) {
      setErr((e as Error).message || t('tt.errDraw'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards, question: question.trim(), lang })
      });
      if (!res.ok) throw new Error('fetch');
      const interp = await res.json();
      setResult({ cards, interp });
      // v11.21 — Tarot spread is an intuition/contemplation act; grant 1-3
      // spirit (capped per game-day via grantSpirit). Bigger spreads give
      // a touch more: 1-card → +1, 3-card → +2, 5-card → +3.
      const spiritAmt = spread === 1 ? 1 : spread === 3 ? 2 : 3;
      act(st => {
        const g = grantSpirit(st, spiritAmt, 'Tarot spread');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Tarot' }) : null;
      });
    } catch {
      setErr(t('tt.errFetch'));
    } finally { setBusy(false); }
  };

  const labels = result ? spreadLabels(result.cards.length as 1 | 3 | 5, lang) : [];

  const selectStyle: React.CSSProperties = {
    padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4,
    background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: '.9rem',
  };

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('tt.title')}</h3>
      <Row art="w-lotus"
        right={<button className="ibtn" disabled={busy} onClick={doDraw}>
          <span>{busy ? t('tt.thinking') : t('tt.draw')}</span>
        </button>}>
        <b>{t('tt.title')}</b>
        <span className="sub">{t('tt.blurb')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto' }}>
            <span>Spread</span>
            <select value={spread} onChange={e => setSpread(+e.target.value as 1 | 3 | 5)} style={selectStyle}>
              <option value={1}>{t('tt.spread1')}</option>
              <option value={3}>{t('tt.spread3')}</option>
              <option value={5}>{t('tt.spread5')}</option>
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 200 }}>
            <span>{t('tt.question')}</span>
            <input type="text" value={question} placeholder={t('tt.questionPh')}
              onChange={e => setQuestion(e.target.value)}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* card grid: each card in its spread position */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(result.cards.length, 5)}, 1fr)`, gap: 6, margin: '6px 0 10px' }}>
            {result.cards.map((c, i) => (
              <div key={i} style={{
                padding: '6px 7px', borderRadius: 8, border: '1px solid var(--line)',
                background: 'var(--card)', minHeight: 80,
                transform: c.reversed ? 'rotate(180deg)' : undefined,
              }}>
                <div className="mini" style={{ opacity: .75, marginBottom: 2 }}>{labels[i]}</div>
                <b style={{ fontSize: '.86rem' }}>{c.vn}</b>
                {c.loai === 'minor' && (
                  <div className="mini" style={{ opacity: .65 }}>{c.suitVn} · {c.element}</div>
                )}
                <div className="mini" style={{ marginTop: 4, color: c.reversed ? 'var(--brick)' : 'var(--sage)', fontWeight: 600 }}>
                  {c.reversed ? t('tt.reversed') : t('tt.upright')}
                </div>
              </div>
            ))}
          </div>

          {/* main message */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('tt.mainMsg')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.thongDiepChinh}</p>

          {/* per-card interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.perCard')}</div>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.interp.luanGiaiTungLa.map((c, i) => (
              <div key={i} className="mini" style={{ padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--accent)' }}>{c.viTri}</b>: <b>{c.la}</b>
                <div style={{ marginTop: 2 }}>{c.yNghia}</div>
                {c.lienQuanCauHoi && c.lienQuanCauHoi !== '—' && (
                  <div style={{ marginTop: 2, opacity: .7, fontStyle: 'italic' }}>{c.lienQuanCauHoi}</div>
                )}
              </div>
            ))}
          </div>

          {/* synthesis */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.synthesis')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.tongHop}</p>

          {/* advice */}
          {result.interp.loiKhuyenCuThe.length > 0 && (
            <>
              <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.advice')}</div>
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.interp.loiKhuyenCuThe.map((a, i) => (
                  <div key={i} className="mini" style={{ padding: '4px 7px', border: '1px solid var(--line)', borderRadius: 4 }}>
                    <b>{a.hanhDong}</b>
                    <div style={{ opacity: .7, marginTop: 2 }}>
                      <span>{t('tt.timing')}: {a.thoiDiem}</span> · <span>{t('tt.reason')}: {a.lyDo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* cautions */}
          {result.interp.canhBao.length > 0 && (
            <>
              <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10, color: 'var(--brick)' }}>{t('tt.warnings')}</div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }} className="mini">
                {result.interp.canhBao.map((w, i) => <li key={i} style={{ color: 'var(--brick)' }}>{w}</li>)}
              </ul>
            </>
          )}

          {/* blessing */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.blessing')}</div>
          <p className="mini" style={{ margin: '4px 0 0', fontStyle: 'italic' }}>{result.interp.cauChuc}</p>

          <p className="mini" style={{ marginTop: 8, opacity: .6 }}>{TAROT_GHI_CHU}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}

// ================= ASSETS (was ShopTab) =================
// v10.5: renamed from ShopTab. The "buy/sell" of physical items now lives
// under the Portfolio → Assets tab, alongside the player's owned items +
// pre-owned market + social listings + (new) repair/restore workshop.
const CATART: Record<string, string> = { 'Sport bike': 'i-bike', 'Phone': 'i-phone', 'Watch': 'i-watch', 'Jewelry': 'i-ring', 'Suit': 'i-suit', 'Car': 'i-lambo', 'Property': 'i-house', 'Yacht': 'i-yacht', 'Private jet': 'i-jet', 'Art': 'i-art', 'Collectibles': 'i-coin' };

function AssetsTab({ s, act, curCat, setCurCat }: { s: GameState; act: Act; curCat: string | null; setCurCat: (c: string | null) => void }) {
  const { t } = useT();
  // v11.20 — sort categories by minimum item price ascending (easiest → hardest).
  // Previously the order was insertion order from ITEMS[], which mixed cheap
  // (Phone $999) with expensive (Property $300k) randomly. Now the player
  // sees the cheapest categories first, with locked ones showing what
  // licence unlocks them.
  const cats = [...new Set(ITEMS.map(i => i.cat))].sort((a, b) => {
    const loA = Math.min(...ITEMS.filter(i => i.cat === a).map(i => i.price));
    const loB = Math.min(...ITEMS.filter(i => i.cat === b).map(i => i.price));
    return loA - loB;
  });
  // v11.18 — pending purchase confirmation. Clicking "buy" on a new or used
  // item no longer fires buyItem/buyUsedItem directly; instead it opens this
  // modal so the player can review price + cash-after + upkeep + rarity and
  // confirm or cancel. Lets the player back out if they clicked by mistake.
  const [pendingBuy, setPendingBuy] = useState<{ kind: 'new'; item: ItemDef } | { kind: 'used'; used: UsedItem } | null>(null);
  // Surface 6 used listings, shuffled deterministically by the current
  // game-year so the listings rotate as the player ages.
  const y = worldYear(s);
  const usedShown = useMemo(() => {
    const seed = y * 7 + s.level;
    // v10.5: filter out anachronistic listings — only show items whose
    // real-world 'since' year has passed in the current game timeline.
    // A 2001 game will not show a 2018 Ducati Panigale.
    const arr = [...USED_MARKET].filter(u => u.since <= y);
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
              onClick={() => setPendingBuy({ kind: 'used', used: u })}>
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
      <p className="mini" style={{ opacity: .65, marginBottom: 6 }}>{t('cat.sortedNote')}</p>
      <div className="grid">
        {cats.map(c => {
          const list = ITEMS.filter(i => i.cat === c);
          const lo = Math.min(...list.map(i => i.price)), hi = Math.max(...list.map(i => i.price));
          const need = LIC_FOR[c], have = !need || s.lic[need];
          const crewCat = CREW_COST[c] || 0;
          // v11.20 — locked categories show the licence name as a hint.
          const lockedHint = need && !have ? t('cat.lockedHint', '', { req: t('lic.' + need, LIC_BY[need]?.name || need) }) : '';
          return <button key={c} className="tile" onClick={() => setCurCat(c)} disabled={!!lockedHint}>
            <Art id={CATART[c] || 'ic-bag'} />
            <span>
              <b>{t('cat.' + c, c)}</b>
              <span className="sub" style={{ display: 'block' }}>{list.length} {t('items')} · {fmt(lo)} – {fmt(hi)}{crewCat ? ' · ' + t('v11.crewOptional') : ''}</span>
              {lockedHint ? (
                <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--brick)' }}>
                  <Ic id="ic-lock" className="bsi" /> {lockedHint}
                </span>
              ) : need && have ? (
                <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--sage)' }}>✓ {t('lic.' + need, LIC_BY[need]?.name || need)}</span>
              ) : null}
            </span>
          </button>;
        })}
      </div>
      <p className="sub">{t('tapCategory')}</p>
      {curCat && (
        <div className="modal on" onClick={e => { if (e.target === e.currentTarget) setCurCat(null); }}>
          <div className="mcard">
            <div className="mhead"><h2>{t('cat.' + curCat, curCat)}</h2><button className="ibtn ghost" onClick={() => setCurCat(null)}><Ic id="ic-x" className="bsi" /><span>✕</span></button></div>
            <div className="sub" style={{ marginBottom: 8 }}>{ITEMS.filter(i => i.cat === curCat).length} {t('items')}{LIC_FOR[curCat] ? ` · ${t('lic.' + LIC_FOR[curCat], LIC_BY[LIC_FOR[curCat]].name)}${s.lic[LIC_FOR[curCat]] ? ' ✓' : ''}` : (CREW_COST[curCat] ? ` · ${t('v11.crewOptional')}` : '')}</div>
            {ITEMS.filter(i => i.cat === curCat).map(i => {
              const need = LIC_FOR[curCat], locked = need && !s.lic[need];
              const irar = itemRarity(i);
              const crew = CREW_COST[curCat] || 0;
              const crewNow = crew > 0 ? ((curCat === 'Yacht' && s.lic['boat']) || (curCat === 'Private jet' && s.lic['pilot']) ? Math.round(crew / 2) : crew) : 0;
              return <Row key={i.id} art={i.art} image={ITEM_IMAGES[i.id]} right={<Btn ic={locked ? 'ic-lock' : 'ic-bag'} label={locked ? t('needLicence') : fmt(i.price)} disabled={!!locked || s.money < i.price} onClick={() => setPendingBuy({ kind: 'new', item: i })} />}>
                <b>{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name} <span className="rarity-chip" data-rarity={irar} style={{ '--rc': RARITY_COLOR[irar] } as React.CSSProperties}>{t('rarity.' + irar)}</span></b>
                <span className="sub">+{i.lux} {t('status')} · {t('loses', '', { n: (Math.abs(Math.min(i.rate, ASSET_DEPRECIATION_RATE)) * 100).toFixed(0) })} · {t('upkeep')} {fmt(i.price * 0.02)}{t('perYear')}</span>
                {crew > 0 && <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('v11.crewCost', '', { x: fmt(crewNow) })}{crewNow < crew ? ` (${t('v11.crewHalved')})` : ''}</span>}
              </Row>;
            })}
          </div>
        </div>
      )}
      {/* v11.18 — purchase confirmation modal. Opens when pendingBuy is set;
          lets the player review price + cash-after + upkeep and confirm/cancel. */}
      {pendingBuy && <PurchaseConfirm s={s} pending={pendingBuy} onConfirm={() => {
        act(st => {
          if (pendingBuy.kind === 'new') return buyItem(st, pendingBuy.item.id);
          return buyUsedItem(st, pendingBuy.used);
        });
        setPendingBuy(null);
      }} onCancel={() => setPendingBuy(null)} />}
    </>
  );
}

// v11.18 — purchase confirmation modal. Shown before any new or used item buy
// goes through. Reviews the item's photo + name + rarity + price + cash-after
// + upkeep + appreciate/depreciate rate (+ crew cost for yachts/jets + condition
// + age + listing note for used). Two buttons: Confirm buy / Cancel. The
// underlying buy logic (buyItem / buyUsedItem) is unchanged — this is purely a
// pre-confirm gate so a stray click doesn't commit the purchase.
function PurchaseConfirm({ s, pending, onConfirm, onCancel }: { s: GameState; pending: { kind: 'new'; item: ItemDef } | { kind: 'used'; used: UsedItem }; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useT();
  const isNew = pending.kind === 'new';
  const it: ItemDef = isNew ? pending.item : ITEM_BY[(pending.used as UsedItem).baseId];
  const u: UsedItem | null = isNew ? null : pending.used;
  const price = isNew ? (pending.item as ItemDef).price : (u as UsedItem).askPrice;
  const cashAfter = s.money - price;
  const canAfford = cashAfter >= 0;
  const irar = itemRarity(isNew ? (pending.item as ItemDef) : (u as UsedItem));
  const upkeepYr = Math.round(price * 0.02);
  // Appreciate or depreciate? Items with rate >= 0 appreciate.
  const rate = it.rate;
  const ratePct = Math.abs(Math.min(rate, ASSET_DEPRECIATION_RATE) * 100).toFixed(0);
  const appreciates = rate > 0;
  // Crew cost for yachts + private jets.
  const crewCat = CREW_COST[it.cat] || 0;
  const crewNow = crewCat > 0 ? ((it.cat === 'Yacht' && s.lic['boat']) || (it.cat === 'Private jet' && s.lic['pilot']) ? Math.round(crewCat / 2) : crewCat) : 0;
  // Licence requirement.
  const need = LIC_FOR[it.cat];
  const locked = !!need && !s.lic[need];
  const img = isNew ? ITEM_IMAGES[(pending.item as ItemDef).id] : USED_IMAGES[(u as UsedItem).id];
  const condTxt = u ? (u.condition >= 80 ? 'mint' : u.condition >= 60 ? 'good' : u.condition >= 40 ? 'fair' : 'rough') : '';
  const off = u ? Math.max(0, Math.round((1 - u.askPrice / u.newPrice) * 100)) : 0;
  return (
    <div className="modal on" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="mcard" style={{ maxWidth: 460 }}>
        <div className="mhead">
          <h2>{t('buy.title')} · <span className="mini">{isNew ? t('buy.new') : t('buy.used')}</span></h2>
          <button className="ibtn ghost" onClick={onCancel}><Ic id="ic-x" className="bsi" /><span>✕</span></button>
        </div>
        {/* photo + name + rarity */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: '0 0 110px', height: 90, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.04)' }}>
            {img ? <img src={asset(img)} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <Art id={it.art} />}
          </div>
          <div style={{ flex: 1 }}>
            <b>{it.brand ? <span className="bchip" style={{ background: it.c, marginRight: 4 }}>{it.brand}</span> : null}{it.name}</b>
            <div style={{ marginTop: 4 }}><span className="rarity-chip" data-rarity={irar} style={{ '--rc': RARITY_COLOR[irar] } as React.CSSProperties}>{t('rarity.' + irar)}</span></div>
            <div className="mini" style={{ marginTop: 4, opacity: .7 }}>{t('buy.luxury')}: +{it.lux}</div>
            {u && <div className="mini" style={{ marginTop: 4, opacity: .7 }}>{t('buy.discountOff', '', { n: off })}</div>}
          </div>
        </div>
        {/* price + cash-after + upkeep + rate */}
        <div className="lb"><span>{t('buy.price')}</span><b style={{ color: canAfford ? 'inherit' : 'var(--brick)' }}>{fmt(price)}</b></div>
        <div className="lb"><span>{t('buy.cashAfter')}</span><b style={{ color: cashAfter < 0 ? 'var(--brick)' : 'var(--sage)' }}>{fmt(cashAfter)}</b></div>
        <div className="lb"><span>{t('buy.upkeep')}</span><b>{fmt(upkeepYr)}</b></div>
        {crewCat > 0 && <div className="lb"><span>{t('buy.crew')}</span><b>{fmt(crewNow)}{crewNow < crewCat ? ` (${t('v11.crewHalved')})` : ''}</b></div>}
        <div className="lb"><span>{appreciates ? t('buy.appreciates', '', { n: ratePct }) : t('buy.depreciates', '', { n: ratePct })}</span><b style={{ color: appreciates ? 'var(--sage)' : 'var(--brick)' }}>{appreciates ? '↗' : '↘'}</b></div>
        {/* used-only fields */}
        {u && <>
          <div className="lb"><span>{t('buy.cond')}</span><b><span className="cond-pill" data-cond={condTxt}>{u.condition} · {condTxt}</span></b></div>
          <div className="lb"><span>{t('buy.ageYears')}</span><b>{u.ageYears} {t('years')}</b></div>
          {u.story && <p className="mini" style={{ marginTop: 6, fontStyle: 'italic', opacity: .8 }}>{u.story}</p>}
        </>}
        {/* confirm / cancel buttons */}
        <div className="trade" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
          <button className="ibtn ghost" onClick={onCancel}><span>{t('buy.cancel')}</span></button>
          <button className="tbuy" disabled={!canAfford || locked} onClick={onConfirm}>
            <span>{locked ? t('buy.locked') : canAfford ? t('buy.confirm') : t('buy.insufficient')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ================= STOCKS =================
// v11.2 — StockTab now also shows the active crisis banner (if any) and
// the market-research panel. Research costs a fee scaled by era (cheap
// before 1990, rises after); the brief is cached on s.researchBrief until
// the next Jan 1. The noise model lives in researchMarket() — false
// negatives ~15%, false positives ~10%.
function StockTab({ s, act, qtyMap, setQtyMap }: { s: GameState; act: Act; qtyMap: Record<string, number>; setQtyMap: (m: Record<string, number>) => void }) {
  const { t } = useT();
  const cost = researchCost(s);
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
      {/* v11.27 — portfolio pulse: total holdings value + today's movers */}
      {(() => {
        const val = STOCKS.reduce((a, x) => a + (s.stk[x.id] || 0) * s.prices[x.id], 0);
        const movers = STOCKS.map(x => { const hh = s.hist[x.id]; return { id: x.id, ch: hh.length > 1 ? (s.prices[x.id] / hh[hh.length - 2] - 1) * 100 : 0 }; }).sort((a, b) => b.ch - a.ch);
        const best = movers[0], worst = movers[movers.length - 1];
        return (
          <Row art="s-coin">
            <b>{t('mk.portfolio')} · <span className={val > 0 ? 'up' : ''}>{fmt(val)}</span></b>
            <span className="sub">{t('mk.holdings', '', { n: fmt(val) })}</span>
            <span className="mini" style={{ display: 'block', marginTop: 2 }}>
              📈 {best.id} <b className="up">+{best.ch.toFixed(1)}%</b> · 📉 {worst.id} <b className={worst.ch >= 0 ? 'up' : 'down'}>{worst.ch.toFixed(1)}%</b> — {t('mk.movers')}
            </span>
          </Row>
        );
      })()}
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
            {/* v11.27 — one-tap MAX buy (spend all affordable cash) / ALL sell (entire holding) */}
            <button className="tquick" title={t('mk.buyMax')} disabled={s.money < p} onClick={() => act(g => { const q2 = Math.max(1, Math.floor(g.money / Math.max(1, g.prices[st.id]))); return trade(g, st.id, 'buy', q2).msg; })}>{t('mk.max')}</button>
            <button className="tquick" title={t('mk.sellAll')} disabled={!q} onClick={() => act(g => trade(g, st.id, 'sell', g.stk[st.id] || 0).msg)}>{t('mk.all')}</button>
          </div>}>
          <b>{st.id} <span className={ch >= 0 ? 'up' : 'down'}>{ch >= 0 ? '▲' : '▼'}{Math.abs(ch).toFixed(1)}%</span></b>
          <span className="sub">{st.name} · {fmt(p)} · {t('hold', '', { n: q })}</span>
          <svg className="spark" viewBox="0 0 96 30"><polyline fill="none" stroke={h[h.length - 1] >= h[0] ? '#4f7d5f' : '#a3524a'} strokeWidth="2.4" points={pts} /></svg>
        </Row>;
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
          <b className="big">@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'huyenbao'}
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
        {/* v11.9 — all post buttons disabled during the one-post-per-game-day cooldown.
            This kills the spam-click exploit (repeat clicks kept adding followers/likes). */}
        <Btn ic="ic-ai" label={aiBusy ? t('divine.thinking') : t('postAi')} disabled={aiBusy || !canPost(s)} onClick={aiPost} />
        <Btn ic="ic-plus" label={t('postUpdate')} disabled={!canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'update'), 1); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-up" label={t('postHype')} disabled={!canHype || !canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'hype'), 1.6); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-heart" label={t('postCharity')} disabled={!canCharity || !canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'charity'), 1.4); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
        <Btn ic="ic-star" label={t('postMilestone')} disabled={!canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'milestone'), 1.5); const n = st.social.followers.toLocaleString(); return t('posted', '', { n }); })} />
      </div>
      {!canPost(s) && <p className="mini" style={{ margin: '-2px 0 8px', opacity: .8 }}>{t('postCooldown', '', { n: postCooldownLeft(s) })}</p>}
      <div className="card">
        {s.social.posts.length ? s.social.posts.map((p, i) => (
          <div className="post" key={i}>
            <Art id={stageOf(s.age).art} className="pav" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '.9rem' }}>@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'huyenbao'}{s.social.verified && <span className="vbadge">✓</span>}</b>
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
  const activeMult = clubMult(s);
  return (
    <>
      {/* v10.5 — multiple-club membership summary */}
      {s.clubs.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="lb"><span>{t('clubs.active')}</span><b>×{activeMult.toFixed(2)}</b></div>
          <div className="lb"><span>{t('clubs.joined', '', { n: s.clubs.length })}</span><b>{s.clubs.map(id => t('club.' + id, CLUBS.find(c => c.id === id)?.name || id)).join(', ')}</b></div>
          <div className="lb"><span>{t('clubs.monthlyDues')}</span><b>{fmt(s.clubs.reduce((sum, id) => sum + (CLUBS.find(c => c.id === id)?.fee || 0) / 12, 0))}{t('perMonth')}</b></div>
          <div className="mini" style={{ marginTop: 6 }}>{t('clubs.opportunityNote')}</div>
        </div>
      )}
      {CLUBS.map(c => {
        const mine = s.clubs.includes(c.id), ok = nw >= c.min;
        return <Row key={c.id} art={c.art} right={<div className="trade">
          {mine ? <Btn ic="ic-x" label={t('clubs.leave')} kind="ghost" onClick={() => act(st => leaveClub(st, c.id))} /> : null}
          <Btn ic={mine ? 'ic-check' : 'ic-crown'} label={mine ? t('member') : !ok ? t('minNw') + ' ' + fmt(c.min) : t('join') + ' · ' + fmt(c.fee)} disabled={mine || !ok || s.money < c.fee} onClick={() => act(st => joinClub(st, c.id))} />
        </div>}>
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
              <Btn ic="ic-heart" label={t('relations.talk')} onClick={() => act(st => interactNPC(st, npc.id, 'talk'))} />
              <Btn ic="ic-bag" label={t('relations.gift') + ' ' + fmt(Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1)))))} disabled={s.money < Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1))))} onClick={() => act(st => interactNPC(st, npc.id, 'gift'))} />
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

// ================= POWER (v11.3) =================
// Power & influence tab. Shows the player's current power tier (driven
// by net worth), the influence resource + its sources, and the advocacy
// actions they can spend influence on. Tier unlocks at $10M / $100M /
// $1B / $10B; influence comes from charity, club chair, board seats,
// media ownership. Diminishing returns on influence gain so it's
// harder to climb past 1000.
function PowerTab({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  const tier = powerTierOf(s);
  const tierIdx = POWER_TIERS.findIndex(r => r.tier === tier);
  const next = nextTierOf(s);
  const nw = netWorth(s);
  const tierLabel = (POWER_TIERS[tierIdx] || POWER_TIERS[0]);
  const showTier = (l: Lang) => l === 'vi' ? tierLabel.vi : l === 'zh' ? tierLabel.zh : tierLabel.en;
  const params = electionParamsFor(s.nation);
  const electionResult = s.power?.elections?.[s.nation];
  const canRunElection = tierIdx >= POWER_TIERS.findIndex(r => r.tier === 'national_power')
    && (s.power?.influence || 0) >= 80
    && (s.power?.scrutiny || 0) < 95
    && (!electionResult || electionResult.status !== 'won' || electionResult.termEnds <= s.lastDay);
  // Bot rows for alliances/rivals UI (runElection expects {name, nation, nw}[]).
  const botRows = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, ind, nw: v * Math.pow(1.12, Math.max(0, s.age - 18)) }));
  // v11.18 — pick the explanation key for the current tier.
  const tierExplainKey: Record<string, string> = {
    'none': 'pw.explainMogul',
    'industry_mogul': 'pw.explainMogul',
    'influencer': 'pw.explainInfluencer',
    'national_power': 'pw.explainNational',
    'state_leader': 'pw.explainState',
  };
  return (<>
    {/* Current tier + next-threshold hint */}
    <Row art="t-power">
      <b>{t('v11.powerCurrentTier')} <span className={tier === 'none' ? 'down' : 'up'}>{showTier(lang)}</span></b>
      <span className="sub">{t('v11.powerNetWorth', '', { v: fmt(nw) })}</span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {next
          ? t('v11.powerNextTier', '', { tier: next.label, v: fmt(next.min) })
          : t('v11.powerTopTier')}
      </span>
      {/* v11.23 — explanation: bullet list with icons (was dense prose) */}
      <div className="mini" style={{ display: 'block', marginTop: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
        <b style={{ opacity: .85, fontSize: '.78rem' }}>{t('pw.explainTitle')}</b>
        <ul className="explain-bullets">
          {t((tierExplainKey[tier] || 'pw.explainMogul') + '.bullets').split('||').map((b, i) => (
            <li key={i}><Ic id={i === 0 ? 'ic-check' : i === 1 ? 'ic-xp' : 'ic-x'} className="si bul-ic" /><span>{b}</span></li>
          ))}
        </ul>
      </div>
      <span className="mini" style={{ display: 'block', marginTop: 4, opacity: .65 }}>{t('pw.hardening')}</span>
    </Row>

    {/* Influence resource + sources */}
    <Row art="s-coin">
      <b>{t('v11.influenceLabel')} <span className="up">{s.power?.influence || 0}</span></b>
      <span className="sub">{t('v11.influenceBlurb')}</span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {t('v11.influenceSources')}:{' '}
        {(s.power?.influenceLog || []).slice(-5).reverse().map(e => {
          const src = INFLUENCE_SOURCE_LABELS[e.source as keyof typeof INFLUENCE_SOURCE_LABELS];
          const label = src ? (lang === 'vi' ? src.vi : lang === 'zh' ? src.zh : src.en) : e.source;
          return `${label} +${e.amount}`;
        }).join(' · ') || t('v11.noSourcesYet')}
      </span>
      {s.power?.foundationMult && (
        <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--green)' }}>
          {t('v11.foundationActive', '', { x: ((s.power.foundationMult - 1) * 100).toFixed(0) })}
        </span>
      )}
      {s.power?.boardNomineeBiz && (
        <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--green)' }}>
          {t('v11.boardNomineeActive', '', { x: ((s.power.boardNomineeBiz - 1) * 100).toFixed(0) })}
        </span>
      )}
    </Row>

    {/* v11.4 — Scrutiny meter */}
    <Row art="s-tech">
      <b>{t('v11.scrutinyLabel')} <span className={((s.power?.scrutiny || 0) >= 80) ? 'down' : 'up'}>{s.power?.scrutiny || 0}/100</span></b>
      <span className="sub">{t('v11.scrutinyBlurb')}</span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {t('v11.transparencyLabel')}: {s.power?.transparency || 0}/100
        {((s.power?.scrutiny || 0) >= 80) && <span className="down"> · {t('v11.scrutinyHigh')}</span>}
      </span>
      {/* v11.18 — scrutiny explanation */}
      <span className="mini" style={{ display: 'block', marginTop: 6, padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)', opacity: .85 }}>
        {t('pw.scrutinyExplain')}
      </span>
    </Row>
    {/* v11.4 — Transparency actions */}
    {TRANSPARENCY_ACTIONS.map(a => {
      const labelLang = (l: Lang): string => l === 'vi' ? a.label.vi : l === 'zh' ? a.label.zh : a.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? a.desc.vi : l === 'zh' ? a.desc.zh : a.desc.en;
      return <Row key={a.id} art="s-tech"
        right={<button className="tbuy" disabled={a.cost > 0 && (s.power?.influence || 0) < a.cost}
          onClick={() => act(g => {
            const r = doTransparency(g, a.id);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : r.reason || 'failed';
            return t('v11.transparencyDone', '', { action: labelLang(lang) });
          })}>{a.cost > 0 ? t('v11.advocacyBtn', '', { x: a.cost }) : t('v11.transparencyAcceptRiskBtn')}</button>}>
        <b>{labelLang(lang)}</b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* Advocacy actions — spend influence here */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.advocacyTitle')}</h3>
    {ADVOCACY_ACTIONS.map(a => {
      const reqIdx = POWER_TIERS.findIndex(r => r.tier === a.minTier);
      const locked = tierIdx < reqIdx;
      const notEnough = (s.power?.influence || 0) < a.cost;
      const labelLang = (l: Lang): string => l === 'vi' ? a.label.vi : l === 'zh' ? a.label.zh : a.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? a.desc.vi : l === 'zh' ? a.desc.zh : a.desc.en;
      return <Row key={a.id} art="s-tech"
        right={<button className="tbuy" disabled={locked || notEnough}
          onClick={() => act(g => {
            const r = doAdvocacy(g, a.id, worldYear(g));
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'wrongTier' ? t('v11.advocacyNeedTier')
              : r.reason || 'failed';
            return t('v11.advocacyDone', '', { action: labelLang(lang) });
          })}>{t('v11.advocacyBtn', '', { x: a.cost })}</button>}>
        <b>{labelLang(lang)} <span className="mini">{locked ? `(${t('v11.tier')} ${POWER_TIERS[reqIdx].label})` : ''}</span></b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* v11.4 — Election panel */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.electionTitle')}</h3>
    <Row art="t-rank">
      <b>{t('v11.electionInNation', '', { nation: s.nation })}</b>
      <span className="sub">
        {params ? `opponent strength ${params.opponentStrength} · randomness ±${params.randomness}% · term ${params.termLength}yr` : ''}
      </span>
      {electionResult && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.electionLastResult', '', {
            status: electionResult.status,
            year: electionResult.year,
            opp: electionResult.opponent,
            margin: electionResult.margin.toFixed(1),
          })}
        </span>
      )}
      <div className="trade" style={{ marginTop: 4 }}>
        <button className="tbuy" disabled={!canRunElection}
          onClick={() => act(g => {
            const r = runElection(g, undefined, botRows, worldYear(g));
            if (!r.ok) {
              return r.reason === 'wrongTier' ? t('v11.electionNeedTier')
                : r.reason === 'termActive' ? t('v11.electionTermActive')
                : r.reason === 'scrutinyTooHigh' ? t('v11.electionScrutinyHigh')
                : r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
                : r.reason || 'failed';
            }
            return r.result === 'won'
              ? t('v11.electionWon', '', { opp: r.opponent || '?', margin: (r.margin || 0).toFixed(1) })
              : t('v11.electionLost', '', { opp: r.opponent || '?', margin: Math.abs(r.margin || 0).toFixed(1) });
          })}>{t('v11.electionRun', '', { x: 80 })}</button>
      </div>
    </Row>

    {/* v11.4 — Alliances & Rivals */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.alliancesRivalsTitle')}</h3>
    {botRows.slice(0, 6).map(b => {
      const ally = s.power?.alliances?.find(a => a.bot === b.name);
      const rival = s.power?.rivals?.find(r => r.bot === b.name);
      return <Row key={b.name} art="j-mgr"
        right={<div className="trade">
          <button className="tbuy" disabled={(s.power?.influence || 0) < 20}
            onClick={() => act(g => {
              const r = offerAlliance(g, b.name);
              if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : 'failed';
              return t('v11.allianceDone', '', { bot: b.name });
            })}>{ally ? `+${t('v11.refresh')}` : t('v11.ally')}</button>
          <button className="tsell" onClick={() => act(g => {
            const r = breakWith(g, b.name);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence') : 'failed';
            return t('v11.rivalDone', '', { bot: b.name });
          })}>{t('v11.break')}</button>
        </div>}>
        <b>{b.name} <span className="mini">{b.nation} · {b.ind}</span></b>
        <span className="sub">
          {ally && <span className="up">alliance {ally.strength}</span>}
          {rival && <span className="down"> · rival {rival.hostility}</span>}
          {!ally && !rival && <span>{t('v11.neutral')}</span>}
        </span>
      </Row>;
    })}
  </>);
}

// ================= EMPIRE (v11.5) =================
// Entity tab: shows the player's current entity tier (conglomerate →
// autonomous → nation → empire → federation), thresholds for each,
// and the actions to step up (declare autonomy, court recognition,
// declare independence). Empires/federations are stubbed — v11.7 will
// wire star-system control + galactic geography.
function EntityTab({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  const tier = entityTierOf(s);
  const tierIdx = ENTITY_TIERS.findIndex(r => r.tier === tier);
  const next = nextEntityTier(s);
  const nw = netWorth(s);
  const inf = s.power?.influence || 0;
  const [pickedConst, setPickedConst] = useState<Constitution>('democratic');
  const [currency, setCurrency] = useState<string>('');
  const tierLabel = (l: Lang, idx: number) => {
    const r = ENTITY_TIERS[idx];
    return l === 'vi' ? r.label.vi : l === 'zh' ? r.label.zh : r.label.en;
  };
  // v11.18 — explanation key for each entity tier.
  const entityExplainKey: Record<string, string> = {
    'none': 'emp.explainConglomerate',
    'conglomerate': 'emp.explainConglomerate',
    'autonomous': 'emp.explainAutonomous',
    'nation': 'emp.explainNation',
    'empire': 'emp.explainEmpire',
    'federation': 'emp.explainFederation',
  };
  return (<>
    {/* Current tier + next-threshold hint */}
    <Row art="b-corp">
      <b>{t('v11.entityCurrentTier')} <span className={tier === 'none' ? 'down' : 'up'}>{tierLabel(lang, tierIdx)}</span></b>
      <span className="sub">
        {t('v11.entityNetWorth', '', { v: fmt(nw) })} · {t('v11.entityInfluence', '', { x: inf })}
      </span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {next
          ? t('v11.entityNextTier', '', { tier: next.tier, v: fmt(next.min), x: next.minInfluence })
          : t('v11.entityTopTier')}
      </span>
      {/* v11.23 — explanation: bullet list with icons (was dense prose) */}
      <div className="mini" style={{ display: 'block', marginTop: 6, padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
        <b style={{ opacity: .85, fontSize: '.78rem' }}>{t('emp.explainTitle')}</b>
        <ul className="explain-bullets">
          {t((entityExplainKey[tier] || 'emp.explainConglomerate') + '.bullets').split('||').map((b, i) => (
            <li key={i}><Ic id={i === 0 ? 'ic-check' : i === 1 ? 'ic-xp' : 'ic-star'} className="si bul-ic" /><span>{b}</span></li>
          ))}
        </ul>
      </div>
      {s.entity?.originNation && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.entityOrigin', '', { nation: s.entity.originNation })}
        </span>
      )}
      {s.entity?.currency && s.entity.currency !== 'USD' && (
        <span className="mini" style={{ display: 'block', marginTop: 2 }}>
          {t('v11.entityCurrency', '', { c: s.entity.currency, i: ((s.entity.inflation || 0) * 100).toFixed(1) })}
        </span>
      )}
    </Row>

    {/* Entity tiers ladder */}
    <h3 style={{ margin: '12px 0 4px' }}>{t('v11.entityLadderTitle')}</h3>
    {ENTITY_TIERS.map((r, i) => {
      const reached = i <= tierIdx;
      const labelLang = (l: Lang): string => l === 'vi' ? r.label.vi : l === 'zh' ? r.label.zh : r.label.en;
      const descLang = (l: Lang): string => l === 'vi' ? r.desc.vi : l === 'zh' ? r.desc.zh : r.desc.en;
      return <Row key={r.tier} art={reached ? 'b-corp' : 'ic-x'}
        right={<span className={reached ? 'up' : 'down'}>{reached ? '✓' : '—'}</span>}>
        <b>{labelLang(lang)} <span className="mini">({fmt(r.minNetWorth)} · {t('v11.tier')} inf {r.minInfluence}{r.extra ? ` · ${r.extra}` : ''})</span></b>
        <span className="sub">{descLang(lang)}</span>
      </Row>;
    })}

    {/* Declare autonomy — only available at conglomerate tier */}
    {tier === 'conglomerate' && (
      <Row art="b-corp"
        right={<button className="tbuy" disabled={nw < 50_000_000 || inf < 50}
          onClick={() => act(g => {
            const r = actDeclareAutonomy(g);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'noNetWorth' ? t('v11.entityNeedNetWorth', '', { v: fmt(50_000_000) })
              : r.reason || 'failed';
            return t('v11.entityAutonomyDone');
          })}>{t('v11.entityDeclareAutonomy')}</button>}>
        <b>{t('v11.entityDeclareAutonomy')}</b>
        <span className="sub">{t('v11.entityAutonomyBlurb', '', { v: fmt(50_000_000), x: 50 })}</span>
      </Row>
    )}

    {/* Court recognition — only at autonomous tier, costs 30 influence */}
    {tier === 'autonomous' && (
      <Row art="s-coin"
        right={<button className="tbuy" disabled={inf < 30 || (s.entity?.recognition || 0) >= 12}
          onClick={() => act(g => {
            const r = actCourtRecognition(g);
            if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
              : r.reason === 'maxRecognition' ? t('v11.entityMaxRecognition')
              : r.reason || 'failed';
            return t('v11.entityRecognitionDone', '', { x: s.entity?.recognition || 0 });
          })}>{t('v11.entityCourtRecognition')}</button>}>
        <b>{t('v11.entityCourtRecognition')} <span className="mini">({t('v11.entityRecognitionProgress', '', { cur: s.entity?.recognition || 0, need: 3 })})</span></b>
        <span className="sub">{t('v11.entityRecognitionBlurb', '', { x: 30 })}</span>
      </Row>
    )}

    {/* Declare independence — only at autonomous tier with ≥3 recognition */}
    {tier === 'autonomous' && (
      <>
        <h3 style={{ margin: '12px 0 4px' }}>{t('v11.entityIndependenceTitle')}</h3>
        {/* Constitution picker */}
        {CONSTITUTIONS.map(c => {
          const labelLang = (l: Lang): string => l === 'vi' ? c.label.vi : l === 'zh' ? c.label.zh : c.label.en;
          const descLang = (l: Lang): string => l === 'vi' ? c.desc.vi : l === 'zh' ? c.desc.zh : c.desc.en;
          const picked = pickedConst === c.id;
          return <Row key={c.id} art="b-corp"
            right={<input type="radio" checked={picked} onChange={() => setPickedConst(c.id)} aria-label={c.id} />}>
            <b>{labelLang(lang)} <span className="mini">biz ×{c.bizMult.toFixed(2)} · tax {(c.taxRate * 100).toFixed(0)}% · upkeep ×{c.militaryUpkeepMult.toFixed(2)}</span></b>
            <span className="sub">{descLang(lang)}</span>
          </Row>;
        })}
        {/* Currency input */}
        <Row art="s-coin">
          <b>{t('v11.entityCurrencyLabel')}</b>
          <input className="qty" type="text" maxLength={3} value={currency} placeholder="NEW"
            onChange={e => setCurrency(e.target.value.toUpperCase().slice(0, 3))} aria-label="currency" />
          <span className="sub">{t('v11.entityCurrencyBlurb')}</span>
        </Row>
        {/* Declare button */}
        <Row art="b-corp"
          right={<button className="tbuy" disabled={inf < 200 || nw < 500_000_000 || (s.entity?.recognition || 0) < 3}
            onClick={() => act(g => {
              const r = actDeclareIndependence(g, pickedConst, currency || 'NEW');
              if (!r.ok) return r.reason === 'noInfluence' ? t('v11.advocacyNeedInfluence')
                : r.reason === 'noNetWorth' ? t('v11.entityNeedNetWorth', '', { v: fmt(500_000_000) })
                : r.reason === 'noRecognition' ? t('v11.entityNeedRecognition')
                : r.reason || 'failed';
              return t('v11.entityIndependenceDone', '', { c: currency || 'NEW' });
            })}>{t('v11.entityDeclareIndependence')}</button>}>
          <b>{t('v11.entityDeclareIndependence')}</b>
          <span className="sub">{t('v11.entityIndependenceBlurb', '', { v: fmt(500_000_000), x: 200, rec: 3 })}</span>
        </Row>
      </>
    )}

    {/* Constitution display (only at nation+ tier) */}
    {(tier === 'nation' || tier === 'empire' || tier === 'federation') && s.entity?.constitution && (
      <Row art="b-corp">
        <b>{t('v11.entityConstitutionActive')} <span className="up">
          {(() => {
            const c = constitutionById(s.entity.constitution!);
            return lang === 'vi' ? c.label.vi : lang === 'zh' ? c.label.zh : c.label.en;
          })()}
        </span></b>
        <span className="sub">
          {(() => {
            const c = constitutionById(s.entity.constitution!);
            return lang === 'vi' ? c.desc.vi : lang === 'zh' ? c.desc.zh : c.desc.en;
          })()}
        </span>
      </Row>
    )}

    {/* v11.5 stub: empire + federation tiers gated behind v11.7 */}
    {(tier === 'nation') && (
      <p className="sub">{t('v11.entityStubEmpire')}</p>
    )}
    {(tier === 'empire' || tier === 'federation') && (
      <p className="sub">{t('v11.entityStubGalaxy')}</p>
    )}
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
function Intro({ onBegin }: { onBegin: (o: { name: string; byear: number; nation: string; religion: Religion; ints: string[]; tals: string[]; gender: Gender; birthMonth: number; birthDay: number }) => void }) {
  const { t, lang, setLang } = useT();
  const [name, setName] = useState('');
  const [byear, setByear] = useState(1992);
  const [nation, setNation] = useState('Vietnam');
  const [religion, setReligion] = useState<Religion>('none');
  const [ints, setInts] = useState<string[]>([]);
  const [tals, setTals] = useState<string[]>([]);
  // v11.6 — gender + birth month → zodiac + tarot/spirit affinity
  const [gender, setGender] = useState<Gender>('nonbinary');
  const [birthMonth, setBirthMonth] = useState<number>(1);
  // v11.19 — birth day (1–31). Stored on GameState as birthDay (default 15).
  // Used by the Spirit tab panels (Tử Vi / Phong Thuỷ) that previously
  // defaulted to day=15; now the player picks it once at character creation.
  const [birthDay, setBirthDay] = useState<number>(15);
  // v11 — two-step flow: 'edit' (fill fields) → 'review' (summary + confirm)
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  // v11.10 — mandatory legal disclaimer acknowledgment. The "Begin my life"
  // button stays disabled until the player ticks this box (per version: the
  // intro only shows for a new life, so this is the natural consent gate).
  const [ack, setAck] = useState(false);
  const years: number[] = [];
  const nowY = new Date().getUTCFullYear();
  for (let y = nowY - 126; y <= nowY - 18; y++) years.push(y);
  const a = analyze(ints, tals);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string, max: number) => {
    const i = arr.indexOf(id);
    if (i > -1) set(arr.filter(x => x !== id));
    else if (arr.length < max) set([...arr, id]);
  };
  // v11.6 — zodiac derived from birthMonth + birthDay (v11.19: was mid-month=15).
  const zodiac = zodiacOf(birthMonth, birthDay);
  const zodiacDef = zodiacById(zodiac);
  // v11 — random character generator. Picks a name from the nation's pool,
  // a birth year weighted toward the modern era (1960-now-18), random
  // religion, 1-3 interests, 1-2 talents.
  const randomise = () => {
    const nat = NATIONS[Math.floor(Math.random() * NATIONS.length)];
    const pool = NAME_POOLS[nat] || ['Alex'];
    const nm = pool[Math.floor(Math.random() * pool.length)];
    const yMin = 1960, yMax = nowY - 18;
    const yr = yMin + Math.floor(Math.random() * (yMax - yMin + 1));
    const rel = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
    const genders: Gender[] = ['male', 'female', 'nonbinary'];
    const g = genders[Math.floor(Math.random() * genders.length)];
    const bm = 1 + Math.floor(Math.random() * 12);
    const shuffledInts = [...INTERESTS].sort(() => Math.random() - 0.5);
    const ni = 1 + Math.floor(Math.random() * 3);
    const newInts = shuffledInts.slice(0, ni).map(i => i.id);
    const shuffledTals = [...TALENTS].sort(() => Math.random() - 0.5);
    const nt = 1 + Math.floor(Math.random() * 2);
    const newTals = shuffledTals.slice(0, nt).map(i => i.id);
    setName(nm); setByear(yr); setNation(nat); setReligion(rel);
    setGender(g); setBirthMonth(bm); setBirthDay(1 + Math.floor(Math.random() * 28));
    setInts(newInts); setTals(newTals); setStep('edit');
  };
  const startEra = eraOf(byear + 18);
  const startingCash = ints.includes('money') ? 5000 : 0;
  // v11.6 — pre-game suggestion combines zodiac affinity + historical era.
  // Built from the zodiacIntroSuggestion helper (translated per lang).
  const zodiacSuggestion = zodiacIntroSuggestion(zodiac, t('era.' + startEra.from, startEra.name), byear + 18, lang);
  // v11 — first-step suggestion card. Based on interests/talents, suggest
  // the highest-leverage opening move.
  const suggestion = (() => {
    if (ints.includes('money') && tals.includes('math')) return t('v11.suggest.moneyMath');
    if (a.top === 'business') return t('v11.suggest.business');
    if (a.top === 'engineering') return t('v11.suggest.engineering');
    if (a.top === 'medicine') return t('v11.suggest.medicine');
    if (a.top === 'arts') return t('v11.suggest.arts');
    if (a.top === 'science') return t('v11.suggest.science');
    return t('v11.suggest.default');
  })();
  return (
    <div className="modal on"><div className="mcard" style={{ maxWidth: 560 }}>
      <h2>{t('createLife')}</h2>
      <p className="mini" style={{ marginTop: 0 }}>{t('introSub')}</p>
      {/* v11.10 — legal disclaimer, visible from the first screen of the intro.
          v11.19 — wider container + line-height so the (long VI) text doesn't
          render as a tall narrow column of single characters on small screens. */}
      <p className="mini" style={{ margin: '6px 0 0', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, opacity: .9, lineHeight: 1.5, wordBreak: 'normal', overflowWrap: 'anywhere' }}>
        ⚠️ {t('disc.short')}
      </p>
      {step === 'edit' ? (
        <>
          <div className="trade" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="lang" role="group" aria-label="Language">
              {LANGS.map(l => <button key={l.id} type="button" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
            </div>
            <button className="ibtn ghost" onClick={randomise}><Ic id="ic-star" className="bsi" /><span>{t('v11.random')}</span></button>
          </div>
          <div className="field"><label>{t('name')}</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>{t('birthYear')}</label>
            <select value={byear} onChange={e => setByear(+e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          {/* v11.6 — gender + birth month */}
          <div className="field"><label>{t('v11.gender')}</label>
            <select value={gender} onChange={e => setGender(e.target.value as Gender)}>
              <option value="nonbinary">{t('v11.genderNonbinary')}</option>
              <option value="female">{t('v11.genderFemale')}</option>
              <option value="male">{t('v11.genderMale')}</option>
            </select></div>
          {/* v11.19 — birth month + birth day side-by-side. Day feeds the
              Spirit tab panels (Tử Vi / Phong Thuỷ) that previously defaulted
              to day=15; now the player picks it once at character creation. */}
          <div className="trade" style={{ gap: 8 }}>
            <div className="field" style={{ flex: 1 }}><label>{t('v11.birthMonth')}</label>
              <select value={birthMonth} onChange={e => setBirthMonth(+e.target.value)}>
                {MONTHS_NAMES.map((m, i) => <option key={i} value={i + 1}>{m} ({zodiacOf(i + 1, birthDay)})</option>)}
              </select></div>
            <div className="field" style={{ flex: '0 0 110px' }}><label>{t('v11.birthDay')}</label>
              <select value={birthDay} onChange={e => setBirthDay(+e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
          </div>
          {/* v11.6 — zodiac preview (now uses the picked day instead of mid-month) */}
          <div className="preview" style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
            <b>{zodiacDef.symbol} {zodiac}</b>
            <span className="sub" style={{ marginLeft: 6 }}>
              {lang === 'vi' ? zodiacDef.trait.vi : lang === 'zh' ? zodiacDef.trait.zh : zodiacDef.trait.en}
              {' · '}
              {t('v11.zodiacAffinity')}: {zodiacDef.affinity}
            </span>
            <div className="mini" style={{ marginTop: 2 }}>
              {lang === 'vi' ? zodiacDef.blurb.vi : lang === 'zh' ? zodiacDef.blurb.zh : zodiacDef.blurb.en}
            </div>
          </div>
          <div className="field"><label>{t('country')}</label>
            <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{t('nat.' + n, n)}</option>)}</select></div>
          <div className="field"><label>{t('religion')}</label>
            <select value={religion} onChange={e => setReligion(e.target.value as Religion)}>
              {RELIGIONS.map(option => <option key={option} value={option}>{t('religion.' + option)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('interests')} ({ints.length}/3)</label>
            <div className="chips">{INTERESTS.map(i => (
              <button key={i.id} className={'chip' + (ints.includes(i.id) ? ' on' : '')} onClick={() => toggle(ints, setInts, i.id, 3)}><Art id={i.art} className="ca" />{t('int.' + i.id, i.label)}</button>
            ))}</div></div>
          <div className="field"><label>{t('talents')} ({tals.length}/2)</label>
            <div className="chips">{TALENTS.map(tl => (
              <button key={tl.id} className={'chip' + (tals.includes(tl.id) ? ' on' : '')} onClick={() => toggle(tals, setTals, tl.id, 2)}><Art id={tl.art} className="ca" />{t('tal.' + tl.id, tl.label)}</button>
            ))}</div></div>
          {/* v11 — real-time preview */}
          <div className="preview">
            <p><b>{t('youTurn18', '', { y: byear + 18, era: t('era.' + startEra.from, startEra.name) })}</b></p>
            {a.top
              ? <><p><b>{t('strongest')}:</b> {t('field.' + a.top, FIELDS[a.top].name)}{a.second ? ' · ' + t('backup') + ': ' + t('field.' + a.second, FIELDS[a.second].name) : ''}</p>
                <p><b>{t('suggested')}:</b> {PATHS[a.top].jobs}</p>
                <div>{a.perks.map(p => <span key={p} className="perk">{p}</span>)}</div></>
              : <p className="mini">{t('pickHint')}</p>}
            {startingCash > 0 && <p className="mini" style={{ marginTop: 6 }}><b>{t('v11.startingCash')}</b>: {fmt(startingCash)}</p>}
          </div>
          <button className="ibtn" style={{ width: '100%' }} disabled={!name.trim()} onClick={() => setStep('review')}>
            <Ic id="ic-check" className="bsi" /><span>{t('v11.review')}</span>
          </button>
        </>
      ) : (
        // v11 — review + confirm step
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 8px' }}>{t('v11.reviewTitle')}</h3>
            <div className="lb"><span>{t('name')}</span><b>{name}</b></div>
            <div className="lb"><span>{t('v11.gender')}</span><b>{t('v11.gender' + gender.charAt(0).toUpperCase() + gender.slice(1))}</b></div>
            <div className="lb"><span>{t('birthYear')}</span><b>{byear} → {t('age')} 18 in {byear + 18}</b></div>
            <div className="lb"><span>{t('v11.birthMonth')}</span><b>{MONTHS_NAMES[birthMonth - 1]} · {zodiacDef.symbol} {zodiac}</b></div>
            <div className="lb"><span>{t('country')}</span><b>{t('nat.' + nation, nation)}</b></div>
            <div className="lb"><span>{t('religion')}</span><b>{t('religion.' + religion)}</b></div>
            <div className="lb"><span>{t('interests')}</span><b>{ints.map(i => t('int.' + i, i)).join(', ') || '—'}</b></div>
            <div className="lb"><span>{t('talents')}</span><b>{tals.map(tl => t('tal.' + tl, tl)).join(', ') || '—'}</b></div>
            <div className="lb"><span>{t('era')}</span><b>{t('era.' + startEra.from, startEra.name)}</b></div>
            {a.top && <div className="lb"><span>{t('strongest')}</span><b>{t('field.' + a.top, FIELDS[a.top].name)}</b></div>}
            {startingCash > 0 && <div className="lb"><span>{t('v11.startingCash')}</span><b>{fmt(startingCash)}</b></div>}
          </div>
          {/* v11.6 — zodiac + era suggestion card (the "most important"
              hint that combines astrological affinity + historical era) */}
          <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.zodiacEraHint')}</div>
            <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{zodiacSuggestion.zodiacLine}</p>
            <p className="mini" style={{ margin: '4px 0 0' }}>{zodiacSuggestion.eraLine}</p>
          </div>
          {/* v11 — first-step suggestion card */}
          <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.firstStep')}</div>
            <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{suggestion}</p>
          </div>
          {/* v11.10 — mandatory disclaimer acknowledgment before starting a life */}
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', margin: '4px 0 12px', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, cursor: 'pointer', textAlign: 'left' }}>
            <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} style={{ marginTop: 3, flexShrink: 0 }} />
            <span className="mini"><b>{t('disc.title')}.</b> {t('disc.ack')}</span>
          </label>
          <div className="trade">
            <button className="ibtn ghost" onClick={() => setStep('edit')}><Ic id="ic-x" className="bsi" /><span>{t('v11.back')}</span></button>
            {/* v11.10 — Begin stays disabled until the disclaimer is acknowledged */}
            <button className="ibtn" style={{ flex: 1 }} disabled={!ack} onClick={() => onBegin({ name: name || 'Alex', byear, nation, religion, ints, tals, gender, birthMonth, birthDay })}>
              <Ic id="ic-plus" className="bsi" /><span>{t('begin')}</span>
            </button>
          </div>
        </>
      )}
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
            // v11.9 — risk word REMOVED from the button label (user request: the
            // "(Balanced 50/50)" suffix is noise). The legend below the choices
            // keeps explaining the colour code, and each choice now gets its own
            // small danger/benefit hint line underneath.
            const gains: string[] = [];
            const dangers: string[] = [];
            if (cc.money && cc.money > 0) gains.push('+' + fmt(cc.money));
            if (cc.fame && cc.fame > 0) gains.push(`+${cc.fame} ${t('hint.fameWord')}`);
            if (cost > 0) dangers.push(`${t('hint.pay')} ${fmt(cost)}`);
            if (cc.money && cc.money < 0) dangers.push(`${t('hint.loseUpTo')} ${fmt(-cc.money)}`);
            if (cc.fame && cc.fame < 0) dangers.push(`${cc.fame} ${t('hint.fameWord')}`);
            if (cc.decline && cc.decline > 0) dangers.push(`-${cc.decline} ${t('hint.hp')}`);
            const quality = risk === 'safe' ? t('hint.safe') : risk === 'medium' ? t('hint.medium') : t('hint.high');
            if (!gains.length && !dangers.length) dangers.push(t('hint.noCost'));
            const hint = `${t('hint.label')}: ${quality}`
              + (gains.length ? ` · ${t('hint.gain')}: ${gains.join(', ')}` : '')
              + (dangers.length ? ` · ${t('hint.danger')}: ${dangers.join(', ')}` : '');
            return (
              <div key={i}>
                <Btn ic={['ic-check', 'ic-up', 'ic-plus'][risk === 'safe' ? 0 : risk === 'medium' ? 2 : 1]}
                  kind={risk === 'safe' ? 'sageb' : risk === 'high' ? 'danger' : ''}
                  dp={{ 'data-risk': risk } as Record<string, string>}
                  label={c.l + (cost ? ' · ' + fmt(cost) : '') + (extra.length ? ` (${extra.join(' · ')})` : '')}
                  disabled={cost > s.money && anyOk}
                  onClick={() => act(st => isAI ? applyAIChoice(st, i) : applyEventChoice(st, i))} />
                <p className="mini" style={{ margin: '2px 0 0 6px', opacity: .8 }}>{hint}</p>
              </div>
            );
          });
        })()}
      </div>
      <p className="mini" style={{ marginTop: 12 }}>
        <span className="risk-dot" data-risk="safe" />{t('risk.safe')} ·
        <span className="risk-dot" data-risk="medium" />{t('risk.medium')} ·
        <span className="risk-dot" data-risk="high" />{t('risk.high')}
      </p>
      {/* v11.10 — disclaimer inside the event modal (covers AI prophecies too) */}
      <p className="mini" style={{ margin: '6px 0 0', opacity: .7 }}>{t('disc.aiNote')}</p>
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
      {/* v11.10 — disclaimer on the game-over screen as well */}
      <p className="mini" style={{ margin: '10px 0 0', opacity: .65 }}>{t('disc.short')}</p>
      <button className="ibtn" style={{ marginTop: 12 }} onClick={onAgain}>
        <Ic id="ic-plus" className="bsi" /><span>{t('liveAgain')}</span>
      </button>
    </div></div>
  );
}
