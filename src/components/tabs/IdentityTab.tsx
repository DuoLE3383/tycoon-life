'use client';
import { useState } from '@/components/gameDeps';
import { NATIONS, LANGUAGES, NATION_LANGUAGES, displayNation, fmt, type GameState, langCost, langDays, canLearnLang, startLangStudy, canApplyCitizenship, applyCitizenship, travelToNation, netWorth } from '@/components/gameDeps';
import { type Act, Btn, Row } from '@/components/shared';
export function IdentityTab({ s, act }: { s: GameState; act: Act }) {
  const [nation, setNation] = useState(s.nation);
  const nw = netWorth(s);
  const studying = s.langStudy;
  const pending = s.citizenshipApplied;
  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>Quốc tịch hiện tại</span><b>{displayNation(s.nation)}</b></div>
        <div className="lb"><span>Quốc tịch gốc</span><b>{displayNation(s.originNation || s.nation)}</b></div>
        <div className="lb"><span>Tài sản ròng</span><b>{fmt(nw)}</b></div>
        <div className="lb"><span>Fame</span><b>{Math.round(s.fame)}</b></div>
        {pending ? <div className="mini" style={{ marginTop: 6 }}>Đang chờ xét duyệt nhập tịch {displayNation(pending.nation)} — còn {Math.max(0, pending.endDay - s.day)} ngày.</div> : null}
        {studying ? <div className="mini" style={{ marginTop: 6 }}>Đang học {studying.lang} lên Level {studying.targetLevel} — còn {Math.max(0, studying.endDay - s.day)} ngày.</div> : null}
      </div>
      <div className="lb" style={{ marginBottom: 6 }}><b>Ngoại ngữ</b><span className="sub">Level 1-5, Level 4+ mới đủ nhập tịch</span></div>
      {LANGUAGES.map((lang) => {
        const cur = s.langs?.[lang] ?? 0;
        const target = cur + 1;
        const cost = cur < 5 ? langCost(cur, target) : 0;
        const days = cur < 5 ? langDays(target) : 0;
        const busy = !!studying;
        return <Row key={lang} art="t-cap" right={<Btn ic="ic-check" label={cur >= 5 ? 'Thành thạo' : `Học lên Lv ${target} · ${fmt(cost)} · ${days} ngày`} disabled={cur >= 5 || busy || !canLearnLang(s, lang)} onClick={() => act(st => { startLangStudy(st, lang); })} />}>
          <b>{lang}</b><span className="sub">Level {cur}/5{cur >= 4 ? ' · Đủ điều kiện ngôn ngữ nhập tịch' : ''}</span>
        </Row>;
      })}
      <div className="lb" style={{ marginTop: 14, marginBottom: 6 }}><b>Quốc tịch &amp; Cư trú</b><span className="sub">Cần: 1 ngôn ngữ Lv 4+ · Cư trú 180 ngày · Phí 500.000$ · Fame 500 hoặc Tài sản 5M</span></div>
      <div className="card" style={{ marginBottom: 10 }}>
        <div className="lb"><span>Chọn nước</span></div>
        <select className="qty" style={{ width: '100%', marginTop: 6 }} value={nation} onChange={e => setNation(e.target.value)}>
          {NATIONS.map(n => <option key={n} value={n}>{displayNation(n)}</option>)}
        </select>
        {(() => {
          const reqLangs = NATION_LANGUAGES[nation] ?? [];
          const res = s.residency?.[nation] ?? 0;
          const check = canApplyCitizenship(s, nation);
          const trips = Math.floor(res / 7);
          const travelCost = 2000 + trips * 500;
          return (<>
            <div className="lb" style={{ marginTop: 8 }}><span>Ngôn ngữ yêu cầu</span><b>{reqLangs.map(l => `${l} Lv ${s.langs?.[l] ?? 0}`).join(' / ')}</b></div>
            <div className="lb"><span>Cư trú</span><b>{res} / 180 ngày</b></div>
            <div className="lb"><span>Điều kiện</span><b>{check.ok ? 'Đủ điều kiện' : check.reason}</b></div>
            <div className="trade" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <Btn ic="ic-plane" label={`Đi tới ${displayNation(nation)} · ${fmt(travelCost)} · +7 ngày`} disabled={(s.travelLastDay > 0 && s.lastDay - s.travelLastDay < 14) || s.money < travelCost} onClick={() => act(st => { travelToNation(st, nation); })} />
              <Btn ic="ic-crown" label="Nộp đơn nhập tịch · 500.000$" disabled={!check.ok} onClick={() => act(st => { applyCitizenship(st, nation); })} />
            </div>
          </>);
        })()}
      </div>
    </>
  );
}
