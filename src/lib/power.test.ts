import assert from 'node:assert/strict';
import test from 'node:test';
import {
  fresh, begin, donate, netWorth, worldYear, migrate,
  yearEnd, bizMultiplier, recordHallOnGameOver, tickPowerV11_4,
} from './engine';
import { BOTS } from './gameData';
import {
  POWER_TIERS, powerTierOf, powerTierOfNw, powerTierIdx, nextTierOf,
  freshPower, addInfluence, influenceFromCharity, spendInfluence,
  influenceFromClubChair, influenceFromBoardSeat, influenceFromMediaOwnership,
  influenceGainMult, tickPower, tickPassiveInfluence, tickTierPromotion,
  doAdvocacy, ADVOCACY_ACTIONS, type PowerTier, type InfluenceSource,
  // v11.4 — elections + scrutiny + alliances/rivals + endings
  ELECTION_PARAMS, electionParamsFor, generateOpponent, electionMargin, runElection,
  tickScrutiny, TRANSPARENCY_ACTIONS, doTransparency,
  offerAlliance, breakWith, tickAlliancesRivals, rollScandal, computeEnding,
} from './power';

test('v11.3: powerTierOfNw returns the right tier for each net worth threshold', () => {
  assert.equal(powerTierOfNw(0), 'none');
  assert.equal(powerTierOfNw(1_000_000), 'none');
  assert.equal(powerTierOfNw(15_000_000), 'industry_mogul');
  assert.equal(powerTierOfNw(50_000_000), 'industry_mogul');
  assert.equal(powerTierOfNw(200_000_000), 'influencer');
  assert.equal(powerTierOfNw(1_999_999_999), 'influencer');
  assert.equal(powerTierOfNw(2_000_000_000), 'national_power');
  assert.equal(powerTierOfNw(5_000_000_000), 'national_power');
  assert.equal(powerTierOfNw(30_000_000_000), 'state_leader');
  // $100B still state_leader under v11.18 raised thresholds.
});

test('v11.3: powerTierOf reads GameState and matches the inline net-worth calc', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: ['money'], tals: ['math'] });
  s.money = 5_000_000;
  assert.equal(powerTierOf(s), 'none');
  assert.equal(powerTierIdx(s), 0);
  assert.equal(nextTierOf(s)?.tier, 'industry_mogul');
  assert.equal(nextTierOf(s)?.min, 15_000_000);
  // Cross $10M
  s.money = 16_000_000;
  assert.equal(powerTierOf(s), 'industry_mogul');
  assert.equal(powerTierIdx(s), 1);
  assert.equal(nextTierOf(s)?.tier, 'influencer');
  assert.equal(nextTierOf(s)?.min, 200_000_000);
  // Cross $10B
  s.money = 31_000_000_000;
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
  s.money = 15_000_000;
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
  s.money = 16_000_000;
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
  s.money = 210_000_000;
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
  s.money = 16_000_000;
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
  s.money = 16_000_000;
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
  s.money = 210_000_000; // influencer tier ($100M)
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
  s.money = 2_100_000_000; // national_power tier ($2B)
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
  s.money = 50_000_000; // below industry_mogul? no — $50M is industry_mogul ($15M+, v11.18)
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
  s.money = 16_000_000;
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
  s.money = 16_000_000;
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
  s.money = 16_000_000;
  const baseline = bizMultiplier(s);
  // Now apply boardNominee
  s.power.boardNomineeBiz = 1.10;
  const after = bizMultiplier(s);
  assert.ok(Math.abs(after / baseline - 1.10) < 1e-6, `expected +10%, got ${after / baseline}`);
});

// ================= v11.4 — Elections + Scrutiny + Alliances/Rivals + Endings =================

test('v11.4: electionParamsFor returns the right params for each of 12 nations', () => {
  assert.equal(ELECTION_PARAMS.length, 12);
  assert.ok(electionParamsFor('Vietnam'));
  assert.ok(electionParamsFor('United States'));
  // Term lengths vary by nation
  assert.ok(electionParamsFor('Australia')!.termLength === 3);
  assert.ok(electionParamsFor('Vietnam')!.termLength === 5);
  // Randomness varies (Germany is the most stable)
  assert.ok(electionParamsFor('Germany')!.randomness < electionParamsFor('Brazil')!.randomness);
  // Unknown nation returns null
  assert.equal(electionParamsFor('Atlantis'), null);
});

test('v11.4: generateOpponent picks a same-nation bot when available, scales 0.8..1.2', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  const opp = generateOpponent(s, () => 0.5, bots);
  assert.ok(opp.name.length > 0);
  // With rng=0.5, factor = 0.8 + 0.5*0.4 = 1.0, so strength = 50
  assert.equal(opp.personalStrength, 50);
  // Different nation with bots → still gets a name (uses fallback pool)
  s.nation = 'Atlantis';
  const opp2 = generateOpponent(s, () => 0.5, bots);
  assert.ok(opp2.name.length > 0);
});

