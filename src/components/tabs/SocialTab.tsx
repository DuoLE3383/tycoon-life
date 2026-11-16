'use client';

import { addPost, Art, asset, BIZ, branchCount, canPost, creativePost, fmt, type GameState, getState, postCooldownLeft, snapshot, socialIncome, stageOf, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= SOCIAL =================
export function SocialTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const ann = socialIncome(s);
  const canHype = BIZ.some(b => branchCount(s, b.id) > 0);
  const canCharity = s.donated > 0;
  const [aiBusy, setAiBusy] = useState(false);
  // v10.5 — generate a post from the local LLM at 127.0.0.1:8888. Falls back
  // to creativePost() if the LLM is unreachable. Mirrors the /api/story
  // pattern: backend local → local template fallback.
  const aiPost = async () => {
    setAiBusy(true);
    let text: string | null = null;
    const hasBackend = process.env.NEXT_PUBLIC_HAS_BACKEND !== '0';
    if (hasBackend) {
      try {
        const snap = snapshot(getState());
        const res = await fetch(asset('/api/post'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: snap })
        });
        if (res.ok) {
          const j = await res.json() as { text?: string; source?: string };
          if (j && typeof j.text === 'string' && j.text.trim()) text = j.text.slice(0, 240);
        }
      } catch { /* fall through to local */ }
    }
    if (!text) text = creativePost(getState(), canHype ? 'hype' : 'update');
    act(st => { addPost(st, text!, 1.4); return t('posted', '', { n: st.social.followers.toLocaleString('en-US') }); });
    setAiBusy(false);
  };
  return (
    <>
      <div className="card sprof">
        <Art id={stageOf(s.age).art} className="avatar" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <b className="big">@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'huyenbao'}
            {s.social.verified && <span className="vbadge" title={t('verified')}>✓</span>}</b>
          <div className="mini">{s.nation} · {t('fame')} {Math.round(s.fame)}</div>
          <div className="sstat">
            <div><b>{s.social.followers.toLocaleString('en-US')}</b><div className="mini">{t('followers')}</div></div>
            <div><b>{s.social.posts.length}</b><div className="mini">{t('posts')}</div></div>
            <div><b>{ann > 0 ? '+' + fmt(ann) : '—'}</b><div className="mini">{t('adRevenue')}{t('perYear')}</div></div>
          </div>
        </div>
      </div>
      <h3>{t('posts')}</h3>
      <div className="trade" style={{ justifyContent: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
        {/* v11.9 — all post buttons disabled during the one-post-per-game-day cooldown.
            This kills the spam-click exploit (repeat clicks kept adding followers/likes). */}
        <Btn ic="ic-ai" label={aiBusy ? t('divine.thinking') : t('postAi')} disabled={aiBusy || !canPost(s)} onClick={aiPost} />
        <Btn ic="ic-plus" label={t('postUpdate')} disabled={!canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'update'), 1); const n = st.social.followers.toLocaleString('en-US'); return t('posted', '', { n }); })} />
        <Btn ic="ic-up" label={t('postHype')} disabled={!canHype || !canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'hype'), 1.6); const n = st.social.followers.toLocaleString('en-US'); return t('posted', '', { n }); })} />
        <Btn ic="ic-heart" label={t('postCharity')} disabled={!canCharity || !canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'charity'), 1.4); const n = st.social.followers.toLocaleString('en-US'); return t('posted', '', { n }); })} />
        <Btn ic="ic-star" label={t('postMilestone')} disabled={!canPost(s)} onClick={() => act(st => { addPost(st, creativePost(st, 'milestone'), 1.5); const n = st.social.followers.toLocaleString('en-US'); return t('posted', '', { n }); })} />
      </div>
      {!canPost(s) && <p className="mini" style={{ margin: '-2px 0 8px', opacity: .8 }}>{t('postCooldown', '', { n: postCooldownLeft(s) })}</p>}
      <div className="card">
        {s.social.posts.length ? s.social.posts.map((p, i) => (
          <div className="post" key={i}>
            <Art id={stageOf(s.age).art} className="pav" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: '.9rem' }}>@{s.name.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'huyenbao'}{s.social.verified && <span className="vbadge">✓</span>}</b>
              <div style={{ fontSize: '.92rem' }}>{p.t}</div>
              <span className="mini">♥ {p.likes.toLocaleString('en-US')} · {t('followers')} +{Math.round(p.likes * 0.3).toLocaleString('en-US')}</span>
              {/* v11.50 — NPC reactions on AI-event posts. Friends comment
                  supportive, rivals snark — sentiment coloured accordingly. */}
              {p.reactions && p.reactions.length > 0 && (
                <div className="post-reactions" style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 8, borderLeft: '2px solid var(--line)' }}>
                  {p.reactions.map((rx, j) => (
                    <div key={j} className="mini" style={{ fontSize: '.78rem', color: rx.sentiment === 'pos' ? 'var(--sage)' : rx.sentiment === 'neg' ? 'var(--brick)' : 'var(--mute)' }}>
                      <b style={{ opacity: .9 }}>{rx.name}:</b> {rx.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="plikes">♥ {p.likes.toLocaleString('en-US')}</span>
          </div>
        )) : <div className="sub">{t('noPosts')}</div>}
      </div>
      <p className="sub" style={{ marginTop: 8 }}>{t('socialNote')}</p>
      <p className="sub">{t('socialDynamics')}</p>
      {canHype ? null : <p className="sub">{t('needBiz')}</p>}
      {canCharity ? null : <p className="sub">{t('needDonated')}</p>}
    </>
  );
}
