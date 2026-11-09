// ================= GAME ENGINE (ported from the static game, TS) =================
import {
  DAY_MS, START, END_AGE, RETIRE, PENSION, RESALE_FEE, BIZ_DEGREE_BONUS,
  ASSET_DEPRECIATION_RATE, BIZ_MULTIPLIER_CAP,
  FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT, OWN_CLUB_MAX_MEMBERS,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, BRANCH_GROWTH, REG_MULT,
  LEVEL_INCOME_BONUS, xpNeed, GIGS, SPACE_LINES,
  ALLNEWS, YEAR_EVENTS, eraOf, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES,
  BIZ, FARM_LINES, FAC_LINES, ITEM_BY, STOCKS, CLUBS, JOBS, BOTS,
  analyze, type FieldKey, type LineDef, type Req, type GigDef, type SpaceDef
} from './gameData';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Branch { r: number; mood: number; paid: number; day: number }
export interface Study { kind: 'deg' | 'lic'; field?: FieldKey; lvl?: number; id?: string; name: string; end: number; tuition: number }
export interface DayTimeline { day: number; entries: string[] }
export interface AIChoice { l: string; cost?: number; money?: number; fame?: number; out?: string }
export interface AIEvent { title: string; text: string; choices: AIChoice[]; source?: 'backend' | 'local' }
export interface Post { d: number; t: string; likes: number }
export interface GameState {
  schemaVersion: number;
  money: number; age: number; day: number; lastDay: number; lastYr: number;
  biz: Record<string, number>; branches: Record<string, Branch[]>;
  farm: Record<string, number>; fac: Record<string, number>; space: Record<string, number>;
  farmBought: Record<string, number>; facBought: Record<string, number>; spaceBought: Record<string, number>;
  spaceUpgrade: { startedDay: number; completesDay: number } | null; spaceTravel: boolean;
  lots: { id: string; paid: number; day: number }[]; stk: Record<string, number>;
  club: string | null; ownClub: string | null; job: string | null;
  deg: Record<FieldKey, number>; lic: Record<string, boolean>; study: Study | null; sideStudy: Study | null;
  name: string; byear: number; nation: string; ints: string[]; tals: string[]; topField: FieldKey | null;
  started: boolean;
  bank: { dep: number; loan: number }; fame: number; donated: number; yIncome: number; yTax: number;
  prices: Record<string, number>; hist: Record<string, number[]>;
  eraBiz: number; eraFac: number;
  log: string[]; over: boolean; pending: string | null; aiEv: AIEvent | null;
  partner: boolean; married: boolean; kids: number; m1: boolean; story: { used: string[] };
  level: number; xp: number; gigs: Record<string, number>;
  health: number; spirit: number; karma: number; diet: boolean; well: Record<string, number>;
  sleepHours: number; timeline: DayTimeline[];
  cause: 'age' | 'health' | null;
  social: { followers: number; posts: Post[]; verified?: boolean };
}

// ---------- wellbeing: body & mind ----------
export type T = (k: string, f?: string, v?: Record<string, string | number>) => string;
export const GYM_COST = 80, GYM_CD = 2, GYM_HP = 6;
export const CHECKUP_COST = 600, CHECKUP_CD = 30, CHECKUP_HP = 15;
export const DIET_COST = 6;
export const TEMPLE_COST = 500, TEMPLE_CD = 3;
export const RETREAT_COST = 8000, RETREAT_CD = 60;
export interface WellDef { id: string; cost: number; cd: number }
export const WELL: WellDef[] = [
  { id: 'gym', cost: GYM_COST, cd: GYM_CD },
  { id: 'checkup', cost: CHECKUP_COST, cd: CHECKUP_CD },
  { id: 'meditate', cost: 0, cd: 1 },
  { id: 'temple', cost: TEMPLE_COST, cd: TEMPLE_CD },
  { id: 'retreat', cost: RETREAT_COST, cd: RETREAT_CD },
];
export const wellDef = (id: string) => WELL.find(w => w.id === id);
export const wellReady = (s: GameState, id: string) => {
  const w = wellDef(id); if (!w) return false;
  const last = s.well[id];
  return (last == null || s.lastDay - last >= w.cd) && s.money >= w.cost;
};
export const wellLeft = (s: GameState, id: string) => {
  const w = wellDef(id); if (!w) return 0;
  const last = s.well[id];
  return last == null ? 0 : Math.max(0, w.cd - (s.lastDay - last));
};
export const healthMult = (s: GameState) => 0.7 + 0.3 * (s.health / 100);
export const sleepHealthMult = (hours: number) => hours < 7
  ? 1 + (7 - hours) * .15
  : 1 - Math.min(.2, Math.max(0, hours - 8) * .1);
export const studyPace = (hours: number) => 1 + Math.max(0, 8 - hours) * .06;
export const ageDecayPerDay = (age: number) => age < 30 ? .015 : age < 45 ? .04 : age < 60 ? .08 : age < 75 ? .13 : .18;
export const decayPerYear = (s: GameState) => Math.round(ageDecayPerDay(s.age) * 365.25 * (s.diet ? .55 : 1) * (s.spirit >= 70 ? .85 : 1));
export const spiritBizMult = (s: GameState) => (s.spirit >= 70 ? 1.1 : 1);
export const cosmicMult = (s: GameState) => (s.spirit >= 80 ? 1.25 : 1);
export const healthState = (h: number) => h >= 80 ? 0 : h >= 60 ? 1 : h >= 40 ? 2 : h >= 20 ? 3 : 4;
export const spiritState = (v: number) => v >= 80 ? 3 : v >= 55 ? 2 : v >= 30 ? 1 : 0;
export function doWell(s: GameState, id: string, t: T): string | null {
  const w = wellDef(id); if (!w) return null;
  if (!wellReady(s, id)) {
    const left = wellLeft(s, id);
    return left > 0 ? t('gig.cooldown', '', { n: left }) : t('noMoney');
  }
  s.well[id] = s.lastDay;
  if (w.cost) s.money -= w.cost;
  if (id === 'gym') { s.health = Math.min(100, s.health + GYM_HP); addXp(s, 4); return t('hp.gymDone', '', { n: GYM_HP }); }
  if (id === 'checkup') { s.health = Math.min(100, s.health + CHECKUP_HP); addXp(s, 6); return t('hp.checkupDone', '', { n: CHECKUP_HP }); }
  if (id === 'meditate') { s.spirit = Math.min(100, s.spirit + 4); s.karma += 1; addXp(s, 3); return t('sp.medDone', '', { n: 4 }); }
  if (id === 'temple') { s.spirit = Math.min(100, s.spirit + 6); s.karma += 5; addXp(s, 5); return t('sp.templeDone', '', { n: 6, k: 5 }); }
  if (id === 'retreat') { s.spirit = Math.min(100, s.spirit + 25); s.karma += 15; s.health = Math.min(100, s.health + 5); addXp(s, 30); pushLog(s, 'Silent retreat — ten days of stillness.'); return t('sp.retreatDone'); }
  return null;
}
export function toggleDiet(s: GameState, t: T): string {
  s.diet = !s.diet;
  return t(s.diet ? 'hp.dietOn' : 'hp.dietOff', '', { x: DIET_COST });
}

