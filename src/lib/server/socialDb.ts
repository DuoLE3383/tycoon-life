// v11.27 — self-hosted SQLite community backend.
//
// Loaded ONLY from /api/social/* route handlers (real Node server / VPS).
// The browser bundle never imports this module, and the GitHub Pages static
// export excludes .ts route files via pageExtensions — so better-sqlite3
// stays a server-only dependency.
//
// Identity model: the client generates a random uid once per browser
// (localStorage) and sends it with every request. This is a casual game
// backend, not a bank: uid acts as a bearer identity, all user input is
// clamped server-side, and money gifts are virtual currency only.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import itemsData from '../../../public/items.json';

export interface PlayerRow { id: string; code: string; name: string; avatar: string; level: number; nw: number; ts: number; last_seen: number; banned?: number }
export interface MsgRow { id: number; uid: string; name: string; avatar: string; text: string; created_at: string }
export interface EdgeRow { id: number; a: string; b: string; status: string; ts: number }
export interface GiftRow { id: number; from_uid: string; to_uid: string; amount: number; note: string | null; claimed: number; ts: number }

const DB_PATH = process.env.SOCIAL_DB_PATH
  ? path.resolve(process.env.SOCIAL_DB_PATH)
  : path.join(process.cwd(), 'data', 'social.db');

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const d = new Database(DB_PATH);
  d.pragma('journal_mode = WAL');
  d.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL DEFAULT '🐯',
      level INTEGER NOT NULL DEFAULT 1,
      nw REAL NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL DEFAULT 0,
      last_seen INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS friend_edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      a TEXT NOT NULL,
      b TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      ts INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_uid TEXT NOT NULL,
      to_uid TEXT NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      claimed INTEGER NOT NULL DEFAULT 0,
      ts INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_edges_a ON friend_edges(a);
    CREATE INDEX IF NOT EXISTS idx_edges_b ON friend_edges(b);
    CREATE INDEX IF NOT EXISTS idx_gifts_to ON gifts(to_uid);
    CREATE TABLE IF NOT EXISTS admin_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_uid TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      applied_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_admin_actions_target ON admin_actions(target_uid);
    CREATE TABLE IF NOT EXISTS game_saves (
      uid TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cat TEXT NOT NULL,
      brand TEXT,
      price REAL NOT NULL DEFAULT 1000,
      lux INTEGER NOT NULL DEFAULT 1,
      rate REAL NOT NULL DEFAULT 0,
      art TEXT NOT NULL DEFAULT 'ic-bag',
      c TEXT NOT NULL DEFAULT '#888888',
      rarity TEXT,
      stock INTEGER,
      image_url TEXT,
      is_rare INTEGER NOT NULL DEFAULT 0,
      is_used INTEGER NOT NULL DEFAULT 0,
      is_seed INTEGER NOT NULL DEFAULT 0,
      base_id TEXT,
      age_years INTEGER,
      condition INTEGER,
      ask_price REAL,
      new_price REAL,
      story TEXT,
      since INTEGER NOT NULL DEFAULT 1900,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_items_is_rare ON items(is_rare);
    CREATE INDEX IF NOT EXISTS idx_items_is_used ON items(is_used);
  `);
  // v11.29 — migration: the banned flag arrived after the first release of
  // this schema; ALTER it in for older database files.
  const cols = (d.prepare('PRAGMA table_info(players)').all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('banned')) d.exec('ALTER TABLE players ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
  // v15 — items table column migrations for older databases. Each is gated on
  // the column being absent so the ALTER only fires once.
  const itemCols = new Set((d.prepare('PRAGMA table_info(items)').all() as { name: string }[]).map(c => c.name));
  if (!itemCols.has('c')) d.exec("ALTER TABLE items ADD COLUMN c TEXT NOT NULL DEFAULT '#888888'");
  if (!itemCols.has('is_seed')) d.exec('ALTER TABLE items ADD COLUMN is_seed INTEGER NOT NULL DEFAULT 0');
  if (!itemCols.has('base_id')) d.exec('ALTER TABLE items ADD COLUMN base_id TEXT');
  // Seed the items table from the static JSON on first DB access. Idempotent —
  // INSERT OR IGNORE means existing rows (including admin-edited ones) are
  // left untouched. Safe to call on every server start.
  try { seedItemsFromJSON(d); } catch (e) { console.error('[socialDb] seedItemsFromJSON failed:', e instanceof Error ? e.message : e); }
  _db = d;
  return d;
}

// ---------------------------------------------------------------- v15 — items table
// The items table mirrors /public/items.json so the admin dashboard can
// create / edit / delete entries without re-deploying. Seed rows are
// inserted with INSERT OR IGNORE so admin edits to seed rows survive a
// server restart. Seed rows carry is_seed=1 — deleteItem refuses to drop
// them so the catalogue stays intact (admins edit instead).
export interface ItemRow {
  id: string;
  name: string;
  cat: string;
  brand: string | null;
  price: number;
  lux: number;
  rate: number;
  art: string;
  c: string;
  rarity: string | null;
  stock: number | null;
  image_url: string | null;
  is_rare: number;
  is_used: number;
  is_seed: number;
  base_id: string | null;
  age_years: number | null;
  condition: number | null;
  ask_price: number | null;
  new_price: number | null;
  story: string | null;
  since: number;
  created_at: string;
}
// Public shape returned to clients — flattens the snake_case columns and
// converts the SQLite integers to booleans where appropriate. This is what
// /api/admin/game and /api/items return.
export interface ItemOut {
  id: string;
  name: string;
  cat: string;
  brand?: string;
  price: number;
  lux: number;
  rate: number;
  art: string;
  c: string;
  rarity?: string;
  stock?: number | null;
  imageUrl?: string;
  isRare: boolean;
  isUsed: boolean;
  isSeed: boolean;
  baseId?: string;
  ageYears?: number;
  condition?: number;
  askPrice?: number;
  newPrice?: number;
  story?: string;
  since: number;
  createdAt: string;
}
function toItemOut(r: ItemRow): ItemOut {
  return {
    id: r.id,
    name: r.name,
    cat: r.cat,
    brand: r.brand ?? undefined,
    price: r.price,
    lux: r.lux,
    rate: r.rate,
    art: r.art,
    c: r.c,
    rarity: r.rarity ?? undefined,
    stock: r.stock == null ? null : r.stock,
    imageUrl: r.image_url ?? undefined,
    isRare: !!r.is_rare,
    isUsed: !!r.is_used,
    isSeed: !!r.is_seed,
    baseId: r.base_id ?? undefined,
    ageYears: r.age_years ?? undefined,
    condition: r.condition ?? undefined,
    askPrice: r.ask_price ?? undefined,
    newPrice: r.new_price ?? undefined,
    story: r.story ?? undefined,
    since: r.since,
    createdAt: r.created_at,
  };
}
// Seed every standard item, rare item, and used-market listing from the
// static JSON into the items table. INSERT OR IGNORE guarantees existing
// rows (admin-edited prices, custom fields, etc.) are never overwritten —
// making this safe to run on every server start.
function seedItemsFromJSON(d: Database.Database): void {
  const now = new Date().toISOString();
  // One shared prepared statement covers all three seed kinds. We pass
  // every column value as a bound parameter (no inline literals) so the
  // placeholder count cannot drift from the column count.
  const ins = d.prepare(`INSERT OR IGNORE INTO items
    (id, name, cat, brand, price, lux, rate, art, c, rarity, stock, image_url,
     is_rare, is_used, is_seed, base_id, age_years, condition, ask_price,
     new_price, story, since, created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const items = (itemsData as { items?: unknown[] }).items;
  const rareItems = (itemsData as { rareItems?: unknown[] }).rareItems;
  const usedMarket = (itemsData as { usedMarket?: unknown[] }).usedMarket;
  if (Array.isArray(items)) {
    for (const it of items as Array<{
      id: string; name: string; cat: string; brand?: string; price: number; lux: number; rate: number;
      art: string; c?: string; rarity?: string; stock?: number;
    }>) {
      ins.run(it.id, it.name, it.cat, it.brand ?? null, it.price, it.lux ?? 1, it.rate ?? 0,
        it.art ?? 'ic-bag', it.c ?? '#888888', it.rarity ?? null, it.stock ?? null, null,
        0, 0, 1, null, null, null, null, null, null, 1900, now);
    }
  }
  if (Array.isArray(rareItems)) {
    for (const it of rareItems as Array<{
      id: string; name: string; cat: string; brand?: string; price: number; lux: number; rate: number;
      art: string; c?: string; rarity?: string; stock?: number;
    }>) {
      ins.run(it.id, it.name, it.cat, it.brand ?? null, it.price, it.lux ?? 1, it.rate ?? 0,
        it.art ?? 'ic-bag', it.c ?? '#888888', it.rarity ?? null, it.stock ?? null, null,
        1, 0, 1, null, null, null, null, null, null, 1900, now);
    }
  }
  if (Array.isArray(usedMarket)) {
    for (const u of usedMarket as Array<{
      id: string; name: string; cat: string; brand?: string; price: number; lux: number; rate: number;
      art: string; c?: string; baseId: string; ageYears: number; condition: number; askPrice: number;
      newPrice: number; story: string; since: number;
    }>) {
      ins.run(u.id, u.name, u.cat, u.brand ?? null, u.askPrice, u.lux ?? 1, u.rate ?? 0,
        u.art ?? 'ic-bag', u.c ?? '#888888', null, null, null,
        0, 1, 1, u.baseId ?? null, u.ageYears ?? 0, u.condition ?? 100,
        u.askPrice, u.newPrice, u.story ?? '', u.since ?? 1900, now);
    }
  }
}
// Return ALL items from the DB, ordered so seed rows come first (by id) and
// admin-created rows come after (by created_at desc). The admin UI uses the
// createdAt field to bucket rows into the three legacy sections.
export function listAllItems(): ItemOut[] {
  return (db().prepare('SELECT * FROM items ORDER BY is_seed DESC, id ASC, created_at DESC').all() as ItemRow[]).map(toItemOut);
}
// Return a single item by id, or undefined if not present in the DB.
export function getItem(id: string): ItemOut | undefined {
  const r = db().prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined;
  return r ? toItemOut(r) : undefined;
}
// Insert or update an item. The caller controls whether the row is flagged
// as a seed (admins CAN overwrite seed rows via updateItem — that's the
// whole point — but new admin-created rows are never seeds). Returns the
// persisted row.
export interface UpsertItemInput {
  id: string;
  name: string;
  cat: string;
  brand?: string;
  price?: number;
  lux?: number;
  rate?: number;
  art?: string;
  c?: string;
  rarity?: string;
  stock?: number | null;
  imageUrl?: string;
  isRare?: boolean;
  isUsed?: boolean;
  baseId?: string;
  ageYears?: number;
  condition?: number;
  askPrice?: number;
  newPrice?: number;
  story?: string;
  since?: number;
}
export function upsertItem(input: UpsertItemInput): ItemOut {
  const d = db();
  const now = new Date().toISOString();
  const id = String(input.id || '').trim();
  if (!id) throw new Error('bad-id');
  const ex = d.prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined;
  // Preserve is_seed on update — admin edits to a seed row keep is_seed=1
  // so deleteItem still refuses to drop it. New admin rows get is_seed=0.
  const isSeed = ex ? ex.is_seed : 0;
  const isRare = input.isRare ? 1 : (ex ? ex.is_rare : 0);
  const isUsed = input.isUsed ? 1 : (ex ? ex.is_used : 0);
  const name = String(input.name ?? ex?.name ?? '').trim().slice(0, 60);
  const cat = String(input.cat ?? ex?.cat ?? 'Custom').trim().slice(0, 30);
  const brand = input.brand !== undefined ? (String(input.brand).trim().slice(0, 30) || null) : (ex?.brand ?? null);
  const price = Number.isFinite(Number(input.price)) ? Number(input.price) : (ex?.price ?? 1000);
  const lux = Number.isFinite(Number(input.lux)) ? Math.round(Number(input.lux)) : (ex?.lux ?? 1);
  const rate = Number.isFinite(Number(input.rate)) ? Number(input.rate) : (ex?.rate ?? 0);
  const art = String(input.art ?? ex?.art ?? 'ic-bag').trim().slice(0, 30) || 'ic-bag';
  const c = String(input.c ?? ex?.c ?? '#888888').trim().slice(0, 20) || '#888888';
  const rarity = input.rarity !== undefined ? (String(input.rarity).trim().slice(0, 20) || null) : (ex?.rarity ?? null);
  const stock = input.stock === undefined ? (ex?.stock ?? null) : (input.stock == null ? null : Math.max(0, Math.round(Number(input.stock))));
  const imageUrl = input.imageUrl !== undefined ? (String(input.imageUrl).trim().slice(0, 500) || null) : (ex?.image_url ?? null);
  const baseId = input.baseId !== undefined ? (String(input.baseId).trim().slice(0, 60) || null) : (ex?.base_id ?? null);
  const ageYears = input.ageYears !== undefined ? (Number.isFinite(Number(input.ageYears)) ? Math.max(0, Math.round(Number(input.ageYears))) : null) : (ex?.age_years ?? null);
  const condition = input.condition !== undefined ? (Number.isFinite(Number(input.condition)) ? Math.max(0, Math.min(100, Math.round(Number(input.condition)))) : null) : (ex?.condition ?? null);
  const askPrice = input.askPrice !== undefined ? (Number.isFinite(Number(input.askPrice)) ? Number(input.askPrice) : null) : (ex?.ask_price ?? null);
  const newPrice = input.newPrice !== undefined ? (Number.isFinite(Number(input.newPrice)) ? Number(input.newPrice) : null) : (ex?.new_price ?? null);
  const story = input.story !== undefined ? (String(input.story).trim().slice(0, 280) || null) : (ex?.story ?? null);
  const since = Number.isFinite(Number(input.since)) ? Math.round(Number(input.since)) : (ex?.since ?? 1900);
  const createdAt = ex?.created_at ?? now;
  d.prepare(`INSERT INTO items (id, name, cat, brand, price, lux, rate, art, c, rarity, stock, image_url,
        is_rare, is_used, is_seed, base_id, age_years, condition, ask_price, new_price, story, since, created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, cat=excluded.cat, brand=excluded.brand, price=excluded.price,
          lux=excluded.lux, rate=excluded.rate, art=excluded.art, c=excluded.c, rarity=excluded.rarity,
          stock=excluded.stock, image_url=excluded.image_url, is_rare=excluded.is_rare, is_used=excluded.is_used,
          base_id=excluded.base_id, age_years=excluded.age_years, condition=excluded.condition,
          ask_price=excluded.ask_price, new_price=excluded.new_price, story=excluded.story, since=excluded.since`)
    .run(id, name, cat, brand, price, lux, rate, art, c, rarity, stock, imageUrl,
      isRare, isUsed, isSeed, baseId, ageYears, condition, askPrice, newPrice, story, since, createdAt);
  return toItemOut(d.prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow);
}
// Delete an item by id. Returns true on success, false if the row was a
// seed (admin-created rows are the only ones deletable — seed rows are
// protected so the catalogue stays intact; admins edit instead). Throws
// if the row doesn't exist.
export function deleteItem(id: string): boolean {
  const d = db();
  const r = d.prepare('SELECT is_seed FROM items WHERE id = ?').get(String(id)) as { is_seed: number } | undefined;
  if (!r) throw new Error('not-found');
  if (r.is_seed) return false;
  d.prepare('DELETE FROM items WHERE id = ?').run(String(id));
  return true;
}

// ---------------------------------------------------------------- validation
const UID_RE = /^[A-Za-z0-9_-]{6,64}$/;
export const validUid = (u: unknown): u is string => typeof u === 'string' && UID_RE.test(u);
export const clampStr = (v: unknown, n: number): string =>
  String(typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, n);
export const clampEmoji = (v: unknown): string => {
  const s = clampStr(v, 8);
  return s.length ? s : '🐯';
};
export const clampAmount = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1e15, n)) : 0;
};
const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : lo;
};

