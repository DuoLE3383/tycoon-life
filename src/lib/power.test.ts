import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fresh, begin, donate, netWorth, worldYear, migrate,
  yearEnd, bizMultiplier,
} from './engine';
import {
  POWER_TIERS, powerTierOf, powerTierOfNw, powerTierIdx, nextTierOf,
  freshPower, addInfluence, influenceFromCharity, spendInfluence,
  influenceFromClubChair, influenceFromBoardSeat, influenceFromMediaOwnership,
  influenceGainMult, tickPower, tickPassiveInfluence, tickTierPromotion,
  doAdvocacy, ADVOCACY_ACTIONS, type PowerTier, type InfluenceSource,
} from './power';

test('v11.3: powerTierOfNw returns the right tier for each net worth threshold', () => {
  assert.equal(powerTierOfNw(0), 'none');
  assert.equal(powerTierOfNw(1_000_000), 'none');
  assert.equal(powerTierOfNw(10_000_000), 'industry_mogul');
  assert.equal(powerTierOfNw(50_000_000), 'industry_mogul');
  assert.equal(powerTierOfNw(100_000_000), 'influencer');
  assert.equal(powerTierOfNw(999_999_999), 'influencer');
  assert.equal(powerTierOfNw(1_000_000_000), 'national_power');
  assert.equal(powerTierOfNw(5_000_000_000), 'national_power');
  assert.equal(powerTierOfNw(10_000_000_000), 'state_leader');
  assert.equal(powerTierOfNw(100_000_000_000), 'state_leader');
});

test('v11.3: powerTierOf reads GameState and matches the inline net-worth calc', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: ['money'], tals: ['math'] });
  s.money = 5_000_000;
  assert.equal(powerTierOf(s), 'none');
  assert.equal(powerTierIdx(s), 0);
  assert.equal(nextTierOf(s)?.tier, 'industry_mogul');
  assert.equal(nextTierOf(s)?.min, 10_000_000);
  // Cross $10M
  s.money = 12_000_000;
  assert.equal(powerTierOf(s), 'industry_mogul');
  assert.equal(powerTierIdx(s), 1);
  assert.equal(nextTierOf(s)?.tier, 'influencer');
  assert.equal(nextTierOf(s)?.min, 100_000_000);
  // Cross $10B
  s.money = 11_000_000_000;
  assert.equal(powerTierOf(s), 'state_leader');
  assert.equal(nextTierOf(s), null, 'no next tier above state_leader');
});

test('v11.3: influenceGainMult has the expected diminishing curve', () => {
  assert.ok(Math.abs(influenceGainMult(0) - 1.0) < 1e-9, `I=0 → 1.0, got ${influenceGainMult(0)}`);
  assert.ok(Math.abs(influenceGainMult(100) - 0.5) < 1e-9, `I=100 → 0.5, got ${influenceGainMult(100)}`);
  assert.ok(Math.abs(influenceGainMult(400) - (1 / 3)) < 1e-9, `I=400 → 0.333, got ${influenceGainMult(400)}`);
  assert.ok(Math.abs(influenceGainMult(2500) - (1 / 6)) < 1e-9, `I=2500 → 0.167, got ${influenceGainMult(2500)}`);
  // Negative is clamped to 0
  assert.equal(influenceGainMult(-100), 1.0);
});

test('v11.3: addInfluence applies diminishing returns + logs the source', () => {
  const s = fresh();
  s.power = freshPower();
  // First 100 influence — full mult (1.0)
  const r1 = addInfluence(s, 100, 'charity');
  assert.equal(r1, 100, 'first 100 should be full-credit');
  assert.equal(s.power.influence, 100);
  assert.equal(s.power.influenceLog.length, 1);
  assert.equal(s.power.influenceLog[0].source, 'charity');
  assert.equal(s.power.influenceLog[0].amount, 100);
  // Next 100 at influence=100: mult 0.5 → 50
  const r2 = addInfluence(s, 100, 'clubChair');
  assert.equal(r2, 50, 'at I=100, next 100 should yield 50');
  assert.equal(s.power.influence, 150);
  // Log caps at 20
  for (let i = 0; i < 30; i++) addInfluence(s, 10, 'boardSeat');
  assert.ok(s.power.influenceLog.length <= 20, 'log capped at 20');
});

