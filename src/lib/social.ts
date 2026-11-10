'use client';
// v11.25 — player-to-player community layer.
//
// Two backends behind one tiny API:
//   • 'supabase' — real cross-device multiplayer. Used when
//     NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY are set at
//     build time. Anonymous auth gives every browser a stable auth.uid();
//     RLS (see /hb-supabase-schema.sql) scopes every write to its owner.
//   • 'demo'     — zero-config fallback used by the GitHub Pages static
//     build. Persists to localStorage and syncs across tabs of the SAME
//     device via BroadcastChannel, so two tabs can chat / befriend / gift
//     each other. Lets anyone try the feature before wiring Supabase.
//
// The provider is a module singleton (like store.ts); React subscribes via
// useSyncExternalStore and re-renders on a monotonically increasing version.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { netWorth, type GameState } from './engine';
import { useT } from './i18n';

// v11.27 — the Supabase JS client is loaded from the CDN at runtime (see
// getSb) instead of being bundled. The npm dependency broke self-hosted
// builds whenever node_modules was incomplete — VPS report:
// "Module not found: Can't resolve '@supabase/supabase-js'". SQLite and
// demo deployments never load it at all.
type SbClient = any; // structural any — the real client arrives from the CDN at runtime

// ---------------------------------------------------------------- types
export interface SocPlayer { id: string; code: string; name: string; avatar: string; level: number; nw: number; ts: number }
export interface SocMsg { id: string; uid: string; name: string; avatar: string; text: string; ts: number }
export interface SocEdge { id: string; a: string; b: string; status: 'pending' | 'accepted'; ts: number }
export interface SocGift { id: string; from: string; to: string; amount: number; note: string; claimed: boolean; ts: number; fromName: string }
export type SocMode = 'supabase' | 'sqlite' | 'demo';

export const SOC_AVATARS = ['🐯', '🦊', '🐼', '🦁', '🐸', '🐧', '🦉', '🐙', '🦋', '🐢', '🌻', '🍀'];
export const SOC_MSG_MAX = 280;
export const SOC_GIFT_MAX = 1e15;

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// v11.27 — NEXT_PUBLIC_SOCIAL_BACKEND=sqlite forces the self-hosted backend
// without a probe; by default demo mode probes /api/social/ping ONCE at init
// and upgrades itself to sqlite when a real server answers (zero-config VPS
// deploy — no env vars needed on the VPS at all).
const SQLITE_HINT = process.env.NEXT_PUBLIC_SOCIAL_BACKEND === 'sqlite';
export let socialMode: SocMode = URL_ENV && KEY_ENV ? 'supabase' : SQLITE_HINT ? 'sqlite' : 'demo';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const asset = (p: string) => BASE + p;

// identity/profile storage (shared by both modes so switching modes keeps name+avatar)
const PKEY = 'hb_soc_profile_v1';
interface LocalProfile { name: string; avatar: string }

