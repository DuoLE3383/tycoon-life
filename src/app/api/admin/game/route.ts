// v11.39 — admin game-control endpoint.
// POST /api/admin/game { key, action, uid, ... }
//   action='grantItem' { uid, itemId }   → grants an item to a player's save
//   action='setMoney'  { uid, amount }   → sets player cash
//   action='setFame'   { uid, amount }   → sets player fame
//   action='setHealth' { uid, amount }   → sets player health
//   action='setSpirit' { uid, amount }   → sets player spirit
//   action='setLevel'  { uid, level }    → sets player level
//   action='triggerElection' { uid }     → forces next yearEnd to run election
//   action='advanceTime' { uid, days }   → advances player's game time
//   action='createItem' { name, cat, price, imageUrl, brand?, rarity?, stock? } → creates custom item
//   action='updateItem' { id, name?, cat?, price?, imageUrl?, brand?, rarity?, stock? } → updates a custom item (v12.2)
//   action='setDifficulty' { uid, level: 'easy'|'normal'|'hard' } → AI event difficulty (v12.2)
//
// v12.1 — fixed 500 error: db() was called at the TOP of POST (line 47) before
// any action check. If SQLite init failed (permissions, missing data/ dir,
// better-sqlite3 native module issue), EVERY request 500'd — including
// createItem which doesn't even need the player DB. Now db() is called lazily
// ONLY inside the branches that need it, and createItem has an in-memory
// fallback if SQLite is unavailable.
// v12.2 — updateItem + setDifficulty added. updateItem patches the
// custom_items row by id (or the matching in-memory entry) and reuses the
// same SQLite-or-fallback path as createItem. setDifficulty is an audit-log
// action that records the operator's chosen AI difficulty for a player; the
// engine applies it via GameState.aiDifficulty (defaults to 'normal').
// v13.2 — createItem/updateItem now accept + store `rarity` (TEXT) and
// `stock` (INTEGER NULLABLE). custom_items table gains a stock column via
// ALTER TABLE on read so existing installs upgrade transparently. Mythic
// items MUST carry a 1-10 stock; the patch rejects bad stock values.
// v14 — banking / business / gigs actions added (setSavings, setLoan,
// adjustLoan, grantBranch, removeBranch, setBizMood, franchiseAll,
// setGigPay, setGigCd, resetGigs). ALL player-mutation actions now record
// an ADMIN_ACTION row in the new `admin_actions` table instead of returning
// 501 — the client polls /api/social/ping?uid=xxx every 60s, picks up its
// pending actions, applies them via applyAdminActions(), and acks each one.
// Gig-config actions (setGigPay, setGigCd, resetGigs) target the broadcast
// sentinel so EVERY player applies them (overrides live on GameState, so
// gig pay / cd stay consistent across the community).
// v14.1 — stock catalogue actions added (createStock, editStock, deleteStock,
// resetStocks). All four target the broadcast sentinel — every player's
// GameState.stockOverrides / customStocks stays in sync so the market is
// identical across the community. createStock adds a brand-new ticker,
// editStock patches a built-in (override) or custom (direct mutate),
// deleteStock removes a custom ticker (refunding any holdings), and
// resetStocks clears overrides + customs + reseeds built-in prices.
import { NextResponse } from 'next/server';
import { adminGuard, readBody } from '@/lib/server/adminAuth';
import { ITEMS, RARE_ITEMS, BIZ, GIGS } from '@/lib/gameData';
import type { Rarity } from '@/lib/gameData';
import { getPlayerByCode, insertAdminAction, ADMIN_BROADCAST_UID, listAllItems, getItem, upsertItem, deleteItem } from '@/lib/server/socialDb';

