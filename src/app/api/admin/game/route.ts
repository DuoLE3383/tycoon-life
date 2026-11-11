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
//   action='createItem' { name, cat, price, imageUrl, brand } → creates custom item
//   action='updateItem' { id, name?, cat?, price?, imageUrl?, brand? } → updates a custom item (v12.2)
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
import { NextResponse } from 'next/server';
import { adminGuard, readBody } from '@/lib/server/adminAuth';
import { ITEMS, RARE_ITEMS } from '@/lib/gameData';

// v12.1 — in-memory fallback for custom items when SQLite is unavailable.
const memoryItems: { id: string; name: string; cat: string; brand?: string; price: number; lux: number; rate: number; art: string; rarity: string; image_url: string; created_at: string }[] = [];

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

// v12.2 — normalise + clamp a custom-item patch shared by createItem and
// updateItem. Returns null when the patch has no valid URL (URL is required
// for custom items since they have no built-in art fallback).
function readItemPatch(b: Record<string, unknown>): { name: string; cat: string; price: number; imageUrl: string; brand: string } | null {
  const name = String(b.name ?? '').trim().slice(0, 60);
  const cat = String(b.cat ?? 'Custom').trim().slice(0, 30);
  const price = Math.max(1, Math.min(1e9, Math.round(Number(b.price) || 1000)));
  const imageUrl = String(b.imageUrl ?? '').trim().slice(0, 500);
  const brand = String(b.brand ?? '').trim().slice(0, 30);
  if (!name) return null;
  if (!imageUrl) return null;
  try { const u = new URL(imageUrl); if (!u.protocol.startsWith('http')) throw new Error('bad-proto'); } catch { return null; }
  return { name, cat, price, imageUrl, brand };
}

export async function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  // Return the full item catalogue so the admin UI can render a picker.
  let custom: { id: string; name: string; cat: string; price: number; rarity: string; imageUrl: string }[] = [];
  const d = await tryDb();
  if (d) {
    try {
      d.exec(`CREATE TABLE IF NOT EXISTS custom_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL DEFAULT 'Custom', brand TEXT, price REAL NOT NULL DEFAULT 1000, lux INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0, art TEXT NOT NULL DEFAULT 'ic-bag', rarity TEXT NOT NULL DEFAULT 'common', image_url TEXT NOT NULL, created_at TEXT NOT NULL)`);
      custom = (d.prepare('SELECT id, name, cat, price, rarity, image_url FROM custom_items ORDER BY created_at DESC LIMIT 200').all() as { id: string; name: string; cat: string; price: number; rarity: string; image_url: string }[])
        .map(r => ({ id: r.id, name: r.name, cat: r.cat, price: r.price, rarity: r.rarity, imageUrl: r.image_url }));
    } catch { /* table not ready — return empty */ }
  }
  // v12.1 — also include in-memory items.
  custom = [...custom, ...memoryItems.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity, imageUrl: i.image_url }))];
  return NextResponse.json({
    items: ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity || 'common' })),
    rare: RARE_ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity })),
    custom,
  });
}

