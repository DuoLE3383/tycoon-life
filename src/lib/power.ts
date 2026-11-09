// ================= v11.3 — POWER & INFLUENCE =================
// A new tier system on top of net worth. Beyond money, the player accrues
// political and social capital — `influence` — that unlocks a power ladder
// from industry mogul to state leader. Influence comes from charity, club
// chairmanship, board seats, and media ownership; it has diminishing
// returns so the first 100 is much easier than the next 100.
//
// This module is TYPE-ONLY dependent on engine.ts (GameState). All helpers
// that need engine internals (netWorth, worldYear, pushLog) accept those
// values as arguments so there is no runtime circular import — engine.ts
// computes the values and calls in.

import type { GameState } from './engine';

// v11.3 — four power tiers, unlocked by net worth. Each tier gates a
// different scale of action (lobby → board → election → state).
//   industry_mogul  — $10M+   : lobby industry policy, sit on boards
//   influencer     — $100M+  : large platform, can swing public opinion
//   national_power — $1B+    : run for national office, endow foundations
//   state_leader   — $10B+   : the late-game stretch goal — head of state
//                              (only the very richest runs ever reach here)
export type PowerTier = 'none' | 'industry_mogul' | 'influencer' | 'national_power' | 'state_leader';
export const POWER_TIERS: { tier: PowerTier; min: number; label: string; en: string; vi: string; zh: string }[] = [
  { tier: 'none', min: 0, label: '—', en: 'Private citizen', vi: 'Công dân bình thường', zh: '普通公民' },
  { tier: 'industry_mogul', min: 10_000_000, label: 'Industry mogul', en: 'Industry mogul', vi: 'Trùm ngành', zh: '行业大亨' },
  { tier: 'influencer', min: 100_000_000, label: 'Influencer', en: 'Influencer', vi: 'Người ảnh hưởng', zh: '影响力人物' },
  { tier: 'national_power', min: 1_000_000_000, label: 'National power', en: 'National power', vi: 'Quyền lực quốc gia', zh: '国家权力' },
  { tier: 'state_leader', min: 10_000_000_000, label: 'State leader', en: 'State leader', vi: 'Lãnh đạo quốc gia', zh: '国家领导人' },
];

// Compute the highest tier the player's net worth currently qualifies for.
// `nw` is passed in by the caller (engine.ts has netWorth(); we keep this
// module free of engine-runtime imports).
export function powerTierOfNw(nw: number): PowerTier {
  let t: PowerTier = 'none';
  for (const r of POWER_TIERS) if (nw >= r.min) t = r.tier;
  return t;
}

// Convenience: take GameState, look up netWorth. Used by the React layer
// (page.tsx) which already imports netWorth from engine. Avoids duplicating
// the lookup logic. Falls back to s.money if the engine import isn't
// available — kept here as a defensive default; callers should pass nw.
export function powerTierOf(s: GameState): PowerTier {
  // Inline net-worth to avoid the circular import. Mirrors netWorth() in
  // engine.ts but only reads fields; matches because GameState shape is
  // stable. (When the engine's netWorth grows new terms, update here too.)
  const stk = Object.keys(s.stk).reduce((a, k) => a + (s.stk[k] || 0) * (s.prices[k] || 0), 0);
  const lots = s.lots.reduce((a, l) => a + (l.paid || 0), 0);
  const biz = Object.entries(s.branches).reduce((a, [id, list]) =>
    a + list.reduce((b, br) => b + (br.paid || 0), 0), 0);
  const nw = s.money + stk + lots + biz + (s.bank.dep || 0) - (s.bank.loan || 0);
  return powerTierOfNw(nw);
}

// Tier index (0..4) — handy for arithmetic and table lookups.
export const powerTierIdx = (s: GameState): number =>
  POWER_TIERS.findIndex(r => r.tier === powerTierOf(s));

// The next tier above the current one, with the threshold to reach it.
// Returns null if the player is already at state_leader (top tier).
export function nextTierOf(s: GameState): { tier: PowerTier; min: number; label: string } | null {
  const cur = powerTierIdx(s);
  if (cur < 0 || cur >= POWER_TIERS.length - 1) return null;
  const next = POWER_TIERS[cur + 1];
  return { tier: next.tier, min: next.min, label: next.label };
}

