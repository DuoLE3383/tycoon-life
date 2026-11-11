'use client';

import { changeInterest, dropStudySlot, effYears, enrollDeg, enrollLic, enrollShortCourse, type FieldKey, FIELDS, fmt, type GameState, INTERESTS, LIC_FOR, LICENSES, SHORT_BY, SHORT_COURSES, tuitionOf, useT } from '@/components/gameDeps';
import { type Act, Btn, Row } from '@/components/shared';
import { Btn, Row } from '@/components/shared';



// ================= EDUCATION =================
export function EduTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const studies = [s.study, s.sideStudy].filter((study): study is NonNullable<typeof study> => !!study);
  const slotsFull = studies.length >= 2;
  return (
    <>
      <h3>{t('degrees')}</h3>
      <p className="sub">{t('multiStudyNote')}</p>
      {(Object.keys(FIELDS) as FieldKey[]).map(f => {
        const F = FIELDS[f], cur = s.deg[f], max = F.names.length;
        if (cur >= max) return <Row key={f} art={F.art} right={<Btn ic="ic-check" label={t('done')} disabled />}><b>{t('field.' + f, F.name)}: {F.names[cur - 1]}</b><span className="sub">{t('highest')}</span></Row>;
        const L = cur + 1;
        const ongoing = studies.some(study => study.kind === 'deg' && study.field === f);
        const reason = ongoing ? t('inProgress') : slotsFull ? t('busy') : s.age > F.maxAge[L - 1] ? t('tooOld') : '';
        const years = effYears(s, f, L);
        const hasShort = s.shortCompleted?.some(id => SHORT_BY[id]?.field === f);
        return <Row key={f} art={F.art} right={<Btn ic="ic-cap" label={reason || t('enroll')} disabled={!!reason} onClick={() => act(st => enrollDeg(st, f))} />}>
          <b>{t('field.' + f, F.name)}: {F.names[L - 1]}</b>
          <span className="sub">{years.toFixed(1)} {t('years')}{s.topField && s.topField !== f ? ` · ${t('studyExtraTime')}` : ''} · {F.tuition[L - 1] ? fmt(tuitionOf(s, f, L)) + t('perYear') + ' ' + t('tuition') + (s.topField === f ? ' (−20%)' : '') : t('funded')}{hasShort ? ' (−10% short)' : ''}{cur ? ' · ' + t('buildsOn') + ' ' + F.names[cur - 1] : ''}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('schools')}: {F.schools.join(' · ')}</span>
          {/* v11 — per-degree roadmap (goal / strengths / careers) */}
          <span className="mini" style={{ display: 'block', marginTop: 2 }}><b>{t('v11.roadmap.goal')}</b>: {F.roadmap.goal}</span>
          <span className="mini" style={{ display: 'block' }}><b>{t('v11.roadmap.strengths')}</b>: {F.roadmap.strengths}</span>
          <span className="mini" style={{ display: 'block' }}><b>{t('v11.roadmap.careers')}</b>: {F.roadmap.careers}</span>
        </Row>;
      })}
      {/* v11 — drop-out buttons for ongoing studies */}
      {studies.length > 0 && (
        <>
          <h3>{t('v11.dropTitle')}</h3>
          {studies.map(study => {
            const slot = study === s.study ? 'study' : 'sideStudy';
            return <Row key={slot} art="ic-x" right={<Btn ic="ic-x" label={t('v11.drop')} kind="danger" onClick={() => act(st => dropStudySlot(st, slot))} />}>
              <b>{study.name}</b>
              <span className="sub">{Math.max(0, (study.end - s.day) / 365.25).toFixed(1)} {t('years')} {t('remaining')}</span>
            </Row>;
          })}
        </>
      )}
      {/* v11 — short / accelerated courses */}
      <h3>{t('v11.shortCourses')}</h3>
      <p className="sub">{t('v11.shortNote')}</p>
      {SHORT_COURSES.map(c => {
        const done = s.shortCompleted?.includes(c.id);
        const studying = studies.some(course => course.kind === 'lic' && course.id === c.id);
        const busy = slotsFull;
        const kind: 'busy' | 'ongoing' | undefined = studying ? 'ongoing' : busy ? 'busy' : undefined;
        return <Row key={c.id} art={c.art} right={<Btn ic={done ? 'ic-check' : 'ic-cap'} kind={kind} label={done ? t('done') : studying ? t('inProgress') : busy ? t('busy') : s.money < c.cost ? t('needLicence') : t('enroll')} disabled={done || !!studying || busy || s.money < c.cost} onClick={() => act(st => enrollShortCourse(st, c.id))} />}>
          <b>{c.name}</b>
          <span className="sub">{fmt(c.cost)} {t('fee')} · {t('dayCourse', '', { n: c.days })} · {t('field.' + c.field, FIELDS[c.field].name)}</span>
          <span className="mini" style={{ display: 'block', marginTop: 2 }}>{c.blurb}</span>
        </Row>;
      })}
      {/* v11 — change interests mid-life */}
      <h3>{t('v11.pivotTitle')}</h3>
      <p className="sub">{t('v11.pivotNote')}</p>
      {s.ints.length === 0 && <p className="sub">{t('v11.noInterests')}</p>}
      {s.ints.map(id => {
        const cur = INTERESTS.find(i => i.id === id);
        return <Row key={id} art={cur?.art || 'ic-bag'} right={
          <select className="qty" style={{ width: 'auto', minWidth: 140 }} onChange={e => { if (e.target.value) act(st => changeInterest(st, id, e.target.value)); e.target.value = ''; }} disabled={s.money < 5000}>
            <option value="">{t('v11.swapTo')}…</option>
            {INTERESTS.filter(i => !s.ints.includes(i.id)).map(i => <option key={i.id} value={i.id}>{t('int.' + i.id, i.label)}</option>)}
          </select>
        }>
          <b>{t('int.' + id, cur?.label || id)}</b>
          <span className="sub">{t('v11.pivotCost')}: $5,000</span>
        </Row>;
      })}
      <h3>{t('licences')}</h3>
      {LICENSES.map(l => {
        const owned = !!s.lic[l.id];
        const studying = studies.some(course => course.kind === 'lic' && course.id === l.id);
        const busy = slotsFull;
        // v11.43 BUG A fix: was t('needLicence') → "Cần bằng lái" on a licence
        // enrol button, making it look broken. Now correctly shows "Không đủ tiền".
        const label = owned ? t('done') : studying ? t('inProgress') : busy ? t('busy') : s.money < l.cost ? t('noMoney') : t('enroll');
        const kind: 'busy' | 'ongoing' | undefined = studying ? 'ongoing' : busy ? 'busy' : undefined;
        // v11.43 BUG D fix: localise category names + hide "needed for" when empty.
        const neededCats = Object.keys(LIC_FOR).filter(k => LIC_FOR[k] === l.id).map(k => t('cat.' + k, k));
        return <Row key={l.id} art={l.art} right={<Btn ic={owned ? 'ic-check' : 'ic-cap'} kind={kind} label={owned ? t('done') : label} disabled={owned || !!studying || busy || s.money < l.cost}
          onClick={() => act(st => enrollLic(st, l.id))} />}>
          <b>{t('lic.' + l.id, l.name)}</b><span className="sub">{fmt(l.cost)} {t('fee')} · {t('dayCourse', '', { n: l.days })}{neededCats.length > 0 ? ' · ' + t('neededFor') + ' ' + neededCats.join(', ') : ''}</span>
          {/* v11.43 BUG B fix: use existing multiStudyNote key instead of missing parallelStudyNote */}
          {studies.length === 1 && <span className="sub" style={{ display: 'block' }}>{t('multiStudyNote')}</span>}
        </Row>;
      })}
      <p className="sub">{t('eduTip')}</p>
    </>
  );
}
