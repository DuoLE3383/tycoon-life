// ================= v11.5 — From Empire to Galactic Federation =================
// Five entity tiers, climbed strictly one at a time (no skipping). Each
// tier is a major shift: conglomerate → autonomous territory → independent
// nation → interstellar empire → galactic federation. To step up the
// player must clear a threshold (net worth + power tier + recognition by
// other entities).
//
// This module is TYPE-ONLY dependent on engine.ts (GameState). All helpers
// that need engine internals (netWorth, worldYear, pushLog) accept those
// values as arguments so there is no runtime circular import.

import type { GameState } from './engine';
import type { PowerTier } from './power';

// v11.5 — five entity tiers, each represents a category of political
// organisation the player can build. Tier 1 is the default (you start
// as a private conglomerate). To step up requires meeting a threshold:
//   conglomerate  — net worth ≥ $1M, no power-tier requirement (default)
//   autonomous    — net worth ≥ $50M + influence ≥ 50 + declared
//                   autonomy from your origin nation
//   nation        — net worth ≥ $500M + influence ≥ 200 + recognized
//                   by ≥3 other nations
//   empire        — net worth ≥ $5B + influence ≥ 500 + control 5 star
//                   systems (v11.7 will define star systems; v11.5 stubs)
//   federation    — net worth ≥ $50B + influence ≥ 2000 + unify 50%
//                   of known space (v11.7; v11.5 stubs)
//
// Skipping tiers is forbidden — the engine returns 'skipForbidden'.
// v11.5 wires only the first three tiers; v11.7 will wire the cosmic
// tiers when star systems / galactic geography land.
export type EntityTier = 'none' | 'conglomerate' | 'autonomous' | 'nation' | 'empire' | 'federation';

export const ENTITY_TIERS: {
  tier: EntityTier;
  minNetWorth: number;
  minInfluence: number;
  extra?: string; // human-readable requirement (recognition/star systems)
  label: { en: string; vi: string; zh: string };
  desc: { en: string; vi: string; zh: string };
}[] = [
  {
    tier: 'none', minNetWorth: 0, minInfluence: 0,
    label: { en: 'Private citizen', vi: 'Công dân', zh: '普通公民' },
    desc: { en: 'No political entity — you are a private person.',
           vi: 'Chưa có thực thể chính trị — bạn là cá nhân.',
           zh: '没有政治实体 — 你是个人。' },
  },
  {
    tier: 'conglomerate', minNetWorth: 1_000_000, minInfluence: 0,
    label: { en: 'Conglomerate', vi: 'Tập đoàn', zh: '企业集团' },
    desc: { en: 'A group of companies under common control — the default tier once you hit $1M net worth.',
           vi: 'Nhóm công ty dưới cùng kiểm soát — cấp mặc định khi tài sản ≥ $1M.',
           zh: '同一控制下的多家公司 — 净资产达$1M后的默认等级。' },
  },
  {
    tier: 'autonomous', minNetWorth: 75_000_000, minInfluence: 60,
    label: { en: 'Autonomous territory', vi: 'Lãnh thổ tự trị', zh: '自治领土' },
    desc: { en: 'A region you govern with self-rule but still nominally inside your origin nation.',
           vi: 'Vùng bạn tự cai quản nhưng vẫn thuộc quốc gốc.',
           zh: '你自治的领土，但名义上仍在原国内。' },
  },
  {
    tier: 'nation', minNetWorth: 750_000_000, minInfluence: 220,
    extra: 'Recognized by ≥3 nations',
    label: { en: 'Independent nation', vi: 'Quốc gia độc lập', zh: '独立国家' },
    desc: { en: 'A sovereign state you founded. Recognition by ≥3 other nations required to step up here.',
           vi: 'Quốc gia có chủ quyền do bạn lập. Cần được ≥3 nước công nhận.',
           zh: '你建立的主权国家。需获≥3国承认。' },
  },
  {
    tier: 'empire', minNetWorth: 7_500_000_000, minInfluence: 550,
    extra: 'Control 5 star systems',
    label: { en: 'Interstellar empire', vi: 'Đế chế liên hành tinh', zh: '星际帝国' },
    desc: { en: 'Sovereign nation expanded to ≥5 star systems. v11.7 will define star-system control.',
           vi: 'Quốc gia mở rộng ra ≥5 hệ sao. v11.7 sẽ định nghĩa hệ sao.',
           zh: '扩张到≥5个星系的主权国家。v11.7将定义星系控制。' },
  },
  {
    tier: 'federation', minNetWorth: 50_000_000_000, minInfluence: 2000,
    extra: 'Unify 50% of known space',
    label: { en: 'Galactic federation', vi: 'Liên minh thiên hà', zh: '银河联邦' },
    desc: { en: 'A political union unifying ≥50% of known space. v11.7 will define galactic geography.',
           vi: 'Liên minh chính trị thống nhất ≥50% không gian đã biết. v11.7 sẽ định nghĩa thiên hà.',
           zh: '统一≥50%已知空间的政治联盟。v11.7将定义银河地理。' },
  },
];

