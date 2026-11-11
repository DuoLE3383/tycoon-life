'use client';

import { useT } from '@/lib/i18n';
import { applyAIChoice, applyEventChoice, currentEvent, fmt, gameOverTier, knowledgeText, type GameState } from '@/lib/engine';
import { Ic } from '@/lib/art';
import { Btn, type Act } from '@/components/shared';

export function EventModal({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const life = currentEvent(s);
  const ev = life ? { title: life.title, text: life.text, choices: life.choices.map(c => ({ l: c.l, cost: c.cost })) } : s.aiEv!;
  const isAI = !life;
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <div className="mini">{isAI ? t('aiTwist') : t('lifeEvent')}</div>
      <h2>{ev.title}</h2>
      <p style={{ margin: '0 0 14px' }}>{ev.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(() => {
          const anyOk = ev.choices.some(c => ((c as { cost?: number }).cost || 0) <= s.money);
          return ev.choices.map((c, i) => {
            const cost = (c as { cost?: number }).cost || 0;
            return <Btn key={i} ic={['ic-plus', 'ic-check', 'ic-up'][i % 3]}
              label={c.l + (cost ? ' · ' + fmt(cost) : '')}
              disabled={cost > s.money && anyOk}
              onClick={() => act(st => isAI ? applyAIChoice(st, i) : applyEventChoice(st, i))} />;
          });
        })()}
      </div>
    </div></div>
  );
}

export function GameOverModal({ s, onAgain }: { s: GameState; onAgain: () => void }) {
  const { t } = useT();
  const { tier, nw } = gameOverTier(s);
  const tierKey = 'tier.' + ({ 'Humble beginnings': 'humble', 'Comfortable life': 'comfortable', 'Tycoon': 'tycoon', 'Billionaire': 'billionaire', 'Legend': 'legend' } as Record<string, string>)[tier];
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <h2>{t(tierKey, tier)}</h2>
      <div>{s.cause === 'health'
        ? <>{t('livedToHealth', '', { a: Math.floor(s.age) })} <b>{fmt(nw)}</b>.</>
        : <>{t('livedTo')} <b>{fmt(nw)}</b>.</>}<br />
        <span className="mini">{t('finalLine', '', { k: knowledgeText(s), f: s.fame, d: fmt(s.donated), ka: s.karma, l: s.level, fo: s.social.followers.toLocaleString() })}</span></div>
      <button className="ibtn" style={{ marginTop: 16 }} onClick={onAgain}>
        <Ic id="ic-plus" className="bsi" /><span>{t('liveAgain')}</span>
      </button>
    </div></div>
  );
}
