// ================= GAME ENGINE (ported from the static game, TS) =================
import {
  DAY_MS, START, END_AGE, RETIRE, PENSION, RESALE_FEE, BIZ_DEGREE_BONUS,
  ASSET_DEPRECIATION_RATE, BIZ_MULTIPLIER_CAP,
  FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT, OWN_CLUB_MAX_MEMBERS,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, BRANCH_GROWTH, REG_MULT,
  LEVEL_INCOME_BONUS, xpNeed, GIGS, SPACE_LINES,
  ALLNEWS, YEAR_EVENTS, eraOf, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES,
  BIZ, FARM_LINES, FAC_LINES, ITEM_BY, STOCKS, CLUBS, JOBS, BOTS,
  NPC_BY,
  analyze, type FieldKey, type LineDef, type Req, type GigDef, type SpaceDef, type Rarity, RARITY_MULT, itemRarity, POST_TEMPLATES
} from './gameData';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Branch { r: number; mood: number; paid: number; day: number }
export interface Study { kind: 'deg' | 'lic'; field?: FieldKey; lvl?: number; id?: string; name: string; end: number; tuition: number }
export interface DayTimeline { day: number; entries: string[] }
export interface AIChoice { l: string; cost?: number; money?: number; fame?: number; out?: string; kind?: AIEventKind; decline?: number; dropout?: { slot: 'study' | 'sideStudy' }; liquidate?: { biz: string; n: number }; risk?: 'safe' | 'medium' | 'high' }
// v10.4 — AI events are now categorised. 'story' = open-ended life twist (the
// classic oracle), 'luck' = windfall, 'badluck' = loss/damage, 'lifestage' =
// a meaningful life-stage pivot (close shop, drop out, wrong turn).
export type AIEventKind = 'story' | 'luck' | 'badluck' | 'lifestage';
export interface AIEvent { title: string; text: string; choices: AIChoice[]; source?: 'backend' | 'backend-local' | 'local'; kind?: AIEventKind }
export interface Post { d: number; t: string; likes: number }
export type Religion = 'none' | 'buddhism' | 'christianity' | 'islam' | 'hinduism' | 'folk';
export const RELIGIONS: Religion[] = ['none', 'buddhism', 'christianity', 'islam', 'hinduism', 'folk'];
export interface GameState {
  schemaVersion: number;
  money: number; age: number; day: number; lastDay: number; lastYr: number;
  biz: Record<string, number>; branches: Record<string, Branch[]>;
  farm: Record<string, number>; fac: Record<string, number>; space: Record<string, number>;
  farmBought: Record<string, number>; facBought: Record<string, number>; spaceBought: Record<string, number>;
  spaceUpgrade: { startedDay: number; completesDay: number } | null; spaceTravel: boolean;
  lots: { id: string; paid: number; day: number; condition?: number; condDay?: number; repaired?: number }[]; stk: Record<string, number>;
  club: string | null; ownClub: string | null; job: string | null; sideJob: string | null;
  deg: Record<FieldKey, number>; lic: Record<string, boolean>; study: Study | null; sideStudy: Study | null;
  name: string; byear: number; nation: string; religion: Religion; ints: string[]; tals: string[]; topField: FieldKey | null;
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
  ach: string[];
  // v10.4 — used-market purchases and player Hall of Fame entry written at
  // game over. Kept on the same GameState shape so save migration is trivial.
  used: { id: string; baseId: string; name: string; brand?: string; cat: string; c: string; art: string; ageYears: number; condition: number; paid: number; day: number; lux: number; rate: number; story: string }[];
  hall: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string } | null;
  // v10.5 — reincarnation ledger. Each entry is a past life recorded at the
  // moment of reincarnation (not at game over — game over only writes s.hall).
  // Lives across reincarnations so the player can look back at the chain.
  pastLives: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string; cause: 'age' | 'health' | 'reincarnated' }[];
  // v10.5 — relationships: per-NPC friendship/romance + interaction log.
  // Keyed by NPC id. friendship is -100..100 (hostile to best friend);
  // romance is 0..100 (only meaningful for one NPC at a time).
  relations: Record<string, { friendship: number; romance: number; lastInteract: number; interactions: number }>;
}

// ---------- wellbeing: body & mind ----------
export type T = (k: string, f?: string, v?: Record<string, string | number>) => string;
export const GYM_COST = 80, GYM_CD = 2, GYM_HP = 6;
export const CHECKUP_COST = 600, CHECKUP_CD = 30, CHECKUP_HP = 15;
export const DIET_COST = 6;
export const TEMPLE_COST = 500, TEMPLE_CD = 3;
export const RETREAT_COST = 8000, RETREAT_CD = 60;
export interface WellDef { id: string; cost: number; cd: number }
export const FAITH_PRACTICE_COST = 250, FAITH_PRACTICE_CD = 7;
export const WELL: WellDef[] = [
  { id: 'gym', cost: GYM_COST, cd: GYM_CD },
  { id: 'checkup', cost: CHECKUP_COST, cd: CHECKUP_CD },
  { id: 'meditate', cost: 0, cd: 1 },
  { id: 'temple', cost: TEMPLE_COST, cd: TEMPLE_CD },
  { id: 'retreat', cost: RETREAT_COST, cd: RETREAT_CD },
  { id: 'faithPractice', cost: FAITH_PRACTICE_COST, cd: FAITH_PRACTICE_CD },
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
export type HealthWarning = 'critical' | 'low' | 'recover' | 'sleep' | 'diet';
export function healthWarnings(s: GameState): HealthWarning[] {
  const warnings: HealthWarning[] = [];
  if (s.health < 20) warnings.push('critical');
  else if (s.health < 40) warnings.push('low');
  else if (s.health < 60) warnings.push('recover');
  if (s.sleepHours < 7) warnings.push('sleep');
  if (!s.diet && s.health < 70) warnings.push('diet');
  return warnings;
}
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
  if (id === 'faithPractice') { s.spirit = Math.min(100, s.spirit + 3); s.karma += 2; addXp(s, 3); return t('sp.faithDone'); }
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
  pay *= levelMult(s) * (1 + Math.log10(Math.max(1, s.fame + 1)) * 0.2) * healthMult(s);
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
  if (g.id !== 'ad' && rng() < 0.04) s.fame = s.fame + 1;
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
  // v10.5: fame is now unbounded — scale likes by sqrt(fame) so a fame of
  // 10k doesn't blow up the like count linearly.
  const fameLikes = Math.sqrt(Math.max(0, s.fame)) * 30;
  let likes = Math.round((s.social.followers * 0.05 + fameLikes + 5) * (0.4 + rng() * 1.2) * boost);
  // v10.5 — follower dynamics:
  //   5% chance of a viral spike (2-3× normal followers gained)
  //   3% chance of a backlash (lose followers + this post gets fewer likes)
  const spike = rng() < 0.05;
  const backlash = rng() < 0.03;
  if (backlash) {
    // The post underperforms and loses some followers
    likes = Math.max(0, Math.round(likes * 0.3));
    const lost = Math.round(s.social.followers * (0.01 + rng() * 0.04));
    s.social.followers = Math.max(0, s.social.followers - lost);
    pushLog(s, `Backlash on a post — lost ${lost.toLocaleString()} followers.`);
  }
  s.social.posts.unshift({ d: s.lastDay, t, likes });
  if (s.social.posts.length > 12) s.social.posts.pop();
  const gainMult = spike ? 2 + rng() : 1;
  s.social.followers += Math.round(likes * 0.3 * boost * gainMult) + (s.fame > 0 ? 2 : 0);
  if (spike) pushLog(s, `A post went viral — followers surged.`);
  if (s.social.followers >= 100000 && !s.social.verified) {
    s.social.verified = true;
    pushLog(s, 'Your account got the blue check. Verified!');
    addXp(s, 40);
  }
}

