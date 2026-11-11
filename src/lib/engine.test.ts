import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_DEPRECIATION_RATE, DAY_MS, GIGS, YEAR_EVENTS, BIZ, NPCS } from './gameData';
import {
  addPost, bankOp, bizMultiplier, begin, bizVal, checkAch, doGig, effYears, enrollDeg, enrollLic, fresh, gigPay,
  lotValue, migrate, processDay, sleepHealthMult, sleepHealthRecovery, sleepDebtStudyMult, sleepDebtHealthMult, studyPace, studyWorkMult,
  SPACE_TRAVEL_COST, spaceIncome, startSpaceUpgrade, taxOf, tick, trade,
  doWell, effWellCd, wellLeft, wellReady, TREAT_COST, TREAT_CD, GYM_CD, GYM_COST, GYM_HP, WELL, healthWarnings, hire, jobIncome, meets, POST_COOLDOWN_DAYS, studyTuition,
  // v11.2 — crisis + market research exports
  effEraBiz, effEraFac, effLoanRate, effRisk, effDemand, researchCost, researchMarket,
  // v11.49 — Portfolio Dashboard helpers
  recordTx, portfolioRealizedGains, portfolioUnrealizedGains, portfolioInvested, portfolioIncome, portfolioROI, stockROI, cashFlowLastDays,
  buyItem, sellLot, buySpace,
  // v11.50 — brand customization + NPC reactions
  setBizBrand, bizBrandOf, generateNpcReactions, openBranch, franchiseBranch, FRANCHISE_FEE_MULT, FRANCHISE_ROYALTY,
  // v11.53 — Finance Overview helpers
  yearExpenses, incomeBreakdown, expenseBreakdown, assetBreakdown, financeActions,
  // v12 — player UID generator (regression test for the new UID field)
  genUid,
  // v12.2 — AI event difficulty + risk-roll helpers
  rollRiskOutcome, choiceRisk, applyAIChoice, normaliseDifficulty, type AiDifficulty,
  dateOf, worldYear, type GameState, type Transaction,
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
  // v11.19: TECH base price raised from $100 → $230. Bump cash accordingly
  // so 3 × TECH = $690 fits, and the sell-back yields $690 (was $300).
  state.money = 1000;
  assert.deepEqual(trade(state, 'TECH', 'buy', 3), { ok: true, msg: 'Bought 3 × TECH' });
  assert.equal(state.stk.TECH, 3);
  assert.equal(trade(state, 'TECH', 'buy', 100).ok, false);
  assert.equal(trade(state, 'TECH', 'sell', 99).msg, 'Sold 3 × TECH for $690');
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

// v11.29 — the 30-day check-up lock must melt away when health collapses.
test('v11.29: check-up cooldown adapts to health — urgent care within a day', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] });
  state.money = 10_000;
  // healthy → routine 45-day cooldown (v11.57: was 30, increased per user request)
  state.health = 80;
  assert.equal(effWellCd(state, 'checkup'), 45);
  doWell(state, 'checkup', k => k); // 80 + 15 = 95
  assert.equal(state.health, 95);
  assert.equal(wellLeft(state, 'checkup'), 45);
  assert.equal(wellReady(state, 'checkup'), false);
  // run down (<60) → cooldown shrinks to 7 days
  state.health = 55;
  assert.equal(effWellCd(state, 'checkup'), 7);
  assert.equal(wellLeft(state, 'checkup'), 7);
  state.lastDay += 7;
  assert.equal(wellReady(state, 'checkup'), true);
  doWell(state, 'checkup', k => k); // 55 + 15 = 70
  assert.equal(state.health, 70);
  // critical (<35) → the doctor sees you every single day
  state.health = 20;
  assert.equal(effWellCd(state, 'checkup'), 1);
  assert.equal(wellLeft(state, 'checkup'), 1);
  state.lastDay += 1;
  assert.equal(wellReady(state, 'checkup'), true);
  doWell(state, 'checkup', k => k); // 20 + 15 = 35
  assert.equal(state.health, 35);
});

test('v11.29: medical treatment heals deep and keeps its own short cooldown', () => {
  const state = fresh();
  begin(state, { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] });
  state.money = 10_000;
  state.health = 30;
  const r = doWell(state, 'treat', k => k);
  assert.equal(r, 'hp.treatDone');
  assert.equal(state.health, 75, 'treatment heals +45');
  assert.equal(state.money, 10_000 - TREAT_COST);
  assert.equal(wellLeft(state, 'treat'), TREAT_CD);
  state.lastDay += TREAT_CD - 1;
  assert.equal(wellReady(state, 'treat'), false);
  state.lastDay += 1;
  assert.equal(wellReady(state, 'treat'), true);
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
  // v12 — begin() assigns a non-deterministic uid (Date.now + Math.random),
  // so the two states diverge on that field alone. Overwrite to a fixed value
  // before the deepEqual — the assertion is about tick() determinism, not
  // UID generation (which has its own dedicated v12 genUid test below).
  stateA.uid = 'uid-test-fixed';
  stateB.uid = 'uid-test-fixed';
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

// ================= v11.2 — real events affecting market =================
// Tests cover: crisis lifecycle (start / persist / clear), shock delay,
// effective helper composition (eraBiz * crisis), researchMarket noise
// model, and migrate() backfill of the new crisis/shocks/research fields.
//
// Note on time math: engine DAY_MS (20000) is real-seconds-per-game-day, used
// for tick conversion. dateOf() uses wall-clock ms (864e5) per day, so the
// helper below converts a calendar date to a game-day number via 864e5.

const MS_PER_DAY = 864e5;
const dayOfYear = (s: GameState, y: number, m = 0, dom = 1) =>
  Math.floor((Date.UTC(y, m, dom) - Date.UTC(s.byear + 18, 8, 1)) / MS_PER_DAY);

test('v11.2: 1929 starts a 3-year crisis with biz .7, rates 1.6, risk .10', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1900, nation: 'United States', ints: ['money'], tals: ['math'] });
  // Fast-forward to Jan 1 1929: base = Date.UTC(1918, 8, 1); game-day for Jan 1 1929.
  const jan1_1929 = dayOfYear(state, 1929);
  state.lastDay = jan1_1929 - 1; state.day = jan1_1929;
  processDay(state, jan1_1929, () => 0.5);
  assert.ok(state.crisis, 'crisis should be active after 1929 fires');
  assert.equal(state.crisis!.biz, 0.7);
  assert.equal(state.crisis!.rates, 1.6);
  assert.equal(state.crisis!.risk, 0.10);
  assert.equal(state.crisis!.demand, 0.8);
  assert.equal(state.crisis!.yearsLeft, 3);
  assert.equal(state.crisis!.startYear, 1929);
  // effEraBiz in the trigger year = eraBiz(1) * crisis.biz(0.7) = 0.7
  assert.equal(effEraBiz(state), 0.7);
  // effLoanRate = LOAN_RATE * crisis.rates
  assert.ok(effLoanRate(state) > 0.09, `expected rate >9% during 1929, got ${effLoanRate(state)}`);
  // effRisk returns the additive closure modifier
  assert.equal(effRisk(state), 0.10);
  assert.equal(effDemand(state), 0.8);
});

test('v11.2: crisis persists across Jan 1 ticks and clears after `lasts` years', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1900, nation: 'United States', ints: [], tals: [] });
  // Manually start a 3-year crisis (don't depend on RNG/timing of 1929 fire)
  state.crisis = {
    cause: 'Wall Street Crash', biz: 0.7, fac: 1, rates: 1.6, risk: 0.10, demand: 0.8,
    yearsLeft: 3, startYear: 1929,
  };
  // Helper: simulate one Jan-1 processDay tick. base year 1918; Jan 1 of year Y.
  const jan1 = (y: number) => dayOfYear(state, y);
  // Year 1930: tick crisis → yearsLeft 2, still active
  state.lastDay = jan1(1930) - 1; state.day = jan1(1930);
  processDay(state, jan1(1930), () => 0.5);
  assert.ok(state.crisis, 'crisis still active in 1930');
  assert.equal(state.crisis!.yearsLeft, 2);
  assert.equal(effEraBiz(state), 0.7);
  // Year 1931: tick crisis → yearsLeft 1, still active; 1931 YearEvent replaces it with its own (dep .7, biz .85, lasts 2)
  state.lastDay = jan1(1931) - 1; state.day = jan1(1931);
  processDay(state, jan1(1931), () => 0.5);
  assert.ok(state.crisis, 'crisis active in 1931 (1931 YearEvent replaces the 1929 one)');
  assert.equal(state.crisis!.biz, 0.85, `1931 should override biz with 0.85, got ${state.crisis!.biz}`);
  assert.equal(state.crisis!.yearsLeft, 2);
  // Year 1932: tick crisis → yearsLeft 1
  state.lastDay = jan1(1932) - 1; state.day = jan1(1932);
  processDay(state, jan1(1932), () => 0.5);
  assert.ok(state.crisis, 'crisis still active in 1932');
  assert.equal(state.crisis!.yearsLeft, 1);
  // Year 1933: tick crisis → yearsLeft 0, cleared
  state.lastDay = jan1(1933) - 1; state.day = jan1(1933);
  processDay(state, jan1(1933), () => 0.5);
  assert.equal(state.crisis, null, 'crisis cleared in 1933');
  assert.equal(effEraBiz(state), 1);
});