// v11.5 — Constitution types. Each grants a different package of
// bonuses and penalties (income mult, tax rate, military upkeep, branch
// closure risk). Player picks one at declare-independence; it cannot be
// changed later (would require a revolution — out of scope for v11.5).
export type Constitution = 'corporatist' | 'democratic' | 'authoritarian' | 'technocratic';

export const CONSTITUTIONS: {
  id: Constitution;
  label: { en: string; vi: string; zh: string };
  bizMult: number;       // business income multiplier
  taxRate: number;       // income tax rate (0..1)
  militaryUpkeepMult: number; // military upkeep multiplier
  closureRisk: number;   // additive branch-closure risk per year
  desc: { en: string; vi: string; zh: string };
}[] = [
  {
    id: 'corporatist',
    label: { en: 'Corporatist', vi: 'Tập đoàn trị', zh: '公司主义' },
    bizMult: 1.20, taxRate: 0.15, militaryUpkeepMult: 1.0, closureRisk: 0.02,
    desc: {
      en: 'Run the nation like a company. +20% business income, low tax (15%), but closure risk +2%.',
      vi: 'Quản quốc như công ty. +20% thu nhập, thuế thấp 15%, nhưng +2% rủi ro đóng cửa.',
      zh: '把国家当公司经营。+20%商业收入，低税15%，但关闭风险+2%。',
    },
  },
  {
    id: 'democratic',
    label: { en: 'Democratic', vi: 'Dân chủ', zh: '民主制' },
    bizMult: 1.0, taxRate: 0.25, militaryUpkeepMult: 1.2, closureRisk: 0.0,
    desc: {
      en: 'Elections + checks and balances. Baseline income, moderate tax (25%), higher military upkeep, no closure risk.',
      vi: 'Bầu cử + kiểm soát quyền lực. Thu nhập cơ bản, thuế vừa 25%, quân phí cao, không có rủi ro đóng cửa.',
      zh: '选举+权力制衡。基准收入，中等税收25%，军费较高，无关闭风险。',
    },
  },
  {
    id: 'authoritarian',
    label: { en: 'Authoritarian', vi: 'Độc tài', zh: '威权制' },
    bizMult: 0.90, taxRate: 0.35, militaryUpkeepMult: 0.7, closureRisk: 0.05,
    desc: {
      en: 'Strong central control. −10% business income, high tax (35%), cheap military, but closure risk +5%.',
      vi: 'Kiểm soát trung ương mạnh. −10% thu nhập, thuế cao 35%, quân phí rẻ, nhưng +5% rủi ro đóng cửa.',
      zh: '强中央集权。−10%商业收入，高税收35%，军费低，但关闭风险+5%。',
    },
  },
  {
    id: 'technocratic',
    label: { en: 'Technocratic', vi: 'Kỹ trị', zh: '技术官僚制' },
    bizMult: 1.10, taxRate: 0.20, militaryUpkeepMult: 0.9, closureRisk: 0.01,
    desc: {
      en: 'Expert-led. +10% business income, moderate tax (20%), military −10% upkeep, closure risk +1%.',
      vi: 'Dẫn dắt bởi chuyên gia. +10% thu nhập, thuế vừa 20%, quân phí −10%, +1% rủi ro đóng cửa.',
      zh: '专家主导。+10%商业收入，税收20%，军费−10%，关闭风险+1%。',
    },
  },
];

export const constitutionById = (id: Constitution) =>
  CONSTITUTIONS.find(c => c.id === id) || CONSTITUTIONS[0];

