'use client';

import { botRows, fmt, type GameState, useT } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= RANKING =================
export function RankTab({ s, board, setBoard }: { s: GameState; board: string; setBoard: (b: 'all' | 'young' | 'industry' | 'nation') => void }) {
  const { t } = useT();
  const rows = botRows(s);
  const tabs: [string, string][] = [['all', t('rank.all')], ['young', t('rank.young')], ['industry', t('rank.industry')], ['nation', t('rank.nation')]];
  let body: React.ReactNode = null;
  if (board === 'young') {
    const list = rows.filter(r => r.a <= 35 && r.v >= 1e6).sort((a, b) => b.v - a.v).slice(0, 12);
    body = list.map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} {t('yrs')} · {r.nat}</span></span><span>{fmt(r.v)}</span></div>);
    if (!list.length) body = <div className="lb"><span>{t('noYoung')}</span></div>;
  } else if (board === 'industry') {
    const inds = [...new Set(rows.map(r => r.ind).filter(i => i && i !== '—'))];
    body = inds.map(ind => {
      const l = rows.filter(r => r.ind === ind).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={ind} className={'lb' + (lead.me ? ' me' : '')}><span>{ind}: {lead.n}{lead.me ? ' — ' + t('youLead') : me > -1 ? ` (${t('youAre', '', { n: me + 1 })})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else if (board === 'nation') {
    const nats = [...new Set(rows.map(r => r.nat))];
    body = nats.map(nat => {
      const l = rows.filter(r => r.nat === nat).sort((a, b) => b.v - a.v);
      const lead = l[0], me = l.findIndex(r => r.me);
      return <div key={nat} className={'lb' + (lead.me ? ' me' : '')}><span>{nat}: {lead.n}{me > -1 ? ` (${t('youAre', '', { n: me + 1 })})` : ''}</span><span>{fmt(lead.v)}</span></div>;
    });
  } else {
    body = [...rows].sort((a, b) => b.v - a.v).slice(0, 15).map((r, i) => <div key={r.n} className={'lb' + (r.me ? ' me' : '')}><span>{i + 1}. {r.n} <span className="tag">{r.a} {t('yrs')} · {r.nat} · {r.ind}</span></span><span>{fmt(r.v)}</span></div>);
  }
  return (<>
    <div className="rt">{tabs.map(([k, l]) => <button key={k} data-rt={k} aria-pressed={board === k} onClick={() => setBoard(k as 'all')}>{l}</button>)}</div>
    {body}
    <p className="sub">{t('rankNote')}</p>
  </>);
}
