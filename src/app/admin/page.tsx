'use client';
// v11.27 — HuyenBao admin dashboard (self-hosted / VPS deployments).
//
// Standalone page (outside the game shell) that reads /api/admin/stats —
// protected by the server-only ADMIN_KEY env var. On the VPS:
//   1. Set ADMIN_KEY=<your-secret> in the environment before `next start`.
//   2. Open https://your-domain/admin, paste the key once (kept in
//      sessionStorage of this tab only — never sent anywhere else).
// If the API is missing (static/GitHub-Pages build) the page explains that
// the SQLite backend is not active.
import { useCallback, useEffect, useRef, useState } from 'react';

interface Stats {
  ok: true; ts: number; dbPath: string; dbBytes: number;
  players: number; online: number; messages: number; messages24h: number;
  gifts: number; gifts24h: number; edges: number; acceptedEdges: number;
  top: { code: string; name: string; avatar: string; nw: number; level: number }[];
}

const KEY_STORE = 'hb_admin_key';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
const asset = (p: string) => BASE + p;
const fmtN = (n: number) => n.toLocaleString('vi-VN');
const fmtMoney = (n: number) => '$' + Math.round(n).toLocaleString('vi-VN');
const fmtBytes = (n: number) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';

type Phase = 'locked' | 'loading' | 'live' | 'badkey' | 'noserver';

export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [key, setKey] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [now, setNow] = useState<number>(0);
  const keyRef = useRef('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    if (!keyRef.current) return;
    try {
      const r = await fetch(asset('/api/admin/stats?key=') + encodeURIComponent(keyRef.current), { cache: 'no-store' });
      if (r.status === 403) {
        const j = await r.json().catch(() => ({})) as { error?: string };
        keyRef.current = '';
        try { sessionStorage.removeItem(KEY_STORE); } catch { /* ignore */ }
        setPhase(j.error === 'admin-key-not-set' ? 'noserver' : 'badkey');
        setStats(null);
        return;
      }
      if (!r.ok) throw new Error('http-' + r.status);
      const j = await r.json() as Stats;
      setStats(j);
      setNow(Date.now());
      setPhase('live');
    } catch {
      setPhase('noserver');
      setStats(null);
    }
  }, []);

  const unlock = useCallback(() => {
    keyRef.current = key.trim();
    try { sessionStorage.setItem(KEY_STORE, keyRef.current); } catch { /* ignore */ }
    setPhase('loading');
    void load();
  }, [key, load]);

  useEffect(() => {
    try { keyRef.current = sessionStorage.getItem(KEY_STORE) || ''; } catch { /* ignore */ }
    if (keyRef.current) { setPhase('loading'); void load(); }
    else setPhase('locked');
    timer.current = setInterval(() => { if (keyRef.current) void load(); }, 10000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [load]);

  const card = (label: string, sub: string, value: string, tone?: string) => (
    <div className="adm-card" style={tone ? { borderColor: tone } : undefined}>
      <div className="adm-val" style={tone ? { color: tone } : undefined}>{value}</div>
      <div className="adm-lab">{label}</div>
      <div className="adm-sub">{sub}</div>
    </div>
  );

  return (
    <div className="admpage">
      <header className="adm-head">
        <h1>🛡️ HuyenBao <span>Admin</span></h1>
        <span className="adm-chip">{phase === 'live' ? 'SQLite backend · LIVE' : 'SQLite backend'}</span>
      </header>

      {phase === 'locked' && (
        <section className="adm-gate">
          <p>Nhập <b>ADMIN_KEY</b> đã đặt trên server (biến môi trường trước khi <code>next start</code>).<br />
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
          <p>⚠️ Không gọi được <code>/api/admin/stats</code>.</p>
          <ul className="adm-list">
            <li>Server chưa đặt biến môi trường <code>ADMIN_KEY</code> → API từ chối mọi request (mặc định an toàn).</li>
            <li>Hoặc bạn đang mở bản build tĩnh (GitHub Pages) — admin dashboard chỉ hoạt động khi chạy <code>next build && next start</code> trên VPS.</li>
          </ul>
          <button onClick={() => setPhase('locked')}>Nhập key khác</button>
        </section>
      )}

      {(phase === 'loading' || phase === 'live') && (
        <>
          <div className="adm-grid">
            {card('Người chơi', 'players registered', stats ? fmtN(stats.players) : '…')}
            {card('Đang online', 'seen in the last 13s', stats ? fmtN(stats.online) : '…', stats && stats.online > 0 ? '#2e9e5b' : undefined)}
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

      <footer className="adm-foot">
        <span>{phase === 'live' && stats ? 'Cập nhật lúc ' + new Date(now).toLocaleTimeString('vi-VN') + ' · tự refresh 10s' : 'HuyenBao v11.27'}</span>
        <a href={asset('/')} className="adm-back">← Về game</a>
      </footer>
    </div>
  );
}
