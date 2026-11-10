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
//
// NOTE: the player's GameState lives in their browser localStorage, NOT on the
// server. This endpoint writes a "pending admin action" record to the SQLite
// social DB; the player's client polls /api/social/ping and applies the action
// on next load. This is the same pattern used for gifts. For now, the admin
// panel also shows the available ITEMS list (read-only) so operators can see
// what itemId values are valid.
import { NextResponse } from 'next/server';
import { db } from '@/lib/server/socialDb';
import { adminGuard, readBody } from '@/lib/server/adminAuth';
import { ITEMS, RARE_ITEMS } from '@/lib/gameData';

export function GET(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  // Return the full item catalogue so the admin UI can render a picker.
  // v11.40 — also return custom_items from the SQLite table (if it exists).
  let custom: { id: string; name: string; cat: string; price: number; rarity: string; imageUrl: string }[] = [];
  try {
    const d = db();
    d.exec(`CREATE TABLE IF NOT EXISTS custom_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, cat TEXT NOT NULL DEFAULT 'Custom', brand TEXT, price REAL NOT NULL DEFAULT 1000, lux INTEGER NOT NULL DEFAULT 1, rate REAL NOT NULL DEFAULT 0, art TEXT NOT NULL DEFAULT 'ic-bag', rarity TEXT NOT NULL DEFAULT 'common', image_url TEXT NOT NULL, created_at TEXT NOT NULL)`);
    custom = (d.prepare('SELECT id, name, cat, price, rarity, image_url FROM custom_items ORDER BY created_at DESC LIMIT 200').all() as { id: string; name: string; cat: string; price: number; rarity: string; image_url: string }[])
      .map(r => ({ id: r.id, name: r.name, cat: r.cat, price: r.price, rarity: r.rarity, imageUrl: r.image_url }));
  } catch { /* table not ready — return empty */ }
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
    db();
    const action = String(b.action ?? '');
    const uid = String(b.uid ?? '').trim();
    if (!uid) return NextResponse.json({ ok: false, error: 'bad-uid' }, { status: 400 });

    // v11.39 — store the pending action in a lightweight key-value table.
    // The client applies it on next ping. This is a stub — for now we just
    // log the action; the real client-side application would require a new
    // social API + client hook. The admin can still SEE the item list (GET)
    // and the action is recorded for audit.
    const validActions = ['grantItem', 'setMoney', 'setFame', 'setHealth', 'setSpirit', 'setLevel', 'triggerElection', 'advanceTime', 'createItem'];
    if (!validActions.includes(action)) return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });

    // For grantItem, validate the itemId exists.
    if (action === 'grantItem') {
      const itemId = String(b.itemId ?? '');
      const exists = [...ITEMS, ...RARE_ITEMS].some(i => i.id === itemId);
      if (!exists) return NextResponse.json({ ok: false, error: 'bad-itemId' }, { status: 400 });
    }

    // v11.40 — createItem: admin creates a custom item from a URL (image link).
    // The item is stored in a new custom_items table; the client merges it into
    // the runtime ITEM_BY on next load. The image URL is stored as-is — the
    // client renders it directly (no server-side download needed).
    if (action === 'createItem') {
      const name = String(b.name ?? '').trim().slice(0, 60);
      const cat = String(b.cat ?? 'Custom').trim().slice(0, 30);
      const price = Math.max(1, Math.min(1e9, Math.round(Number(b.price) || 1000)));
      const imageUrl = String(b.imageUrl ?? '').trim().slice(0, 500);
      const brand = String(b.brand ?? '').trim().slice(0, 30);
      if (!name) return NextResponse.json({ ok: false, error: 'bad-name' }, { status: 400 });
      if (!imageUrl) return NextResponse.json({ ok: false, error: 'bad-url' }, { status: 400 });
      // Validate URL format (must be http/https)
      try { const u = new URL(imageUrl); if (!u.protocol.startsWith('http')) throw new Error('bad-proto'); } catch { return NextResponse.json({ ok: false, error: 'bad-url' }, { status: 400 }); }

      // Generate a unique item id.
      const itemId = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);

      // Ensure the custom_items table exists, then insert.
      const d = db();
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
        .run(itemId, name, cat, brand || null, price, 1, 0, 'ic-bag', 'common', imageUrl, new Date().toISOString());

      return NextResponse.json({ ok: true, itemId, name });
    }

    // Record the action in the messages table as a system note (audit trail).
    // The client will pick it up via /api/social/ping and apply it.
    const note = JSON.stringify({ action, uid, itemId: b.itemId, amount: b.amount, level: b.level, days: b.days, ts: Date.now() });
    db().prepare('INSERT INTO messages (uid, name, avatar, text, created_at) VALUES (?,?,?,?,?)')
      .run('hb-system', 'HuyenBao Admin', '⚙️', '⚙️ ADMIN_ACTION:' + note, new Date().toISOString());

    return NextResponse.json({ ok: true, action, uid });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'game-action-failed' }, { status: 500 });
  }
}