test('v11.3: spendInfluence deducts only when enough is available', () => {
  const s = fresh();
  s.power = freshPower();
  s.power.influence = 50;
  assert.equal(spendInfluence(s, 30), true);
  assert.equal(s.power.influence, 20);
  assert.equal(spendInfluence(s, 30), false, 'not enough — no spend');
  assert.equal(s.power.influence, 20, 'influence unchanged on failed spend');
  assert.equal(spendInfluence(s, 20), true);
  assert.equal(s.power.influence, 0);
  assert.equal(spendInfluence(s, 1), false, 'zero influence cannot spend 1');
});

test('v11.3: influenceFromCharity returns 1 per $10K donated', () => {
  assert.equal(influenceFromCharity(0), 0);
  assert.equal(influenceFromCharity(9999), 0);
  assert.equal(influenceFromCharity(10000), 1);
  assert.equal(influenceFromCharity(100000), 10);
  assert.equal(influenceFromCharity(1_000_000), 100);
});

test('v11.3: influenceFromClubChair returns 5 base + 1 per extra club (cap 10)', () => {
  const s = fresh();
  assert.equal(influenceFromClubChair(s), 0, 'no own club → 0');
  s.ownClub = 'My Circle';
  s.clubs = ['own'];
  assert.equal(influenceFromClubChair(s), 5, 'only own club → 5');
  s.clubs = ['own', 'sky', 'golf', 'tea'];
  assert.equal(influenceFromClubChair(s), 5 + 3, '3 extra clubs → 8');
  s.clubs = ['own', ...Array.from({ length: 20 }, (_, i) => `c${i}`)];
  assert.equal(influenceFromClubChair(s), 5 + 10, 'cap at 10 extra clubs → 15');
});

test('v11.3: influenceFromBoardSeat: founded=3, member=1.5/each (floor)', () => {
  const s = fresh();
  assert.equal(influenceFromBoardSeat(s), 0, 'no clubs → 0');
  s.ownClub = 'Own';
  s.clubs = ['own'];
  assert.equal(influenceFromBoardSeat(s), 3, 'founded only → 3');
  s.clubs = ['own', 'sky', 'golf'];
  assert.equal(influenceFromBoardSeat(s), 3 + Math.floor(1.5 * 2), 'founded + 2 members → 3 + 3 = 6');
  s.ownClub = null;
  s.clubs = ['sky', 'golf', 'tea'];
  assert.equal(influenceFromBoardSeat(s), 0 + Math.floor(1.5 * 3), 'no own + 3 members → 4');
});

test('v11.3: influenceFromMediaOwnership: 10 per source (film studio + verified 1M followers)', () => {
  const s = fresh();
  assert.equal(influenceFromMediaOwnership(s), 0, 'no media → 0');
  s.branches.film = [{ r: 0, mood: 1, paid: 1000, day: 0 }];
  assert.equal(influenceFromMediaOwnership(s), 10, 'film studio only → 10');
  s.social.verified = true;
  s.social.followers = 500_000;
  assert.equal(influenceFromMediaOwnership(s), 10, 'verified but <1M followers → still 10');
  s.social.followers = 1_500_000;
  assert.equal(influenceFromMediaOwnership(s), 20, 'film + verified 1M+ → 20');
});