// ---------------------------------------------------------------- shared helpers
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no I/O/0/1 — unambiguous when read aloud
function genCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return 'HB-' + s;
}
function loadProfile(): LocalProfile | null {
  try { const r = localStorage.getItem(PKEY); return r ? JSON.parse(r) as LocalProfile : null; } catch { return null; }
}
function saveProfile(p: LocalProfile) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* ignore */ } }
const clamp = (s: string, n: number) => s.replace(/\s+/g, ' ').trim().slice(0, n);
const seenKey = 'hb_soc_seen_v1';
function loadSeen(): Set<string> {
  try { const r = localStorage.getItem(seenKey); return new Set(r ? JSON.parse(r) as string[] : []); } catch { return new Set(); }
}
function saveSeen(seen: Set<string>) {
  try { localStorage.setItem(seenKey, JSON.stringify([...seen].slice(-200))); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- provider state (observable)
interface SocState {
  ready: boolean;
  error: string | null;
  me: SocPlayer | null;
  messages: SocMsg[];
  online: SocPlayer[];
  board: SocPlayer[];
  edges: SocEdge[];
  people: Record<string, SocPlayer>;
  gifts: SocGift[];
}
const st: SocState = { ready: false, error: null, me: null, messages: [], online: [], board: [], edges: [], people: {}, gifts: [] };
let ver = 0;
const subs = new Set<() => void>();
function bump() { ver++; subs.forEach(f => f()); }
export function socSubscribe(cb: () => void) { subs.add(cb); return () => { subs.delete(cb); }; }
export function socSnapshot() { return ver; }
function indexPeople(list: (SocPlayer | null)[]) {
  for (const p of list) if (p) st.people[p.id] = p;
}
function edgeOther(e: SocEdge, me: string) { return e.a === me ? e.b : e.a; }

// ================================================================ DEMO PROVIDER
const DKEY = 'hb_soc_demo_v1';
const MKEY = 'hb_soc_me_v1';
interface DemoDB { players: Record<string, SocPlayer>; msgs: SocMsg[]; edges: SocEdge[]; gifts: SocGift[]; seq: number }
function loadDB(): DemoDB {
  try { const r = localStorage.getItem(DKEY); if (r) return JSON.parse(r) as DemoDB; } catch { /* ignore */ }
  return { players: {}, msgs: [], edges: [], gifts: [], seq: 1 };
}
let db: DemoDB | null = null;
let meId: string | null = null;
let bc: BroadcastChannel | null = null;
const demoOnline = new Map<string, { p: SocPlayer; ts: number }>();
let heartbeatIv: ReturnType<typeof setInterval> | null = null;

function demoSave() { try { localStorage.setItem(DKEY, JSON.stringify(db)); } catch { /* ignore */ } }
function demoBroadcast() { try { bc?.postMessage({ k: 'db' }); } catch { /* ignore */ } }
function ensureBc(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  if (!bc) {
    try {
      bc = new BroadcastChannel('hb-social');
      bc.onmessage = ev => {
        const m = ev.data as { k?: string; p?: SocPlayer };
        if (m.k === 'db') { db = loadDB(); demoRefreshFromDB(); }
        else if (m.k === 'hb' && m.p) {
          demoOnline.set(m.p.id, { p: m.p, ts: Date.now() });
          st.online = [...demoOnline.values()].filter(x => Date.now() - x.ts < 13000).map(x => x.p);
          bump();
        }
      };
    } catch { bc = null; }
  }
  return bc;
}
function demoRefreshFromDB() {
  const d = db;
  if (!d) return;
  const me = st.me;
  st.messages = [...d.msgs].slice(-80);
  st.edges = me ? d.edges.filter(e => e.a === me.id || e.b === me.id) : [];
  st.gifts = me ? [...d.gifts].filter(g => g.from === me.id || g.to === me.id).sort((x, y) => y.id.localeCompare(x.id)).slice(0, 40) : [];
  st.board = Object.values(d.players).sort((a, b) => b.nw - a.nw).slice(0, 50);
  const ids = new Set<string>();
  if (me) {
    st.edges.forEach(e => ids.add(edgeOther(e, me.id)));
    st.gifts.forEach(g => ids.add(g.from));
    ids.add(me.id);
  }
  indexPeople([...ids].map(id => d.players[id] ?? null));
  bump();
}
function demoSweep() {
  if (demoOnline.size) {
    const now = Date.now();
    let changed = false;
    for (const [id, x] of demoOnline) if (now - x.ts > 13000) { demoOnline.delete(id); changed = true; }
    if (changed) {
      st.online = [...demoOnline.values()].map(x => x.p);
      bump();
    }
  }
}
const demo = {
  async init(displayName: string) {
    db = loadDB();
    ensureBc();
    // own identity — per TAB (sessionStorage), not per browser. This is what
    // makes the demo usable: two tabs on the same device are TWO players
    // (tab 1 chats/gifts with tab 2). localStorage is shared across tabs and
    // would collapse them into one identity, so there is deliberately NO
    // localStorage fallback here.
    if (!meId) {
      try {
        const raw = sessionStorage.getItem(MKEY);
        if (raw) meId = (JSON.parse(raw) as { id: string }).id;
      } catch { meId = null; }
    }
    if (!meId) {
      meId = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    }
    try { sessionStorage.setItem(MKEY, JSON.stringify({ id: meId })); } catch { /* ignore */ }
    const prof = loadProfile();
    const existing = db.players[meId];
    st.me = existing
      ? { ...existing, name: prof?.name || existing.name, avatar: prof?.avatar || existing.avatar, ts: Date.now() }
      : { id: meId, code: genCode(), name: prof?.name || displayName || 'HuyenBao', avatar: prof?.avatar || '🐯', level: 1, nw: 0, ts: Date.now() };
    if (prof) saveProfile({ name: st.me.name, avatar: st.me.avatar });
    db.players[meId] = st.me;
    demoSave();
    st.ready = true; st.error = null;
    demoRefreshFromDB();
    demoBroadcast();
    // presence heartbeat so the other tab sees this one online. BroadcastChannel
    // does NOT echo to the sender, so this tab keeps its own entry alive here.
    if (st.me) { demoOnline.set(st.me.id, { p: { ...st.me }, ts: Date.now() }); st.online = [...demoOnline.values()].map(x => x.p); }
    const beat = () => st.me && ensureBc()?.postMessage({ k: 'hb', p: { ...st.me, ts: Date.now() } });
    beat();
    if (!heartbeatIv) heartbeatIv = setInterval(() => {
      if (st.me) demoOnline.set(st.me.id, { p: { ...st.me }, ts: Date.now() });
      beat();
      demoSweep();
      if (st.me) { st.online = [...demoOnline.values()].map(x => x.p); bump(); }
    }, 4000);
  },
  async updateProfile(name: string, avatar: string) {
    if (!st.me || !db) return;
    st.me.name = clamp(name, 24) || st.me.name;
    st.me.avatar = avatar;
    saveProfile({ name: st.me.name, avatar });
    db.players[st.me.id] = { ...st.me };
    demoSave(); demoBroadcast(); demoRefreshFromDB();
  },
  async pushStats(level: number, nw: number) {
    if (!st.me || !db) return;
    st.me.level = level; st.me.nw = nw; st.me.ts = Date.now();
    db.players[st.me.id] = { ...st.me };
    demoSave(); demoBroadcast(); demoRefreshFromDB();
  },
  async send(text: string) {
    if (!st.me || !db || !text.trim()) return false;
    db.seq += 1;
    db.msgs.push({ id: String(db.seq), uid: st.me.id, name: st.me.name, avatar: st.me.avatar, text: clamp(text, SOC_MSG_MAX), ts: Date.now() });
    db.msgs = db.msgs.slice(-80);
    demoSave(); demoBroadcast(); demoRefreshFromDB();
    return true;
  },
  async addFriendByCode(raw: string): Promise<'sent' | 'auto' | 'exists' | 'self' | 'notfound' | 'fail'> {
    if (!st.me || !db) return 'fail';
    const code = raw.trim().toUpperCase();
    if (!code || code === st.me.code) return 'self';
    const target = Object.values(db.players).find(p => p.code === code);
    if (!target) return 'notfound';
    if (target.id === st.me.id) return 'self';
    const ex = db.edges.find(e => (e.a === st.me!.id && e.b === target.id) || (e.a === target.id && e.b === st.me!.id));
    if (ex) {
      if (ex.status === 'accepted' || ex.a === st.me.id) return 'exists';
      ex.status = 'accepted';
      demoSave(); demoBroadcast(); demoRefreshFromDB();
      return 'auto';
    }
    db.seq += 1;
    db.edges.push({ id: String(db.seq), a: st.me.id, b: target.id, status: 'pending', ts: Date.now() });
    demoSave(); demoBroadcast(); demoRefreshFromDB();
    return 'sent';
  },
  async respondEdge(id: string, accept: boolean) {
    if (!db) return;
    const e = db.edges.find(x => x.id === id);
    if (!e) return;
    if (accept) e.status = 'accepted';
    else db.edges = db.edges.filter(x => x.id !== id);
    demoSave(); demoBroadcast(); demoRefreshFromDB();
  },
  async removeFriend(uid: string) {
    if (!db || !st.me) return;
    db.edges = db.edges.filter(e => !((e.a === st.me!.id && e.b === uid) || (e.a === uid && e.b === st.me!.id)));
    db.gifts = db.gifts.filter(g => !((g.from === st.me!.id && g.to === uid) || (g.from === uid && g.to === st.me!.id)));
    demoSave(); demoBroadcast(); demoRefreshFromDB();
  },
  async sendGift(uid: string, amount: number, note: string) {
    if (!st.me || !db || !(amount > 0) || amount > SOC_GIFT_MAX || uid === st.me.id) return false;
    db.seq += 1;
    db.gifts.unshift({ id: String(db.seq), from: st.me.id, to: uid, amount, note: clamp(note, 120), claimed: false, ts: Date.now(), fromName: st.me.name });
    db.gifts = db.gifts.slice(0, 50);
    demoSave(); demoBroadcast(); demoRefreshFromDB();
    return true;
  },
  async claimGift(id: string) {
    if (!db) return false;
    const g = db.gifts.find(x => x.id === id && x.to === st.me?.id && !x.claimed);
    if (!g) return false;
    g.claimed = true;
    demoSave(); demoBroadcast(); demoRefreshFromDB();
    return true;
  },
  async refreshAll() { demoRefreshFromDB(); },
  async pollNotifications() {
    const out = { reqs: [] as SocPlayer[], gifts: [] as SocGift[] };
    if (!st.me || !db) return out;
    const seen = loadSeen();
    for (const e of db.edges) {
      if (e.b === st.me.id && e.status === 'pending' && !seen.has('e' + e.id)) {
        seen.add('e' + e.id);
        const p = db.players[e.a];
        if (p) out.reqs.push(p);
      }
    }
    for (const g of db.gifts) {
      if (g.to === st.me.id && !g.claimed && !seen.has('g' + g.id)) {
        seen.add('g' + g.id);
        out.gifts.push({ ...g, fromName: db.players[g.from]?.name || '???' });
      }
    }
    if (out.reqs.length || out.gifts.length) saveSeen(seen);
    return out;
  },
};

// ================================================================ SUPABASE PROVIDER
let sb: SbClient | null = null;
let sbInitPromise: Promise<void> | null = null;
let chatChannel: ReturnType<SbClient['channel']> | null = null;
let lastSendTs = 0;
let sbUid = ''; // '' = not signed in yet (avoids null-narrowing across awaits)

async function getSb(): Promise<SbClient> {
  if (sb) return sb;
  if (typeof window === 'undefined') throw new Error('supabase-client-only');
  const w = window as unknown as { supabase?: { createClient?: (...a: unknown[]) => SbClient } };
  if (!w.supabase?.createClient) {
    // UMD build of supabase-js v2 — the same snippet as the official docs.
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('supabase-cdn-failed'));
      document.head.appendChild(s);
    });
  }
  if (!w.supabase?.createClient) throw new Error('supabase-cdn-missing');
  sb = w.supabase.createClient(URL_ENV as string, KEY_ENV as string, { auth: { persistSession: true, autoRefreshToken: true } });
  return sb;
}
interface PlayerRow { id: string; code: string; name: string; avatar: string; level: number; nw: number; ts: number }
interface MsgRow { id: string; uid: string; name: string; avatar: string; text: string; created_at: string }
interface EdgeRow { id: string; a: string; b: string; status: string; ts: number }
interface GiftRow { id: string; from_uid: string; to_uid: string; amount: number; note: string | null; claimed: boolean; ts: number }
const toPlayer = (r: PlayerRow): SocPlayer => ({ id: r.id, code: r.code, name: r.name, avatar: r.avatar || '🐯', level: r.level || 1, nw: Number(r.nw) || 0, ts: r.ts || 0 });
const toMsg = (r: MsgRow): SocMsg => ({ id: String(r.id), uid: r.uid, name: r.name, avatar: r.avatar || '🐯', text: r.text, ts: Date.parse(r.created_at) || 0 });
const toGift = (r: GiftRow, fromName: string): SocGift => ({ id: String(r.id), from: r.from_uid, to: r.to_uid, amount: Number(r.amount) || 0, note: r.note || '', claimed: !!r.claimed, ts: r.ts || 0, fromName });

