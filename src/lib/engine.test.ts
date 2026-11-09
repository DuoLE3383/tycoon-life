import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_DEPRECIATION_RATE, DAY_MS, GIGS } from './gameData';
import {
  bankOp, bizMultiplier, begin, bizVal, checkAch, effYears, enrollDeg, enrollLic, fresh, gigPay,
  lotValue, migrate, processDay, sleepHealthMult, studyPace, studyWorkMult,
  SPACE_TRAVEL_COST, spaceIncome, startSpaceUpgrade, taxOf, tick, trade,
  doWell, healthWarnings, hire, jobIncome, meets, studyTuition,
} from './engine';

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test('taxOf applies progressive brackets and the tax-free threshold', () => {
  assert.equal(taxOf(20_000), 0);
  assert.equal(taxOf(100_000), 16_000);
  assert.equal(taxOf(-1), 0);
});

test('bankOp safely deposits, withdraws, and caps borrowing', () => {
  const state = fresh();
  state.money = 1_000;
  assert.equal(bankOp(state, 'dep', 400), 'Deposited $400');
  assert.equal(state.money, 600);
  assert.equal(bankOp(state, 'wd', 150), 'Withdrew $150');
  assert.equal(state.money, 750);
  assert.equal(bankOp(state, 'loan', 'all'), 'Borrowed $500 at 6%/yr');
  assert.equal(state.bank.loan, 500);
  assert.equal(bankOp(state, 'loan', 1), null);
});

test('trade validates purchases and caps sales at holdings', () => {
  const state = fresh();
  state.money = 500;
  assert.deepEqual(trade(state, 'TECH', 'buy', 3), { ok: true, msg: 'Bought 3 × TECH' });
  assert.equal(state.stk.TECH, 3);
  assert.equal(trade(state, 'TECH', 'buy', 100).ok, false);
  assert.equal(trade(state, 'TECH', 'sell', 99).msg, 'Sold 3 × TECH for $300');
  assert.equal(state.stk.TECH, 0);
});

test('gigPay grows sublinearly with annual income', () => {
  const state = fresh();
  state.job = 'clerk';
  state.health = 100;
  const gig = GIGS.find(item => item.id === 'delivery')!;
  assert.equal(gigPay(state, gig), 69);
});

test('monthly social income is added to taxable income once', () => {
  const state = fresh();
  state.social.followers = 6_000;
  const before = state.yIncome;
  processDay(state, 30, () => 0.5);
  // v11.1: socialIncome now scales by sqrt(followers): sqrt(6000) * 6 / 12 ≈ 38.73
  const expected = Math.sqrt(6000) * 6 / 12;
  assert.ok(Math.abs(state.yIncome - before - expected) < 0.01,
    `expected ${expected}, got ${state.yIncome - before}`);
});

test('business multiplier is capped at three despite stacked bonuses', () => {
  const state = fresh();
  state.level = 50;
  state.club = 'sky';
  state.deg.business = 2;
  state.fame = 100;
  state.eraBiz = 2;
  state.spirit = 80;
  assert.equal(bizMultiplier(state), 3);
});

test('off-focus degrees take longer and full-time pay is reduced during study', () => {
  const state = fresh();
  state.topField = 'business';
  assert.equal(effYears(state, 'science', 1), 5);
  state.job = 'clerk';
  state.study = { kind: 'deg', field: 'science', lvl: 1, name: 'B.Sc.', end: 100, tuition: 0 };
  processDay(state, 14, () => 0.5);
  assert.equal(state.yIncome, 32_000 / 26 * 0.6);
});

test('a short licence can be taken alongside a degree and a full-time job', () => {
  const state = fresh();
  state.money = 5_000;
  state.job = 'clerk';
  assert.ok(enrollDeg(state, 'business'));
  assert.ok(enrollLic(state, 'car'));
  assert.equal(state.study?.kind, 'deg');
  assert.equal(state.sideStudy?.id, 'car');
  assert.equal(studyWorkMult(state), 0.6);
  assert.equal(enrollLic(state, 'moto'), null);
});

test('two degrees in different fields can progress together and have separate tuition', () => {
  const state = fresh();
  assert.ok(enrollDeg(state, 'business'));
  assert.ok(enrollDeg(state, 'engineering'));
  assert.equal(state.study?.field, 'business');
  assert.equal(state.sideStudy?.field, 'engineering');
  assert.equal(studyTuition(state), 11_000);
  assert.equal(enrollDeg(state, 'science'), null);
});