// unique player code — no I/O/0/1, read-aloud safe (mirrors client genCode)
const CODE_RE = /^HB-[A-HJ-NP-Z2-9]{6}$/;
export const validCode = (c: unknown): c is string => typeof c === 'string' && CODE_RE.test(c);
function genCode(): string {
  const CH = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (let tries = 0; tries < 8; tries++) {
    let s = 'HB-';
    for (let i = 0; i < 6; i++) s += CH[Math.floor(Math.random() * CH.length)];
    if (!db().prepare('SELECT 1 FROM players WHERE code = ?').get(s)) return s;
  }
  return 'HB-' + Date.now().toString(36).toUpperCase().slice(-6);
}

// ---------------------------------------------------------------- client shapes
// v11.27 — the client (social.ts) types ids as strings; serialize once here so
// every route returns browser-ready shapes (SocPlayer / SocMsg / SocEdge / SocGift).
export const pubPlayer = (r: PlayerRow) => ({ id: r.id, code: r.code, name: r.name, avatar: r.avatar, level: r.level, nw: r.nw, ts: r.ts });
export const pubMsg = (r: MsgRow) => ({ id: String(r.id), uid: r.uid, name: r.name, avatar: r.avatar, text: r.text, ts: Date.parse(r.created_at) || 0 });
export const pubEdge = (r: EdgeRow) => ({ id: String(r.id), a: r.a, b: r.b, status: r.status === 'accepted' ? 'accepted' : 'pending' as const, ts: r.ts });
export const pubGift = (r: GiftRow, fromName?: string) => ({
  id: String(r.id), from: r.from_uid, to: r.to_uid, amount: r.amount,
  note: r.note || '', claimed: !!r.claimed, ts: r.ts, fromName: fromName ?? '???',
});

