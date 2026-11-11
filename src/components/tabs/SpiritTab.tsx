'use client';

import { castHexagram, type CastResult, doWell, drawCards, FAITH_PRACTICE_CD, FAITH_PRACTICE_COST, fmt, type GameState, grantSpirit, type Huong, HUONG, Ic, lapLaSo, type LaSo, phanTichToanDien, type PhongThuyReading, RETREAT_CD, RETREAT_COST, SPIRIT_DAILY_CAP, spiritGainTodayLeft, spiritState, spreadLabels, TAROT_GHI_CHU, type TarotCard, tarotDraw, TEMPLE_CD, TEMPLE_COST, togglePsychic, useRef, useState, useT, validateQuestion, wellLeft, wellReady } from '@/components/gameDeps';
import { type Act, Btn, Row } from '@/components/shared';
import { Btn, Row } from '@/components/shared';



// ================= MIND & SPIRIT =================
export function SpiritTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const sp = Math.round(s.spirit), stIdx = spiritState(s.spirit);
  // v11.21 — daily contemplation cap remaining (for the spirit-panel note).
  const spiritLeft = spiritGainTodayLeft(s);
  const rows: { id: string; art: string; name: string; cost: number; cd: number; gain: number }[] = [
    { id: 'meditate', art: 'w-lotus', name: t('meditate'), cost: 0, cd: 1, gain: 4 },
    { id: 'temple', art: 'w-temple', name: t('temple'), cost: TEMPLE_COST, cd: TEMPLE_CD, gain: 6 },
    { id: 'retreat', art: 'w-retreat', name: t('retreat'), cost: RETREAT_COST, cd: RETREAT_CD, gain: 25 },
  ];
  const perks: { on: boolean; label: string; need: number }[] = [
    { on: s.spirit >= 70, label: t('sp.peace'), need: 70 },
    { on: s.spirit >= 70, label: t('sp.aging'), need: 70 },
    { on: s.spirit >= 80, label: t('sp.cosmic'), need: 80 },
  ];
  const rowsWithFaith = [
    ...rows,
    { id: 'faithPractice', art: 'w-lotus', name: t('faith.action.' + s.religion), cost: FAITH_PRACTICE_COST, cd: FAITH_PRACTICE_CD, gain: 3 }
  ];
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <b style={{ fontSize: '1.05rem' }}>{t('spiritTitle')}</b>
        <p className="sub" style={{ marginTop: 4 }}>{t('spiritSub')}</p>
        <p className="sub"><b>{t('religion')}:</b> {t('religion.' + s.religion)} · {t('faith.guidance.' + s.religion)}</p>
        <div className="famewrap"><span className="mini">{t('spirit')}</span><div className="famebar"><i style={{ width: sp + '%', background: 'var(--slate)' }} /></div><b>{sp}</b></div>
        <div className="mini">{t('sp.state.' + stIdx)} · {t('karma')}: {s.karma}</div>
      </div>
      {rowsWithFaith.map(r => {
        const left = wellLeft(s, r.id), ready = wellReady(s, r.id);
        return <Row key={r.id} art={r.art} right={<Btn ic="ic-plus" dp={{ 'data-well': r.id }}
          label={!ready && left > 0 ? t('gig.cooldown', '', { n: left }) : r.cost ? `${r.name} · ${fmt(r.cost)}` : r.name}
          disabled={!ready} onClick={() => act(st => doWell(st, r.id, t))} />}>
          <b>{r.name}</b>
          <span className="sub">{r.id === 'faithPractice' ? t('faith.practiceInfo') : `+${r.gain} ${t('spirit').toLowerCase()} · ${t('gig.cooldown', '', { n: r.cd })}${r.cost ? ` · ${fmt(r.cost)}` : ''}`}</span>
        </Row>;
      })}
      <h3>{t('sp.perks')}</h3>
      {perks.map((p, i) => <div key={i} className={'perkrow' + (p.on ? ' on' : '')}>
        <Ic id={p.on ? 'ic-check' : 'ic-lock'} className="bsi" /><span>{p.label}</span>
        <span className="mini">{p.on ? '✓' : t('sp.locked', '', { n: p.need })}</span>
      </div>)}

      {/* v11.6 — Tarot panel. Player opts in; monthly draws (30-day cooldown)
          give a cryptic hint about the season ahead. Drawn cards are logged
          for later reference. */}
      <h3 style={{ marginTop: 12 }}>{t('v11.tarotTitle')}</h3>
      <Row art="w-lotus"
        right={<button className="ibtn" onClick={() => act(g => {
          const on = togglePsychic(g);
          return on ? t('v11.tarotOptIn') + ' ✓' : t('v11.tarotOptOut') + ' ✓';
        })}>{s.psychic?.optedIn ? t('v11.tarotOptOut') : t('v11.tarotOptIn')}</button>}>
        <b>{t('v11.tarotTitle')}</b>
        <span className="sub">{t('v11.tarotBlurb')}</span>
        {s.psychic?.optedIn && (
          <div className="trade" style={{ marginTop: 4 }}>
            <button className="tbuy"
              disabled={(s.psychic?.lastDrawDay || 0) > 0 && s.lastDay - (s.psychic?.lastDrawDay || 0) < 30}
              onClick={() => act(g => {
                const r = tarotDraw(g);
                if (!r) return t('v11.tarotCooldown');
                return `${r.card}: ${r.meaning}`;
              })}>{t('v11.tarotDraw')}</button>
          </div>
        )}
      </Row>
      {s.psychic?.draws && s.psychic.draws.length > 0 && (
        <Row art="ic-star">
          <b className="mini">{t('v11.tarotRecent')}:</b>
          <span className="sub" style={{ display: 'block', marginTop: 2 }}>
            {s.psychic.draws.slice(-5).reverse().map(d => `${d.card}`).join(' · ')}
          </span>
        </Row>
      )}
      {/* v11.21 — Spirit panels now grant spirit points (capped per day). */}
      <div className="mini" style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.02)', borderRadius: 4, marginBottom: 6, opacity: .85 }}>
        {t('sp.spiritPanelNote', '', { cap: SPIRIT_DAILY_CAP })} · <b>{spiritLeft}/{SPIRIT_DAILY_CAP}</b> {t('left')}.
      </div>
      {/* v11.11 — Kinh Dịch (I Ching), first Huyen-Hoc-AI feature integrated into the main app */}
      <KinhDichPanel act={act} />
      {/* v11.14 — Tử Vi (紫微斗数), second Huyen-Hoc-AI feature integrated */}
      <TuViPanel s={s} act={act} />
      {/* v11.15 — Phong Thuỷ Bát Trạch (八宅), third Huyen-Hoc-AI feature integrated */}
      <PhongThuyPanel s={s} act={act} />
      {/* v11.16 — Tarot nâng cao (full 78-card deck + multi-card spreads), fourth Huyen-Hoc-AI feature integrated */}
      <TarotSpreadPanel act={act} />
    </>
  );
}