test('v11.2: stock shocks split into instant + 30-day delayed; net = original multiplier', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1900, nation: 'United States', ints: [], tals: [] });
  // Capture original prices
  const orig: Record<string, number> = {};
  for (const k of Object.keys(state.prices)) orig[k] = state.prices[k];
  // Fire 1929 (which has stk: { '*': .5 }) by landing on Jan 1 1929
  const jan1_1929 = dayOfYear(state, 1929);
  state.lastDay = jan1_1929 - 1; state.day = jan1_1929;
  processDay(state, jan1_1929, () => 0.5);
  // After Jan 1: stocks should have dropped by sqrt(0.5) ≈ 0.7071 (instant slice)
  for (const k of Object.keys(state.prices)) {
    const ratio = state.prices[k] / orig[k];
    assert.ok(Math.abs(ratio - Math.sqrt(0.5)) < 1e-6,
      `expected instant slice sqrt(0.5) for ${k}, got ratio ${ratio}`);
  }
  // A delayed shock should be queued for day = lastDay + 30
  assert.equal(state.shocks.length, 1, 'one delayed shock queued');
  assert.equal(state.shocks[0].day, state.lastDay + 30);
  // Fast-forward 30 days to fire the delayed shock
  const fireDay = state.lastDay + 30;
  state.lastDay = fireDay; state.day = fireDay;
  processDay(state, fireDay, () => 0.5);
  // Net should be 0.5 (instant 0.7071 * delayed 0.7071 = 0.5).
  // v11.24 tolerance: the daily price walk now adds a small mean-reversion
  // pull toward the listing price (≤1.2% of the deviation from listing per
  // game-day → ≤0.35% here, since ratio deviates ~0.29 from 1.0). With the
  // seeded rng()=0.5 the random component is exactly 0, so the drift is
  // purely the reversion pull — assert within 0.5% of the exact 0.5 net.
  for (const k of Object.keys(state.prices)) {
    const ratio = state.prices[k] / orig[k];
    assert.ok(Math.abs(ratio - 0.5) < 0.005,
      `expected net 0.5 for ${k} after delayed shock, got ${ratio}`);
  }
  // Shock queue should be drained
  assert.equal(state.shocks.length, 0);
});

test('v11.2: researchMarket returns current crisis + next-year outlook, applies noise', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'United States', ints: ['money'], tals: ['math'] });
  state.money = 100_000;
  // Set an active crisis so the brief has something to report
  state.crisis = {
    cause: 'Global financial crisis', biz: 0.8, fac: 1, rates: 1.6, risk: 0.10, demand: 0.8,
    yearsLeft: 2, startYear: 2008,
  };
  // Force year 2008 so "next year" is 2009 (no event expected → false-positive or calm)
  // We need worldYear(s) to return 2008. base = byear+18 = 2008; day 0 = Sep 1 2008. worldYear returns the year of dateOf(s.lastDay).
  state.lastDay = 0; state.day = 0; // Sep 1 2008
  assert.equal(worldYear(state), 2008);
  // Use deterministic rng = 0.5 (true positive threshold for actual events is roll > 0.15;
  // 0.5 > 0.15, so if there were a real 2009 event it would be reported. 2009 has none → fall to else branches)
  const result = researchMarket(state, () => 0.5);
  assert.equal(result.ok, true);
  assert.ok(result.lines.length >= 2, 'brief should have header + crisis summary');
  assert.ok(result.lines.some(l => l.includes('Global financial crisis')), 'crisis named in brief');
  assert.ok(result.lines.some(l => l.includes('Loan rates 60% above normal')), 'rate hit reported');
  assert.ok(result.lines.some(l => l.includes('Branch closure risk +10%')), 'closure risk reported');
  assert.ok(result.lines.some(l => l.includes('Consumer demand 20% below normal')), 'demand hit reported');
  assert.ok(result.lines.some(l => l.includes('Business climate 20% depressed')), 'biz hit reported');
  // Money was deducted
  assert.ok(state.money < 100_000);
  // Brief cached
  assert.ok(state.researchBrief);
  assert.equal(state.researchBrief, result.lines);
});

test('v11.2: researchMarket predicts 2020 crisis when researching in 2019 (true positive)', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'Vietnam', ints: ['money'], tals: [] });
  state.money = 100_000;
  // Year 2019 → next year is 2020 (which has a YearEvent)
  state.byear = 2001; // base = 2019 = byear + 18
  state.lastDay = 0; state.day = 0;
  assert.equal(worldYear(state), 2019);
  // rng = 0.99 > 0.15 → true positive: should report the 2020 event
  const result = researchMarket(state, () => 0.99);
  assert.equal(result.ok, true);
  assert.ok(result.lines.some(l => l.includes('Outlook 2020:')), 'outlook line for 2020 present');
  assert.ok(result.lines.some(l => l.includes('COVID-19')), '2020 message leaked');
  // But rng = 0.05 < 0.15 → false negative: should say "no major event expected"
  const result2 = researchMarket(state, () => 0.05);
  assert.equal(result2.ok, true);
  assert.ok(result2.lines.some(l => l.includes('no major event expected') || l.includes('rumours of a market shock')),
    'false negative or no event line');
});

test('v11.2: researchMarket false positive fires ~10% of the time when no real event', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'Vietnam', ints: ['money'], tals: [] });
  state.money = 1_000_000;
  // Year 2017 → next year is 2018 (no YearEvent)
  state.byear = 1999; state.lastDay = 0; state.day = 0;
  assert.equal(worldYear(state), 2017);
  // rng = 0.05 < 0.10 → false positive
  const r1 = researchMarket(state, () => 0.05);
  assert.ok(r1.lines.some(l => l.includes('rumours of a market shock')), 'false positive reported');
  // rng = 0.5 → no false positive, no real event → calm
  const r2 = researchMarket(state, () => 0.5);
  assert.ok(r2.lines.some(l => l.includes('no major event expected')), 'calm outlook reported');
});

test('v11.2: researchCost scales with the modern era (cheap before 1990, rises after)', () => {
  const state1920 = fresh();
  begin(state1920, { name: 'T', byear: 1900, nation: 'Vietnam', ints: [], tals: [] });
  state1920.lastDay = 0; state1920.day = 0;
  assert.equal(worldYear(state1920), 1918);
  assert.equal(researchCost(state1920), 2000); // (1918 - 1990) clamped to 0
  const state2010 = fresh();
  begin(state2010, { name: 'T', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  state2010.lastDay = 0; state2010.day = 0;
  assert.equal(worldYear(state2010), 2008);
  // (2008 - 1990)/10 = 1.8 → 2000 + 500*1.8 = 2900
  assert.equal(researchCost(state2010), 2900);
});

test('v11.2: migrate() backfills the new crisis/shocks/research fields on old saves', () => {
  const state = migrate({
    schemaVersion: 4, money: 5_000, level: 7,
    // No crisis/shocks/lastResearchDay/researchBrief on the old save
  });
  assert.equal(state.crisis, null);
  assert.deepEqual(state.shocks, []);
  assert.equal(state.lastResearchDay, 0);
  assert.equal(state.researchBrief, null);
});

test('v11.2: researchMarket refuses when player has insufficient funds', () => {
  const state = fresh();
  begin(state, { name: 'Broke', byear: 1990, nation: 'Vietnam', ints: [], tals: [] });
  state.money = 100;
  const result = researchMarket(state, () => 0.5);
  assert.equal(result.ok, false);
  assert.equal(state.researchBrief, null, 'brief not cached on failed research');
});

test('v11.2: effEraBiz/effEraFac fall back to eraBiz when no crisis (old saves)', () => {
  const state = fresh();
  state.eraBiz = 1.3; state.eraFac = 1.5;
  assert.equal(effEraBiz(state), 1.3, 'no crisis → eff = eraBiz');
  assert.equal(effEraFac(state), 1.5);
  assert.equal(effRisk(state), 0);
  assert.equal(effDemand(state), 1);
  // And effLoanRate is just LOAN_RATE (no crisis multiplier)
  assert.ok(effLoanRate(state) < 0.07, `expected LOAN_RATE ~6%, got ${effLoanRate(state)}`);
});

// v11.24 — the market no longer sleeps. Previously STOCKS[].vol was dead code
// and s.hist was never appended, so prices were flat outside year shocks.
// Now processDay walks each price daily (±vol, mean-reverting, clamped) and
// appends history. Regression test: 40 game-days of play must move prices
// AND grow the sparkline history, while staying inside the clamp band.
test('v11.24: daily price walk moves prices + appends hist (market no longer flat)', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'United States', ints: [], tals: [] });
  let seed = 0.123;
  const rng = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const startPrice = state.prices.TECH;
  const startHistLen = state.hist.TECH.length;
  for (let d = 0; d < 40; d++) {
    state.lastDay = d; state.day = d;
    processDay(state, d, rng);
  }
  assert.ok(state.hist.TECH.length > startHistLen,
    `expected hist appended (start ${startHistLen} → ${state.hist.TECH.length})`);
  assert.ok(state.hist.TECH.length <= 60, 'hist capped at 60 points');
  const ratio = state.prices.TECH / startPrice;
  assert.ok(Math.abs(ratio - 1) > 0.001, `expected TECH to move, ratio=${ratio}`);
  assert.ok(ratio >= 0.25 && ratio <= 6, `expected TECH inside clamp band, ratio=${ratio}`);
});

