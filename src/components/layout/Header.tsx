'use client';

import { useEffect, useState } from 'react';
import { Art, Ic } from '@/lib/art';
import { xpNeed } from '@/lib/gameData';
import { fmt, netWorth, worldYear, yearIncome, type GameState } from '@/lib/engine';
import { useT, LANGS, type Lang } from '@/lib/i18n';

export function Header({ s, onReset, eraName }: {
  s: GameState;
  onReset: () => void;
  eraName: (year: number) => string;
}) {
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
        <div><h1>MOGUL <span className="mini">v9</span></h1>
          <div className="mini">{s.started ? `${s.nation} · ${eraName(worldYear(s))}` : t('tagline')}</div></div>
      </div>
      <div><div className="mini">{t('cash')}</div><div id="tcash" style={{ color: s.money < 0 ? 'var(--brick)' : undefined }}>{fmt(s.money)}</div>
        <div className="mini">{t('netWorth')} {fmt(netWorth(s))} · {yearIncome(s) >= 0 ? '+' : ''}{fmt(yearIncome(s))}{t('perYear')}</div></div>
      <div className="hstack">
        <span className="lvlchip" title={t('level')}><Ic id="ic-xp" className="bsi" />{t('lvl')} {s.level}
          <span className="bar"><i style={{ width: xpPct + '%' }} /></span></span>
        <span className="lang" role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </span>
        <button id="themeBtn" data-theme-btn className="ghost tsmall" style={{ padding: '6px 10px', lineHeight: 0 }}
          onClick={flipTheme} aria-label={t('theme')} title={t('theme')}>
          <Ic id={theme === 'dark' ? 'ic-sun' : 'ic-moon'} className="bsi" />
        </button>
        <button className="ghost tsmall" onClick={onReset}>{t('newLife')}</button>
      </div>
    </header>
  );
}