test('cross-disciplinary degrees unlock their matching careers', () => {
  const state = fresh();
  state.deg.engineering = 1;
  state.deg.arts = 1;
  state.deg.business = 1;
  state.deg.medicine = 1;
  assert.equal(meets(state, { deg: { engineering: 1, arts: 1 } }), true);
  assert.equal(meets(state, { deg: { business: 1, medicine: 1 } }), true);
  assert.equal(meets(state, { deg: { science: 2, medicine: 1 } }), false);
});

test('one full-time and one part-time role can be held together', () => {
  const state = fresh();
  assert.ok(hire(state, 'clerk'));
  assert.ok(hire(state, 'part'));
  assert.equal(jobIncome(state), 43_000);
  assert.match(hire(state, 'teacher') || '', /Quit Office clerk first/);
  state.study = { kind: 'deg', field: 'science', lvl: 1, name: 'B.Sc.', end: 100, tuition: 0 };
  assert.equal(jobIncome(state), 32_000 * 0.6 + 11_000);
});

test('faith selection is saved and its suggested practice can be performed', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 1992, nation: 'Vietnam', religion: 'buddhism', ints: [], tals: [] });
  state.money = 500;
  const result = doWell(state, 'faithPractice', key => key);
  assert.equal(state.religion, 'buddhism');
  assert.equal(state.money, 250);
  assert.equal(state.spirit, 21);
  assert.equal(state.karma, 2);
  assert.equal(result, 'sp.faithDone');
});

test('health warnings recommend rest, sleep, and diet according to current state', () => {
  const state = fresh();
  state.health = 35;
  state.sleepHours = 5;
  assert.deepEqual(healthWarnings(state), ['low', 'sleep', 'diet']);
  state.health = 80;
  state.sleepHours = 8;
  state.diet = true;
  assert.deepEqual(healthWarnings(state), []);
});

test('primary and evening courses complete independently', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] });
  state.day = 59;
  state.lastDay = 59;
  state.age = 18 + 59 / 365.25;
  state.study = { kind: 'deg', field: 'business', lvl: 1, name: 'BBA', end: 60, tuition: 0 };
  state.sideStudy = { kind: 'lic', id: 'car', name: "Driver's licence", end: 60, tuition: 0 };
  tick(state, DAY_MS, () => 0.99);
  assert.equal(state.deg.business, 1);
  assert.equal(state.lic.car, true);
  assert.equal(state.study, null);
  assert.equal(state.sideStudy, null);
  assert.ok(state.timeline.at(-1)?.entries.some(entry => entry.includes('Completed:')));
});

test('parallel degrees both graduate and count toward their own fields', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] });
  state.day = 59;
  state.lastDay = 59;
  state.age = 18 + 59 / 365.25;
  state.study = { kind: 'deg', field: 'business', lvl: 1, name: 'BBA', end: 60, tuition: 0 };
  state.sideStudy = { kind: 'deg', field: 'engineering', lvl: 1, name: 'B.Eng', end: 60, tuition: 0 };
  tick(state, DAY_MS, () => 0.99);
  assert.equal(state.deg.business, 1);
  assert.equal(state.deg.engineering, 1);
  assert.equal(state.study, null);
  assert.equal(state.sideStudy, null);
});

test('short sleep speeds study but increases health decline and appears in daily timeline', () => {
  const state = fresh();
  state.sleepHours = 4;
  state.study = { kind: 'deg', field: 'business', lvl: 1, name: 'BBA', end: 100, tuition: 0 };
  processDay(state, 1, () => 0.5);
  assert.equal(state.study.end, 100 - (studyPace(4) - 1));
  assert.ok(sleepHealthMult(4) > sleepHealthMult(8));
  assert.match(state.timeline[0].entries[0], /4h sleep/);
  assert.match(state.timeline[0].entries[0], /Study: BBA/);
});

test('personal, business, and space assets share annual market depreciation', () => {
  const state = fresh();
  state.day = 365.25;
  state.lots.push({ id: 'w-tag', paid: 1_000, day: 0, condition: 100 });
  state.lots.push({ id: 'ph-iphone', paid: 1_000, day: 0, condition: 100 });
  state.branches.cafe = [{ r: 0, mood: 1, paid: 1_000, day: 0 }];
  // v10.5: lotValue now applies a rarity premium. w-tag (lux 25 → uncommon)
  // gets a 1.05 multiplier on top of the depreciation → 945.
  assert.equal(lotValue(state, state.lots[0]), 945);
  // ph-iphone (lux 4 → common) gets no rarity premium → 650.
  assert.equal(lotValue(state, state.lots[1]), 650);
  assert.equal(bizVal(state), 900);
  assert.equal(ASSET_DEPRECIATION_RATE, -0.1);
});