// ---------- v11.26 — gigs drain health (work is tiring; ad gig = anti-spam) ----------

test('v11.26: every gig drains health by its hp field and queues a toast', () => {
  const state = fresh();
  state.health = 100;
  // v11.37 — unlock ALL gigs: every degree field + high followers + 2 degrees for 'speaking'
  state.deg.business = 1;          // unlocks tutor ({any:1}) + consult ({deg:{business:1}})
  state.deg.arts = 1;             // unlocks busk ({deg:{arts:1}})
  state.deg.engineering = 1;      // unlocks coding ({deg:{engineering:1}})
  state.deg.medicine = 1;         // unlocks medical ({deg:{medicine:1}})
  state.deg.science = 2;          // 'speaking' needs any:2 (a degree at level ≥2)
  state.social.followers = 15000; // unlocks sponsored(1K) + photoshoot(500) + endorsement(10K) + speaking(5K)
  const hpSum = GIGS.reduce((a, g) => a + (g.hp || 0), 0);
  assert.ok(hpSum > 0, 'GIGS must define hp costs');
  const before = state.money;
  for (const g of GIGS) assert.ok(doGig(state, g.id), 'gig ' + g.id + ' should run');
  assert.ok(Math.abs(state.health - (100 - hpSum)) < 1e-9, `health ${state.health} != ${100 - hpSum}`);
  assert.ok(state.money > before);
  assert.equal(state.pendingToasts.length, GIGS.length);
});

test('v11.26: watching an ad costs exactly 0.5 health and still pays', () => {
  const state = fresh();
  state.health = 80;
  const pay = doGig(state, 'ad');
  assert.ok(pay && pay.startsWith('+'));
  assert.equal(state.health, 79.5);
});

test('v11.26: gig health floors at zero — a gig can never push health negative', () => {
  const state = fresh();
  state.health = 0.4;
  assert.ok(doGig(state, 'ad'));
  assert.equal(state.health, 0);
});

test('v11.26: spamming the no-cooldown ad gig drains health cumulatively (anti-spam valve)', () => {
  const state = fresh();
  state.health = 100;
  for (let i = 0; i < 20; i++) assert.ok(doGig(state, 'ad'), 'ad watch ' + i);
  assert.equal(state.health, 90);
});

test('v11.26: gig health toast carries the localised key when t() is injected', () => {
  const state = fresh();
  doGig(state, 'ad', k => k);
  assert.equal(state.pendingToasts[0], '💢 gig.healthCost');
  // without a t() the engine falls back to a plain readable string
  const s2 = fresh();
  doGig(s2, 'ad');
  assert.equal(s2.pendingToasts[0], '💢 ad: health -0.5');
});

test('v11.26: grinding health to 0 ends the game with cause=health on the next day tick', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'United States', ints: [], tals: [] });
  state.health = 0.2;
  assert.ok(doGig(state, 'delivery'));
  assert.equal(state.health, 0);
  const out = tick(state, DAY_MS, () => 0.5);
  assert.ok(state.over, 'game should be over at 0 health');
  assert.equal(state.cause, 'health');
  assert.ok(out.gameJustOver);
});

test('v11.20 regression: hype and charity posts still cost health, plain posts do not', () => {
  const state = fresh();
  state.health = 100;
  addPost(state, 'plain update', 1);
  assert.equal(state.health, 100);
  state.lastDay += POST_COOLDOWN_DAYS;
  addPost(state, 'hype', 1.6);
  assert.ok(Math.abs(state.health - 99.4) < 1e-9, `health after hype = ${state.health}`);
  state.lastDay += POST_COOLDOWN_DAYS;
  addPost(state, 'charity', 1.4);
  assert.ok(Math.abs(state.health - 99.1) < 1e-9, `health after charity = ${state.health}`);
});

// ================= v11.28 — timed marketplace (auction + listings) =================
import { addLot, putUpAuction, postSaleListing, cancelMarketJob, resolveMarket, marketVal, sellChanceOf, AUCTION_FEE, LISTING_FEE, netWorth } from './engine';
import { ITEMS, RARITY_MULT, itemRarity } from './gameData';

test('v11.28: putting an item up for auction removes it from inventory, charges the 3% fee and creates a 4–7 day job', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  const est = lotValue(state, state.lots[0]);
  const rar = itemRarity(ITEMS[0]);
  const moneyBefore = state.money;
  const msg = putUpAuction(state, 'lot', 0, undefined, seeded(7));
  assert.ok(msg, 'putUpAuction should succeed with enough cash');
  assert.equal(state.lots.length, 0, 'item leaves the inventory while at the auction house');
  assert.equal(state.mkt.length, 1);
  const j = state.mkt[0];
  assert.equal(j.kind, 'auction');
  assert.equal(j.src, 'lot');
  assert.equal(j.ask, Math.round(est * RARITY_MULT[rar] * 1.4));
  assert.equal(j.fee, Math.round(j.ask * AUCTION_FEE));
  assert.equal(state.money, moneyBefore - j.fee, 'only the upfront fee is charged at listing time');
  const days = j.endDay - j.startDay;
  assert.ok(days >= 4 && days <= 7, `auction window 4–7 days, got ${days}`);
});

test('v11.28: a fixed-price sale listing charges the smaller 1.5% fee and runs 8–12 days', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  const est = lotValue(state, state.lots[0]);
  const rar = itemRarity(ITEMS[0]);
  const moneyBefore = state.money;
  assert.ok(postSaleListing(state, 'lot', 0, undefined, seeded(7)));
  const j = state.mkt[0];
  assert.equal(j.kind, 'listing');
  assert.equal(j.ask, Math.round(est * RARITY_MULT[rar] * 1.4));
  assert.equal(j.fee, Math.round(j.ask * LISTING_FEE));
  assert.ok(j.fee < Math.round(j.ask * AUCTION_FEE), 'listing fee is half the auction fee');
  assert.equal(state.money, moneyBefore - j.fee);
  const days = j.endDay - j.startDay;
  assert.ok(days >= 8 && days <= 12, `listing window 8–12 days, got ${days}`);
});

test('v11.28: an auction with bids sells above the ask and pays proceeds (forced rng)', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  const est = lotValue(state, state.lots[0]);
  assert.ok(putUpAuction(state, 'lot', 0, undefined, () => 0.01)); // every roll hits: 4-day window, bid every day
  const j = state.mkt[0];
  state.day = j.endDay; // jump past the window
  const moneyBefore = state.money;
  resolveMarket(state, k => k, () => 0.01);
  assert.equal(state.mkt.length, 0, 'job resolves off the board');
  assert.ok(state.money > moneyBefore, 'proceeds land in cash');
  const expected = Math.round(j.ask * (0.95 + 0.01 * 0.45) * (1 - 0.03));
  assert.equal(state.money, moneyBefore + expected);
  assert.ok(j.bids >= 1);
  assert.ok(state.pendingToasts.some(x => x.includes('mkt.soldAuction')), JSON.stringify(state.pendingToasts));
});

test('v11.28: an auction with no bids returns the item and forfeits the fee (forced rng)', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  const est = lotValue(state, state.lots[0]);
  const moneyBefore = state.money;
  assert.ok(putUpAuction(state, 'lot', 0, undefined, () => 0.99)); // no day hits the bid chance
  const fee = state.mkt[0].fee;
  assert.equal(state.money, moneyBefore - fee);
  state.day = state.mkt[0].endDay;
  resolveMarket(state, k => k, () => 0.99);
  assert.equal(state.mkt.length, 0);
  assert.equal(state.lots.length, 1, 'unsold item comes back to the inventory');
  assert.equal(state.money, moneyBefore - fee, 'fee is gone forever');
  assert.ok(state.pendingToasts.some(x => x.includes('mkt.noBuyer')));
  assert.ok(Math.abs(lotValue(state, state.lots[0]) - est) < est * 0.005, 'returned item keeps its value (7 days of natural ageing < 0.5%)');
});