// ---------------------------------------------------------------- players
export function upsertPlayer(uid: string, patch: { name?: string; avatar?: string; level?: number; nw?: number }): ReturnType<typeof pubPlayer> {
  const d = db();
  const now = Date.now();
  const ex = d.prepare('SELECT * FROM players WHERE id = ?').get(uid) as PlayerRow | undefined;
  if (!ex) {
    d.prepare('INSERT INTO players (id, code, name, avatar, level, nw, ts, last_seen) VALUES (?,?,?,?,?,?,?,?)')
      .run(uid, genCode(), clampStr(patch.name, 24) || 'HuyenBao', clampEmoji(patch.avatar), clampInt(patch.level, 1, 999), clampAmount(patch.nw), now, now);
  } else {
    d.prepare('UPDATE players SET name=?, avatar=?, level=?, nw=?, ts=?, last_seen=? WHERE id=?')
      .run(patch.name !== undefined ? (clampStr(patch.name, 24) || ex.name) : ex.name,
        patch.avatar !== undefined ? clampEmoji(patch.avatar) : ex.avatar,
        patch.level !== undefined ? clampInt(patch.level, 1, 999) : ex.level,
        patch.nw !== undefined ? clampAmount(patch.nw) : ex.nw,
        now, now, uid);
  }
  return pubPlayer(d.prepare('SELECT * FROM players WHERE id = ?').get(uid) as PlayerRow);
}
export const getPlayer = (uid: string): ReturnType<typeof pubPlayer> | undefined =>
  (db().prepare('SELECT * FROM players WHERE id = ?').get(uid) as PlayerRow | undefined);
