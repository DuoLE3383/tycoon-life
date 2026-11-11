'use client';

import { useState } from 'react';
import { Art, Ic } from '@/lib/art';
import { analyze, eraOf, FIELDS, INTERESTS, NATIONS, PATHS, TALENTS } from '@/lib/gameData';
import { useT, LANGS, type Lang } from '@/lib/i18n';
import { RELIGIONS, type Religion } from '@/lib/engine';
import type { NewLifeOptions } from '@/components/types';

export function IntroModal({ onBegin }: { onBegin: (options: NewLifeOptions) => void }) {
  const { t, lang, setLang } = useT();
  const [name, setName] = useState('');
  const [byear, setByear] = useState(1992);
  const [nation, setNation] = useState('Vietnam');
  const [religion, setReligion] = useState<Religion>('none');
  const [ints, setInts] = useState<string[]>([]);
  const [tals, setTals] = useState<string[]>([]);
  const years: number[] = [];
  const nowY = new Date().getUTCFullYear();
  for (let y = nowY - 126; y <= nowY - 18; y++) years.push(y);
  const a = analyze(ints, tals);
  const toggle = (arr: string[], set: (v: string[]) => void, id: string, max: number) => {
    const i = arr.indexOf(id);
    if (i > -1) set(arr.filter(x => x !== id));
    else if (arr.length < max) set([...arr, id]);
  };

  return (
    <div className="modal on"><div className="mcard">
      <h2>{t('createLife')}</h2>
      <p className="mini" style={{ marginTop: 0 }}>{t('introSub')}</p>
      <div className="field"><label>{t('lang')}</label>
        <div className="lang" style={{ display: 'inline-flex' }} role="group" aria-label="Language">
          {LANGS.map(l => <button key={l.id} type="button" aria-pressed={lang === l.id} data-lang={l.id} onClick={() => setLang(l.id as Lang)}>{l.label}</button>)}
        </div>
      </div>
      <div className="field"><label>{t('name')}</label><input maxLength={24} placeholder="e.g. Minh" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="field"><label>{t('birthYear')}</label>
        <select value={byear} onChange={e => setByear(+e.target.value)}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
      <div className="field"><label>{t('country')}</label>
        <select value={nation} onChange={e => setNation(e.target.value)}>{NATIONS.map(n => <option key={n} value={n}>{t('nat.' + n, n)}</option>)}</select></div>
      <div className="field"><label>{t('religion')}</label>
        <select value={religion} onChange={e => setReligion(e.target.value as Religion)}>
          {RELIGIONS.map(option => <option key={option} value={option}>{t('religion.' + option)}</option>)}
        </select>
      </div>
      <div className="field"><label>{t('interests')}</label>
        <div className="chips">{INTERESTS.map(i => (
          <button key={i.id} className={'chip' + (ints.includes(i.id) ? ' on' : '')} onClick={() => toggle(ints, setInts, i.id, 3)}><Art id={i.art} className="ca" />{t('int.' + i.id, i.label)}</button>
        ))}</div></div>
      <div className="field"><label>{t('talents')}</label>
        <div className="chips">{TALENTS.map(tl => (
          <button key={tl.id} className={'chip' + (tals.includes(tl.id) ? ' on' : '')} onClick={() => toggle(tals, setTals, tl.id, 2)}><Art id={tl.art} className="ca" />{t('tal.' + tl.id, tl.label)}</button>
        ))}</div></div>
      <div className="preview">
        <p><b>{t('youTurn18', '', { y: byear + 18, era: t('era.' + eraOf(byear + 18).from, eraOf(byear + 18).name) })}</b></p>
        {a.top
          ? <><p><b>{t('strongest')}:</b> {t('field.' + a.top, FIELDS[a.top].name)}{a.second ? ' · ' + t('backup') + ': ' + t('field.' + a.second, FIELDS[a.second].name) : ''}</p>
            <p><b>{t('suggested')}:</b> {PATHS[a.top].jobs}</p>
            <div>{a.perks.map(p => <span key={p} className="perk">{p}</span>)}</div></>
          : <p className="mini">{t('pickHint')}</p>}
      </div>
      <button className="ibtn" style={{ width: '100%' }} onClick={() => onBegin({ name: name || 'Alex', byear, nation, religion, ints, tals })}>
        <Ic id="ic-plus" className="bsi" /><span>{t('begin')}</span>
      </button>
    </div></div>
  );
}
