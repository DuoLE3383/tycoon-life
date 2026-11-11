'use client';

import { Art, BUNDLED_VERSION, type GameState, Ic, type Lang, LANGS, useEffect, useState, useT, worldYear, xpNeed } from '@/components/gameDeps';
import { type Act } from '@/components/shared';
import { GigsPopup } from '@/components/modals/GigsPopup';



export function Header({ s, eraName, speed, setSpeed, act }: { s: GameState; eraName: (y: number) => string; speed: 1 | 10 | 50; setSpeed: (s: 1 | 10 | 50) => void; act: Act }) {
  const { t, lang, setLang } = useT();
  const xpPct = Math.min(100, Math.round(s.xp / xpNeed(s.level) * 100));
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => {
    const cur = document.documentElement.getAttribute('data-theme');
    if (cur === 'light' || cur === 'dark') {
      const timer = window.setTimeout(() => setTheme(cur), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);
  const flipTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('tycoon_theme', next); } catch { /* ignore */ }
    setTheme(next);
  };
  return (
    <header className="top">
      <div className="brand">
        <Art id="s-coin" className="logo" />
        <div className="brand-txt">
          <h1><span className="mini ver">{BUNDLED_VERSION}</span> HuyenBao</h1>
          <div className="mini era-line">{s.started ? `${s.nation} · ${eraName(worldYear(s))}` : t('tagline')}</div>
        </div>
      </div>
      {/* v11.46 — removed Cash/NW/Income from header (was duplicate of PinZone).
          Header now only carries language + theme + level chip. */}
      <div className="hstack">
        <span className="lvlchip" data-tip={`Lv ${s.level} · ${s.xp}/${xpNeed(s.level)} XP (${xpPct}%) · next in ${Math.max(0, xpNeed(s.level) - s.xp)} XP`}><Ic id="ic-xp" className="bsi" />{t('lvl')} {s.level}
          <span className="bar"><i style={{ width: xpPct + '%' }} /></span></span>
        <span className="lang" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </span>
        <button id="themeBtn" data-theme-btn className="ghost tsmall" style={{ padding: '6px 10px', lineHeight: 0 }}
          onClick={flipTheme} aria-label={t('theme')} title={t('theme')}>
          <Ic id={theme === 'dark' ? 'ic-sun' : 'ic-moon'} className="bsi" />
        </button>
        {/* v11.57 — time acceleration control: x1 / x10 / x50. Only visible
            when the game has started (no point accelerating the intro screen). */}
        {s.started && !s.over && (
          <span className="speed-ctrl" role="group" aria-label={t('speed.label', 'Time speed')}>
            {([1, 10, 50] as const).map(sp => (
              <button key={sp} aria-pressed={speed === sp} data-speed={sp}
                onClick={() => setSpeed(sp)} title={t('speed.tip', '', { n: sp })}>
                {sp === 1 ? '▶' : `×${sp}`}
              </button>
            ))}
          </span>
        )}
        {/* v12.1 — Quick gigs button moved into the header so it stays visible
            on EVERY tab (not just home). The PinZone is tall on mobile and was
            pushing the home tab's quick-actions below the fold; bringing the
            gigs trigger up here means the player can always reach it. The
            GigsPopup component renders its own trigger button + modal. */}
        {s.started && !s.over && <GigsPopup s={s} act={act} t={t} />}
      </div>
    </header>
  );
}
