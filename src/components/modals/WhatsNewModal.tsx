'use client';

import { Ic, type Lang, LANGS, useT } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= v11 WHAT'S NEW MODAL =================
// v11.44 — the modal now takes dynamic content from version.json. If the
// content hasn't loaded yet (or fetch failed), it falls back to a simple
// "what's new" message with the bundled version. The old static V11_FEATURES
// list is removed — version.json is the single source of truth for changelog.
export function WhatsNewModal({ onDismiss, content }: { onDismiss: () => void; content: { headline: string; features: string[] } | null }) {
  // v11.27 — language buttons inside the popup so players can switch
  // language without closing the modal first (user request).
  const { t, lang, setLang } = useT();
  const headline = content?.headline || t('v11.headline');
  const features = content?.features || [];
  // v11.50 — Esc-to-close (the modal already has click-outside via target check).
  useEscapeKey(onDismiss);
  return (
    <div className="modal on" onClick={e => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="mcard" style={{ maxWidth: 580, textAlign: 'left' }}>
        <div className="mhead"><h2>✨ {headline}</h2><span className="mlang">{LANGS.map(l => <button key={l.id} className="ibtn ghost tsmall" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}</span><button className="ibtn ghost" onClick={onDismiss}><Ic id="ic-x" className="bsi" /><span>✕</span></button></div>
        {features.length > 0 ? (
          <ul style={{ margin: '12px 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
            {features.map((f, i) => (
              <li key={i} style={{ listStyle: 'disc', fontSize: '.88rem' }}>
                <span className="sub">{f}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="sub" style={{ marginTop: 0 }}>{t('v11.summary')}</p>
        )}
        <button className="ibtn" style={{ width: '100%', marginTop: 12 }} onClick={onDismiss}>
          <Ic id="ic-check" className="bsi" /><span>{t('v11.gotIt')}</span>
        </button>
      </div>
    </div>
  );
}