// ---------- level, gigs, social & the cosmic frontier ----------
export const levelMult = (s: GameState) => 1 + (s.level - 1) * LEVEL_INCOME_BONUS;
export function addXp(s: GameState, n: number, rng: () => number = Math.random): void {
  if (!s.started || n <= 0) return;
  s.xp += Math.round(n);
  let up = false;
  while (s.xp >= xpNeed(s.level)) { s.xp -= xpNeed(s.level); s.level++; up = true; }
  if (up) {
    pushLog(s, `Level up! You reached level ${s.level}. (+${((s.level - 1) * LEVEL_INCOME_BONUS * 100).toFixed(0)}% income)`);
    if (s.level % 5 === 0) addPost(s, `Level ${s.level}. Building an empire, one day at a time.`, 1.4, rng);
  }
}
export function gigReady(s: GameState, g: GigDef): boolean {
  const last = s.gigs[g.id];
  if (last != null && s.lastDay - last < g.cd) return false;
  if (g.minFollowers && s.social.followers < g.minFollowers) return false;
  return meets(s, g.req);
}
export function gigLock(s: GameState, g: GigDef): string {
  if (g.minFollowers && s.social.followers < g.minFollowers) return fmt(g.minFollowers) + ' followers';
  if (g.req && !meets(s, g.req)) return reqText(g.req);
  return '';
}
export function gigPay(s: GameState, g: GigDef): number {
  let pay = g.base + 0.05 * Math.sqrt(Math.max(0, yearIncome(s)));
  if (g.id === 'sponsored') pay += s.social.followers * 0.02;
  pay *= levelMult(s) * (1 + s.fame * 0.004) * healthMult(s);
  if (s.ints.includes('sports') || s.tals.includes('hands')) pay *= 1.15;
  return Math.max(5, Math.round(pay));
}
export function doGig(s: GameState, id: string, rng: () => number = Math.random): string | null {
  const g = GIGS.find(x => x.id === id); if (!g) return null;
  if (!gigReady(s, g)) return null;
  s.gigs[g.id] = s.lastDay;
  const pay = gigPay(s, g);
  s.money += pay; s.yIncome += pay;
  addXp(s, g.id === 'ad' ? 4 : 10, rng);
  if (g.id !== 'ad' && rng() < 0.04) s.fame = Math.min(100, s.fame + 1);
  return '+' + fmt(pay);
}
export function socialIncome(s: GameState): number { // annual ad revenue
  return s.social.followers >= 500 ? s.social.followers * 0.06 * levelMult(s) : 0;
}
export const spaceMultiplier = (s: GameState) => cosmicMult(s) * (s.spaceTravel ? 1.2 : 1);
export function spaceIncome(s: GameState): number { // annual
  return SPACE_LINES.reduce((a, l) => a + (s.space[l.id] ? l.inc : 0), 0) * spaceMultiplier(s);
}
export function startSpaceUpgrade(s: GameState): string | null {
  if (!spaceUpgradeReady(s)) return null;
  s.money -= SPACE_TRAVEL_COST;
  s.spaceUpgrade = { startedDay: s.day, completesDay: s.day + spaceUpgradeDays };
  pushLog(s, 'Deep-space navigation program started. Flight readiness expected in one year.');
  return 'Deep-space navigation program started. Check back in one year.';
}
export function addPost(s: GameState, t: string, boost = 1, rng: () => number = Math.random): void {
  const likes = Math.round((s.social.followers * 0.05 + s.fame * 3 + 5) * (0.4 + rng() * 1.2) * boost);
  s.social.posts.unshift({ d: s.lastDay, t, likes });
  if (s.social.posts.length > 12) s.social.posts.pop();
  s.social.followers += Math.round(likes * 0.3 * boost) + (s.fame > 0 ? 2 : 0);
  if (s.social.followers >= 100000 && !s.social.verified) {
    s.social.verified = true;
    pushLog(s, 'Your account got the blue check. Verified!');
    addXp(s, 40);
  }
}
export function buySpace(s: GameState, id: string): string | null {
  const l = SPACE_LINES.find(x => x.id === id); if (!l || s.space[id]) return null;
  if (s.level < l.lvl || worldYear(s) < l.since || s.money < l.cost) return null;
  s.money -= l.cost; s.space[id] = 1; s.spaceBought[id] = s.day;
  s.fame = Math.min(100, s.fame + 5);
  addXp(s, 200);
  pushLog(s, `Frontier venture founded: ${l.name}.`);
  addPost(s, `We are officially going beyond Earth. ${l.name} is a go.`, 2);
  return `${l.name} founded! Welcome to the cosmic frontier.`;
}