async function sbFetchProfiles(ids: string[]): Promise<Record<string, SocPlayer>> {
  const out: Record<string, SocPlayer> = {};
  if (!sb || !ids.length) return out;
  const uniq = [...new Set(ids)];
  const { data } = await sb.from('hb_players').select('id,code,name,avatar,level,nw,ts').in('id', uniq);
  if (data) (data as PlayerRow[]).forEach(r => { out[r.id] = toPlayer(r); });
  return out;
}
async function sbRefreshEdges() {
  if (!sb || !sbUid || !st.me) return;
  const me = st.me.id;
  const { data } = await sb.from('hb_friend_edges').select('id,a,b,status,ts').or(`a.eq.${me},b.eq.${me}`).order('id', { ascending: false }).limit(200);
  st.edges = ((data || []) as EdgeRow[]).map(r => ({ id: String(r.id), a: r.a, b: r.b, status: r.status === 'accepted' ? 'accepted' : 'pending', ts: r.ts || 0 }));
  const others = st.edges.map(e => edgeOther(e, me));
  indexPeople(Object.values(await sbFetchProfiles(others)));
  bump();
}
async function sbRefreshGifts() {
  if (!sb || !sbUid || !st.me) return;
  const me = st.me.id;
  const { data } = await sb.from('hb_gifts').select('id,from_uid,to_uid,amount,note,claimed,ts').or(`from_uid.eq.${me},to_uid.eq.${me}`).order('id', { ascending: false }).limit(40);
  const rows = ((data || []) as GiftRow[]);
  const names = await sbFetchProfiles(rows.map(r => r.from_uid));
  st.gifts = rows.map(r => toGift(r, names[r.from_uid]?.name || '???'));
  indexPeople(Object.values(names));
  bump();
}
async function sbRefreshBoard() {
  if (!sb) return;
  const { data } = await sb.from('hb_players').select('id,code,name,avatar,level,nw,ts').order('nw', { ascending: false }).limit(50);
  st.board = ((data || []) as PlayerRow[]).map(toPlayer);
  indexPeople(st.board);
  bump();
}
async function sbRefreshMessages() {
  if (!sb) return;
  const { data } = await sb.from('hb_messages').select('id,uid,name,avatar,text,created_at').order('id', { ascending: false }).limit(80);
  st.messages = ((data || []) as MsgRow[]).map(toMsg).reverse();
  bump();
}

