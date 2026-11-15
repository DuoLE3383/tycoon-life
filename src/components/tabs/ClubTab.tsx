'use client';
import { clubMult, CLUBS, fmt, FOUND_COST, FOUND_MIN_NW, foundClub, type GameState, joinClub, leaveClub, netWorth, OWN_CLUB_MULT, useState, useT, clubLevel, clubMembers, clubMonthlyDues } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';
export function ClubTab({ s, act }: { s: GameState; act: Act }) {
  const { t } = useT();
  const nw = netWorth(s);
  const [name, setName] = useState('');
  const activeMult = clubMult(s);
  return (
    <>
      {s.clubs.length > 0 && (
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="lb"><span>{t('clubs.active')}</span><b>×{activeMult.toFixed(2)}</b></div>
          <div className="lb"><span>{t('clubs.joined', '', { n: s.clubs.length })}</span><b>{s.clubs.map(id => t('club.' + id, CLUBS.find(c => c.id === id)?.name || id)).join(', ')}</b></div>
          <div className="lb"><span>{t('clubs.monthlyDues')}</span><b>{fmt(clubMonthlyDues(s))}{t('perMonth')}</b></div>
          <div className="mini" style={{ marginTop: 6 }}>{t('clubs.opportunityNote')}</div>
        </div>
      )}
      {CLUBS.map(c => {
        const mine = s.clubs.includes(c.id), ok = nw >= c.min;
        return <Row key={c.id} art={c.art} right={<div className="trade">
          {mine ? <Btn ic="ic-x" label={t('clubs.leave')} kind="danger" onClick={() => act(st => leaveClub(st, c.id))} /> : null}
          <Btn ic={mine ? 'ic-check' : 'ic-crown'} label={mine ? t('member') : !ok ? t('minNw') + ' ' + fmt(c.min) : t('join') + ' · ' + fmt(c.fee)} disabled={mine || !ok || s.money < c.fee} onClick={() => act(st => joinClub(st, c.id))} />
        </div>}>
          <b>{t('club.' + c.id, c.name)}{mine ? ' · ' + t('member') : ''}</b><span className="sub">{t('minNw')} {fmt(c.min)} · {t('fee')} {fmt(c.fee)} · {t('inc.biz')} ×{c.mult}</span>
          <span className="sub" style={{ display: 'block', marginTop: 2 }}>{t('club.level', '', { n: clubLevel(s, c.id) })} · {t('club.members', '', { n: clubMembers(s, c.id) })} · {t('club.maintenance', '', { x: fmt((c as any).maintenance ?? 0) })} · {t('club.event')}: {(c as any).event ?? '-'} · {t('club.buff')}: {(c as any).buff ?? '-'}</span>
        </Row>;
      })}
      {s.club === 'own'
        ? <Row art="c-own" right={<Btn ic="ic-check" label={t('member')} disabled />}><b>{s.ownClub}</b><span className="sub">{t('yourOwn')} · {t('inc.biz')} ×{OWN_CLUB_MULT}</span><span className="sub" style={{ display: 'block', marginTop: 2 }}>{t('club.level', '', { n: clubLevel(s, 'own') })} · {t('club.members', '', { n: clubMembers(s, 'own') })}</span></Row>
        : nw >= FOUND_MIN_NW && (
          <Row art="c-own" right={<Btn ic="ic-crown" label={t('found') + ' · ' + fmt(FOUND_COST)} disabled={s.money < FOUND_COST} onClick={() => act(st => foundClub(st, name))} />}>
            <b>{t('foundOwn')}</b>
            <input className="qty" style={{ width: '100%', marginTop: 6 }} maxLength={30} placeholder={`e.g. ${s.name}’s circle`} value={name} onChange={e => setName(e.target.value)} />
          </Row>
        )}
      <p className="sub">{t('oneClub', '', { x: fmt(FOUND_MIN_NW) })}</p>
    </>
  );
}