// v10.5 — pick a varied post template by category and interpolate context.
// Avoids the "Just a life update from my little corner of the world." repeat.
// Categories: update / hype / charity / milestone. 'hype' needs a biz;
// if the player has no business yet, falls back to 'update'.
export function creativePost(s: GameState, kind: 'update' | 'hype' | 'charity' | 'milestone'): string {
  const y = worldYear(s);
  const era = eraOf(y).name;
  const biz = BIZ.find(b => branchCount(s, b.id) > 0);
  const bizName = biz ? biz.name : 'the company';
  const ctx: Record<string, string> = {
    year: String(y), era, nation: s.nation, biz: bizName, name: s.name
  };
  const pool = (kind === 'hype' && !biz) ? POST_TEMPLATES.update : POST_TEMPLATES[kind];
  const tpl = pool[Math.floor(Math.random() * pool.length)];
  return tpl.replace(/\{(\w+)\}/g, (_m, key: string) => ctx[key] || '');
}
export function buySpace(s: GameState, id: string): string | null {
  const l = SPACE_LINES.find(x => x.id === id); if (!l || s.space[id]) return null;
  if (s.level < l.lvl || worldYear(s) < l.since || s.money < l.cost) return null;
  s.money -= l.cost; s.space[id] = 1; s.spaceBought[id] = s.day;
  s.fame = s.fame + 5;
  addXp(s, 200);
  pushLog(s, `Frontier venture founded: ${l.name}.`);
  addPost(s, `We are officially going beyond Earth. ${l.name} is a go.`, 2);
  return `${l.name} founded! Welcome to the cosmic frontier.`;
}