// Lazy SQLite loader — returns null if better-sqlite3 or the DB file can't
// be initialised (permissions, missing data/ dir, native module issue).
type DbPrepared = { run: (...args: unknown[]) => { changes: number; lastInsertRowid: number | bigint }; get: (...args: unknown[]) => unknown; all: (...args: unknown[]) => unknown[] };
async function tryDb(): Promise<{ exec: (sql: string) => void; prepare: (sql: string) => DbPrepared } | null> {
  try {
    const { db } = await import('@/lib/server/socialDb');
    return db() as unknown as { exec: (sql: string) => void; prepare: (sql: string) => DbPrepared };
  } catch (e) {
    console.error('[admin/game] SQLite unavailable:', e instanceof Error ? e.message : e);
    return null;
  }
}

// v15 — ensureStockColumn() helper previously ALTERed the custom_items table
// for the stock column. The new unified `items` table (created in socialDb's
// db()) ships with stock + every other column from the start, so the helper
// is no longer needed. Kept here as a no-op for any external caller — removed
// from the createItem / updateItem code paths above.

// v13.2 — the rarity tiers the API accepts. Matches the Rarity type in
// gameData.ts so admin-created items flow through itemRarity() untouched.
const VALID_RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'legendary', 'mythic'];

// v14 — set of action names that mutate the player's GameState. These are
// recorded as ADMIN_ACTION rows in the admin_actions table; the targeted
// player's client polls /api/social/ping?uid=xxx, picks up its pending
// actions, applies each via applyAdminActions(), and acks the row.
const PLAYER_ACTIONS = new Set([
  'grantItem', 'setMoney', 'setFame', 'setHealth', 'setSpirit', 'setLevel',
  'triggerElection', 'advanceTime', 'setDifficulty',
  // v14 — banking
  'setSavings', 'setLoan', 'adjustLoan',
  // v14 — business
  'grantBranch', 'removeBranch', 'setBizMood', 'franchiseAll',
]);
// v14 — gig-config actions broadcast to every player (overrides live on
// GameState.gigOverrides; consistency across the community matters).
// v14.1 — stock catalogue actions broadcast the same way: every player
// applies them so the market stays consistent.
const BROADCAST_ACTIONS = new Set([
  'setGigPay', 'setGigCd', 'resetGigs',
  'createStock', 'editStock', 'deleteStock', 'resetStocks',
]);

// v14 — resolve the target uid from the admin's input. Accepts either a
// player's server-side uid (uid-xxx) directly or their HB-code (HB-XXXXXX)
// which is resolved to a uid via the players table. Returns null if the
// input is empty / malformed / unrecognised. Always returns a non-broadcast
// uid (broadcast actions skip this resolver entirely).
async function resolveTargetUid(raw: unknown): Promise<string | null> {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  // v14 — HB-code form? resolve via the players table.
  if (/^HB-[A-HJ-NP-Z2-9]{6}$/.test(s)) {
    const d = await tryDb();
    if (!d) return null;
    const p = getPlayerByCode(s);
    return p && p.id ? p.id : null;
  }
  // v14 — otherwise treat as a uid and accept verbatim. The polling client
  // filters by its own s.uid, so a bogus uid simply never gets delivered.
  // We DO require it to look like a uid (alphanumeric, 6-64 chars) to keep
  // the audit log readable + reject obvious garbage.
  if (/^[A-Za-z0-9_-]{6,64}$/.test(s)) return s;
  return null;
}

// v14 — clamp a number into a safe range; NaN/Infinity → 0. Used by every
// numeric admin action so the recorded payload is always finite.
function clampNum(v: unknown, lo: number, hi: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(lo, Math.min(hi, n));
}