test('v11.3: donate grants influence with diminishing returns; first donation yields most', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: ['money'], tals: ['math'] });
  s.money = 10_000_000;
  // Donate $100K → 10 base influence × 1.0 (first donation) = 10
  donate(s, 100_000);
  assert.equal(s.power.influence, 10, 'first $100K should grant 10');
  // Donate $100K again → 10 base × mult(10) = 10 × 1/(1+sqrt(0.1)) ≈ 10 × 0.76 = 7.6 → round 8
  donate(s, 100_000);
  // mult(10) = 1/(1 + sqrt(0.1)) = 1/(1 + 0.316) = 0.760. 10 * 0.76 = 7.6 → round 8
  assert.equal(s.power.influence, 18, `second donation should yield 8 (mult~0.76), got ${s.power.influence - 10}`);
  // Donating small amount grants no influence ($1K < $10K threshold)
  const beforeInf = s.power.influence;
  donate(s, 1_000);
  assert.equal(s.power.influence, beforeInf, '$1K donate grants 0 influence');
});

test('v11.3: tickTierPromotion bumps unlockedTier when net worth crosses', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  assert.equal(s.power.unlockedTier, 'none');
  // Cross $10M
  s.money = 12_000_000;
  const promoted = tickTierPromotion(s, netWorth(s));
  assert.equal(promoted, 'industry_mogul');
  assert.equal(s.power.unlockedTier, 'industry_mogul');
  assert.equal(s.power.unlockedAtDay, s.lastDay);
  // Already-promoted → no promotion
  const second = tickTierPromotion(s, netWorth(s));
  assert.equal(second, null);
  // Drop below threshold — unlockedTier is sticky (you remain a known figure)
  s.money = 1_000_000;
  const third = tickTierPromotion(s, netWorth(s));
  assert.equal(third, null, 'tier is sticky — does not demote');
  assert.equal(s.power.unlockedTier, 'industry_mogul');
  // Cross $100M later → promote to influencer
  s.money = 110_000_000;
  const fourth = tickTierPromotion(s, netWorth(s));
  assert.equal(fourth, 'influencer');
  assert.equal(s.power.unlockedTier, 'influencer');
});

test('v11.3: tickPower combines promotion + passive influence in one call', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.ownClub = 'My Circle';
  s.clubs = ['own'];
  s.money = 12_000_000;
  const r = tickPower(s, netWorth(s));
  assert.equal(r.promotedTo, 'industry_mogul');
  assert.ok(r.influenceGained > 0, 'passive influence granted from club chair');
  assert.equal(s.power.influence, r.influenceGained);
});

test('v11.3: doAdvocacy industryPolicy lobbies a 1-year +5% biz crisis', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 50;
  s.money = 12_000_000;
  // Need industry_mogul tier — net worth just crossed $10M
  const year = worldYear(s);
  const r = doAdvocacy(s, 'industryPolicy', year);
  assert.equal(r.ok, true);
  assert.equal(r.effect, 'industryPolicy');
  assert.equal(s.power.influence, 50 - 25, 'cost 25 influence');
  assert.ok(s.crisis, 'crisis entry created');
  assert.equal(s.crisis!.biz, 1.05);
  assert.equal(s.crisis!.yearsLeft, 1);
  assert.ok(s.crisis!.cause.includes('Industry-friendly'));
});

test('v11.3: doAdvocacy boardNominee sets permanent +10% biz multiplier', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  s.money = 110_000_000; // influencer tier ($100M)
  const r = doAdvocacy(s, 'boardNominee', worldYear(s));
  assert.equal(r.ok, true);
  assert.equal(s.power.boardNomineeBiz, 1.10);
  assert.equal(s.power.influence, 100 - 60, 'cost 60 influence');
});

test('v11.3: doAdvocacy endowFoundation sets +20% influence gain mult', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 200;
  s.money = 1_100_000_000; // national_power tier ($1B)
  const r = doAdvocacy(s, 'endowFoundation', worldYear(s));
  assert.equal(r.ok, true);
  assert.equal(s.power.foundationMult, 1.20);
  assert.equal(s.power.influence, 200 - 120, 'cost 120 influence');
  // Verify the +20% applies on subsequent addInfluence calls
  const before = s.power.influence;
  const gain = addInfluence(s, 10, 'charity');
  // mult(80) = 1/(1 + sqrt(0.8)) = 1/(1 + 0.894) = 0.528; 10 × 0.528 × 1.20 = 6.33 → round 6
  assert.equal(gain, 6, `with foundation mult, expected 6, got ${gain}`);
  assert.equal(s.power.influence, before + 6);
});