test('v11.28: a listing sells exactly at the ask when a buyer shows up', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  assert.ok(postSaleListing(state, 'lot', 0, undefined, () => 0.01)); // 8-day window, buyer every day
  const j = state.mkt[0];
  state.day = j.endDay;
  const moneyBefore = state.money;
  resolveMarket(state, k => k, () => 0.01);
  const expected = Math.round(j.ask * (1 - 0.03));
  assert.equal(state.money, moneyBefore + expected, 'listing pays the fixed ask (minus the 3% sale fee), no bidding war');
  assert.ok(state.pendingToasts.some(x => x.includes('mkt.soldListing')));
});

test('v11.28: listed items keep counting toward net worth at their ordinary value', () => {
  const state = fresh();
  state.money = 100_000;
  state.bank = { dep: 5_000, loan: 0 };
  addLot(state, ITEMS[0].id);
  const nwBefore = netWorth(state);
  assert.ok(putUpAuction(state, 'lot', 0, undefined, seeded(3)));
  // money dropped by the fee, but marketVal adds the item's est back — net
  // worth only moves by the fee, never by the item's full value.
  assert.equal(netWorth(state), nwBefore - state.mkt[0].fee);
  assert.equal(marketVal(state), state.mkt[0].est);
});

test('v11.28: cancelling a market job returns the item and forfeits the fee', () => {
  const state = fresh();
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  assert.ok(putUpAuction(state, 'lot', 0, undefined, seeded(11)));
  const fee = state.mkt[0].fee;
  const moneyWhileListed = state.money;
  assert.equal(cancelMarketJob(state, 0, k => k), 'mkt.cancelled');
  assert.equal(state.mkt.length, 0);
  assert.equal(state.lots.length, 1, 'item comes home');
  assert.equal(state.money, moneyWhileListed, 'no refund — the fee was already taken');
  assert.ok(fee > 0);
  assert.ok(state.log.some(x => x.includes('Withdrew')), 'withdrawal is logged');
});

test('v11.28: tick() resolves finished market jobs and queues a localised toast', () => {
  const state = fresh();
  begin(state, { name: 'Tycoon', byear: 1990, nation: 'United States', ints: [], tals: [] });
  state.money = 100_000;
  addLot(state, ITEMS[0].id);
  assert.ok(putUpAuction(state, 'lot', 0, undefined, () => 0.99)); // 7-day window, zero bids
  assert.ok(tick(state, 8 * DAY_MS, () => 0.99, k => k).toasts?.some(x => x.includes('mkt.noBuyer')));
  assert.equal(state.mkt.length, 0);
  assert.equal(state.lots.length, 1);
});

test('v11.28: sellChanceOf is the exact binomial chance of >=1 buyer over the window', () => {
  // legendary draws ~22%/day at auction: 1-(1-.22)^5 ≈ 71% on a 5-day window
  assert.ok(Math.abs(sellChanceOf('legendary', 'auction', 5) - (1 - Math.pow(0.78, 5))) < 1e-12);
  // listings use p×0.75 — steadier but slower
  assert.ok(sellChanceOf('legendary', 'listing', 10) < sellChanceOf('legendary', 'auction', 10));
  assert.ok(sellChanceOf('common', 'auction', 4) < sellChanceOf('legendary', 'auction', 4));
  assert.ok(sellChanceOf('common', 'auction', 1) > 0);
});

// ================= v11.33 — rare-auction circuit + favourites =================
import { placeBidRare, tickRareAuctions, toggleFav } from './engine.js';
import { RARE_ITEMS } from './gameData.js';

test('v11.33: rare auction — schedule, go live, win the bidding war, pay, own it', () => {
  const s = fresh();
  s.started = true;
  s.rareUp = [{ id: RARE_ITEMS[0].id, atDay: s.day + 3 }];
  s.money = 500_000_000;
  // advance past the announcement day: the schedule must convert to a live lot
  s.day += 10;
  tickRareAuctions(s, undefined, seeded(7));
  const live1 = s.rareLive as NonNullable<GameState['rareLive']>;
  assert.ok(live1, 'due announcement must open a live lot');
  assert.equal(live1.id, RARE_ITEMS[0].id);
  // the scheduler may have already queued the NEXT grail announcement in the
  // same tick (cap 2) — that is intended behaviour, just never 3+
  assert.ok(s.rareUp.length <= 2);
  assert.equal(live1.leader, 'npc');
  const L = live1;
  // a bid below current*1.05 is rejected
  assert.ok(placeBidRare(s, L.bid, undefined)!.toLowerCase().includes('low'));
  assert.equal(live1.leader, 'npc');
  // a proper bid takes the lead without moving cash
  const min = Math.ceil(L.bid * 1.05);
  assert.ok(typeof placeBidRare(s, min, undefined) === 'string');
  assert.equal(live1.leader, 'you');
  assert.equal(live1.my, min);
  assert.equal(s.money, 500_000_000, 'no cash moves until the hammer falls');
  // hammer day — the leading player wins and pays exactly their bid
  s.day = live1.endDay;
  const before = s.money;
  tickRareAuctions(s, undefined, seeded(11));
  assert.equal(s.rareLive, null, 'lot resolved');
  assert.equal(s.money, before - min, 'winning charges the final bid');
  assert.ok(s.lots.some(l => l.id === RARE_ITEMS[0].id && l.condition === 100));
});

test('v11.33: rare auction — NPC can strike back and you lose nothing but the lot', () => {
  const s = fresh();
  s.started = true;
  s.money = 5_000_000;
  const it = RARE_ITEMS[2];
  // player leads; find a seed where the first even-day tick outbids them
  s.day = 100; // even → the NPC war-chest acts on this tick
  s.rareLive = { id: it.id, endDay: s.day + 10, bid: 1_000_000, leader: 'you', my: 900_000 };
  let outbid = false;
  for (let seed = 0; seed < 200 && !outbid; seed++) {
    const trial: GameState = { ...s, rareLive: { id: it.id, endDay: 110, bid: 1_000_000, leader: 'you', my: 900_000 } };
    tickRareAuctions(trial, undefined, seeded(seed));
    outbid = (trial.rareLive as NonNullable<GameState['rareLive']>).leader === 'npc';
    if (seed === 199 && !outbid) break;
  }
  // (a seeded rng <0.45 always exists within 200 tries)
  assert.ok(outbid, 'NPC outbid must be reachable');
  // rerun with a working seed deterministically: brute-force on real state
  for (let seed = 0; seed < 200; seed++) {
    s.rareLive = { id: it.id, endDay: 110, bid: 1_000_000, leader: 'you', my: 900_000 };
    tickRareAuctions(s, undefined, seeded(seed));
    if ((s.rareLive as NonNullable<GameState['rareLive']>).leader === 'npc') break;
  }
  const live2 = s.rareLive as NonNullable<GameState['rareLive']>;
  assert.equal(live2.leader, 'npc');
  assert.ok(live2.bid > 900_000, 'NPC raised above the player bid');
  assert.equal(s.money, 5_000_000, 'outbid costs nothing yet');
  // hammer falls with the NPC leading — the player pays nothing, owns nothing
  s.day = live2.endDay;
  tickRareAuctions(s, undefined, seeded(3));
  assert.equal(s.rareLive, null);
  assert.equal(s.money, 5_000_000, 'losing the auction costs nothing');
  assert.ok(!s.lots.some(l => l.id === it.id));
});

test('v11.33: toggleFav adds and removes watchlist ids', () => {
  const s = fresh();
  toggleFav(s, 'w-rolex');
  assert.deepEqual(s.favs, ['w-rolex']);
  toggleFav(s, 'w-rolex');
  assert.deepEqual(s.favs, []);
});

// ================= v11.49 — PORTFOLIO DASHBOARD + SLEEP DEBT =================

test('v11.49: fresh() defaults to 6h sleep (down from 8h) and zero debt + empty tx log', () => {
  const s = fresh();
  assert.equal(s.sleepHours, 6, 'default sleep is now 6h per the user spec');
  assert.equal(s.sleepDebt, 0, 'sleep debt starts at 0');
  assert.equal(s.txSeq, 0, 'tx sequence starts at 0');
  assert.deepEqual(s.transactions, [], 'tx log starts empty');
  assert.deepEqual(s.costBasis, {}, 'cost basis starts empty');
});

test('v11.49: sleepHealthMult keeps the v11.48 decay scale (4h=+45%, 6h=+15%, 7h=0%, 10h=-20%)', () => {
  assert.equal(sleepHealthMult(4), 1.45);
  assert.equal(sleepHealthMult(6), 1.15);
  assert.equal(sleepHealthMult(7), 1.0);
  assert.equal(sleepHealthMult(8), 1.0);
  assert.equal(sleepHealthMult(10), 0.8);
  // The test from v11 still holds: 4h worse than 8h.
  assert.ok(sleepHealthMult(4) > sleepHealthMult(8));
});