export function fresh(): GameState {
  const s: GameState = {
    schemaVersion: 2,
    money: 0, age: START, day: 0, lastDay: 0, lastYr: START, biz: {}, branches: {}, farm: {}, fac: {},
    farmBought: {}, facBought: {}, spaceBought: {}, spaceUpgrade: null, spaceTravel: false,
    lots: [], stk: {}, club: null, ownClub: null, job: null,
    deg: { business: 0, engineering: 0, medicine: 0, science: 0, arts: 0 }, lic: {}, study: null, sideStudy: null,
    name: 'Alex', byear: 1992, nation: 'Vietnam', ints: [], tals: [], topField: null, started: false,
    bank: { dep: 0, loan: 0 }, fame: 0, donated: 0, yIncome: 0, yTax: 0,
    prices: {}, hist: {}, eraBiz: 1, eraFac: 1,
    log: [], over: false, pending: null, aiEv: null,
    partner: false, married: false, kids: 0, m1: false, story: { used: [] },
    level: 1, xp: 0, gigs: {}, space: {}, social: { followers: 0, posts: [] },
    health: 92, spirit: 18, karma: 0, diet: false, well: {}, cause: null,
    sleepHours: 8, timeline: []
  };
  STOCKS.forEach(x => { s.prices[x.id] = x.p; s.hist[x.id] = [x.p]; });
  return s;
}
export function migrate(raw: unknown): GameState {
  const source = raw && typeof raw === 'object' ? raw as Partial<GameState> : {};
  const s = Object.assign(fresh(), source);
  let version = Number.isInteger(source.schemaVersion) && source.schemaVersion! >= 0 ? source.schemaVersion! : 0;
  while (version < 2) {
    if (version === 0) {
      s.schemaVersion = 1;
      version = 1;
    } else if (version === 1) {
      s.sideStudy = null;
      s.sleepHours = 8;
      s.timeline = [];
      s.schemaVersion = 2;
      version = 2;
    }
  }
  s.schemaVersion = Math.max(s.schemaVersion || 0, 2);
  s.bank = s.bank || { dep: 0, loan: 0 };
  s.story = s.story || { used: [] };
  s.branches = s.branches || {};
  s.farm = s.farm || {}; s.fac = s.fac || {}; s.space = s.space || {};
  s.farmBought = s.farmBought || {}; s.facBought = s.facBought || {}; s.spaceBought = s.spaceBought || {};
  s.spaceUpgrade = s.spaceUpgrade || null; s.spaceTravel = !!s.spaceTravel;
  s.sideStudy = s.sideStudy || null;
  s.sleepHours = typeof s.sleepHours === 'number' ? Math.min(10, Math.max(4, s.sleepHours)) : 8;
  s.timeline = Array.isArray(s.timeline) ? s.timeline.slice(-45) : [];
  BIZ.forEach(b => (s.branches[b.id] || []).forEach((br, i) => {
    if (br.paid == null) br.paid = b.base * Math.pow(BRANCH_GROWTH, i);
    if (br.day == null) br.day = s.day;
  }));
  FARM_LINES.forEach(l => { if (s.farm[l.id] && s.farmBought[l.id] == null) s.farmBought[l.id] = s.day; });
  FAC_LINES.forEach(l => { if (s.fac[l.id] && s.facBought[l.id] == null) s.facBought[l.id] = s.day; });
  SPACE_LINES.forEach(l => { if (s.space[l.id] && s.spaceBought[l.id] == null) s.spaceBought[l.id] = s.day; });
  s.gigs = s.gigs || {};
  s.social = s.social && Array.isArray(s.social.posts) ? s.social : { followers: 0, posts: [] };
  if (typeof s.level !== 'number' || s.level < 1) s.level = 1;
  if (typeof s.xp !== 'number' || s.xp < 0) s.xp = 0;
  if (typeof s.health !== 'number') s.health = 85;
  if (typeof s.spirit !== 'number') s.spirit = 20;
  if (typeof s.karma !== 'number') s.karma = 0;
  s.diet = !!s.diet; s.well = s.well || {}; s.cause = s.cause || null;
  s.health = Math.min(100, Math.max(0, s.health));
  s.spirit = Math.min(100, Math.max(0, s.spirit));
  STOCKS.forEach(x => { if (s.prices[x.id] == null) { s.prices[x.id] = x.p; s.hist[x.id] = [x.p]; } });
  return s;
}
export function begin(s: GameState, opts: { name: string; byear: number; nation: string; ints: string[]; tals: string[] }) {
  const a = analyze(opts.ints, opts.tals);
  Object.assign(s, fresh(), { started: true });
  s.name = opts.name.slice(0, 24) || 'Alex';
  s.byear = opts.byear; s.nation = opts.nation;
  s.ints = [...opts.ints]; s.tals = [...opts.tals]; s.topField = a.top;
  if (opts.ints.includes('money')) s.money = 5000;
  s.log.push(`1 Sep ${s.byear + 18}: ${s.name} turns 18 in the ${eraOf(s.byear + 18).name}. Find a job, or study for a degree or licence.`);
  recordActivity(s, 'Started a new life');
}
export const base = (s: GameState) => Date.UTC(s.byear + 18, 8, 1);
export const dateOf = (s: GameState, d: number) => new Date(base(s) + Math.floor(d) * 864e5);
export const worldYear = (s: GameState) => dateOf(s, s.lastDay).getUTCFullYear();
export const stageOf = (a: number) => STAGES.find(x => a < x.to) || STAGES[STAGES.length - 1];

export const branchCount = (s: GameState, bid: string) => (s.branches[bid] || []).length;
export const bizCost = (s: GameState, b: { id: string; base: number }) => Math.floor(b.base * Math.pow(BRANCH_GROWTH, branchCount(s, b.id)));
export const fameBonus = (s: GameState) => 1 + s.fame * .002;
export const clubMult = (s: GameState) => {
  if (s.club === 'own') return OWN_CLUB_MULT;
  const c = CLUBS.find(c => c.id === s.club); return c ? c.mult : 1;
};
export const branchNet = (s: GameState, b: { id: string; inc: number; base: number }, br: Branch) =>
  b.inc / 12 * REG_MULT[br.r % REG_MULT.length] * br.mood - b.base / 24;
export const farmIncome = (s: GameState) => FARM_LINES.reduce((a, l) => a + (s.farm[l.id] || 0) * l.inc, 0);
export const facIncome = (s: GameState) => FAC_LINES.reduce((a, l) => {
  const n = s.fac[l.id] || 0; if (!n) return a;
  let inc = l.inc;
  if (l.food) { if (!branchCount(s, 'farm')) return a; inc *= 1.3; }
  if (l.needs && !(s.fac[l.needs] || 0)) return a;
  return a + n * inc * s.eraFac;
}, 0);
export const bizMultiplier = (s: GameState) => Math.min(
  BIZ_MULTIPLIER_CAP,
  clubMult(s) * (1 + BIZ_DEGREE_BONUS * s.deg.business) * fameBonus(s) * s.eraBiz * levelMult(s) * spiritBizMult(s)
);
export const bizIncome = (s: GameState) => { // annual
  let ann = 0;
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => { ann += b.inc * REG_MULT[br.r % REG_MULT.length] * br.mood - b.base / 24; }));
  ann += farmIncome(s) + facIncome(s);
  return Math.max(0, ann) * bizMultiplier(s);
};
export const jobOf = (s: GameState) => JOBS.find(j => j.id === s.job);
export const yearIncome = (s: GameState) => bizIncome(s) + spaceIncome(s) + socialIncome(s) + (jobOf(s) ? jobOf(s)!.salary * studyWorkMult(s) : 0) + (s.age >= RETIRE ? PENSION : 0);
export const living = (age: number) => Math.round(3000 * Math.pow(1.03, age - START));
export const lotValue = (s: GameState, l: { id: string; paid: number; day: number }) => {
  const itemRate = ITEM_BY[l.id].rate;
  const rate = Math.min(itemRate, ASSET_DEPRECIATION_RATE);
  const yrs = Math.max(0, (s.day - l.day) / 365.25);
  return l.paid * Math.pow(1 + rate, yrs);
};
export const upkeep = (s: GameState) => s.lots.reduce((a, l) => a + lotValue(s, l) * 0.02, 0);
export const assetVal = (s: GameState) => s.lots.reduce((a, l) => a + lotValue(s, l), 0);
export const bizVal = (s: GameState) => {
  const valueAt = (paid: number, boughtDay: number) =>
    paid * Math.pow(1 + ASSET_DEPRECIATION_RATE, Math.max(0, (s.day - boughtDay) / 365.25));
  let total = 0;
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => { total += valueAt(br.paid, br.day); }));
  FARM_LINES.forEach(l => { if (s.farm[l.id]) total += valueAt(l.cost, s.farmBought[l.id] ?? s.day); });
  FAC_LINES.forEach(l => { if (s.fac[l.id]) total += valueAt(l.cost, s.facBought[l.id] ?? s.day); });
  SPACE_LINES.forEach(l => { if (s.space[l.id]) total += valueAt(l.cost, s.spaceBought[l.id] ?? s.day); });
  return total;
};
export const stockVal = (s: GameState) => STOCKS.reduce((a, x) => a + (s.stk[x.id] || 0) * s.prices[x.id], 0);
export const netWorth = (s: GameState) => s.money + stockVal(s) + assetVal(s) + bizVal(s) + s.bank.dep - s.bank.loan;
export const clickVal = (s: GameState) => Math.max(25, Math.round((30 + 0.01 * yearIncome(s)) * ((s.ints.includes('sports') || s.tals.includes('hands')) ? 1.25 : 1)));
export const taxOf = (inc: number) => {
  let t = 0, lo = 0;
  for (const [hi, rate] of TAX_BRACKETS) { if (inc > lo) { t += (Math.min(inc, hi) - lo) * rate; lo = hi; } else break; }
  return Math.round(t);
};
export const tuitionOf = (s: GameState, f: FieldKey, l: number) => Math.round(FIELDS[f].tuition[l - 1] * (s.topField === f ? .8 : 1));
export const effYears = (s: GameState, f: FieldKey, l: number) =>
  FIELDS[f].years[l - 1] * (s.topField && s.topField !== f ? 1.25 : 1) * (s.tals.includes('focus') ? .9 : 1);
