'use client';

import { fmt, type GameState, hire, JOBS, jobsOf, meets, negotiateRaise, quitJob, RETIRE, studyWorkMult, useT } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= JOBS =================
export function CareerTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const reqLabel = useReqLabel();
  const activeJobs = jobsOf(s);
  const ftJob = activeJobs.find(j => j.ft);
  const ftExp = ftJob ? (s.jobExp[ftJob.id] || 0) : 0;
  const contractDaysLeft = s.jobContractEnd > 0 ? Math.max(0, Math.round(s.jobContractEnd - s.day)) : 0;
  return (
    <>
      {/* v11.39 — Current job card: experience, contract status, raise/quit actions */}
      {ftJob && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="lb"><span>{t('career.current', 'Current position')}</span><b>{t('job.' + ftJob.id, ftJob.name)}</b></div>
          <div className="sub" style={{ marginTop: 4 }}>{t('career.salary', 'Salary')}: {fmt(ftJob.salary * studyWorkMult(s))}{t('perYear')}</div>
          <div className="sub">{t('career.experience', 'Experience')}: <b style={{ color: 'var(--accent)' }}>{ftExp}</b> XP · {t('career.raises', 'Raises')}: {s.jobRaises}</div>
          <div className="sub">
            {contractDaysLeft > 0
              ? `${t('career.contract', 'Contract')}: ${Math.round(contractDaysLeft / 30)} ${t('months', 'months')} ${t('career.remaining', 'remaining')}`
              : `${t('career.contractExpired', 'Contract expired — at-will employment')}`}
          </div>
          {/* Experience progress bar */}
          <div className="wbar" style={{ marginTop: 6, height: 6 }}><i style={{ width: Math.min(100, ftExp / 10) + '%', background: 'var(--gold)' }} /></div>
          <div className="trade" style={{ marginTop: 8, flexWrap: 'wrap' }}>
            <Btn ic="ic-up" label={t('career.negotiateRaise', 'Negotiate raise')} kind="sageb" onClick={() => act(st => negotiateRaise(st))} />
            <Btn ic="ic-x" label={t('career.quitJob', 'Quit job')} kind="danger" onClick={() => act(st => quitJob(st))} />
          </div>
          <p className="mini" style={{ marginTop: 6, opacity: .65 }}>{t('career.raiseHint', 'Raise success: 30-80% based on experience + level + fame. Failure: 15% chance of being fired.')}</p>
        </div>
      )}
      <h3>{t('jobs')}</h3>
      {JOBS.map(jb => {
        const mine = activeJobs.some(job => job.id === jb.id);
        const studyingFullTime = jb.ft && (s.study || s.sideStudy);
        const sameSlot = activeJobs.find(job => job.ft === jb.ft);
        const lock = mine ? '' : !meets(s, jb.req) ? t('requires') + ' ' + reqLabel(jb.req)
          : s.age >= RETIRE ? t('stage.3')
            : sameSlot ? t('jobSlotOccupied', '', { j: t('job.' + sameSlot.id, sameSlot.name) }) : '';
        return <Row key={jb.id} art={jb.art} right={<Btn ic={mine ? 'ic-x' : 'ic-plus'} label={mine ? t('quit') : (lock || t('apply'))} kind={mine ? 'ghost' : ''} disabled={!mine && !!lock}
          onClick={() => act(st => hire(st, jb.id))} />}>
          <b>{t('job.' + jb.id, jb.name)}{mine && ' · ' + t('current')}</b>
          <span className="sub">{fmt(jb.salary * (studyWorkMult(s) < 1 && jb.ft && mine ? studyWorkMult(s) : 1))}{t('perYear')} · {t('requires')} {reqLabel(jb.req)}{studyingFullTime && mine ? ` · ${t('studyWorkNote')}` : ''}</span>
        </Row>;
      })}
      <p className="sub">{t('multiJobNote')}</p>
      <p className="sub">{t('eduNote')}</p>
    </>
  );
}