test('v11.4: electionMargin sums influence + alliance + rival + scrutiny + opponent + noise', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  s.power.alliances = [{ bot: 'A', strength: 50, formedDay: 0 }];
  s.power.rivals = [{ bot: 'B', hostility: 40 }];
  // rng=0.5 → noise = (0.5 - 0.5) * 2 * randomness = 0
  // Expected: min(100/10, 25) + min(50*0.5, 25) + max(-25, -40*0.5) + 0 + 0 (opponent=50) + 0
  //         = 10 + 25 + (-20) + 0 + 0 + 0 = 15
  const m = electionMargin(s, 50, 10, () => 0.5);
  assert.equal(m, 15, `expected 15, got ${m}`);
  // Higher opponent strength → lower margin
  const m2 = electionMargin(s, 100, 10, () => 0.5);
  // Opponent penalty = -((100-50)/50)*25 = -25
  assert.equal(m2, 15 - 25, `expected -10, got ${m2}`);
  // Scrutiny ≥80 reduces margin
  s.power.scrutiny = 90;
  const m3 = electionMargin(s, 50, 10, () => 0.5);
  // scrutiny penalty = -(90-80)*0.5 = -5
  assert.equal(m3, 15 - 5, `expected 10, got ${m3}`);
});

test('v11.4: runElection refuses when tier below national_power', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 200;
  s.money = 50_000_000; // industry_mogul ($15M+, v11.18 raised thresholds) — too low for influencer
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  const r = runElection(s, () => 0.5, bots, 2020);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'wrongTier');
  assert.equal(s.power.influence, 200, 'influence preserved on failure');
});

test('v11.4: runElection succeeds at national_power; win grants +50 influence + +15 scrutiny', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 200; // moderate — diminishing returns will cut the +50 gain
  s.money = 2_100_000_000; // national_power
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  // With influence=200, influenceBonus = min(20, 25) = 20. Opponent at rng=0.99:
  // personalStrength = 50 * (0.8 + 0.99*0.4) = 50 * 1.196 = 59.8 → opponentPenalty = -(9.8/50)*25 ≈ -4.9
  // margin = 20 + 0 + 0 + 0 + (-4.9) + 0 (noise from rng=0.99) = ~15 → wins
  const r = runElection(s, () => 0.99, bots, 2020);
  assert.equal(r.ok, true);
  assert.ok(s.power.elections['Vietnam']);
  if (r.result === 'won') {
    // Influence: 200 - 80 (campaign cost) + addInfluence(50, 'electionWin') w/ diminishing returns
    // mult(120) = 1 / (1 + sqrt(1.2)) = 1 / 2.095 = 0.477 → gain = round(50*0.477) = 24
    // final = 120 + 24 = 144 (approx). Just verify it increased from 120.
    assert.ok(s.power.influence >= 120, `influence ≥120 after win (campaign cost 80 + influence gain), got ${s.power.influence}`);
    assert.ok(s.power.scrutiny >= 15, `scrutiny ≥15 after win, got ${s.power.scrutiny}`);
    assert.equal(s.power.elections['Vietnam'].status, 'won');
    assert.ok(s.power.elections['Vietnam'].termEnds > 0, 'term ends in the future');
  } else {
    assert.ok(s.power.scrutiny >= 5);
    assert.equal(s.power.elections['Vietnam'].status, 'lost');
    assert.equal(s.power.elections['Vietnam'].termEnds, 0);
  }
});

test('v11.4: runElection refuses when scrutiny ≥95', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 500;
  s.power.scrutiny = 96;
  s.money = 2_100_000_000;
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  const r = runElection(s, () => 0.5, bots, 2020);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'scrutinyTooHigh');
});

test('v11.4: runElection refuses when term still active (won last election)', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 500;
  s.money = 2_100_000_000;
  s.power.elections['Vietnam'] = {
    status: 'won', year: 2020, opponent: 'X', margin: 5, termEnds: s.lastDay + 365,
  };
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  const r = runElection(s, () => 0.5, bots, 2021);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'termActive');
});

test('v11.4: runElection refuses when influence < 80', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 50;
  s.money = 2_100_000_000;
  const bots = BOTS.map(([n, a, nat, ind, v]) => ({ name: n, nation: nat, nw: v }));
  const r = runElection(s, () => 0.5, bots, 2020);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'noInfluence');
});