// v11.3 — PowerState lives on GameState. Once unlocked, the player keeps
// the tier even if net worth later drops below the threshold (they remain
// a known figure). Influence has diminishing returns so it accumulates
// slowly at the top. Scrutiny rises with power and is reduced by
// transparency measures (v11.4 will wire elections + the scrutiny model
// fully; v11.3 only stores the field).
export interface PowerState {
  unlockedTier: PowerTier;     // highest tier ever reached
  unlockedAtDay: number;       // when each new tier was first reached
  influence: number;            // accumulated social/political capital
  influenceLog: { source: string; amount: number; day: number }[]; // last 20
  scrutiny: number;             // 0..100 — attention from press/auditors
  transparency: number;         // 0..100 — counter-measures
  // v11.3 — optional permanent multipliers set by advocacy actions.
  // `boardNomineeBiz` makes bizMultiplier stack +10% on top of everything;
  // `foundationMult` lifts all influence gains by +20%.
  boardNomineeBiz?: number;
  foundationMult?: number;
}

export function freshPower(): PowerState {
  return {
    unlockedTier: 'none', unlockedAtDay: 0,
    influence: 0, influenceLog: [],
    scrutiny: 0, transparency: 0,
  };
}

// v11.3 — Influence sources. Each source grants a base amount per
// triggering action; the actual gain is multiplied by the diminishing-
// returns factor below. Sources are tagged so the log + UI can show
// "from charity" / "from club chair" / etc.
export type InfluenceSource = 'charity' | 'clubChair' | 'boardSeat' | 'mediaOwnership' | 'electionWin' | 'advocacy';
export const INFLUENCE_SOURCE_LABELS: Record<InfluenceSource, { en: string; vi: string; zh: string }> = {
  charity: { en: 'Charity', vi: 'Từ thiện', zh: '慈善' },
  clubChair: { en: 'Club chair', vi: 'Chủ tịch CLB', zh: '俱乐部主席' },
  boardSeat: { en: 'Board seat', vi: 'Ghế hội đồng', zh: '董事会席位' },
  mediaOwnership: { en: 'Media ownership', vi: 'Sở hữu truyền thông', zh: '媒体所有权' },
  electionWin: { en: 'Election win', vi: 'Trúng cử', zh: '选举获胜' },
  advocacy: { en: 'Advocacy', vi: 'Vận động', zh: '倡导' },
};

// Diminishing returns. The first 100 influence is full-credit; at 500
// already-cut in half; at 2000 nearly capped. Curve: 1 / (1 + sqrt(I/100)).
//   I=0    → mult 1.00
//   I=100  → mult 1 / (1 + 1) = 0.5
//   I=400  → mult 1 / (1 + 2) = 0.33
//   I=2500 → mult 1 / (1 + 5) = 0.17
// Player who really wants to push past 1000 influence must grind a lot
// of charity/club activity — keeps late-game progression meaningful
// without making it trivially exponential.
export const influenceGainMult = (currentInfluence: number) =>
  1 / (1 + Math.sqrt(Math.max(0, currentInfluence) / 100));

// Apply a gain: actual = base * mult, rounded. Logs the source.
// Mutates s.power. Returns the actual amount granted (for UI feedback).
// If the player has the foundationMult flag (+20% from endowFoundation),
// it's applied on top.
export function addInfluence(s: GameState, base: number, source: InfluenceSource): number {
  if (!s.power || base <= 0) return 0;
  const foundationMult = s.power.foundationMult || 1;
  const mult = influenceGainMult(s.power.influence) * foundationMult;
  const gain = Math.max(1, Math.round(base * mult));
  s.power.influence += gain;
  s.power.influenceLog.push({ source, amount: gain, day: s.lastDay });
  if (s.power.influenceLog.length > 20) s.power.influenceLog.shift();
  return gain;
}

