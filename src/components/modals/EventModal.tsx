'use client';

import { type AIEventKind, applyAIChoice, applyEventChoice, choiceRisk, type ChoiceRisk, currentEvent, fmt, gameOverTier, type GameState, Ic, knowledgeText, netWorth, persist, recordHallOnGameOver, useEffect, useT } from '@/components/gameDeps';
import { type Act, Btn } from '@/components/shared';
import { Btn } from '@/components/shared';



// ================= EVENT MODAL / GAME OVER =================
export function EventModal({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const life = currentEvent(s);
  const ev = life ? { title: life.title, text: life.text, choices: life.choices.map(c => ({ l: c.l, cost: c.cost })) } : s.aiEv!;
  const isAI = !life;
  const kind: AIEventKind | undefined = isAI ? s.aiEv?.kind : undefined;
  const kindBadge = kind ? t('ev.kind.' + kind) : null;
  const nwHint = Math.max(100000, netWorth(s));
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <div className="mini">{isAI ? (kindBadge ? `${t('aiTwist')} · ${kindBadge}` : t('aiTwist')) : t('lifeEvent')}</div>
      {isAI && kind && <div className="evkind" data-kind={kind}>{kindBadge}</div>}
      <h2>{ev.title}</h2>
      <p style={{ margin: '0 0 14px' }}>{ev.text}</p>
      <div style={{ display: 'grid', gap: 8 }}>
        {(() => {
          const anyOk = ev.choices.some(c => ((c as { cost?: number }).cost || 0) <= s.money);
          return ev.choices.map((c, i) => {
            const cost = (c as { cost?: number }).cost || 0;
            const extra: string[] = [];
            const cc = c as { money?: number; fame?: number; decline?: number; dropout?: unknown; liquidate?: unknown };
            if (cc.money) extra.push((cc.money > 0 ? '+' : '') + fmt(cc.money));
            if (cc.fame) extra.push(`fame ${cc.fame > 0 ? '+' : ''}${cc.fame}`);
            if (cc.decline) extra.push(`-${cc.decline}hp`);
            if (cc.dropout) extra.push('dropout');
            if (cc.liquidate) extra.push('liquidate');
            // v10.5 — colour the button by risk: green = safe 80/20, orange = medium 50/50, red = high 20/80
            const risk: ChoiceRisk = isAI
              ? choiceRisk(cc as Parameters<typeof choiceRisk>[0], nwHint)
              : 'medium';
            // v11.9 — risk word REMOVED from the button label (user request: the
            // "(Balanced 50/50)" suffix is noise). The legend below the choices
            // keeps explaining the colour code, and each choice now gets its own
            // small danger/benefit hint line underneath.
            const gains: string[] = [];
            const dangers: string[] = [];
            if (cc.money && cc.money > 0) gains.push('+' + fmt(cc.money));
            if (cc.fame && cc.fame > 0) gains.push(`+${cc.fame} ${t('hint.fameWord')}`);
            if (cost > 0) dangers.push(`${t('hint.pay')} ${fmt(cost)}`);
            if (cc.money && cc.money < 0) dangers.push(`${t('hint.loseUpTo')} ${fmt(-cc.money)}`);
            if (cc.fame && cc.fame < 0) dangers.push(`${cc.fame} ${t('hint.fameWord')}`);
            if (cc.decline && cc.decline > 0) dangers.push(`-${cc.decline} ${t('hint.hp')}`);
            const quality = risk === 'safe' ? t('hint.safe') : risk === 'medium' ? t('hint.medium') : t('hint.high');
            if (!gains.length && !dangers.length) dangers.push(t('hint.noCost'));
            const hint = `${t('hint.label')}: ${quality}`
              + (gains.length ? ` · ${t('hint.gain')}: ${gains.join(', ')}` : '')
              + (dangers.length ? ` · ${t('hint.danger')}: ${dangers.join(', ')}` : '');
            return (
              <div key={i}>
                <Btn ic={['ic-check', 'ic-up', 'ic-plus'][risk === 'safe' ? 0 : risk === 'medium' ? 2 : 1]}
                  kind={risk === 'safe' ? 'sageb' : risk === 'high' ? 'danger' : ''}
                  dp={{ 'data-risk': risk } as Record<string, string>}
                  label={c.l + (cost ? ' · ' + fmt(cost) : '') + (extra.length ? ` (${extra.join(' · ')})` : '')}
                  disabled={cost > s.money && anyOk}
                  onClick={() => act(st => isAI ? applyAIChoice(st, i) : applyEventChoice(st, i))} />
                <p className="mini" style={{ margin: '2px 0 0 6px', opacity: .8 }}>{hint}</p>
              </div>
            );
          });
        })()}
      </div>
      <p className="mini" style={{ marginTop: 12 }}>
        <span className="risk-dot" data-risk="safe" />{t('risk.safe')} ·
        <span className="risk-dot" data-risk="medium" />{t('risk.medium')} ·
        <span className="risk-dot" data-risk="high" />{t('risk.high')}
      </p>
      {/* v11.10 — disclaimer inside the event modal (covers AI prophecies too) */}
      <p className="mini" style={{ margin: '6px 0 0', opacity: .7 }}>{t('disc.aiNote')}</p>
    </div></div>
  );
}



export function GameOver({ s, onAgain }: { s: GameState; onAgain: () => void }) {
  const { t } = useT();
  // Record the player's hall entry as soon as the game-over modal mounts.
  useEffect(() => { recordHallOnGameOver(s); persist(); }, [s]);
  const { tier, nw } = gameOverTier(s);
  const tierKey = 'tier.' + ({ 'Humble beginnings': 'humble', 'Comfortable life': 'comfortable', 'Tycoon': 'tycoon', 'Billionaire': 'billionaire', 'Legend': 'legend' } as Record<string, string>)[tier];
  return (
    <div className="modal on"><div className="mcard" style={{ textAlign: 'center' }}>
      <h2>{t(tierKey, tier)}</h2>
      <div>{s.cause === 'health'
        ? <>{t('livedToHealth', '', { a: Math.floor(s.age) })} <b>{fmt(nw)}</b>.</>
        : <>{t('livedTo')} <b>{fmt(nw)}</b>.</>}<br />
        <span className="mini">{t('finalLine', '', { k: knowledgeText(s), f: s.fame, d: fmt(s.donated), ka: s.karma, l: s.level, fo: s.social.followers.toLocaleString() })}</span></div>
      {/* v11.10 — disclaimer on the game-over screen as well */}
      <p className="mini" style={{ margin: '10px 0 0', opacity: .65 }}>{t('disc.short')}</p>
      <button className="ibtn" style={{ marginTop: 12 }} onClick={onAgain}>
        <Ic id="ic-plus" className="bsi" /><span>{t('liveAgain')}</span>
      </button>
    </div></div>
  );
}