test('v11.49: sleepHealthRecovery returns 0 below 7h, scales linearly above (8h=+0.10, 12h=+0.50)', () => {
  assert.equal(sleepHealthRecovery(4), 0);
  assert.equal(sleepHealthRecovery(6), 0);
  assert.equal(sleepHealthRecovery(7), 0);
  assert.equal(sleepHealthRecovery(8), 0.1);
  assert.equal(sleepHealthRecovery(9), 0.2);
  assert.equal(sleepHealthRecovery(10), 0.3);
  assert.equal(sleepHealthRecovery(12), 0.5);
});

test('v11.49: processDay accumulates sleep debt at 1h per deficit-hour per day (4h sleep = +3 debt/day)', () => {
  const s = fresh();
  s.sleepHours = 4;
  s.sleepDebt = 0;
  processDay(s, 1, () => 0.5);
  assert.equal(s.sleepDebt, 3, '4h sleep accrues 3h of debt (7-4)');
});

test('v11.49: processDay pays down sleep debt at 2h per surplus-hour per day (12h = -10 debt)', () => {
  const s = fresh();
  s.sleepHours = 12;
  s.sleepDebt = 15; // pre-existing debt
  processDay(s, 1, () => 0.5);
  // 12h sleep = (12-7)*2 = 10 debt paid down
  assert.equal(s.sleepDebt, 5, '12h sleep pays down 10h of debt (catch-up rate)');
});

test('v11.49: sleep debt is clamped to [0, 35]', () => {
  const s = fresh();
  s.sleepHours = 4;
  s.sleepDebt = 0;
  // Run 20 days at 4h sleep: 20 * 3 = 60, but clamp to 35
  for (let i = 0; i < 20; i++) processDay(s, i + 1, () => 0.5);
  assert.equal(s.sleepDebt, 35, 'sleep debt caps at 35 (5 days of 4h-shortfall)');
});

test('v11.49: sleepDebtStudyMult applies -10% penalty above 7 debt, -25% above 21', () => {
  assert.equal(sleepDebtStudyMult(0), 1);
  assert.equal(sleepDebtStudyMult(7), 1);
  assert.equal(sleepDebtStudyMult(8), 0.9);
  assert.equal(sleepDebtStudyMult(21), 0.9);
  assert.equal(sleepDebtStudyMult(22), 0.75);
  assert.equal(sleepDebtStudyMult(35), 0.75);
});

test('v11.49: sleepDebtHealthMult applies +20% decay penalty above 21 debt', () => {
  assert.equal(sleepDebtHealthMult(0), 1);
  assert.equal(sleepDebtHealthMult(21), 1);
  assert.equal(sleepDebtHealthMult(22), 1.2);
  assert.equal(sleepDebtHealthMult(35), 1.2);
});

test('v11.49: sleep at 7h+ actively recovers health when well-rested', () => {
  const s = fresh();
  s.sleepHours = 10;
  s.health = 50;
  s.sleepDebt = 0;
  const before = s.health;
  processDay(s, 1, () => 1); // rng=1 → max decay (0.75+1*0.5=1.25 multiplier)
  // At 10h sleep: decay = ageDecay(0.015 for age<30) * mult(0.8) * 1.25 = 0.015
  // Recovery = 0.30/day. Net = +0.285 (health gains).
  assert.ok(s.health > before, '10h sleep with no debt should NET HEAL even at max rng');
});

test('v11.49: exhausted (>21 debt) blocks recovery even at 10h sleep', () => {
  const s = fresh();
  s.sleepHours = 10;
  s.health = 50;
  s.sleepDebt = 25; // exhausted
  const before = s.health;
  processDay(s, 1, () => 0); // rng=0 → min decay (0.75 multiplier)
  // Decay = 0.015 * 0.8 * 1.2 (debt penalty) * 0.75 = 0.0108
  // Recovery = 0 (blocked when debt > 21)
  assert.ok(s.health < before, 'exhausted state blocks recovery even at 10h sleep');
});

test('v11.49: trade() buy records a transaction and tracks cost basis', () => {
  const s = fresh();
  s.money = 100_000;
  const result = trade(s, 'TECH', 'buy', 10);
  assert.equal(result.ok, true);
  assert.equal(s.transactions.length, 1, 'one tx recorded');
  const tx = s.transactions[0];
  assert.equal(tx.kind, 'buy');
  assert.equal(tx.asset, 'stock');
  assert.equal(tx.qty, 10);
  assert.equal(tx.amount, -s.prices['TECH'] * 10, 'amount is negative (cash outflow)');
  assert.equal(s.costBasis['TECH'], s.prices['TECH'] * 10, 'cost basis = full purchase $');
});

test('v11.49: trade() sell records realized P&L and reduces cost basis proportionally', () => {
  const s = fresh();
  s.money = 100_000;
  // Buy 10 shares at $230 each → cost basis = $2300
  const origPrice = s.prices['TECH'];
  trade(s, 'TECH', 'buy', 10);
  assert.equal(s.costBasis['TECH'], origPrice * 10);
  // Pump the price to 2× — sell 5 shares.
  s.prices['TECH'] = origPrice * 2;
  const result = trade(s, 'TECH', 'sell', 5);
  assert.equal(result.ok, true);
  // Two txns now: buy + sell.
  assert.equal(s.transactions.length, 2);
  const sellTx = s.transactions[1];
  assert.equal(sellTx.kind, 'sell');
  assert.equal(sellTx.qty, 5);
  // Realized P&L = (sell price × qty) - (avg cost × qty) = (460*5) - (230*5) = 1150
  assert.equal(sellTx.realizedPnL, origPrice * 5);
  // Cost basis reduced by avg_per_share × qty sold = 230 × 5 = 1150
  assert.equal(s.costBasis['TECH'], origPrice * 5);
});

test('v11.49: portfolioRealizedGains sums realizedPnL across all sell txns', () => {
  const s = fresh();
  s.money = 1_000_000;
  // Stock round-trip: buy 10 at $230, sell 5 at $460 → P&L = $1150
  const p0 = s.prices['TECH'];
  trade(s, 'TECH', 'buy', 10);
  s.prices['TECH'] = p0 * 2;
  trade(s, 'TECH', 'sell', 5);
  assert.equal(portfolioRealizedGains(s), p0 * 5);
});

test('v11.49: portfolioUnrealizedGains = current value - cost basis for open positions', () => {
  const s = fresh();
  s.money = 1_000_000;
  const p0 = s.prices['TECH'];
  trade(s, 'TECH', 'buy', 10); // cost basis = 10*p0
  // Price doubles → unrealized = 20*p0 - 10*p0 = 10*p0
  s.prices['TECH'] = p0 * 2;
  assert.equal(portfolioUnrealizedGains(s), p0 * 10);
});

test('v11.49: portfolioInvested sums BUY outflows only (excludes transfers/income)', () => {
  const s = fresh();
  s.money = 1_000_000;
  trade(s, 'TECH', 'buy', 10);
  trade(s, 'OIL', 'buy', 5);
  const totalBuy = s.prices['TECH'] * 10 + s.prices['OIL'] * 5;
  assert.equal(portfolioInvested(s), totalBuy);
});

test('v11.49: portfolioROI = (realized + unrealized) / invested', () => {
  const s = fresh();
  s.money = 1_000_000;
  const p0 = s.prices['TECH'];
  trade(s, 'TECH', 'buy', 10); // invested = 10*p0
  s.prices['TECH'] = p0 * 2;   // unrealized = 10*p0
  // No sells → realized = 0; ROI = (0 + 10*p0) / (10*p0) = 1.0 = 100%
  assert.equal(portfolioROI(s), 1.0);
});

test('v11.49: portfolioROI returns null when nothing invested (avoid div/0)', () => {
  const s = fresh();
  assert.equal(portfolioROI(s), null);
});

test('v11.49: buyItem + sellLot record txns with realized P&L', () => {
  const s = fresh();
  s.money = 1_000_000;
  // Find any buyable item
  const buyResult = buyItem(s, 'w-rolex');
  assert.ok(buyResult, 'item buy succeeds');
  assert.equal(s.transactions.length, 1);
  assert.equal(s.transactions[0].kind, 'buy');
  assert.equal(s.transactions[0].asset, 'lot');
  // Sell it back
  const sellResult = sellLot(s, 0);
  assert.ok(sellResult);
  assert.equal(s.transactions.length, 2);
  assert.equal(s.transactions[1].kind, 'sell');
  assert.equal(typeof s.transactions[1].realizedPnL, 'number');
});

test('v11.49: doGig records income transaction', () => {
  const s = fresh();
  s.money = 0;
  s.social.followers = 0;
  // 'ad' gig has no cooldown + no requirements
  const result = doGig(s, 'ad');
  assert.ok(result);
  assert.equal(s.transactions.length, 1);
  assert.equal(s.transactions[0].kind, 'income');
  assert.equal(s.transactions[0].asset, 'gig');
  assert.ok(s.transactions[0].amount > 0, 'income amount is positive');
});