export async function POST(req: Request) {
  const b = await readBody(req);
  const denied = adminGuard(req, b.key);
  if (denied) return denied;
  try {
    const action = String(b.action ?? '');
    const validActions = ['grantItem', 'setMoney', 'setFame', 'setHealth', 'setSpirit', 'setLevel', 'triggerElection', 'advanceTime', 'createItem', 'updateItem', 'setDifficulty'];
    if (!validActions.includes(action)) return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });

    // v12.1 — createItem FIRST, before any db() call. This action targets the
    // catalogue, not a specific player, so it must work even when SQLite is
    // unavailable. Falls back to in-memory storage if db() fails.
    if (action === 'createItem') {
      const name = String(b.name ?? '').trim().slice(0, 60);
      const cat = String(b.cat ?? 'Custom').trim().slice(0, 30);
      const price = Math.max(1, Math.min(1e9, Math.round(Number(b.price) || 1000)));
      const imageUrl = String(b.imageUrl ?? '').trim().slice(0, 500);
      const brand = String(b.brand ?? '').trim().slice(0, 30);
      if (!name) return NextResponse.json({ ok: false, error: 'bad-name' }, { status: 400 });
      if (!imageUrl) return NextResponse.json({ ok: false, error: 'bad-url' }, { status: 400 });
      try { const u = new URL(imageUrl); if (!u.protocol.startsWith('http')) throw new Error('bad-proto'); } catch { return NextResponse.json({ ok: false, error: 'bad-url' }, { status: 400 }); }

      const itemId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
      const createdAt = new Date().toISOString();

      // Try SQLite first; fall back to in-memory if unavailable.
      const d = await tryDb();
      if (d) {
        try {
          d.exec(`CREATE TABLE IF NOT EXISTS custom_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            cat TEXT NOT NULL DEFAULT 'Custom',
            brand TEXT,
            price REAL NOT NULL DEFAULT 1000,
            lux INTEGER NOT NULL DEFAULT 1,
            rate REAL NOT NULL DEFAULT 0,
            art TEXT NOT NULL DEFAULT 'ic-bag',
            rarity TEXT NOT NULL DEFAULT 'common',
            image_url TEXT NOT NULL,
            created_at TEXT NOT NULL
          )`);
          d.prepare('INSERT INTO custom_items (id, name, cat, brand, price, lux, rate, art, rarity, image_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
            .run(itemId, name, cat, brand || null, price, 1, 0, 'ic-bag', 'common', imageUrl, createdAt);
        } catch (e) {
          // SQLite write failed — fall back to in-memory.
          console.error('[admin/game] SQLite insert failed, using in-memory fallback:', e);
          memoryItems.push({ id: itemId, name, cat, brand: brand || undefined, price, lux: 1, rate: 0, art: 'ic-bag', rarity: 'common', image_url: imageUrl, created_at: createdAt });
        }
      } else {
        // SQLite not available — use in-memory.
        memoryItems.push({ id: itemId, name, cat, brand: brand || undefined, price, lux: 1, rate: 0, art: 'ic-bag', rarity: 'common', image_url: imageUrl, created_at: createdAt });
      }

      return NextResponse.json({ ok: true, itemId, name });
    }

    // v12.2 — updateItem: edit an existing custom item by id. Same SQLite-or-
    // in-memory path as createItem so it works without a DB too. Requires the
    // item id and (at minimum) a fresh URL since custom items always have one.
    if (action === 'updateItem') {
      const itemId = String(b.id ?? '').trim();
      if (!itemId) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      let updated = false;
      if (d) {
        try {
          d.exec(`CREATE TABLE IF NOT EXISTS custom_items (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            cat TEXT NOT NULL DEFAULT 'Custom',
            brand TEXT,
            price REAL NOT NULL DEFAULT 1000,
            lux INTEGER NOT NULL DEFAULT 1,
            rate REAL NOT NULL DEFAULT 0,
            art TEXT NOT NULL DEFAULT 'ic-bag',
            rarity TEXT NOT NULL DEFAULT 'common',
            image_url TEXT NOT NULL,
            created_at TEXT NOT NULL
          )`);
          const r = d.prepare('UPDATE custom_items SET name=?, cat=?, brand=?, price=?, image_url=? WHERE id=?')
            .run(patch.name, patch.cat, patch.brand || null, patch.price, patch.imageUrl, itemId);
          updated = r ? r.changes > 0 : false;
        } catch (e) {
          console.error('[admin/game] SQLite update failed:', e instanceof Error ? e.message : e);
        }
      }
      // Also patch the in-memory copy (if present) so the dashboard reflects
      // the change even on a SQLite-less deployment.
      const mem = memoryItems.find(it => it.id === itemId);
      if (mem) {
        mem.name = patch.name; mem.cat = patch.cat; mem.brand = patch.brand || undefined;
        mem.price = patch.price; mem.image_url = patch.imageUrl;
        updated = true;
      }
      if (!updated) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
      return NextResponse.json({ ok: true, itemId, name: patch.name });
    }

    // All remaining actions target a specific player — uid required.
    const uid = String(b.uid ?? '').trim();
    if (!uid) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });

    // v12.2 — setDifficulty: validate the level then record an audit-log row.
    // The engine reads GameState.aiDifficulty (default 'normal'); this action
    // tells the operator what was requested for a given player.
    if (action === 'setDifficulty') {
      const level = String(b.level ?? 'normal');
      if (level !== 'easy' && level !== 'normal' && level !== 'hard') {
        return NextResponse.json({ ok: false, error: 'bad-level' }, { status: 400 });
      }
      const d = await tryDb();
      if (d) {
        try {
          const note = JSON.stringify({ action, uid, level, ts: Date.now() });
          d.prepare('INSERT INTO messages (uid, name, avatar, text, created_at) VALUES (?,?,?,?,?)')
            .run('hb-system', 'HuyenBao Admin', '⚙️', '⚙️ ADMIN_ACTION:' + note, new Date().toISOString());
        } catch (e) {
          console.error('[admin/game] setDifficulty audit log failed (non-fatal):', e instanceof Error ? e.message : e);
        }
      }
      return NextResponse.json({ ok: true, action, uid, level });
    }

    // For grantItem, validate the itemId exists.
    if (action === 'grantItem') {
      const itemId = String(b.itemId ?? '');
      const exists = [...ITEMS, ...RARE_ITEMS].some(i => i.id === itemId);
      if (!exists) return NextResponse.json({ ok: false, error: 'bad-itemId' }, { status: 400 });
    }

    // Record the action in the messages table as a system note (audit trail).
    const d = await tryDb();
    if (d) {
      try {
        const note = JSON.stringify({ action, uid, itemId: b.itemId, amount: b.amount, level: b.level, days: b.days, ts: Date.now() });
        d.prepare('INSERT INTO messages (uid, name, avatar, text, created_at) VALUES (?,?,?,?,?)')
          .run('hb-system', 'HuyenBao Admin', '⚙️', '⚙️ ADMIN_ACTION:' + note, new Date().toISOString());
      } catch (e) {
        console.error('[admin/game] audit log failed (non-fatal):', e);
      }
    }

    return NextResponse.json({ ok: true, action, uid });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'game-action-failed' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