export const getPlayerByCode = (code: string): ReturnType<typeof pubPlayer> | undefined =>
  (db().prepare('SELECT * FROM players WHERE code = ?').get(code) as PlayerRow | undefined);
export const touchSeen = (uid: string): void => {
  db().prepare('UPDATE players SET last_seen = ? WHERE id = ?').run(Date.now(), uid);
};
export const ONLINE_MS = 13000; // mirrors the demo/supabase presence windows
export function onlinePlayers(): ReturnType<typeof pubPlayer>[] {
  return (db().prepare('SELECT * FROM players WHERE last_seen > ? ORDER BY nw DESC LIMIT 100')
    .all(Date.now() - ONLINE_MS) as PlayerRow[]).map(pubPlayer);
}
export function topPlayers(limit = 50): ReturnType<typeof pubPlayer>[] {
  return (db().prepare('SELECT * FROM players ORDER BY nw DESC, ts DESC LIMIT ?').all(limit) as PlayerRow[]).map(pubPlayer);
}
export function profilesOf(ids: string[]): Record<string, ReturnType<typeof pubPlayer>> {
  const out: Record<string, ReturnType<typeof pubPlayer>> = {};
  const uniq = [...new Set(ids)].filter(validUid);
  const st = db().prepare('SELECT * FROM players WHERE id = ?');
  for (const id of uniq) { const r = st.get(id) as PlayerRow | undefined; if (r) out[id] = pubPlayer(r); }
  return out;
}

