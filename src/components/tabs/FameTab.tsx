'use client';

import { botRows, eraOf, fmt, type GameState, HALL_OF_FAME, playerHallEntry, useMemo, useT, worldYear } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= HALL OF FAME (v10.4) =================
// Split off from the World group's Ranking tab: where Ranking is the live
// leaderboard of fictional rivals scaled to the player's age, the Hall of
// Fame is a curated wall of REAL tycoons + the player's own past lives,
// each with a one-line note. The player's current run shows at the top as
// "in progress" until the game over modal writes the final entry.
export function FameTab({ s }: { s: GameState }) {
  const { t } = useT();
  // Player's past lives — recorded at each reincarnation in s.pastLives.
  // Most-recent first so the chain reads top-down.
  const playerEntries = useMemo(() => {
    const out: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string; kind: 'player' }[] = [];
    if (s.hall) out.push({ ...s.hall, kind: 'player' });
    return out;
  }, [s.hall]);
  const pastLifeEntries = useMemo(() => (s.pastLives || []).slice().reverse().map(e => ({ ...e, kind: 'player' as const })), [s.pastLives]);
  // A handful of "rivals" — fictional note snippets drawn from BOTS so the
  // wall feels alive. Marked kind 'rival' so the chip distinguishes them.
  const rivalEntries = useMemo(() => {
    // Defined inline to avoid importing BOTS into the page (it's already
    // imported for the engine but keeping it local to RankTab keeps the
    // surface tight). We pull from the botRows() helper instead.
    return botRows(s).filter(r => !r.me).slice(0, 4).map(r => ({
      name: r.n, nation: r.nat, era: eraOf(worldYear(s)).name,
      industry: r.ind, peakNetWorth: fmt(r.v),
      note: `${r.nat} ${r.ind} tycoon — still active in ${worldYear(s)}.`,
      livedTo: r.a, tier: r.v >= 1e9 ? 'Billionaire' : r.v >= 1e8 ? 'Tycoon' : 'Comfortable',
      kind: 'rival' as const
    }));
  }, [s]);
  // Player's current life preview
  const currentLife = useMemo(() => {
    if (s.over || !s.started) return null;
    const entry = playerHallEntry(s);
    return { ...entry, note: t('fame.youDesc') };
  }, [s]);
  return (
    <>
      <h3>{t('fame.title')}</h3>
      <p className="sub">{t('fame.sub')}</p>

      {currentLife && (
        <>
          <h3>{t('fame.you')}</h3>
          <div className="hof-card me">
            <div className="hof-head">
              <span className="hof-kind" data-kind="player">{t('fame.kind.player')}</span>
              <b>{currentLife.name}</b>
              <span className="tag">{currentLife.nation}</span>
            </div>
            <div className="sub">{t('fame.era')}: {currentLife.era} · {t('fame.industry')}: {currentLife.industry} · {t('fame.peak')}: {currentLife.peakNetWorth}</div>
            <p className="mini" style={{ marginTop: 6, fontStyle: 'italic' }}>{currentLife.note}</p>
          </div>
        </>
      )}

      {playerEntries.length > 0 && (
        <>
          <h3>{t('fame.player')}</h3>
          {playerEntries.map((e, i) => (
            <div key={'p' + i} className="hof-card">
              <div className="hof-head">
                <span className="hof-kind" data-kind="player">{t('fame.kind.player')}</span>
                <b>{e.name}</b>
                <span className="tag">{e.nation}</span>
              </div>
              <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
              <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
            </div>
          ))}
        </>
      )}
      {playerEntries.length === 0 && !currentLife && pastLifeEntries.length === 0 && <p className="sub">{t('fame.empty')}</p>}

      {pastLifeEntries.length > 0 && (
        <>
          <h3>{t('fame.pastLives')}</h3>
          <p className="sub">{t('fame.pastLivesNote')}</p>
          {pastLifeEntries.map((e, i) => (
            <div key={'pl' + i} className="hof-card">
              <div className="hof-head">
                <span className="hof-kind" data-kind="player">#{pastLifeEntries.length - i}</span>
                <b>{e.name}</b>
                <span className="tag">{e.nation}</span>
                {e.cause && <span className="tag dark" style={{ fontSize: '.66rem' }}>{e.cause === 'reincarnated' ? '↻' : e.cause === 'health' ? '†' : '⌂'}</span>}
              </div>
              <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
              <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
            </div>
          ))}
        </>
      )}

      <h3>{t('fame.real')}</h3>
      {HALL_OF_FAME.map(h => (
        <div key={h.id} className="hof-card">
          <div className="hof-head">
            <span className="hof-kind" data-kind="real">{t('fame.kind.real')}</span>
            <b>{h.name}</b>
            <span className="tag">{h.nation}</span>
          </div>
          <div className="sub">{t('fame.era')}: {h.era} · {t('fame.industry')}: {h.industry} · {t('fame.peak')}: {h.peakNetWorth}</div>
          <p className="mini" style={{ marginTop: 6, fontStyle: 'italic' }}>{h.note}</p>
        </div>
      ))}

      <h3>{t('fame.rivals')}</h3>
      {rivalEntries.map((e, i) => (
        <div key={'r' + i} className="hof-card">
          <div className="hof-head">
            <span className="hof-kind" data-kind="rival">{t('fame.kind.rival')}</span>
            <b>{e.name}</b>
            <span className="tag">{e.nation}</span>
          </div>
          <div className="sub">{t('fame.era')}: {e.era} · {t('fame.industry')}: {e.industry} · {t('fame.peak')}: {e.peakNetWorth} · {e.tier}</div>
          <p className="mini" style={{ marginTop: 6 }}>{e.note}</p>
        </div>
      ))}
    </>
  );
}
