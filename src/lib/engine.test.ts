import assert from 'node:assert/strict';
import test from 'node:test';
import { ASSET_DEPRECIATION_RATE, DAY_MS, GIGS, YEAR_EVENTS } from './gameData';
import {
  addPost, bankOp, bizMultiplier, begin, bizVal, checkAch, doGig, effYears, enrollDeg, enrollLic, fresh, gigPay,
  lotValue, migrate, processDay, sleepHealthMult, studyPace, studyWorkMult,
  SPACE_TRAVEL_COST, spaceIncome, startSpaceUpgrade, taxOf, tick, trade,
  doWell, healthWarnings, hire, jobIncome, meets, POST_COOLDOWN_DAYS, studyTuition,
  // v11.2 — crisis + market research exports
  effEraBiz, effEraFac, effLoanRate, effRisk, effDemand, researchCost, researchMarket,
  dateOf, worldYear, type GameState,
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
  state.deg.business = 1;          // unlocks tutor ({any:1}) + consult ({deg:{business:1}})
  state.social.followers = 1000;   // unlocks sponsored
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
