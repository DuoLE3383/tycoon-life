'use client';

import { type GameState, getActiveUserId, hasSaveFor, setActiveUserId, useState, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= v11.36 — EDIT PROFILE MODAL =================
// Player can change their avatar emoji + name at any time. Opened from the
// PinZone ✏️ button. Changes are applied immediately via `act()` and persist
// to localStorage via the normal save cycle.
const AVATAR_CHOICES = [
  '🧑','👨','👩','👦','👧','🧒','👶','🧓','👴','👵',
  '🐯','🦁','🐺','🦊','🐻','🐼','🐨','🐮','🐷','🐸',
  '🦉','🦅','🐲','🦄','🐱','🐶','🐰','🐭','🦁','🐴',
  '👑','🦸','🦹','🧙','🧛','🧟','🤖','👽','👻','🎭',
]


export function EditProfileModal({ s, act, onClose }: { s: GameState; act: Act; onClose: () => void }) {
  const { t } = useT();
  const [name, setName] = useState(s.name);
  const [avatar, setAvatar] = useState(s.avatar);
  // v13.27 - Doi nhan vat = nhap Game ID khac. Moi NV = 1 Game ID = 1 save key tycoon_life_react_v1_<id>
  const [switchId, setSwitchId] = useState('');
  const [switchMsg, setSwitchMsg] = useState('');
  const onSwitch = () => {
    const id = switchId.trim();
    if (!id) { setSwitchMsg('Nhập Game ID trước đã.'); return; }
    if (id === (getActiveUserId() || '')) { setSwitchMsg('Đây là nhân vật đang chơi rồi.'); return; }
    if (!hasSaveFor(id)) { setSwitchMsg(`Không tìm thấy game cho ID "${id}".`); return; }
    setActiveUserId(id);
    window.location.reload();
  };
  // v11.50 — Esc-to-close + click-outside (overlay handler already exists).
  useEscapeKey(onClose);
  const save = () => {
    const trimmed = name.trim().slice(0, 24);
    act(st => {
      st.name = trimmed || st.name;
      st.avatar = avatar;
      return t('edit.saved', '✅ Profile updated');
    });
    onClose();
  };
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box edit-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>✏️ {t('edit.profile', 'Edit profile')}</h2>
          <button className="modal-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="edit-preview">
            <span className="edit-preview-av">{avatar}</span>
            <div>
              <b className="big">{name.trim() || s.name}</b>
              <div className="mini">{t('edit.preview', 'Preview')}</div>
            </div>
          </div>
          <label className="field">
            <span>{t('edit.name', 'Name')}</span>
            <input type="text" value={name} maxLength={24} placeholder={s.name}
              onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
          </label>
          <label className="field">
            <span>{t('edit.avatar', 'Avatar')}</span>
            <div className="avatar-picker">
              {AVATAR_CHOICES.map(em => (
                <button key={em} type="button" className={'av-opt' + (em === avatar ? ' on' : '')}
                  onClick={() => setAvatar(em)}>{em}</button>
              ))}
            </div>
          </label>
        </div>
          {/* v13.27 - Doi nhan vat = nhap Game ID khac */}
          <div className="field" style={{ background: 'rgba(0,0,0,0.04)', padding: '10px', borderRadius: 6, marginTop: 12 }}>
            <label>🔑 Đổi nhân vật — nhập Game ID khác</label>
            <div className="trade" style={{ gap: 8 }}>
              <input style={{ flex: 1 }} maxLength={32} placeholder="vd: minh1997" value={switchId} onChange={e => setSwitchId(e.target.value)} />
              <button type="button" className="ibtn" onClick={onSwitch}>Đổi nhân vật</button>
            </div>
            {switchMsg && <p className="mini" style={{ margin: '6px 0 0' }}>{switchMsg}</p>}
            <p className="mini" style={{ margin: '6px 0 0', opacity: .8 }}>Game ID hiện tại: {getActiveUserId() || '(save cũ, chưa có ID)'}. Nhập ID khác là load nhân vật đó, ID cũ vẫn còn nguyên.</p>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>{t('edit.cancel', 'Cancel')}</button>
          <button className="btn-primary" onClick={save} disabled={!name.trim() || (name.trim() === s.name && avatar === s.avatar)}>
            {t('edit.save', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
