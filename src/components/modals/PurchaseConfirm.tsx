'use client';

import { Art, asset, ASSET_DEPRECIATION_RATE, CREW_COST, fmt, type GameState, Ic, ITEM_BY, ITEM_IMAGES, type ItemDef, itemRarity, LIC_FOR, RARITY_COLOR, USED_IMAGES, type UsedItem, useT } from '@/components/gameDeps';



// v11.18 — purchase confirmation modal. Shown before any new or used item buy
// goes through. Reviews the item's photo + name + rarity + price + cash-after
// + upkeep + appreciate/depreciate rate (+ crew cost for yachts/jets + condition
// + age + listing note for used). Two buttons: Confirm buy / Cancel. The
// underlying buy logic (buyItem / buyUsedItem) is unchanged — this is purely a
// pre-confirm gate so a stray click doesn't commit the purchase.
export function PurchaseConfirm({ s, pending, onConfirm, onCancel }: { s: GameState; pending: { kind: 'new'; item: ItemDef } | { kind: 'used'; used: UsedItem }; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useT();
  const isNew = pending.kind === 'new';
  const u: UsedItem | null = isNew ? null : pending.used;
  // Legacy/custom used listings can reference a catalogue item that no longer
  // exists. Render from the listing snapshot rather than dereferencing undefined.
  const it: ItemDef = isNew ? pending.item : (ITEM_BY[(u as UsedItem).baseId] ?? {
    id: (u as UsedItem).baseId, cat: (u as UsedItem).cat, brand: (u as UsedItem).brand,
    name: (u as UsedItem).name, c: (u as UsedItem).c, price: (u as UsedItem).newPrice,
    lux: (u as UsedItem).lux, rate: (u as UsedItem).rate, art: (u as UsedItem).art,
  });
  const price = isNew ? (pending.item as ItemDef).price : (u as UsedItem).askPrice;
  const cashAfter = s.money - price;
  const canAfford = cashAfter >= 0;
  const irar = itemRarity(isNew ? (pending.item as ItemDef) : (u as UsedItem));
  const upkeepYr = Math.round(price * 0.02);
  // Appreciate or depreciate? Items with rate >= 0 appreciate.
  const rate = it.rate;
  const ratePct = Math.abs(Math.min(rate, ASSET_DEPRECIATION_RATE) * 100).toFixed(0);
  const appreciates = rate > 0;
  // Crew cost for yachts + private jets.
  const crewCat = CREW_COST[it.cat] || 0;
  const crewNow = crewCat > 0 ? ((it.cat === 'Yacht' && s.lic['boat']) || (it.cat === 'Private jet' && s.lic['pilot']) ? Math.round(crewCat / 2) : crewCat) : 0;
  // Licence requirement.
  const need = LIC_FOR[it.cat];
  const locked = !!need && !s.lic[need];
  const img = isNew ? ITEM_IMAGES[(pending.item as ItemDef).id] : USED_IMAGES[(u as UsedItem).id];
  const condTxt = u ? (u.condition >= 80 ? 'mint' : u.condition >= 60 ? 'good' : u.condition >= 40 ? 'fair' : 'rough') : '';
  const off = u ? Math.max(0, Math.round((1 - u.askPrice / u.newPrice) * 100)) : 0;
  return (
    <div className="modal on" onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="mcard" style={{ maxWidth: 460 }}>
        <div className="mhead">
          <h2>{t('buy.title')} · <span className="mini">{isNew ? t('buy.new') : t('buy.used')}</span></h2>
          <button className="ibtn danger" onClick={onCancel}><Ic id="ic-x" className="bsi" /><span>✕</span></button>
        </div>
        {/* photo + name + rarity */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={{ flex: '0 0 110px', height: 90, borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.04)' }}>
            {img ? <img src={asset(img)} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <Art id={it.art} />}
          </div>
          <div style={{ flex: 1 }}>
            <b>{it.brand ? <span className="bchip" style={{ background: it.c, marginRight: 4 }}>{it.brand}</span> : null}{it.name}</b>
            <div style={{ marginTop: 4 }}><span className="rarity-chip" data-rarity={irar} style={{ '--rc': RARITY_COLOR[irar] } as React.CSSProperties}>{t('rarity.' + irar)}</span></div>
            <div className="mini" style={{ marginTop: 4, opacity: .7 }}>{t('buy.luxury')}: +{it.lux}</div>
            {u && <div className="mini" style={{ marginTop: 4, opacity: .7 }}>{t('buy.discountOff', '', { n: off })}</div>}
          </div>
        </div>
        {/* price + cash-after + upkeep + rate */}
        <div className="lb"><span>{t('buy.price')}</span><b style={{ color: canAfford ? 'inherit' : 'var(--brick)' }}>{fmt(price)}</b></div>
        <div className="lb"><span>{t('buy.cashAfter')}</span><b style={{ color: cashAfter < 0 ? 'var(--brick)' : 'var(--sage)' }}>{fmt(cashAfter)}</b></div>
        <div className="lb"><span>{t('buy.upkeep')}</span><b>{fmt(upkeepYr)}</b></div>
        {crewCat > 0 && <div className="lb"><span>{t('buy.crew')}</span><b>{fmt(crewNow)}{crewNow < crewCat ? ` (${t('v11.crewHalved')})` : ''}</b></div>}
        <div className="lb"><span>{appreciates ? t('buy.appreciates', '', { n: ratePct }) : t('buy.depreciates', '', { n: ratePct })}</span><b style={{ color: appreciates ? 'var(--sage)' : 'var(--brick)' }}>{appreciates ? '↗' : '↘'}</b></div>
        {/* used-only fields */}
        {u && <>
          <div className="lb"><span>{t('buy.cond')}</span><b><span className="cond-pill" data-cond={condTxt}>{u.condition} · {condTxt}</span></b></div>
          <div className="lb"><span>{t('buy.ageYears')}</span><b>{u.ageYears} {t('years')}</b></div>
          {u.story && <p className="mini" style={{ marginTop: 6, fontStyle: 'italic', opacity: .8 }}>{u.story}</p>}
        </>}
        {/* confirm / cancel buttons */}
        <div className="trade" style={{ marginTop: 12, justifyContent: 'flex-end', gap: 8 }}>
          <button className="ibtn danger" onClick={onCancel}><span>{t('buy.cancel')}</span></button>
          <button className="tbuy" disabled={!canAfford || locked} onClick={onConfirm}>
            <span>{locked ? t('buy.locked') : canAfford ? t('buy.confirm') : t('buy.insufficient')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
