'use client';

import { BIZ, type GameState, setBizBrand, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// v11.50 — Brand editor modal: pick a custom name + emoji logo for a biz chain.
export function BrandEditorModal({ s, act, editing, onClose }: {
  s: GameState; act: Act; editing: { bizId: string; name: string; logo: string }; onClose: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(editing.name);
  const [logo, setLogo] = useState(editing.logo);
  const b = BIZ.find(x => x.id === editing.bizId);
  const SUGGESTED_LOGOS = ['☕', '🛍️', '🌾', '🏭', '💻', '🏨', '🎬', '🛒', '🏦', '🍽️', '🍔', '🍕', '🍣', '🍜', '🎨', '📷', '🎸', '🚗', '🏠', '💎', '⭐', '🔥', '🌿', '🤖'];
  const save = () => {
    act(st => {
      const msg = setBizBrand(st, editing.bizId, name, logo);
      return msg || t('biz.brandSet', '', { x: name });
    });
    onClose();
  };
  const reset = () => {
    act(st => {
      if (st.brands) delete st.brands[editing.bizId];
      return t('biz.brandReset');
    });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>⭐ {t('biz.brandBtn')}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="edit-preview">
            <span className="edit-preview-av" style={{ fontSize: '2rem' }}>{logo || '🏢'}</span>
            <div>
              <b className="big">{name.trim() || b?.name || editing.bizId}</b>
              <div className="mini">{t('edit.preview', 'Preview')}</div>
            </div>
          </div>
          <label className="field">
            <span>{t('biz.brandName')}</span>
            <input type="text" value={name} maxLength={24} placeholder={b?.name || editing.bizId}
              onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
          </label>
          <label className="field">
            <span>{t('biz.brandLogo')}</span>
            <input type="text" value={logo} maxLength={4} placeholder="☕"
              onChange={e => setLogo(e.target.value.slice(0, 4))}
              onKeyDown={e => { if (e.key === 'Enter') save(); }}
              style={{ fontSize: '1.4rem', textAlign: 'center' }} />
          </label>
          <div className="avatar-picker" style={{ marginTop: 4 }}>
            {SUGGESTED_LOGOS.map(em => (
              <button key={em} type="button" className={'av-opt' + (em === logo ? ' on' : '')}
                onClick={() => setLogo(em)} style={{ fontSize: '1.1rem' }}>{em}</button>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>{t('edit.cancel', 'Cancel')} (Esc)</button>
          {s.brands?.[editing.bizId] && (
            <button className="btn-ghost" onClick={reset} style={{ color: 'var(--brick)' }}>{t('biz.brandReset')}</button>
          )}
          <button className="btn-primary" onClick={save} disabled={!name.trim()}>
            {t('biz.brandSave')}
          </button>
        </div>
      </div>
    </div>
  );
}