const sbApi = {
  async init(displayName: string) {
    if (sbInitPromise) return sbInitPromise;
    sbInitPromise = (async () => {
      try {
        const client = await getSb();
        let sess = (await client.auth.getSession()).data.session;
        if (!sess) {
          const r = await client.auth.signInAnonymously();
          if (r.error) throw new Error(r.error.message);
          sess = (await client.auth.getSession()).data.session;
        }
        if (!sess) throw new Error('no-session');
        sbUid = sess.user.id;
        const prof = loadProfile();
        const { data: row } = await client.from('hb_players').select('id,code,name,avatar,level,nw,ts').eq('id', sbUid).maybeSingle();
        if (row) {
          const p = toPlayer(row as PlayerRow);
          // stored profile wins, but refresh liveness
          st.me = { ...p, name: prof?.name || p.name, avatar: prof?.avatar || p.avatar, ts: Date.now() };
          await client.from('hb_players').update({ name: st.me.name, avatar: st.me.avatar, ts: st.me.ts }).eq('id', sbUid);
        } else {
          // create with a unique code (retry on the rare code collision)
          for (let i = 0; i < 4; i++) {
            const code = genCode();
            const ins = await client.from('hb_players').insert({ id: sbUid, code, name: prof?.name || displayName || 'HuyenBao', avatar: prof?.avatar || '🐯', level: 1, nw: 0, ts: Date.now() });
            if (!ins.error) { st.me = { id: sbUid, code, name: prof?.name || displayName || 'HuyenBao', avatar: prof?.avatar || '🐯', level: 1, nw: 0, ts: Date.now() }; break; }
            if (i === 3) throw new Error(ins.error?.message || 'insert-failed');
          }
        }
        if (st.me) saveProfile({ name: st.me.name, avatar: st.me.avatar });
        st.ready = true; st.error = null;
        await Promise.all([sbRefreshMessages(), sbRefreshEdges(), sbRefreshGifts(), sbRefreshBoard()]);
        // realtime chat + presence
        chatChannel = client.channel('hb-social');
        chatChannel
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hb_messages' }, payload => {
            const row = payload.new as MsgRow;
            if (st.messages.some(m => m.id === String(row.id))) return;
            st.messages = [...st.messages, toMsg(row)].slice(-80);
            bump();
          })
          .on('presence', { event: 'sync' }, () => {
            const ch = chatChannel;
            if (!ch) return;
            const map = ch.presenceState() as unknown as Record<string, { uid: string; p: SocPlayer }[]>;
            const byId = new Map<string, SocPlayer>();
            for (const arr of Object.values(map)) for (const entry of arr) if (entry?.p) byId.set(entry.p.id, entry.p);
            st.online = [...byId.values()];
            indexPeople(st.online);
            bump();
          })
          .subscribe(async status => {
            if (status === 'SUBSCRIBED' && chatChannel && st.me) {
              await chatChannel.track({ uid: st.me.id, p: { ...st.me } });
            }
          });
      } catch (e) {
        st.error = e instanceof Error ? e.message : 'connect-failed';
        st.ready = false;
        sbInitPromise = null; // allow retry on next attempt
        throw e;
      }
    })();
    return sbInitPromise;
  },
  async updateProfile(name: string, avatar: string) {
    if (!st.me || !sb || !sbUid) return;
    st.me.name = clamp(name, 24) || st.me.name;
    st.me.avatar = avatar;
    saveProfile({ name: st.me.name, avatar });
    await sb.from('hb_players').update({ name: st.me.name, avatar, ts: Date.now() }).eq('id', sbUid);
    if (chatChannel && st.me) await chatChannel.track({ uid: st.me.id, p: { ...st.me } });
    await Promise.all([sbRefreshBoard(), sbRefreshEdges()]);
    bump();
  },
  async pushStats(level: number, nw: number) {
    if (!st.me || !sb || !sbUid) return;
    st.me.level = level; st.me.nw = nw; st.me.ts = Date.now();
    try { await sb.from('hb_players').update({ level, nw, ts: st.me.ts }).eq('id', sbUid); } catch { /* ignore */ }
  },
  async send(text: string) {
    if (!sb || !sbUid || !st.me || !text.trim()) return false;
    const now = Date.now();
    if (now - lastSendTs < 1200) return false; // light client-side flood guard
    lastSendTs = now;
    const { data, error } = await sb.from('hb_messages').insert({ uid: sbUid, name: st.me.name, avatar: st.me.avatar, text: clamp(text, SOC_MSG_MAX) }).select('id,uid,name,avatar,text,created_at').single();
    if (error || !data) return false;
    const m = toMsg(data as MsgRow);
    if (!st.messages.some(x => x.id === m.id)) { st.messages = [...st.messages, m].slice(-80); bump(); }
    return true;
  },
  async addFriendByCode(raw: string): Promise<'sent' | 'auto' | 'exists' | 'self' | 'notfound' | 'fail'> {
    if (!sb || !sbUid || !st.me) return 'fail';
    const code = raw.trim().toUpperCase();
    if (!code) return 'fail';
    if (code === st.me.code) return 'self';
    const { data: tRow } = await sb.from('hb_players').select('id,code,name,avatar,level,nw,ts').eq('code', code).maybeSingle();
    if (!tRow) return 'notfound';
    const target = toPlayer(tRow as PlayerRow);
    if (target.id === sbUid) return 'self';
    const { data: ex } = await sb.from('hb_friend_edges').select('id,a,b,status,ts').or(`and(a.eq.${sbUid},b.eq.${target.id}),and(a.eq.${target.id},b.eq.${sbUid})`).maybeSingle();
    if (ex) {
      const e = ex as EdgeRow;
      if (e.status === 'accepted' || e.a === sbUid) return 'exists';
      const up = await sb.from('hb_friend_edges').update({ status: 'accepted' }).eq('id', e.id);
      if (up.error) return 'fail';
      await sbRefreshEdges();
      return 'auto';
    }
    const ins = await sb.from('hb_friend_edges').insert({ a: sbUid, b: target.id, status: 'pending', ts: Date.now() });
    if (ins.error) return 'fail';
    await sbRefreshEdges();
    return 'sent';
  },
  async respondEdge(id: string, accept: boolean) {
    if (!sb || !sbUid) return;
    if (accept) await sb.from('hb_friend_edges').update({ status: 'accepted' }).eq('id', id);
    else await sb.from('hb_friend_edges').delete().eq('id', id);
    await sbRefreshEdges();
  },
  async removeFriend(uid: string) {
    if (!sb || !sbUid) return;
    await sb.from('hb_friend_edges').delete().eq('a', sbUid).eq('b', uid);
    await sb.from('hb_friend_edges').delete().eq('a', uid).eq('b', sbUid);
    await sbRefreshEdges();
  },
  async sendGift(uid: string, amount: number, note: string) {
    if (!sb || !sbUid || !st.me || !(amount > 0) || amount > SOC_GIFT_MAX || uid === sbUid) return false;
    const ins = await sb.from('hb_gifts').insert({ from_uid: sbUid, to_uid: uid, amount, note: clamp(note, 120), claimed: false, ts: Date.now() });
    if (ins.error) return false;
    await sbRefreshGifts();
    return true;
  },
  async claimGift(id: string) {
    if (!sb || !sbUid) return false;
    const { data } = await sb.from('hb_gifts').update({ claimed: true }).eq('id', id).eq('to_uid', sbUid).eq('claimed', false).select('id').single();
    return !!data;
  },
  async refreshAll() {
    if (!sb) return;
    await Promise.all([sbRefreshMessages(), sbRefreshEdges(), sbRefreshGifts(), sbRefreshBoard()]);
  },
  async pollNotifications() {
    const out = { reqs: [] as SocPlayer[], gifts: [] as SocGift[] };
    if (!sb || !st.me) return out;
    await Promise.all([sbRefreshEdges(), sbRefreshGifts()]);
    const seen = loadSeen();
    for (const e of st.edges) {
      if (e.b === st.me.id && e.status === 'pending' && !seen.has('e' + e.id)) {
        seen.add('e' + e.id);
        const p = st.people[e.a];
        if (p) out.reqs.push(p);
      }
    }
    for (const g of st.gifts) {
      if (g.to === st.me.id && !g.claimed && !seen.has('g' + g.id)) {
        seen.add('g' + g.id);
        out.gifts.push(g);
      }
    }
    if (out.reqs.length || out.gifts.length) saveSeen(seen);
    return out;
  },
};

