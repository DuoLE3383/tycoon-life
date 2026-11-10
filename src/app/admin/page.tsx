'use client';
// v11.29 — HuyenBao admin dashboard, full game-management console (VPS).
//
// Tabs:
//   📊 Tổng quan  — live server stats + top-10 net worth
//   👥 Người chơi — search, edit (name/avatar/level/net worth), ban/unban, delete
//   💬 Trò chuyện — chat moderation: delete a message, wipe a user, broadcast 📢
//   🎁 Quà tặng   — gift log + delete
//   🗄 CSDL       — SQLite maintenance: vacuum, wipe chat log
//
// Every /api/admin/* route is guarded by the server-only ADMIN_KEY env var.
// On the VPS: set ADMIN_KEY=<secret> before `next start`, open /admin, paste
// the key once (sessionStorage of this tab only — never sent anywhere else).
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
const ONLINE_MS = 13000;
const isOnline = (p: APlayer) => Date.now() - p.last_seen < ONLINE_MS;

type Phase = 'locked' | 'loading' | 'live' | 'badkey' | 'noserver';
type Tab = 'overview' | 'players' | 'chat' | 'gifts' | 'db';

export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [note, setNote] = useState('');
  const keyRef = useRef('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- players tab
  const [players, setPlayers] = useState<APlayer[] | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<APlayer | null>(null);
  // ---- chat tab
  const [msgs, setMsgs] = useState<AMsg[] | null>(null);
  const [bcast, setBcast] = useState('');
  // ---- gifts tab
  const [gifts, setGifts] = useState<AGift[] | null>(null);

  const flash = useCallback((m: string) => { setNote(m); setTimeout(() => setNote(''), 4000); }, []);

  const adminGet = useCallback(async <T,>(path: string, params: Record<string, string> = {}): Promise<T> => {
    const usp = new URLSearchParams({ key: keyRef.current, ...params });
    const r = await fetch(asset(path) + '?' + usp.toString(), { cache: 'no-store' });
    if (r.status === 403) {
      const j = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error === 'admin-key-not-set' ? 'noserver' : 'badkey');
    }
    if (!r.ok) throw new Error('http-' + r.status);
    return r.json() as Promise<T>;
  }, []);

  const adminPost = useCallback(async <T,>(path: string, body: Record<string, unknown>): Promise<T> => {
    const r = await fetch(asset(path), {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, key: keyRef.current }), cache: 'no-store',
    });
    if (r.status === 403) {
      const j = await r.json().catch(() => ({})) as { error?: string };
      throw new Error(j.error === 'admin-key-not-set' ? 'noserver' : 'badkey');
    }
    if (!r.ok) throw new Error('http-' + r.status);
    return r.json() as Promise<T>;
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const j = await adminGet<Stats>('/api/admin/stats');
      setStats(j); setPhase('live');
    } catch (e) {
      setPhase(e instanceof Error && (e.message === 'badkey' || e.message === 'noserver') ? (e.message as Phase) : 'noserver');
      setStats(null);
    }
  }, [adminGet]);

  const loadPlayers = useCallback(async (query = q) => {
    try {
      const j = await adminGet<{ players: APlayer[] }>('/api/admin/players', query.trim() ? { q: query.trim() } : {});
      setPlayers(j.players);
    } catch { setPlayers([]); }
  }, [adminGet, q]);

  const loadMsgs = useCallback(async () => {
    try {
      const j = await adminGet<{ messages: AMsg[] }>('/api/admin/messages');
      setMsgs(j.messages);
    } catch { setMsgs([]); }
  }, [adminGet]);

  const loadGifts = useCallback(async () => {
    try {
      const j = await adminGet<{ gifts: AGift[] }>('/api/admin/gifts');
      setGifts(j.gifts);
    } catch { setGifts([]); }
  }, [adminGet]);

  const loadTab = useCallback((tb: Tab) => {
    if (tb === 'players') void loadPlayers();
    else if (tb === 'chat') void loadMsgs();
    else if (tb === 'gifts') void loadGifts();
  }, [loadPlayers, loadMsgs, loadGifts]);

  const unlock = useCallback(() => {
    keyRef.current = key.trim();
    try { sessionStorage.setItem(KEY_STORE, keyRef.current); } catch { /* ignore */ }
    setPhase('loading');
    void loadStats();
  }, [key, loadStats]);

  useEffect(() => {
    try { keyRef.current = sessionStorage.getItem(KEY_STORE) || ''; } catch { /* ignore */ }
    if (keyRef.current) { setPhase('loading'); void loadStats(); }
    else setPhase('locked');
    timer.current = setInterval(() => { if (keyRef.current && tab === 'overview') void loadStats(); }, 10000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [loadStats, tab]);

  const switchTab = (tb: Tab) => { setTab(tb); setNote(''); loadTab(tb); };

  const logout = () => {
    keyRef.current = '';
    try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
    setPhase('locked'); setKey(''); setStats(null);
  };

  // ---------------- player actions ----------------
  const saveEdit = async () => {
    if (!editing) return;
    try {
      await adminPost('/api/admin/players', {
        action: 'update', uid: editing.id,
        name: editing.name, avatar: editing.avatar, level: editing.level, nw: editing.nw,
      });
      flash('✅ Đã cập nhật ' + editing.code);
      setEditing(null);
      void loadPlayers();
    } catch { flash('❌ Cập nhật thất bại'); }
  };
  const banPlayer = async (p: APlayer) => {
    try {
      await adminPost('/api/admin/players', { action: p.banned ? 'unban' : 'ban', uid: p.id });
      flash(p.banned ? '✅ Đã bỏ cấm ' + p.code : '🚫 Đã cấm ' + p.code + ' (không chat, không tặng quà)');
      void loadPlayers();
    } catch { flash('❌ Thao tác thất bại'); }
  };
  const delPlayer = async (p: APlayer) => {
    if (!window.confirm(`Xoá vĩnh viễn ${p.name} (${p.code})?\nToàn bộ tin nhắn, bạn bè, quà tặng của người này cũng bị xoá.`)) return;
    if (!window.confirm('Chắc chắn chứ? Hành động này KHÔNG thể hoàn tác.')) return;
    try {
      await adminPost('/api/admin/players', { action: 'delete', uid: p.id });
      flash('🗑 Đã xoá ' + p.code);
      void loadPlayers();
    } catch { flash('❌ Xoá thất bại'); }
  };

  // ---------------- chat actions ----------------
  const delMsg = async (m: AMsg) => {
    try {
      await adminPost('/api/admin/messages', { action: 'delete', id: Number(m.id) });
      setMsgs(cur => (cur ?? []).filter(x => x.id !== m.id));
    } catch { flash('❌ Xoá tin thất bại'); }
  };
  const delUserMsgs = async (m: AMsg) => {
    if (!window.confirm(`Xoá TOÀN BỘ tin nhắn của ${m.name}?`)) return;
    try {
      const r = await adminPost<{ removed: number }>('/api/admin/messages', { action: 'deleteUser', uid: m.uid });
      flash(`🗑 Đã xoá ${r.removed} tin của ${m.name}`);
      void loadMsgs();
    } catch { flash('❌ Thao tác thất bại'); }
  };
  const sendBcast = async () => {
    const text = bcast.trim();
    if (!text) return;
    try {
      await adminPost('/api/admin/messages', { action: 'broadcast', text });
      flash('📢 Đã phát thông báo vào khung chat');
      setBcast('');
      void loadMsgs();
    } catch { flash('❌ Gửi thất bại'); }
  };

  // ---------------- gift + db actions ----------------
  const delGift = async (g: AGift) => {
    try {
      await adminPost('/api/admin/gifts', { action: 'delete', id: Number(g.id) });
      setGifts(cur => (cur ?? []).filter(x => x.id !== g.id));
    } catch { flash('❌ Xoá quà thất bại'); }
  };
  const dbVacuum = async () => {
    try { await adminPost('/api/admin/db', { action: 'vacuum' }); flash('✅ Đã tối ưu CSDL (VACUUM)'); void loadStats(); }
    catch { flash('❌ VACUUM thất bại'); }
  };
  const dbClearMsgs = async () => {
    if (!window.confirm('Xoá TOÀN BỘ tin nhắn chat trong CSDL?')) return;
    if (!window.confirm('Chắc chắn chứ? Toàn bộ lịch sử chat sẽ mất.')) return;
    try {
      const r = await adminPost<{ removed: number }>('/api/admin/db', { action: 'clearMessages' });
      flash(`🗑 Đã xoá ${r.removed} tin nhắn`);
      void loadStats();
    } catch { flash('❌ Thao tác thất bại'); }
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
    { id: 'players', label: '👥 Người chơi' },
    { id: 'chat', label: '💬 Trò chuyện' },
    { id: 'gifts', label: '🎁 Quà tặng' },
    { id: 'db', label: '🗄 CSDL' },
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
          <p>Nhập <b>ADMIN_KEY</b> đã đặt trên server (biến môi trường trước <code>next start</code>).<br />
            <span className="adm-en">Enter the ADMIN_KEY env var configured on your VPS.</span></p>
          <div className="adm-row">
            <input type="password" value={key} placeholder="ADMIN_KEY…" aria-label="ADMIN_KEY"
              onChange={e => setKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') unlock(); }} />
            <button onClick={unlock}>Đăng nhập</button>
          </div>
          <p className="adm-note">Key chỉ lưu trong sessionStorage của tab này, không gửi đi đâu khác.</p>
        </section>
      )}

      {phase === 'badkey' && (
        <section className="adm-gate"><p>❌ Sai ADMIN_KEY. <span className="adm-en">Wrong key.</span></p>
          <button onClick={() => setPhase('locked')}>Thử lại</button></section>
      )}

      {phase === 'noserver' && (
        <section className="adm-gate">
          <p>⚠️ Không gọi được <code>/api/admin/*</code>.</p>
          <ul className="adm-list">
            <li>Server chưa đặt biến môi trường <code>ADMIN_KEY</code> → API từ chối mọi request (mặc định an toàn).</li>
            <li>Hoặc bạn đang mở bản build tĩnh (GitHub Pages) — admin dashboard chỉ hoạt động khi chạy <code>next build && next start</code> trên VPS.</li>
          </ul>
          <button onClick={() => setPhase('locked')}>Nhập key khác</button>
        </section>
      )}

      {(phase === 'loading' || phase === 'live') && (
        <>
          <nav className="adm-tabs" role="tablist">
            {TABS.map(tb => (
              <button key={tb.id} role="tab" aria-selected={tab === tb.id}
                className={'adm-tab' + (tab === tb.id ? ' on' : '')} onClick={() => switchTab(tb.id)}>
                {tb.label}
              </button>
            ))}
          </nav>

          {note && <div className="adm-flash" role="status">{note}</div>}

          {/* ---------------- OVERVIEW ---------------- */}
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
                    {(stats?.top || []).map((p, i) => (
                      <tr key={p.code}>
                        <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                        <td>{p.avatar} {p.name}</td>
                        <td><code>{p.code}</code></td>
                        <td>{p.level}</td>
                        <td className="adm-nw">{fmtMoney(p.nw)}</td>
                      </tr>
                    ))}
                    {stats && stats.top.length === 0 && <tr><td colSpan={5}>Chưa có người chơi nào đồng bộ bảng xếp hạng.</td></tr>}
                    {!stats && <tr><td colSpan={5}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {/* ---------------- PLAYERS ---------------- */}
          {tab === 'players' && (
            <section className="adm-top">
              <div className="adm-tools">
                <input className="adm-input" value={q} placeholder="Tìm theo tên hoặc mã HB-…"
                  onChange={e => setQ(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void loadPlayers(); }} />
                <button className="adm-btn" onClick={() => void loadPlayers()}>🔍 Tìm</button>
                {q && <button className="adm-btn adm-ghost" onClick={() => { setQ(''); void loadPlayers(''); }}>Xoá tìm kiếm</button>}
                <button className="adm-btn adm-ghost" onClick={() => void loadPlayers()}>↻ Làm mới</button>
              </div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Người chơi</th><th>Mã</th><th>Level</th><th>Tài sản</th><th>Hoạt động</th><th>Trạng thái</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(players ?? []).map(p => editing && editing.id === p.id ? (
                      <tr key={p.id} className="adm-editrow">
                        <td>
                          <input className="adm-input" style={{ width: 60 }} value={editing.avatar}
                            onChange={e => setEditing({ ...editing, avatar: e.target.value })} aria-label="avatar" />
                          <input className="adm-input" style={{ width: 140, marginLeft: 6 }} value={editing.name}
                            onChange={e => setEditing({ ...editing, name: e.target.value })} aria-label="name" />
                        </td>
                        <td><code>{p.code}</code></td>
                        <td><input className="adm-input" style={{ width: 64 }} type="number" value={editing.level}
                          onChange={e => setEditing({ ...editing, level: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="level" /></td>
                        <td><input className="adm-input" style={{ width: 120 }} type="number" value={editing.nw}
                          onChange={e => setEditing({ ...editing, nw: Math.max(0, Number(e.target.value) || 0) })} aria-label="net worth" /></td>
                        <td>{fmtAgo(p.last_seen)}</td>
                        <td>{p.banned ? '🚫' : '✓'}</td>
                        <td className="adm-actions">
                          <button className="adm-btn" onClick={() => void saveEdit()}>💾 Lưu</button>
                          <button className="adm-btn adm-ghost" onClick={() => setEditing(null)}>Huỷ</button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.id} className={p.banned ? 'adm-banned' : ''}>
                        <td>{p.avatar} {p.name}{isOnline(p) ? ' 🟢' : ''}</td>
                        <td><code>{p.code}</code></td>
                        <td>{p.level}</td>
                        <td className="adm-nw">{fmtMoney(p.nw)}</td>
                        <td>{fmtAgo(p.last_seen)}</td>
                        <td>{p.banned ? '🚫 Bị cấm' : isOnline(p) ? '🟢 Online' : '✓'}</td>
                        <td className="adm-actions">
                          <button className="adm-btn" title="Sửa thông tin" onClick={() => { setEditing({ ...p }); setNote(''); }}>✏️</button>
                          <button className={'adm-btn' + (p.banned ? '' : ' adm-warn')} title={p.banned ? 'Bỏ cấm' : 'Cấm chat + quà'}
                            onClick={() => void banPlayer(p)}>{p.banned ? '✅' : '🚫'}</button>
                          <button className="adm-btn adm-danger" title="Xoá vĩnh viễn" onClick={() => void delPlayer(p)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                    {players && players.length === 0 && <tr><td colSpan={7}>Không tìm thấy người chơi nào.</td></tr>}
                    {!players && <tr><td colSpan={7}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
              <p className="adm-note">🚫 Cấm = người đó không gửi được tin nhắn và quà tặng, nhưng vẫn chơi được phần chơi đơn. 🗑 Xoá = xoá cả hồ sơ, chat, bạn bè, quà.</p>
            </section>
          )}

          {/* ---------------- CHAT ---------------- */}
          {tab === 'chat' && (
            <section className="adm-top">
              <div className="adm-bcast">
                <textarea className="adm-input" rows={2} value={bcast} placeholder="📢 Thông báo dành cho toàn server (đăng vào khung chat với tên HuyenBao 📢)…"
                  onChange={e => setBcast(e.target.value)} />
                <button className="adm-btn" disabled={!bcast.trim()} onClick={() => void sendBcast()}>📢 Phát thông báo</button>
              </div>
              <div className="adm-tools">
                <b style={{ fontSize: '.95rem' }}>Tin nhắn mới nhất</b>
                <button className="adm-btn adm-ghost" onClick={() => void loadMsgs()}>↻ Làm mới</button>
              </div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Thời gian</th><th>Người gửi</th><th>Nội dung</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(msgs ?? []).map(m => (
                      <tr key={m.id}>
                        <td className="adm-time">{new Date(m.ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                        <td>{m.avatar} {m.name}<br /><code className="adm-mini-code">{m.uid.slice(0, 10)}…</code></td>
                        <td className="adm-msgtext">{m.text}</td>
                        <td className="adm-actions">
                          <button className="adm-btn" title="Xoá tin này" onClick={() => void delMsg(m)}>🗑</button>
                          <button className="adm-btn adm-danger" title="Xoá tất cả tin của người này" onClick={() => void delUserMsgs(m)}>🧹</button>
                        </td>
                      </tr>
                    ))}
                    {msgs && msgs.length === 0 && <tr><td colSpan={4}>Chưa có tin nhắn nào.</td></tr>}
                    {!msgs && <tr><td colSpan={4}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------------- GIFTS ---------------- */}
          {tab === 'gifts' && (
            <section className="adm-top">
              <div className="adm-tools">
                <b style={{ fontSize: '.95rem' }}>Lịch sử quà tặng (100 gần nhất)</b>
                <button className="adm-btn adm-ghost" onClick={() => void loadGifts()}>↻ Làm mới</button>
              </div>
              <div className="adm-scroll">
                <table>
                  <thead><tr><th>Thời gian</th><th>Từ</th><th>Đến</th><th>Số tiền</th><th>Lời nhắn</th><th>Trạng thái</th><th>Quản trị</th></tr></thead>
                  <tbody>
                    {(gifts ?? []).map(g => (
                      <tr key={g.id}>
                        <td className="adm-time">{new Date(g.ts).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</td>
                        <td>{g.fromName}</td>
                        <td><code className="adm-mini-code">{g.to.slice(0, 10)}…</code></td>
                        <td className="adm-nw">{fmtMoney(g.amount)}</td>
                        <td>{g.note || '—'}</td>
                        <td>{g.claimed ? '✅ đã nhận' : '⏳ chờ nhận'}</td>
                        <td className="adm-actions">
                          <button className="adm-btn adm-danger" title="Xoá quà" onClick={() => void delGift(g)}>🗑</button>
                        </td>
                      </tr>
                    ))}
                    {gifts && gifts.length === 0 && <tr><td colSpan={7}>Chưa có quà tặng nào.</td></tr>}
                    {!gifts && <tr><td colSpan={7}>Đang tải…</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ---------------- DB ---------------- */}
          {tab === 'db' && (
            <section className="adm-top">
              <h2 style={{ marginTop: 0 }}>🗄 Cơ sở dữ liệu SQLite</h2>
              <div className="adm-grid">
                {card('Đường dẫn', 'SOCIAL_DB_PATH / data/social.db', stats ? stats.dbPath.split('/').slice(-2).join('/') : '…')}
                {card('Kích thước', 'on disk (WAL excluded)', stats ? fmtBytes(stats.dbBytes) : '…')}
                {card('Tổng tin nhắn', 'messages', stats ? fmtN(stats.messages) : '…')}
              </div>
              <div className="adm-tools">
                <button className="adm-btn" onClick={() => void dbVacuum()}>🧹 VACUUM — tối ưu file CSDL</button>
                <button className="adm-btn adm-danger" onClick={() => void dbClearMsgs()}>🗑 Xoá TOÀN BỘ tin nhắn chat</button>
              </div>
              <p className="adm-note">VACUUM nén lại file <code>social.db</code> sau khi xoá dữ liệu. Xoá tin nhắn là hành động phá huỷ — không thể hoàn tác; hãy cân nhắc backup file trước.</p>
            </section>
          )}
        </>
      )}

      <footer className="adm-foot">
        <span>{phase === 'live' && stats ? 'Cập nhật lúc ' + new Date(stats.ts).toLocaleTimeString('vi-VN') + (tab === 'overview' ? ' · tự refresh 10s' : '') : 'HuyenBao v11.29'}</span>
        <a href={asset('/')} className="adm-back">← Về game</a>
      </footer>
    </div>
  );
}
