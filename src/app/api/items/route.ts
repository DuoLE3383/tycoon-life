// v15 — public read-only item catalogue endpoint.
//
// GET /api/items returns the full `items` table (standard + rare + used +
// admin-created custom rows) so the game client can pick up admin edits
// (price changes, new items, retired stock) without a full page reload.
//
// No ADMIN_KEY required — the response is the same data the player would
// see by reading /items.json (which is still shipped as a static asset for
// the GitHub Pages fallback). If SQLite is unavailable (static export,
// missing data/ dir, native-module issue), we fall back to the static
// ITEMS + RARE_ITEMS + USED_MARKET arrays so the client never sees a 500.
import { NextResponse } from 'next/server';
import { ITEMS, RARE_ITEMS, USED_MARKET } from '@/lib/gameData';

export async function GET() {
  try {
    const { listAllItems } = await import('@/lib/server/socialDb');
    const all = listAllItems();
    if (all.length) {
      return NextResponse.json({
        ok: true,
        ts: Date.now(),
        items: all,
      });
    }
  } catch (e) {
    console.error('[api/items] listAllItems failed, falling back to static JSON:', e instanceof Error ? e.message : e);
  }
  // Fallback — DB unavailable; return the static import shapes.
  return NextResponse.json({
    ok: true,
    ts: Date.now(),
    fallback: true,
    items: ITEMS.map(i => ({
      id: i.id, name: i.name, cat: i.cat, brand: i.brand, price: i.price, lux: i.lux,
      rate: i.rate, art: i.art, c: i.c, rarity: i.rarity, stock: i.stock ?? null,
      isRare: false, isUsed: false, isSeed: true, since: 1900,
      createdAt: '1970-01-01T00:00:00.000Z',
    })),
    rare: RARE_ITEMS.map(i => ({
      id: i.id, name: i.name, cat: i.cat, brand: i.brand, price: i.price, lux: i.lux,
      rate: i.rate, art: i.art, c: i.c, rarity: i.rarity, stock: i.stock ?? null,
      isRare: true, isUsed: false, isSeed: true, since: 1900,
      createdAt: '1970-01-01T00:00:00.000Z',
    })),
    usedMarket: USED_MARKET.map(u => ({
      id: u.id, name: u.name, cat: u.cat, brand: u.brand, price: u.askPrice, lux: u.lux,
      rate: u.rate, art: u.art, c: u.c, baseId: u.baseId, ageYears: u.ageYears,
      condition: u.condition, askPrice: u.askPrice, newPrice: u.newPrice,
      story: u.story, since: u.since,
      isRare: false, isUsed: true, isSeed: true,
      createdAt: '1970-01-01T00:00:00.000Z',
    })),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