// ================================================================ SQLITE PROVIDER (v11.27)
// Talks to /api/social/* route handlers backed by better-sqlite3 on the same
// origin — the zero-extra-service option for a self-hosted VPS (the user's
// explicit request). Identity is per-BROWSER (localStorage uid), stable
// across sessions like the Supabase anon uid; the server keeps a players row
// with a unique HB- code for it. Chat/presence/friends/gifts poll every 5s —
// no realtime channel on plain SQLite; the Supabase path keeps realtime.
const SUID_KEY = 'hb_soc_uid_v1';
let sqlUid: string | null = null;
let sqlPollIv: ReturnType<typeof setInterval> | null = null;
let lastSqlSend = 0;

function sqlFetch<T = any>(path: string, body?: unknown): Promise<T> {
  const opt: RequestInit = body !== undefined
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : { cache: 'no-store' };
  return fetch(asset(path), opt).then(r => {
    if (!r.ok) throw new Error('http-' + r.status);
    return r.json() as Promise<T>;
  });
}
function sqlIdentity(): string {
  if (!sqlUid) {
    try {
      let u = localStorage.getItem(SUID_KEY);
      if (!u) {
        u = 'u' + (typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 24);
        localStorage.setItem(SUID_KEY, u);
      }
      sqlUid = u;
    } catch { sqlUid = 'u' + Math.random().toString(36).slice(2) + Date.now().toString(36); }
  }
  return sqlUid;
}
interface SqlPaint {
  me?: SocPlayer; messages?: SocMsg[]; edges?: SocEdge[]; gifts?: SocGift[];
  board?: SocPlayer[]; online?: SocPlayer[]; people?: Record<string, SocPlayer>;
}
function sqlApply(data: SqlPaint) {
  if (data.me) {
    const prof = loadProfile();
    st.me = { ...data.me, name: prof?.name || data.me.name, avatar: prof?.avatar || data.me.avatar };
  }
  if (data.messages) st.messages = data.messages.slice(-80);
  if (data.edges) st.edges = data.edges;
  if (data.gifts) st.gifts = data.gifts;
  if (data.board) st.board = data.board;
  if (data.online) st.online = data.online;
  if (data.people) indexPeople(Object.values(data.people));
  indexPeople([...(data.board || []), ...(data.online || [])]);
  bump();
}
async function sqlRefreshAll() {
  if (!st.me) return;
  const uid = encodeURIComponent(st.me.id);
  const [m, f, g, b, pr] = await Promise.all([
    sqlFetch<{ messages: SocMsg[] }>('/api/social/messages'),
    sqlFetch<{ edges: SocEdge[]; people: Record<string, SocPlayer> }>(`/api/social/friends?uid=${uid}`),
    sqlFetch<{ gifts: SocGift[] }>(`/api/social/gifts?uid=${uid}`),
    sqlFetch<{ board: SocPlayer[] }>('/api/social/leaderboard'),
    sqlFetch<{ online: SocPlayer[] }>('/api/social/presence', { uid: sqlIdentity() }).catch(() => ({ online: st.online })),
  ]);
  sqlApply({ messages: m.messages, edges: f.edges, gifts: g.gifts, board: b.board, online: pr.online, people: f.people });
}
const sqliteApi = {
  async init(displayName: string) {
    const prof = loadProfile();
    const data = await sqlFetch<Required<SqlPaint>>('/api/social/init', {
      uid: sqlIdentity(), name: prof?.name || displayName || 'HuyenBao', avatar: prof?.avatar || '🐯', level: 1, nw: 0,
    });
    st.ready = true; st.error = null;
    sqlApply(data);
    if (st.me) saveProfile({ name: st.me.name, avatar: st.me.avatar });
    if (!sqlPollIv) sqlPollIv = setInterval(() => { void sqliteApi.refreshAll().catch(() => { /* offline — next tick retries */ }); }, 5000);
  },
  async updateProfile(name: string, avatar: string) {
    if (!st.me) return;
    st.me.name = clamp(name, 24) || st.me.name;
    st.me.avatar = avatar;
    saveProfile({ name: st.me.name, avatar });
    await sqlFetch('/api/social/init', { uid: sqlIdentity(), name: st.me.name, avatar, level: st.me.level, nw: st.me.nw });
    await sqlRefreshAll();
  },
  async pushStats(level: number, nw: number) {
    if (!st.me) return;
    st.me.level = level; st.me.nw = nw;
    try { await sqlFetch('/api/social/init', { uid: sqlIdentity(), name: st.me.name, avatar: st.me.avatar, level, nw }); } catch { /* ignore */ }
  },
  async send(text: string) {
    if (!st.me || !text.trim()) return false;
    const now = Date.now();
    if (now - lastSqlSend < 1200) return false; // light client-side flood guard
    lastSqlSend = now;
    const r = await sqlFetch<{ ok: boolean; message?: SocMsg }>('/api/social/messages', { uid: sqlIdentity(), text });
    if (r.ok && r.message && !st.messages.some(x => x.id === String(r.message!.id))) {
      st.messages = [...st.messages, r.message].slice(-80);
      bump();
    }
    return !!r.ok;
  },
  async addFriendByCode(raw: string): Promise<AddResult> {
    if (!st.me) return 'fail';
    const code = raw.trim().toUpperCase();
    if (!code) return 'fail';
    if (code === st.me.code) return 'self';
    const r = await sqlFetch<{ result: AddResult }>('/api/social/friends', { uid: sqlIdentity(), action: 'add', code });
    if (r.result === 'sent' || r.result === 'auto') await sqlRefreshAll();
    return r.result;
  },
  async respondEdge(id: string, accept: boolean) {
    await sqlFetch('/api/social/friends', { uid: sqlIdentity(), action: accept ? 'accept' : 'decline', edgeId: Number(id) });
    await sqlRefreshAll();
  },
  async removeFriend(uid: string) {
    await sqlFetch('/api/social/friends', { uid: sqlIdentity(), action: 'remove', targetUid: uid });
    await sqlRefreshAll();
  },
  async sendGift(to: string, amount: number, note: string) {
    if (!st.me || !(amount > 0) || amount > SOC_GIFT_MAX || to === st.me.id) return false;
    const r = await sqlFetch<{ ok: boolean }>('/api/social/gifts', { uid: sqlIdentity(), action: 'send', to, amount, note });
    if (r.ok) await sqlRefreshAll();
    return !!r.ok;
  },
  async claimGift(id: string) {
    const r = await sqlFetch<{ ok: boolean }>('/api/social/gifts', { uid: sqlIdentity(), action: 'claim', id: Number(id) });
    if (r.ok) await sqlRefreshAll();
    return !!r.ok;
  },
  async refreshAll() { await sqlRefreshAll(); },
  async pollNotifications() {
    const out = { reqs: [] as SocPlayer[], gifts: [] as SocGift[] };
    if (!st.me) return out;
    await sqlRefreshAll();
    const seen = loadSeen();
    for (const e of st.edges) {
      if (e.b === st.me.id && e.status === 'pending' && !seen.has('e' + e.id)) {
        seen.add('e' + e.id);
        const p = st.people[e.a];
        if (p) out.reqs.push(p);
      }
    }
    for (const g of st.gifts) {
      if (g.to === st.me.id && !g.claimed && !seen.has('g' + g.id)) {
        seen.add('g' + g.id);
        out.gifts.push(g);
      }
    }
    if (out.reqs.length || out.gifts.length) saveSeen(seen);
    return out;
  },
};