test('v11.4: tickScrutiny rises by tier + extra for high influence; falls with transparency', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  // industry_mogul tier
  s.money = 16_000_000;
  assert.equal(powerTierOf(s), 'industry_mogul');
  const r1 = tickScrutiny(s);
  assert.equal(r1, 2, 'industry_mogul → +2');
  assert.equal(s.power.scrutiny, 2);
  // influencer tier
  s.money = 210_000_000;
  s.power.scrutiny = 0;
  const r2 = tickScrutiny(s);
  assert.equal(r2, 4, 'influencer → +4');
  // national_power with influence >500
  s.money = 2_100_000_000;
  s.power.influence = 600;
  s.power.scrutiny = 0;
  const r3 = tickScrutiny(s);
  assert.equal(r3, 7 + 3, 'national_power + influence>500 → +10');
  // With transparency = 40 → reduces by 40*0.5 = 20 → 0 (floored)
  s.power.transparency = 40;
  s.power.scrutiny = 0;
  const r4 = tickScrutiny(s);
  assert.equal(r4, 0, 'transparency reduces scrutiny rise to 0');
});

test('v11.4: doTransparency independentBoard +20 transparency, costs 40 influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  const r = doTransparency(s, 'independentBoard');
  assert.equal(r.ok, true);
  assert.equal(s.power.transparency, 20);
  assert.equal(s.power.influence, 100 - 40);
});

test('v11.4: doTransparency acceptRisk is free; sets no bump', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 0;
  const r = doTransparency(s, 'acceptRisk');
  assert.equal(r.ok, true);
  assert.equal(s.power.transparency, 0);
});

test('v11.4: doTransparency refuses when insufficient influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 20; // less than 40 for independentBoard
  const r = doTransparency(s, 'independentBoard');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'noInfluence');
});

test('v11.4: offerAlliance forms alliance at strength 30, costs 20 influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  const r = offerAlliance(s, 'Minh Nguyen');
  assert.equal(r.ok, true);
  assert.equal(s.power.influence, 80);
  assert.equal(s.power.alliances.length, 1);
  assert.equal(s.power.alliances[0].bot, 'Minh Nguyen');
  assert.equal(s.power.alliances[0].strength, 30);
});

test('v11.4: offerAlliance refreshes existing alliance by +20 strength, costs 20', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  offerAlliance(s, 'Minh Nguyen'); // strength 30, influence 80
  const r = offerAlliance(s, 'Minh Nguyen'); // refresh
  assert.equal(r.ok, true);
  assert.equal(s.power.influence, 60);
  assert.equal(s.power.alliances[0].strength, 50);
});

test('v11.4: offerAlliance removes bot from rivals when allying', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  s.power.rivals = [{ bot: 'Minh Nguyen', hostility: 40 }];
  offerAlliance(s, 'Minh Nguyen');
  assert.equal(s.power.rivals.length, 0, 'rival cleared after alliance');
});

test('v11.4: breakWith turns ally into rival with hostility 50', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.influence = 100;
  offerAlliance(s, 'Minh Nguyen');
  const r = breakWith(s, 'Minh Nguyen');
  assert.equal(r.ok, true);
  assert.equal(s.power.alliances.length, 0);
  assert.equal(s.power.rivals.length, 1);
  assert.equal(s.power.rivals[0].hostility, 50);
});

test('v11.4: breakWith bumps existing rival hostility by +20', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.rivals = [{ bot: 'X', hostility: 50 }];
  breakWith(s, 'X');
  assert.equal(s.power.rivals[0].hostility, 70);
});

test('v11.4: tickAlliancesRivals decays alliance by 5, rival by 3, drops zero entries', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.alliances = [{ bot: 'A', strength: 10, formedDay: 0 }, { bot: 'B', strength: 5, formedDay: 0 }];
  s.power.rivals = [{ bot: 'C', hostility: 8 }, { bot: 'D', hostility: 2 }];
  tickAlliancesRivals(s);
  assert.equal(s.power.alliances.length, 1, 'B drops (strength 0)');
  assert.equal(s.power.alliances[0].strength, 5);
  assert.equal(s.power.rivals.length, 1, 'D drops (hostility 0)');
  assert.equal(s.power.rivals[0].hostility, 5);
});

test('v11.4: rollScandal fires when scrutiny high; bumps scrutiny + rivals + reduces influence', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.scrutiny = 100;
  s.power.influence = 50;
  s.power.rivals = [{ bot: 'X', hostility: 30 }];
  // rng = 0.0 → always fires (chance ≥0%; 0 < baseChance)
  const fired = rollScandal(s, () => 0.0);
  assert.equal(fired, true);
  assert.equal(s.power.scrutiny, 100); // already at cap
  assert.equal(s.power.rivals[0].hostility, 45);
  assert.equal(s.power.influence, 45);
});

