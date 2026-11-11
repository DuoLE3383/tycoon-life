'use client';

import { Art, doGig, fmt, type GameState, gigLock, gigPay, gigReady, GIGS, useState } from '@/components/gameDeps';
import { type Act, Btn, Row, type TFn, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= v11.39 — GIGS POPUP =================
// Gigs moved from an inline grid in HomeTab into a popup. The trigger button
// GLOWS (pulsing amber ring) when there are gigs ready to do — so the player
// notices "new work available" without it eating vertical space all the time.
export function GigsPopup({ s, act, t }: { s: GameState; act: Act; t: TFn }) {
  const [open, setOpen] = useState(false);
  const readyCount = GIGS.filter(g => gigReady(s, g)).length;
  const glow = readyCount > 0;
  // v11.50 — Esc-to-close when the popup is open.
  useEscapeKey(() => setOpen(false), open);
  const close = () => setOpen(false);
  return (
    <>
      <button className={'gigs-trigger' + (glow ? ' glow' : '') + (open ? ' on' : '')} onClick={() => setOpen(o => !o)}>
        <Art id="ic-bag" className="si" />
        <span>{t('gigs.popup', 'Quick gigs')}</span>
        {glow && <span className="gigs-badge">{readyCount}</span>}
      </button>
      {open && (
        <div className="modal-overlay" onClick={close}>
          <div className="modal-box gigs-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h2>💼 {t('gigs.popup', 'Quick gigs')}</h2>
              <button className="modal-x" onClick={close} aria-label="Close">✕</button>
            </div>
            <div className="modal-body">
              {glow && <p className="mini" style={{ color: 'var(--amber)', marginBottom: 8 }}>✨ {t('gigs.newGlow', 'New gigs available!')}</p>}
              <div className="gigs">
                {GIGS.map(g => {
                  const ready = gigReady(s, g), lock = gigLock(s, g);
                  const left = s.gigs[g.id] != null ? Math.max(0, g.cd - (s.lastDay - s.gigs[g.id])) : 0;
                  return (
                    <button key={g.id} className="gig" data-gig={g.id} disabled={!ready}
                      onClick={() => { act(st => doGig(st, g.id, t)); }}>
                      <Art id={g.icon} />
                      <span><b>{t('gig.' + g.id, g.id)}</b>
                        <span className="sub" style={{ display: 'block' }}>
                          {!ready && lock ? t('gig.need', '', { x: lock })
                            : !ready ? t('gig.cooldown', '', { n: left })
                              : <><span className="pay">+{fmt(gigPay(s, g))}</span>{g.hp ? <span className="hppay"> · {t('gig.hp', '', { n: g.hp })}</span> : null}</>}
                        </span></span>
                    </button>
                  );
                })}
              </div>
              <div className="modal-foot" style={{ justifyContent: 'center' }}>
                <button className="btn-ghost" onClick={close}>{t('edit.cancel', 'Close')} (Esc)</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