test('legacy saves migrate to the current schema and backfill asset purchase dates', () => {
  const state = migrate({
    day: 100,
    branches: { cafe: [{ r: 0, mood: 1 }] },
    farm: { crop: 1 },
  });
  assert.equal(state.schemaVersion, 4);
  assert.deepEqual(state.ach, []);
  assert.equal(state.branches.cafe[0].day, 100);
  assert.equal(state.farmBought.crop, 100);
});

test('version two saves gain religion defaults and preserve part-time employment', () => {
  const state = migrate({ schemaVersion: 2, job: 'part' });
  assert.equal(state.religion, 'none');
  assert.equal(state.job, null);
  assert.equal(state.sideJob, 'part');
  assert.equal(state.schemaVersion, 4);
});

test('space travel certification completes after its waiting period', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 2007, nation: 'Vietnam', ints: [], tals: [] });
  state.level = 12;
  state.space.orbital = 1;
  state.money = SPACE_TRAVEL_COST;
  state.space.orbital = 1;
  assert.equal(startSpaceUpgrade(state), 'Deep-space navigation program started. Check back in one year.');
  const before = spaceIncome(state);
  tick(state, 365 * DAY_MS, () => 0.99);
  assert.equal(state.spaceTravel, true);
  assert.equal(state.spaceUpgrade, null);
  assert.equal(spaceIncome(state), before * 1.2);
});

test('tick produces repeatable state changes with the same seed', () => {
  const stateA = fresh(), stateB = fresh();
  const options = { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] };
  begin(stateA, options);
  begin(stateB, options);
  const rngA = seeded(1234), rngB = seeded(1234);
  for (let i = 0; i < 400; i++) {
    tick(stateA, 20_000, rngA);
    tick(stateB, 20_000, rngB);
  }
  assert.deepEqual(stateA, stateB);
});

test('achievements unlock exactly once as conditions are met', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 2007, nation: 'Vietnam', ints: [], tals: [] });
  // nothing unlocked yet
  assert.deepEqual(checkAch(state), []);
  assert.equal(state.ach.length, 0);
  // first job contract
  state.job = 'barista';
  assert.deepEqual(checkAch(state), ['firstJob']);
  // first business — job achievement must not repeat
  state.biz.cafe = 1;
  assert.deepEqual(checkAch(state), ['firstBiz']);
  // net worth thresholds unlock in cascade
  state.money = 1_100_000;
  assert.deepEqual(checkAch(state), ['mill']);
  // already unlocked stays unlocked and stable
  assert.deepEqual(checkAch(state), []);
  assert.equal(state.ach.length, 3);
});

test('mid-life milestones map to the right achievement ids', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 2007, nation: 'Vietnam', ints: [], tals: [] });
  state.ownClub = 'own';
  state.married = true;
  state.karma = 55;
  state.social.followers = 1_500_000;
  state.social.verified = true;
  const got = checkAch(state);
  assert.ok(got.includes('clubOwner'));
  assert.ok(got.includes('married'));
  assert.ok(got.includes('karma50'));
  assert.ok(got.includes('millionFans'));
  assert.ok(got.includes('verified'));
  assert.equal(got.length, 5);
  // space venture + certification — the venture also counts toward net worth,
  // so the $1M/$10M net-worth achievements unlock in the same pass
  state.space.orbital = 1;
  state.spaceTravel = true;
  const more = checkAch(state);
  assert.ok(more.includes('space1'));
  assert.ok(more.includes('travel'));
  assert.ok(more.includes('mill'));
  assert.ok(more.includes('decamill'));
  assert.equal(state.ach.length, 9);
});

test('v3 saves gain an empty achievement list without touching progress', () => {
  const state = migrate({ schemaVersion: 3, money: 5_000, level: 7 });
  assert.deepEqual(state.ach, []);
  assert.equal(state.money, 5_000);
  assert.equal(state.level, 7);
  assert.equal(state.schemaVersion, 4);
});