test('v11.49: bankOp records transfer txns (deposit is outflow, withdrawal is inflow)', () => {
  const s = fresh();
  s.money = 100_000;
  bankOp(s, 'dep', 10_000);
  assert.equal(s.transactions.length, 1);
  assert.equal(s.transactions[0].kind, 'transfer');
  assert.equal(s.transactions[0].amount, -10_000, 'deposit = negative cash flow');
  bankOp(s, 'wd', 5_000);
  assert.equal(s.transactions.length, 2);
  assert.equal(s.transactions[1].amount, 5_000, 'withdrawal = positive cash flow');
});

test('v11.49: cashFlowLastDays sums non-transfer amounts in the last N days', () => {
  const s = fresh();
  s.money = 1_000_000;
  s.day = 100;
  // Buy stock on day 100 → outflow
  trade(s, 'TECH', 'buy', 10);
  // Manually add an income txn from 50 days ago (outside window)
  recordTx(s, { kind: 'income', asset: 'gig', ref: 'old', name: 'Old gig', qty: 1, unit: 500, amount: 500 });
  s.transactions[s.transactions.length - 1].day = 50; // backdate
  // 30-day window starting at day 100: only the buy (day 100) counts.
  assert.equal(cashFlowLastDays(s, 30), -s.prices['TECH'] * 10);
});

test('v11.49: tx log caps at TX_CAP (200) by trimming oldest', async () => {
  const { TX_CAP } = await import('./engine.js');
  const s = fresh();
  s.money = 100_000_000;
  for (let i = 0; i < TX_CAP + 50; i++) {
    recordTx(s, { kind: 'income', asset: 'gig', ref: `r${i}`, name: `gig${i}`, qty: 1, unit: 1, amount: 1 });
  }
  assert.equal(s.transactions.length, TX_CAP, 'log is capped at TX_CAP');
  // Oldest trimmed: first kept tx should be the (50+1)th record.
  assert.equal(s.transactions[0].ref, `r50`);
});

test('v11.49: migrate backfills sleep debt + tx log + cost basis for old saves', () => {
  // Simulate a pre-v11.49 save missing the new fields.
  const oldSave = fresh();
  delete (oldSave as { sleepDebt?: number }).sleepDebt;
  delete (oldSave as { txSeq?: number }).txSeq;
  delete (oldSave as { transactions?: Transaction[] }).transactions;
  delete (oldSave as { costBasis?: Record<string, number> }).costBasis;
  const s = migrate(oldSave);
  assert.equal(s.sleepDebt, 0);
  assert.equal(s.txSeq, 0);
  assert.deepEqual(s.transactions, []);
  assert.deepEqual(s.costBasis, {});
});

test('v11.49: migrate preserves existing tx log + cost basis on save', () => {
  const s = fresh();
  s.money = 1_000_000;
  trade(s, 'TECH', 'buy', 10);
  const beforeCount = s.transactions.length;
  const beforeBasis = s.costBasis['TECH'];
  const migrated = migrate(s);
  assert.equal(migrated.transactions.length, beforeCount);
  assert.equal(migrated.costBasis['TECH'], beforeBasis);
});

// ================= v11.50 — BRAND + NPC REACTIONS + FRANCHISE =================

test('v11.50: setBizBrand refuses when player owns no branches of the biz', () => {
  const s = fresh();
  // 'cafe' requires the business degree; with a fresh state we have no biz.
  const result = setBizBrand(s, 'cafe', 'Dương Coffee', '☕');
  assert.equal(result, null);
  assert.deepEqual(s.brands, {});
});

test('v11.50: setBizBrand stores the name + logo when player owns ≥1 branch', () => {
  const s = fresh();
  // Manually grant a cafe branch (skip the degree req).
  s.branches['cafe'] = [{ r: 0, mood: 1, paid: 800, day: s.day }];
  s.biz['cafe'] = 1;
  const result = setBizBrand(s, 'cafe', 'Dương Coffee', '☕');
  assert.ok(result);
  assert.equal(s.brands['cafe'].name, 'Dương Coffee');
  assert.equal(s.brands['cafe'].logo, '☕');
});

test('v11.50: setBizBrand clamps name to 24 chars and logo to one emoji', () => {
  const s = fresh();
  s.branches['cafe'] = [{ r: 0, mood: 1, paid: 800, day: s.day }];
  s.biz['cafe'] = 1;
  setBizBrand(s, 'cafe', 'A very long brand name that exceeds the 24 char limit', '☕☕☕');
  assert.equal(s.brands['cafe'].name.length, 24, 'name is clamped to 24 chars');
  assert.equal(s.brands['cafe'].logo, '☕', 'logo is clamped to first emoji');
});

test('v11.50: bizBrandOf returns the custom brand when set, falls back otherwise', () => {
  const s = fresh();
  // No brand set → falls back to default biz name + emoji
  const fallback = bizBrandOf(s, 'cafe');
  assert.equal(fallback.name, BIZ.find(b => b.id === 'cafe')!.name);
  assert.equal(fallback.logo, '☕'); // fallbackEmojis['cafe']
  // Set a brand → returns the custom brand
  s.branches['cafe'] = [{ r: 0, mood: 1, paid: 800, day: s.day }];
  s.biz['cafe'] = 1;
  setBizBrand(s, 'cafe', 'Dương Coffee', '🫖');
  const custom = bizBrandOf(s, 'cafe');
  assert.equal(custom.name, 'Dương Coffee');
  assert.equal(custom.logo, '🫖');
});

test('v11.50: migrate backfills brands map for old saves', () => {
  const oldSave = fresh();
  delete (oldSave as { brands?: Record<string, unknown> }).brands;
  const s = migrate(oldSave);
  assert.deepEqual(s.brands, {});
});

test('v11.50: franchiseBranch produces fee = branch.paid × 1.8 (the explainer math)', () => {
  const s = fresh();
  s.money = 1_000_000;
  s.branches['cafe'] = [{ r: 0, mood: 1, paid: 10000, day: s.day }];
  s.biz['cafe'] = 1;
  const moneyBefore = s.money;
  franchiseBranch(s, 'cafe', 0);
  const expectedFee = Math.round(10000 * FRANCHISE_FEE_MULT);
  assert.equal(s.money - moneyBefore, expectedFee, 'fee matches 1.8× paid value');
  assert.equal(s.branches['cafe'][0].franchised, true, 'branch is now flagged franchised');
});

test('v11.50: generateNpcReactions returns [] when player has no relations', () => {
  const s = fresh();
  assert.deepEqual(s.relations, {});
  assert.deepEqual(generateNpcReactions(s, 'Some event'), []);
});

test('v11.50: generateNpcReactions buckets commenters by friendship sentiment', () => {
  const s = fresh();
  // Pick three NPCs from the game data and set their friendship levels.
  const npcIds = NPCS.slice(0, 3).map(n => n.id);
  s.relations[npcIds[0]] = { friendship: 70, romance: 0, lastInteract: 0, interactions: 5 }; // friend → pos
  s.relations[npcIds[1]] = { friendship: 25, romance: 0, lastInteract: 0, interactions: 3 }; // acquaintance → neutral
  s.relations[npcIds[2]] = { friendship: -20, romance: 0, lastInteract: 0, interactions: 2 }; // rival → neg
  const reactions = generateNpcReactions(s, 'Big news', () => 0.5);
  assert.equal(reactions.length, 3, 'one reaction per sentiment bucket');
  const sentiments = reactions.map(r => r.sentiment).sort();
  assert.deepEqual(sentiments, ['neg', 'neutral', 'pos'].sort());
  // Each reaction carries the NPC's display name + non-empty text.
  for (const r of reactions) {
    assert.ok(r.name.length > 0, 'name populated');
    assert.ok(r.text.length > 0, 'text populated');
  }
});

test('v11.50: generateNpcReactions caps at 3 commenters even with many relations', () => {
  const s = fresh();
  for (const npc of NPCS.slice(0, 10)) {
    s.relations[npc.id] = { friendship: 60, romance: 0, lastInteract: 0, interactions: 5 };
  }
  const reactions = generateNpcReactions(s, 'Event', () => 0.5);
  assert.ok(reactions.length <= 3, 'caps at 3 reactions');
});

test('v11.50: addPost now returns the created Post (so callers can attach reactions)', () => {
  const s = fresh();
  s.started = true;
  s.lastDay = 1;
  const post = addPost(s, 'Hello world', 1);
  assert.ok(post, 'addPost returns the post object');
  assert.equal(post!.t, 'Hello world');
  assert.equal(post!.likes >= 0, true);
});

// ================= v11.53 — FINANCE OVERVIEW =================

