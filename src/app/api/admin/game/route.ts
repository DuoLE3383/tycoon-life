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

    // Custom catalogue mutations must be durable. Never report success for RAM-only writes.
    if (action === 'createItem') {
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      const itemId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      const createdAt = new Date().toISOString();
      try {
        d.exec(`CREATE TABLE IF NOT EXISTS custom_items (
          id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL DEFAULT 'Custom', brand TEXT,
          price REAL NOT NULL DEFAULT 1000, lux INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0,
          art TEXT NOT NULL DEFAULT 'ic-bag', rarity TEXT NOT NULL DEFAULT 'common',
          image_url TEXT NOT NULL, created_at TEXT NOT NULL
        )`);
        d.prepare('INSERT INTO custom_items (id, name, cat, brand, price, lux, rate, art, rarity, image_url, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
          .run(itemId, patch.name, patch.cat, patch.brand || null, patch.price, 1, 0, 'ic-bag', 'common', patch.imageUrl, createdAt);
      } catch (e) {
        console.error('[admin/game] createItem failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ ok: false, error: 'item-save-failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, itemId, name: patch.name });
    }

    // Update custom catalogue items in persistent storage only.
    if (action === 'updateItem') {
      const itemId = String(b.id ?? '').trim();
      if (!itemId) return NextResponse.json({ ok: false, error: 'bad-id' }, { status: 400 });
      const patch = readItemPatch(b);
      if (!patch) return NextResponse.json({ ok: false, error: 'bad-patch' }, { status: 400 });
      const d = await tryDb();
      if (!d) return NextResponse.json({ ok: false, error: 'sqlite-unavailable' }, { status: 503 });
      try {
        const result = d.prepare('UPDATE custom_items SET name=?, cat=?, brand=?, price=?, image_url=? WHERE id=?')
          .run(patch.name, patch.cat, patch.brand || null, patch.price, patch.imageUrl, itemId);
        if (!result.changes) return NextResponse.json({ ok: false, error: 'not-found' }, { status: 404 });
      } catch (e) {
        console.error('[admin/game] updateItem failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ ok: false, error: 'item-save-failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, itemId, name: patch.name });
    }

    // Player saves currently live in browser LocalStorage, not in the server DB.
    // Refuse these mutations rather than returning a false success after writing only an audit note.
    const uid = String(b.uid ?? '').trim();
    if (!uid) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });
    return NextResponse.json({
      ok: false,
      error: 'player-save-not-server-managed',
      message: 'This action is disabled until player saves are migrated to authenticated server-side storage.',
      action,
      uid,
    }, { status: 501 });
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
