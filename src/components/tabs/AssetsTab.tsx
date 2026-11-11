'use client';

import { Art, asset, ASSET_DEPRECIATION_RATE, assetVal, AUCTION_DAYS, AUCTION_FEE, buyItem, buyUsedItem, cancelMarketJob, CREW_COST, fmt, fmtFull, type GameState, Ic, ITEM_BY, ITEM_IMAGES, type ItemDef, itemGroup, type ItemGroup, itemRarity, ITEMS, itemStockLeft, LIC_BY, LIC_FOR, LISTING_DAYS, LISTING_FEE, lotValue, marketVal, placeBidRare, postSaleListing, putUpAuction, RARE_IDS, RARE_ITEMS, RARITY_COLOR, RARITY_MULT, registerItem, repairCost, repairLot, repairSkill, repairUsed, RESALE_FEE, sellChanceOf, sellLot, sellUsed, toggleFav, USED_IMAGES, USED_MARKET, type UsedItem, usedItemValue, useMemo, useState, useT, worldYear } from '@/components/gameDeps';
import { type Act, Btn, Row, useEscapeKey, useReqLabel } from '@/components/shared';
import { PurchaseConfirm } from '@/components/modals/PurchaseConfirm';



// ================= ASSETS (v11.33 — regrouped) =================
// Player-requested structure replacing the old 5-section menu:
//   🏠 BẤT ĐỘNG SẢN   — buy / sell / auction (Property)
//   💎 ĐỒ CAO CẤP     — buy / sell / auction (luxury tier, lux ≥ 15)
//   👕 ĐỒ BÌNH DÂN    — everyday goods (lux < 15)
//   📦 TÀI SẢN        — the collection: houses, wheels, collectibles, goods
//   🔨 ĐẤU GIÁ & CHỢ  — favourites watchlist, scheduled auctions, live rare
//                       bidding + the pre-owned market
//   🌟 ĐỒ HIẾM        — auction-only grails: announced ahead, then a REAL
//                       bidding war (NPCs raise the price, you can be outbid)
//   🔧 WORKSHOP       — repair & restore (unchanged)
// Every row and tile carries a ⭐ favourite toggle; favourites are tracked in
// the auction-house watchlist with their live market values.
export type AssetSec = 'bds' | 'lux' | 'budget' | 'own' | 'auction' | 'rare' | 'workshop';



const CATART: Record<string, string> = { 'Sport bike': 'i-bike', 'Phone': 'i-phone', 'Watch': 'i-watch', 'Jewelry': 'i-ring', 'Suit': 'i-suit', 'Car': 'i-lambo', 'Property': 'i-house', 'Yacht': 'i-yacht', 'Private jet': 'i-jet', 'Art': 'i-art', 'Collectibles': 'i-coin', 'Sneakers': 'i-shoe', 'Handbag': 'i-handbag', 'Audio': 'i-sound', 'Camera': 'i-cam', 'Classic car': 'i-lambo' }



