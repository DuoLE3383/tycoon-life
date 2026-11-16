'use client';

import { bizIncome, bizMultiplier, branchCount, clubMult, cosmicMult, decayPerYear, fameBonus, type FieldKey, FIELDS, fmt, type GameState, healthMult, jobIncome, jobsOf, knowledgeText, levelMult, SAVE_RATE, socialIncome, spaceIncome, spaceMultiplier, spiritBizMult, taxOf, useT, yearIncome } from '@/components/gameDeps';
import { Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';



// ================= LINKS — how the systems connect (v9) =================
const LNODES: { id: string; x: number; y: number; w?: number }[] = [
  { id: 'edu', x: 20, y: 40 }, { id: 'job', x: 240, y: 40 }, { id: 'biz', x: 460, y: 40 }, { id: 'space', x: 680, y: 40 },
  { id: 'health', x: 20, y: 190 }, { id: 'level', x: 240, y: 190 }, { id: 'club', x: 460, y: 190 }, { id: 'fame', x: 680, y: 190 },
  { id: 'spirit', x: 20, y: 340 }, { id: 'social', x: 240, y: 340 }, { id: 'bank', x: 460, y: 340 }, { id: 'charity', x: 680, y: 340 },
  { id: 'income', x: 285, y: 486, w: 260 },
]


const NW = 150, NH = 52, IH = 58


const LKEY: Record<string, string> = {
  edu: 'tab.edu', job: 'tab.career', biz: 'tab.biz', space: 'tab.space',
  health: 'tab.health', level: 'level', club: 'tab.club', fame: 'fame',
  spirit: 'ln.node.spirit', social: 'tab.social', bank: 'tab.bank', charity: 'ln.node.charity', income: 'ln.income',
}


export type LEdge = [string, string, boolean, string?];


const LEDGES: LEdge[] = [
  ['edu', 'job', true], ['edu', 'biz', true, 'M 170 54 C 300 0 380 0 468 38'],
  ['job', 'income', true, 'M 340 92 C 420 180 420 300 414 484'],
  ['biz', 'income', true, 'M 500 92 C 420 220 415 330 414 484'],
  ['space', 'income', true, 'M 720 92 C 640 240 560 400 470 488'],
  ['social', 'income', true], ['bank', 'income', false],
  ['level', 'income', true, 'M 340 242 C 424 300 428 380 410 484'],
  ['health', 'income', false, 'M 95 242 C 190 320 210 420 302 482'],
  ['spirit', 'health', false], ['spirit', 'biz', false], ['spirit', 'space', false],
  ['fame', 'biz', true], ['fame', 'social', false], ['club', 'biz', true], ['charity', 'fame', true],
]


const cut = (x: string, n = 21) => (x.length > n ? x.slice(0, n - 1) + '…' : x)



export function LinksTab({ s, onNav }: { s: GameState; onNav?: (k: string) => void }) {
  const { t } = useT();
  // v11.54 — map each systems-map node to a tab id so the SVG nodes are
  // clickable. Tapping a node navigates to the relevant tab.
  const nodeLink: Record<string, string> = {
    edu: 'edu', job: 'career', biz: 'biz', space: 'space',
    health: 'health', level: 'home', club: 'club', fame: 'fame',
    spirit: 'spirit', social: 'social', bank: 'bank', charity: 'bank',
    income: 'finance-overview',
  };
  const box = (id: string) => LNODES.find(n => n.id === id)!;
  const cx = (n: { id: string; x: number; y: number; w?: number }) => n.x + (n.w || NW) / 2;
  const path = ([a, b, , d]: LEdge): string => {
    if (d) return d;
    const A = box(a), B = box(b);
    if (A.y === B.y) return `M ${A.x + (A.w || NW)} ${A.y + NH / 2} L ${B.x - 4} ${B.y + NH / 2}`;
    if (A.y < B.y) return `M ${cx(A)} ${A.y + NH} L ${cx(B)} ${B.y - 4}`;
    return `M ${cx(A)} ${A.y} L ${cx(B)} ${B.y + NH + 4}`;
  };
  const val = (id: string): string => {
    switch (id) {
      case 'edu': { const ds = (Object.keys(FIELDS) as FieldKey[]).filter(f => s.deg[f]).map(f => FIELDS[f].names[s.deg[f] - 1]); return cut(ds.length ? ds[ds.length - 1] : t('ln.edu.none')); }
      case 'job': { const current = jobsOf(s); return cut(current.length ? current.map(j => t('job.' + j.id, j.name)).join(' + ') : t('ln.job.none')); }
      case 'biz': return '+' + fmt(bizIncome(s)) + t('perYear');
      case 'space': return spaceIncome(s) > 0 ? '+' + fmt(spaceIncome(s)) + t('perYear') : '—';
      case 'health': return Math.round(s.health) + '/100';
      case 'level': return `${t('lvl')} ${s.level} · ×${levelMult(s).toFixed(2)}`;
      case 'club': return '×' + clubMult(s).toFixed(2);
      case 'fame': return String(Math.round(s.fame));
      case 'spirit': return Math.round(s.spirit) + '/100';
      case 'social': return s.social.followers.toLocaleString('en-US');
      case 'bank': return fmt(s.bank.dep) + (s.bank.loan > 0 ? ' · ' + fmt(-s.bank.loan) : '');
      case 'charity': return fmt(s.donated);
      case 'income': return '+' + fmt(yearIncome(s)) + t('perYear');
      default: return '';
    }
  };
  const rows: [string, string][] = [
    ['ln.f.eduJob', (() => { const k = knowledgeText(s); return k === 'None yet' ? '—' : cut(k, 26); })()],
    ['ln.f.eduBiz', '×' + (1 + .15 * s.deg.business).toFixed(2)],
    ['ln.f.jobInc', jobIncome(s) ? '+' + fmt(jobIncome(s)) + t('perYear') : '—'],
    ['ln.f.bizInc', '+' + fmt(bizIncome(s)) + t('perYear')],
    ['ln.f.spaceInc', '×' + spaceMultiplier(s).toFixed(2)],
    ['ln.f.socInc', '+' + fmt(socialIncome(s)) + t('perYear')],
    ['ln.f.bankInt', '+' + fmt(s.bank.dep * SAVE_RATE) + t('perYear')],
    ['ln.f.levelInc', '×' + levelMult(s).toFixed(2)],
    ['ln.f.healthGig', '×' + healthMult(s).toFixed(2)],
    ['ln.f.spiritHealth', s.spirit >= 70 ? '×0.85' : '—'],
    ['ln.f.spiritBiz', spiritBizMult(s) > 1 ? '×1.10' : '—'],
    ['ln.f.spiritSpace', cosmicMult(s) > 1 ? '×1.25' : '—'],
    ['ln.f.fameBiz', '×' + fameBonus(s).toFixed(3)],
    ['ln.f.fameSoc', s.fame > 0 ? '✓' : '—'],
    ['ln.f.clubBiz', '×' + clubMult(s).toFixed(2)],
    ['ln.f.bizCap', '×' + bizMultiplier(s).toFixed(2)],
    ['ln.f.charity', fmt(s.donated) + ' · karma ' + s.karma],
    ['ln.f.farm', branchCount(s, 'farm') ? '+30%' : '—'],
    ['ln.f.tax', fmt(taxOf(s.yIncome))],
    ['ln.f.era', '×' + s.eraBiz.toFixed(2)],
    ['ln.f.age', '−' + decayPerYear(s) + t('perYear')],
  ];
  return (
    <>
      <h3>{t('tab.links')}</h3>
      <p className="sub">{t('ln.sub')}</p>
      <div className="lnleg">
        <span className="mini"><span className="sw" />{t('ln.direct')}</span>
        <span className="mini"><span className="sw ind" />{t('ln.indirect')}</span>
      </div>
      <div className="lnwrap">
        <svg className="lnmap" viewBox="0 0 830 570" role="img" aria-label={t('tab.links')}>
        <defs>
          <marker id="lnA" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#8a7a5f" /></marker>
          <marker id="lnB" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7z" fill="#8ba2b8" /></marker>
        </defs>
        {LEDGES.map((e, i) => <path key={i} className={'ln-e' + (e[2] ? '' : ' ind')} d={path(e)} markerEnd={`url(#${e[2] ? 'lnA' : 'lnB'})`} />)}
        {LNODES.map(n => (
          <g key={n.id} className={'ln-node' + (n.id === 'income' ? ' big' : '') + (onNav ? ' clickable' : '')}
            onClick={onNav ? () => onNav(nodeLink[n.id] || 'home') : undefined}
            style={onNav ? { cursor: 'pointer' } : undefined}>
            <rect x={n.x} y={n.y} width={n.w || NW} height={n.id === 'income' ? IH : NH} rx="13" />
            <text x={cx(n)} y={n.y + (n.id === 'income' ? 24 : 21)} className="ln-name">{t(LKEY[n.id], LKEY[n.id])}</text>
            <text x={cx(n)} y={n.y + (n.id === 'income' ? 44 : 40)} className="ln-val">{val(n.id)}</text>
          </g>
        ))}
      </svg>
      </div>
      <h3>{t('ln.formulas')}</h3>
      <div className="card">
        {rows.map(([k, v]) => <div key={k} className="lb"><span className="sub">{t(k)}</span><b>{v}</b></div>)}
      </div>
      <p className="sub">{t('ln.sub')}</p>
    </>
  );
}