export const studyWorkMult = (s: GameState) => (s.study || s.sideStudy) && jobOf(s)?.ft ? .6 : 1;
export const spaceUpgradeDays = 365;
export const SPACE_TRAVEL_COST = 10000000;
export const sleepHoursOptions = [4, 5, 6, 7, 8, 9, 10] as const;
export const spaceUpgradeReady = (s: GameState) =>
  !s.spaceTravel && !s.spaceUpgrade && !!s.space.orbital && s.level >= 12 &&
  worldYear(s) >= 2025 && s.money >= SPACE_TRAVEL_COST;
export const lineUnlocked = (s: GameState, l: LineDef) => worldYear(s) >= l.since;
export const lineReady = (s: GameState, l: LineDef) =>
  lineUnlocked(s, l) && (l.farm ? branchCount(s, 'farm') > 0 : true) && (l.fac ? branchCount(s, 'fac') > 0 : true) &&
  (!l.food || branchCount(s, 'farm') > 0) && (!l.needs || (s.fac[l.needs] || 0) > 0);
export function pushLog(s: GameState, t: string) { s.log.push(t); if (s.log.length > 80) s.log.shift(); }
export function recordActivity(s: GameState, entry: string, day = s.lastDay): void {
  let date = s.timeline.find(x => x.day === day);
  if (!date) {
    date = { day, entries: [] };
    s.timeline.push(date);
    s.timeline.sort((a, b) => a.day - b.day);
  }
  date.entries.push(entry);
  if (date.entries.length > 30) date.entries.shift();
  if (s.timeline.length > 45) s.timeline.splice(0, s.timeline.length - 45);
}

export function meets(s: GameState, r?: Req): boolean {
  if (!r) return true;
  const anyReq = r.any;
  if (anyReq && !Object.values(s.deg).some(v => v >= anyReq)) return false;
  if (r.deg) for (const f in r.deg) if (s.deg[f as FieldKey] < (r.deg[f as FieldKey] || 0)) return false;
  if (r.lic) for (const l of r.lic) if (!s.lic[l]) return false;
  if (r.age && s.age < r.age) return false;
  return true;
}
export function reqText(r?: Req): string {
  if (!r || !Object.keys(r).length) return 'no requirements';
  const p: string[] = [];
  if (r.any) p.push('any degree');
  if (r.deg) for (const f in r.deg) p.push(FIELDS[f as FieldKey].name + ' ' + FIELDS[f as FieldKey].names[(r.deg[f as FieldKey] || 1) - 1]);
  if (r.lic) for (const l of r.lic) p.push(LIC_BY[l].name);
  if (r.age) p.push('age ' + r.age + '+');
  return p.join(' + ');
}

// ---------- time ----------
export function processDay(s: GameState, d: number, rng: () => number = Math.random): void {
  const dt = dateOf(s, d);
  const routine = [`${s.sleepHours}h sleep`];
  if (jobOf(s)) routine.push(`Work: ${jobOf(s)!.name}${studyWorkMult(s) < 1 ? ' (reduced hours for study)' : ''}`);
  const studies = [s.study, s.sideStudy].filter((study): study is Study => !!study);
  if (studies.length) routine.push(`Study: ${studies.map(study => study.name).join(' + ')}`);
  recordActivity(s, routine.join(' · '), d);
  // Sleep trades study time for health recovery; other wellbeing modifiers still apply.
  const dhp = ageDecayPerDay(s.age) * sleepHealthMult(s.sleepHours) * (s.diet ? .55 : 1) * (s.spirit >= 70 ? .85 : 1);
  s.health = Math.max(0, s.health - dhp * (0.75 + rng() * 0.5));
  if (s.study) s.study.end -= studyPace(s.sleepHours) - 1;
  if (s.sideStudy) s.sideStudy.end -= studyPace(s.sleepHours) - 1;
  if (s.diet) s.money -= DIET_COST;
  if (s.health <= 15 && d % 30 === 0) pushLog(s, 'Your health is fragile — eat well, rest, see a doctor.');
  if (d % 14 === 0) {
    const j = jobOf(s), net = (j ? j.salary * studyWorkMult(s) / 26 : 0) + (s.age >= RETIRE ? PENSION / 26 : 0);
    if (net > 0) { s.money += net; s.yIncome += net; pushLog(s, `Payday: +${fmt(net)}.`); }
  }
  if (dt.getUTCDate() === 1) {
    const profit = bizIncome(s) / 12 + spaceIncome(s) / 12 + socialIncome(s) / 12;
    const tuition = s.study && s.study.kind === 'deg' ? s.study.tuition / 12 : 0;
    const loanInt = s.bank.loan * LOAN_RATE / 12;
    const bills = living(s.age) / 12 + upkeep(s) / 12 + tuition + s.kids * 400 + loanInt;
    const interest = s.bank.dep * SAVE_RATE / 12;
    s.bank.dep += interest; s.yIncome += Math.max(0, interest);
    s.money += profit - bills;
    if (profit > 0) s.yIncome += profit;
    // social media: follower graph drifts with fame every month (sqrt growth + hard cap)
    const fg = Math.min(
      Math.round((s.fame * 14 + Math.sqrt(s.social.followers) * 8) * (0.4 + rng() * 1.2)),
      200000000 - s.social.followers);
    if (fg > 0) s.social.followers += fg;
    if (s.social.followers > 0) addXp(s, Math.min(12, 1 + s.social.followers / 20000), rng);
    if (bizIncome(s) > 0) addXp(s, Math.min(25, 1 + profit / 12000), rng);
    let booms = 0, busts = 0;
    BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => {
      br.mood = Math.min(1.7, Math.max(.25, br.mood + (rng() - .5) * .22));
      if (br.mood >= 1.4) booms++; if (br.mood <= .5) busts++;
    }));
    pushLog(s, `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}: business ${profit >= 0 ? '+' : '\u2212'}${fmt(Math.abs(profit))}, rent & bills \u2212${fmt(bills)}.${booms ? ' Some branches are booming!' : ''}${busts ? ' Some branches are struggling!' : ''}`);
  }
  if (dt.getUTCMonth() === 0 && dt.getUTCDate() === 1) {
    const y = dt.getUTCFullYear();
    if (s.yIncome > 0) {
      const t = taxOf(s.yIncome);
      s.yTax = t; s.money -= t;
      pushLog(s, `Tax season ${y}: income ${fmt(s.yIncome)} \u2192 tax bill ${fmt(t)}.`);
      s.yIncome = 0;
    }
    s.eraBiz = 1; s.eraFac = 1;
    const ye = YEAR_EVENTS[y];
    if (ye) {
      if (ye.stk) STOCKS.forEach(x => { const m = ye.stk![x.id] != null ? ye.stk![x.id] : ye.stk!['*']; if (m) s.prices[x.id] *= m; });
      if (ye.dep) s.bank.dep *= ye.dep;
      if (ye.biz) s.eraBiz = ye.biz;
      if (ye.fac) s.eraFac = ye.fac;
      if (ye.cash) s.money += ye.cash;
      pushLog(s, `1 Jan ${y}: ${ye.msg}`);
    }
    const news = ALLNEWS[y];
    pushLog(s, `1 Jan ${y}: ${news ? news.join(' \u2022 ') : eraOf(y).name + ' continues.'}`);
  }
}