// v11.5 — EntityState lives on GameState. The player progresses through
// the 5 tiers; recognition tracks how many other nations have recognized
// the player's entity (only meaningful at 'nation' tier and above).
// inflation is the player's own currency's yearly inflation rate (set
// when they declare independence; grows slowly with deficits).
// constitution is set at declare-independence; cannot be changed in v11.5.
export interface EntityState {
  tier: EntityTier;
  declaredDay: number;          // day entity was first founded (conglomerate)
  upgradedTo: Record<EntityTier, number | undefined>; // day each tier was reached
  recognition: number;          // # of other nations/entities that recognize
  currency: string;             // 'USD' default; player sets at nation tier
  inflation: number;            // yearly inflation rate, 0..1 (e.g. 0.05 = 5%)
  constitution: Constitution | null;
  originNation: string | null;  // the nation they declared independence FROM
}

export function freshEntity(): EntityState {
  return {
    tier: 'none',
    declaredDay: 0,
    upgradedTo: {} as Record<EntityTier, number | undefined>,
    recognition: 0,
    currency: 'USD',
    inflation: 0,
    constitution: null,
    originNation: null,
  };
}

// v11.5 — Read the player's current tier based on GameState (cross-ref
// net worth + influence). For v11.5 we only consider the first 3 tiers;
// 'empire' and 'federation' require star-system control (v11.7) so they
// are stubbed for now — `entityTierOf` returns the highest UNLOCKED tier
// (sticky like power tier, set by upgradeEntity).
export function entityTierOf(s: GameState): EntityTier {
  return s.entity?.tier || 'none';
}

// v11.5 — Compute the highest tier the player QUALIFIES for (does not
// mutate). For 'empire'/'federation' returns the current tier (star-
// system gating is v11.7). For 'nation' requires recognition ≥3.
// `nw` is passed in to avoid the circular import.
export function qualifiedEntityTier(s: GameState, nw: number, influence: number): EntityTier {
  let qualified: EntityTier = 'none';
  for (const r of ENTITY_TIERS) {
    if (r.tier === 'none' || r.tier === 'empire' || r.tier === 'federation') continue; // empire/federation gated by v11.7
    if (nw >= r.minNetWorth && influence >= r.minInfluence) {
      if (r.tier === 'nation' && (s.entity?.recognition || 0) < 3) continue;
      qualified = r.tier;
    }
  }
  return qualified;
}

// v11.5 — the next tier above the current one. Used for UI hints.
// For 'empire'/'federation' returns null (gated by v11.7 until then).
export function nextEntityTier(s: GameState): { tier: EntityTier; min: number; minInfluence: number; extra?: string } | null {
  const cur = entityTierOf(s);
  const idx = ENTITY_TIERS.findIndex(r => r.tier === cur);
  // Skip 'empire' and 'federation' (v11.7 gated)
  for (let i = idx + 1; i < ENTITY_TIERS.length; i++) {
    const next = ENTITY_TIERS[i];
    if (next.tier === 'empire' || next.tier === 'federation') return null;
    return { tier: next.tier, min: next.minNetWorth, minInfluence: next.minInfluence, extra: next.extra };
  }
  return null;
}

// v11.5 — declareIndependence: split from origin nation. Requires:
//   - current tier = 'autonomous'
//   - influence ≥ 200
//   - net worth ≥ $500M
//   - recognition ≥ 3 (must have courted 3 other nations first; v11.5
//     makes recognition a UI action where the player pays influence to
//     court nations — see courtRecognition below)
// On success: bumps tier to 'nation', sets originNation, sets
// constitution, sets currency (defaults to a 3-letter player-chosen
// code, fallback '$PLAYERNAME'), sets inflation to 0.02 (2% baseline).
// Returns the result.
export function declareIndependence(
  s: GameState,
  nw: number,
  influence: number,
  constitution: Constitution,
  currency: string,
  log: (msg: string) => void,
): { ok: boolean; reason?: string } {
  if (!s.entity) return { ok: false, reason: 'noEntity' };
  if (s.entity.tier !== 'autonomous') return { ok: false, reason: 'wrongTier' };
  if (influence < 200) return { ok: false, reason: 'noInfluence' };
  if (nw < 500_000_000) return { ok: false, reason: 'noNetWorth' };
  if ((s.entity.recognition || 0) < 3) return { ok: false, reason: 'noRecognition' };
  // Promote
  s.entity.tier = 'nation';
  s.entity.upgradedTo['nation'] = s.lastDay;
  s.entity.constitution = constitution;
  s.entity.currency = (currency || 'NEW').slice(0, 3).toUpperCase();
  s.entity.inflation = 0.02;
  log(`Independence declared! ${s.name}'s nation is now sovereign. Constitution: ${constitution}. Currency: ${s.entity.currency}.`);
  return { ok: true };
}