// ---------------------------------------------------------------- messages
export function listMessages(limit = 80): ReturnType<typeof pubMsg>[] {
  const rows = db().prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?').all(limit) as MsgRow[];
  return rows.reverse().map(pubMsg);
}
export type InsertResult = { ok: true; row: ReturnType<typeof pubMsg> } | { ok: false; flood: true } | { ok: false; banned: true };
export function insertMessage(uid: string, text: string): InsertResult {
  const d = db();
  const p = getPlayer(uid);
  const bannedRow = d.prepare('SELECT banned FROM players WHERE id = ?').get(uid) as { banned?: number } | undefined;
  if (bannedRow?.banned) return { ok: false, banned: true };
  const last = d.prepare('SELECT created_at FROM messages WHERE uid = ? ORDER BY id DESC LIMIT 1').get(uid) as { created_at: string } | undefined;
  if (last && Date.now() - Date.parse(last.created_at) < 1200) return { ok: false, flood: true };
  const info = d.prepare('INSERT INTO messages (uid, name, avatar, text, created_at) VALUES (?,?,?,?,?)')
    .run(uid, clampStr(p?.name, 24) || '???', clampEmoji(p?.avatar), clampStr(text, 280), new Date().toISOString());
  return { ok: true, row: pubMsg(d.prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid) as MsgRow) };
}

// ---------------------------------------------------------------- friends
export function edgesFor(uid: string): ReturnType<typeof pubEdge>[] {
  return (db().prepare('SELECT * FROM friend_edges WHERE a = ? OR b = ? ORDER BY id DESC LIMIT 200').all(uid, uid) as EdgeRow[]).map(pubEdge);
}
export function edgeBetween(a: string, b: string): EdgeRow | undefined {
  return db().prepare('SELECT * FROM friend_edges WHERE (a=? AND b=?) OR (a=? AND b=?)').get(a, b, b, a) as EdgeRow | undefined;
}
export function addEdge(a: string, b: string): void {
  db().prepare('INSERT INTO friend_edges (a, b, status, ts) VALUES (?,?,?,?)').run(a, b, 'pending', Date.now());
}
export function acceptEdge(id: number): void {
  db().prepare("UPDATE friend_edges SET status='accepted' WHERE id = ?").run(id);
}
export function deleteEdge(id: number): void {
  db().prepare('DELETE FROM friend_edges WHERE id = ?').run(id);
}
export function removeFriendship(uid: string, other: string): void {
  db().prepare('DELETE FROM friend_edges WHERE (a=? AND b=?) OR (a=? AND b=?)').run(uid, other, other, uid);
}

// ---------------------------------------------------------------- gifts
export function giftsFor(uid: string, limit = 40): ReturnType<typeof pubGift>[] {
  const rows = db().prepare('SELECT * FROM gifts WHERE from_uid = ? OR to_uid = ? ORDER BY id DESC LIMIT ?').all(uid, uid, limit) as GiftRow[];
  const names = profilesOf(rows.map(r => r.from_uid));
  // v11.35 — system gifts (from ADMIN_SYS_UID) have no player row; default to
  // 'HuyenBao 📢' so the recipient sees a clean sender name.
  return rows.map(r => pubGift(r, r.from_uid === ADMIN_SYS_UID ? 'HuyenBao 📢' : names[r.from_uid]?.name));
}
export function insertGift(fromUid: string, toUid: string, amount: number, note: string): ReturnType<typeof pubGift> | { banned: true } {
  const bannedRow = db().prepare('SELECT banned FROM players WHERE id = ?').get(fromUid) as { banned?: number } | undefined;
  if (bannedRow?.banned) return { banned: true };
  const info = db().prepare('INSERT INTO gifts (from_uid, to_uid, amount, note, claimed, ts) VALUES (?,?,?,?,0,?)')
    .run(fromUid, toUid, clampAmount(amount), clampStr(note, 120) || null, Date.now());
  const row = db().prepare('SELECT * FROM gifts WHERE id = ?').get(info.lastInsertRowid) as GiftRow;
  return pubGift(row, profilesOf([fromUid])[fromUid]?.name);
}
export function claimGift(id: number, uid: string): boolean {
  const r = db().prepare('UPDATE gifts SET claimed = 1 WHERE id = ? AND to_uid = ? AND claimed = 0').run(id, uid);
  return r.changes > 0;
}

