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
  `);
  // v11.29 — migration: the banned flag arrived after the first release of
  // this schema; ALTER it in for older database files.
  const cols = (d.prepare('PRAGMA table_info(players)').all() as { name: string }[]).map(c => c.name);
  if (!cols.includes('banned')) d.exec('ALTER TABLE players ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
  _db = d;
  return d;
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
  return rows.map(r => pubGift(r, names[r.from_uid]?.name));
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
  return rows.map(r => pubGift(r, names[r.from_uid]?.name));
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