// v11.11 — Kinh Dịch (I Ching) panel. Casts 6 lines client-side via the
// deterministic engine (src/lib/iching.ts), then asks /api/divine for an LLM
// interpretation in the player's language. No save-state change: each cast is
// stateless (client-side throttle prevents spam). Mirrors the Huyen-Hoc-AI
// FastAPI coin-cast + King Wen lookup, but runs on the main app's own LLM.
export function HexLines({ hex }: { hex: CastResult['primary'] }) {
  // Render the 6 hào top → bottom (reverse of the stored bottom → top order).
  // Yang = solid bar, yin = two segments; moving lines use the accent colour + a dot.
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
      <div style={{ fontSize: '1.15rem', lineHeight: 1 }}>{hex.upper.symbol}{hex.lower.symbol}</div>
      {hex.lines.slice().reverse().map((l, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', gap: l.yang ? 0 : 6, width: 60, height: 7 }}>
            {l.yang
              ? <div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} />
              : <><div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} /><div style={{ flex: 1, background: l.moving ? 'var(--accent)' : 'var(--faint)', borderRadius: 1 }} /></>}
          </div>
          {l.moving && <span style={{ fontSize: '.6rem', color: 'var(--accent)' }}>●</span>}
        </div>
      ))}
    </div>
  );
}



