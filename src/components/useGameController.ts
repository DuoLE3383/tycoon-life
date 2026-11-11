'use client';

import { type AdminAction, type AIEvent, type AIEventKind, applyAdminActions, applyOffline, asset, bump, BUNDLED_VERSION, checkAch, eraOf, type GameState, getState, GROUPS, ITEM_BY, ITEM_IMAGES, type ItemDef, localTwist, persist, pickKind, type Rarity, recordActivity, registerItem, SEEN_KEY, snapshot, stageOf, STAGES, tick, useCallback, useCommunity, useEffect, useGame, useRef, useState, useT, VERSION_POLL_MS } from '@/components/gameDeps';


export function useGameController() {

  const { s } = useGame();

  const { t, lang } = useT();

  const [tab, setTab] = useState('home');

  const [lastTab, setLastTab] = useState<Record<string, string>>({});

  const activeGroup = GROUPS.find(group => group[3].some(([key]) => key === tab))?.[0] || 'life';

  const curSubs = (GROUPS.find(group => group[0] === activeGroup) || GROUPS[0])[3];

  const [rankBoard, setRankBoard] = useState<'all' | 'young' | 'industry' | 'nation'>('all');

  const [curCat, setCurCat] = useState<string | null>(null);

  // v11.36 — edit-profile modal state. Opened from PinZone ✏️ button.
  const [editingProfile, setEditingProfile] = useState(false);

  // v12.13 — mobile-first PinZone collapse. Defaults to collapsed on mobile
  // (so the dashboard doesn't eat the screen); the expand toggle in the
  // PinZone identity row reveals the warning banner + charts + age track.
  // On desktop this state has NO visual effect (the .pinzone-collapsed class
  // only hides elements inside @media max-width:700px) — desktop stays full.
  const [pzExpanded, setPzExpanded] = useState(false);

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

  // v11 — version banner state. 'whatsNew' shows the what's-new modal once
  // per player per PATCH (localStorage flag keyed by version). 'reload' shows
  // when /version.json reports a newer version than the bundled one.
  const [whatsNew, setWhatsNew] = useState(false);

  // v11.44 — dynamic content from version.json (headline + features array).
  const [whatsNewContent, setWhatsNewContent] = useState<{ headline: string; features: string[] } | null>(null);

  const [reloadPrompt, setReloadPrompt] = useState<{ version: string; headline: string } | null>(null);

  // v11.57 — time acceleration: x1 / x10 / x50 when playing online. Multiplies
  // the elapsed real-time before passing to tick(), so at x10 each real second
  // = 10 game-seconds, at x50 = 50 game-seconds. Default x1.
  const [speed, setSpeed] = useState<1 | 10 | 50>(1);

  // Ref mirror so the game-loop useEffect (which captures `speed` at mount)
  // always reads the current value without re-creating the interval.
  const speedRef = useRef(speed);

  useEffect(() => { speedRef.current = speed; }, [speed]);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  // v11.44 — Show the "what's new" modal on first load if not seen yet.
  // Also fetch version.json to get the current patch's headline + features
  // so the modal shows fresh content (not the stale static v11 list).
  useEffect(() => {
    let seen = false;
    try { seen = !!localStorage.getItem(SEEN_KEY); } catch { /* ignore */ }
    if (!seen) {
      setWhatsNew(true);
      // Fetch the dynamic content from version.json
      fetch(asset('/version.json'), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then((j: { headline?: string; features?: string[] } | null) => {
          if (j?.headline && j?.features) setWhatsNewContent({ headline: j.headline, features: j.features });
        })
        .catch(() => { /* ignore — modal will fall back to static content */ });
    }
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


  // v15 — fetch /api/items on mount + every 5 minutes so admin edits to the
  // SQLite `items` table (price changes, new items, retired stock) are
  // visible to players without a full page reload. Each DB row is merged
  // into the runtime ITEMS pool via registerItem(); admin-edited prices /
  // rarities overwrite the static JSON entry by removing + re-pushing the
  // updated ItemDef. Used-market rows from the DB are merged into
  // USED_MARKET_BY so the used-market tab surfaces admin-created listings.
  // The static JSON stays the source of truth for SSR / tests / offline
  // play — this overlay only runs in the browser.
  useEffect(() => {
    if (typeof fetch === 'undefined') return;
    let cancelled = false;
    const merge = (rows: Array<Record<string, unknown>>) => {
      if (!Array.isArray(rows) || !rows.length) return;
      for (const r of rows) {
        const id = typeof r.id === 'string' ? r.id : '';
        if (!id) continue;
        const def: ItemDef = {
          id,
          name: typeof r.name === 'string' ? r.name : id,
          cat: typeof r.cat === 'string' ? r.cat : 'Custom',
          brand: typeof r.brand === 'string' ? r.brand : undefined,
          c: typeof r.c === 'string' ? r.c : '#888888',
          price: Number.isFinite(Number(r.price)) ? Number(r.price) : 1000,
          lux: Number.isFinite(Number(r.lux)) ? Math.round(Number(r.lux)) : 1,
          rate: Number.isFinite(Number(r.rate)) ? Number(r.rate) : 0,
          art: typeof r.art === 'string' ? r.art : 'ic-bag',
          rarity: typeof r.rarity === 'string' ? (r.rarity as Rarity) : undefined,
          stock: r.stock == null ? undefined : Math.round(Number(r.stock)) || undefined,
        };
        // v15 — registerItem() is a no-op when the id already exists, but
        // admin edits need to OVERWRITE the existing entry. We mutate
        // ITEM_BY + ITEMS in place so the engine picks up the new price /
        // rarity immediately (engine.ts reads ITEM_BY synchronously at
        // module load; mutating the shared object is the only way to
        // propagate changes without a reload).
        if (ITEM_BY[id]) {
          Object.assign(ITEM_BY[id], def);
        } else {
          registerItem(def);
        }
        if (typeof r.imageUrl === 'string' && r.imageUrl) ITEM_IMAGES[id] = r.imageUrl;
      }
    };
    const fetchItems = async () => {
      try {
        const base = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) || '';
        const res = await fetch(base + '/api/items', { cache: 'no-store' });
        if (!res.ok) return;
        const j = (await res.json()) as { items?: Array<Record<string, unknown>> };
        if (cancelled) return;
        if (j.items && Array.isArray(j.items)) merge(j.items);
      } catch { /* ignore — offline / static export */ }
    };
    fetchItems();
    const iv = setInterval(fetchItems, VERSION_POLL_MS);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);


  const dismissWhatsNew = useCallback(() => {
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
    setWhatsNew(false);
  }, []);


  // v12 — modal-overlap fix. When ANY modal/popup is in the DOM (modal-overlay,
  // .modal.on, or .nav-popup-menu), toggle a `.has-modal` class on the .tgame
  // root. The CSS uses this to shift the toast (#ttoast) from top-right →
  // bottom-right so it stops covering the modal-x close button — the actual
  // "popup bị đè" complaint. A MutationObserver catches every modal including
  // the internal GigsPopup / MoreInfoPopup / BizOffer popups whose open state
  // lives inside their own components (so we can't read it from here directly).
  // Polling querySelector on each subtree mutation is cheap (one DOM read).
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.querySelector('.tgame');
    if (!root) return;
    const sync = () => {
      const open = !!document.querySelector('.modal-overlay, .modal.on, .nav-popup-menu');
      root.classList.toggle('has-modal', open);
    };
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true, subtree: true });
    return () => { obs.disconnect(); root.classList.remove('has-modal'); };
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
    // v11.50 — increased duration: 4.5s min, 12s max (was 3.5s/8s). Per-char
    // weight dropped slightly so short toasts still feel snappy but milestone
    // + AI-event toasts get enough screen time to actually be read.
    const dur = Math.min(12000, Math.max(4500, msg.length * 50));
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
    // v11.50 — match the new 4.5-12s duration above.
    const dur = Math.min(12000, Math.max(4500, next.msg.length * 50));
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
      const off = applyOffline(st0, Math.random, t);
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
      // v11.57 — apply speed multiplier to the elapsed time. At x10, each
      // real second advances 10 game-seconds; at x50, 50. This lets players
      // fast-forward through calm periods (studying, waiting for a degree).
      const elapsed = (now - last) * speedRef.current;
      const res = tick(st, elapsed, Math.random, t);
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
          const off = applyOffline(st, Math.random, t);
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


  // v14 — admin action queue polling. Every 60s, GET /api/social/ping?uid=xxx
  // returns the player's pending ADMIN_ACTION rows (banking / business /
  // gigs / player-stat tweaks). We apply each via applyAdminActions(), show
  // a toast per applied action, persist the updated state, and ack each row
  // so the next poll doesn't re-deliver it. Only runs once the player has
  // begun (s.uid is set + s.started is true); on the static GitHub Pages
  // build the fetch fails silently — the demo backend has no admin queue.
  // The poll skips while the tab is hidden (saves a request when the player
  // isn't looking) and re-runs immediately on visibility regain.
  useEffect(() => {
    const ADMIN_POLL_MS = 60_000;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const base = (process.env.NEXT_PUBLIC_BASE_PATH || '');
    const poll = async () => {
      if (!alive) return;
      const st0 = getState();
      // Only poll when the player has started AND has a uid (don't poll the
      // intro screen — s.uid is '' until begin() runs).
      if (!st0.started || !st0.uid) return;
      if (document.hidden) return; // skip while the tab is hidden
      try {
        const url = base + '/api/social/ping?uid=' + encodeURIComponent(st0.uid);
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) return;
        const j = await res.json() as { actions?: Array<{ id: string; action: string; payload: Record<string, unknown>; ts: number }> };
        if (!j.actions || !j.actions.length) return;
        // Build AdminAction[] the engine can consume. The payload already
        // carries uid (for player actions) so applyAdminActions' uid-match
        // guard works correctly.
        const actions: AdminAction[] = j.actions.map(a => ({
          action: a.action,
          ...(a.payload || {}),
        }));
        const st = getState();
        const results = applyAdminActions(st, actions);
        // Persist + bump so the UI reflects the mutation immediately.
        persist(); bump();
        // Toast each result so the player sees what the admin did.
        results.forEach((msg, i) => setTimeout(() => showToast('⚙️ Admin: ' + msg), i * 600));
        // Ack each row so it doesn't re-deliver. Acks are best-effort — if
        // the POST fails, the next poll will simply re-apply (the engine's
        // mutators are idempotent for set* actions; grant/remove/franchise
        // would double-apply, but the ack is fire-and-forget and usually
        // succeeds).
        for (const a of j.actions) {
          try {
            await fetch(base + '/api/social/ping', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: st.uid, ackId: Number(a.id) }),
              cache: 'no-store',
            });
          } catch { /* ignore — next poll will retry */ }
        }
      } catch { /* offline — next sweep retries */ }
    };
    // v14 — first poll 6s after boot (gives the social backend time to init),
    // then every 60s thereafter.
    timer = setTimeout(poll, 6000);
    const iv = setInterval(poll, ADMIN_POLL_MS);
    const onVis = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      clearInterval(iv);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [showToast]);


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
  }, [lang]);


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

  return { act, activeGroup, aiBusy, aiNoteKey, askAI, comm, curCat, curSubs, dismissWhatsNew, editingProfile, eraName, lastTab, pzExpanded, qtyMap, rankBoard, reloadPrompt, s, setCurCat, setEditingProfile, setLastTab, setPzExpanded, setQtyMap, setRankBoard, setReloadPrompt, setSpeed, setTab, showToast, speed, t, tab, toast, whatsNew, whatsNewContent };
}
