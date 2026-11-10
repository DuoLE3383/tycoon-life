'use client';
// v11.25 — Community views (real player-to-player layer, distinct from the
// in-game NPC "social" tab): global chat, friends by player code with gifting,
// and the cross-device leaderboard. Data comes from useCommunity() in page.tsx
// (Supabase when configured, same-device demo mode otherwise).
import { useEffect, useRef, useState } from 'react';
import { Ic } from '@/lib/art';
import { fmt, type GameState } from '@/lib/engine';
import { useT } from '@/lib/i18n';
import { SOC_AVATARS, SOC_GIFT_MAX, SOC_MSG_MAX, type Comm, type SocGift, type SocPlayer } from '@/lib/social';

const asset = (p: string) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + p;
type Act = (fn: (st: GameState) => string | null | void) => void;

const hm = (ts: number) => {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};

// banner shown on top of every community view
function SocBanner({ comm }: { comm: Comm }) {
  const { t } = useT();
  if (comm.error) {
    return (
      <div className="soc-banner warn">
        <span>⚠ {t('soc.connErr')}</span>
        <button className="ibtn ghost tsmall" onClick={comm.retry}>{t('v11.reload')}</button>
      </div>
    );
  }
  if (comm.mode === 'supabase') return null;
  if (comm.mode === 'sqlite') {
    // v11.27 — self-hosted SQLite backend detected: everyone on this server
    // shares the same chat/friends/gifts/leaderboard. No setup guide needed.
    return (
      <div className="soc-banner ok">
        <span>🗄 {t('soc.sqlite')}</span>
      </div>
    );
  }
  return (
    <details className="fold soc-setup">
      <summary>🧪 {t('soc.demo')}</summary>
      <div className="foldbody">
        <ol className="soc-steps">
          {(['1', '2', '3', '4', '5'] as const).map(n => <li key={n}>{t('soc.step' + n)}</li>)}
        </ol>
        <a className="ibtn ghost tsmall" href={asset('/hb-supabase-schema.sql')} download>
          <Ic id="ic-down" className="bsi" /><span>{t('soc.sql')}</span>
        </a>
      </div>
    </details>
  );
}

function Av({ p, dim }: { p: SocPlayer | null; dim?: boolean }) {
  return <span className={'soc-av' + (dim ? ' dim' : '')}>{p ? p.avatar : '❔'}</span>;
}

// ============================== CHAT ==============================
export function ChatView({ comm }: { comm: Comm }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comm.messages.length]);
  const send = async () => {
    const msg = text.trim();
    if (!msg || busy) return;
    setBusy(true);
    const ok = await comm.send(msg);
    setBusy(false);
    if (ok) setText('');
  };
  return (
    <>
      <SocBanner comm={comm} />
      <div className="card">
        <div className="soc-onhead">
          <b>{t('tab.chat')}</b>
          <span className="mini">🟢 {t('soc.onlineNow', '', { n: comm.online.length })}</span>
        </div>
        {comm.online.length > 0 && (
          <div className="soc-online">
            {comm.online.slice(0, 12).map(p => (
              <span className="soc-ochip" key={p.id} title={p.name}><Av p={p} />{p.name}</span>
            ))}
          </div>
        )}
        <div className="soc-msgs" ref={boxRef}>
          {comm.messages.length === 0
            ? <div className="sub soc-empty">{t('soc.chatEmpty')}</div>
            : comm.messages.map(m => {
              const mine = !!comm.me && m.uid === comm.me.id;
              return (
                <div className={'smsg' + (mine ? ' me' : '')} key={m.id}>
                  <span className="soc-av">{m.avatar}</span>
                  <div className="smsg-bd">
                    <div className="smsg-hd"><b>{mine ? t('soc.you') : m.name}</b><span className="mini">{hm(m.ts)}</span></div>
                    <div className="smsg-tx">{m.text}</div>
                  </div>
                </div>
              );
            })}
        </div>
        <div className="soc-inrow">
          <input
            value={text}
            maxLength={SOC_MSG_MAX}
            placeholder={t('soc.saySomething')}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void send(); }}
          />
          <button className="ibtn" disabled={busy || !text.trim()} onClick={() => void send()}>
            <Ic id="ic-play" className="bsi" /><span>{t('soc.send')}</span>
          </button>
        </div>
      </div>
      <p className="sub" style={{ marginTop: 8 }}>{t('soc.chatNote')}</p>
    </>
  );
}

