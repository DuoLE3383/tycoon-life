'use client';

import { analyze, Art, eraOf, FIELDS, fmt, type Gender, getActiveUserId, hasSaveFor, Ic, INTERESTS, type Lang, LANGS, MONTHS_NAMES, NAME_POOLS, NATIONS, PATHS, type Religion, RELIGIONS, setActiveUserId, TALENTS, useEffect, useState, useT, zodiacById, zodiacIntroSuggestion, zodiacOf } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= INTRO =================
export function Intro({ onBegin }: { onBegin: (o: { name: string; byear: number; nation: string; religion: Religion; ints: string[]; tals: string[]; gender: Gender; birthMonth: number; birthDay: number }) => void }) {
  const { t, lang, setLang } = useT();
  const [name, setName] = useState('');
  const [byear, setByear] = useState(1992);
  const [nation, setNation] = useState('Vietnam');
  const [religion, setReligion] = useState<Religion>('none');
  const [ints, setInts] = useState<string[]>([]);
  const [tals, setTals] = useState<string[]>([]);
  // v11.6 — gender + birth month → zodiac + tarot/spirit affinity
  const [gender, setGender] = useState<Gender>('nonbinary');
  const [birthMonth, setBirthMonth] = useState<number>(1);
  // v11.19 — birth day (1–31). Stored on GameState as birthDay (default 15).
  // Used by the Spirit tab panels (Tử Vi / Phong Thuỷ) that previously
  // defaulted to day=15; now the player picks it once at character creation.
  const [birthDay, setBirthDay] = useState<number>(15);
  // v13.21 — continue game by user id. Save key = tycoon_life_react_v1_<id>.
  // Continue = set active id + reload so store.hydrate() loads that key.
  // No save for id → error, player can still create a new life with that id.
  const [userId, setUserId] = useState(() => getActiveUserId() || '');
  const [continueMsg, setContinueMsg] = useState('');
  const onContinue = () => {
    const id = userId.trim();
    if (!id) { setContinueMsg(t('intro.continue.enterId')); return; }
    if (!hasSaveFor(id)) { setContinueMsg(t('intro.continue.notFound', '', { id })); return; }
    setActiveUserId(id);
    window.location.reload();
  };
  // v11 — two-step flow: 'edit' (fill fields) → 'review' (summary + confirm)
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  // v11.10 — mandatory legal disclaimer acknowledgment. The "Begin my life"
  // button stays disabled until the player ticks this box (per version: the
  // intro only shows for a new life, so this is the natural consent gate).
  const [ack, setAck] = useState(false);
  const years: number[] = [];
  // v12.12 — compute year list in a useEffect + useState so the server and
  // client agree on the same list. Reading new Date() during render caused a
  // hydration mismatch (#418) when server and client crossed a year boundary
  // at different instants, and also made the year list non-deterministic.
  const [nowY, setNowY] = useState<number | null>(null);
  useEffect(() => { setNowY(new Date().getUTCFullYear()); }, []);
  if (nowY !== null) for (let y = nowY - 126; y <= nowY - 18; y++) years.push(y);
  const a = analyze(ints, tals);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string, max: number) => {
    const i = arr.indexOf(id);
    if (i > -1) set(arr.filter(x => x !== id));
    else if (arr.length < max) set([...arr, id]);
  };
  // v11.6 — zodiac derived from birthMonth + birthDay (v11.19: was mid-month=15).
  const zodiac = zodiacOf(birthMonth, birthDay);
  const zodiacDef = zodiacById(zodiac);
  // v11 — random character generator. Picks a name from the nation's pool,
  // a birth year weighted toward the modern era (1960-now-18), random
  // religion, 1-3 interests, 1-2 talents.
  const randomise = () => {
    if (nowY === null) return;
    const nat = NATIONS[Math.floor(Math.random() * NATIONS.length)];
    const pool = NAME_POOLS[nat] || ['Alex'];
    const nm = pool[Math.floor(Math.random() * pool.length)];
    const yMin = 1960, yMax = nowY - 18;
    const yr = yMin + Math.floor(Math.random() * (yMax - yMin + 1));
    const rel = RELIGIONS[Math.floor(Math.random() * RELIGIONS.length)];
    const genders: Gender[] = ['male', 'female', 'nonbinary'];
    const g = genders[Math.floor(Math.random() * genders.length)];
    const bm = 1 + Math.floor(Math.random() * 12);
    const shuffledInts = [...INTERESTS].sort(() => Math.random() - 0.5);
    const ni = 1 + Math.floor(Math.random() * 3);
    const newInts = shuffledInts.slice(0, ni).map(i => i.id);
    const shuffledTals = [...TALENTS].sort(() => Math.random() - 0.5);
    const nt = 1 + Math.floor(Math.random() * 2);
    const newTals = shuffledTals.slice(0, nt).map(i => i.id);
    setName(nm); setByear(yr); setNation(nat); setReligion(rel);
    setGender(g); setBirthMonth(bm); setBirthDay(1 + Math.floor(Math.random() * 28));
    setInts(newInts); setTals(newTals); setStep('edit');
  };
  const startEra = eraOf(byear + 18);
  const startingCash = ints.includes('money') ? 5000 : 0;
  // v11.6 — pre-game suggestion combines zodiac affinity + historical era.
  // Built from the zodiacIntroSuggestion helper (translated per lang).
  const zodiacSuggestion = zodiacIntroSuggestion(zodiac, t('era.' + startEra.from, startEra.name), byear + 18, lang);
  // v11 — first-step suggestion card. Based on interests/talents, suggest
  // the highest-leverage opening move.
  const suggestion = (() => {
    if (ints.includes('money') && tals.includes('math')) return t('v11.suggest.moneyMath');
    if (a.top === 'business') return t('v11.suggest.business');
    if (a.top === 'engineering') return t('v11.suggest.engineering');
    if (a.top === 'medicine') return t('v11.suggest.medicine');
    if (a.top === 'arts') return t('v11.suggest.arts');
    if (a.top === 'science') return t('v11.suggest.science');
    return t('v11.suggest.default');
  })();
  return (
    <div className="modal on"><div className="mcard" style={{ maxWidth: 560 }}>
      <h2>{t('createLife')}</h2>
      {/* v13.21 — continue by user id, above the create-new form. */}
      <div className="field" style={{ background: 'rgba(0,0,0,0.04)', padding: '10px', borderRadius: 6 }}>
        <label>{t('intro.userId.label')}</label>
        <div className="trade" style={{ gap: 8 }}>
          <input style={{ flex: 1 }} maxLength={32} placeholder="vd: minh1997" value={userId} onChange={e => setUserId(e.target.value)} />
          <button type="button" className="ibtn" onClick={onContinue}>Continue game</button>
        </div>
        {continueMsg && <p className="mini" style={{ margin: '6px 0 0' }}>{continueMsg}</p>}
        <p className="mini" style={{ margin: '6px 0 0', opacity: .8 }}>{t('intro.userId.hint')}</p>
      </div>
      <p className="mini" style={{ marginTop: 0 }}>{t('introSub')}</p>
      {/* v11.10 — legal disclaimer, visible from the first screen of the intro.
          v11.19 — wider container + line-height so the (long VI) text doesn't
          render as a tall narrow column of single characters on small screens. */}
      <p className="mini" style={{ margin: '6px 0 0', padding: '8px 10px', background: 'rgba(0,0,0,0.04)', borderRadius: 4, opacity: .9, lineHeight: 1.5, wordBreak: 'normal', overflowWrap: 'anywhere' }}>
        ⚠️ {t('disc.short')}
      </p>
      {step === 'edit' ? (
        <>
          <div className="trade" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="lang" role="group" aria-label="Language">
              {LANGS.map(l => <button key={l.id} type="button" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
            </div>
            <button className="ibtn ghost" onClick={randomise}><Ic id="ic-star" className="bsi" /><span>{t('v11.random')}</span></button>
          </div>
          <div className="field"><label>{t('name')}</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
          {/* v11.46 — birth year as a number input (was 100+ dropdown). Validates 18+. */}
          <div className="field"><label>{t('birthYear')}</label>
            <input type="number" disabled={nowY === null} min={nowY !== null ? nowY - 126 : undefined} max={nowY !== null ? nowY - 18 : undefined} value={byear} onChange={e => setByear(nowY !== null ? Math.max(nowY - 126, Math.min(nowY - 18, +e.target.value || nowY - 18)) : byear)} /></div>
          {/* v11.6 — gender + birth month */}
          <div className="field"><label>{t('v11.gender')}</label>
            <select value={gender} onChange={e => setGender(e.target.value as Gender)}>
              <option value="nonbinary">{t('v11.genderNonbinary')}</option>
              <option value="female">{t('v11.genderFemale')}</option>
              <option value="male">{t('v11.genderMale')}</option>
            </select></div>
          {/* v11.19 — birth month + birth day side-by-side. Day feeds the
              Spirit tab panels (Tử Vi / Phong Thuỷ) that previously defaulted
              to day=15; now the player picks it once at character creation. */}
          <div className="trade" style={{ gap: 8 }}>
            <div className="field" style={{ flex: 1 }}><label>{t('v11.birthMonth')}</label>
              <select value={birthMonth} onChange={e => setBirthMonth(+e.target.value)}>
                {MONTHS_NAMES.map((m, i) => <option key={i} value={i + 1}>{m} ({zodiacOf(i + 1, birthDay)})</option>)}
              </select></div>
            <div className="field" style={{ flex: '0 0 110px' }}><label>{t('v11.birthDay')}</label>
              <select value={birthDay} onChange={e => setBirthDay(+e.target.value)}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select></div>
          </div>
          {/* v11.6 — zodiac preview (now uses the picked day instead of mid-month) */}
          <div className="preview" style={{ padding: '6px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 4 }}>
            <b>{zodiacDef.symbol} {zodiac}</b>
            <span className="sub" style={{ marginLeft: 6 }}>
              {lang === 'vi' ? zodiacDef.trait.vi : lang === 'zh' ? zodiacDef.trait.zh : zodiacDef.trait.en}
              {' · '}
              {t('v11.zodiacAffinity')}: {zodiacDef.affinity}
            </span>
            <div className="mini" style={{ marginTop: 2 }}>
              {lang === 'vi' ? zodiacDef.blurb.vi : lang === 'zh' ? zodiacDef.blurb.zh : zodiacDef.blurb.en}
            </div>
          </div>
          <div className="field"><label>{t('country')}</label>
            <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{t('nat.' + n, n)}</option>)}</select></div>
          <div className="field"><label>{t('religion')}</label>
            <select value={religion} onChange={e => setReligion(e.target.value as Religion)}>
              {RELIGIONS.map(option => <option key={option} value={option}>{t('religion.' + option)}</option>)}
            </select>
          </div>
          <div className="field"><label>{t('interests')} ({ints.length}/3)</label>
            <div className="chips">{INTERESTS.map(i => (
              <button key={i.id} className={'chip' + (ints.includes(i.id) ? ' on' : '')} onClick={() => toggle(ints, setInts, i.id, 3)}><Art id={i.art} className="ca" />{t('int.' + i.id, i.label)}</button>
            ))}</div></div>
          <div className="field"><label>{t('talents')} ({tals.length}/2)</label>
            <div className="chips">{TALENTS.map(tl => (
              <button key={tl.id} className={'chip' + (tals.includes(tl.id) ? ' on' : '')} onClick={() => toggle(tals, setTals, tl.id, 2)}><Art id={tl.art} className="ca" />{t('tal.' + tl.id, tl.label)}</button>
            ))}</div></div>
          {/* v11 — real-time preview */}
          <div className="preview">
            <p><b>{t('youTurn18', '', { y: byear + 18, era: t('era.' + startEra.from, startEra.name) })}</b></p>
            {a.top
              ? <><p><b>{t('strongest')}:</b> {t('field.' + a.top, FIELDS[a.top].name)}{a.second ? ' · ' + t('backup') + ': ' + t('field.' + a.second, FIELDS[a.second].name) : ''}</p>
                <p><b>{t('suggested')}:</b> {PATHS[a.top].jobs}</p>
                <div>{a.perks.map(p => <span key={p} className="perk">{p}</span>)}</div></>
              : <p className="mini">{t('pickHint')}</p>}
            {startingCash > 0 && <p className="mini" style={{ marginTop: 6 }}><b>{t('v11.startingCash')}</b>: {fmt(startingCash)}</p>}
          </div>
          <button className="ibtn" style={{ width: '100%' }} disabled={!name.trim()} onClick={() => setStep('review')}>
            <Ic id="ic-check" className="bsi" /><span>{t('v11.review')}</span>
          </button>
        </>
      ) : (
        // v11 — review + confirm step
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ margin: '0 0 8px' }}>{t('v11.reviewTitle')}</h3>
            <div className="lb"><span>{t('name')}</span><b>{name}</b></div>
            <div className="lb"><span>{t('v11.gender')}</span><b>{t('v11.gender' + gender.charAt(0).toUpperCase() + gender.slice(1))}</b></div>
            <div className="lb"><span>{t('birthYear')}</span><b>{byear} → {t('age')} 18 in {byear + 18}</b></div>
            <div className="lb"><span>{t('v11.birthMonth')}</span><b>{MONTHS_NAMES[birthMonth - 1]} · {zodiacDef.symbol} {zodiac}</b></div>
            <div className="lb"><span>{t('country')}</span><b>{t('nat.' + nation, nation)}</b></div>
            <div className="lb"><span>{t('religion')}</span><b>{t('religion.' + religion)}</b></div>
            <div className="lb"><span>{t('interests')}</span><b>{ints.map(i => t('int.' + i, i)).join(', ') || '—'}</b></div>
            <div className="lb"><span>{t('talents')}</span><b>{tals.map(tl => t('tal.' + tl, tl)).join(', ') || '—'}</b></div>
            <div className="lb"><span>{t('era')}</span><b>{t('era.' + startEra.from, startEra.name)}</b></div>
            {a.top && <div className="lb"><span>{t('strongest')}</span><b>{t('field.' + a.top, FIELDS[a.top].name)}</b></div>}
            {startingCash > 0 && <div className="lb"><span>{t('v11.startingCash')}</span><b>{fmt(startingCash)}</b></div>}
          </div>
          {/* v11.6 — zodiac + era suggestion card (the "most important"
              hint that combines astrological affinity + historical era) */}
          <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.zodiacEraHint')}</div>
            <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{zodiacSuggestion.zodiacLine}</p>
            <p className="mini" style={{ margin: '4px 0 0' }}>{zodiacSuggestion.eraLine}</p>
          </div>
          {/* v11 — first-step suggestion card */}
          <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid var(--accent)' }}>
            <div className="mini" style={{ textTransform: 'uppercase', letterSpacing: '.4px' }}>{t('v11.firstStep')}</div>
            <p style={{ margin: '4px 0 0', fontSize: '.92rem' }}>{suggestion}</p>
          </div>
          {/* v11.10 — mandatory disclaimer acknowledgment before starting a life.
              v11.33 — finally restyled: the old bare checkbox floated invisible
              on the dark theme (rgba(0,0,0,.04) label on dark bg) and looked
              broken forever. Now a proper card + custom checkbox. */}
          <label className="ack">
            <input type="checkbox" className="ackbox" checked={ack} onChange={e => setAck(e.target.checked)} />
            <span className="mini"><b>{t('disc.title')}.</b> {t('disc.ack')}</span>
          </label>
          <div className="trade">
            <button className="ibtn ghost" onClick={() => setStep('edit')}><Ic id="ic-x" className="bsi" /><span>{t('v11.back')}</span></button>
            {/* v11.10 — Begin stays disabled until the disclaimer is acknowledged */}
            <button className="ibtn" style={{ flex: 1 }} disabled={!ack} onClick={() => { if (userId.trim()) setActiveUserId(userId); onBegin({ name: name || 'Alex', byear, nation, religion, ints, tals, gender, birthMonth, birthDay }); }}>
              <Ic id="ic-plus" className="bsi" /><span>{t('begin')}</span>
            </button>
          </div>
        </>
      )}
    </div></div>
  );
}
