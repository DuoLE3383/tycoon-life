'use client';

import { type GameState, fetchServerSave, getActiveUserId, hasSaveFor, setActiveUserId, useState, useT } from '@/components/gameDeps';
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
  // v13.39 - Doi nhan vat = nhap Game ID khac. Moi NV = 1 Game ID = 1 save key tycoon_life_react_v1_<id>
  const [switchId, setSwitchId] = useState('');
  const [switchMsg, setSwitchMsg] = useState('');
  const onSwitch = async () => {
    const id = switchId.trim();
    if (!id) { setSwitchMsg(t('profile.switch.enterId')); return; }
    if (id === (getActiveUserId() || '')) { setSwitchMsg(t('profile.switch.already')); return; }
    if (hasSaveFor(id)) { setActiveUserId(id); window.location.reload(); return; }
    setSwitchMsg(t('profile.switch.tryServer'));
    const ok = await fetchServerSave(id);
    if (!ok) { setSwitchMsg(t('profile.switch.notFound', '', { id })); return; }
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
          {/* v13.39 - Doi nhan vat = nhap Game ID khac */}
          <div className="field" style={{ background: 'rgba(0,0,0,0.04)', padding: '10px', borderRadius: 6, marginTop: 12 }}>
            <label>{t('profile.switch.title')}</label>
            <div className="trade" style={{ gap: 8 }}>
              <input style={{ flex: 1 }} maxLength={32} placeholder="vd: minh1997" value={switchId} onChange={e => setSwitchId(e.target.value)} />
              <button type="button" className="ibtn" onClick={onSwitch}>{t('profile.switch.btn')}</button>
            </div>
            {switchMsg && <p className="mini" style={{ margin: '6px 0 0' }}>{switchMsg}</p>}
            <p className="mini" style={{ margin: '6px 0 0', opacity: .8 }}>{t('profile.switch.current', '', { id: getActiveUserId() || t('profile.switch.noId') })}</p>
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