// ---------- life events ----------
type LifeDef = {
  id: string; title: string; text: string; min: number; max: number; p: number;
  ok: (s: GameState) => boolean; pre?: (s: GameState) => void;
  choices: { l: string; cost?: number; fx: (s: GameState, rng: () => number) => string }[];
};
export const LIFE: LifeDef[] = [
  { id: 'million', title: 'Your first million', text: 'Your net worth just crossed $1,000,000. Time to celebrate.', min: 0, max: 99, p: 1, ok: s => !s.m1 && netWorth(s) >= 1e6, choices: [{ l: 'Celebrate', fx: s => { s.m1 = true; return 'You hit your first million!'; } }] },
  { id: 'love', title: 'Someone special', text: 'You met someone who makes you laugh like no one before.', min: 20, max: 35, p: .3, ok: s => !s.partner && !s.married, choices: [{ l: 'Ask them out', fx: s => { s.partner = true; return 'You started dating.'; } }, { l: 'Stay focused on work', fx: () => 'You let the moment pass.' }] },
  { id: 'wedding', title: 'Ready to commit?', text: 'Your partner wants to make it official.', min: 24, max: 42, p: .35, ok: s => s.partner && !s.married, choices: [{ l: 'Dream wedding', cost: 40000, fx: (s, rng) => { s.married = true; s.spirit = Math.min(100, s.spirit + 5); addPost(s, 'She said yes. Best day of my life.', 1.6, rng); return 'A beautiful wedding. Friends still talk about it.'; } }, { l: 'Courthouse wedding', cost: 2000, fx: (s, rng) => { s.married = true; s.spirit = Math.min(100, s.spirit + 4); addPost(s, 'Married! We kept it small and perfect.', 1.2, rng); return 'A simple, happy day.'; } }] },
  { id: 'baby', title: 'A surprise pregnancy', text: 'You are going to be a parent.', min: 25, max: 42, p: .25, ok: s => (s.married || s.partner) && s.kids < 3, choices: [{ l: 'Welcome the baby', fx: (s, rng) => { s.kids += 1; s.spirit = Math.min(100, s.spirit + 3); s.health = Math.max(0, s.health - 2); addPost(s, 'Parenthood unlocked. Everyone is healthy and exhausted.', 1.5, rng); return 'Your child was born. Life is busier and costs more now.'; } }, { l: 'Not yet', fx: () => 'You decided to wait.' }] },
  { id: 'divorce', title: 'The marriage is ending', text: 'You and your spouse cannot agree on how to split things.', min: 28, max: 65, p: .12, ok: s => s.married, choices: [{ l: 'Settle amicably (give up 40% of cash)', fx: s => { if (s.money > 0) s.money *= .6; s.married = false; s.partner = false; s.spirit = Math.max(0, s.spirit - 8); return 'It hurt, but it ended quickly.'; } }, { l: 'Fight in court', cost: 30000, fx: (s, rng) => { s.married = false; s.partner = false; s.spirit = Math.max(0, s.spirit - 5); if (rng() < .5) { s.money *= 1.1; return 'The court ruled in your favour.'; } s.money *= .8; return 'The court ruled against you.'; } }] },
  { id: 'layoff', title: 'Your company is downsizing', text: 'Your position is being cut.', min: 20, max: 64, p: .15, ok: s => { const j = jobOf(s); return !!j && j.ft; }, choices: [{ l: 'Take the severance (3 months pay)', fx: s => { s.money += jobOf(s)!.salary / 4; s.job = null; return 'You left with a severance check.'; } }, { l: 'Fight to keep your job', fx: (s, rng) => { if (rng() < .5) return 'Management relented. You keep your job.'; s.job = null; return 'The layoff went through anyway.'; } }] },
  { id: 'illness', title: 'Sudden illness', text: 'The doctor found something serious and says treatment cannot wait.', min: 18, max: 90, p: .1, ok: () => true, choices: [{ l: 'Private surgery', cost: 30000, fx: s => { s.health = Math.min(100, s.health + 20); return 'The surgery went well. You are back on your feet.'; } }, { l: 'Public hospital (long wait)', fx: s => { s.money -= 5000; s.health = Math.min(100, s.health + 5); return 'You waited months, but you recovered.'; } }, { l: 'Rest at home', fx: s => { const j = jobOf(s); if (j) s.money -= j.salary / 6; s.health = Math.max(0, s.health - 10); return 'You lost weeks of work but healed.'; } }] },
  { id: 'lottery', title: 'You won the lottery!', text: 'A ticket you bought on a whim just hit the jackpot.', min: 18, max: 90, p: .04, ok: () => true, choices: [{ l: 'Claim $1,000,000', fx: (s, rng) => { s.money += 1000000; addPost(s, 'Still can\u2019t believe it. We won the lottery!!', 2.5, rng); return 'A million dollars. Life will never be the same.'; } }, { l: 'Claim $500k, share the rest', fx: s => { s.money += 500000; return 'Your family cheers. You keep half.'; } }] },
  { id: 'crash', title: 'Market crash', text: 'Stocks plunge 40% overnight and panic spreads.', min: 26, max: 80, p: .1, ok: s => stockVal(s) > 0, pre: s => STOCKS.forEach(x => s.prices[x.id] *= .6), choices: [{ l: 'Sell everything now', fx: s => { STOCKS.forEach(x => { s.money += (s.stk[x.id] || 0) * s.prices[x.id]; s.stk[x.id] = 0; }); return 'You sold at the bottom and locked in the loss.'; } }, { l: 'Hold and buy the dip', fx: s => { STOCKS.forEach(x => s.prices[x.id] *= 1.6); return 'You held on, and the market recovered.'; } }] },
  { id: 'recession', title: 'Recession', text: 'Customers vanish and business profits fall sharply.', min: 25, max: 75, p: .1, ok: s => bizIncome(s) > 0, choices: [{ l: 'Cut costs', cost: 10000, fx: () => 'You trimmed the fat and kept things running.' }, { l: 'Ride it out', fx: s => { s.money -= bizIncome(s) * .25; return 'Profits dropped for a year.'; } }] },
  { id: 'parent', title: 'A family loss', text: 'Your mother has passed away. The funeral is this week.', min: 40, max: 90, p: .08, ok: () => true, choices: [{ l: 'Take two months off', fx: s => { const j = jobOf(s); if (j) s.money -= j.salary / 6; s.spirit = Math.max(0, s.spirit - 10); return 'You grieved with family and returned slowly.'; } }, { l: 'Keep working', fx: s => { s.spirit = Math.max(0, s.spirit - 12); return 'You stayed busy, but the grief stayed with you.'; } }] },
  { id: 'midlife', title: 'Midlife restlessness', text: 'You feel the urge for something new.', min: 42, max: 58, p: .12, ok: () => true, choices: [{ l: 'Buy a Porsche 911', cost: 120000, fx: s => { addLot(s, 'c-porsche'); s.spirit = Math.min(100, s.spirit + 2); return 'A 911 in your garage. You felt 25 again.'; } }, { l: 'Travel to Japan', cost: 20000, fx: s => { s.spirit = Math.min(100, s.spirit + 8); return 'A month wandering Tokyo and Kyoto.'; } }] },
  { id: 'fire', title: 'Fire at your home', text: 'A fire damaged one of your properties.', min: 25, max: 90, p: .1, ok: s => s.lots.some(l => ITEM_BY[l.id].cat === 'Property'), choices: [{ l: 'Claim insurance', fx: s => { s.money -= 12500; return 'Insurance covered most of it.'; } }, { l: 'Pay for repairs', cost: 25000, fx: () => 'You rebuilt the property, better than before.' }] },
  { id: 'burnout', title: 'Burnout', text: 'The grind has been relentless. Body and mind are waving a white flag.', min: 22, max: 70, p: .12, ok: s => s.health < 65, choices: [{ l: 'Take a sabbatical', cost: 15000, fx: s => { s.health = Math.min(100, s.health + 18); s.spirit = Math.min(100, s.spirit + 10); return 'Two months of rest. You feel human again.'; } }, { l: 'Push through', fx: s => { s.health = Math.max(0, s.health - 14); s.spirit = Math.max(0, s.spirit - 6); return 'You pushed on. The tank is running dry.'; } }] },
  { id: 'calling', title: 'A quiet calling', text: 'Lately you keep wondering what all this is for. A mountain monastery offers week-long stays.', min: 28, max: 82, p: .1, ok: () => true, choices: [{ l: 'Stay a week in silence', cost: 2000, fx: s => { s.spirit = Math.min(100, s.spirit + 15); s.karma += 10; return 'The silence rearranged something inside you.'; } }, { l: 'Light incense and move on', fx: s => { s.spirit = Math.min(100, s.spirit + 3); s.karma += 1; return 'A small moment of peace.'; } }] }
];
const EVENTS: ((s: GameState, rng: () => number) => { msg: string; cash: number; fame?: number; dip?: boolean })[] = [
  s => ({ msg: 'A distant aunt left you a small inheritance.', cash: s.age >= 25 ? 40000 : 3000 }),
  s => ({ msg: 'Your post went viral. Brand deal!', cash: 15000 + Math.round(s.age * 200), fame: 3 }),
  (s, rng) => ({ msg: 'Car accident. Medical bills.', cash: -(6000 + Math.floor(rng() * 8000)) }),
  s => ({ msg: 'You found an overlooked tax refund.', cash: 2500 }),
  s => ({ msg: 'Tax audit on your assets.', cash: -Math.round(Math.max(0, s.money) * .02) }),
  s => ({ msg: 'Market dip. Your stocks lost 10%.', cash: 0, dip: true }),
  s => ({ msg: 'Friends dragged you on a lavish trip.', cash: -8000 })
];
export function yearEnd(s: GameState, age: number, rng: () => number = Math.random): void {
  pushLog(s, `Happy birthday. You are now ${age}.`);
  if (age === RETIRE) { s.job = null; pushLog(s, 'You retired. Your pension starts.'); }
  if (s.fame > 0) s.fame = Math.max(0, Math.round(s.fame * .92));
  if (rng() < .6) {
    const ev = EVENTS[Math.floor(rng() * EVENTS.length)](s, rng);
    s.money += ev.cash;
    if (ev.fame) s.fame = Math.min(100, s.fame + ev.fame);
    if (ev.dip) STOCKS.forEach(x => s.prices[x.id] *= .9);
    pushLog(s, `${ev.msg} ${ev.cash >= 0 ? '+' : '\u2212'}${fmt(Math.abs(ev.cash))}`);
  }
  rollLife(s, age, rng);
}
export function rollLife(s: GameState, age: number, rng: () => number = Math.random): void {
  if (s.pending || s.aiEv) return;
  const pool = LIFE.filter(e => age >= e.min && age <= e.max && e.ok(s) && rng() < e.p);
  if (!pool.length) return;
  const e = pool[Math.floor(rng() * pool.length)];
  if (e.pre) e.pre(s);
  s.pending = e.id;
}
export function currentEvent(s: GameState): LifeDef | null { return LIFE.find(x => x.id === s.pending) || null; }