// Spend influence. Returns true if the player had enough and the spend
// went through. Actions that cost influence: lobby policy, advocate
// regulation, propose a board candidate, run for office (v11.4 will
// wire the actual action buttons).
export function spendInfluence(s: GameState, cost: number): boolean {
  if (!s.power || s.power.influence < cost) return false;
  s.power.influence -= cost;
  return true;
}

// v11.3 — charity → influence. Base rate: 1 influence per $10K donated.
// Multiplied by the diminishing-returns factor (so donating when you
// already have 500 influence yields less than the first donation).
// Called from donate() in engine.ts. Returns the BASE amount (before
// the mult); engine.ts calls addInfluence() to apply the mult + log.
export function influenceFromCharity(amt: number): number {
  return Math.floor(amt / 10000);
}

// v11.3 — club chair passive. Player who founded their own club gains
// a small passive influence per year (5 base, * mult). Called from
// yearEnd() in engine.ts. Returns the BASE amount (before mult).
// Each additional club joined beyond the founded one adds +1 to the
// base, capped at 10 (avoids runaway from joining every club).
export function influenceFromClubChair(s: GameState): number {
  if (!s.ownClub) return 0;
  const extraClubs = Math.min(10, Math.max(0, s.clubs.length - 1));
  return 5 + extraClubs;
}

// v11.3 — board seat passive. Player who sits on a board (ownClub counts
// as one seat; each additional club joined counts as a half-seat since
// you're a member not the chair). 3/seat/year base. Called from yearEnd.
export function influenceFromBoardSeat(s: GameState): number {
  const founded = s.ownClub ? 1 : 0;
  const member = Math.max(0, s.clubs.length - (s.ownClub ? 1 : 0));
  return 3 * founded + Math.floor(1.5 * member);
}

// v11.3 — media ownership passive. Player who owns a Film studio OR has
// a verified social account with >1M followers counts as a media owner.
// 10/year base. Called from yearEnd.
export function influenceFromMediaOwnership(s: GameState): number {
  let n = 0;
  // Film studio branch counts (engine.ts uses biz id 'film' for it)
  const hasFilmStudio = (s.branches['film'] || []).length > 0;
  if (hasFilmStudio) n += 1;
  // Verified social with massive following
  if (s.social.verified && s.social.followers >= 1_000_000) n += 1;
  return n * 10;
}

// v11.3 — the yearEnd passive influence tick. Sums all passive sources
// and grants them once per game year, with the diminishing-returns factor
// baked into addInfluence. Returns the total influence granted (engine.ts
// logs a single summary line via the returned number).
export function tickPassiveInfluence(s: GameState): number {
  if (!s.power) return 0;
  let total = 0;
  const club = influenceFromClubChair(s);
  if (club > 0) total += addInfluence(s, club, 'clubChair');
  const board = influenceFromBoardSeat(s);
  if (board > 0) total += addInfluence(s, board, 'boardSeat');
  const media = influenceFromMediaOwnership(s);
  if (media > 0) total += addInfluence(s, media, 'mediaOwnership');
  return total;
}

// v11.3 — check tier promotion. Returns the new tier if the player's net
// worth crossed a new threshold, else null. Does NOT log — engine.ts
// logs so we keep this pure-ish (only mutates s.power.unlockedTier).
export function tickTierPromotion(s: GameState, nw: number): PowerTier | null {
  if (!s.power) return null;
  const current = powerTierOfNw(nw);
  const curIdx = POWER_TIERS.findIndex(r => r.tier === current);
  const unlockedIdx = POWER_TIERS.findIndex(r => r.tier === s.power.unlockedTier);
  if (curIdx > unlockedIdx) {
    s.power.unlockedTier = current;
    s.power.unlockedAtDay = s.lastDay;
    return current;
  }
  return null;
}

// v11.3 — yearly power tick. Engine.ts calls this from yearEnd() with the
// precomputed net worth (engine already has it). Combines passive
// influence + tier-promotion check. Kept here so engine.ts stays thin.
export function tickPower(s: GameState, nw: number): { promotedTo: PowerTier | null; influenceGained: number } {
  const promotedTo = tickTierPromotion(s, nw);
  const influenceGained = tickPassiveInfluence(s);
  return { promotedTo, influenceGained };
}