// ---------------------------------------------------------------- v11.29 admin control
export interface AdminPlayerRow {
  id: string; code: string; name: string; avatar: string; level: number; nw: number;
  ts: number; last_seen: number; banned: number;
}
export function listPlayersAdmin(q: string, limit = 200): AdminPlayerRow[] {
  const like = '%' + q.replace(/[%_]/g, '').trim() + '%';
  const rows = like === '%%'
    ? db().prepare('SELECT * FROM players ORDER BY last_seen DESC LIMIT ?').all(limit) as AdminPlayerRow[]
    : db().prepare('SELECT * FROM players WHERE name LIKE ? OR code LIKE ? ORDER BY last_seen DESC LIMIT ?').all(like, like, limit) as AdminPlayerRow[];
  return rows;
}
export function adminUpdatePlayer(uid: string, patch: { name?: string; avatar?: string; level?: number; nw?: number }): ReturnType<typeof pubPlayer> | undefined {
  const ex = db().prepare('SELECT * FROM players WHERE id = ?').get(uid) as PlayerRow | undefined;
  if (!ex) return undefined;
  db().prepare('UPDATE players SET name=?, avatar=?, level=?, nw=? WHERE id=?')
    .run(patch.name !== undefined ? (clampStr(patch.name, 24) || ex.name) : ex.name,
      patch.avatar !== undefined ? clampEmoji(patch.avatar) : ex.avatar,
      patch.level !== undefined ? clampInt(patch.level, 1, 999) : ex.level,
      patch.nw !== undefined ? clampAmount(patch.nw) : ex.nw,
      uid);
  return pubPlayer(db().prepare('SELECT * FROM players WHERE id = ?').get(uid) as PlayerRow);
}
export function adminSetBanned(uid: string, banned: boolean): boolean {
  const r = db().prepare('UPDATE players SET banned = ? WHERE id = ?').run(banned ? 1 : 0, uid);
  return r.changes > 0;
}
export function adminDeletePlayer(uid: string): void {
  const d = db();
  d.prepare('DELETE FROM players WHERE id = ?').run(uid);
  d.prepare('DELETE FROM messages WHERE uid = ?').run(uid);
  d.prepare('DELETE FROM friend_edges WHERE a = ? OR b = ?').run(uid, uid);
  d.prepare('DELETE FROM gifts WHERE from_uid = ? OR to_uid = ?').run(uid, uid);
}
export function adminListMessages(limit = 120): ReturnType<typeof pubMsg>[] {
  return (db().prepare('SELECT * FROM messages ORDER BY id DESC LIMIT ?').all(limit) as MsgRow[]).map(pubMsg);
}
export function adminDeleteMessage(id: number): boolean {
  return db().prepare('DELETE FROM messages WHERE id = ?').run(id).changes > 0;
}
export function adminDeleteMessagesByUser(uid: string): number {
  return db().prepare('DELETE FROM messages WHERE uid = ?').run(uid).changes;
}
export const ADMIN_SYS_UID = 'hb-system';
export function adminBroadcast(text: string): ReturnType<typeof pubMsg> {
  const info = db().prepare('INSERT INTO messages (uid, name, avatar, text, created_at) VALUES (?,?,?,?,?)')
    .run(ADMIN_SYS_UID, 'HuyenBao', '📢', clampStr(text, 280), new Date().toISOString());
  return pubMsg(db().prepare('SELECT * FROM messages WHERE id = ?').get(info.lastInsertRowid) as MsgRow);
}
export function adminListGifts(limit = 100): ReturnType<typeof pubGift>[] {
  const rows = db().prepare('SELECT * FROM gifts ORDER BY id DESC LIMIT ?').all(limit) as GiftRow[];
  const names = profilesOf(rows.map(r => r.from_uid));
  // v11.35 — system gifts (from ADMIN_SYS_UID) have no player row; default the
  // sender display name to 'HuyenBao 📢' so the admin log reads cleanly.
  return rows.map(r => pubGift(r, r.from_uid === ADMIN_SYS_UID ? 'HuyenBao 📢' : names[r.from_uid]?.name));
}
export function adminDeleteGift(id: number): boolean {
  return db().prepare('DELETE FROM gifts WHERE id = ?').run(id).changes > 0;
}
export function adminVacuum(): void {
  db().exec('VACUUM');
}
export function adminClearMessages(): number {
  const n = (db().prepare('SELECT COUNT(*) AS n FROM messages').get() as { n: number }).n;
  db().exec('DELETE FROM messages');
  db().exec("DELETE FROM sqlite_sequence WHERE name='messages'");
  return n;
}

