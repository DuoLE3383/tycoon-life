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
  // v11.4 — election results. Each nation tracks the player's last result.
  //   status: 'never' | 'running' | 'won' | 'lost' | 'recalled'
  //   year: when the most recent election was held
  //   opponent: NPC name
  //   margin: percentage margin (negative = lost)
  //   termEnds: game-day the term expires (next election allowed)
  elections: Record<string, {
    status: 'never' | 'running' | 'won' | 'lost' | 'recalled';
    year: number;
    opponent: string;
    margin: number;
    termEnds: number;
  }>;
  // v11.4 — alliances with leaderboard bots. Each entry: bot name +
  // strength 0..100 (decays by ~5/year unless refreshed). Alliances
  // give +5% election margin per point of strength (capped at +25%).
  alliances: { bot: string; strength: number; formedDay: number }[];
  // v11.4 — rivals the player has made (lowered by transparency).
  // Each entry: bot name + hostility 0..100. Rivals apply −5% election
  // margin per point of hostility (capped at −25%) and can launch
  // smear campaigns that bump scrutiny.
  rivals: { bot: string; hostility: number; }[];
  // v11.4 — ending flag, set at game over based on power + scrutiny.
  // null until game over.
  ending: 'sustainable' | 'respected' | 'overthrown' | 'reclusive' | null;
}