// ---------------------------------------------------------------- dispatch
type AddResult = 'sent' | 'auto' | 'exists' | 'self' | 'notfound' | 'fail';
interface SocBackend {
  init(displayName: string): Promise<void>;
  updateProfile(name: string, avatar: string): Promise<void>;
  pushStats(level: number, nw: number): Promise<void>;
  send(text: string): Promise<boolean>;
  addFriendByCode(code: string): Promise<AddResult>;
  respondEdge(id: string, accept: boolean): Promise<void>;
  removeFriend(uid: string): Promise<void>;
  sendGift(uid: string, amount: number, note: string): Promise<boolean>;
  claimGift(id: string): Promise<boolean>;
  refreshAll(): Promise<void>;
  pollNotifications(): Promise<{ reqs: SocPlayer[]; gifts: SocGift[] }>;
}
let backend: SocBackend = demo as unknown as SocBackend;
let backendResolved = false;
// v11.27 — pick the real backend once, at first init. Supabase wins when its
// env vars are set; otherwise a single /api/social/ping probe upgrades demo
// to the self-hosted SQLite backend when a real server answers (VPS), and
// static hosts (GitHub Pages) simply stay in demo mode.
async function resolveBackend(): Promise<SocBackend> {
  if (backendResolved) return backend;
  backendResolved = true;
  if (socialMode === 'demo') {
    try {
      const r = await fetch(asset('/api/social/ping'), { cache: 'no-store' });
      const j = await r.json() as { backend?: string };
      if (r.ok && j.backend === 'sqlite') socialMode = 'sqlite';
    } catch { /* static host — stay demo */ }
  }
  backend = socialMode === 'supabase' ? (sbApi as unknown as SocBackend)
    : socialMode === 'sqlite' ? (sqliteApi as unknown as SocBackend)
    : (demo as unknown as SocBackend);
  return backend;
}