// ---------- actions (mutate state) ----------
export function addLot(s: GameState, id: string) { const it = ITEM_BY[id]; s.lots.push({ id, paid: it.price, day: s.day }); }
export function doWork(s: GameState) { s.money += clickVal(s); }
export function openBranch(s: GameState, id: string): string | null {
  const b = BIZ.find(x => x.id === id); if (!b) return null;
  const c = bizCost(s, b);
  if (s.money < c || !meets(s, b.req)) return null;
  s.money -= c;
  s.branches[b.id] = (s.branches[b.id] || []).concat([{ r: branchCount(s, b.id) % 6, mood: 1, paid: c, day: s.day }]);
  s.biz[b.id] = branchCount(s, b.id);
  s.fame = Math.min(100, s.fame + 2);
  addXp(s, 25);
  const reg = b.reg[(branchCount(s, b.id) - 1) % b.reg.length];
  pushLog(s, `Opened ${b.name} branch in ${reg}.`);
  addPost(s, `Ribbon cut! New ${b.name} opening in ${reg}.`, 1.2);
  return `Opened a ${b.name} in ${reg}!`;
}
export function buyFarmLine(s: GameState, id: string): string | null {
  const l = FARM_LINES.find(x => x.id === id); if (!l || s.farm[l.id]) return null;
  if (!lineReady(s, l) || s.money < l.cost) return null;
  s.money -= l.cost; s.farm[l.id] = 1; s.farmBought[l.id] = s.day;
  addXp(s, 20);
  pushLog(s, `Farm expanded: ${l.name}.`);
  return `${l.name} is now part of your farm!`;
}
export function buyFacLine(s: GameState, id: string): string | null {
  const l = FAC_LINES.find(x => x.id === id); if (!l || s.fac[l.id]) return null;
  if (!lineReady(s, l) || s.money < l.cost) return null;
  s.money -= l.cost; s.fac[l.id] = 1; s.facBought[l.id] = s.day;
  addXp(s, 20);
  pushLog(s, `Factory line: ${l.name}.`);
  return `${l.name} built!${l.food ? ' Your farm supplies it (+30%).' : ''}`;
}
export function buyItem(s: GameState, id: string): string | null {
  const it = ITEM_BY[id]; if (!it || s.money < it.price) return null;
  s.money -= it.price; addLot(s, id);
  s.fame = Math.min(100, s.fame + (it.lux >= 100 ? 3 : it.lux >= 30 ? 1 : 0));
  if (it.price >= 10000) addPost(s, `Just picked up a new ${it.name}. Life is good.`, it.lux >= 100 ? 2 : 1);
  return 'Bought ' + it.name;
}
export function sellLot(s: GameState, idx: number): string | null {
  const l = s.lots[idx]; if (!l) return null;
  const got = lotValue(s, l) * (1 - RESALE_FEE);
  s.money += got; s.lots.splice(idx, 1);
  return 'Sold for ' + fmt(got);
}
export function trade(s: GameState, id: string, action: 'buy' | 'sell', qty: number): { ok: boolean; msg: string } {
  const p = s.prices[id]; const q = Math.max(1, Math.floor(qty || 1));
  if (action === 'buy') {
    const cost = p * q;
    if (s.money < cost) return { ok: false, msg: `Not enough cash for ${q} share${q > 1 ? 's' : ''}` };
    s.money -= cost; s.stk[id] = (s.stk[id] || 0) + q;
    return { ok: true, msg: `Bought ${q} \u00d7 ${id}` };
  }
  const held = s.stk[id] || 0; if (!held) return { ok: false, msg: 'Nothing to sell' };
  const n = Math.min(q, held);
  s.money += p * n; s.stk[id] = held - n;
  addXp(s, 4);
  return { ok: true, msg: `Sold ${n} \u00d7 ${id} for ${fmt(p * n)}` };
}
export function joinClub(s: GameState, id: string): string | null {
  const z = CLUBS.find(q => q.id === id); if (!z) return null;
  if (netWorth(s) < z.min || s.money < z.fee) return null;
  s.money -= z.fee; s.club = z.id;
  addXp(s, 30);
  return 'Welcome to the ' + z.name + '!';
}
export function foundClub(s: GameState, name: string): string | null {
  if (netWorth(s) < FOUND_MIN_NW || s.money < FOUND_COST) return null;
  s.money -= FOUND_COST; s.club = 'own'; s.ownClub = (name || s.name + '\u2019s circle').slice(0, 30);
  addXp(s, 60);
  pushLog(s, `Founded your own club: ${s.ownClub}.`);
  addPost(s, `Proud to announce ${s.ownClub} — a circle for people who build things.`, 1.5);
  return `${s.ownClub} is founded!`;
}
export function hire(s: GameState, id: string): string | null {
  const j = JOBS.find(q => q.id === id); if (!j) return null;
  if (s.job === j.id) { s.job = null; pushLog(s, `Quit ${j.name}.`); return 'You quit ' + j.name; }
  s.job = j.id; pushLog(s, `Started work as ${j.name}.`);
  return 'Hired as ' + j.name + '!';
}
export function enrollDeg(s: GameState, f: FieldKey): string | null {
  const field = FIELDS[f];
  if (!field || s.study) return null;
  const F = FIELDS[f], L = (s.deg[f] || 0) + 1;
  if (!F.names[L - 1] || s.age > F.maxAge[L - 1]) return null;
  s.study = { kind: 'deg', field: f, lvl: L, name: F.names[L - 1] + ' (' + F.name + ')', end: s.day + effYears(s, f, L) * 365.25, tuition: tuitionOf(s, f, L) };
  pushLog(s, `Enrolled: ${s.study.name}.`);
  return 'Enrolled: ' + s.study.name;
}
export function enrollLic(s: GameState, id: string): string | null {
  const l = LIC_BY[id];
  if (!l || s.money < l.cost || s.sideStudy || s.study?.kind === 'lic') return null;
  const course: Study = { kind: 'lic', id: l.id, name: l.name, end: s.day + l.days, tuition: 0 };
  s.money -= l.cost;
  if (s.study) s.sideStudy = course;
  else s.study = course;
  pushLog(s, `Enrolled: ${l.name}${s.sideStudy === course ? ' as an evening course' : ''}.`);
  return `Enrolled: ${l.name}${s.sideStudy === course ? ' (evening course)' : ''}`;
}
export function bankOp(s: GameState, op: 'dep' | 'wd' | 'loan' | 'repay', amt: number | 'all'): string | null {
  const maxLoan = Math.max(0, Math.floor(netWorth(s) * .5 - s.bank.loan));
  if (op === 'dep') { const a = amt === 'all' ? Math.floor(s.money) : amt; if (a <= 0 || s.money < a) return null; s.money -= a; s.bank.dep += a; return 'Deposited ' + fmt(a); }
  if (op === 'wd') { const a = amt === 'all' ? Math.floor(s.bank.dep) : amt; if (a <= 0 || s.bank.dep < a) return null; s.bank.dep -= a; s.money += a; return 'Withdrew ' + fmt(a); }
  if (op === 'loan') { const a = amt === 'all' ? maxLoan : Math.min(amt, maxLoan); if (a <= 0) return null; s.bank.loan += a; s.money += a; return `Borrowed ${fmt(a)} at 6%/yr`; }
  const a = amt === 'all' ? Math.min(s.bank.loan, Math.floor(s.money)) : amt;
  if (a <= 0 || s.money < a) return null;
  s.money -= a; s.bank.loan = Math.max(0, s.bank.loan - a);
  return 'Repaid ' + fmt(a);
}
export function donate(s: GameState, amt: number): string | null {
  if (s.money < amt) return null;
  s.money -= amt; s.donated += amt;
  const g = amt >= 100000 ? 5 : amt >= 10000 ? 2 : 1;
  const ka = amt >= 100000 ? 8 : amt >= 10000 ? 3 : 1;
  s.fame = Math.min(100, s.fame + g);
  s.karma += ka;
  addXp(s, Math.max(2, Math.round(amt / 10000)));
  if (amt >= 10000) addPost(s, `Gave ${fmt(amt)} to charity today. Small acts, big ripples.`, 1.3);
  pushLog(s, `Donated ${fmt(amt)} to charity. Fame +${g}, karma +${ka}.`);
  return `Donated ${fmt(amt)} \u00b7 fame +${g}`;
}
export function applyEventChoice(s: GameState, idx: number, rng: () => number = Math.random): string {
  const ev = currentEvent(s); if (!ev) return '';
  const c = ev.choices[idx]; if (!c) return '';
  if (c.cost) s.money -= c.cost;
  const msg = c.fx(s, rng) || '';
  pushLog(s, `${ev.title}: ${msg}`);
  s.pending = null;
  return msg;
}
export function applyAIChoice(s: GameState, idx: number): string {
  const ev = s.aiEv; if (!ev) return '';
  const c = ev.choices[idx]; if (!c) return '';
  if (c.cost) s.money -= c.cost;
  if (c.money) s.money += c.money;
  if (c.fame) s.fame = Math.min(100, Math.max(0, s.fame + c.fame));
  const msg = c.out || 'Time will tell.';
  pushLog(s, `AI twist \u2014 ${ev.title}: ${msg}`);
  addPost(s, `${ev.title} \u2014 you read it here first.`, 1);
  s.story.used.push(ev.title); if (s.story.used.length > 24) s.story.used.shift();
  s.aiEv = null;
  return msg;
}
function finishStudy(s: GameState, study: Study, rng: () => number): void {
  if (study.kind === 'deg' && study.field) s.deg[study.field] = study.lvl!;
  else if (study.id) s.lic[study.id] = true;
  addXp(s, study.kind === 'deg' ? 150 : 40, rng);
  pushLog(s, `Graduated: ${study.name}.`);
  addPost(s, study.kind === 'deg' ? `Officially graduated — ${study.name}!` : `Picked up a new licence: ${study.name}.`, 1.2, rng);
  recordActivity(s, `Completed: ${study.name}`);
}
export function gameOverTier(s: GameState): { tier: string; nw: number } {
  const nw = netWorth(s);
  const tier = nw < 1e6 ? 'Humble beginnings' : nw < 1e7 ? 'Comfortable life' : nw < 1e8 ? 'Tycoon' : nw < 1e9 ? 'Billionaire' : 'Legend';
  return { tier, nw };
}