// ---------------------------------------------------------------- v11.35 — comprehensive game control
export function adminSendGift(toUidOrCode: string, amount: number, note: string): ReturnType<typeof pubGift> | null {
  const d = db();
  const recipient = d.prepare('SELECT * FROM players WHERE id = ? OR code = ?').get(toUidOrCode, toUidOrCode) as PlayerRow | undefined;
  if (!recipient) return null;
  const info = d.prepare('INSERT INTO gifts (from_uid, to_uid, amount, note, claimed, ts) VALUES (?,?,?,?,0,?)')
    .run(ADMIN_SYS_UID, recipient.id, clampAmount(amount), clampStr(note, 120) || null, Date.now());
  const row = d.prepare('SELECT * FROM gifts WHERE id = ?').get(info.lastInsertRowid) as GiftRow;
  return pubGift(row, 'HuyenBao 📢');
}

export function adminResetLeaderboard(): number {
  const r = db().prepare('UPDATE players SET nw = 0, level = 1').run();
  return r.changes;
}

export function adminTopPlayers(limit = 50): { code: string; name: string; avatar: string; nw: number; level: number; last_seen: number }[] {
  const n = Math.min(500, Math.max(1, Math.round(limit)));
  return (db().prepare('SELECT code, name, avatar, nw, level, last_seen FROM players ORDER BY nw DESC, ts DESC LIMIT ?').all(n) as (PlayerRow & { last_seen: number })[])
    .map(p => ({ code: p.code, name: p.name, avatar: p.avatar, nw: p.nw, level: p.level, last_seen: p.last_seen }));
}

export interface AdminSystemInfo {
  ok: true; ts: number;
  node: string; platform: string; arch: string;
  uptimeSec: number; pid: number;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number; externalMb: number };
  env: { adminKeySet: boolean; socialDbPath: string; basePath: string; port: string };
  db: { path: string; bytes: number; walBytes: number; shmBytes: number };
  packageVersion: string;
}
export function adminSystemInfo(): AdminSystemInfo {
  const mem = process.memoryUsage();
  const dbPath = DB_PATH;
  const dbBytes = fs.existsSync(dbPath) ? fs.statSync(dbPath).size : 0;
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  const walBytes = fs.existsSync(walPath) ? fs.statSync(walPath).size : 0;
  const shmBytes = fs.existsSync(shmPath) ? fs.statSync(shmPath).size : 0;
  let packageVersion = 'unknown';
  try {
    const pj = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as { version?: string };
    if (typeof pj.version === 'string') packageVersion = pj.version;
  } catch { /* ignore */ }
  return {
    ok: true,
    ts: Date.now(),
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptimeSec: Math.round(process.uptime()),
    pid: process.pid,
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      externalMb: Math.round(mem.external / 1024 / 1024),
    },
    env: {
      adminKeySet: !!process.env.ADMIN_KEY,
      socialDbPath: dbPath,
      basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
      port: process.env.PORT || '3334',
    },
    db: { path: dbPath, bytes: dbBytes, walBytes, shmBytes },
    packageVersion,
  };
}

// ---------------------------------------------------------------- admin stats
export interface AdminStats {
  ok: true; ts: number; dbPath: string; dbBytes: number;
  players: number; banned: number; online: number; messages: number; messages24h: number;
  gifts: number; gifts24h: number; edges: number; acceptedEdges: number;
  top: { code: string; name: string; avatar: string; nw: number; level: number }[];
}
export function adminStats(): AdminStats {
  const d = db();
  const dayAgo = Date.now() - 86_400_000;
  const count = (sql: string, ...args: (string | number)[]): number =>
    (d.prepare(sql).get(...args) as { n: number }).n;
  const dbBytes = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH).size : 0;
  return {
    ok: true,
    ts: Date.now(),
    dbPath: DB_PATH,
    dbBytes,
    players: count('SELECT COUNT(*) AS n FROM players'),
    banned: count('SELECT COUNT(*) AS n FROM players WHERE banned = 1'),
    online: onlinePlayers().length,
    messages: count('SELECT COUNT(*) AS n FROM messages'),
    messages24h: count('SELECT COUNT(*) AS n FROM messages WHERE created_at > ?', new Date(dayAgo).toISOString()),
    gifts: count('SELECT COUNT(*) AS n FROM gifts'),
    gifts24h: count('SELECT COUNT(*) AS n FROM gifts WHERE ts > ?', dayAgo),
    edges: count('SELECT COUNT(*) AS n FROM friend_edges'),
    acceptedEdges: count("SELECT COUNT(*) AS n FROM friend_edges WHERE status='accepted'"),
    top: topPlayers(10).map(p => ({ code: p.code, name: p.name, avatar: p.avatar, nw: p.nw, level: p.level })),
  };
}

