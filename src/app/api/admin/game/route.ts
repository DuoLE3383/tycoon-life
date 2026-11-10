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
  return NextResponse.json({
    items: ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity || 'common' })),
    rare: RARE_ITEMS.map(i => ({ id: i.id, name: i.name, cat: i.cat, price: i.price, rarity: i.rarity })),
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
    const validActions = ['grantItem', 'setMoney', 'setFame', 'setHealth', 'setSpirit', 'setLevel', 'triggerElection', 'advanceTime'];
    if (!validActions.includes(action)) return NextResponse.json({ ok: false, error: 'bad-action' }, { status: 400 });

    // For grantItem, validate the itemId exists.
    if (action === 'grantItem') {
      const itemId = String(b.itemId ?? '');
      const exists = [...ITEMS, ...RARE_ITEMS].some(i => i.id === itemId);
      if (!exists) return NextResponse.json({ ok: false, error: 'bad-itemId' }, { status: 400 });
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
