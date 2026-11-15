'use client';
// v11.35 — HuyenBao comprehensive admin dashboard, full game-control console (VPS).
// Route: /ads (the old /adm path silently rewrites here via src/proxy.ts).
//
// This is the operator's cockpit — every lever the server-side has over the
// game's social fabric lives here. Tabs:
//   📊 Tổng quan     — live server stats + top-10 net worth
//   ⚙️ Hệ thống      — Node version, uptime, memory, env status, DB file telemetry
//   👥 Người chơi    — search, edit, ban/unban, delete, send gift
//   💬 Trò chuyện    — chat moderation: delete a message, wipe a user, broadcast 📢
//   🎁 Quà tặng      — gift log + delete + send admin gift to any player
//   🏆 Bảng xếp hạng  — top 50 + reset leaderboard (destructive)
//   🗄 CSDL          — SQLite maintenance: vacuum, wipe chat log
//
// Every /api/admin/* route is guarded by the server-only ADMIN_KEY env var.
import { useCallback, useEffect, useRef, useState } from 'react';

interface Stats {
  ok: true; ts: number; dbPath: string; dbBytes: number;
  players: number; banned: number; online: number; messages: number; messages24h: number;
  gifts: number; gifts24h: number; edges: number; acceptedEdges: number;
  top: { code: string; name: string; avatar: string; nw: number; level: number }[];
}
interface APlayer {
  id: string; code: string; name: string; avatar: string; level: number; nw: number;
  ts: number; last_seen: number; banned: number;
}
interface AMsg { id: string; uid: string; name: string; avatar: string; text: string; ts: number }
interface AGift { id: string; from: string; to: string; amount: number; note: string; claimed: boolean; ts: number; fromName: string }
interface ASys {
  ok: true; ts: number;
  node: string; platform: string; arch: string;
  uptimeSec: number; pid: number;
  memory: { rssMb: number; heapUsedMb: number; heapTotalMb: number; externalMb: number };
  env: { adminKeySet: boolean; socialDbPath: string; basePath: string; port: string };
  db: { path: string; bytes: number; walBytes: number; shmBytes: number };
  packageVersion: string;
}
interface ATop { code: string; name: string; avatar: string; nw: number; level: number; last_seen: number }

const KEY_STORE = 'hb_admin_key';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const asset = (p: string) => BASE + p;
const fmtN = (n: number) => n.toLocaleString('vi-VN');
const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('vi-VN');
const fmtBytes = (n: number) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
const fmtAgo = (ts: number) => {
  if (!ts) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return s + 's trước';
  if (s < 3600) return Math.floor(s / 60) + 'p trước';
  if (s < 86400) return Math.floor(s / 3600) + 'h trước';
  return Math.floor(s / 86400) + ' ngày trước';
};
const fmtUptime = (sec: number) => {
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'p ' + (sec % 60) + 's';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'p';
  return Math.floor(sec / 86400) + ' ngày ' + Math.floor((sec % 86400) / 3600) + 'h';
};
const ONLINE_MS = 13000;
const isOnline = (p: APlayer | ATop) => 'last_seen' in p && Date.now() - (p as { last_seen: number }).last_seen < ONLINE_MS;

type Phase = 'locked' | 'loading' | 'live' | 'badkey' | 'noserver';
type Tab = 'overview' | 'system' | 'players' | 'chat' | 'gifts' | 'leaderboard' | 'game' | 'db';

