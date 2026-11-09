import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_DEPRECIATION_RATE, DAY_MS, GIGS } from './gameData';
import {
  bankOp, bizMultiplier, begin, bizVal, effYears, enrollDeg, enrollLic, fresh, gigPay,
  lotValue, migrate, processDay, sleepHealthMult, studyPace, studyWorkMult,
  SPACE_TRAVEL_COST, spaceIncome, startSpaceUpgrade, taxOf, tick, trade,
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
  assert.equal(state.yIncome - before, 30);
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
  state.lots.push({ id: 'w-tag', paid: 1_000, day: 0 });
  state.lots.push({ id: 'ph-iphone', paid: 1_000, day: 0 });
  state.branches.cafe = [{ r: 0, mood: 1, paid: 1_000, day: 0 }];
  assert.equal(lotValue(state, state.lots[0]), 900);
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
  assert.equal(state.schemaVersion, 2);
  assert.equal(state.branches.cafe[0].day, 100);
  assert.equal(state.farmBought.crop, 100);
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