// ---------------------------------------------------------------- React hook
export interface Comm {
  mode: SocMode;
  ready: boolean;
  error: string | null;
  me: SocPlayer | null;
  messages: SocMsg[];
  online: SocPlayer[];
  board: SocPlayer[];
  edges: SocEdge[];
  people: Record<string, SocPlayer>;
  gifts: SocGift[];
  incoming: SocEdge[];
  friends: { edge: SocEdge; p: SocPlayer | null }[];
  unclaimedGifts: SocGift[];
  init(): void;
  retry(): void;
  updateProfile(name: string, avatar: string): Promise<void>;
  send(text: string): Promise<boolean>;
  addFriendByCode(code: string): Promise<AddResult>;
  respondEdge(id: string, accept: boolean): Promise<void>;
  removeFriend(uid: string): Promise<void>;
  sendGift(uid: string, amount: number, note: string): Promise<boolean>;
  claimGift(id: string): Promise<boolean>;
  refreshAll(): Promise<void>;
}

export function useCommunity(s: GameState, showToast: (m: string) => void): Comm {
  useSyncExternalStore(socSubscribe, socSnapshot, socSnapshot);
  const { t } = useT();
  const bootedRef = useRef(false);
  const lastPush = useRef(0);
  const nw = netWorth(s);

  const init = () => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    resolveBackend()
      .then(b => b.init(s.name || 'HuyenBao'))
      .then(() => bump())
      .catch(() => bump());
  };
  const retry = () => { bootedRef.current = false; init(); };
  useEffect(() => { init();
  }, []);

  // push level/net-worth to the community profile (throttled to 1/30s)
  useEffect(() => {
    if (!st.ready || !st.me) return;
    const now = Date.now();
    if (now - lastPush.current < 30000) return;
    lastPush.current = now;
    void backend.pushStats(s.level, nw);
  }, [s.level, nw, st.ready, st.me]);

  // background notifications: new friend requests / gifts → toast
  useEffect(() => {
    if (!st.ready) return;
    let alive = true;
    const notify = async () => {
      try {
        const n = await backend.pollNotifications();
        if (!alive) return;
        n.reqs.slice(0, 3).forEach(p => showToast(t('soc.notifReq', '', { n: p.name })));
        n.gifts.slice(0, 3).forEach(g => showToast(t('soc.notifGift', '', { n: g.fromName })));
      } catch { /* offline — next sweep retries */ }
    };
    const first = setTimeout(notify, 6000);
    const iv = setInterval(notify, 45000);
    return () => { alive = false; clearTimeout(first); clearInterval(iv); };
  }, [st.ready, showToast, t]);

  const me = st.me;
  const incoming = me ? st.edges.filter(e => e.b === me.id && e.status === 'pending') : [];
  const friends = me
    ? st.edges.filter(e => e.status === 'accepted').map(e => ({ edge: e, p: st.people[edgeOther(e, me.id)] ?? null }))
      .sort((a, b) => (b.p?.nw ?? 0) - (a.p?.nw ?? 0))
    : [];

  return {
    mode: socialMode,
    ready: st.ready,
    error: st.error,
    me,
    messages: st.messages,
    online: st.online,
    board: st.board,
    edges: st.edges,
    people: st.people,
    gifts: st.gifts,
    incoming,
    friends,
    unclaimedGifts: me ? st.gifts.filter(g => g.to === me.id && !g.claimed) : [],
    init,
    retry,
    updateProfile: (name, avatar) => backend.updateProfile(name, avatar),
    send: text => backend.send(text),
    addFriendByCode: code => backend.addFriendByCode(code),
    respondEdge: (id, accept) => backend.respondEdge(id, accept),
    removeFriend: uid => backend.removeFriend(uid),
    sendGift: (uid, amount, note) => backend.sendGift(uid, amount, note),
    claimGift: id => backend.claimGift(id),
    refreshAll: () => backend.refreshAll(),
  };
}