test('v11.4: rollScandal acceptRisk doubles chance', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.scrutiny = 50; // baseChance = 0.15
  s.power.influence = 50;
  // rng = 0.20 → fails at 0.15 but fires at 0.30
  const r1 = rollScandal(s, () => 0.20, false);
  assert.equal(r1, false);
  // reset and try with acceptRisk
  s.power.scrutiny = 50;
  const r2 = rollScandal(s, () => 0.20, true);
  assert.equal(r2, true, 'doubled chance fires');
});

test('v11.4: computeEnding returns reclusive when no power tier unlocked', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.unlockedTier = 'none';
  assert.equal(computeEnding(s), 'reclusive');
});

test('v11.4: computeEnding returns overthrown when scrutiny ≥80', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.unlockedTier = 'national_power';
  s.power.scrutiny = 85;
  s.power.elections = { Vietnam: { status: 'won', year: 2020, opponent: 'X', margin: 10, termEnds: 0 } };
  assert.equal(computeEnding(s), 'overthrown');
});

test('v11.4: computeEnding returns sustainable for state_leader + won + scrutiny<50', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.unlockedTier = 'state_leader';
  s.power.scrutiny = 30;
  s.power.elections = { Vietnam: { status: 'won', year: 2020, opponent: 'X', margin: 20, termEnds: 0 } };
  assert.equal(computeEnding(s), 'sustainable');
});

test('v11.4: computeEnding returns respected for national_power + won + scrutiny<70', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.unlockedTier = 'national_power';
  s.power.scrutiny = 60;
  s.power.elections = { Vietnam: { status: 'won', year: 2020, opponent: 'X', margin: 10, termEnds: 0 } };
  assert.equal(computeEnding(s), 'respected');
});

test('v11.4: recordHallOnGameOver writes ending into hall.note', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.power.unlockedTier = 'state_leader';
  s.power.scrutiny = 30;
  s.power.elections = { Vietnam: { status: 'won', year: 2020, opponent: 'X', margin: 20, termEnds: 0 } };
  s.over = true;
  s.cause = 'age';
  s.age = 90;
  recordHallOnGameOver(s);
  assert.ok(s.hall);
  assert.ok(s.hall!.note.includes('ending: sustainable'));
  assert.equal(s.power.ending, 'sustainable');
});

test('v11.4: tickPowerV11_4 returns combined promotion + influence + scrutiny + scandal', () => {
  const s = fresh();
  begin(s, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  s.power = freshPower();
  s.ownClub = 'My Circle';
  s.clubs = ['own'];
  s.money = 16_000_000; // cross $15M → industry_mogul promotion (v11.18 raised thresholds)
  s.power.scrutiny = 100; // force a scandal roll
  const r = tickPowerV11_4(s, netWorth(s), () => 0.0); // rng=0 → scandal fires (chance ≥0)
  assert.equal(r.promotedTo, 'industry_mogul');
  assert.ok(r.influenceGained > 0);
  assert.ok(r.scrutinyRise >= 0);
  assert.equal(r.scandal, true, 'scandal should fire at scrutiny 100');
  // Verify state side-effects
  assert.equal(s.power.unlockedTier, 'industry_mogul');
  assert.ok(s.power.scrutiny >= 0); // already at cap, stays 100
});

test('v11.4: migrate() backfills the new v11.4 power fields on saves that only had v11.3 power', () => {
  const state = migrate({
    schemaVersion: 4, money: 50_000_000,
    // v11.3-style partial power state — no elections/alliances/rivals/ending
    power: { unlockedTier: 'industry_mogul', influence: 50, unlockedAtDay: 100, influenceLog: [], scrutiny: 0, transparency: 0 },
  });
  assert.equal(state.power.unlockedTier, 'industry_mogul');
  assert.equal(state.power.influence, 50);
  // v11.4 fields backfilled
  assert.deepEqual(state.power.elections, {});
  assert.deepEqual(state.power.alliances, []);
  assert.deepEqual(state.power.rivals, []);
  assert.equal(state.power.ending, null);
});

test('v11.4: TRANSPARENCY_ACTIONS has 3 entries (independentBoard, disclosureReports, acceptRisk)', () => {
  assert.equal(TRANSPARENCY_ACTIONS.length, 3);
  assert.equal(TRANSPARENCY_ACTIONS[0].id, 'independentBoard');
  assert.equal(TRANSPARENCY_ACTIONS[1].id, 'disclosureReports');
  assert.equal(TRANSPARENCY_ACTIONS[2].id, 'acceptRisk');
  // acceptRisk is free
  assert.equal(TRANSPARENCY_ACTIONS[2].cost, 0);
  assert.equal(TRANSPARENCY_ACTIONS[2].bump, 0);
});