test('v11.53: yearExpenses sums living + upkeep + tuition + loan interest + biz costs', () => {
  const s = fresh();
  // Fresh state: no biz, no loan, no study, no diet, no kids.
  // Only living cost should be present (3000 * 1.03^0 = 3000 for age 18).
  const ye = yearExpenses(s);
  assert.ok(ye > 0, 'expenses > 0 even for fresh state (living cost)');
  assert.ok(ye >= 3000, 'at least the base living cost');
  // Add a loan → expenses should jump by loan * LOAN_RATE.
  s.bank.loan = 100_000;
  const yeWithLoan = yearExpenses(s);
  assert.ok(yeWithLoan > ye, 'loan interest adds to expenses');
});

test('v11.53: incomeBreakdown returns sorted array of active income sources', () => {
  const s = fresh();
  // Fresh state: no income sources (no job, no biz, no social, no space, no pension, no savings).
  assert.deepEqual(incomeBreakdown(s), []);
  // Add savings → bank interest appears.
  s.bank.dep = 100_000;
  const inc = incomeBreakdown(s);
  assert.equal(inc.length, 1);
  assert.equal(inc[0].id, 'interest');
  assert.equal(inc[0].amount, 100_000 * 0.02); // SAVE_RATE = 0.02
});

test('v11.53: expenseBreakdown includes living cost + any active category', () => {
  const s = fresh();
  const exp = expenseBreakdown(s);
  // Fresh state: at least 'living' is present.
  assert.ok(exp.some(e => e.id === 'living'), 'living cost always present');
  // Diet adds a diet expense.
  s.diet = true;
  const expWithDiet = expenseBreakdown(s);
  assert.ok(expWithDiet.some(e => e.id === 'diet'), 'diet expense when diet active');
});

test('v11.54: expenseBreakdown kids row links to home tab (was broken "life" group id)', () => {
  const s = fresh();
  s.kids = 1;
  const exp = expenseBreakdown(s);
  const kidsRow = exp.find(e => e.id === 'kids');
  assert.ok(kidsRow, 'kids expense row present when player has kids');
  assert.equal(kidsRow!.link, 'home', 'kids row links to home tab (not the broken "life" group id)');
});

test('v11.53: assetBreakdown returns sorted (largest first) active assets', () => {
  const s = fresh();
  // Fresh state: only cash (if any) shows.
  s.money = 5000;
  const a = assetBreakdown(s);
  assert.equal(a.length, 1);
  assert.equal(a[0].id, 'cash');
  assert.equal(a[0].amount, 5000);
  // Add savings → sorted by amount descending.
  s.bank.dep = 20_000;
  const a2 = assetBreakdown(s);
  assert.equal(a2[0].id, 'savings', 'savings > cash so it sorts first');
  assert.equal(a2[1].id, 'cash');
});

test('v11.53: financeActions flags deficit for a fresh state (no income, living expenses only)', () => {
  const s = fresh();
  // Fresh state: no job, no biz, no savings → income=0 but living expenses>0.
  // The deficit suggestion should fire (income < expenses).
  const actions = financeActions(s);
  const ids = actions.map(a => a.id);
  assert.ok(ids.includes('deficit'), 'deficit suggestion fires when income < expenses');
  assert.ok(!ids.includes('repay'), 'no repay suggestion without a loan');
  assert.ok(!ids.includes('deposit'), 'no deposit suggestion without idle cash');
});

test('v11.53: financeActions flags loan + idle cash + low health', () => {
  const s = fresh();
  s.money = 200_000;       // idle cash
  s.bank.dep = 5_000;      // below half of money → deposit suggestion
  s.bank.loan = 50_000;    // active loan → repay suggestion
  s.health = 25;           // critical → health suggestion
  const actions = financeActions(s);
  const ids = actions.map(a => a.id);
  assert.ok(ids.includes('repay'), 'repay loan suggestion');
  assert.ok(ids.includes('deposit'), 'deposit idle cash suggestion');
  assert.ok(ids.includes('health'), 'critical health suggestion');
  // High priority items should sort before low priority.
  const highIdx = ids.indexOf('health');
  const lowIdx = ids.indexOf('deposit');
  if (highIdx >= 0 && lowIdx >= 0) {
    assert.ok(highIdx < lowIdx, 'high priority sorts before low');
  }
});

// ---------- v11.58 — GYM_CD regression ----------
// v11.58 increased the gym cooldown from 3 days to 30 days (1 month) per the
// user request to make paid wellbeing actions feel weightier relative to the
// free self-train option. This test pins the value so a future refactor
// doesn't silently revert it. If you genuinely want to change GYM_CD again,
// update the expected value here AND in src/app/page.tsx (HealthTab WELL list
// reads it for the cooldown label).
test('v11.58: GYM_CD is 30 days (1 month) — was 3 days before v11.58', () => {
  assert.equal(GYM_CD, 30, 'GYM_CD should be 30 (1 month) per v11.58');
  assert.equal(GYM_COST, 80, 'GYM_COST unchanged');
  assert.equal(GYM_HP, 6, 'GYM_HP unchanged');
  // The WELL catalogue must carry the same cd so the UI label matches the engine.
  const gym = WELL.find(w => w.id === 'gym');
  assert.ok(gym, 'WELL array must include the gym action');
  assert.equal(gym!.cd, GYM_CD, 'WELL[gym].cd must equal GYM_CD');
  assert.equal(gym!.cost, GYM_COST, 'WELL[gym].cost must equal GYM_COST');
});

// ---------- v12 — player UID regression ----------
// v12 adds a stable per-life UID to GameState. fresh() starts empty (so the
// intro / character creation screen doesn't show a stale chip); begin()
// assigns one; migrate() backfills one for pre-v12 saves. The generator
// returns the documented shape so the admin dashboard + social dedupe can
// rely on it.
test('v12: fresh() has empty uid; begin() assigns a non-empty uid', () => {
  const f = fresh();
  assert.equal(f.uid, '', 'fresh() must start with empty uid');
  begin(f, { name: 'Test', byear: 1992, nation: 'Vietnam', ints: [], tals: [] });
  // Read into a local so TS doesn't narrow through the assert.equal literal
  // above (which would narrow f.uid to '' and then assert.ok to never).
  const uid: string = f.uid;
  assert.ok(uid, 'begin() must assign a non-empty uid');
  assert.ok(uid.startsWith('uid-'), `uid must start with "uid-" — got ${uid}`);
  // Shape: uid- + base36 timestamp + 5 random chars. Total length >= 9.
  assert.ok(uid.length >= 9, `uid too short: ${uid}`);
});

test('v12: migrate() backfills uid for pre-v12 saves (missing or empty)', () => {
  // 1. Save with no uid field at all (pre-v12 shape).
  const pre = { schemaVersion: 4, name: 'Old' } as Partial<GameState>;
  const m1 = migrate(pre);
  const u1: string = m1.uid;
  assert.ok(u1 && u1.startsWith('uid-'), `migrate must backfill uid — got ${u1}`);
  // 2. Save with an empty-string uid (corrupted / mid-migration).
  const m2 = migrate({ ...pre, uid: '' });
  const u2: string = m2.uid;
  assert.ok(u2 && u2.startsWith('uid-'), 'migrate must replace empty uid');
  // 3. Save with a valid uid — preserved verbatim (trim only).
  const existing = 'uid-lzabc123xyz';
  const m3 = migrate({ ...pre, uid: existing });
  assert.equal(m3.uid, existing, 'migrate must NOT clobber an existing uid');
  // 4. Save with a whitespace-padded uid — trimmed, not regenerated.
  const m4 = migrate({ ...pre, uid: '  ' + existing + '  ' });
  assert.equal(m4.uid, existing, 'migrate must trim — not regenerate — a padded uid');
});

test('v12: genUid() returns unique-shaped ids across rapid successive calls', () => {
  // 1000 calls in a tight loop — even at the same millisecond, the random
  // suffix should keep collisions to zero. (36^5 = ~60M space, so 1000
  // samples have a negligible collision probability.)
  const seen = new Set<string>();
  for (let i = 0; i < 1000; i++) {
    const u = genUid();
    assert.ok(u.startsWith('uid-'), `genUid shape: ${u}`);
    assert.ok(!seen.has(u), `genUid collision at i=${i}: ${u}`);
    seen.add(u);
  }
});

// ================= v12.2 — AI event difficulty + auto-donate =================

test('v12.2: normaliseDifficulty accepts easy/hard and defaults anything else to normal', () => {
  assert.equal(normaliseDifficulty('easy'), 'easy');
  assert.equal(normaliseDifficulty('hard'), 'hard');
  assert.equal(normaliseDifficulty('normal'), 'normal');
  // junk / missing values collapse to 'normal'
  assert.equal(normaliseDifficulty(undefined), 'normal');
  assert.equal(normaliseDifficulty('Hard'), 'normal');
  assert.equal(normaliseDifficulty(''), 'normal');
  assert.equal(normaliseDifficulty(42), 'normal');
});