test('v11.3: doAdvocacy refuses when below the required tier', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 200;
  s.money = 50_000_000; // below industry_mogul? no — $50M is industry_mogul ($10M+)
  // Actually $50M IS industry_mogul — let me go lower
  s.money = 5_000_000;
  assert.equal(powerTierOf(s), 'none');
  const r = doAdvocacy(s, 'industryPolicy', worldYear(s));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'wrongTier');
  // And influence not spent
  assert.equal(s.power.influence, 200);
});

test('v11.3: doAdvocacy refuses when insufficient influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 10; // less than industryPolicy's 25 cost
  s.money = 12_000_000;
  const r = doAdvocacy(s, 'industryPolicy', worldYear(s));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'noInfluence');
  assert.equal(s.power.influence, 10, 'influence preserved on failure');
});

test('v11.3: freshPower returns a clean PowerState with sensible defaults', () => {
  const p = freshPower();
  assert.equal(p.unlockedTier, 'none');
  assert.equal(p.unlockedAtDay, 0);
  assert.equal(p.influence, 0);
  assert.deepEqual(p.influenceLog, []);
  assert.equal(p.scrutiny, 0);
  assert.equal(p.transparency, 0);
  assert.equal(p.boardNomineeBiz, undefined);
  assert.equal(p.foundationMult, undefined);
});

test('v11.3: migrate() backfills power state on old saves', () => {
  const state = migrate({
    schemaVersion: 4, money: 50_000_000, level: 7,
    // No power field on the old save
  });
  assert.ok(state.power, 'power field backfilled');
  assert.equal(state.power.unlockedTier, 'none');
  assert.equal(state.power.influence, 0);
  assert.deepEqual(state.power.influenceLog, []);
});

test('v11.3: migrate() preserves partial power state on saves that already have it', () => {
  const state = migrate({
    schemaVersion: 4, money: 50_000_000,
    power: { unlockedTier: 'industry_mogul', influence: 50, unlockedAtDay: 100, influenceLog: [], scrutiny: 0, transparency: 0 },
  });
  assert.equal(state.power.unlockedTier, 'industry_mogul');
  assert.equal(state.power.influence, 50);
  assert.equal(state.power.unlockedAtDay, 100);
});

test('v11.3: yearEnd grants passive influence + promotes tier when net worth crosses', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.ownClub = 'My Circle';
  s.clubs = ['own'];
  s.money = 12_000_000;
  // Force age to trigger yearEnd
  yearEnd(s, 30, () => 0.5);
  // After yearEnd, the player should be at industry_mogul (passed $10M)
  assert.equal(s.power.unlockedTier, 'industry_mogul');
  // And should have gained some influence from club chair (5 base × mult(0) = 5)
  assert.ok(s.power.influence >= 5, `expected ≥5 influence from club chair, got ${s.power.influence}`);
  // And the log should mention the promotion
  assert.ok(s.log.some(l => l.includes('Power tier unlocked')), 'promotion logged');
  assert.ok(s.log.some(l => l.includes('Passive influence')), 'passive influence logged');
});

test('v11.3: bizMultiplier applies boardNomineeBiz (+10%) on top of everything', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.deg.business = 1;
  s.fame = 10;
  s.money = 12_000_000;
  const baseline = bizMultiplier(s);
  // Now apply boardNominee
  s.power.boardNomineeBiz = 1.10;
  const after = bizMultiplier(s);
  assert.ok(Math.abs(after / baseline - 1.10) < 1e-6, `expected +10%, got ${after / baseline}`);
});