export function fresh(): GameState {
  const s: GameState = {
    schemaVersion: 4,
    money: 0, age: START, day: 0, lastDay: 0, lastYr: START, biz: {}, branches: {}, farm: {}, fac: {},
    farmBought: {}, facBought: {}, spaceBought: {}, spaceUpgrade: null, spaceTravel: false,
    lots: [], stk: {},     club: null, ownClub: null, job: null, sideJob: null,
    deg: { business: 0, engineering: 0, medicine: 0, science: 0, arts: 0 }, lic: {}, study: null, sideStudy: null,
    name: 'Alex', byear: 1992, nation: 'Vietnam', religion: 'none', ints: [], tals: [], topField: null, started: false,
    bank: { dep: 0, loan: 0 }, fame: 0, donated: 0, yIncome: 0, yTax: 0,
    prices: {}, hist: {}, eraBiz: 1, eraFac: 1,
    log: [], over: false, pending: null, aiEv: null,
    partner: false, married: false, kids: 0, m1: false, story: { used: [] },
    level: 1, xp: 0, gigs: {}, space: {}, social: { followers: 0, posts: [] },
    health: 92, spirit: 18, karma: 0, diet: false, well: {}, cause: null,
    sleepHours: 8, timeline: [], ach: [],
    used: [], hall: null, pastLives: [], relations: {}
  };
  STOCKS.forEach(x => { s.prices[x.id] = x.p; s.hist[x.id] = [x.p]; });
  return s;
}
export function migrate(raw: unknown): GameState {
  const source = raw && typeof raw === 'object' ? raw as Partial<GameState> : {};
  const s = Object.assign(fresh(), source);
  let version = Number.isInteger(source.schemaVersion) && source.schemaVersion! >= 0 ? source.schemaVersion! : 0;
  while (version < 4) {
    if (version === 0) {
      s.schemaVersion = 1;
      version = 1;
    } else if (version === 1) {
      s.sideStudy = null;
      s.sleepHours = 8;
      s.timeline = [];
      s.schemaVersion = 2;
      version = 2;
    } else if (version === 2) {
      s.sideJob = null;
      s.religion = 'none';
      s.schemaVersion = 3;
      version = 3;
    } else if (version === 3) {
      s.ach = [];
      s.schemaVersion = 4;
      version = 4;
    }
  }
  s.schemaVersion = Math.max(s.schemaVersion || 0, 4);
  s.ach = Array.isArray(s.ach) ? s.ach : [];
  s.bank = s.bank || { dep: 0, loan: 0 };
  s.story = s.story || { used: [] };
  s.used = Array.isArray(s.used) ? s.used : [];
  s.hall = s.hall || null;
  s.pastLives = Array.isArray(s.pastLives) ? s.pastLives : [];
  s.relations = s.relations && typeof s.relations === 'object' ? s.relations : {};
  s.branches = s.branches || {};
  s.farm = s.farm || {}; s.fac = s.fac || {}; s.space = s.space || {};
  s.farmBought = s.farmBought || {}; s.facBought = s.facBought || {}; s.spaceBought = s.spaceBought || {};
  s.spaceUpgrade = s.spaceUpgrade || null; s.spaceTravel = !!s.spaceTravel;
  s.sideStudy = s.sideStudy || null;
  s.sideJob = s.sideJob || null;
  const savedPrimaryJob = JOBS.find(job => job.id === s.job);
  if (savedPrimaryJob && !savedPrimaryJob.ft && !s.sideJob) {
    s.sideJob = savedPrimaryJob.id;
    s.job = null;
  }
  if (!RELIGIONS.includes(s.religion)) s.religion = 'none';
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
export function begin(s: GameState, opts: { name: string; byear: number; nation: string; religion?: Religion; ints: string[]; tals: string[] }) {
  const a = analyze(opts.ints, opts.tals);
  Object.assign(s, fresh(), { started: true });
  s.name = opts.name.slice(0, 24) || 'Alex';
  s.byear = opts.byear; s.nation = opts.nation; s.religion = opts.religion || 'none';
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
export const fameBonus = (s: GameState) => 1 + Math.log10(Math.max(1, s.fame + 1)) * 0.1;
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
export const jobsOf = (s: GameState) => [s.job, s.sideJob]
  .filter((id, index, all): id is string => !!id && all.indexOf(id) === index)
  .map(id => JOBS.find(j => j.id === id))
  .filter((job): job is (typeof JOBS)[number] => !!job);
export const jobOf = (s: GameState) => jobsOf(s)[0];
export const jobIncome = (s: GameState) => jobsOf(s).reduce((total, job) => total + job.salary * (job.ft ? studyWorkMult(s) : 1), 0);
export const studyTuition = (s: GameState) => [s.study, s.sideStudy]
  .reduce((total, study) => total + (study?.kind === 'deg' ? study.tuition : 0), 0);
export const yearIncome = (s: GameState) => bizIncome(s) + spaceIncome(s) + socialIncome(s) + jobIncome(s) + (s.age >= RETIRE ? PENSION : 0);
export const living = (age: number) => Math.round(3000 * Math.pow(1.03, age - START));
export const lotValue = (s: GameState, l: { id: string; paid: number; day: number; condition?: number }) => {
  const it = ITEM_BY[l.id];
  const itemRate = it.rate;
  const rate = Math.min(itemRate, ASSET_DEPRECIATION_RATE);
  const yrs = Math.max(0, (s.day - l.day) / 365.25);
  const base = l.paid * Math.pow(1 + rate, yrs);
  // v10.5: condition multiplies value (40-100% range → 0.4-1.0 of base).
  // Rare/legendary items decay slower (condition floor higher).
  const cond = l.condition == null ? 100 : l.condition;
  const rarity = itemRarity(it);
  const floor = rarity === 'legendary' ? 70 : rarity === 'rare' ? 55 : rarity === 'uncommon' ? 45 : 35;
  const eff = Math.max(floor, cond);
  const condFactor = 0.4 + 0.6 * (eff / 100);
  // Rare/legendary get a rarity premium on top.
  return base * condFactor * (rarity === 'legendary' ? 1.6 : rarity === 'rare' ? 1.2 : rarity === 'uncommon' ? 1.05 : 1);
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
export const studyWorkMult = (s: GameState) => (s.study || s.sideStudy) && jobsOf(s).some(job => job.ft) ? .6 : 1;
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
  const jobs = jobsOf(s);
  if (jobs.length) routine.push(`Work: ${jobs.map(job => `${job.name}${job.ft && studyWorkMult(s) < 1 ? ' (reduced hours for study)' : ''}`).join(' + ')}`);
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
    const net = jobIncome(s) / 26 + (s.age >= RETIRE ? PENSION / 26 : 0);
    if (net > 0) { s.money += net; s.yIncome += net; pushLog(s, `Payday: +${fmt(net)}.`); }
  }
  if (dt.getUTCDate() === 1) {
    const profit = bizIncome(s) / 12 + spaceIncome(s) / 12 + socialIncome(s) / 12;
    const tuition = studyTuition(s) / 12;
    const loanInt = s.bank.loan * LOAN_RATE / 12;
    const bills = living(s.age) / 12 + upkeep(s) / 12 + tuition + s.kids * 400 + loanInt;
    const interest = s.bank.dep * SAVE_RATE / 12;
    s.bank.dep += interest; s.yIncome += Math.max(0, interest);
    s.money += profit - bills;
    if (profit > 0) s.yIncome += profit;
    // social media: follower graph drifts with fame every month (sqrt growth + hard cap)
    const fg = Math.min(
      Math.round((Math.sqrt(Math.max(0, s.fame)) * 140 + Math.sqrt(s.social.followers) * 8) * (0.4 + rng() * 1.2)),
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
  if (age === RETIRE) { s.job = null; s.sideJob = null; pushLog(s, 'You retired. Your pension starts.'); }
  if (s.fame > 0) s.fame = Math.max(0, Math.round(s.fame * .92));
  if (rng() < .6) {
    const ev = EVENTS[Math.floor(rng() * EVENTS.length)](s, rng);
    s.money += ev.cash;
    if (ev.fame) s.fame = Math.max(0, s.fame + ev.fame);
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
export function addLot(s: GameState, id: string) { const it = ITEM_BY[id]; s.lots.push({ id, paid: it.price, day: s.day, condition: 100, condDay: s.day, repaired: 0 }); }
export function doWork(s: GameState) { s.money += clickVal(s); }
export function openBranch(s: GameState, id: string): string | null {
  const b = BIZ.find(x => x.id === id); if (!b) return null;
  const c = bizCost(s, b);
  if (s.money < c || !meets(s, b.req)) return null;
  s.money -= c;
  s.branches[b.id] = (s.branches[b.id] || []).concat([{ r: branchCount(s, b.id) % 6, mood: 1, paid: c, day: s.day }]);
  s.biz[b.id] = branchCount(s, b.id);
  s.fame = s.fame + 2;
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
  s.fame = s.fame + (it.lux >= 100 ? 3 : it.lux >= 30 ? 1 : 0);
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
  if (s.sideJob === j.id) { s.sideJob = null; pushLog(s, `Quit ${j.name}.`); return 'You quit ' + j.name; }
  const current = jobsOf(s).find(job => job.ft === j.ft);
  if (current) return `Quit ${current.name} first to change this work slot.`;
  const key = j.ft ? 'job' : 'sideJob';
  s[key] = j.id; pushLog(s, `Started work as ${j.name}.`);
  return 'Hired as ' + j.name + '!';
}
export function enrollDeg(s: GameState, f: FieldKey): string | null {
  const field = FIELDS[f];
  if (!field || [s.study, s.sideStudy].filter(Boolean).length >= 2 ||
    [s.study, s.sideStudy].some(study => study?.kind === 'deg' && study.field === f)) return null;
  const F = FIELDS[f], L = (s.deg[f] || 0) + 1;
  if (!F.names[L - 1] || s.age > F.maxAge[L - 1]) return null;
  const study: Study = { kind: 'deg', field: f, lvl: L, name: F.names[L - 1] + ' (' + F.name + ')', end: s.day + effYears(s, f, L) * 365.25, tuition: tuitionOf(s, f, L) };
  if (s.study) s.sideStudy = study;
  else s.study = study;
  pushLog(s, `Enrolled: ${study.name}${s.sideStudy === study ? ' as a second major' : ''}.`);
  return 'Enrolled: ' + study.name;
}
export function enrollLic(s: GameState, id: string): string | null {
  const l = LIC_BY[id];
  if (!l || s.money < l.cost || [s.study, s.sideStudy].filter(Boolean).length >= 2 ||
    s.lic[id] || [s.study, s.sideStudy].some(study => study?.kind === 'lic' && study.id === id)) return null;
  const course: Study = { kind: 'lic', id: l.id, name: l.name, end: s.day + l.days, tuition: 0 };
  s.money -= l.cost;
  if (s.study) s.sideStudy = course;
  else s.study = course;
  const parallel = s.sideStudy === course;
  pushLog(s, `Enrolled: ${l.name}${parallel ? ' as a parallel course' : ''}.`);
  return `Enrolled: ${l.name}${parallel ? ' (parallel course)' : ''}`;
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
  s.fame = Math.max(0, s.fame + g);
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
  // v10.5: risk-weighted outcome. The choice's static money/fame/decline are
  // the UPSIDE; rollRiskOutcome applies a commensurate DOWNSIDE when the dice
  // roll against the player. Cost is always paid (the player committed to it).
  if (c.cost) s.money -= c.cost;
  const risk = choiceRisk(c, Math.max(100000, netWorth(s)));
  const roll = rollRiskOutcome(c, risk);
  s.money += roll.money;
  if (roll.fame) s.fame = Math.max(0, s.fame + roll.fame);
  if (roll.decline) {
    s.health = Math.max(0, s.health - roll.decline);
    s.spirit = Math.max(0, s.spirit - Math.round(roll.decline * 0.6));
  }
  // v10.4: life-stage outcomes (always applied regardless of risk roll —
  // these are the choice's structural consequence, not a gamble).
  if (c.dropout && s[c.dropout.slot]) {
    const study = s[c.dropout.slot]!;
    pushLog(s, `Dropped out: ${study.name}.`);
    addPost(s, `Pivoting. Quitting ${study.name} to chase what the era actually needs.`, 1.2);
    s[c.dropout.slot] = null;
  }
  if (c.liquidate) {
    const list = s.branches[c.liquidate.biz] || [];
    const n = Math.min(c.liquidate.n, list.length);
    if (n > 0) {
      const def = BIZ.find(b => b.id === c.liquidate!.biz);
      const per = def ? Math.max(2000, def.base * 0.35) : 5000;
      const recovered = per * n;
      s.money += recovered;
      s.branches[c.liquidate.biz] = list.slice(0, list.length - n);
      if (s.branches[c.liquidate.biz].length === 0) {
        delete s.branches[c.liquidate.biz];
        delete s.biz[c.liquidate.biz];
      }
      pushLog(s, `Liquidated ${n} × ${c.liquidate.biz} branch(es); recovered ${fmt(recovered)}.`);
      addPost(s, `Hard day. Closed ${n} branch(es) to stop the bleeding. Onwards.`, 1);
    }
  }
  // Outcome text: annotate with the roll result so the player sees the dice.
  const baseMsg = c.out || 'Time will tell.';
  const msg = risk === 'safe'
    ? (roll.success ? baseMsg : `${baseMsg} (The safe bet still paid a little.)`)
    : risk === 'medium'
      ? (roll.success ? baseMsg : `${baseMsg} (It could have gone either way — this time, it didn't.)`)
      : (roll.success ? `${baseMsg} (The bold call paid off.)` : `${baseMsg} (The bold call cost you. As advertised.)`);
  pushLog(s, `AI twist — ${ev.title}: ${msg}`);
  addPost(s, `${ev.title} — you read it here first.`, 1);
  s.story.used.push(ev.title); if (s.story.used.length > 24) s.story.used.shift();
  s.aiEv = null;
  return msg;
}

// v10.5 — derive risk classification from a choice's effects.
//   safe   = green button — 80% odds of the upside, small magnitude
//   medium = orange button — 50/50, moderate magnitude either way
//   high   = red button — 20% odds of the upside, large magnitude both ways
// Outcomes MUST be commensurate with risk: a high-risk choice that pays off
// should pay big; a safe choice should never offer a windfall.
export type ChoiceRisk = 'safe' | 'medium' | 'high';
export function choiceRisk(c: { cost?: number; money?: number; fame?: number; decline?: number; dropout?: unknown; liquidate?: unknown; risk?: ChoiceRisk }, netWorthHint?: number): ChoiceRisk {
  if (c.risk) return c.risk;
  // Hard modifiers that immediately push to 'high':
  //   - dropout (life pivot, costs time)
  //   - liquidate (selling branches = irreversible business loss)
  //   - decline >= 5 (lasting health/spirit hit)
  //   - money is negative (immediate cash loss)
  if (c.dropout || c.liquidate) return 'high';
  if ((c.decline || 0) >= 5) return 'high';
  if ((c.money || 0) < 0) return 'high';
  // Cost > 5% of typical net worth → high commitment
  const nw = netWorthHint || 100000;
  if (c.cost && c.cost > nw * 0.05) return 'high';
  // Cost > 1% of typical net worth AND money upside → medium (calculated bet)
  if (c.cost && c.cost > nw * 0.01 && c.money) return 'medium';
  // Free upside with small magnitude → safe
  if (!c.cost && (c.money || 0) > 0 && (c.money || 0) <= nw * 0.05 && (c.fame || 0) <= 3) return 'safe';
  // Free upside with large magnitude → medium (still a gamble, no cost but big swing)
  if (!c.cost && (c.money || 0) > nw * 0.05) return 'medium';
  // Default: anything with a cost or a fame swing is medium
  if (c.cost || c.fame) return 'medium';
  return 'safe';
}

// v10.5 — apply the risk-weighted outcome. The choice's static money/fame/etc
// values represent the UPSIDE; when the risk dice roll against the player, a
// scaled-down or negative outcome is applied instead. This makes the risk
// colours honest: green = nearly always pays as advertised, red = usually pays
// less (or costs more) than advertised.
export function rollRiskOutcome(c: { cost?: number; money?: number; fame?: number; decline?: number }, risk: ChoiceRisk, rng: () => number = Math.random): { money: number; fame: number; decline: number; success: boolean } {
  const winChance = risk === 'safe' ? 0.8 : risk === 'medium' ? 0.5 : 0.2;
  const success = rng() < winChance;
  if (success) {
    // upside as advertised
    return { money: c.money || 0, fame: c.fame || 0, decline: 0, success: true };
  }
  // failure — commensurate downside (scales with risk)
  if (risk === 'safe') {
    // safe failure: small partial upside (80/20 means even the 20% case isn't terrible)
    return { money: Math.round((c.money || 0) * 0.3), fame: 0, decline: 0, success: false };
  }
  if (risk === 'medium') {
    // medium failure: zero upside, small decline
    return { money: 0, fame: c.fame ? -Math.abs(c.fame) : 0, decline: 2, success: false };
  }
  // high failure: negative money (lost the cost AND a bit more), decline, fame drop
  return {
    money: c.money ? -Math.round(Math.abs(c.money) * 0.5) : (c.cost ? -Math.round(c.cost * 0.2) : 0),
    fame: c.fame ? -Math.abs(c.fame) : 0,
    decline: c.decline ? Math.max(c.decline, 5) : 5,
    success: false
  };
}

// ---------- v10.4: used market + social listing ----------
export function usedItemValue(s: GameState, u: GameState['used'][number]): number {
  // Condition decay + age depreciation, then appreciation rate (positive for
  // collectibles). Anchored against the original askPrice.
  const condFactor = 0.4 + 0.6 * (u.condition / 100);
  const ageFactor = Math.pow(1 + u.rate, Math.max(0, (s.day - u.day) / 365.25));
  return Math.max(50, u.paid * condFactor * ageFactor);
}
// Real implementation — accepts a fully-resolved listing row.
export function buyUsedItem(s: GameState, listing: {
  id: string; baseId: string; name: string; brand?: string; cat: string; c: string; art: string;
  ageYears: number; condition: number; askPrice: number; lux: number; rate: number; story: string;
}): string | null {
  if (s.used.some(u => u.id === listing.id)) return null;
  if (s.money < listing.askPrice) return null;
  s.money -= listing.askPrice;
  s.used.push({
    id: listing.id, baseId: listing.baseId, name: listing.name, brand: listing.brand,
    cat: listing.cat, c: listing.c, art: listing.art,
    ageYears: listing.ageYears, condition: listing.condition, paid: listing.askPrice,
    day: s.day, lux: listing.lux, rate: listing.rate, story: listing.story
  });
  s.fame = s.fame + (listing.lux >= 100 ? 2 : listing.lux >= 30 ? 1 : 0);
  if (listing.askPrice >= 10000) addPost(s, `Picked up a pre-owned ${listing.name}. Has a story.`, 1);
  pushLog(s, `Bought used: ${listing.name} for ${fmt(listing.askPrice)}.`);
  return 'Bought ' + listing.name;
}
export function sellUsed(s: GameState, idx: number): string | null {
  const u = s.used[idx]; if (!u) return null;
  const v = usedItemValue(s, u) * (1 - RESALE_FEE);
  s.money += v; s.used.splice(idx, 1);
  pushLog(s, `Sold used ${u.name} for ${fmt(v)}.`);
  return 'Sold for ' + fmt(v);
}
// List an owned lot (new or used) on the in-game social feed. Generates a
// public post and, with some probability based on fame, an unsolicited
// premium offer (a small immediate cash bump on top of the resale value).
export function postItemListing(s: GameState, kind: 'lot' | 'used', idx: number): string | null {
  if (kind === 'lot') {
    const l = s.lots[idx]; if (!l) return null;
    const it = ITEM_BY[l.id]; if (!it) return null;
    const v = lotValue(s, l) * (1 - RESALE_FEE);
    addPost(s, `Listing my ${it.name} on the feed. DM if serious. Asking ${fmt(v)}.`, 1.4);
    s.fame = s.fame + 1;
    pushLog(s, `Posted listing for ${it.name}.`);
    return 'Posted: ' + it.name;
  }
  const u = s.used[idx]; if (!u) return null;
  const v = usedItemValue(s, u) * (1 - RESALE_FEE);
  addPost(s, `Anyone want my ${u.name}? ${u.story} Asking ${fmt(v)}.`, 1.5);
  s.fame = s.fame + 1;
  pushLog(s, `Posted used listing for ${u.name}.`);
  return 'Posted: ' + u.name;
}

// ---------- v10.5: auction by rarity + repair/restore workshop ----------
// Auction: list an item at a premium (rarity multiplier × 1.4) but with a
// real chance of NO buyer — in which case the listing fee (3% of ask) is
// lost. Rare/legendary items sell more often (collectors pay attention).
// The buyer-side RNG is rolled at listing time so the outcome is immediate.
export function auctionItem(s: GameState, kind: 'lot' | 'used', idx: number): string | null {
  const compute = (ask: number, rarity: Rarity): { sold: boolean; proceeds: number; fee: number } => {
    const fee = Math.round(ask * 0.03);
    const sellChance = rarity === 'legendary' ? 0.85 : rarity === 'rare' ? 0.75 : rarity === 'uncommon' ? 0.55 : 0.4;
    const sold = Math.random() < sellChance;
    const proceeds = sold ? Math.round(ask * (1 - RESALE_FEE)) : 0;
    return { sold, proceeds, fee };
  };
  if (kind === 'lot') {
    const l = s.lots[idx]; if (!l) return null;
    const it = ITEM_BY[l.id]; if (!it) return null;
    const rarity = itemRarity(it);
    const ask = lotValue(s, l) * RARITY_MULT[rarity] * 1.4;
    if (s.money < ask * 0.03) return null;
    const r = compute(ask, rarity);
    s.money -= r.fee;
    if (r.sold) {
      s.money += r.proceeds;
      s.lots.splice(idx, 1);
      pushLog(s, `Auction: ${it.name} sold for ${fmt(r.proceeds)} (rarity ${rarity}, ask ${fmt(ask)}).`);
      addPost(s, `Auction closed! ${it.name} went to a collector for ${fmt(r.proceeds)}.`, 1.8);
      return `Sold at auction: ${fmt(r.proceeds)}`;
    } else {
      pushLog(s, `Auction: ${it.name} found no buyer. Listing fee ${fmt(r.fee)} lost.`);
      addPost(s, `Auction fell through on the ${it.name}. No bids above reserve.`, 0.8);
      return `No buyer — lost ${fmt(r.fee)} listing fee`;
    }
  }
  const u = s.used[idx]; if (!u) return null;
  const rarity = itemRarity(u);
  const ask = usedItemValue(s, u) * RARITY_MULT[rarity] * 1.4;
  if (s.money < ask * 0.03) return null;
  const r = compute(ask, rarity);
  s.money -= r.fee;
  if (r.sold) {
    s.money += r.proceeds;
    s.used.splice(idx, 1);
    pushLog(s, `Auction: ${u.name} sold for ${fmt(r.proceeds)} (rarity ${rarity}).`);
    addPost(s, `Auction closed! ${u.name} went for ${fmt(r.proceeds)}.`, 1.8);
    return `Sold at auction: ${fmt(r.proceeds)}`;
  } else {
    pushLog(s, `Auction: ${u.name} found no buyer. Fee ${fmt(r.fee)} lost.`);
    return `No buyer — lost ${fmt(r.fee)} listing fee`;
  }
}

// Repair/restore workshop — costs cash + skill check.
// Player's relevant skill (engineering degree lvl × 25 + licence bonus)
// raises the condition restored. Mistakes cost a small additional condition
// (self-learning: 5% chance of a botched repair, loses 5 condition instead).
// Rare/legendary items cost more to repair (specialist parts).
export function repairSkill(s: GameState): number {
  const deg = s.deg.engineering || 0;
  const lic = (s.lic['pilot'] ? 1 : 0) + (s.lic['mechanic'] ? 1 : 0);
  return deg * 25 + lic * 15 + (s.tals.includes('tinker') ? 20 : 0);
}
export function repairCost(s: GameState, basePrice: number, rarity: Rarity): number {
  const mult = RARITY_MULT[rarity];
  // ~8% of base price × rarity mult × (100 - current condition)/100
  return Math.round(basePrice * 0.08 * mult);
}
export function repairLot(s: GameState, idx: number): string | null {
  const l = s.lots[idx]; if (!l) return null;
  const it = ITEM_BY[l.id]; if (!it) return null;
  const cond = l.condition == null ? 100 : l.condition;
  if (cond >= 100) return 'Already in mint condition';
  const rarity = itemRarity(it);
  const cost = repairCost(s, it.price, rarity);
  if (s.money < cost) return null;
  s.money -= cost;
  const skill = repairSkill(s);
  const restore = Math.min(100 - cond, 25 + Math.round(skill / 4));
  // 5% botch chance — self-learning: failure is its own teacher
  const botched = Math.random() < 0.05;
  if (botched) {
    l.condition = Math.max(0, cond - 5);
    l.repaired = (l.repaired || 0) + 1;
    pushLog(s, `Repair botched on ${it.name} — condition dropped to ${l.condition}. Lesson learned.`);
    return `Botched! Condition now ${l.condition} (learned from the mistake)`;
  }
  l.condition = cond + restore;
  l.condDay = s.day;
  l.repaired = (l.repaired || 0) + 1;
  addXp(s, 8); // every repair teaches something
  pushLog(s, `Repaired ${it.name}: +${restore} condition → ${l.condition}/100.`);
  return `Repaired +${restore} → ${l.condition}/100`;
}
export function repairUsed(s: GameState, idx: number): string | null {
  const u = s.used[idx]; if (!u) return null;
  if (u.condition >= 100) return 'Already in mint condition';
  const rarity = itemRarity(u);
  const cost = repairCost(s, u.paid, rarity);
  if (s.money < cost) return null;
  s.money -= cost;
  const skill = repairSkill(s);
  const restore = Math.min(100 - u.condition, 25 + Math.round(skill / 4));
  const botched = Math.random() < 0.05;
  if (botched) {
    u.condition = Math.max(0, u.condition - 5);
    pushLog(s, `Repair botched on ${u.name} — condition dropped to ${u.condition}.`);
    return `Botched! Condition now ${u.condition}`;
  }
  u.condition = u.condition + restore;
  addXp(s, 8);
  pushLog(s, `Repaired ${u.name}: +${restore} condition → ${u.condition}/100.`);
  return `Repaired +${restore} → ${u.condition}/100`;
}

// ---------- v10.4: Hall of Fame ----------
// Builds a Hall entry from the player's run, written to s.hall at game over
// (or whenever the player chooses to "retire now" from the new-life button).
export function playerHallEntry(s: GameState) {
  const { tier, nw } = gameOverTier(s);
  const y = worldYear(s);
  return {
    name: s.name,
    nation: s.nation,
    era: eraOf(y).name,
    industry: playerIndustry(s),
    peakNetWorth: fmt(nw),
    note: `${s.cause === 'health' ? 'Burned out at ' + Math.floor(s.age) : 'Lived to ' + Math.floor(s.age)} · ${tier} · ${s.ach.length}/${ACHIEVEMENTS.length} milestones · level ${s.level}`,
    livedTo: Math.floor(s.age),
    tier
  };
}
export function recordHallOnGameOver(s: GameState): void {
  if (!s.over) return;
  s.hall = playerHallEntry(s);
}

// v10.5 — reincarnation. The player keeps their identity (name, birth year,
// nation, religion, interests, talents — "memory of who they were") but
// their knowledge fades: each degree field is reduced by a random 30-80%,
// ~50% of licences are forgotten, level/xp reset, all assets go back to
// the age-18 starting position. The past life is recorded in s.pastLives
// so the player can look back at the chain of lives they have lived.
//
// Returns the new GameState (mutates s in place then returns it).
export function reincarnate(s: GameState): GameState {
  // 1. Record the past life into the ledger (only if the player actually
  //    started this life — not on a fresh game).
  if (s.started) {
    const entry = playerHallEntry(s);
    s.pastLives.push({
      ...entry,
      cause: s.over ? (s.cause || 'age') : 'reincarnated'
    });
    if (s.pastLives.length > 12) s.pastLives.shift();
  }
  // 2. Snapshot the identity fields before wiping.
  const identity = {
    name: s.name,
    byear: s.byear,
    nation: s.nation,
    religion: s.religion,
    ints: [...s.ints],
    tals: [...s.tals],
    pastLives: [...s.pastLives],
  };
  // 3. Reset to a fresh state, then re-apply the identity.
  const next = fresh();
  next.name = identity.name;
  next.byear = identity.byear;
  next.nation = identity.nation;
  next.religion = identity.religion;
  next.ints = identity.ints;
  next.tals = identity.tals;
  next.pastLives = identity.pastLives;
  // 4. Knowledge fade: each degree level drops by a random 30-80%. If a
  //    field had level 0, it stays 0. The fade roll is independent per field
  //    so a reincarnated surgeon might retain most of their medicine but
  //    forget their business degree entirely.
  for (const f of Object.keys(next.deg) as FieldKey[]) {
    const prev = s.deg[f] || 0;
    if (prev > 0) {
      const fadePct = 0.3 + Math.random() * 0.5; // 0.3..0.8
      const kept = Math.floor(prev * (1 - fadePct));
      next.deg[f] = kept;
    }
  }
  // 5. Licences: ~50% chance to forget each one.
  for (const licId of Object.keys(s.lic)) {
    if (s.lic[licId] && Math.random() < 0.5) {
      // forgotten
    } else {
      next.lic[licId] = true;
    }
  }
  // 6. Past-life memory note in the log so the player sees the chain.
  if (next.pastLives.length > 0) {
    next.log.push(`Past life: ${next.pastLives[next.pastLives.length - 1].note}`);
  }
  // 7. Copy over to s (mutate in place so the store's reference stays valid).
  Object.assign(s, next);
  return s;
}

// ---------- v10.5: relationships ----------
// Compute base friendship from shared interests between player and an NPC.
// Each shared interest = +5; each NPC interest the player DOESN'T share =
// -2 (clashing vibe). Range: roughly -6..+15 base, before interactions.
export function baseFriendship(s: GameState, npcId: string): number {
  const npc = NPC_BY[npcId]; if (!npc) return 0;
  const playerInts = new Set(s.ints);
  let base = 0;
  for (const i of npc.interests) {
    if (playerInts.has(i)) base += 5;
    else base -= 2;
  }
  // Same nation bonus
  if (s.nation === npc.nation) base += 3;
  return base;
}
export function relationState(s: GameState, npcId: string): { friendship: number; romance: number; lastInteract: number; interactions: number } {
  if (!s.relations[npcId]) {
    const base = baseFriendship(s, npcId);
    s.relations[npcId] = { friendship: base, romance: 0, lastInteract: 0, interactions: 0 };
  }
  return s.relations[npcId];
}
export function interactNPC(s: GameState, npcId: string, action: 'talk' | 'gift' | 'help' | 'argue'): string | null {
  const npc = NPC_BY[npcId]; if (!npc) return null;
  const r = relationState(s, npcId);
  // Cooldown: at least 1 game day between interactions with the same NPC.
  if (s.lastDay - r.lastInteract < 1 && action !== 'argue') return 'Give them a day.';
  r.lastInteract = s.lastDay;
  r.interactions++;
  switch (action) {
    case 'talk': {
      // Free small talk — small friendship swing, no romance impact.
      const swing = Math.random() < 0.7 ? 2 : -1;
      r.friendship = Math.max(-100, Math.min(100, r.friendship + swing));
      pushLog(s, `Talked with ${npc.name}: ${swing > 0 ? 'warmed up a little.' : 'a slightly awkward exchange.'}`);
      return swing > 0 ? `${npc.name} warmed up a little.` : `Slightly awkward exchange with ${npc.name}.`;
    }
    case 'gift': {
      // Cost money; bigger friendship + small romance; amount scales with fame.
      const cost = Math.max(500, Math.round(200 * Math.sqrt(Math.max(1, s.fame + 1))));
      if (s.money < cost) return null;
      s.money -= cost;
      const fSwing = 4 + Math.round(Math.random() * 3);
      const rSwing = 2 + Math.round(Math.random() * 2);
      r.friendship = Math.min(100, r.friendship + fSwing);
      r.romance = Math.min(100, r.romance + rSwing);
      pushLog(s, `Gifted ${npc.name} (${fmt(cost)}): friendship +${fSwing}, romance +${rSwing}.`);
      return `Gift to ${npc.name}: +${fSwing} friendship, +${rSwing} romance.`;
    }
    case 'help': {
      // Do them a favor — costs time/effort (small cash + spirit), big friendship,
      // karma bonus. No romance unless already dating.
      const cost = 1000;
      if (s.money < cost) return null;
      s.money -= cost;
      s.spirit = Math.max(0, s.spirit - 2);
      s.karma += 3;
      const fSwing = 6 + Math.round(Math.random() * 4);
      r.friendship = Math.min(100, r.friendship + fSwing);
      if (r.romance > 0) r.romance = Math.min(100, r.romance + 3);
      pushLog(s, `Helped ${npc.name} out: friendship +${fSwing}, karma +3.`);
      return `Helped ${npc.name}: +${fSwing} friendship.`;
    }
    case 'argue': {
      // Pick a fight — big friendship loss, spirit hit, but clears the air
      // (small chance of grudging respect: friendship +1).
      const respect = Math.random() < 0.15;
      if (respect) {
        r.friendship = Math.min(100, r.friendship + 1);
        pushLog(s, `Argued with ${npc.name} — earned grudging respect.`);
        return `${npc.name} respects the honesty. +1 friendship.`;
      }
      const fLoss = 6 + Math.round(Math.random() * 5);
      r.friendship = Math.max(-100, r.friendship - fLoss);
      s.spirit = Math.max(0, s.spirit - 4);
      pushLog(s, `Argued with ${npc.name}: friendship −${fLoss}.`);
      return `Argument with ${npc.name}: −${fLoss} friendship.`;
    }
  }
}
// Propose partnership / marriage. Requires friendship ≥ 70 AND romance ≥ 60.
// Sets s.partner (dating) or s.married (marriage).
export function proposeToNPC(s: GameState, npcId: string): string | null {
  const npc = NPC_BY[npcId]; if (!npc) return null;
  const r = relationState(s, npcId);
  if (r.friendship < 70) return `Friendship with ${npc.name} is only ${r.friendship}/100 — not enough yet.`;
  if (r.romance < 60) return `Romance with ${npc.name} is only ${r.romance}/100 — keep courting.`;
  if (s.married) return `You are already married.`;
  if (s.partner && !s.married) {
    // Already dating someone — make it official with this NPC instead.
    s.married = true;
    pushLog(s, `Married ${npc.name}.`);
    addPost(s, `Married ${npc.name} today. The best decision of this life.`, 2);
    s.fame = s.fame + 10;
    s.spirit = Math.min(100, s.spirit + 15);
    addXp(s, 100);
    return `Married ${npc.name}! 🎉`;
  }
  s.partner = true;
  pushLog(s, `Started dating ${npc.name}.`);
  addPost(s, `Some news: ${npc.name} and I are officially together.`, 1.6);
  s.fame = s.fame + 3;
  addXp(s, 40);
  return `Now dating ${npc.name}.`;
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
    job: jobsOf(s).map(job => job.name).join(' + ') || null,
    degrees: Object.keys(FIELDS).filter(f => s.deg[f as FieldKey]).map(f => FIELDS[f as FieldKey].names[s.deg[f as FieldKey] - 1]),
    businesses: BIZ.filter(b => branchCount(s, b.id)).map(b => `${b.name} \u00d7${branchCount(s, b.id)}`),
    farm: FARM_LINES.filter(l => s.farm[l.id]).map(l => l.name),
    factory: FAC_LINES.filter(l => s.fac[l.id]).map(l => l.name),
    space: SPACE_LINES.filter(l => s.space[l.id]).map(l => l.name),
    family: (s.married ? 'married' : s.partner ? 'dating' : 'single') + (s.kids ? `, ${s.kids} kid${s.kids > 1 ? 's' : ''}` : ''),
    religion: s.religion, fame: s.fame, level: s.level, followers: s.social.followers,
    studying: [s.study, s.sideStudy].filter((study): study is Study => !!study).map(study => study.name),
    health: Math.round(s.health), spirit: Math.round(s.spirit), karma: s.karma, recent: s.log.slice(-6)
  };
}

// ---------- achievements ----------
export interface AchDef { id: string; cond: (s: GameState) => boolean }
export const ACHIEVEMENTS: AchDef[] = [
  { id: 'firstJob', cond: s => !!s.job },
  { id: 'firstBiz', cond: s => Object.keys(s.biz).length > 0 },
  { id: 'chain5', cond: s => BIZ.reduce((a, b) => a + branchCount(s, b.id), 0) >= 5 },
  { id: 'grad', cond: s => Object.values(s.deg).some(v => v > 0) },
  { id: 'pilot', cond: s => !!s.lic['pilot'] },
  { id: 'level10', cond: s => s.level >= 10 },
  { id: 'mill', cond: s => netWorth(s) >= 1e6 },
  { id: 'decamill', cond: s => netWorth(s) >= 1e7 },
  { id: 'tycoon', cond: s => netWorth(s) >= 1e8 },
  { id: 'stockMill', cond: s => stockVal(s) >= 1e6 },
  { id: 'clubOwner', cond: s => !!s.ownClub },
  { id: 'married', cond: s => s.married },
  { id: 'kids3', cond: s => s.kids >= 3 },
  { id: 'fame50', cond: s => s.fame >= 50 },
  { id: 'fame100', cond: s => s.fame >= 100 },
  { id: 'fame300', cond: s => s.fame >= 300 },
  { id: 'fame1000', cond: s => s.fame >= 1000 },
  { id: 'verified', cond: s => !!s.social.verified },
  { id: 'millionFans', cond: s => s.social.followers >= 1e6 },
  { id: 'philanthropist', cond: s => s.donated >= 1e6 },
  { id: 'karma50', cond: s => s.karma >= 50 },
  { id: 'spirit80', cond: s => s.spirit >= 80 },
  { id: 'space1', cond: s => Object.keys(s.space).length > 0 },
  { id: 'travel', cond: s => s.spaceTravel },
  { id: 'nonagenarian', cond: s => s.over && s.cause === 'age' && Math.floor(s.age) >= END_AGE },
];
export function checkAch(s: GameState): string[] {
  if (!s.started || s.ach == null) return [];
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!s.ach.includes(a.id) && a.cond(s)) { s.ach.push(a.id); got.push(a.id); }
  }
  return got;
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