test('v12.2: migrate() backfills aiDifficulty as "normal" on old saves', () => {
  const s = migrate({ schemaVersion: 4, name: 'Old' });
  assert.equal(s.aiDifficulty, 'normal', 'old saves must default to normal difficulty');
  // explicit values are preserved
  assert.equal(migrate({ schemaVersion: 4, aiDifficulty: 'hard' }).aiDifficulty, 'hard');
  assert.equal(migrate({ schemaVersion: 4, aiDifficulty: 'easy' }).aiDifficulty, 'easy');
  // junk values collapse to normal
  assert.equal(migrate({ schemaVersion: 4, aiDifficulty: 'lunatic' }).aiDifficulty, 'normal');
});

test('v12.2: fresh() sets aiDifficulty = "normal" on new games', () => {
  assert.equal(fresh().aiDifficulty, 'normal');
});

// Seeded rng helpers for deterministic roll tests. rngBelow(threshold) always
// returns < threshold so the roll is a "success"; rngAbove(threshold) always
// returns >= threshold so the roll is a "failure".
const rngBelow = () => 0.0;
const rngAbove = () => 0.999;

test('v12.2: rollRiskOutcome — normal difficulty keeps the legacy win chance (safe 80%)', () => {
  // 0.0 < 0.8 → success; upside returned verbatim
  const r = rollRiskOutcome({ money: 1000, fame: 2 }, 'safe', rngBelow, 'normal');
  assert.equal(r.success, true);
  assert.equal(r.money, 1000);
  assert.equal(r.fame, 2);
});

test('v12.2: rollRiskOutcome — easy mode shifts win chance by +10% (safe 90%)', () => {
  // rng=0.85 loses under normal (>=0.8) but wins under easy (<0.9). We can't
  // pass different rngs per difficulty, so verify via threshold boundaries:
  // winChance base for safe = 0.8; easy adds 0.1 → 0.9. Verify the *failure*
  // penalty also softens by ×0.5 (penMult for easy).
  const failNormal = rollRiskOutcome({ money: 1000 }, 'safe', rngAbove, 'normal');
  const failEasy = rollRiskOutcome({ money: 1000 }, 'safe', rngAbove, 'easy');
  assert.equal(failNormal.success, false);
  assert.equal(failEasy.success, false);
  // normal safe-failure gives 30% of upside: 300. easy halves → 150.
  assert.equal(failNormal.money, 300);
  assert.equal(failEasy.money, 150, 'easy mode must halve the safe-failure consolation');
});

test('v12.2: rollRiskOutcome — hard mode widens penalties ×1.5', () => {
  // high-risk failure with money upside = 10000. Normal: -30% = -3000. Hard: -45% = -4500.
  const failNormal = rollRiskOutcome({ money: 10000 }, 'high', rngAbove, 'normal');
  const failHard = rollRiskOutcome({ money: 10000 }, 'high', rngAbove, 'hard');
  assert.equal(failNormal.success, false);
  assert.equal(failHard.success, false);
  assert.equal(failNormal.money, -3000);
  assert.equal(failHard.money, -4500, 'hard mode must bump the money penalty by 50%');
  // decline: normal = 3, hard = round(3 * 1.5) = 5 (rounded). Easy = round(3*0.5)=2.
  assert.equal(failNormal.decline, 3);
  assert.equal(failHard.decline, 5);
  const failEasy = rollRiskOutcome({ money: 10000 }, 'high', rngAbove, 'easy');
  assert.equal(failEasy.money, -1500);
  assert.equal(failEasy.decline, 2, 'easy halves the high-risk decline (round(3*0.5)=2)');
});

test('v12.2: rollRiskOutcome — default difficulty is normal (legacy callers unaffected)', () => {
  // Omit the difficulty arg → behaves like 'normal'.
  const r = rollRiskOutcome({ money: 500 }, 'medium', rngAbove);
  assert.equal(r.success, false);
  assert.equal(r.money, 0);
  assert.equal(r.decline, 1, 'medium failure decline = 1 in normal mode (legacy)');
});

test('v12.2: rollRiskOutcome — easy shifts the win boundary by +0.1 (verified via a borderline rng)', () => {
  // rng that returns exactly 0.85 — within easy's safe-window (0.9) but above
  // normal's (0.8). Under easy: success. Under normal: failure.
  const rng85 = () => 0.85;
  const easy = rollRiskOutcome({ money: 1000 }, 'safe', rng85, 'easy');
  const normal = rollRiskOutcome({ money: 1000 }, 'safe', rng85, 'normal');
  assert.equal(easy.success, true, 'rng=0.85 should be a win under easy (winChance 0.9)');
  assert.equal(normal.success, false, 'rng=0.85 should be a loss under normal (winChance 0.8)');
});

test('v12.2: choiceRisk classifies choices by their magnitude + commitment', () => {
  // free upside small magnitude → safe
  assert.equal(choiceRisk({ money: 1000 }), 'safe');
  // decline ≥ 5 → high
  assert.equal(choiceRisk({ decline: 7 }), 'high');
  // negative money → high
  assert.equal(choiceRisk({ money: -500 }), 'high');
  // dropout → high
  assert.equal(choiceRisk({ dropout: { slot: 'study' } }), 'high');
});

test('v12.2: applyAIChoice auto-donates 20% of cash losses to charity (s.donated)', () => {
  // Build a minimal GameState with an AI event whose high-risk choice has a
  // large money upside. rngAbove forces a failure → roll.money = -30% * 100000 = -30000.
  // Auto-donate: 20% of |loss| = 6000 added to s.donated + fame + karma.
  const s = fresh();
  s.started = true;
  s.money = 1_000_000;
  s.fame = 0; s.karma = 0; s.donated = 0;
  s.aiDifficulty = 'normal';
  // inject an AI event directly (bypass askAI which needs the LLM backend).
  // Explicit risk:'high' forces choiceRisk to 'high' so the failure path
  // produces a strictly-negative money roll (medium failures return 0).
  s.aiEv = { title: 'Bad Bet', text: 'x', choices: [{ l: 'go', money: 100000, risk: 'high' }] };
  applyAIChoice(s, 0, rngAbove);
  // high-risk failure: -30% of 100000 = -30000
  assert.equal(s.money, 1_000_000 - 30000, 'money must drop by the rolled loss');
  // auto-donate: 20% of 30000 = 6000
  assert.equal(s.donated, 6000, '20% of |loss| must be added to s.donated');
  // fame granted (g for amt 6000 < 10000 → 1)
  assert.ok(s.fame >= 1, 'auto-donate must grant at least 1 fame');
  // karma granted (ka for 6000 < 10000 → 1)
  assert.ok(s.karma >= 1, 'auto-donate must grant at least 1 karma');
  // log entry mentioning the donated amount
  assert.ok(s.log.some(l => l.includes('Part of the loss') && l.includes('charity')),
    `log must mention the donation, got: ${JSON.stringify(s.log.slice(-3))}`);
});

test('v12.2: applyAIChoice does NOT auto-donate when the roll is a win (roll.money >= 0)', () => {
  const s = fresh();
  s.started = true;
  s.money = 500_000;
  s.donated = 0;
  s.aiDifficulty = 'easy'; // winChance 0.9 + rngBelow=0 → success
  s.aiEv = { title: 'Windfall', text: 'x', choices: [{ l: 'take', money: 50000, risk: 'high' }] };
  applyAIChoice(s, 0, rngBelow);
  // success → money = +50000, donated stays 0
  assert.equal(s.money, 500_000 + 50000);
  assert.equal(s.donated, 0, 'wins must not trigger the auto-donate');
  // no donation log line
  assert.ok(!s.log.some(l => l.includes('Part of the loss')),
    'wins must not log a donation message');
});

test('v12.2: applyAIChoice passes s.aiDifficulty through to rollRiskOutcome', () => {
  // Under hard mode, the same high-risk failure loses more money than normal.
  const sNormal = fresh();
  sNormal.started = true; sNormal.money = 1_000_000; sNormal.donated = 0;
  sNormal.aiDifficulty = 'normal';
  sNormal.aiEv = { title: 'x', text: 'x', choices: [{ l: 'go', money: 100000, risk: 'high' }] };
  applyAIChoice(sNormal, 0, rngAbove);
  const sHard = fresh();
  sHard.started = true; sHard.money = 1_000_000; sHard.donated = 0;
  sHard.aiDifficulty = 'hard';
  sHard.aiEv = { title: 'x', text: 'x', choices: [{ l: 'go', money: 100000, risk: 'high' }] };
  applyAIChoice(sHard, 0, rngAbove);
  // hard loses 50% more: -45000 vs -30000. money reflects the difference.
  assert.equal(sNormal.money, 1_000_000 - 30000);
  assert.equal(sHard.money, 1_000_000 - 45000);
  // auto-donate also scales: normal 20% of 30000 = 6000; hard 20% of 45000 = 9000.
  assert.equal(sNormal.donated, 6000);
  assert.equal(sHard.donated, 9000);
});