export function KinhDichPanel({ act }: { act: Act }) {
  const { t, lang } = useT();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ cast: CastResult; reading: { interpretation: string; advice: string; verdict: 'CAT' | 'HUNG' | 'TINH'; verdictLabel: string; source: string } } | null>(null);
  const lastCastRef = useRef(0);
  const THROTTLE_MS = 8000; // client-side throttle — one cast per 8s
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;
  const qLen = question.trim().length;
  const canCast = !busy && qLen >= 5 && qLen <= 500;

  const doCast = async () => {
    setErr(null);
    try { validateQuestion(question, lang); }
    catch (e) { setErr((e as Error).message || t('kd.errQuestion')); return; }
    if (Date.now() - lastCastRef.current < THROTTLE_MS) { setErr(t('kd.throttle')); return; }
    lastCastRef.current = Date.now();
    setBusy(true);
    // Deterministic cast runs client-side; the LLM only interprets it.
    const cast = castHexagram();
    try {
      const res = await fetch('/api/divine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cast, question: question.trim(), lang })
      });
      if (!res.ok) throw new Error('fetch');
      const reading = await res.json();
      setResult({ cast, reading });
      // v11.21 — casting the I Ching is a contemplation act; grant a small
      // spirit boost (1-3 points) capped per game-day. The act callback
      // mutates s.spirit via grantSpirit() and surfaces the gain as a toast.
      act(st => {
        const g = grantSpirit(st, 2, 'Kinh Dịch cast');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Kinh Dịch' }) : null;
      });
    } catch {
      setErr(t('kd.errFetch'));
    } finally { setBusy(false); }
  };

  const verdictColor = result?.reading.verdict === 'CAT' ? 'var(--sage)'
    : result?.reading.verdict === 'HUNG' ? 'var(--brick)' : 'var(--slate)';

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('kd.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canCast} onClick={doCast}>
          <span>{busy ? t('kd.thinking') : t('kd.cast')}</span>
        </button>}>
        <b>{t('kd.title')}</b>
        <span className="sub">{t('kd.blurb')}</span>
        <textarea placeholder={t('kd.questionPh')} value={question}
          onChange={e => setQuestion(e.target.value)} maxLength={500} rows={2}
          style={{ width: '100%', marginTop: 6, padding: '6px 8px', border: '1px solid var(--line2)', borderRadius: 4, fontSize: '.9rem', background: 'transparent', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }}
          aria-label={t('kd.question')} />
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* primary + changed hexagram side by side with hào lines */}
          <div className="lb"><span>{t('kd.primary')}</span>
            <b>#{result.cast.primary.num} · {L(result.cast.primary.name)}</b></div>
          <div className="mini" style={{ marginTop: 2 }}>{L(result.cast.primary.theme)}</div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center', margin: '8px 0' }}>
            <HexLines hex={result.cast.primary} />
            {result.cast.changed && (
              <>
                <span className="mini" style={{ fontSize: '1rem' }}>→</span>
                <div>
                  <div className="mini">{t('kd.changed')}</div>
                  <div style={{ marginTop: 2 }}><HexLines hex={result.cast.changed} /></div>
                  <div className="mini" style={{ marginTop: 2 }}>
                    <b>#{result.cast.changed.num} · {L(result.cast.changed.name)}</b>
                  </div>
                  <div className="mini">{L(result.cast.changed.theme)}</div>
                </div>
              </>
            )}
          </div>
          <div className="mini">
            {result.cast.movingLines.length
              ? `${t('kd.moving')}: ${result.cast.movingLines.join(', ')}`
              : t('kd.staticCast')}
          </div>

          {/* verdict badge */}
          <div className="lb" style={{ marginTop: 8 }}><span>{t('kd.verdict')}</span>
            <b style={{ color: verdictColor }}>{result.reading.verdictLabel}</b></div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('kd.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.reading.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('kd.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.reading.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}



