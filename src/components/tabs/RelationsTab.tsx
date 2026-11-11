'use client';

import { Art, fmt, type GameState, interactNPC, NPCS, proposeToNPC, relationState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= RELATIONS (v10.5) =================
// 8 NPCs (4 male, 4 female), each with their own interests, nation, career,
// and personality. Friendship derives from shared interests (each shared
// interest = +5 base, each clashing vibe = -2) plus the player's interaction
// history. Romance is per-NPC, only meaningful with one at a time.
export function RelationsTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const playerInts = new Set(s.ints);
  return (
    <>
      <h3>{t('relations.title')}</h3>
      <p className="sub">{t('relations.sub')}</p>
      {NPCS.map(npc => {
        const r = relationState(s, npc.id);
        const shared = npc.interests.filter(i => playerInts.has(i));
        const clash = npc.interests.filter(i => !playerInts.has(i));
        const fPct = (r.friendship + 100) / 2; // -100..100 → 0..100
        const fColor = r.friendship >= 50 ? 'var(--sage)' : r.friendship >= 0 ? '#c9a070' : 'var(--brick)';
        const fLabel = r.friendship >= 70 ? t('relations.bond') : r.friendship >= 30 ? t('relations.warm') : r.friendship >= 0 ? t('relations.cool') : r.friendship >= -30 ? t('relations.frost') : t('relations.hostile');
        const canPropose = r.friendship >= 70 && r.romance >= 60 && !s.married;
        return (
          <div key={npc.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Art id={npc.art} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <b>{npc.name} <span className="tag">{npc.gender === 'f' ? '♀' : '♂'} · {npc.age} · {npc.nation}</span></b>
                <div className="sub">{npc.career} · {t('relations.vibe.' + npc.vibe)}</div>
                <div className="mini" style={{ marginTop: 4, fontStyle: 'italic' }}>{npc.blurb}</div>
              </div>
            </div>
            <div className="famewrap" style={{ marginTop: 8 }}>
              <span className="mini">{t('relations.friendship')}</span>
              <div className="famebar"><i style={{ width: fPct + '%', background: fColor }} /></div>
              <b>{Math.round(r.friendship)}</b>
            </div>
            <div className="mini">{fLabel} · {t('relations.romance')}: {Math.round(r.romance)}/100 · {t('relations.interactions', '', { n: r.interactions })}</div>
            <div className="mini" style={{ marginTop: 4 }}>
              {t('relations.shared')}: {shared.length ? shared.map(i => <span key={i} className="tag" style={{ background: '#e6f4ea', color: '#1e6b35', marginLeft: 3 }}>+{i}</span>) : <span className="mini">{t('relations.none')}</span>}
              {clash.length > 0 && <>  ·  {t('relations.clash')}: {clash.map(i => <span key={i} className="tag" style={{ background: '#faeae9', color: '#9c4a42', marginLeft: 3 }}>−{i}</span>)}</>}
            </div>
            <div className="trade" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <Btn ic="ic-heart" label={t('relations.talk')} onClick={() => act(st => interactNPC(st, npc.id, 'talk'))} />
              <Btn ic="ic-bag" label={t('relations.gift') + ' ' + fmt(Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1)))))} disabled={s.money < Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1))))} onClick={() => act(st => interactNPC(st, npc.id, 'gift'))} />
              <Btn ic="ic-check" label={t('relations.help') + ' $1K'} kind="ghost" disabled={s.money < 1000} onClick={() => act(st => interactNPC(st, npc.id, 'help'))} />
              <Btn ic="ic-x" label={t('relations.argue')} kind="danger" onClick={() => act(st => interactNPC(st, npc.id, 'argue'))} />
              {canPropose && <Btn ic="ic-star" label={s.partner ? t('relations.marry') : t('relations.date')} kind="sageb" onClick={() => act(st => proposeToNPC(st, npc.id))} />}
            </div>
          </div>
        );
      })}
      <p className="sub">{t('relations.note')}</p>
    </>
  );
}