// v11.3 — influence-buyable advocacy actions. v11.3 wires three:
// `industryPolicy` (lobby), `boardNominee` (board seat), `endowFoundation`
// (national tier). v11.4 will add elections + more advocacy actions.
export interface AdvocacyAction {
  id: string;
  label: { en: string; vi: string; zh: string };
  cost: number;             // base influence cost
  minTier: PowerTier;       // tier required to take this action
  desc: { en: string; vi: string; zh: string };
}

export const ADVOCACY_ACTIONS: AdvocacyAction[] = [
  {
    id: 'industryPolicy',
    label: { en: 'Lobby industry policy', vi: 'Vận động chính sách ngành', zh: '游说行业政策' },
    cost: 25,
    minTier: 'industry_mogul',
    desc: {
      en: 'Push a regulation that boosts your largest industry\'s income by 5% for one year.',
      vi: 'Đẩy một quy định tăng 5% thu nhập ngành lớn nhất của bạn trong 1 năm.',
      zh: '推动一项让你的最大产业年收入+5%（持续一年）的法规。',
    },
  },
  {
    id: 'boardNominee',
    label: { en: 'Place a board nominee', vi: 'Đưa người vào hội đồng', zh: '安插董事会人选' },
    cost: 60,
    minTier: 'influencer',
    desc: {
      en: 'Plant an ally on a friendly company\'s board — permanent +10% to that industry\'s income.',
      vi: 'Cài người vào hội đồng một công ty thân thiện — +10% vĩnh viễn cho thu nhập ngành đó.',
      zh: '在一家友好公司的董事会安插盟友 — 永久+10%该行业收入。',
    },
  },
  {
    id: 'endowFoundation',
    label: { en: 'Endow a foundation', vi: 'Thành lập quỹ hiến tặng', zh: '设立基金会' },
    cost: 120,
    minTier: 'national_power',
    desc: {
      en: 'Found a policy foundation — permanent +20% influence gain from all sources.',
      vi: 'Thành lập quỹ chính sách — +20% vĩnh viễn cho mọi nguồn influence.',
      zh: '设立政策基金会 — 永久+20%所有来源的影响力收益。',
    },
  },
];

// Apply an advocacy action. Returns 'ok' on success, or a reason string.
// v11.3 wires only the side-effects that don't need elections.
// `year` is the current game year (passed in to avoid the engine import).
export function doAdvocacy(s: GameState, id: string, year: number): { ok: boolean; reason?: string; effect?: string } {
  if (!s.power) return { ok: false, reason: 'noPower' };
  const a = ADVOCACY_ACTIONS.find(x => x.id === id);
  if (!a) return { ok: false, reason: 'unknown' };
  const tierIdx = POWER_TIERS.findIndex(r => r.tier === powerTierOf(s));
  const reqIdx = POWER_TIERS.findIndex(r => r.tier === a.minTier);
  if (tierIdx < reqIdx) return { ok: false, reason: 'wrongTier' };
  if (!spendInfluence(s, a.cost)) return { ok: false, reason: 'noInfluence' };
  // Apply effect
  if (id === 'industryPolicy') {
    // +5% to largest industry for 1 year — store via crisis-like flag.
    // For v11.3 we keep it simple: add a yearly `advocacyBiz` modifier.
    // Implemented as a crisis entry with biz 1.05, lasts 1 year, no risk/demand.
    s.crisis = {
      cause: 'Industry-friendly regulation (lobby)',
      biz: 1.05, fac: 1, rates: 1, risk: 0, demand: 1,
      yearsLeft: 1, startYear: year,
    };
    return { ok: true, effect: 'industryPolicy' };
  }
  if (id === 'boardNominee') {
    s.power.boardNomineeBiz = 1.10;
    return { ok: true, effect: 'boardNominee' };
  }
  if (id === 'endowFoundation') {
    s.power.foundationMult = 1.20;
    return { ok: true, effect: 'endowFoundation' };
  }
  return { ok: false, reason: 'unknown' };
}
