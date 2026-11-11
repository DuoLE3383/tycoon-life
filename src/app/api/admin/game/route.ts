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
import { NextResponse } from 'next/server';
import { adminGuard, readBody } from '@/lib/server/adminAuth';
import { ITEMS, RARE_ITEMS, BIZ, GIGS } from '@/lib/gameData';
import type { Rarity } from '@/lib/gameData';
import { getPlayerByCode, insertAdminAction, ADMIN_BROADCAST_UID } from '@/lib/server/socialDb';

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

// v13.2 — ensure the custom_items table has the stock column. SQLite doesn't
// support adding NOT NULL columns to existing tables, so we add it NULLABLE
// and the read path coalesces null → undefined for the client. Safe to call
// repeatedly: ALTER TABLE only fires when the column is missing.
function ensureStockColumn(d: { exec: (sql: string) => void }): void {
  try {
    // PRAGMA table_info returns rows; check for a 'stock' column.
    // Simpler: try ALTER and swallow the "duplicate column" error.
    d.exec('ALTER TABLE custom_items ADD COLUMN stock INTEGER');
  } catch { /* column already exists — expected on second call */ }
}

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
const BROADCAST_ACTIONS = new Set(['setGigPay', 'setGigCd', 'resetGigs']);

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
function readItemPatch(b: Record<string, unknown>): { name: string; cat: string; price: number; imageUrl: string; brand: string; rarity: Rarity; stock: number | null } | null {
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
  return { name, cat, price, imageUrl, brand, rarity, stock };
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  // Return the full item catalogue so the admin UI can render a picker.
  let custom: { id: string; name: string; cat: string; price: number; rarity: string; stock?: number | null; imageUrl: string }[] = [];
  const d = await tryDb();
  if (d) {
    try {
      d.exec(`CREATE TABLE IF NOT EXISTS custom_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL DEFAULT 'Custom', brand TEXT, price REAL NOT NULL DEFAULT 1000, lux INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0, art TEXT NOT NULL DEFAULT 'ic-bag', rarity TEXT NOT NULL DEFAULT 'common', image_url TEXT NOT NULL, created_at TEXT NOT NULL)`);
      ensureStockColumn(d);
      custom = (d.prepare('SELECT id, name, cat, price, rarity, stock, image_url FROM custom_items ORDER BY created_at DESC LIMIT 200').all() as { id: string; name: string; cat: string; price: number; rarity: string; stock?: number | null; image_url: string }[])
        .map(r => ({ id: r.id, name: r.name, cat: r.cat, price: r.price, rarity: r.rarity, stock: r.stock == null ? null : r.stock, imageUrl: r.image_url }));
    } catch { /* table not ready — return empty */ }
  }
  return NextResponse.json({
    items: ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity || 'common', stock: i.stock ?? null })),
    rare: RARE_ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity, stock: i.stock ?? null })),
    custom,
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
      'triggerElection', 'advanceTime', 'createItem', 'updateItem', 'setDifficulty',
      // v14 — banking
      'setSavings', 'setLoan', 'adjustLoan',
      // v14 — business
      'grantBranch', 'removeBranch', 'setBizMood', 'franchiseAll',
      // v14 — gigs
      'setGigPay', 'setGigCd', 'resetGigs',
    ];
    if (!validActions.includes(action)) return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });

    // Custom catalogue changes must be durable; never fall back to process memory.
    if (action === 'createItem') {
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      const itemId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      try {
        d.exec(`CREATE TABLE IF NOT EXISTS custom_items (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL DEFAULT 'Custom', brand TEXT,
          price REAL NOT NULL DEFAULT 1000, lux INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0,
          art TEXT NOT NULL DEFAULT 'ic-bag', rarity TEXT NOT NULL DEFAULT 'common',
          image_url TEXT NOT NULL, created_at TEXT NOT NULL
        )`);
        ensureStockColumn(d);
        // v13.2 — INSERT now includes rarity + stock. stock is NULLABLE: a
        // NULL row means unlimited (matches ItemDef.stock === undefined).
        d.prepare('INSERT INTO custom_items (id, name, cat, brand, price, lux, rate, art, rarity, stock, image_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
          .run(itemId, patch.name, patch.cat, patch.brand || null, patch.price, 1, 0, 'ic-bag', patch.rarity, patch.stock, patch.imageUrl, new Date().toISOString());
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
        ensureStockColumn(d);
        // v13.2 — UPDATE now writes rarity + stock alongside the other fields.
        const result = d.prepare('UPDATE custom_items SET name=?, cat=?, brand=?, price=?, rarity=?, stock=?, image_url=? WHERE id=?')
          .run(patch.name, patch.cat, patch.brand || null, patch.price, patch.rarity, patch.stock, patch.imageUrl, itemId);
        if (!result.changes) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
      } catch (e) {
        console.error('[admin/game] updateItem failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ ok: false, error: 'item-save-failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, itemId, name: patch.name });
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