export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [sys, setSys] = useState<ASys | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [note, setNote] = useState('');
  const keyRef = useRef('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [players, setPlayers] = useState<APlayer[] | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<APlayer | null>(null);
  const [gifting, setGifting] = useState<APlayer | null>(null);
  const [giftAmt, setGiftAmt] = useState('1000');
  const [giftNote, setGiftNote] = useState('');
  const [msgs, setMsgs] = useState<AMsg[] | null>(null);
  const [bcast, setBcast] = useState('');
  const [gifts, setGifts] = useState<AGift[] | null>(null);
  const [sendTo, setSendTo] = useState('');
  const [sendAmt, setSendAmt] = useState('1000');
  const [sendNote, setSendNote] = useState('');
  const [top, setTop] = useState<ATop[] | null>(null);
  // ---- game control tab
  const [itemList, setItemList] = useState<{ items: { id: string; name: string; cat: string; price: number; rarity: string; stock?: number | null }[]; rare: { id: string; name: string; cat: string; price: number; rarity: string; stock?: number | null }[]; custom?: { id: string; name: string; cat: string; price: number; rarity: string; stock?: number | null; imageUrl: string }[] } | null>(null);
  const [gameUid, setGameUid] = useState('');
  const [gameItemId, setGameItemId] = useState('');
  const [gameAmount, setGameAmount] = useState('100000');
  // v11.40 — create-item form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemCat, setNewItemCat] = useState('Custom');
  const [newItemPrice, setNewItemPrice] = useState('1000');
  const [newItemUrl, setNewItemUrl] = useState('');
  // v13.2 — Stock + Rarity fields on the create/edit form. Stock is empty
  // string → unlimited (stored as NULL); a positive integer → limited. Rarity
  // is the explicit tier (defaults to 'common' for non-mythic items). When
  // mythic is selected, the form auto-suggests a stock of 1-10 and shows a
  // hint reminding the operator mythic items are ultra-limited.
  const [newItemStock, setNewItemStock] = useState('');
  const [newItemRarity, setNewItemRarity] = useState<'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic'>('common');
  // v12.2 — edit-item mode: editingItemId is set when the form is in "update"
  // mode instead of "create". Submitting either creates (id null) or patches
  // (id set) the item, then the form flips back to create mode.
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // v12.2 — AI difficulty control. easy = win +10% / penalties -50%,
  // normal = unchanged, hard = win -10% / penalties +50%. Persisted on the
  // player's GameState via the setDifficulty admin action (audit-log row).
  const [aiDifficulty, setAiDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');

  const flash = useCallback((m: string) => { setNote(m); setTimeout(() => setNote(''), 4500); }, []);

  const adminGet = useCallback(async <T,>(path: string, params: Record<string, string> = {}): Promise<T> => {
    const usp = new URLSearchParams(params);
    const url = asset(path) + (usp.size ? '?' + usp.toString() : '');
    const r = await fetch(url, { headers: { authorization: 'Bearer ' + keyRef.current }, cache: 'no-store' });
    if (r.status === 403) {
      const j = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error === 'admin-key-not-set' ? 'noserver' : 'badkey');
    }
    if (!r.ok) throw new Error('http-' + r.status);
    return r.json() as Promise<T>;
  }, []);

  const adminPost = useCallback(async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
    const r = await fetch(asset(path), {
      method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + keyRef.current },
      body: JSON.stringify(body), cache: 'no-store',
    });
    if (r.status === 403) {
      const j = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error === 'admin-key-not-set' ? 'noserver' : 'badkey');
    }
    if (!r.ok) throw new Error('http-' + r.status);
    return r.json() as Promise<T>;
  }, []);

  const loadStats = useCallback(async () => {
    try { const j = await adminGet<Stats>('/api/admin/stats'); setStats(j); setPhase('live'); }
    catch (e) { setPhase(e instanceof Error && (e.message === 'badkey' || e.message === 'noserver') ? (e.message as Phase) : 'noserver'); setStats(null); }
  }, [adminGet]);
  const loadSys = useCallback(async () => { try { setSys(await adminGet<ASys>('/api/admin/system')); } catch { setSys(null); } }, [adminGet]);
  const loadPlayers = useCallback(async (query = q) => { try { const j = await adminGet<{ players: APlayer[] }>('/api/admin/players', query.trim() ? { q: query.trim() } : {}); setPlayers(j.players); } catch { setPlayers([]); } }, [adminGet, q]);
  const loadMsgs = useCallback(async () => { try { const j = await adminGet<{ messages: AMsg[] }>('/api/admin/messages'); setMsgs(j.messages); } catch { setMsgs([]); } }, [adminGet]);
  const loadGifts = useCallback(async () => { try { const j = await adminGet<{ gifts: AGift[] }>('/api/admin/gifts'); setGifts(j.gifts); } catch { setGifts([]); } }, [adminGet]);
  const loadTop = useCallback(async () => { try { const j = await adminGet<{ top: ATop[] }>('/api/admin/leaderboard', { limit: '50' }); setTop(j.top); } catch { setTop([]); } }, [adminGet]);
  const loadItems = useCallback(async () => { try { setItemList(await adminGet<typeof itemList>('/api/admin/game')); } catch { setItemList(null); } }, [adminGet]);

  const loadTab = useCallback((tb: Tab) => {
    if (tb === 'system') void loadSys();
    else if (tb === 'players') void loadPlayers();
    else if (tb === 'chat') void loadMsgs();
    else if (tb === 'gifts') void loadGifts();
    else if (tb === 'leaderboard') void loadTop();
    else if (tb === 'game') void loadItems();
  }, [loadSys, loadPlayers, loadMsgs, loadGifts, loadTop, loadItems]);

  const unlock = useCallback(() => {
    keyRef.current = key.trim();
    try { sessionStorage.setItem(KEY_STORE, keyRef.current); } catch { /* ignore */ }
    setPhase('loading'); void loadStats();
  }, [key, loadStats]);

  useEffect(() => {
    try { keyRef.current = sessionStorage.getItem(KEY_STORE) || ''; } catch { /* ignore */ }
    if (keyRef.current) { setPhase('loading'); void loadStats(); }
    else setPhase('locked');
    timer.current = setInterval(() => { if (keyRef.current && tab === 'overview') void loadStats(); }, 10000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [loadStats, tab]);

  const switchTab = (tb: Tab) => { setTab(tb); setNote(''); loadTab(tb); };
  const logout = () => { keyRef.current = ''; try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ } setPhase('locked'); setKey(''); setStats(null); setSys(null); };

  const saveEdit = async () => {
    if (!editing) return;
    try { await adminPost('/api/admin/players', { action: 'update', uid: editing.id, name: editing.name, avatar: editing.avatar, level: editing.level, nw: editing.nw }); flash('✅ Đã cập nhật ' + editing.code); setEditing(null); void loadPlayers(); }
    catch { flash('❌ Cập nhật thất bại'); }
  };
  const banPlayer = async (p: APlayer) => {
    try { await adminPost('/api/admin/players', { action: p.banned ? 'unban' : 'ban', uid: p.id }); flash(p.banned ? '✅ Đã bỏ cấm ' + p.code : '🚫 Đã cấm ' + p.code); void loadPlayers(); }
    catch { flash('❌ Thao tác thất bại'); }
  };
  const delPlayer = async (p: APlayer) => {
    if (!window.confirm(`Xoá vĩnh viễn ${p.name} (${p.code})?\nToàn bộ tin nhắn, bạn bè, quà tặng cũng bị xoá.`)) return;
    if (!window.confirm('Chắc chắn chứ? KHÔNG thể hoàn tác.')) return;
    try { await adminPost('/api/admin/players', { action: 'delete', uid: p.id }); flash('🗑 Đã xoá ' + p.code); void loadPlayers(); }
    catch { flash('❌ Xoá thất bại'); }
  };
  const sendGiftToPlayer = async () => {
    if (!gifting) return;
    const amt = Number(giftAmt);
    if (!Number.isFinite(amt) || amt <= 0) { flash('❌ Số tiền không hợp lệ'); return; }
    try { await adminPost('/api/admin/gifts', { action: 'send', to: gifting.code, amount: amt, note: giftNote }); flash('🎁 Đã gửi ' + fmtMoney(amt) + ' cho ' + gifting.code); setGifting(null); setGiftNote(''); }
    catch { flash('❌ Gửi quà thất bại'); }
  };
  const delMsg = async (m: AMsg) => { try { await adminPost('/api/admin/messages', { action: 'delete', id: Number(m.id) }); setMsgs(cur => (cur ?? []).filter(x => x.id !== m.id)); } catch { flash('❌ Xoá tin thất bại'); } };
  const delUserMsgs = async (m: AMsg) => {
    if (!window.confirm(`Xoá TOÀN BỘ tin nhắn của ${m.name}?`)) return;
    try { const r = await adminPost<{ removed: number }>('/api/admin/messages', { action: 'deleteUser', uid: m.uid }); flash(`🗑 Đã xoá ${r.removed} tin của ${m.name}`); void loadMsgs(); }
    catch { flash('❌ Thao tác thất bại'); }
  };
  const sendBcast = async () => { const text = bcast.trim(); if (!text) return; try { await adminPost('/api/admin/messages', { action: 'broadcast', text }); flash('📢 Đã phát thông báo'); setBcast(''); void loadMsgs(); } catch { flash('❌ Gửi thất bại'); } };
  const delGift = async (g: AGift) => { try { await adminPost('/api/admin/gifts', { action: 'delete', id: Number(g.id) }); setGifts(cur => (cur ?? []).filter(x => x.id !== g.id)); } catch { flash('❌ Xoá quà thất bại'); } };
  const sendAdminGift = async () => {
    const to = sendTo.trim(); const amt = Number(sendAmt);
    if (!to) { flash('❌ Nhập mã HB-… hoặc UID'); return; }
    if (!Number.isFinite(amt) || amt <= 0) { flash('❌ Số tiền không hợp lệ'); return; }
    try { const r = await adminPost<{ ok: boolean; gift?: AGift; error?: string }>('/api/admin/gifts', { action: 'send', to, amount: amt, note: sendNote }); if (!r.ok || !r.gift) throw new Error(r.error || 'unknown'); flash('🎁 Đã gửi ' + fmtMoney(amt) + ' tới ' + to); setSendTo(''); setSendNote(''); void loadGifts(); }
    catch (e) { const msg = e instanceof Error ? e.message : ''; flash('❌ Gửi thất bại' + (msg === 'unknown-recipient' ? ' — không tìm thấy người nhận' : '')); }
  };
  const resetLeaderboard = async () => {
    if (!window.confirm('Reset TOÀN BỘ bảng xếp hạng?\nMọi người chơi sẽ về $0 và level 1. Tài khoản, chat, bạn bè, quà vẫn còn.')) return;
    if (!window.confirm('Chắc chắn chứ? Mọi tiến độ tài sản sẽ bị xoá.')) return;
    try { const r = await adminPost<{ reset: number }>('/api/admin/leaderboard', { action: 'reset' }); flash('🏆 Đã reset ' + r.reset + ' người chơi về $0'); void loadTop(); void loadStats(); }
    catch { flash('❌ Reset thất bại'); }
  };
  const dbVacuum = async () => { try { await adminPost('/api/admin/db', { action: 'vacuum' }); flash('✅ Đã tối ưu CSDL (VACUUM)'); void loadStats(); } catch { flash('❌ VACUUM thất bại'); } };
  const dbClearMsgs = async () => {
    if (!window.confirm('Xoá TOÀN BỘ tin nhắn chat?')) return;
    if (!window.confirm('Chắc chắn chứ? Toàn bộ lịch sử chat sẽ mất.')) return;
    try { const r = await adminPost<{ removed: number }>('/api/admin/db', { action: 'clearMessages' }); flash(`🗑 Đã xoá ${r.removed} tin nhắn`); void loadStats(); }
    catch { flash('❌ Thao tác thất bại'); }
  };

  const card = (label: string, sub: string, value: string, tone?: string) => (
    <div className="adm-card" style={tone ? { borderColor: tone } : undefined}>
      <div className="adm-val" style={tone ? { color: tone } : undefined}>{value}</div>
      <div className="adm-lab">{label}</div>
      <div className="adm-sub">{sub}</div>
    </div>
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: '📊 Tổng quan' },
    { id: 'system', label: '⚙️ Hệ thống' },
    { id: 'players', label: '👥 Người chơi' },
    { id: 'chat', label: '💬 Trò chuyện' },
    { id: 'gifts', label: '🎁 Quà tặng' },
    { id: 'leaderboard', label: '🏆 Bảng XH' },
    { id: 'db', label: '🗄 CSDL' },
    { id: 'game', label: '🎮 Điều khiển' },
  ];

  return (
    <div className="admpage">
      <header className="adm-head">
        <h1>🛡️ HuyenBao <span>Admin</span></h1>
        <span className="adm-chip">{phase === 'live' ? 'SQLite backend · LIVE' : 'SQLite backend'}</span>
        {phase === 'live' && <button className="adm-btn adm-ghost" onClick={logout}>Đăng xuất</button>}
      </header>

      {phase === 'locked' && (
        <section className="adm-gate">
          <p>Nhập <b>ADMIN_KEY</b> đã đặt trên server (biến môi trường trước <code>next start</code>).<br /><span className="adm-en">Enter the ADMIN_KEY env var configured on your VPS.</span></p>
          <div className="adm-row">
            <input type="password" value={key} placeholder="ADMIN_KEY…" aria-label="ADMIN_KEY" onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') unlock(); }} />
            <button onClick={unlock}>Đăng nhập</button>
          </div>
          <p className="adm-note">Key chỉ lưu trong sessionStorage của tab này, không gửi đi đâu khác.</p>
        </section>
      )}
      {phase === 'badkey' && (<section className="adm-gate"><p>❌ Sai ADMIN_KEY. <span className="adm-en">Wrong key.</span></p><button onClick={() => setPhase('locked')}>Thử lại</button></section>)}
      {phase === 'noserver' && (
        <section className="adm-gate">
          <p>⚠️ Không gọi được <code>/api/admin/*</code>.</p>
          <ul className="adm-list">
            <li>Server chưa đặt <code>ADMIN_KEY</code> → API từ chối mọi request (mặc định an toàn).</li>
            <li>Hoặc bạn đang mở bản build tĩnh (GitHub Pages) — admin dashboard chỉ chạy khi <code>next build && next start</code> trên VPS.</li>
          </ul>
          <button onClick={() => setPhase('locked')}>Nhập key khác</button>
        </section>
      )}

      {(phase === 'loading' || phase === 'live') && (
        <>
          <nav className="adm-tabs" role="tablist">
            {TABS.map(tb => (<button key={tb.id} role="tab" aria-selected={tab === tb.id} className={'adm-tab' + (tab === tb.id ? ' on' : '')} onClick={() => switchTab(tb.id)}>{tb.label}</button>))}
          </nav>
          {note && <div className="adm-flash" role="status">{note}</div>}

          {tab === 'overview' && (
            <>
              <div className="adm-grid">
                {card('Người chơi', 'players registered', stats ? fmtN(stats.players) : '…')}
                {card('Đang online', 'seen in the last 13s', stats ? fmtN(stats.online) : '…', stats && stats.online > 0 ? '#2e9e5b' : undefined)}
                {card('Bị cấm', 'banned accounts', stats ? fmtN(stats.banned) : '…', stats && stats.banned > 0 ? '#c0392b' : undefined)}
                {card('Tin nhắn', '+' + (stats ? fmtN(stats.messages24h) : '0') + ' trong 24h', stats ? fmtN(stats.messages) : '…')}
                {card('Quà tặng', '+' + (stats ? fmtN(stats.gifts24h) : '0') + ' trong 24h', stats ? fmtN(stats.gifts) : '…')}
                {card('Kết bạn', stats ? fmtN(stats.acceptedEdges) + ' đã chấp nhận / ' + fmtN(stats.edges) + ' lời mời' : '…', stats ? fmtN(stats.acceptedEdges) : '…')}
                {card('CSDL', stats ? stats.dbPath.split('/').slice(-2).join('/') : '…', stats ? fmtBytes(stats.dbBytes) : '…')}
              </div>
              <section className="adm-top">
                <h2>🏆 Top 10 tài sản</h2>
                <table>
                  <thead><tr><th>#</th><th>Người chơi</th><th>Mã</th><th>Level</th><th>Tài sản ròng</th></tr></thead>
                  <tbody>
                    {(stats?.top || []).map((p, i) => (<tr key={p.code}><td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td><td>{p.avatar} {p.name}</td><td><code>{p.code}</code></td><td>{p.level}</td><td className="adm-nw">{fmtMoney(p.nw)}</td></tr>))}
                    {stats && stats.top.length === 0 && <tr><td colSpan={5}>Chưa có người chơi nào đồng bộ bảng xếp hạng.</td></tr>}
                    {!stats && <tr><td colSpan={5}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {tab === 'system' && (
            <section className="adm-top">
              <h2 style={{ marginTop: 0 }}>⚙️ Thông tin hệ thống</h2>
              <div className="adm-grid">
                {card('Node.js', 'process.version', sys?.node ?? '…')}
                {card('Platform', sys ? sys.platform + ' / ' + sys.arch : '…', sys ? 'pid ' + sys.pid : '…')}
                {card('Uptime', 'thời gian chạy', sys ? fmtUptime(sys.uptimeSec) : '…', sys && sys.uptimeSec > 86400 ? '#2e9e5b' : undefined)}
                {card('RSS', 'resident set size', sys ? sys.memory.rssMb + ' MB' : '…', sys && sys.memory.rssMb > 512 ? '#b7791f' : undefined)}
                {card('Heap', 'used / total', sys ? sys.memory.heapUsedMb + ' / ' + sys.memory.heapTotalMb + ' MB' : '…')}
                {card('External', 'C++ bindings', sys ? sys.memory.externalMb + ' MB' : '…')}
                {card('Phiên bản game', 'package.json', sys?.packageVersion ?? '…')}
              </div>
              <h2>Môi trường</h2>
              <div className="adm-grid">
                {card('ADMIN_KEY', 'env var', sys ? (sys.env.adminKeySet ? '✅ đã đặt' : '❌ thiếu') : '…', sys && !sys.env.adminKeySet ? '#c0392b' : '#2e9e5b')}
                {card('Port', 'npm start', sys?.env.port ?? '3334')}
                {card('Base path', 'NEXT_PUBLIC_BASE_PATH', sys?.env.basePath || '—')}
              </div>
              <h2>Files CSDL</h2>
              <div className="adm-grid">
                {card('social.db', 'main DB file', sys ? fmtBytes(sys.db.bytes) : '…')}
                {card('social.db-wal', 'write-ahead log', sys ? fmtBytes(sys.db.walBytes) : '…', sys && sys.db.walBytes > 10_000_000 ? '#b7791f' : undefined)}
                {card('social.db-shm', 'shared memory', sys ? fmtBytes(sys.db.shmBytes) : '…')}
                {card('Đường dẫn', 'SOCIAL_DB_PATH', sys ? sys.db.path.split('/').slice(-2).join('/') : '…')}
              </div>
              <p className="adm-note">💡 WAL lớn là bình thường — SQLite gộp nó về main DB lúc checkpoint. Nếu WAL vượt 10 MB lâu ngày, ấn <b>VACUUM</b> ở tab CSDL. ADMIN_KEY thực sự không bao giờ rời server — tab này chỉ báo <code>đã đặt / thiếu</code>.</p>
              <div className="adm-tools"><button className="adm-btn adm-ghost" onClick={() => void loadSys()}>↻ Làm mới</button></div>
            </section>
          )}

          {tab === 'players' && (
            <section className="adm-top">
              <div className="adm-tools">
                <input className="adm-input" value={q} placeholder="Tìm theo tên hoặc mã HB-…" onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void loadPlayers(); }} />
                <button className="adm-btn" onClick={() => void loadPlayers()}>🔍 Tìm</button>
                {q && <button className="adm-btn adm-ghost" onClick={() => { setQ(''); void loadPlayers(''); }}>Xoá tìm kiếm</button>}
                <button className="adm-btn adm-ghost" onClick={() => void loadPlayers()}>↻ Làm mới</button>
              </div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Người chơi</th><th>Mã</th><th>UID</th><th>Level</th><th>Tài sản</th><th>Hoạt động</th><th>Trạng thái</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(players ?? []).map(p => {
                      if (gifting && gifting.id === p.id) {
                        return (<tr key={p.id} className="adm-editrow"><td colSpan={8}><div className="adm-bcast"><b>🎁 Gửi quà từ HuyenBao 📢 tới {p.avatar} {p.name} ({p.code})</b><div className="adm-row"><input className="adm-input" type="number" value={giftAmt} aria-label="amount" onChange={e => setGiftAmt(e.target.value)} style={{ flex: '0 0 140px' }} /><input className="adm-input" value={giftNote} placeholder="Lời nhắn (tuỳ chọn)" onChange={e => setGiftNote(e.target.value)} style={{ flex: 1 }} /></div><div className="adm-row"><button className="adm-btn" onClick={() => void sendGiftToPlayer()}>🎁 Gửi quà</button><button className="adm-btn adm-ghost" onClick={() => setGifting(null)}>Huỷ</button></div></div></td></tr>);
                      }
                      return editing && editing.id === p.id ? (
                        <tr key={p.id} className="adm-editrow">
                          <td><input className="adm-input" style={{ width: 60 }} value={editing.avatar} onChange={e => setEditing({ ...editing, avatar: e.target.value })} aria-label="avatar" /><input className="adm-input" style={{ width: 140, marginLeft: 6 }} value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} aria-label="name" /></td>
                          <td><code>{p.code}</code></td>
                          <td><code className="adm-uid" title={p.id}>{p.id.length > 12 ? p.id.slice(0, 8) + '…' + p.id.slice(-4) : p.id}</code></td>
                          <td><input className="adm-input" style={{ width: 64 }} type="number" value={editing.level} onChange={e => setEditing({ ...editing, level: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="level" /></td>
                          <td><input className="adm-input" style={{ width: 120 }} type="number" value={editing.nw} onChange={e => setEditing({ ...editing, nw: Math.max(0, Number(e.target.value) || 0) })} aria-label="net worth" /></td>
                          <td>{fmtAgo(p.last_seen)}</td><td>{p.banned ? '🚫' : '✓'}</td>
                          <td className="adm-actions"><button className="adm-btn" onClick={() => void saveEdit()}>💾 Lưu</button><button className="adm-btn adm-ghost" onClick={() => setEditing(null)}>Huỷ</button></td>
                        </tr>
                      ) : (
                        <tr key={p.id} className={p.banned ? 'adm-banned' : ''}>
                          <td>{p.avatar} {p.name}{isOnline(p) ? ' 🟢' : ''}</td>
                          <td><code>{p.code}</code></td>
                          <td><code className="adm-uid" title={p.id}>{p.id.length > 12 ? p.id.slice(0, 8) + '…' + p.id.slice(-4) : p.id}</code></td>
                          <td>{p.level}</td><td className="adm-nw">{fmtMoney(p.nw)}</td><td>{fmtAgo(p.last_seen)}</td>
                          <td>{p.banned ? '🚫 Bị cấm' : isOnline(p) ? '🟢 Online' : '✓'}</td>
                          <td className="adm-actions">
                            <button className="adm-btn" title="Sửa thông tin" onClick={() => { setEditing({ ...p }); setNote(''); }}>✏️</button>
                            <button className="adm-btn" title="Gửi quà" onClick={() => { setGifting({ ...p }); setGiftAmt('1000'); setGiftNote(''); }}>🎁</button>
                            <button className={'adm-btn' + (p.banned ? '' : ' adm-warn')} title={p.banned ? 'Bỏ cấm' : 'Cấm chat + quà'} onClick={() => void banPlayer(p)}>{p.banned ? '✅' : '🚫'}</button>
                            <button className="adm-btn adm-danger" title="Xoá vĩnh viễn" onClick={() => void delPlayer(p)}>🗑</button>
                          </td>
                        </tr>
                      );
                    })}
                    {players && players.length === 0 && <tr><td colSpan={8}>Không tìm thấy người chơi nào.</td></tr>}
                    {!players && <tr><td colSpan={8}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="adm-note">🚫 Cấm = không chat + không tặng quà, vẫn chơi đơn. 🗑 Xoá = xoá cả hồ sơ, chat, bạn bè, quà. 🎁 Quà từ admin nhận danh nghĩa <b>HuyenBao 📢</b>.</p>
            </section>
          )}

          {tab === 'chat' && (
            <section className="adm-top">
              <div className="adm-bcast">
                <textarea className="adm-input" rows={2} value={bcast} placeholder="📢 Thông báo dành cho toàn server (đăng vào khung chat với tên HuyenBao 📢)…" onChange={e => setBcast(e.target.value)} />
                <button className="adm-btn" disabled={!bcast.trim()} onClick={() => void sendBcast()}>📢 Phát thông báo</button>
              </div>
              <div className="adm-tools"><b style={{ fontSize: '.95rem' }}>Tin nhắn mới nhất</b><button className="adm-btn adm-ghost" onClick={() => void loadMsgs()}>↻ Làm mới</button></div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Thời gian</th><th>Người gửi</th><th>Nội dung</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(msgs ?? []).map(m => (<tr key={m.id}><td className="adm-time">{new Date(m.ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td><td>{m.avatar} {m.name}<br /><code className="adm-mini-code">{m.uid.slice(0, 10)}…</code></td><td className="adm-msgtext">{m.text}</td><td className="adm-actions"><button className="adm-btn" title="Xoá tin này" onClick={() => void delMsg(m)}>🗑</button><button className="adm-btn adm-danger" title="Xoá tất cả tin của người này" onClick={() => void delUserMsgs(m)}>🧹</button></td></tr>))}
                    {msgs && msgs.length === 0 && <tr><td colSpan={4}>Chưa có tin nhắn nào.</td></tr>}
                    {!msgs && <tr><td colSpan={4}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'gifts' && (
            <section className="adm-top">
              <div className="adm-bcast">
                <b>🎁 Gửi quà từ admin (danh nghĩa HuyenBao 📢)</b>
                <div className="adm-row"><input className="adm-input" value={sendTo} placeholder="Mã HB-XXXXXX hoặc UID" onChange={e => setSendTo(e.target.value)} style={{ flex: '0 0 200px' }} /><input className="adm-input" type="number" value={sendAmt} aria-label="amount" onChange={e => setSendAmt(e.target.value)} style={{ flex: '0 0 140px' }} /><input className="adm-input" value={sendNote} placeholder="Lời nhắn (tuỳ chọn)" onChange={e => setSendNote(e.target.value)} style={{ flex: 1 }} /></div>
                <button className="adm-btn" disabled={!sendTo.trim()} onClick={() => void sendAdminGift()}>🎁 Gửi quà</button>
              </div>
              <div className="adm-tools"><b style={{ fontSize: '.95rem' }}>Lịch sử quà tặng (100 gần nhất)</b><button className="adm-btn adm-ghost" onClick={() => void loadGifts()}>↻ Làm mới</button></div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Thời gian</th><th>Từ</th><th>Đến</th><th>Số tiền</th><th>Lời nhắn</th><th>Trạng thái</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(gifts ?? []).map(g => (<tr key={g.id} className={g.from === 'hb-system' ? 'adm-sysrow' : ''}><td className="adm-time">{new Date(g.ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td><td>{g.fromName}{g.from === 'hb-system' && ' 📢'}</td><td><code className="adm-mini-code">{g.to.slice(0, 10)}…</code></td><td className="adm-nw">{fmtMoney(g.amount)}</td><td>{g.note || '—'}</td><td>{g.claimed ? '✅ đã nhận' : '⏳ chờ nhận'}</td><td className="adm-actions"><button className="adm-btn adm-danger" title="Xoá quà" onClick={() => void delGift(g)}>🗑</button></td></tr>))}
                    {gifts && gifts.length === 0 && <tr><td colSpan={7}>Chưa có quà tặng nào.</td></tr>}
                    {!gifts && <tr><td colSpan={7}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'leaderboard' && (
            <section className="adm-top">
              <div className="adm-tools"><h2 style={{ margin: 0 }}>🏆 Bảng xếp hạng — Top 50</h2><button className="adm-btn" onClick={() => void loadTop()}>↻ Làm mới</button><button className="adm-btn adm-danger" onClick={() => void resetLeaderboard()}>♻️ Reset toàn bộ</button></div>
              <p className="adm-note">Reset = đặt lại <code>nw=0</code> và <code>level=1</code> cho mọi người. Tài khoản, chat, bạn bè, quà tặng KHÔNG bị xoá.</p>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>#</th><th>Người chơi</th><th>Mã</th><th>Level</th><th>Tài sản ròng</th><th>Hoạt động</th></tr></thead>
                  <tbody>
                    {(top ?? []).map((p, i) => (<tr key={p.code}><td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td><td>{p.avatar} {p.name}{isOnline(p) ? ' 🟢' : ''}</td><td><code>{p.code}</code></td><td>{p.level}</td><td className="adm-nw">{fmtMoney(p.nw)}</td><td>{fmtAgo(p.last_seen)}</td></tr>))}
                    {top && top.length === 0 && <tr><td colSpan={6}>Chưa có người chơi nào.</td></tr>}
                    {!top && <tr><td colSpan={6}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'db' && (
            <section className="adm-top">
              <h2 style={{ marginTop: 0 }}>🗄 Cơ sở dữ liệu SQLite</h2>
              <div className="adm-grid">
                {card('Đường dẫn', 'SOCIAL_DB_PATH / data/social.db', stats ? stats.dbPath.split('/').slice(-2).join('/') : '…')}
                {card('Kích thước', 'on disk (WAL excluded)', stats ? fmtBytes(stats.dbBytes) : '…')}
                {card('Tổng tin nhắn', 'messages', stats ? fmtN(stats.messages) : '…')}
              </div>
              <div className="adm-tools"><button className="adm-btn" onClick={() => void dbVacuum()}>🧹 VACUUM — tối ưu file CSDL</button><button className="adm-btn adm-danger" onClick={() => void dbClearMsgs()}>🗑 Xoá TOÀN BỘ tin nhắn chat</button></div>
              <p className="adm-note">VACUUM nén lại file <code>social.db</code> sau khi xoá dữ liệu. Xoá tin nhắn là hành động phá huỷ — không thể hoàn tác; hãy cân nhắc backup file trước.</p>
            </section>
          )}

          {/* ---------------- GAME CONTROL (v11.39) ---------------- */}
          {tab === 'game' && (
            <section className="adm-top">
              <h2 style={{ marginTop: 0 }}>🎮 Điều khiển game</h2>
              <p className="adm-note">Tạo và chỉnh sửa catalogue item được lưu trong SQLite. Các thao tác thay đổi save người chơi (money, fame, health, spirit, level, election, thời gian, cấp item và AI difficulty) hiện bị khóa an toàn: save game vẫn nằm trong LocalStorage của trình duyệt nên server chưa thể sửa đúng tài khoản. API sẽ trả 501 thay vì báo thành công giả.</p>
              <div className="adm-bcast">
                <b>Người chơi mục tiêu (UID hoặc HB-code)</b>
                <div className="adm-row">
                  <input className="adm-input" value={gameUid} placeholder="HB-XXXXXX hoặc UID" onChange={e => setGameUid(e.target.value)} style={{ flex: '0 0 200px' }} />
                </div>
                <div className="adm-row">
                  <input className="adm-input" type="number" value={gameAmount} placeholder="Amount" onChange={e => setGameAmount(e.target.value)} style={{ flex: '0 0 140px' }} />
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'setMoney', uid: gameUid, amount: Number(gameAmount) }); flash('✅ Đặt money'); } catch { flash('❌ Thất bại'); } })()}>💵 Đặt money</button>
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'setFame', uid: gameUid, amount: Number(gameAmount) }); flash('✅ Đặt fame'); } catch { flash('❌ Thất bại'); } })()}>⭐ Đặt fame</button>
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'setHealth', uid: gameUid, amount: Number(gameAmount) }); flash('✅ Đặt health'); } catch { flash('❌ Thất bại'); } })()}>❤️ Đặt health</button>
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'setSpirit', uid: gameUid, amount: Number(gameAmount) }); flash('✅ Đặt spirit'); } catch { flash('❌ Thất bại'); } })()}>🧘 Đặt spirit</button>
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'setLevel', uid: gameUid, level: Number(gameAmount) }); flash('✅ Đặt level'); } catch { flash('❌ Thất bại'); } })()}>⭐ Đặt level</button>
                </div>
                <div className="adm-row">
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'triggerElection', uid: gameUid }); flash('✅ Đã mở bầu cử'); } catch { flash('❌ Thất bại'); } })()}>🗳️ Mở bầu cử</button>
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'advanceTime', uid: gameUid, days: Number(gameAmount) }); flash('✅ Tăng ' + gameAmount + ' ngày'); } catch { flash('❌ Thất bại'); } })()}>⏰ Tăng thời gian (ngày)</button>
                </div>
              </div>

              <div className="adm-tools"><b style={{ fontSize: '.95rem' }}>Cấp item cho người chơi</b><button className="adm-btn adm-ghost" onClick={() => void loadItems()}>↻ Làm mới danh sách</button></div>

              {/* v11.40 — Create/Update item from URL (v12.2: doubles as the
                  edit form when editingItemId is set).
                  v13.2 — Stock + Rarity fields added: stock is empty (→ ∞
                  unlimited) or a positive integer; rarity is a dropdown
                  including the new mythic tier. Selecting mythic auto-suggests
                  a stock of 1-10 and shows a hint. */}
              <div className="adm-bcast">
                <b>{editingItemId ? '✏️ Sửa vật phẩm tuỳ chỉnh' : '➕ Tạo vật phẩm mới từ URL ảnh'}</b>
                {editingItemId && <p className="adm-note">Đang sửa item <code className="adm-mini-code">{editingItemId.slice(0, 18)}…</code> — ấn <b>Cập nhật</b> để lưu, hoặc <b>Huỷ</b> để quay lại tạo mới.</p>}
                <div className="adm-row">
                  <input className="adm-input" value={newItemName} placeholder="Tên vật phẩm" onChange={e => setNewItemName(e.target.value)} style={{ flex: '1 1 140px' }} />
                  <input className="adm-input" value={newItemCat} placeholder="Danh mục" onChange={e => setNewItemCat(e.target.value)} style={{ flex: '0 0 100px' }} />
                  <input className="adm-input" type="number" value={newItemPrice} placeholder="Giá" onChange={e => setNewItemPrice(e.target.value)} style={{ flex: '0 0 100px' }} />
                  {/* v13.2 — Rarity dropdown. Includes mythic (crimson). */}
                  <select className="adm-input" value={newItemRarity} onChange={e => {
                    const v = e.target.value as typeof newItemRarity;
                    setNewItemRarity(v);
                    // Auto-suggest stock 1-10 when mythic is selected and the
                    // stock field is empty (don't overwrite an explicit value).
                    if (v === 'mythic' && !newItemStock.trim()) setNewItemStock('5');
                  }} style={{ flex: '0 0 120px' }} aria-label="Rarity">
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="legendary">Legendary</option>
                    <option value="mythic">Mythic</option>
                  </select>
                  {/* v13.2 — Stock input. Empty = unlimited (∞). */}
                  <input className="adm-input" type="number" value={newItemStock} placeholder="∞ unlimited" onChange={e => setNewItemStock(e.target.value.replace(/[^0-9]/g, ''))} style={{ flex: '0 0 120px' }} aria-label="Stock" />
                </div>
                {/* v13.2 — Mythic hint shown only when mythic is selected. */}
                {newItemRarity === 'mythic' && <p className="adm-note" style={{ color: '#9f1239' }}>🌍 Mythic items are ultra-limited: only 1-10 exist globally. Set stock ≤ 10 to enforce scarcity.</p>}
                <div className="adm-row">
                  <input className="adm-input" value={newItemUrl} placeholder="https://example.com/image.jpg" onChange={e => setNewItemUrl(e.target.value)} style={{ flex: 1 }} />
                  <button className="adm-btn" disabled={!newItemName.trim() || !newItemUrl.trim() || (newItemRarity === 'mythic' && newItemStock.trim() !== '' && (Number(newItemStock) < 1 || Number(newItemStock) > 10))} onClick={() => void (async () => {
                    // v13.2 — parse stock: empty string → null (unlimited);
                    // a positive integer → that number (clamped 1..1e6).
                    const stockNum = newItemStock.trim() === '' ? null : Math.max(1, Math.min(1_000_000, Math.round(Number(newItemStock) || 0)));
                    try {
                      if (editingItemId) {
                        // v12.2 — update existing item by id.
                        const r = await adminPost<{ ok: boolean; itemId?: string; name?: string; error?: string }>('/api/admin/game', { action: 'updateItem', id: editingItemId, name: newItemName, cat: newItemCat, price: Number(newItemPrice), imageUrl: newItemUrl, rarity: newItemRarity, stock: stockNum });
                        if (!r.ok) throw new Error(r.error || 'failed');
                        flash('✅ Đã cập nhật "' + (r.name || '') + '"');
                      } else {
                        // create mode
                        const r = await adminPost<{ ok: boolean; itemId?: string; name?: string; error?: string }>('/api/admin/game', { action: 'createItem', name: newItemName, cat: newItemCat, price: Number(newItemPrice), imageUrl: newItemUrl, rarity: newItemRarity, stock: stockNum });
                        if (!r.ok || !r.itemId) throw new Error(r.error || 'failed');
                        flash('✅ Đã tạo "' + (r.name || '') + '"');
                      }
                      // Reset the form back to create mode after either submit.
                      setEditingItemId(null);
                      setNewItemName(''); setNewItemUrl(''); setNewItemPrice('1000'); setNewItemCat('Custom'); setNewItemStock(''); setNewItemRarity('common');
                      void loadItems();
                    } catch (e) { const msg = e instanceof Error ? e.message : ''; flash('❌ ' + (editingItemId ? 'Cập nhật' : 'Tạo') + ' thất bại' + (msg === 'bad-url' ? ' — URL không hợp lệ' : msg === 'bad-patch' ? ' — thiếu tên hoặc URL' : msg === 'not-found' ? ' — không tìm thấy item' : msg === 'bad-stock' ? ' — stock phải 1-10 cho mythic' : '')); }
                  })()}>{editingItemId ? '💾 Cập nhật' : '➕ Tạo'}</button>
                  {editingItemId && <button className="adm-btn adm-ghost" onClick={() => { setEditingItemId(null); setNewItemName(''); setNewItemUrl(''); setNewItemPrice('1000'); setNewItemCat('Custom'); setNewItemStock(''); setNewItemRarity('common'); }}>Huỷ</button>}
                </div>
                {newItemUrl && <img src={newItemUrl} alt="preview" style={{ maxWidth: 100, maxHeight: 80, borderRadius: 8, marginTop: 4, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
              </div>

              {/* v12.2 — AI event difficulty control. Easy/Normal/Hard scales
                  the win chances + failure penalties applied by rollRiskOutcome
                  in engine.ts. Persisted on the player's GameState via the
                  setDifficulty admin action (audit-log row); the engine reads
                  it on every AI event roll. */}
              <div className="adm-bcast">
                <b>🎯 Độ khó AI event (cho người chơi mục tiêu)</b>
                <p className="adm-note">Easy = tỷ lệ thắng +10% & penalty ×0.5. Normal = mặc định. Hard = tỷ lệ thắng −10% & penalty ×1.5. Điều khiển này tạm khóa cùng các thao tác save game cho đến khi có lưu trữ server-side được xác thực.</p>
                <div className="adm-row">
                  {(['easy', 'normal', 'hard'] as const).map(lvl => (
                    <label key={lvl} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                      <input type="radio" name="ai-difficulty" value={lvl} checked={aiDifficulty === lvl} onChange={() => setAiDifficulty(lvl)} />
                      <span>{lvl === 'easy' ? '🟢 Easy' : lvl === 'normal' ? '🟡 Normal' : '🔴 Hard'}</span>
                    </label>
                  ))}
                  <button className="adm-btn" disabled={!gameUid.trim()} onClick={() => void (async () => {
                    try {
                      const r = await adminPost<{ ok: boolean; level?: string; error?: string }>('/api/admin/game', { action: 'setDifficulty', uid: gameUid, level: aiDifficulty });
                      if (!r.ok) throw new Error(r.error || 'failed');
                      flash('✅ Đã đặt độ khó AI = ' + aiDifficulty + ' cho ' + gameUid);
                    } catch { flash('❌ Đặt độ khó thất bại'); }
                  })()}>💾 Đặt độ khó</button>
                </div>
              </div>

              {itemList && (
                <div className="adm-scroll" style={{ maxHeight: 400 }}>
                  <table>
                    <thead><tr><th>Item</th><th>Danh mục</th><th>Giá</th><th>Hiếm</th><th>Quản trị</th></tr></thead>
                    <tbody>
                      {/* v11.40 — custom items first (with image thumbnail), then built-in items.
                          v12.2 — custom rows get an EDIT button that loads the item into the
                          form above and flips the form to "update" mode. */}
                      {(itemList.custom || []).map(it => (
                        <tr key={it.id}>
                          <td><img src={it.imageUrl} alt="" style={{ width: 28, height: 28, borderRadius: 5, objectFit: 'cover', verticalAlign: 'middle', marginRight: 6 }} />{it.name} <span className="adm-mini-code">custom</span>{it.stock != null ? <span className="adm-mini-code" style={{ marginLeft: 6 }}>stock: {it.stock}</span> : null}</td>
                          <td>{it.cat}</td>
                          <td className="adm-nw">${it.price.toLocaleString('vi-VN')}</td>
                          <td>{it.rarity}</td>
                          <td className="adm-actions">
                            {/* v13.2 — Edit button now also loads stock + rarity into the form. */}
                            <button className="adm-btn" title="Sửa vật phẩm" onClick={() => {
                              setEditingItemId(it.id);
                              setNewItemName(it.name);
                              setNewItemCat(it.cat);
                              setNewItemPrice(String(it.price));
                              setNewItemUrl(it.imageUrl);
                              setNewItemRarity((['common', 'uncommon', 'rare', 'legendary', 'mythic'].includes(it.rarity) ? it.rarity : 'common') as typeof newItemRarity);
                              setNewItemStock(it.stock == null ? '' : String(it.stock));
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}>✏️</button>
                            <button className="adm-btn" title="Cấp item" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'grantItem', uid: gameUid, itemId: it.id }); flash('✅ Đã cấp ' + it.name); } catch { flash('❌ Thất bại'); } })()}>🎁</button>
                          </td>
                        </tr>
                      ))}
                      {[...itemList.items, ...itemList.rare].map(it => (
                        <tr key={it.id}>
                          <td>{it.name}</td>
                          <td>{it.cat}</td>
                          <td className="adm-nw">${it.price.toLocaleString('vi-VN')}</td>
                          <td>{it.rarity}</td>
                          <td className="adm-actions"><button className="adm-btn" title="Cấp item" disabled={!gameUid.trim()} onClick={() => void (async () => { try { await adminPost('/api/admin/game', { action: 'grantItem', uid: gameUid, itemId: it.id }); flash('✅ Đã cấp ' + it.name); } catch { flash('❌ Thất bại'); } })()}>🎁</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!itemList && <p className="adm-note">Đang tải danh sách item…</p>}
            </section>
          )}
        </>
      )}

      <footer className="adm-foot">
        <span>{phase === 'live' && stats ? 'Cập nhật lúc ' + new Date(stats.ts).toLocaleTimeString('vi-VN') + (tab === 'overview' ? ' · tự refresh 10s' : '') : 'HuyenBao v11.35'}</span>
        <a href="/" className="adm-back">← Về game</a>
      </footer>
    </div>
  );
}