// ---------- main tick ----------
export function tick(s: GameState, dtMs: number, rng: () => number = Math.random): { taxToast?: string; yearToast?: string; gameJustOver?: boolean } {
  const out: { taxToast?: string; yearToast?: string; gameJustOver?: boolean } = {};
  if (s.over || s.pending || s.aiEv || !s.started) return out;
  s.day += dtMs / DAY_MS; // dt is milliseconds; DAY_MS milliseconds = 1 game day
  s.age = START + s.day / 365.25;
  const beforeYear = worldYear(s);
  while (s.lastDay < Math.floor(s.day) && !s.over) { s.lastDay++; processDay(s, s.lastDay, rng); }
  if (s.spaceUpgrade && s.day >= s.spaceUpgrade.completesDay) {
    s.spaceUpgrade = null;
    s.spaceTravel = true;
    pushLog(s, 'Deep-space navigation certified. Space venture income is now 20% higher.');
  }
  const afterYear = worldYear(s);
  if (afterYear > beforeYear) {
    const news = ALLNEWS[afterYear];
    out.yearToast = `New year ${afterYear}` + (news ? `: ${news[0]}` : ` \u2014 ${eraOf(afterYear).name}`);
  }
  if (s.study && s.day >= s.study.end) {
    finishStudy(s, s.study, rng);
    s.study = null;
  }
  if (s.sideStudy && s.day >= s.sideStudy.end) {
    finishStudy(s, s.sideStudy, rng);
    s.sideStudy = null;
  }
  while (Math.floor(s.age) > s.lastYr && !s.over) { s.lastYr++; yearEnd(s, s.lastYr, rng); }
  if (s.age >= END_AGE && !s.over) { s.age = END_AGE; s.over = true; s.cause = 'age'; out.gameJustOver = true; }
  if (!s.over && s.health <= 0) { s.over = true; s.cause = 'health'; out.gameJustOver = true; }
  return out;
}