// v12.2 — normalise + clamp a custom-item patch shared by createItem and
// updateItem. Returns null when the patch has no valid URL (URL is required
// for custom items since they have no built-in art fallback).
// v13.2 — adds rarity + stock normalisation. Mythic items MUST carry a
// 1-10 stock (enforced by the form on the client; the API double-checks).
// v15 — extended to also normalise the used-market fields (baseId, ageYears,
// condition, askPrice, newPrice, story, since, isUsed) so admin-created used
// listings can be persisted into the same `items` table.
interface ItemPatch {
  name: string;
  cat: string;
  price: number;
  imageUrl: string;
  brand: string;
  rarity: Rarity;
  stock: number | null;
  baseId: string | null;
  ageYears: number | null;
  condition: number | null;
  askPrice: number | null;
  newPrice: number | null;
  story: string | null;
  since: number;
  isUsed: boolean;
  lux: number;
  rate: number;
  art: string;
  c: string;
}
function readItemPatch(b: Record<string, unknown>): ItemPatch | null {
  const name = String(b.name ?? '').trim().slice(0, 60);
  const cat = String(b.cat ?? 'Custom').trim().slice(0, 30);
  const price = Math.max(1, Math.min(1e9, Math.round(Number(b.price) || 1000)));
  const imageUrl = String(b.imageUrl ?? '').trim().slice(0, 500);
  const brand = String(b.brand ?? '').trim().slice(0, 30);
  if (!name) return null;
  if (!imageUrl) return null;
  try { const u = new URL(imageUrl); if (!u.protocol.startsWith('http')) throw new Error('bad-proto'); } catch { return null; }
  // v13.2 — rarity: default 'common'; reject unknown tiers.
  const rarityRaw = String(b.rarity ?? 'common').trim().toLowerCase();
  const rarity: Rarity = VALID_RARITIES.includes(rarityRaw as Rarity) ? (rarityRaw as Rarity) : 'common';
  // v13.2 — stock: null/undefined/empty → unlimited; positive int → that
  // count. Mythic MUST have stock in 1-10; otherwise the patch fails.
  let stock: number | null = null;
  if (b.stock !== undefined && b.stock !== null && String(b.stock).trim() !== '') {
    const n = Math.round(Number(b.stock));
    if (!Number.isFinite(n) || n < 1) return null;
    stock = Math.min(1_000_000, n);
  }
  if (rarity === 'mythic') {
    if (stock === null || stock < 1 || stock > 10) return null;
  }
  // v15 — optional used-market fields. If baseId is set, treat as a used
  // listing: askPrice / ageYears / condition / newPrice / story / since all
  // become relevant. We don't strictly require them, but if askPrice is
  // provided it overrides `price` as the listing's current price.
  const baseId = String(b.baseId ?? '').trim().slice(0, 60) || null;
  const isUsed = !!b.isUsed || !!baseId;
  const ageYears = (b.ageYears !== undefined && b.ageYears !== null && String(b.ageYears).trim() !== '')
    ? Math.max(0, Math.min(120, Math.round(Number(b.ageYears))))
    : null;
  const condition = (b.condition !== undefined && b.condition !== null && String(b.condition).trim() !== '')
    ? Math.max(0, Math.min(100, Math.round(Number(b.condition))))
    : null;
  const askPrice = (b.askPrice !== undefined && b.askPrice !== null && String(b.askPrice).trim() !== '')
    ? Math.max(0, Math.min(1e9, Number(b.askPrice)))
    : null;
  const newPrice = (b.newPrice !== undefined && b.newPrice !== null && String(b.newPrice).trim() !== '')
    ? Math.max(0, Math.min(1e9, Number(b.newPrice)))
    : null;
  const story = String(b.story ?? '').trim().slice(0, 280) || null;
  const lux = Number.isFinite(Number(b.lux)) ? Math.max(0, Math.min(12000, Math.round(Number(b.lux)))) : 1;
  const rate = Number.isFinite(Number(b.rate)) ? Math.max(-0.4, Math.min(0.1, Number(b.rate))) : 0;
  const art = String(b.art ?? 'ic-bag').trim().slice(0, 30) || 'ic-bag';
  const c = String(b.c ?? '#888888').trim().slice(0, 20) || '#888888';
  const since = Number.isFinite(Number(b.since)) ? Math.max(1800, Math.min(2100, Math.round(Number(b.since)))) : 1900;
  return { name, cat, price, imageUrl, brand, rarity, stock, baseId, ageYears, condition, askPrice, newPrice, story, since, isUsed, lux, rate, art, c };
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  // v15 — Return the FULL item catalogue from the SQLite `items` table
  // (standard + rare + used + custom, all admin-editable). Falls back to
  // the static ITEMS + RARE_ITEMS arrays if SQLite is unavailable so the
  // admin dashboard still renders in a degraded mode.
  try {
    const all = listAllItems();
    if (all.length) {
      // Backward compat — also expose the legacy `custom` bucket (non-seed
      // rows) so the grantItem dropdown can group standard / rare / custom.
      return NextResponse.json({
        items: all,
        rare: all.filter(i => i.isRare),
        custom: all.filter(i => !i.isSeed),
        standard: all.filter(i => i.isSeed && !i.isRare && !i.isUsed),
      });
    }
  } catch (e) {
    console.error('[admin/game] GET listAllItems failed:', e instanceof Error ? e.message : e);
  }
  // Fallback — DB unavailable; render the static JSON only (no custom items).
  return NextResponse.json({
    items: ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity || 'common', stock: i.stock ?? null })),
    rare: RARE_ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity, stock: i.stock ?? null })),
    custom: [],
  });
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;

  try {
    const action = String(b.action ?? '');
    const validActions = [
      'grantItem', 'setMoney', 'setFame', 'setHealth', 'setSpirit', 'setLevel',
      'triggerElection', 'advanceTime', 'createItem', 'updateItem', 'deleteItem', 'setDifficulty',
      // v14 — banking
      'setSavings', 'setLoan', 'adjustLoan',
      // v14 — business
      'grantBranch', 'removeBranch', 'setBizMood', 'franchiseAll',
      // v14 — gigs
      'setGigPay', 'setGigCd', 'resetGigs',
      // v14.1 — stock catalogue
      'createStock', 'editStock', 'deleteStock', 'resetStocks',
    ];
    if (!validActions.includes(action)) return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });

    // v15 — Custom catalogue changes must be durable; never fall back to
    // process memory. createItem / updateItem / deleteItem now write to the
    // unified `items` table (seed + rare + used + custom) via the typed
    // upsertItem / deleteItem helpers.
    if (action === 'createItem') {
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      const itemId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      try {
        upsertItem({
          id: itemId,
          name: patch.name,
          cat: patch.cat,
          brand: patch.brand || undefined,
          price: patch.price,
          lux: patch.lux,
          rate: patch.rate,
          art: patch.art,
          c: patch.c,
          rarity: patch.rarity,
          stock: patch.stock,
          imageUrl: patch.imageUrl,
          isUsed: patch.isUsed,
          baseId: patch.baseId || undefined,
          ageYears: patch.ageYears ?? undefined,
          condition: patch.condition ?? undefined,
          askPrice: patch.askPrice ?? undefined,
          newPrice: patch.newPrice ?? undefined,
          story: patch.story ?? undefined,
          since: patch.since,
        });
      } catch (e) {
        console.error('[admin/game] createItem failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ ok: false, error: 'item-save-failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, itemId, name: patch.name });
    }

    if (action === 'updateItem') {
      const itemId = String(b.id ?? '').trim();
      if (!itemId) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      try {
        // Verify the row exists first so we can return a clean 404 (the
        // upsert path would silently create it).
        const existing = getItem(itemId);
        if (!existing) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
        upsertItem({
          id: itemId,
          name: patch.name,
          cat: patch.cat,
          brand: patch.brand || undefined,
          price: patch.askPrice ?? patch.price,
          lux: patch.lux,
          rate: patch.rate,
          art: patch.art,
          c: patch.c,
          rarity: patch.rarity,
          stock: patch.stock,
          imageUrl: patch.imageUrl,
          isRare: existing.isRare,
          isUsed: patch.isUsed || existing.isUsed,
          baseId: patch.baseId || undefined,
          ageYears: patch.ageYears ?? undefined,
          condition: patch.condition ?? undefined,
          askPrice: patch.askPrice ?? undefined,
          newPrice: patch.newPrice ?? undefined,
          story: patch.story ?? undefined,
          since: patch.since,
        });
      } catch (e) {
        console.error('[admin/game] updateItem failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ ok: false, error: 'item-save-failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, itemId, name: patch.name });
    }

    if (action === 'deleteItem') {
      const itemId = String(b.id ?? '').trim();
      if (!itemId) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      try {
        const ok = deleteItem(itemId);
        if (!ok) return NextResponse.json({ ok: false, error: 'seed-protected' }, { status: 409 });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'item-delete-failed';
        const status = msg === 'not-found' ? 404 : 500;
        console.error('[admin/game] deleteItem failed:', msg);
        return NextResponse.json({ ok: false, error: msg }, { status });
      }
      return NextResponse.json({ ok: true, itemId });
    }

    // v14 — ALL player-mutation + gig-config actions record an ADMIN_ACTION
    // row in the admin_actions table. The targeted client polls
    // /api/social/ping?uid=xxx every 60s, picks up the pending action,
    // applies it via applyAdminActions(), and acks the row. This replaces
    // the old 501 "player-save-not-server-managed" stub — saves STILL live
    // in browser localStorage; we just deliver the mutation request to the
    // client instead of refusing it.
    if (PLAYER_ACTIONS.has(action) || BROADCAST_ACTIONS.has(action)) {
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });

      // --- target uid resolution -------------------------------------------
      // Gig-config actions go to the broadcast sentinel (every player applies
      // them). Player-specific actions resolve the admin's HB-code / uid
      // input to a real player uid via the players table.
      let targetUid: string;
      if (BROADCAST_ACTIONS.has(action)) {
        targetUid = ADMIN_BROADCAST_UID;
      } else {
        const resolved = await resolveTargetUid(b.uid);
        if (!resolved) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
        targetUid = resolved;
      }

      // --- per-action input validation + payload build ---------------------
      // Each branch produces a payload object the engine's applyAdminActions
      // can consume directly. NaN / out-of-range inputs are rejected with a
      // 400 rather than silently recorded — the operator should see the
      // error immediately, not after the client fails to apply the action.
      const payload: Record<string, unknown> = {};
      try {
        switch (action) {
          // --- existing player actions (v11.39 / v12.2) -------------------
          case 'grantItem': {
            const itemId = String(b.itemId ?? '').trim();
            if (!itemId) throw new Error('bad-itemId');
            payload.itemId = itemId;
            payload.uid = targetUid;
            break;
          }
          case 'setMoney':   payload.amount = clampNum(b.amount, -1e12, 1e15); payload.uid = targetUid; break;
          case 'setFame':    payload.amount = clampNum(b.amount, 0, 1e6);     payload.uid = targetUid; break;
          case 'setHealth':  payload.amount = clampNum(b.amount, 0, 100);      payload.uid = targetUid; break;
          case 'setSpirit':  payload.amount = clampNum(b.amount, 0, 100);      payload.uid = targetUid; break;
          case 'setLevel':   payload.level  = clampNum(b.level ?? b.amount, 1, 999); payload.uid = targetUid; break;
          case 'triggerElection': payload.uid = targetUid; break;
          case 'advanceTime': payload.days = clampNum(b.days ?? b.amount, 0, 3650); payload.uid = targetUid; break;
          case 'setDifficulty': {
            const lvl = String(b.level ?? '').toLowerCase();
            if (lvl !== 'easy' && lvl !== 'normal' && lvl !== 'hard') throw new Error('bad-difficulty');
            payload.level = lvl;
            payload.uid = targetUid;
            break;
          }
          // --- v14 banking --------------------------------------------------
          case 'setSavings': payload.amount = clampNum(b.amount, -1e12, 1e15); payload.uid = targetUid; break;
          case 'setLoan':    payload.amount = clampNum(b.amount, 0, 1e15);     payload.uid = targetUid; break;
          case 'adjustLoan': payload.delta  = clampNum(b.delta ?? b.amount, -1e15, 1e15); payload.uid = targetUid; break;
          // --- v14 business -------------------------------------------------
          case 'grantBranch':
          case 'removeBranch': {
            const bizId = String(b.bizId ?? '').trim();
            if (!BIZ.some(x => x.id === bizId)) throw new Error('bad-bizId');
            payload.bizId = bizId;
            payload.count = clampNum(b.count ?? 1, 1, 50);
            payload.uid = targetUid;
            break;
          }
          case 'setBizMood': {
            const bizId = String(b.bizId ?? '').trim();
            if (!BIZ.some(x => x.id === bizId)) throw new Error('bad-bizId');
            const mood = clampNum(b.mood, 0.5, 1.5);
            payload.bizId = bizId;
            payload.mood = mood;
            payload.uid = targetUid;
            break;
          }
          case 'franchiseAll': {
            const bizId = String(b.bizId ?? '').trim();
            if (!BIZ.some(x => x.id === bizId)) throw new Error('bad-bizId');
            payload.bizId = bizId;
            payload.uid = targetUid;
            break;
          }
          // --- v14 gigs -----------------------------------------------------
          case 'setGigPay': {
            const gigId = String(b.gigId ?? '').trim();
            if (!GIGS.some(x => x.id === gigId)) throw new Error('bad-gigId');
            const basePay = clampNum(b.basePay, 0, 1e9);
            payload.gigId = gigId;
            payload.basePay = basePay;
            break;
          }
          case 'setGigCd': {
            const gigId = String(b.gigId ?? '').trim();
            if (!GIGS.some(x => x.id === gigId)) throw new Error('bad-gigId');
            const cd = clampNum(b.cd, 0, 365);
            payload.gigId = gigId;
            payload.cd = cd;
            break;
          }
          case 'resetGigs':
            // no extra params — broadcast clears everyone's overrides.
            break;
          // v14.1 — stock catalogue actions (all broadcast).
          case 'createStock': {
            const id = String(b.id ?? '').trim().toUpperCase();
            // Same id rules as the engine: 1–16 chars, starts with a letter,
            // alphanumeric + underscore/hyphen only.
            if (!/^[A-Z][A-Z0-9_-]{0,15}$/.test(id)) throw new Error('bad-stockId');
            const name = String(b.name ?? '').trim().slice(0, 60);
            if (!name) throw new Error('bad-name');
            payload.id = id;
            payload.name = name;
            payload.p = clampNum(b.p ?? 100, 1, 1e9);
            payload.vol = clampNum(b.vol ?? 0.02, 0, 1);
            payload.art = String(b.art ?? 's-tech').trim().slice(0, 30) || 's-tech';
            break;
          }
          case 'editStock': {
            const id = String(b.id ?? '').trim().toUpperCase();
            if (!id) throw new Error('bad-stockId');
            payload.id = id;
            // All patch fields are optional: empty / missing / NaN means
            // "leave this field alone". The engine's adminEditStock mirrors
            // this — only finite, non-empty values are written.
            if (b.p != null && String(b.p).trim() !== '') payload.p = clampNum(b.p, 1, 1e9);
            if (b.vol != null && String(b.vol).trim() !== '') payload.vol = clampNum(b.vol, 0, 1);
            if (b.name != null && String(b.name).trim()) payload.name = String(b.name).trim().slice(0, 60);
            if (b.art != null && String(b.art).trim()) payload.art = String(b.art).trim().slice(0, 30);
            break;
          }
          case 'deleteStock': {
            const id = String(b.id ?? '').trim().toUpperCase();
            if (!id) throw new Error('bad-stockId');
            payload.id = id;
            break;
          }
          case 'resetStocks':
            // no extra params — broadcast clears overrides + custom stocks.
            break;
          default:
            // Unreachable (validActions gate above caught it), but keep TS happy.
            throw new Error('bad-action');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'bad-input';
        return NextResponse.json({ ok: false, error: msg }, { status: 400 });
      }

      // --- record the action ----------------------------------------------
      // insertAdminAction never throws on valid input; a SQLite failure
      // bubbles up to the outer catch below.
      const row = insertAdminAction(targetUid, action, payload);
      return NextResponse.json({ ok: true, action, targetUid, id: row.id, ts: row.ts });
    }

    // v14 — fallback for actions that somehow slip past the gates above.
    return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });
  } catch (e) {
    console.error('[admin/game] POST failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'game-action-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