export function freshPower(): PowerState {
  return {
    unlockedTier: 'none', unlockedAtDay: 0,
    influence: 0, influenceLog: [],
    scrutiny: 0, transparency: 0,
    elections: {},
    alliances: [],
    rivals: [],
    ending: null,
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

// ================= v11.4 — Elections + Scrutiny =================
// Elections: a nation-level contest against an NPC opponent. Common
// parameters across the 12 nations; opponent is a generated NPC; result
// is influenced by player's power tier, influence, alliances, rivals,
// and a randomness factor (±10%). Required tier: national_power ($1B).
//
// Scrutiny: rises with power (industry_mogul → +2/yr, influencer → +4,
// national_power → +7, state_leader → +10) and adds extra for high
// influence (>500 → +3/yr) or scandal events. Reduced by transparency
// measures: independent board (+5/yr), disclosure reports (+8/yr),
// accepting risk caps scrutiny at 100 but doubles the chance of a
// scandal event. At scrutiny ≥80, election margin takes a −10% hit;
// at ≥95 the player cannot run again until scrutiny drops.
//
// 4 endings at game over (computed from power + scrutiny + elections):
//   sustainable — state_leader, scrutiny <50, won election
//   respected  — national_power+ AND scrutiny <70 AND won election
//   overthrown — scrutiny ≥80 OR recalled by election
//   reclusive  — never unlocked a power tier (stayed 'none')

// v11.4 — election parameters per nation. 12 nations use a common
// framework; each has a baseline difficulty (opponent strength),
// turnout (randomness amplitude), and term length (years). All values
// are tunable; the formula is uniform so the player can map strategies
// across nations.
export interface ElectionParams {
  nation: string;
  opponentStrength: number;  // base opponent score 0..100 (higher = harder)
  randomness: number;         // ±% margin swing (10 = ±10%)
  termLength: number;         // years per term before re-election needed
  minTier: PowerTier;        // tier required to run (default national_power)
}
export const ELECTION_PARAMS: ElectionParams[] = [
  { nation: 'Vietnam', opponentStrength: 60, randomness: 10, termLength: 5, minTier: 'national_power' },
  { nation: 'United States', opponentStrength: 70, randomness: 15, termLength: 4, minTier: 'national_power' },
  { nation: 'United Kingdom', opponentStrength: 65, randomness: 12, termLength: 5, minTier: 'national_power' },
  { nation: 'Japan', opponentStrength: 60, randomness: 10, termLength: 4, minTier: 'national_power' },
  { nation: 'South Korea', opponentStrength: 62, randomness: 12, termLength: 5, minTier: 'national_power' },
  { nation: 'France', opponentStrength: 64, randomness: 13, termLength: 5, minTier: 'national_power' },
  { nation: 'Germany', opponentStrength: 58, randomness: 8, termLength: 4, minTier: 'national_power' },
  { nation: 'Brazil', opponentStrength: 66, randomness: 15, termLength: 4, minTier: 'national_power' },
  { nation: 'Nigeria', opponentStrength: 68, randomness: 14, termLength: 4, minTier: 'national_power' },
  { nation: 'India', opponentStrength: 67, randomness: 13, termLength: 5, minTier: 'national_power' },
  { nation: 'Australia', opponentStrength: 60, randomness: 10, termLength: 3, minTier: 'national_power' },
  { nation: 'Canada', opponentStrength: 60, randomness: 10, termLength: 4, minTier: 'national_power' },
];
export const electionParamsFor = (nation: string): ElectionParams | null =>
  ELECTION_PARAMS.find(p => p.nation === nation) || null;

// v11.4 — generate an NPC opponent for the player's nation. Uses the
// BOTS roster (top-by-net-worth of same nation, falling back to a
// generated name). The opponent's `personalStrength` is the bot's
// baseline strength × a random factor 0.8..1.2.
export function generateOpponent(s: GameState, rng: () => number = Math.random, bots: { name: string; nation: string; nw: number }[]): { name: string; personalStrength: number } {
  const same = bots.filter(b => b.nation === s.nation);
  if (same.length > 0) {
    const top = [...same].sort((a, b) => b.nw - a.nw)[0];
    return { name: top.name, personalStrength: 50 * (0.8 + rng() * 0.4) };
  }
  // Fallback: a generated name (no bot pool for this nation)
  const pool = ['Minh Tran', 'Sofia Rossi', 'Alex Chen', 'Yuki Tanaka', 'Grace Taylor'];
  const name = pool[Math.floor(rng() * pool.length)];
  return { name, personalStrength: 50 * (0.8 + rng() * 0.4) };
}

// v11.4 — compute the player's effective election margin. Combines:
//   + influence bonus: min(influence / 10, 25) — capped at +25
//   + alliance bonus: sum of alliance strengths × 0.5, capped at +25
//   − rival penalty: sum of rival hostilities × 0.5, capped at −25
//   − scrutiny penalty: 0 if scrutiny<80, else (scrutiny-80) * 0.5 (so 90 → −5)
//   − opponent strength: scaled (50 → 0; 100 → −25)
//   ± randomness: ±ElectionParams.randomness
// Margin > 0 wins; < 0 loses. (No base 50; the bonuses swing around zero.)
export function electionMargin(s: GameState, opponentStrength: number, randomness: number, rng: () => number = Math.random): number {
  const influence = s.power?.influence || 0;
  const influenceBonus = Math.min(influence / 10, 25);
  const allianceBonus = Math.min(
    (s.power?.alliances || []).reduce((a, b) => a + b.strength * 0.5, 0),
    25
  );
  const rivalPenalty = Math.max(
    -25,
    -(s.power?.rivals || []).reduce((a, b) => a + b.hostility * 0.5, 0)
  );
  const scrutiny = s.power?.scrutiny || 0;
  const scrutinyPenalty = scrutiny < 80 ? 0 : -(scrutiny - 80) * 0.5;
  // Opponent strength: 50 → 0 penalty; 100 → -25 penalty; linear between
  const opponentPenalty = -((opponentStrength - 50) / 50) * 25;
  const noise = (rng() - 0.5) * 2 * randomness;
  return influenceBonus + allianceBonus + rivalPenalty + scrutinyPenalty + opponentPenalty + noise;
}

// v11.4 — run an election. Player must be at national_power (or higher),
// must not be currently serving a term (termEnds > lastDay), and must
// have ≥80 influence to spend on the campaign (the campaign cost).
// Returns the result; mutates s.power.elections[nation] + s.power.influence.
export function runElection(
  s: GameState,
  rng: () => number = Math.random,
  bots: { name: string; nation: string; nw: number }[] = [],
  year: number
): { ok: boolean; reason?: string; result?: 'won' | 'lost'; margin?: number; opponent?: string } {
  if (!s.power) return { ok: false, reason: 'noPower' };
  const tier = powerTierOf(s);
  const tierIdx = POWER_TIERS.findIndex(r => r.tier === tier);
  const reqIdx = POWER_TIERS.findIndex(r => r.tier === 'national_power');
  if (tierIdx < reqIdx) return { ok: false, reason: 'wrongTier' };
  const params = electionParamsFor(s.nation);
  if (!params) return { ok: false, reason: 'noNation' };
  // Check term
  const prev = s.power.elections[s.nation];
  if (prev && prev.termEnds > s.lastDay && (prev.status === 'won')) {
    return { ok: false, reason: 'termActive' };
  }
  // Check scrutiny cap
  if ((s.power.scrutiny || 0) >= 95) return { ok: false, reason: 'scrutinyTooHigh' };
  // Influence campaign cost
  if (s.power.influence < 80) return { ok: false, reason: 'noInfluence' };
  s.power.influence -= 80;
  const opponent = generateOpponent(s, rng, bots);
  const margin = electionMargin(s, opponent.personalStrength, params.randomness, rng);
  const won = margin > 0;
  const termLengthDays = params.termLength * 365;
  s.power.elections[s.nation] = {
    status: won ? 'won' : 'lost',
    year,
    opponent: opponent.name,
    margin: Math.round(margin * 10) / 10,
    termEnds: won ? s.lastDay + termLengthDays : 0,
  };
  if (won) {
    addInfluence(s, 50, 'electionWin');
    // Winning raises scrutiny by +15
    s.power.scrutiny = Math.min(100, s.power.scrutiny + 15);
  } else {
    // Losing raises scrutiny by +5 (the press digs in)
    s.power.scrutiny = Math.min(100, s.power.scrutiny + 5);
  }
  return { ok: true, result: won ? 'won' : 'lost', margin: Math.round(margin * 10) / 10, opponent: opponent.name };
}

// v11.4 — yearly scrutiny tick. Called from yearEnd(). Power-level-driven
// base rise, plus high-influence scrutiny, minus transparency measures.
// Caps at 100.
export function tickScrutiny(s: GameState): number {
  if (!s.power) return 0;
  const tier = powerTierOf(s);
  let rise = 0;
  if (tier === 'industry_mogul') rise = 2;
  else if (tier === 'influencer') rise = 4;
  else if (tier === 'national_power') rise = 7;
  else if (tier === 'state_leader') rise = 10;
  // Extra: influence >500 → +3/yr (you attract more attention)
  if ((s.power.influence || 0) > 500) rise += 3;
  // Counter: transparency measures (independent board, disclosure)
  // Each point of transparency reduces scrutiny rise by 0.5 (max 100*0.5=50)
  const trans = s.power.transparency || 0;
  rise -= trans * 0.5;
  // Floor at 0 (transparency cannot make scrutiny negative)
  rise = Math.max(0, rise);
  s.power.scrutiny = Math.max(0, Math.min(100, s.power.scrutiny + rise));
  return rise;
}

// v11.4 — transparency measures the player can buy with influence.
// Each bumps s.power.transparency by N points (cap 100).
export const TRANSPARENCY_ACTIONS: { id: string; label: { en: string; vi: string; zh: string }; cost: number; bump: number; desc: { en: string; vi: string; zh: string } }[] = [
  {
    id: 'independentBoard',
    label: { en: 'Independent board', vi: 'Hội đồng độc lập', zh: '独立董事会' },
    cost: 40,
    bump: 20,
    desc: {
      en: 'Bring in outside directors who watch the books. +20 transparency.',
      vi: 'Đưa giám đốc ngoài vào theo dõi sổ sách. +20 minh bạch.',
      zh: '引入外部董事监督账目。+20透明度。',
    },
  },
  {
    id: 'disclosureReports',
    label: { en: 'Disclosure reports', vi: 'Báo cáo công khai', zh: '公开披露报告' },
    cost: 30,
    bump: 15,
    desc: {
      en: 'Publish quarterly financial + lobbying reports. +15 transparency.',
      vi: 'Công bố báo cáo tài chính + vận động hàng quý. +15 minh bạch.',
      zh: '发布季度财务+游说报告。+15透明度。',
    },
  },
  {
    id: 'acceptRisk',
    label: { en: 'Accept the risk', vi: 'Chấp nhận rủi ro', zh: '接受风险' },
    cost: 0,
    bump: 0,
    desc: {
      en: 'No counter-measures — scrutiny caps at 100 but scandal chance doubles.',
      vi: 'Không phòng vệ — scrutiny giữ 100, rủi ro scandal ×2.',
      zh: '不设防 — 审查度上限100但丑闻几率翻倍。',
    },
  },
];

export function doTransparency(s: GameState, id: string): { ok: boolean; reason?: string; effect?: string } {
  if (!s.power) return { ok: false, reason: 'noPower' };
  const a = TRANSPARENCY_ACTIONS.find(x => x.id === id);
  if (!a) return { ok: false, reason: 'unknown' };
  if (id === 'acceptRisk') {
    // Free action: marks player as risk-acceptor (no bump). Engine/UI
    // can read s.power.transparency (low) and apply doubled scandal rate.
    return { ok: true, effect: 'acceptRisk' };
  }
  if (!spendInfluence(s, a.cost)) return { ok: false, reason: 'noInfluence' };
  s.power.transparency = Math.min(100, s.power.transparency + a.bump);
  return { ok: true, effect: id };
}

// v11.4 — alliance/rival management. Player can offer an alliance to a
// leaderboard bot (forms or strengthens an alliance; strength starts at
// 30, decays −5/year) OR break with a bot (turns a former ally into a
// rival, hostility starts at 50). Returns success/failure.
export function offerAlliance(s: GameState, bot: string): { ok: boolean; reason?: string } {
  if (!s.power) return { ok: false, reason: 'noPower' };
  if (s.power.influence < 20) return { ok: false, reason: 'noInfluence' };
  const existing = s.power.alliances.find(a => a.bot === bot);
  if (existing) {
    // Refresh: +20 strength (cap 100), costs 20 influence
    if (s.power.influence < 20) return { ok: false, reason: 'noInfluence' };
    s.power.influence -= 20;
    existing.strength = Math.min(100, existing.strength + 20);
    return { ok: true };
  }
  s.power.influence -= 20;
  s.power.alliances.push({ bot, strength: 30, formedDay: s.lastDay });
  // Remove from rivals if present (you wouldn't ally a hostile)
  s.power.rivals = s.power.rivals.filter(r => r.bot !== bot);
  return { ok: true };
}

export function breakWith(s: GameState, bot: string): { ok: boolean; reason?: string } {
  if (!s.power) return { ok: false, reason: 'noPower' };
  const ally = s.power.alliances.find(a => a.bot === bot);
  if (ally) {
    s.power.alliances = s.power.alliances.filter(a => a.bot !== bot);
    s.power.rivals.push({ bot, hostility: 50 });
    return { ok: true };
  }
  // If already a rival, just bump hostility by +20
  const rival = s.power.rivals.find(r => r.bot === bot);
  if (rival) {
    rival.hostility = Math.min(100, rival.hostility + 20);
    return { ok: true };
  }
  // Else: cost 10 influence to declare a new rival
  if (s.power.influence < 10) return { ok: false, reason: 'noInfluence' };
  s.power.influence -= 10;
  s.power.rivals.push({ bot, hostility: 30 });
  return { ok: true };
}

// v11.4 — yearly alliance/rival decay tick. Alliances lose 5 strength
// per year unless refreshed; rivals lose 3 hostility per year (grudges
// fade). Returns nothing — purely a state update.
export function tickAlliancesRivals(s: GameState): void {
  if (!s.power) return;
  for (const a of s.power.alliances) {
    a.strength = Math.max(0, a.strength - 5);
  }
  for (const r of s.power.rivals) {
    r.hostility = Math.max(0, r.hostility - 3);
  }
  // Drop empty alliances / rivals
  s.power.alliances = s.power.alliances.filter(a => a.strength > 0);
  s.power.rivals = s.power.rivals.filter(r => r.hostility > 0);
}

// v11.4 — scandal event. Random chance per year (scaled by scrutiny:
// 5% at scrutiny 0, ~30% at scrutiny 100). If hit, costs cash + raises
// rivals' hostility + bumps scrutiny by +10. Returns true if a scandal
// fired this year.
export function rollScandal(s: GameState, rng: () => number = Math.random, acceptRisk: boolean = false): boolean {
  if (!s.power) return false;
  const scrutiny = s.power.scrutiny || 0;
  const baseChance = (scrutiny / 100) * 0.30; // 0..30%
  const chance = acceptRisk ? baseChance * 2 : baseChance;
  if (rng() >= chance) return false;
  // Scandal fires: scrutiny +10, all rivals +15 hostility, lose 5 influence
  s.power.scrutiny = Math.min(100, s.power.scrutiny + 10);
  for (const r of s.power.rivals) r.hostility = Math.min(100, r.hostility + 15);
  s.power.influence = Math.max(0, s.power.influence - 5);
  return true;
}

// v11.4 — compute the player's ending at game over. Based on:
//   - power tier reached (unlockedTier)
//   - scrutiny at game over
//   - election history (won any? recalled?)
// Returns one of 'sustainable' | 'respected' | 'overthrown' | 'reclusive'.
export function computeEnding(s: GameState): 'sustainable' | 'respected' | 'overthrown' | 'reclusive' {
  if (!s.power) return 'reclusive';
  const tier = s.power.unlockedTier;
  if (tier === 'none') return 'reclusive';
  const scrutiny = s.power.scrutiny || 0;
  // Overthrown if scrutiny≥80 OR recalled (any election with status 'recalled')
  const recalled = Object.values(s.power.elections).some(e => e.status === 'recalled');
  if (scrutiny >= 80 || recalled) return 'overthrown';
  // Sustainable: state_leader + won election + scrutiny <50
  const wonAny = Object.values(s.power.elections).some(e => e.status === 'won');
  if (tier === 'state_leader' && wonAny && scrutiny < 50) return 'sustainable';
  // Respected: national_power+ AND wonAny AND scrutiny <70
  const tierIdx = POWER_TIERS.findIndex(r => r.tier === tier);
  const natIdx = POWER_TIERS.findIndex(r => r.tier === 'national_power');
  if (tierIdx >= natIdx && wonAny && scrutiny < 70) return 'respected';
  // Default for a player who reached a tier but didn't win an election:
  // they stayed reclusive (private citizen-equivalent in retirement).
  return 'reclusive';
}

// v11.4 — yearly power tick (v11.3 was just promotion + passive
// influence; v11.4 adds scrutiny + alliance/rival decay + scandal).
// Engine.ts calls this from yearEnd() with the precomputed net worth.
export function tickPowerV11_4(s: GameState, nw: number, rng: () => number = Math.random): {
  promotedTo: PowerTier | null;
  influenceGained: number;
  scrutinyRise: number;
  scandal: boolean;
} {
  // Reuse the v11.3 promotion + passive influence
  const promotedTo = tickTierPromotion(s, nw);
  const influenceGained = tickPassiveInfluence(s);
  // v11.4 additions
  const scrutinyRise = tickScrutiny(s);
  tickAlliancesRivals(s);
  const acceptRisk = (s.power.transparency || 0) === 0 && (s.power.scrutiny || 0) >= 80;
  const scandal = rollScandal(s, rng, acceptRisk);
  return { promotedTo, influenceGained, scrutinyRise, scandal };
}