// ---------- ranking ----------
export interface RankRow { n: string; a: number; nat: string; ind: string; v: number; me?: boolean }
export function playerIndustry(s: GameState): string {
  let best: string | null = null, bn = 0;
  BIZ.forEach(b => { const n = branchCount(s, b.id); if (n > bn) { bn = n; best = b.ind; } });
  return best || (jobOf(s) ? 'Profession' : '\u2014');
}
export function botRows(s: GameState): RankRow[] {
  const yrs = Math.max(0, s.age - 18);
  const rows: RankRow[] = BOTS.map(([n, a, nat, ind, v]) => ({ n, a: a + yrs, nat, ind, v: v * Math.pow(1.12, yrs) }));
  rows.push({ n: s.name, a: Math.floor(s.age), nat: s.nation, ind: playerIndustry(s), v: netWorth(s), me: true });
  return rows;
}
export function knowledgeText(s: GameState): string {
  const d = Object.keys(FIELDS).filter(f => s.deg[f as FieldKey]).map(f => FIELDS[f as FieldKey].names[s.deg[f as FieldKey] - 1]);
  const l = LICENSES.filter(x => s.lic[x.id]).map(x => x.name);
  return [...d, ...l].join(' \u00b7 ') || 'None yet';
}
export function snapshot(s: GameState) {
  const y = worldYear(s);
  return {
    name: s.name, age: Math.floor(s.age), year: y, era: eraOf(y).name, nation: s.nation,
    money: Math.round(s.money), netWorth: Math.round(netWorth(s)),
    job: jobOf(s) ? jobOf(s)!.name : null,
    degrees: Object.keys(FIELDS).filter(f => s.deg[f as FieldKey]).map(f => FIELDS[f as FieldKey].names[s.deg[f as FieldKey] - 1]),
    businesses: BIZ.filter(b => branchCount(s, b.id)).map(b => `${b.name} \u00d7${branchCount(s, b.id)}`),
    farm: FARM_LINES.filter(l => s.farm[l.id]).map(l => l.name),
    factory: FAC_LINES.filter(l => s.fac[l.id]).map(l => l.name),
    space: SPACE_LINES.filter(l => s.space[l.id]).map(l => l.name),
    family: (s.married ? 'married' : s.partner ? 'dating' : 'single') + (s.kids ? `, ${s.kids} kid${s.kids > 1 ? 's' : ''}` : ''),
    fame: s.fame, level: s.level, followers: s.social.followers, studying: s.study ? s.study.name : null,
    health: Math.round(s.health), spirit: Math.round(s.spirit), karma: s.karma, recent: s.log.slice(-6)
  };
}

// ---------- formatting ----------
export function fmt(n: number): string {
  const neg = n < 0; n = Math.abs(n);
  let out: string;
  if (n < 1000) out = n < 10 ? n.toFixed(2) : Math.floor(n).toString();
  else {
    const u = ['K', 'M', 'B', 'T']; let i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    out = n.toFixed(n < 10 ? 2 : 1) + u[i];
  }
  return (neg ? '\u2212' : '') + '$' + out;
}