// v11.14 — Tử Vi (紫微斗数) panel. Builds a simplified natal chart (lá số)
// client-side via src/lib/tuvi.ts (ported from Huyen-Hoc-AI), using the
// character's byear + birthMonth + birthDay (v11.19: was day=15 default)
// plus an hour the player enters here. The LLM interpretation comes from
// /api/tuvi. No save-state change.
export function TuViPanel({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  // v11.19 — seed day from the character's birthDay instead of mid-month 15.
  const [day, setDay] = useState(s.birthDay || 15);
  const [hour, setHour] = useState(12);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ laso: LaSo; reading: { interpretation: string; advice: string; source: string } } | null>(null);

  const canBuild = !busy && day >= 1 && day <= 31 && hour >= 0 && hour <= 23;

  const doBuild = async () => {
    setErr(null);
    if (!(day >= 1 && day <= 31)) { setErr(t('tv.errDate')); return; }
    setBusy(true);
    let laso: LaSo;
    try {
      laso = lapLaSo(day, s.birthMonth, s.byear, hour);
    } catch (e) {
      setErr((e as Error).message || t('tv.errDate'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/tuvi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ laso, lang })
      });
      if (!res.ok) throw new Error('fetch');
      const reading = await res.json();
      setResult({ laso, reading });
      // v11.21 — building the Tử Vi chart is a deep self-contemplation act;
      // grant 2-4 spirit (capped per game-day via grantSpirit).
      act(st => {
        const g = grantSpirit(st, 3, 'Tử Vi chart');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Tử Vi' }) : null;
      });
    } catch {
      setErr(t('tv.errFetch'));
    } finally { setBusy(false); }
  };

  // star-state → colour (Miếu/Vượng/Đắc = strong green, Bình = neutral, Hãm = red)
  const stateColor = (st: string) =>
    st === 'Hãm' ? 'var(--brick)' : (st === 'Miếu' || st === 'Vượng' || st === 'Đắc') ? 'var(--sage)' : 'var(--mute)';

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('tv.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canBuild} onClick={doBuild}>
          <span>{busy ? t('tv.thinking') : t('tv.build')}</span>
        </button>}>
        <b>{t('tv.title')}</b>
        <span className="sub">{t('tv.blurb')}</span>
        <span className="mini" style={{ display: 'block', marginTop: 4 }}>{t('tv.useGame')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10 }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('tv.birthDay')}</span>
            <input type="number" min={1} max={31} value={day}
              onChange={e => setDay(Math.max(1, Math.min(31, +e.target.value || 1)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('tv.birthHour')}</span>
            <input type="number" min={0} max={23} value={hour}
              onChange={e => setHour(Math.max(0, Math.min(23, +e.target.value || 0)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* chart summary */}
          <div className="lb"><span>{t('tv.solar')}</span><b>{result.laso.duongLich}</b></div>
          <div className="lb"><span>{t('tv.lunar')}</span><b>{result.laso.amLich}</b></div>
          <div className="lb"><span>{t('tv.yearCanChi')}</span><b>{result.laso.canChiNam}</b></div>
          <div className="lb"><span>{t('tv.birthHourLabel')}</span><b>{result.laso.gioSinh}</b></div>
          <div className="lb"><span>{t('tv.cuc')}</span><b>{result.laso.cuc}</b></div>
          <div className="lb"><span>{t('tv.menhAt')}</span><b>{result.laso.menhChi}</b></div>
          <div className="lb"><span>{t('tv.thanAt')}</span><b>{result.laso.thanChi}</b></div>
          <div className="lb"><span>{t('tv.tuviAt')}</span><b>{result.laso.tuViTai}</b></div>

          {/* 12-palace grid (4 cols × 3 rows) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, margin: '10px 0' }}>
            {result.laso.cung.map((p, i) => (
              <div key={i} style={{
                padding: '6px 7px', borderRadius: 8, border: '1px solid var(--line)',
                background: p.laMenh ? 'rgba(0,0,0,0.05)' : 'var(--card)',
                borderColor: p.laMenh ? 'var(--accent)' : p.laThan ? 'var(--line2)' : 'var(--line)',
                borderWidth: p.laMenh || p.laThan ? 2 : 1,
                minHeight: 64
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <b style={{ fontSize: '.86rem' }}>{p.cung}</b>
                  <span className="mini" style={{ opacity: .7 }}>{p.diaChi}</span>
                </div>
                {p.chinhTinh.length ? (
                  <div style={{ marginTop: 3 }}>
                    {p.chinhTinh.map((st, j) => (
                      <div key={j} className="mini" style={{ color: stateColor(st.trangThai), fontWeight: 600 }}>
                        {st.sao} <span style={{ opacity: .7, fontWeight: 400 }}>({st.trangThai})</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="mini" style={{ opacity: .45, marginTop: 3 }}>{t('tv.note')}</div>}
                {p.phuTinh.length > 0 && (
                  <div className="mini" style={{ marginTop: 3, opacity: .7, fontSize: '.72rem' }}>{p.phuTinh.join(', ')}</div>
                )}
                {p.laMenh && <div className="mini" style={{ color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>★ Mệnh</div>}
                {!p.laMenh && p.laThan && <div className="mini" style={{ color: 'var(--slate)', fontWeight: 700, marginTop: 2 }}>Thân</div>}
              </div>
            ))}
          </div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 6 }}>{t('tv.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.reading.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('tv.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.reading.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{result.laso.ghiChu}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}



// v11.15 — Phong Thuỷ (Bát Trạch 八宅) panel. Computes a simplified feng-shui
// reading client-side via the deterministic engine (src/lib/phongthuy.ts),
// then asks /api/phongthuy for an LLM interpretation in the player's language.
// Uses the character's birth year + month (already collected) plus the day,
// gender, and house/kitchen/bedroom directions the player enters — no save
// change. Mirrors the Huyen-Hoc-AI FastAPI Bát Trạch + Cửu Tinh reference, but
// runs on the main app's own LLM (same client as /api/divine + /api/tuvi).
export function PhongThuyPanel({ s, act }: { s: GameState; act: Act }) {
  const { t, lang } = useT();
  // v11.19 — seed day from the character's birthDay instead of mid-month 15.
  const [day, setDay] = useState(s.birthDay || 15);
  const [gender, setGender] = useState<'nam' | 'nu'>('nam');
  const [houseDir, setHouseDir] = useState<Huong>('Nam');
  const [kitchenDir, setKitchenDir] = useState<Huong | ''>('');
  const [bedroomDir, setBedroomDir] = useState<Huong | ''>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ reading: PhongThuyReading; interp: { interpretation: string; advice: string; source: string } } | null>(null);

  const canAnalyze = !busy && day >= 1 && day <= 31;

  const doAnalyze = async () => {
    setErr(null);
    if (!(day >= 1 && day <= 31)) { setErr(t('pt.errDate')); return; }
    setBusy(true);
    let reading: PhongThuyReading;
    try {
      reading = phanTichToanDien(
        day, s.birthMonth, s.byear, gender, houseDir,
        kitchenDir || undefined, bedroomDir || undefined,
      );
    } catch (e) {
      setErr((e as Error).message || t('pt.errDate'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/phongthuy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reading, lang })
      });
      if (!res.ok) throw new Error('fetch');
      const interp = await res.json();
      setResult({ reading, interp });
      // v11.21 — phong thuỷ analysis aligns the player with their space;
      // grant 1-3 spirit (capped per game-day via grantSpirit).
      act(st => {
        const g = grantSpirit(st, 2, 'Phong Thuỷ analysis');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Phong Thuỷ' }) : null;
      });
    } catch {
      setErr(t('pt.errFetch'));
    } finally { setBusy(false); }
  };

  const selectStyle: React.CSSProperties = {
    padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4,
    background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: '.9rem',
  };

  const totColor = (tot: boolean) => tot ? 'var(--sage)' : 'var(--brick)';

  const matchRow = (label: string, r?: { huongNha: Huong; cung: string; tot: boolean; diemThamKhao: number }) => (
    <div className="lb">
      <span>{label}</span>
      <b>
        {r ? (
          <>
            <span style={{ color: totColor(r.tot) }}>{r.huongNha} → {r.cung}</span>
            {' '}
            <span className="mini" style={{ opacity: .65 }}>
              ({r.tot ? t('pt.totYes') : t('pt.totNo')}, {t('pt.score')} {r.diemThamKhao})
            </span>
          </>
        ) : <span className="mini" style={{ opacity: .5 }}>{t('pt.none')}</span>}
      </b>
    </div>
  );

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('pt.title')}</h3>
      <Row art="ic-star"
        right={<button className="ibtn" disabled={!canAnalyze} onClick={doAnalyze}>
          <span>{busy ? t('pt.thinking') : t('pt.analyze')}</span>
        </button>}>
        <b>{t('pt.title')}</b>
        <span className="sub">{t('pt.blurb')}</span>
        <span className="mini" style={{ display: 'block', marginTop: 4 }}>{t('pt.useGame')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10, flexWrap: 'wrap' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 80px' }}>
            <span>{t('pt.birthDay')}</span>
            <input type="number" min={1} max={31} value={day}
              onChange={e => setDay(Math.max(1, Math.min(31, +e.target.value || 1)))}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.gender')}</span>
            <select value={gender} onChange={e => setGender(e.target.value as 'nam' | 'nu')} style={selectStyle}>
              <option value="nam">{t('pt.male')}</option>
              <option value="nu">{t('pt.female')}</option>
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.houseDir')}</span>
            <select value={houseDir} onChange={e => setHouseDir(e.target.value as Huong)} style={selectStyle}>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.kitchenDir')}</span>
            <select value={kitchenDir} onChange={e => setKitchenDir(e.target.value as Huong | '')} style={selectStyle}>
              <option value="">{t('pt.none')}</option>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
            <span>{t('pt.bedroomDir')}</span>
            <select value={bedroomDir} onChange={e => setBedroomDir(e.target.value as Huong | '')} style={selectStyle}>
              <option value="">{t('pt.none')}</option>
              {HUONG.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* summary */}
          <div className="lb"><span>{t('pt.kua')}</span><b>{result.reading.cungPhi}</b></div>
          <div className="lb"><span>{t('pt.quai')}</span><b>{result.reading.quai}</b></div>
          <div className="lb"><span>{t('pt.group')}</span><b>{result.reading.nhom}</b></div>

          {/* 4 good directions */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.goodDirs')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
            {result.reading.huongTot.map((h, i) => (
              <div key={i} className="mini" style={{ padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--sage)' }}>{h.huong}</b>
                <span style={{ opacity: .75 }}> · {h.cung}</span>
              </div>
            ))}
          </div>

          {/* 4 bad directions */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.badDirs')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4, marginTop: 4 }}>
            {result.reading.huongXau.map((h, i) => (
              <div key={i} className="mini" style={{ padding: '3px 6px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--brick)' }}>{h.huong}</b>
                <span style={{ opacity: .75 }}> · {h.cung}</span>
              </div>
            ))}
          </div>

          {/* direction matches */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('pt.houseMatch')}</div>
          <div style={{ marginTop: 4 }}>
            {matchRow(t('pt.houseDir'), result.reading.huongNha)}
            {matchRow(t('pt.kitchenDir'), result.reading.huongBep)}
            {matchRow(t('pt.bedroomDir'), result.reading.huongPhongNgu)}
          </div>

          {/* today's flying star */}
          <div className="lb" style={{ marginTop: 8 }}>
            <span>{t('pt.todayStar')}</span>
            <b>
              {result.reading.phiTinhHomNay.saoTrungCung} ({result.reading.phiTinhHomNay.saoInfo.ten}, {result.reading.phiTinhHomNay.saoInfo.hanh})
            </b>
          </div>

          {/* LLM interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('pt.interpretation')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.interpretation}</p>
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 8 }}>{t('pt.advice')}</div>
          <p className="mini" style={{ margin: '4px 0 0' }}>{result.interp.advice}</p>
          <p className="mini" style={{ marginTop: 6, opacity: .6 }}>{result.reading.ghiChu}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}



// v11.16 — Tarot nâng cao panel. Draws a 1/3/5-card spread client-side
// from the full 78-card deck (src/lib/tarot.ts), then asks /api/tarot for a
// multi-card LLM interpretation in the player's language. Stateles — no save
// change. Mirrors the Huyen-Hoc-AI FastAPI tarot.draw_cards + interpret_tarot,
// but runs on the main app's own LLM (same client as /api/divine + tuvi +
// phongthuy). The earlier v11.6 simple Tarot (1 card, 30-day cooldown) stays
// above; this panel is the full-spread upgrade.
export function TarotSpreadPanel({ act }: { act: Act }) {
  const { t, lang } = useT();
  const [spread, setSpread] = useState<1 | 3 | 5>(3);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cards: TarotCard[];
    interp: {
      thongDiepChinh: string;
      luanGiaiTungLa: { viTri: string; la: string; yNghia: string; lienQuanCauHoi: string }[];
      tongHop: string;
      loiKhuyenCuThe: { hanhDong: string; thoiDiem: string; lyDo: string }[];
      canhBao: string[];
      cauChuc: string;
      source: string;
    };
  } | null>(null);

  const doDraw = async () => {
    setErr(null);
    setBusy(true);
    let cards: TarotCard[];
    try {
      cards = drawCards(spread);
    } catch (e) {
      setErr((e as Error).message || t('tt.errDraw'));
      setBusy(false);
      return;
    }
    try {
      const res = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards, question: question.trim(), lang })
      });
      if (!res.ok) throw new Error('fetch');
      const interp = await res.json();
      setResult({ cards, interp });
      // v11.21 — Tarot spread is an intuition/contemplation act; grant 1-3
      // spirit (capped per game-day via grantSpirit). Bigger spreads give
      // a touch more: 1-card → +1, 3-card → +2, 5-card → +3.
      const spiritAmt = spread === 1 ? 1 : spread === 3 ? 2 : 3;
      act(st => {
        const g = grantSpirit(st, spiritAmt, 'Tarot spread');
        return g > 0 ? t('sp.spiritGain', '', { n: g, src: 'Tarot' }) : null;
      });
    } catch {
      setErr(t('tt.errFetch'));
    } finally { setBusy(false); }
  };

  const labels = result ? spreadLabels(result.cards.length as 1 | 3 | 5, lang) : [];

  const selectStyle: React.CSSProperties = {
    padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4,
    background: 'transparent', color: 'inherit', fontFamily: 'inherit', fontSize: '.9rem',
  };

  return (
    <>
      <h3 style={{ marginTop: 14 }}>{t('tt.title')}</h3>
      <Row art="w-lotus"
        right={<button className="ibtn" disabled={busy} onClick={doDraw}>
          <span>{busy ? t('tt.thinking') : t('tt.draw')}</span>
        </button>}>
        <b>{t('tt.title')}</b>
        <span className="sub">{t('tt.blurb')}</span>
        <div className="trade" style={{ marginTop: 6, gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '0 0 auto' }}>
            <span>Spread</span>
            <select value={spread} onChange={e => setSpread(+e.target.value as 1 | 3 | 5)} style={selectStyle}>
              <option value={1}>{t('tt.spread1')}</option>
              <option value={3}>{t('tt.spread3')}</option>
              <option value={5}>{t('tt.spread5')}</option>
            </select>
          </label>
          <label className="mini" style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 200 }}>
            <span>{t('tt.question')}</span>
            <input type="text" value={question} placeholder={t('tt.questionPh')}
              onChange={e => setQuestion(e.target.value)}
              style={{ padding: '4px 6px', border: '1px solid var(--line2)', borderRadius: 4, background: 'transparent', color: 'inherit', fontFamily: 'inherit' }} />
          </label>
        </div>
        {err && <span className="sub" style={{ color: 'var(--brick)', display: 'block', marginTop: 4 }}>{err}</span>}
      </Row>

      {result && (
        <div className="card" style={{ marginBottom: 10 }}>
          {/* card grid: each card in its spread position */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(result.cards.length, 5)}, 1fr)`, gap: 6, margin: '6px 0 10px' }}>
            {result.cards.map((c, i) => (
              <div key={i} style={{
                padding: '6px 7px', borderRadius: 8, border: '1px solid var(--line)',
                background: 'var(--card)', minHeight: 80,
                transform: c.reversed ? 'rotate(180deg)' : undefined,
              }}>
                <div className="mini" style={{ opacity: .75, marginBottom: 2 }}>{labels[i]}</div>
                <b style={{ fontSize: '.86rem' }}>{c.vn}</b>
                {c.loai === 'minor' && (
                  <div className="mini" style={{ opacity: .65 }}>{c.suitVn} · {c.element}</div>
                )}
                <div className="mini" style={{ marginTop: 4, color: c.reversed ? 'var(--brick)' : 'var(--sage)', fontWeight: 600 }}>
                  {c.reversed ? t('tt.reversed') : t('tt.upright')}
                </div>
              </div>
            ))}
          </div>

          {/* main message */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('tt.mainMsg')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.thongDiepChinh}</p>

          {/* per-card interpretation */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.perCard')}</div>
          <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {result.interp.luanGiaiTungLa.map((c, i) => (
              <div key={i} className="mini" style={{ padding: '5px 7px', border: '1px solid var(--line)', borderRadius: 4, background: 'rgba(0,0,0,0.02)' }}>
                <b style={{ color: 'var(--accent)' }}>{c.viTri}</b>: <b>{c.la}</b>
                <div style={{ marginTop: 2 }}>{c.yNghia}</div>
                {c.lienQuanCauHoi && c.lienQuanCauHoi !== '—' && (
                  <div style={{ marginTop: 2, opacity: .7, fontStyle: 'italic' }}>{c.lienQuanCauHoi}</div>
                )}
              </div>
            ))}
          </div>

          {/* synthesis */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.synthesis')}</div>
          <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{result.interp.tongHop}</p>

          {/* advice */}
          {result.interp.loiKhuyenCuThe.length > 0 && (
            <>
              <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.advice')}</div>
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {result.interp.loiKhuyenCuThe.map((a, i) => (
                  <div key={i} className="mini" style={{ padding: '4px 7px', border: '1px solid var(--line)', borderRadius: 4 }}>
                    <b>{a.hanhDong}</b>
                    <div style={{ opacity: .7, marginTop: 2 }}>
                      <span>{t('tt.timing')}: {a.thoiDiem}</span> · <span>{t('tt.reason')}: {a.lyDo}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* cautions */}
          {result.interp.canhBao.length > 0 && (
            <>
              <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10, color: 'var(--brick)' }}>{t('tt.warnings')}</div>
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }} className="mini">
                {result.interp.canhBao.map((w, i) => <li key={i} style={{ color: 'var(--brick)' }}>{w}</li>)}
              </ul>
            </>
          )}

          {/* blessing */}
          <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px', marginTop: 10 }}>{t('tt.blessing')}</div>
          <p className="mini" style={{ margin: '4px 0 0', fontStyle: 'italic' }}>{result.interp.cauChuc}</p>

          <p className="mini" style={{ marginTop: 8, opacity: .6 }}>{TAROT_GHI_CHU}</p>
          <p className="mini" style={{ opacity: .6 }}>{t('disc.aiNote')}</p>
        </div>
      )}
    </>
  );
}