// ============================== FRIENDS ==============================
export function FriendsView({ s, act, comm, toast }: { s: GameState; act: Act; comm: Comm; toast: (m: string) => void }) {
  const { t } = useT();
  const [nameDraft, setNameDraft] = useState('');
  const [avatarDraft, setAvatarDraft] = useState('🐯');
  const [codeIn, setCodeIn] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [giftOpen, setGiftOpen] = useState<Record<string, boolean>>({});
  const [giftAmt, setGiftAmt] = useState<Record<string, string>>({});
  const [giftNote, setGiftNote] = useState<Record<string, string>>({});
  const profileLoaded = useRef(false);
  useEffect(() => {
    if (profileLoaded.current || !comm.me) return;
    profileLoaded.current = true;
    setNameDraft(comm.me.name);
    setAvatarDraft(comm.me.avatar);
  }, [comm.me]);

  const copyCode = async () => {
    if (!comm.me) return;
    try {
      await navigator.clipboard.writeText(comm.me.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  const saveProfile = async () => {
    if (!comm.me) return;
    await comm.updateProfile(nameDraft, avatarDraft);
    toast(t('soc.saved'));
  };
  const addByCode = async () => {
    if (!codeIn.trim() || codeBusy) return;
    setCodeBusy(true);
    const r = await comm.addFriendByCode(codeIn);
    setCodeBusy(false);
    if (r === 'sent') { toast(t('soc.reqSent')); setCodeIn(''); }
    else if (r === 'auto') { toast(t('soc.reqAuto')); setCodeIn(''); }
    else if (r === 'exists') toast(t('soc.reqExists'));
    else if (r === 'self') toast(t('soc.selfCode'));
    else if (r === 'notfound') toast(t('soc.notFound'));
    else toast(t('soc.giftFail'));
  };
  const claim = async (g: SocGift) => {
    const ok = await comm.claimGift(g.id);
    if (!ok) { toast(t('soc.giftFail')); return; }
    act(st => { st.money += g.amount; return t('soc.claimToast', '', { x: fmt(g.amount), n: g.fromName }); });
  };
  const sendGift = async (p: SocPlayer) => {
    const amt = Math.floor(Number(giftAmt[p.id] || 0));
    if (!(amt > 0)) return;
    const ok = await comm.sendGift(p.id, Math.min(amt, SOC_GIFT_MAX), giftNote[p.id] || '');
    if (!ok) { toast(t('soc.giftFail')); return; }
    act(st => { st.money -= amt; return null; });
    toast(t('soc.giftSent', '', { n: p.name }));
    setGiftOpen(o => ({ ...o, [p.id]: false }));
    setGiftAmt(o => ({ ...o, [p.id]: '' }));
    setGiftNote(o => ({ ...o, [p.id]: '' }));
  };
  const isOnline = (id: string) => comm.online.some(o => o.id === id);

  return (
    <>
      <SocBanner comm={comm} />
      {/* identity */}
      <div className="card">
        <div className="soc-idrow">
          <span className="soc-av big">{avatarDraft}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mini">{t('soc.name')}</div>
            <input value={nameDraft} maxLength={24} onChange={e => setNameDraft(e.target.value)} />
          </div>
          <button className="ibtn" disabled={!comm.ready || (comm.me ? (nameDraft === comm.me.name && avatarDraft === comm.me.avatar) : true)} onClick={() => void saveProfile()}>
            <Ic id="ic-check" className="bsi" /><span>{t('soc.save')}</span>
          </button>
        </div>
        <div className="soc-avpick">
          {SOC_AVATARS.map(a => (
            <button key={a} className={'soc-avbtn' + (a === avatarDraft ? ' on' : '')} onClick={() => setAvatarDraft(a)}>{a}</button>
          ))}
        </div>
        {comm.me && (
          <>
            <div className="soc-code">
              <span className="mini">{t('soc.code')}</span>
              <code className="soc-codechip">{comm.me.code}</code>
              <button className="ibtn ghost tsmall" onClick={() => void copyCode()}>
                <Ic id="ic-link" className="bsi" /><span>{copied ? t('soc.copied') : t('soc.copy')}</span>
              </button>
            </div>
            <div className="mini" style={{ marginTop: 4 }}>{t('soc.codeHint')}</div>
          </>
        )}
      </div>

      {/* add by code */}
      <h3>{t('soc.addFriend')}</h3>
      <div className="card">
        <div className="soc-inrow">
          <input value={codeIn} placeholder="HB-XXXXXX" maxLength={9} onChange={e => setCodeIn(e.target.value.toUpperCase())} onKeyDown={e => { if (e.key === 'Enter') void addByCode(); }} />
          <button className="ibtn" disabled={codeBusy || !comm.ready} onClick={() => void addByCode()}>
            <Ic id="ic-users" className="bsi" /><span>{t('soc.addFriend')}</span>
          </button>
        </div>
      </div>

      {/* incoming requests */}
      <h3>{t('soc.requests')}{comm.incoming.length > 0 ? ` (${comm.incoming.length})` : ''}</h3>
      {comm.incoming.length === 0
        ? <p className="sub">{t('soc.noRequests')}</p>
        : comm.incoming.map(e => {
          const p = comm.people[e.a] ?? null;
          return (
            <div className="row" key={e.id}>
              <Av p={p} />
              <div className="info"><b>{p?.name ?? '…'}</b><span className="mini">{p?.code}</span></div>
              <button className="ibtn sageb tsmall" onClick={() => void comm.respondEdge(e.id, true)}>{t('soc.accept')}</button>
              <button className="ibtn ghost tsmall" onClick={() => void comm.respondEdge(e.id, false)}>{t('soc.decline')}</button>
            </div>
          );
        })}

      {/* friends */}
      <h3>{t('soc.friendsList')}{comm.friends.length > 0 ? ` (${comm.friends.length})` : ''}</h3>
      {comm.friends.length === 0 && <p className="sub">{t('soc.noFriends')}</p>}
      {comm.friends.map(({ edge, p }) => (
        <div className="row soc-friend" key={edge.id}>
          <span className="soc-avwrap"><Av p={p} />{p && isOnline(p.id) && <i className="soc-dot" title={t('soc.online')} />}</span>
          <div className="info">
            <b>{p?.name ?? '…'}</b>
            <span className="mini">{p ? `${t('lvl')} ${p.level} · ${fmt(p.nw)}` : ''}</span>
          </div>
          <button className="ibtn tsmall" onClick={() => setGiftOpen(o => ({ ...o, [p?.id ?? '']: !o[p?.id ?? ''] }))}>
            <Ic id="ic-heart" className="bsi" /><span>{t('soc.gift')}</span>
          </button>
          <button className="ibtn ghost tsmall" onClick={() => { if (window.confirm(t('soc.removeConfirm'))) void comm.removeFriend(p?.id ?? '').then(() => toast(t('soc.removed'))); }}>
            <Ic id="ic-x" className="bsi" /><span>{t('soc.remove')}</span>
          </button>
          {p && giftOpen[p.id] && (
            <div className="soc-giftform">
              <input type="number" min={1} placeholder={t('soc.giftAmount')} value={giftAmt[p.id] || ''} onChange={e => setGiftAmt(o => ({ ...o, [p.id]: e.target.value }))} />
              <input placeholder={t('soc.giftNote')} maxLength={120} value={giftNote[p.id] || ''} onChange={e => setGiftNote(o => ({ ...o, [p.id]: e.target.value }))} />
              <div className="hstack">
                <button className="ibtn sageb tsmall" disabled={!(Number(giftAmt[p.id]) > 0) || Number(giftAmt[p.id]) > s.money} onClick={() => void sendGift(p)}>
                  <Ic id="ic-coins" className="bsi" /><span>{t('soc.giftSend')}</span>
                </button>
                <span className="mini">{t('netWorth')}: {fmt(s.money)}</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* gift inbox */}
      <h3>{t('soc.inbox')}</h3>
      {comm.gifts.length === 0 && <p className="sub">{t('soc.noGifts')}</p>}
      {comm.gifts.map(g => {
        const mine = !!comm.me && g.from === comm.me.id;
        return (
          <div className={'row' + (g.claimed ? ' soc-claimed' : '')} key={g.id}>
            <span className="soc-av">🎁</span>
            <div className="info">
              <b>{g.fromName} → {mine ? t('soc.you') : (comm.people[g.to]?.name ?? '…')}</b>
              <span className="mini">{fmt(g.amount)}{g.note ? ` · “${g.note}”` : ''} · {hm(g.ts)}</span>
            </div>
            {mine
              ? <span className="tag">{g.claimed ? t('soc.claimed') : '⏳'}</span>
              : g.claimed
                ? <span className="tag">{t('soc.claimed')}</span>
                : <button className="ibtn tsmall" onClick={() => void claim(g)}><Ic id="ic-coins" className="bsi" /><span>{t('soc.claim')}</span></button>}
          </div>
        );
      })}
    </>
  );
}

// ============================== LEADERBOARD ==============================
export function BoardView({ comm }: { comm: Comm }) {
  const { t } = useT();
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <>
      <SocBanner comm={comm} />
      <div className="card">
        <div className="soc-onhead">
          <b>{t('soc.board')}</b>
          <span className="mini">🟢 {t('soc.onlineNow', '', { n: comm.online.length })}</span>
        </div>
        {comm.board.length === 0 && <div className="sub soc-empty">{t('soc.emptyBoard')}</div>}
        {comm.board.map((p, i) => {
          const mine = !!comm.me && p.id === comm.me.id;
          return (
            <div className={'soc-lbrow' + (mine ? ' me' : '')} key={p.id}>
              <span className="soc-rank">{i < 3 ? medals[i] : `#${i + 1}`}</span>
              <span className="soc-av">{p.avatar}</span>
              <div className="info">
                <b>{p.name}{mine ? ` · ${t('soc.you')}` : ''}</b>
                <span className="mini">{p.code} · {t('lvl')} {p.level}</span>
              </div>
              <b className="soc-nw">{fmt(p.nw)}</b>
            </div>
          );
        })}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>{t('soc.boardNote')}</p>
    </>
  );
}