// ---------------------------------------------------------------- v14 — admin actions queue
// The admin dashboard records game-mutation actions here (setSavings,
// grantBranch, setGigPay, …) instead of trying to mutate a player's
// LocalStorage save directly (which the server can't reach). Each row is a
// single action addressed to either a specific player uid or to everyone
// (target_uid='hb-broadcast'). The recipient client polls /api/social/ping
// every 60s; the response includes its pending actions. The client applies
// each via applyAdminActions(), then acks the row (sets applied_at) so the
// next poll doesn't re-deliver it. Gig-config actions (setGigPay, setGigCd,
// resetGigs) are broadcast — every player applies them so the override is
// consistent across the community.
export interface AdminActionRow {
  id: number;
  target_uid: string;
  action: string;
  payload: string; // JSON object { uid?, amount?, bizId?, ... }
  created_at: string;
  applied_at: number | null;
}
export interface AdminActionOut {
  id: string;
  targetUid: string;
  action: string;
  payload: Record<string, unknown>;
  ts: number;
}
// v14 — sentinel uid for broadcast actions (every player picks them up).
export const ADMIN_BROADCAST_UID = 'hb-broadcast';
// v14 — record a new admin action. targetUid may be a player uid, an HB-code
// (resolved to a uid by the caller), or ADMIN_BROADCAST_UID. payload is a
// JSON-serialisable object carrying the action's parameters (amount, bizId,
// count, etc). Returns the serialised row the client will receive.
export function insertAdminAction(targetUid: string, action: string, payload: Record<string, unknown>): AdminActionOut {
  const d = db();
  const t = (targetUid || '').trim() || ADMIN_BROADCAST_UID;
  const a = String(action || '').slice(0, 40);
  const p = JSON.stringify(payload || {});
  const info = d.prepare('INSERT INTO admin_actions (target_uid, action, payload, created_at) VALUES (?,?,?,?)')
    .run(t, a, p, new Date().toISOString());
  const row = d.prepare('SELECT * FROM admin_actions WHERE id = ?').get(info.lastInsertRowid) as AdminActionRow;
  return { id: String(row.id), targetUid: row.target_uid, action: row.action, payload: JSON.parse(row.payload || '{}') as Record<string, unknown>, ts: Date.parse(row.created_at) || 0 };
}
// v14 — list unapplied actions addressed to `uid` OR to the broadcast
// sentinel. Returns oldest-first so the client applies them in order. The
// payload is parsed back to an object the engine's applyAdminActions can
// consume directly.
export function listPendingAdminActions(uid: string, limit = 50): AdminActionOut[] {
  const u = (uid || '').trim();
  if (!u) return [];
  const rows = db().prepare(
    'SELECT * FROM admin_actions WHERE applied_at IS NULL AND (target_uid = ? OR target_uid = ?) ORDER BY id ASC LIMIT ?'
  ).all(u, ADMIN_BROADCAST_UID, Math.max(1, Math.min(200, limit))) as AdminActionRow[];
  return rows.map(r => ({ id: String(r.id), targetUid: r.target_uid, action: r.action, payload: JSON.parse(r.payload || '{}') as Record<string, unknown>, ts: Date.parse(r.created_at) || 0 }));
}
// v14 — mark an action as applied. Only the targeted recipient (or anyone,
// for broadcast actions) may ack it. We DON'T verify the acker's identity
// here beyond requiring a non-empty uid — the action payload itself is the
// source of truth, and applyAdminActions guards against uid mismatch. This
// just prevents re-delivery on the next poll.
export function ackAdminAction(id: number, uid: string): boolean {
  const u = (uid || '').trim();
  if (!u) return false;
  const r = db().prepare('UPDATE admin_actions SET applied_at = ? WHERE id = ? AND applied_at IS NULL').run(Date.now(), id);
  return r.changes > 0;
}
// v14 — admin-side: list ALL recent admin actions (applied + pending) for
// the dashboard's audit log. Returns newest-first.
export function adminListActions(limit = 100): AdminActionOut[] {
  const rows = db().prepare('SELECT * FROM admin_actions ORDER BY id DESC LIMIT ?').all(Math.max(1, Math.min(500, limit))) as AdminActionRow[];
  return rows.map(r => ({ id: String(r.id), targetUid: r.target_uid, action: r.action, payload: JSON.parse(r.payload || '{}') as Record<string, unknown>, ts: Date.parse(r.created_at) || 0 }));
}

export function saveGameState(uid: string, data: string): boolean {
  try {
    db().prepare('INSERT INTO game_saves (uid, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at').run(uid, data, Date.now());
    return true;
  } catch { return false; }
}
export function getGameState(uid: string): { data: string; updated_at: number } | undefined {
  try {
    const r = db().prepare('SELECT data, updated_at FROM game_saves WHERE uid=?').get(uid) as { data: string; updated_at: number } | undefined;
    return r || undefined;
  } catch { return undefined; }
}