export function AssetsTab({ s, act, curCat, setCurCat }: { s: GameState; act: Act; curCat: string | null; setCurCat: (c: string | null) => void }) {
  const { t } = useT();
  // v11.51 — default to 'own' (currently held assets) so the tab opens on the
  // player's portfolio instead of the buy catalogue. Was 'bds'.
  const [sec, setSec] = useState<AssetSec>('bds');
  // v11.18 — pending purchase confirmation modal (unchanged this version).
  const [pendingBuy, setPendingBuy] = useState<{ kind: 'new'; item: ItemDef } | { kind: 'used'; used: UsedItem } | null>(null);
  // v11.33 — draft amount for the live rare-auction bid box.
  const [bidDraft, setBidDraft] = useState('');
  // v11.58 — LLM item generator busy flag. While true, the "Generate" button
  // is disabled and shows a "Generating…" label; the fetch is awaited here
  // (not in `act`) because `act` is synchronous — the async work happens
  // first, then `act` is called with the registered item to toast + persist.
  const [genBusy, setGenBusy] = useState(false);
  // v13.9 — owned-asset categories are collapsed by default; the player taps
  // a category header to expand its rows. A Set<string> of expanded keys
  // (empty by default) — toggled by the ownCatHeader button.
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => new Set());
  // Surface 6 used listings, shuffled deterministically by the current
  // game-year so the listings rotate as the player ages.
  const y = worldYear(s);
  const usedShown = useMemo(() => {
    const seed = y * 7 + s.level;
    const arr = [...USED_MARKET].filter(u => u.since <= y);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (seed * (i + 3) + 13) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const filtered = arr.filter(u => !s.used.some(owned => owned.id === u.id));
    return filtered.slice(0, 6);
  }, [y, s.level, s.used.length]);

  const condTxtOf = (c: number) => c >= 80 ? 'mint' : c >= 60 ? 'good' : c >= 40 ? 'fair' : 'rough';
  // v13.2 — mythic items join the rare section. rareLots / rareUsed now also
  // match mythic-tier items so they appear under "Đồ hiếm" alongside legendary.
  const rareIds = ['rare', 'legendary', 'mythic'];
  // v11.33 — favourites + group membership helpers.
  const favOn = (id: string) => (s.favs || []).includes(id);
  const favBtn = (id: string) => (
    <button className={'favbtn' + (favOn(id) ? ' on' : '')} title={t('fav.toggle')} aria-pressed={favOn(id)}
      onClick={() => act(st => { toggleFav(st, id); return null; })}>★</button>
  );
  // v13.1 — null-safe ITEM_BY access: filter out lots whose item id doesn't
  // exist in ITEM_BY (e.g. custom items from admin/LLM not in static data).
  // Without this, ITEM_BY[l.id] returns undefined → .rarity crash.
  const ownLots = (g: ItemGroup) => s.lots.map((l, i) => ({ l, i })).filter(({ l }) => { const it = ITEM_BY[l.id]; return it && itemGroup(it) === g; });
  const ownUsed = (g: ItemGroup) => s.used.map((u, i) => ({ u, i })).filter(({ u }) => itemGroup({ cat: u.cat, lux: u.lux }) === g);
  const repLots = s.lots.map((l, i) => ({ l, i })).filter(({ l }) => (l.condition == null ? 100 : l.condition) < 100);
  const repUsed = s.used.map((u, i) => ({ u, i })).filter(({ u }) => u.condition < 100);
  const rareLots = s.lots.map((l, i) => ({ l, i })).filter(({ l }) => { const it = ITEM_BY[l.id]; return it && (rareIds.includes(itemRarity(it)) || RARE_IDS.has(l.id)); });
  const rareUsed = s.used.map((u, i) => ({ u, i })).filter(({ u }) => rareIds.includes(itemRarity(u)) || RARE_IDS.has(u.baseId));

  // v11.51 — reordered: 'own' (currently held assets) first so players see
  // v13.11 — reordered per user request: 'own' moved to BOTTOM (was first).
  // Buy catalogue first, then auctions + rare + workshop, then owned items last.
  const secs: [AssetSec, string, string, number][] = [
    ['bds', 'i-house', 'astsec.bds', ownLots('bds').length],
    ['lux', 'i-ring', 'astsec.lux', ownLots('lux').length + ownUsed('lux').length],
    ['budget', 'i-shoe', 'astsec.budget', ownLots('budget').length + ownUsed('budget').length],
    ['auction', 'ic-up', 'astsec.auction', s.mkt.length + (s.rareUp || []).length + (s.rareLive ? 1 : 0)],
    ['rare', 'ic-star', 'astsec.rare', (s.rareUp || []).length + (s.rareLive ? 1 : 0) + rareLots.length + rareUsed.length],
    ['workshop', 'ic-check', 'astsec.workshop', repLots.length + repUsed.length],
    ['own', 'ic-bag', 'astsec.own', s.lots.length + s.used.length],
  ];

  // ---- shared row renderers (called as plain functions, not components) ----
  // v13.1 — null-safe: skip lots whose item id isn't in ITEM_BY.
  const lotRow = (l: GameState['lots'][number], idx: number, mode: 'sell' | 'workshop') => {
    const it = ITEM_BY[l.id];
    if (!it) return null; // item not in static data (custom/admin item) — skip
    const v = lotValue(s, l), resale = v * (1 - RESALE_FEE);
    const rar = itemRarity(it);
    const cond = l.condition == null ? 100 : l.condition;
    const ask = Math.round(v * RARITY_MULT[rar] * 1.4);
    const repCost = repairCost(s, it.price, rar);
    return <Row key={'l' + idx} art={it.art} image={ITEM_IMAGES[l.id]} right={<div className="trade" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {mode !== 'workshop' && <>
        <Btn ic="ic-up" label={t('mkt.auctionBtn')} kind="ghost" disabled={s.money < Math.round(ask * AUCTION_FEE)} onClick={() => act(st => putUpAuction(st, 'lot', idx, t))} />
        <Btn ic="ic-coins" label={t('mkt.listBtn')} kind="ghost" disabled={s.money < Math.round(ask * LISTING_FEE)} onClick={() => act(st => postSaleListing(st, 'lot', idx, t))} />
        <Btn ic="ic-down" label={t('sell') + ' ' + fmt(resale)} kind="danger" onClick={() => act(st => sellLot(st, idx))} />
      </>}
      {mode === 'workshop' && cond < 100 && <Btn ic="ic-check" label={t('workshop.repair') + ' ' + fmt(repCost)} kind="ghost" disabled={s.money < repCost} onClick={() => act(st => repairLot(st, idx))} />}
    </div>}>
      <b>{favBtn(l.id)}{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name} <span className="rarity-chip" data-rarity={rar} style={{ '--rc': RARITY_COLOR[rar] } as React.CSSProperties}>{t('rarity.' + rar)}</span>{l.serial != null && l.serialOf != null && <span className="serial-chip" style={{ background: 'var(--accent)', color: '#fff' }}>#{l.serial} of {l.serialOf}</span>}</b>
      <span className="sub">
        {mode === 'workshop'
          ? <span className="cond-pill" data-cond={condTxtOf(cond)}>{t('used.cond')} {cond} · {condTxtOf(cond)}</span>
          : <><span className="cond-pill" data-cond={condTxtOf(cond)}>{t('used.cond')} {cond} · {condTxtOf(cond)}</span>{' · '}{t('paid')} <b className="num-full">{fmtFull(l.paid)}</b> · {t('worthNow')} <b className="num-full">{fmtFull(v)}</b> · {v >= l.paid ? t('gains', '', { n: ((v / l.paid - 1) * 100).toFixed(0) }) : t('loses', '', { n: ((1 - v / l.paid) * 100).toFixed(0) })}</>}
      </span>
      {rar === 'mythic' && typeof it.stock === 'number' && <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--brick)', fontWeight: 700 }}>🌍 {t('rarity.mythicOnlyWorld', '', { n: it.stock })}</span>}
      {mode !== 'workshop' && <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        🔨 {t('auction.ask')} <b className="num-full">{fmtFull(ask)}</b> · ⏳ {t('mkt.auctionWindow', '', { n: AUCTION_DAYS[0] + '-' + AUCTION_DAYS[1] })} ~{Math.round(sellChanceOf(rar, 'auction', 5) * 100)}% · ⏳ {t('mkt.listingWindow', '', { n: LISTING_DAYS[0] + '-' + LISTING_DAYS[1] })} ~{Math.round(sellChanceOf(rar, 'listing', 10) * 100)}%
      </span>}
    </Row>;
  };
  const usedRow = (u: GameState['used'][number], idx: number, mode: 'sell' | 'workshop') => {
    const v = usedItemValue(s, u), resale = v * (1 - RESALE_FEE);
    const rar = itemRarity(u);
    const ask = Math.round(v * RARITY_MULT[rar] * 1.4);
    const repCost = repairCost(s, u.paid, rar);
    return <Row key={u.id} art={u.art} image={USED_IMAGES[u.id]} right={<div className="trade" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {mode !== 'workshop' && <>
        <Btn ic="ic-up" label={t('mkt.auctionBtn')} kind="ghost" disabled={s.money < Math.round(ask * AUCTION_FEE)} onClick={() => act(st => putUpAuction(st, 'used', idx, t))} />
        <Btn ic="ic-coins" label={t('mkt.listBtn')} kind="ghost" disabled={s.money < Math.round(ask * LISTING_FEE)} onClick={() => act(st => postSaleListing(st, 'used', idx, t))} />
        <Btn ic="ic-down" label={t('used.sell') + ' ' + fmt(resale)} kind="danger" onClick={() => act(st => sellUsed(st, idx))} />
      </>}
      {mode === 'workshop' && u.condition < 100 && <Btn ic="ic-check" label={t('workshop.repair') + ' ' + fmt(repCost)} kind="ghost" disabled={s.money < repCost} onClick={() => act(st => repairUsed(st, idx))} />}
    </div>}>
      <b>{favBtn(u.baseId)}{u.brand ? <span className="bchip" style={{ background: u.c }}>{u.brand}</span> : null}{u.name} <span className="rarity-chip" data-rarity={rar} style={{ '--rc': RARITY_COLOR[rar] } as React.CSSProperties}>{t('rarity.' + rar)}</span></b>
      <span className="sub">
        <span className="cond-pill" data-cond={condTxtOf(u.condition)}>{t('used.cond')} {u.condition} · {condTxtOf(u.condition)}</span>
        {' · '}{t('used.age', '', { n: u.ageYears })} · {t('paid')} <b className="num-full">{fmtFull(u.paid)}</b> · {t('worthNow')} <b className="num-full">{fmtFull(v)}</b>
      </span>
      {mode !== 'workshop' && <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        🔨 {t('auction.ask')} <b className="num-full">{fmtFull(ask)}</b> · ⏳ {t('mkt.auctionWindow', '', { n: AUCTION_DAYS[0] + '-' + AUCTION_DAYS[1] })} ~{Math.round(sellChanceOf(rar, 'auction', 5) * 100)}% · ⏳ {t('mkt.listingWindow', '', { n: LISTING_DAYS[0] + '-' + LISTING_DAYS[1] })} ~{Math.round(sellChanceOf(rar, 'listing', 10) * 100)}%
      </span>}
      <span className="mini" style={{ display: 'block', marginTop: 2, fontStyle: 'italic' }}>{u.story}</span>
    </Row>;
  };

  // ---- buy-catalogue section (shared by bds / lux / budget) ----
  // v11.56 — now also shows used items from USED_MARKET that match the group,
  // so players can buy cheaper pre-owned items + repair them in the workshop.
  const groupSec = (g: ItemGroup) => {
    const items = ITEMS.filter(i => itemGroup(i) === g);
    const cats = [...new Set(items.map(i => i.cat))].sort((a, b) => {
      const loA = Math.min(...items.filter(i => i.cat === a).map(i => i.price));
      const loB = Math.min(...items.filter(i => i.cat === b).map(i => i.price));
      return loA - loB;
    });
    const mine = [...ownLots(g).map(({ l, i }) => ({ l, i })), ...ownUsed(g).map(({ u, i }) => ({ u, i }))];
    // v11.56 — used items from USED_MARKET matching this group, era-filtered,
    // excluding ones the player already owns.
    const usedForGroup = USED_MARKET
      .filter(u => u.since <= y)
      .filter(u => itemGroup({ cat: u.cat, lux: u.lux }) === g)
      .filter(u => !s.used.some(owned => owned.id === u.id))
      .slice(0, 6);
    return <>
      <p className="sub">{t('agroup.sub.' + g)}</p>
      {mine.length > 0 && <>
        <h3>{t('astsec.have')}</h3>
        {ownLots(g).map(({ l, i }) => lotRow(l, i, 'sell'))}
        {ownUsed(g).map(({ u, i }) => usedRow(u, i, 'sell'))}
      </>}
      <h3>{t('astsec.buy')} · {t('agroup.' + g)}</h3>
      <p className="mini" style={{ opacity: .65, marginBottom: 6 }}>{t('cat.sortedNote')}</p>
      <div className="grid">
        {cats.map(c => {
          const list = items.filter(i => i.cat === c);
          const lo = Math.min(...list.map(i => i.price)), hi = Math.max(...list.map(i => i.price));
          const need = LIC_FOR[c], have = !need || s.lic[need];
          const crewCat = CREW_COST[c] || 0;
          const lockedHint = need && !have ? t('cat.lockedHint', '', { req: t('lic.' + need, LIC_BY[need]?.name || need) }) : '';
          return <button key={c} className="tile" onClick={() => setCurCat(c)} disabled={!!lockedHint}>
            <Art id={CATART[c] || 'ic-bag'} />
            <span>
              <b>{favBtn(list[0].id)}{t('cat.' + c, c)}</b>
              <span className="sub" style={{ display: 'block' }}>{list.length} {t('items')} · {fmt(lo)} – {fmt(hi)}{crewCat ? ' · ' + t('v11.crewOptional') : ''}</span>
              {lockedHint ? (
                <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--brick)' }}>
                  <Ic id="ic-lock" className="bsi" /> {lockedHint}
                </span>
              ) : need && have ? (
                <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--sage)' }}>✓ {t('lic.' + need, LIC_BY[need]?.name || need)}</span>
              ) : null}
            </span>
          </button>;
        })}
      </div>
      <p className="sub">{t('tapCategory')}</p>

      {/* v11.56 — Used items section: cheaper pre-owned items, repairable. */}
      {usedForGroup.length > 0 && (
        <>
          <h3>🔧 {t('used.title')} · {t('agroup.' + g)}</h3>
          <p className="mini" style={{ opacity: .65, marginBottom: 6 }}>{t('used.buyNote')}</p>
          <div className="grid">
            {usedForGroup.map(u => {
              const off = Math.max(0, Math.round((1 - u.askPrice / u.newPrice) * 100));
              const cond = u.condition;
              const condTxt = cond >= 80 ? 'mint' : cond >= 60 ? 'good' : cond >= 40 ? 'fair' : 'rough';
              return <button key={u.id} className="tile used-tile" disabled={s.money < u.askPrice}
                onClick={() => setPendingBuy({ kind: 'used', used: u })}>
                {USED_IMAGES[u.id]
                  ? <img className="tile-photo" src={asset(USED_IMAGES[u.id])} alt={u.name} loading="lazy" />
                  : <Art id={u.art} />}
                <span>
                  <b>{u.brand ? <span className="bchip" style={{ background: u.c }}>{u.brand}</span> : null}{u.name}</b>
                  <span className="sub" style={{ display: 'block' }}>
                    <span className="cond-pill" data-cond={condTxt}>{t('used.cond')} {cond}</span>
                    {' · '}{t('used.age', '', { n: u.ageYears })}
                  </span>
                  <span className="sub" style={{ display: 'block' }}>{t('used.ask')} <b>{fmt(u.askPrice)}</b> · <span className="up">{t('used.discount', '', { n: off })}</span></span>
                  <span className="mini" style={{ display: 'block', marginTop: 2, color: 'var(--accent)' }}>🔧 {t('used.repairHint')}</span>
                </span>
              </button>;
            })}
          </div>
        </>
      )}
    </>;
  };

  // ---- v11.33 — live rare lot + schedule renderers (auction & rare sections) ----
  const rareLiveBlock = () => {
    const L = s.rareLive; if (!L) return null;
    const it = ITEM_BY[L.id]; if (!it) return null; // v13.1 null-safe
    const min = Math.ceil(L.bid * 1.05);
    const left = Math.max(0, Math.ceil(L.endDay - s.day));
    return <div className="card rare-live" data-lead={L.leader}>
      <div className="mhead" style={{ marginBottom: 4 }}>
        <h2 style={{ margin: 0, fontSize: '1.05rem' }}>🔨 {t('auction.liveTitle')}</h2>
        <span className="rarity-chip" data-rarity="legendary" style={{ '--rc': RARITY_COLOR.legendary } as React.CSSProperties}>{t('rarity.legendary')}</span>
      </div>
      <b style={{ fontSize: '1.02rem' }}>{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name}</b>
      <span className="sub" style={{ display: 'block', marginTop: 2 }}>
        {t('auction.curBid')}: <b>{fmt(L.bid)}</b> · {t('auction.minBid')}: {fmt(min)} · ⏳ {t('mkt.daysLeft', '', { n: left })}
      </span>
      <span className="mini" style={{ display: 'block', marginTop: 2 }}>
        {L.leader === 'you' ? '⭐ ' + t('auction.youLead', '', { x: fmt(L.my) }) : '🤝 ' + t('auction.npcLead')}
      </span>
      <div className="trade" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        <input className="qty" style={{ width: 130 }} inputMode="numeric" value={bidDraft} placeholder={String(min)}
          onChange={e => setBidDraft(e.target.value.replace(/[^\d]/g, ''))} />
        <button className="ibtn" disabled={!(Number(bidDraft) >= min) || s.money < Number(bidDraft)}
          onClick={() => { act(st => placeBidRare(st, Math.floor(Number(bidDraft)), t)); setBidDraft(''); }}>
          <Ic id="ic-up" className="bsi" /><span>{t('auction.place')}</span>
        </button>
      </div>
      <span className="mini" style={{ display: 'block', marginTop: 4, opacity: .7 }}>{t('auction.bidNote')}</span>
    </div>;
  };
  const rareSchedBlock = () => (s.rareUp || []).length === 0 ? null : <>
    <h3>📅 {t('auction.sched')}</h3>
    {(s.rareUp || []).map((u, i) => {
      const it = ITEM_BY[u.id]; if (!it) return null; // v13.1 null-safe
      const left = Math.max(0, Math.ceil(u.atDay - s.day));
      return <Row key={u.id + i} art={it.art} image={ITEM_IMAGES[u.id]} right={<span className="tag dark">{t('auction.in', '', { n: left })}</span>}>
        <b>{favBtn(u.id)}{it.name}</b>
        <span className="sub">{t('auction.est')}: ~{fmt(it.price)} · {t('rare.galleryNote')}</span>
      </Row>;
    })}
  </>;

  // ---- v11.33 — TÀI SẢN buckets (houses / wheels / collection / goods) ----
  // v13.9 — owned assets are now grouped + COLLAPSED by category. The previous
  // four flat buckets (houses / wheels / collection / goods) rendered every
  // owned row at once, which got unwieldy once the player owned dozens of items.
  // The new layout shows one summary header per category (icon · label · count
  // · total value) and only renders the rows when the player expands it. The
  // catGroupOf() mapping collapses the 16+ catalogue cat strings into 12 tidy
  // groups; anything unmatched falls into 'other'. ownRowsFor + the legacy
  // isHouseCat/isWheelCat/isCollCat helpers were removed alongside this change.
  const CAT_GROUPS: { key: string; icon: string; label: string }[] = [
    { key: 'properties', icon: '🏠', label: 'Properties' },
    { key: 'vehicles', icon: '🚗', label: 'Vehicles' },
    { key: 'watches', icon: '⌚', label: 'Watches' },
    { key: 'jewelry', icon: '💎', label: 'Jewelry' },
    { key: 'art', icon: '🖼', label: 'Art' },
    { key: 'collectibles', icon: '🎴', label: 'Collectibles' },
    { key: 'sneakers', icon: '👟', label: 'Sneakers' },
    { key: 'handbags', icon: '👜', label: 'Handbags' },
    { key: 'audio', icon: '🎧', label: 'Audio' },
    { key: 'camera', icon: '📷', label: 'Cameras' },
    { key: 'suits', icon: '👔', label: 'Suits' },
    { key: 'other', icon: '📦', label: 'Other' },
  ];
  const catGroupOf = (c: string): string => {
    switch (c) {
      case 'Property': return 'properties';
      case 'Car': case 'Sport bike': case 'Classic car': return 'vehicles';
      case 'Watch': return 'watches';
      case 'Jewelry': return 'jewelry';
      case 'Art': return 'art';
      case 'Collectibles': return 'collectibles';
      case 'Sneakers': return 'sneakers';
      case 'Handbag': return 'handbags';
      case 'Audio': return 'audio';
      case 'Camera': return 'camera';
      case 'Suit': return 'suits';
      default: return 'other';
    }
  };
  // v13.1 — null-safe: skip lots whose ITEM_BY lookup returns undefined.
  // Build a per-category { lots, used, totalValue, count } map once per render.
  const ownBuckets = (() => {
    const map: Record<string, { lots: { l: GameState['lots'][number]; i: number }[]; used: { u: GameState['used'][number]; i: number }[]; total: number }> = {};
    for (const g of CAT_GROUPS) map[g.key] = { lots: [], used: [], total: 0 };
    for (let i = 0; i < s.lots.length; i++) {
      const l = s.lots[i]; const it = ITEM_BY[l.id];
      if (!it) continue;
      const k = catGroupOf(it.cat);
      map[k].lots.push({ l, i });
      map[k].total += lotValue(s, l);
    }
    for (let i = 0; i < s.used.length; i++) {
      const u = s.used[i];
      const k = catGroupOf(u.cat);
      map[k].used.push({ u, i });
      map[k].total += usedItemValue(s, u);
    }
    return map;
  })();
  const ownAllEmpty = s.lots.length === 0 && s.used.length === 0;
  const toggleCat = (k: string) => setExpandedCats(prev => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  // v11.58 — "Generate new item" handler. POSTs to /api/items/generate (which
  // calls the local llama.cpp LLM at LLAMA_SERVER_URL, then a web image search),
  // then merges the returned item into the runtime ITEMS pool via registerItem()
  // and caches its photo URL in ITEM_IMAGES so the AssetsTab renders it like any
  // other catalogue entry. The async fetch is awaited BEFORE `act` — `act` is
  // synchronous and is only used here to toast the result + persist state. If
  // the route is unreachable (static export / offline), a deterministic toast
  // explains the failure rather than crashing.
  const onGenerate = async () => {
    if (genBusy) return;
    setGenBusy(true);
    let toastMsg: string;
    try {
      const basePath = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) || '';
      const r = await fetch(basePath + '/api/items/generate', { method: 'POST' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const item = await r.json() as ItemDef & { story?: string; image?: string | null; source?: string };
      // Merge into the runtime pool + image cache so the new item shows up in
      // the catalogue immediately and renders with its photo when bought.
      registerItem(item);
      if (item.image) ITEM_IMAGES[item.id] = item.image;
      // v13.2 — if the freshly generated item carries a limited stock cap,
      // initialise the player's per-item stock tracker so buyItem decrements
      // from the correct starting count. Unlimited items (no stock field) are
      // left untouched. registerItem only mutates the global ITEMS pool; the
      // per-player GameState.itemStock lives here.
      if (typeof item.stock === 'number') {
        act(st => { if (st.itemStock[item.id] == null) st.itemStock[item.id] = item.stock!; return null; });
      }
      toastMsg = `✨ ${item.brand ? item.brand + ' ' : ''}${item.name} — ${t('v11.generated', 'added to catalogue', { n: item.cat })}`;
      // Open the item's category in the catalogue so the player sees it land.
      setCurCat(item.cat);
    } catch (e) {
      toastMsg = '✨ ' + t('v11.genFailed', 'Generation failed — is the LLM server running?');
    } finally {
      setGenBusy(false);
    }
    act(() => toastMsg);
  };

  return (
    <>
      {/* v11.58 — LLM-powered "Generate new item" action. Visible across every
          section so the player can summon a fresh asset from anywhere in the
          AssetsTab. Disabled while a request is in flight. */}
      <div className="genbar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button className="ibtn ghost" onClick={onGenerate} disabled={genBusy}
          title={t('v11.genHint', 'Calls the local LLM to invent a new item')}>
          <Ic id="ic-star" className="bsi" />
          <span>{genBusy ? t('v11.genBusy', 'Generating…') : t('v11.genBtn', '✨ Generate new item')}</span>
        </button>
      </div>

      {/* ---- v11.33: 7-section asset menu ---- */}
      <div className="tnav asec" role="tablist" aria-label="Asset sections">
        {secs.map(([k, ic, key, n]) => (
          <button key={k} role="tab" aria-selected={sec === k} onClick={() => setSec(k)}>
            <Ic id={ic} className="si navsi" />{t(key)}{n > 0 ? <span className="asec-n">{n}</span> : null}
          </button>
        ))}
      </div>

      {/* ================= BẤT ĐỘNG SẢN / CAO CẤP / BÌNH DÂN ================= */}
      {sec === 'bds' && groupSec('bds')}
      {sec === 'lux' && groupSec('lux')}
      {sec === 'budget' && groupSec('budget')}

      {/* ================= TÀI SẢN (the collection) ================= */}
      {sec === 'own' && <>
        <div className="grid" style={{ marginBottom: 10 }}>
          <div className="tile" style={{ cursor: 'default' }}>
            <Art id="ic-bag" /><span><b>{s.lots.length + s.used.length}</b><span className="sub" style={{ display: 'block' }}>{t('own.items')}</span></span>
          </div>
          <div className="tile" style={{ cursor: 'default' }}>
            <Art id="t-bank" /><span><b className="num-full">{fmtFull(assetVal(s))}</b><span className="sub" style={{ display: 'block' }}>{t('own.total')}</span></span>
          </div>
          <div className="tile" style={{ cursor: 'default' }}>
            <Art id="ic-up" /><span><b className="num-full">{fmtFull(marketVal(s))}</b><span className="sub" style={{ display: 'block' }}>{t('own.inMarket')}</span></span>
          </div>
        </div>
        {ownAllEmpty ? <p className="sub">{t('own.none')}</p> : <>
          {/* v13.9 — collapsible category headers. Each shows the count + total
              value; rows only render when expanded. Default: collapsed (only
              headers visible) so the section stays compact even with dozens of
              owned items. Tap the header to toggle that one category. */}
          {CAT_GROUPS.map(g => {
            const b = ownBuckets[g.key];
            const count = b.lots.length + b.used.length;
            if (count === 0) return null;
            const expanded = expandedCats.has(g.key);
            return <div key={g.key} className="own-cat" data-expanded={expanded ? 'true' : undefined}>
              <button className="own-cat-header" type="button" onClick={() => toggleCat(g.key)} aria-expanded={expanded}>
                <span className="own-cat-icon" aria-hidden>{g.icon}</span>
                <span className="own-cat-label">{g.label}</span>
                <span className="own-cat-meta">
                  <span className="own-cat-count">{count} {t('items')}</span>
                  <span className="own-cat-total num-full">{fmtFull(b.total)}</span>
                </span>
                <span className="own-cat-toggle" aria-hidden>{expanded ? '▼' : '▶'}</span>
              </button>
              {expanded && <div className="own-cat-body">
                {b.lots.map(({ l, i }) => lotRow(l, i, 'sell'))}
                {b.used.map(({ u, i }) => usedRow(u, i, 'sell'))}
              </div>}
            </div>;
          })}
        </>}
      </>}

      {/* ================= ĐẤU GIÁ & CHỢ ================= */}
      {sec === 'auction' && <>
        <p className="sub">{t('mkt.how', '', { a: AUCTION_DAYS[0] + '–' + AUCTION_DAYS[1], l: LISTING_DAYS[0] + '–' + LISTING_DAYS[1] })}</p>
        {/* ⭐ favourites watchlist */}
        {(s.favs || []).length > 0 && <>
          <h3>⭐ {t('fav.watch')}</h3>
          {(s.favs || []).map(id => {
            const it = ITEM_BY[id]; if (!it) return null;
            const lot = s.lots.find(l => l.id === id);
            const v = lot ? lotValue(s, lot) : it.price;
            const up = s.rareUp?.some(u => u.id === id), live = s.rareLive?.id === id, listed = s.mkt.some(j => ('src' in j.item ? j.item.id : (j.item as { baseId?: string }).baseId) === id);
            return <Row key={id} art={it.art} image={ITEM_IMAGES[id]} right={<button className="ibtn ghost tsmall" onClick={() => act(st => { toggleFav(st, id); return null; })}>{t('fav.remove')}</button>}>
              <b>{it.brand ? <span className="bchip" style={{ background: it.c }}>{it.brand}</span> : null}{it.name}</b>
              <span className="sub">{t('worthNow')} <b>{fmt(v)}</b>{live ? ' · 🔨 ' + t('auction.liveTitle') : up ? ' · 📅 ' + t('auction.sched') : listed ? ' · 🏷 ' + t('mkt.onListing') : ''}</span>
            </Row>;
          })}
        </>}
        {rareSchedBlock()}
        {rareLiveBlock()}
        {s.mkt.length > 0 && <>
          <h3>{t('mkt.active')}</h3>
          {s.mkt.map((j, ji) => {
            const left = Math.max(0, Math.ceil(j.endDay - s.day));
            const chance = Math.round(sellChanceOf(j.rarity, j.kind, Math.max(1, Math.round(j.endDay - j.startDay))) * 100);
            return <Row key={'j' + ji} art={j.art} image={j.img} right={<Btn ic="ic-x" label={t('mkt.withdraw')} kind="danger" onClick={() => act(st => cancelMarketJob(st, ji, t))} />}>
              <b>{j.brand ? <span className="bchip" style={{ background: j.c }}>{j.brand}</span> : null}{j.name} <span className="rarity-chip" data-rarity={j.rarity} style={{ '--rc': RARITY_COLOR[j.rarity] } as React.CSSProperties}>{t('rarity.' + j.rarity)}</span></b>
              <span className="sub">{j.kind === 'auction' ? '🔨 ' + t('mkt.onAuction') : '🏷 ' + t('mkt.onListing')} · {t('mkt.ask')} <b>{fmt(j.ask)}</b></span>
              <span className="mini" style={{ display: 'block', marginTop: 2 }}>
                ⏳ {t('mkt.daysLeft', '', { n: left })} · {j.bids > 0 ? t('mkt.bestBid', '', { x: fmt(j.best) }) + ' · ' : ''}{t('auction.sellChance', '', { n: chance })}
              </span>
            </Row>;
          })}
        </>}
        <h3>🛍 {t('used.title')}</h3>
        <p className="sub">{t('used.sub')}</p>
        <div className="grid">
          {usedShown.length === 0
            ? <span className="sub">{t('used.empty')}</span>
            : usedShown.map(u => {
              const off = Math.max(0, Math.round((1 - u.askPrice / u.newPrice) * 100));
              return <button key={u.id} className="tile used-tile" disabled={s.money < u.askPrice}
                onClick={() => setPendingBuy({ kind: 'used', used: u })}>
                {USED_IMAGES[u.id]
                  ? <img className="tile-photo" src={asset(USED_IMAGES[u.id])} alt={u.name} loading="lazy" />
                  : <Art id={u.art} />}
                <span>
                  <b>{u.brand ? <span className="bchip" style={{ background: u.c }}>{u.brand}</span> : null}{u.name} <span className="rarity-chip" data-rarity={itemRarity(u)} style={{ '--rc': RARITY_COLOR[itemRarity(u)] } as React.CSSProperties}>{t('rarity.' + itemRarity(u))}</span></b>
                  <span className="sub" style={{ display: 'block' }}>
                    <span className="cond-pill" data-cond={condTxtOf(u.condition)}>{t('used.cond')} {u.condition}</span>
                    {' · '}{t('used.age', '', { n: u.ageYears })}
                  </span>
                  <span className="sub" style={{ display: 'block' }}>{t('used.ask')} <b>{fmt(u.askPrice)}</b> · <span className="up">{t('used.discount', '', { n: off })}</span></span>
                </span>
              </button>;
            })}
        </div>
      </>}

      {/* ================= ĐỒ HIẾM (auction-only grails) ================= */}
      {sec === 'rare' && <>
        <p className="sub">{t('rare.sub2')}</p>
        {rareLiveBlock()}
        {rareSchedBlock()}
        <h3>{t('rare.mine')}</h3>
        {rareLots.length === 0 && rareUsed.length === 0 ? <p className="sub">{t('rare.none')}</p> : <>
          {rareLots.map(({ l, i }) => lotRow(l, i, 'sell'))}
          {rareUsed.map(({ u, i }) => usedRow(u, i, 'sell'))}
        </>}
        {/* v13.2 — mythic tier gallery. Surfaces every mythic item currently
            registered in the runtime ITEMS pool (custom/admin items included)
            with the crimson glow chip + the "Only X in the world" counter.
            Players can buy directly from here; sold-out items show an overlay. */}
        {ITEMS.some(i => itemRarity(i) === 'mythic') && <>
          <h3>🌍 {t('rarity.mythic')}</h3>
          <p className="mini" style={{ opacity: .65, marginBottom: 6 }}>{t('rarity.mythicOnlyWorld', '', { n: 10 })}</p>
          <div className="grid">
            {ITEMS.filter(i => itemRarity(i) === 'mythic').map(i => {
              const left = itemStockLeft(s, i.id);
              const soldOut = left === 0;
              return <button key={i.id} className="tile mythic-tile" data-sold-out={soldOut ? 'true' : undefined}
                disabled={soldOut || s.money < i.price}
                onClick={() => setPendingBuy({ kind: 'new', item: i })}>
                {ITEM_IMAGES[i.id]
                  ? <img className="tile-photo" src={asset(ITEM_IMAGES[i.id])} alt={i.name} loading="lazy" />
                  : <Art id={i.art} />}
                {soldOut && <span className="sold-overlay">{t('rarity.soldOut')}</span>}
                <span>
                  <b>{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name} <span className="rarity-chip" data-rarity="mythic" style={{ '--rc': RARITY_COLOR.mythic } as React.CSSProperties}>{t('rarity.mythic')}</span></b>
                  <span className="sub" style={{ display: 'block' }}>{fmt(i.price)}</span>
                  <span className="mini" style={{ display: 'block', color: 'var(--brick)', fontWeight: 700 }}>🌍 {t('rarity.mythicOnlyWorld', '', { n: i.stock ?? 10 })}</span>
                  {left != null && left > 0 && left <= 5 && <span className="stock-low" style={{ marginTop: 4 }}>{t('rarity.onlyLeft', '', { n: left })}</span>}
                </span>
              </button>;
            })}
          </div>
        </>}
        <h3>{t('rare.gallery')}</h3>
        <p className="mini" style={{ opacity: .65, marginBottom: 6 }}>{t('rare.galleryNote')}</p>
        <div className="grid">
          {RARE_ITEMS.map(i => (
            <div key={i.id} className="tile rare-tile" style={{ cursor: 'default' }}>
              {ITEM_IMAGES[i.id]
                ? <img className="tile-photo" src={asset(ITEM_IMAGES[i.id])} alt={i.name} loading="lazy" />
                : <Art id={i.art} />}
              <span>
                <b>{favBtn(i.id)}{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name}</b>
                <span className="sub" style={{ display: 'block' }}>{t('auction.est')}: ~{fmt(i.price)}</span>
                <span className="mini" style={{ display: 'block', color: 'var(--gold)' }}>🔨 {t('rare.only')}</span>
              </span>
            </div>
          ))}
        </div>
      </>}

      {/* ================= WORKSHOP (repair & restore) ================= */}
      {sec === 'workshop' && <>
        <p className="sub">🛠 {t('workshop.skill')}: <b>{repairSkill(s)}</b> · {t('workshop.botchRisk')}</p>
        {repLots.length === 0 && repUsed.length === 0 ? <p className="sub">{t('workshop.allGood')}</p> : <>
          {repLots.map(({ l, i }) => lotRow(l, i, 'workshop'))}
          {repUsed.map(({ u, i }) => usedRow(u, i, 'workshop'))}
        </>}
      </>}

      {curCat && (
        <div className="modal on" onClick={e => { if (e.target === e.currentTarget) setCurCat(null); }}>
          <div className="mcard">
            <div className="mhead"><h2>{t('cat.' + curCat, curCat)}</h2><button className="ibtn ghost" onClick={() => setCurCat(null)}><Ic id="ic-x" className="bsi" /><span>✕</span></button></div>
            <div className="sub" style={{ marginBottom: 8 }}>{ITEMS.filter(i => i.cat === curCat).length} {t('items')}{LIC_FOR[curCat] ? ` · ${t('lic.' + LIC_FOR[curCat], LIC_BY[LIC_FOR[curCat]].name)}${s.lic[LIC_FOR[curCat]] ? ' ✓' : ''}` : (CREW_COST[curCat] ? ` · ${t('v11.crewOptional')}` : '')}</div>
            {ITEMS.filter(i => i.cat === curCat).map(i => {
              const need = LIC_FOR[curCat], locked = need && !s.lic[need];
              const irar = itemRarity(i);
              const crew = CREW_COST[curCat] || 0;
              const crewNow = crew > 0 ? ((curCat === 'Yacht' && s.lic['boat']) || (curCat === 'Private jet' && s.lic['pilot']) ? Math.round(crew / 2) : crew) : 0;
              // v13.2 — limited-stock badge + sold-out disable. itemStockLeft
              // returns null for unlimited items, otherwise the remaining count.
              const left = itemStockLeft(s, i.id);
              const soldOut = left === 0;
              const lowStock = left != null && left > 0 && left <= 5;
              return <Row key={i.id} art={i.art} image={ITEM_IMAGES[i.id]} right={<Btn ic={locked ? 'ic-lock' : 'ic-bag'} label={locked ? t('needLicence') : (soldOut ? t('rarity.soldOut') : fmt(i.price))} disabled={!!locked || soldOut || s.money < i.price} onClick={() => setPendingBuy({ kind: 'new', item: i })} />}>
                <b>{favBtn(i.id)}{i.brand ? <span className="bchip" style={{ background: i.c }}>{i.brand}</span> : null}{i.name} <span className="rarity-chip" data-rarity={irar} style={{ '--rc': RARITY_COLOR[irar] } as React.CSSProperties}>{t('rarity.' + irar)}</span>{irar === 'mythic' && i.stock ? <span className="rarity-chip" data-rarity="mythic" style={{ '--rc': RARITY_COLOR.mythic } as React.CSSProperties}>{t('rarity.mythicOnlyWorld', '', { n: i.stock })}</span> : null}{lowStock ? <span className="stock-low">{t('rarity.onlyLeft', '', { n: left })}</span> : null}{soldOut ? <span className="stock-sold">{t('rarity.soldOut')}</span> : null}</b>
                <span className="sub">+{i.lux} {t('status')} · {t('loses', '', { n: (Math.abs(Math.min(i.rate, ASSET_DEPRECIATION_RATE)) * 100).toFixed(0) })} · {t('upkeep')} {fmt(i.price * 0.02)}{t('perYear')}</span>
                {crew > 0 && <span className="mini" style={{ display: 'block', marginTop: 2 }}>{t('v11.crewCost', '', { x: fmt(crewNow) })}{crewNow < crew ? ` (${t('v11.crewHalved')})` : ''}</span>}
              </Row>;
            })}
          </div>
        </div>
      )}
      {pendingBuy && <PurchaseConfirm s={s} pending={pendingBuy} onConfirm={() => {
        act(st => {
          if (pendingBuy.kind === 'new') return buyItem(st, pendingBuy.item.id);
          return buyUsedItem(st, pendingBuy.used);
        });
        setPendingBuy(null);
      }} onCancel={() => setPendingBuy(null)} />}
    </>
  );
}
