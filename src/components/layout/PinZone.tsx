'use client';

import { Ic } from '@/lib/art';
import { END_AGE, RETIRE, START, STAGES } from '@/lib/gameData';
import { stageOf, type GameState } from '@/lib/engine';
import { useT } from '@/lib/i18n';

export function PinZone({ s }: { s: GameState }) {
  const { t } = useT();
  const a = s.age, st = stageOf(a), pct = (a - START) / (END_AGE - START) * 100;
  const p = (x: number) => ((x - START) / (END_AGE - START) * 100).toFixed(2) + '%';
  const d = new Date(Date.UTC(s.byear + 18, 8, 1) + Math.floor(s.lastDay) * 864e5);
  const dstr = d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const marks: [number, string][] = [[START, String(START)], [RETIRE, '65'], [END_AGE, '90']];

  return (
    <section className="card age">
      <div className="agehead"><b>{s.name} · {t('age')} {Math.floor(a)}</b>
        <span className="tag dark">{t('stage.' + STAGES.indexOf(st), st.name)}</span>
        <span className="mini">{dstr}</span>
        <span className="hpill"><Ic id="w-heart" className="bsi" />{Math.round(s.health)}</span>
        <span className="hpill"><Ic id="w-lotus" className="bsi" />{Math.round(s.spirit)}</span>
        <span className="mini">{t('fame')} {s.fame} · {t('followers')} {s.social.followers.toLocaleString()}</span></div>
      <div className="track" style={{ background: `linear-gradient(90deg,#8fae9b 0 ${p(22)},#c9b68e ${p(22)} ${p(26)},#c08a80 ${p(26)} ${p(RETIRE)},#9b93a8 ${p(RETIRE)})` }}>
        <div className="shade" style={{ left: pct + '%' }} /><div className="mark" style={{ left: pct + '%' }} />
      </div>
      <div className="ms">{marks.map(([m, lb]) => <span key={lb + m} style={{ left: p(m) }}>{lb}</span>)}</div>
    </section>
  );
}