// v11.5 — court recognition: pay 30 influence to court one nation's
// recognition. Each nation can be courted once (we don't track per-
// nation to keep v11.5 light; recognition just goes up by 1 each
// successful court). Caps at 12 (one per nation in the list).
export function courtRecognition(s: GameState, influence: number, log: (msg: string) => void): { ok: boolean; reason?: string } {
  if (!s.entity) return { ok: false, reason: 'noEntity' };
  if (s.entity.tier !== 'autonomous') return { ok: false, reason: 'wrongTier' };
  if ((s.entity.recognition || 0) >= 12) return { ok: false, reason: 'maxRecognition' };
  if (influence < 30) return { ok: false, reason: 'noInfluence' };
  s.entity.recognition += 1;
  log(`Courted a foreign nation — recognition now ${s.entity.recognition}/3 required for independence.`);
  return { ok: true };
}

// v11.5 — declare autonomy: step up from 'conglomerate' to 'autonomous'.
// Requires conglomerate tier, net worth ≥ $50M, influence ≥ 50. Sets
// originNation = s.nation (the country they're inside).
export function declareAutonomy(s: GameState, nw: number, influence: number, log: (msg: string) => void): { ok: boolean; reason?: string } {
  if (!s.entity) return { ok: false, reason: 'noEntity' };
  if (s.entity.tier !== 'conglomerate') return { ok: false, reason: 'wrongTier' };
  if (nw < 50_000_000) return { ok: false, reason: 'noNetWorth' };
  if (influence < 50) return { ok: false, reason: 'noInfluence' };
  s.entity.tier = 'autonomous';
  s.entity.upgradedTo['autonomous'] = s.lastDay;
  s.entity.originNation = s.nation;
  log(`Autonomy declared within ${s.nation}. You now self-govern your territory.`);
  return { ok: true };
}

// v11.5 — promote from 'none' to 'conglomerate' once net worth ≥ $1M.
// Auto-fired by the engine (in tickEntity) when the threshold is crossed.
export function autoPromoteConglomerate(s: GameState, nw: number, log: (msg: string) => void): boolean {
  if (!s.entity) return false;
  if (s.entity.tier !== 'none') return false;
  if (nw < 1_000_000) return false;
  s.entity.tier = 'conglomerate';
  s.entity.declaredDay = s.lastDay;
  s.entity.upgradedTo['conglomerate'] = s.lastDay;
  log(`Your companies now form a conglomerate (net worth ≥ $1M).`);
  return true;
}

// v11.5 — yearly entity tick. Auto-promotes conglomerate if the
// threshold is crossed. Inflation compounds money by (1 - inflation)
// (i.e. 5% inflation erodes money by 5%). Returns the inflation amount.
// Called from yearEnd() in engine.ts.
export function tickEntity(s: GameState, nw: number, log: (msg: string) => void): { promotedTo: EntityTier | null; inflationErosion: number } {
  if (!s.entity) return { promotedTo: null, inflationErosion: 0 };
  // Auto-promote conglomerate
  const promoted = autoPromoteConglomerate(s, nw, log);
  // Inflation erodes money (only meaningful at 'nation' tier or higher —
  // before that the player uses the host nation's currency).
  let erosion = 0;
  if ((s.entity.tier === 'nation' || s.entity.tier === 'empire' || s.entity.tier === 'federation')
      && s.entity.inflation > 0 && s.money > 0) {
    erosion = Math.round(s.money * s.entity.inflation);
    s.money -= erosion;
    if (erosion > 0) log(`Inflation (${(s.entity.inflation * 100).toFixed(1)}%) eroded ${erosion.toLocaleString('en-US')} from cash.`);
  }
  return { promotedTo: promoted ? 'conglomerate' : null, inflationErosion: erosion };
}
