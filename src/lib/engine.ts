// ================= GAME ENGINE (ported from the static game, TS) =================
import {
  DAY_MS, OFFLINE_DAY_MS, START, END_AGE, RETIRE, PENSION, RESALE_FEE, BIZ_DEGREE_BONUS,
  ASSET_DEPRECIATION_RATE, BIZ_MULTIPLIER_CAP,
  FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT, OWN_CLUB_MAX_MEMBERS,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, BRANCH_GROWTH, REG_MULT,
  LEVEL_INCOME_BONUS, xpNeed, GIGS, SPACE_LINES,
  ALLNEWS, YEAR_EVENTS, eraOf, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES,
  BIZ, FARM_LINES, FAC_LINES, ITEM_BY, STOCKS, CLUBS, JOBS, BOTS,
  NPC_BY, PET_BY, MAX_PETS, CREW_COST, SHORT_BY,
  analyze, type FieldKey, type LineDef, type Req, type GigDef, type SpaceDef, type Rarity, RARITY_MULT, itemRarity, POST_TEMPLATES,
  ITEM_IMAGES, USED_IMAGES, RARE_ITEMS, RARE_IDS,
  TRAVEL,
} from './gameData';
// v11.3 — Power & influence system. Engine imports PowerState type + the
// passive tick + advocacy helpers; PowerState lives on GameState below.
// v11.4 — elections, scrutiny, alliances/rivals, endings.
import {
  type PowerState, freshPower, tickPower, tickPowerV11_4, addInfluence, influenceFromCharity,
  doAdvocacy, powerTierOf, powerTierIdx, nextTierOf,
  type PowerTier, type InfluenceSource, type AdvocacyAction, type ElectionParams,
  influenceGainMult, spendInfluence,
  influenceFromClubChair, influenceFromBoardSeat, influenceFromMediaOwnership,
  POWER_TIERS, ADVOCACY_ACTIONS, INFLUENCE_SOURCE_LABELS,
  ELECTION_PARAMS, electionParamsFor, generateOpponent, electionMargin, runElection,
  tickScrutiny, TRANSPARENCY_ACTIONS, doTransparency,
  offerAlliance, breakWith, tickAlliancesRivals, rollScandal, computeEnding,
} from './power';
// v11.5 — Entity system (conglomerate → nation → federation).
import {
  type EntityState, type EntityTier, type Constitution,
  freshEntity, entityTierOf, qualifiedEntityTier, nextEntityTier,
  declareIndependence, declareAutonomy, courtRecognition, autoPromoteConglomerate, tickEntity,
  ENTITY_TIERS, CONSTITUTIONS, constitutionById,
} from './empire';
// v11.6 — Zodiac + tarot + psychic affinity. Adds gender + birth month
// to character creation; derives a zodiac sign with an industry affinity
// (passive +5% income in that field); enables optional monthly tarot
// draws in the Spirit tab; and feeds the pre-game suggestion that
// combines zodiac + historical era.
import {
  type ZodiacSign, type Gender, type ZodiacDef, type PsychicState,
  ZODIAC, zodiacOf, zodiacById, freshPsychic, TAROT_CARDS,
  tarotDraw, togglePsychic, zodiacAffinityMult, zodiacIntroSuggestion,
} from './zodiac';
// Re-export the public surface of the power module so the React layer
// can import everything from one place (engine.ts).
export {
  freshPower, tickPower, tickPowerV11_4, addInfluence, influenceFromCharity,
  doAdvocacy, powerTierOf, powerTierIdx, nextTierOf,
  influenceGainMult, spendInfluence,
  influenceFromClubChair, influenceFromBoardSeat, influenceFromMediaOwnership,
  POWER_TIERS, ADVOCACY_ACTIONS, INFLUENCE_SOURCE_LABELS,
  ELECTION_PARAMS, electionParamsFor, generateOpponent, electionMargin, runElection,
  tickScrutiny, TRANSPARENCY_ACTIONS, doTransparency,
  offerAlliance, breakWith, tickAlliancesRivals, rollScandal, computeEnding,
};
export type { PowerState, PowerTier, InfluenceSource, AdvocacyAction, ElectionParams } from './power';
// Re-export the entity module's public surface
export {
  freshEntity, entityTierOf, qualifiedEntityTier, nextEntityTier,
  declareIndependence, declareAutonomy, courtRecognition, autoPromoteConglomerate, tickEntity,
  ENTITY_TIERS, CONSTITUTIONS, constitutionById,
  // v11.5 — engine wrappers that bridge the React layer to empire.ts.
  // actDeclareAutonomy, actCourtRecognition, actDeclareIndependence are
  // defined in this file (not empire.ts) because they need pushLog + netWorth.
};
export type { EntityState, EntityTier, Constitution } from './empire';
// Re-export the zodiac module's public surface
export {
  ZODIAC, zodiacOf, zodiacById, freshPsychic, TAROT_CARDS,
  tarotDraw, togglePsychic, zodiacAffinityMult, zodiacIntroSuggestion,
};
export type { ZodiacSign, Gender, ZodiacDef, PsychicState } from './zodiac';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface Branch { r: number; mood: number; paid: number; day: number; franchised?: boolean }
export interface Study { kind: 'deg' | 'lic'; field?: FieldKey; lvl?: number; id?: string; name: string; end: number; tuition: number }
export interface DayTimeline { day: number; entries: string[] }
export interface AIChoice { l: string; cost?: number; money?: number; fame?: number; out?: string; kind?: AIEventKind; decline?: number; dropout?: { slot: 'study' | 'sideStudy' }; liquidate?: { biz: string; n: number }; risk?: 'safe' | 'medium' | 'high' }
// v10.4 — AI events are now categorised. 'story' = open-ended life twist (the
// classic oracle), 'luck' = windfall, 'badluck' = loss/damage, 'lifestage' =
// a meaningful life-stage pivot (close shop, drop out, wrong turn).
export type AIEventKind = 'story' | 'luck' | 'badluck' | 'lifestage';
export interface AIEvent { title: string; text: string; choices: AIChoice[]; source?: 'backend' | 'backend-local' | 'local'; kind?: AIEventKind }
export interface Post { d: number; t: string; likes: number; reactions?: { name: string; text: string; sentiment: 'pos' | 'neg' | 'neutral' }[] }
// v11.28 — a timed marketplace job: either an AUCTION (bids arrive over the
// window, the hammer can land above the ask, or nothing sells) or a fixed-
// price SALE LISTING (one buyer either meets the ask or doesn't). The item is
// snapshotted out of s.lots / s.used for the duration; `est` (its ordinary
// resale value at listing time) keeps net worth stable while it runs.
export type MarketItem =
  | { src: 'lot'; id: string; paid: number; day: number; condition?: number; condDay?: number; repaired?: number }
  | GameState['used'][number];
export interface MarketJob {
  kind: 'auction' | 'listing';
  src: 'lot' | 'used';
  item: MarketItem;
  name: string; brand?: string; c: string; art: string; img?: string; rarity: Rarity;
  ask: number;      // listing price (value × rarity premium × 1.4)
  est: number;      // ordinary value — what netWorth counts while it runs
  fee: number;      // upfront listing fee (lost even if it doesn't sell)
  startDay: number;
  endDay: number;   // resolves on the first tick past this day
  bids: number;     // display-only: bids seen so far (rolled at resolution)
  best: number;     // best bid seen (0 = none yet)
}
export type Religion = 'none' | 'buddhism' | 'christianity' | 'islam' | 'hinduism' | 'folk';
export const RELIGIONS: Religion[] = ['none', 'buddhism', 'christianity', 'islam', 'hinduism', 'folk'];
// v11.49 — Portfolio Dashboard: transaction log + cost-basis tracking.
// Every cash-touching event (buy/sell stock, item, biz, bank transfer, gig
// income, tuition, donation) is recorded so the Portfolio tab can show a
// P&L breakdown, per-asset ROI, and a chronological transaction ledger.
export type TxKind = 'buy' | 'sell' | 'income' | 'expense' | 'transfer' | 'dividend';
export type TxAsset = 'stock' | 'lot' | 'biz' | 'branch' | 'farm' | 'fac' | 'space' | 'bank' | 'gig' | 'job' | 'tuition' | 'donate' | 'biz_sell';
export interface Transaction {
  id: number;          // monotonic id (from s.txSeq)
  day: number;         // game day the tx happened
  kind: TxKind;
  asset: TxAsset;
  ref: string;         // stock id, item id, biz id, etc. (or label)
  name: string;        // human-readable label
  qty: number;         // count (shares for stocks, 1 for unique items)
  unit: number;        // per-unit price (or total for non-unitized flows)
  amount: number;      // signed net cash flow: +income / -expense
  realizedPnL?: number; // for sells: net profit (sell proceeds - cost basis) - fees
}
export const TX_CAP = 200; // keep the last 200 transactions (older trimmed)
// v12 — short unique-per-life UID generator. Combines a base36 timestamp
// (millisecond precision, ~7 chars) with a 5-char random suffix from
// Math.random(). Collisions are negligible: even 100k UIDs generated in the
// SAME millisecond would have a <1e-5 collision probability across the
// 36^5 = ~60M random-suffix space. Output shape: "uid-lzxxxxx-yyyyy".
export function genUid(): string {
  return `uid-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
export interface GameState {
  schemaVersion: number;
  // v12 — player UID. Short, stable, unique-per-life identifier generated at
  // begin(). Used for disambiguating same-name players on the social layer +
  // surfacing in the admin dashboard player list. Empty on fresh() until
  // begin() assigns one; migrate() backfills it for pre-v12 saves.
  uid: string;
  money: number; age: number; day: number; lastDay: number; lastYr: number;
  // v11.12 — epoch-ms of the last moment the player was actively playing.
  // Used by applyOffline() to advance time at the slower OFFLINE_DAY_MS rate
  // (10 min/day) while the tab is closed, with extra risk for unmonitored
  // businesses. null on fresh games / pre-v11.12 saves (no-op).
  lastSeen: number | null;
  biz: Record<string, number>; branches: Record<string, Branch[]>;
  farm: Record<string, number>; fac: Record<string, number>; space: Record<string, number>;
  farmBought: Record<string, number>; facBought: Record<string, number>; spaceBought: Record<string, number>;
  spaceUpgrade: { startedDay: number; completesDay: number } | null; spaceTravel: boolean;
  lots: { id: string; paid: number; day: number; condition?: number; condDay?: number; repaired?: number; serial?: number; serialOf?: number }[]; stk: Record<string, number>;
  club: string | null; ownClub: string | null; job: string | null; sideJob: string | null;
  // v11.39 — career system: experience per job-id, contract end-day, raise history.
  jobExp: Record<string, number>;       // XP accumulated per job-id (resets on quit)
  jobContractEnd: number;               // day the current contract expires (0 = no contract)
  jobRaises: number;                    // total successful raises negotiated
  // v11.40 — travel cooldown (last day a trip ended; gates the next trip).
  travelLastDay: number;                // 0 = never travelled
  clubs: string[]; // v10.5 — multiple-club membership (s.club stays as the 'active' / highest-mult one)
  deg: Record<FieldKey, number>; lic: Record<string, boolean>; study: Study | null; sideStudy: Study | null;
  name: string; byear: number; nation: string; religion: Religion; ints: string[]; tals: string[]; topField: FieldKey | null;
  // v11.36 — player-chosen emoji avatar. Default '🧑' at game start; editable
  // via the new Edit Profile modal (PinZone ✏️ button). Stored as a short
  // string (1-2 code points) so it renders in the pinned bar + social tabs.
  avatar: string;
  // v11.6 — gender + birth month (drives zodiac) + psychic tarot state.
  // gender is cosmetic + minor dialogue tweaks; birthMonth (1-12) sets the
  // zodiac sign at game start (stored as `zodiac` for easy access);
  // psychic tracks opt-in + last draw + log for the Spirit-tab tarot action.
  gender: Gender;
  birthMonth: number;          // 1-12 (Jan..Dec)
  // v11.19 — birth day (1-31). Stored at character creation so the Spirit
  // tab panels (Tử Vi / Phong Thuỷ) can use the actual birth day instead of
  // a default. The intro panel collects it next to the month.
  birthDay: number;            // 1-31
  zodiac: ZodiacSign;          // derived at begin()
  psychic: PsychicState;
  started: boolean;
  bank: { dep: number; loan: number }; fame: number; donated: number; donatedThisYear: number; yIncome: number; yTax: number;
  prices: Record<string, number>; hist: Record<string, number[]>;
  eraBiz: number; eraFac: number;
  log: string[]; over: boolean; pending: string | null; aiEv: AIEvent | null;
  partner: boolean; married: boolean; kids: number; m1: boolean; story: { used: string[] };
  level: number; xp: number; gigs: Record<string, number>;
  health: number; spirit: number; karma: number; diet: boolean; well: Record<string, number>;
  sleepHours: number; timeline: DayTimeline[];
  // v11.49 — sleep debt accumulates when sleepHours < 7 (deficit) and reduces
  // when sleepHours > 7 (catch-up). Penalties: >7 debt = -10% study speed,
  // >21 debt = -25% study + +20% health decay. Range 0..35 (5 days deficit).
  sleepDebt: number;
  // v11.49 — Portfolio Dashboard: transaction log + cost basis tracking.
  txSeq: number;                       // monotonic id counter
  transactions: Transaction[];        // last TX_CAP entries (oldest trimmed)
  costBasis: Record<string, number>;  // total $ invested per stock id (weighted)
  // v11.50 — per-biz brand customization (name + emoji logo). Keyed by bizId.
  // Players who own at least one branch of a biz can rename + re-logo the
  // chain so the BizTab + branch chips + social hype posts reflect their
  // brand identity (e.g. "☕ Dương Coffee" instead of "Coffee shop").
  brands: Record<string, { name: string; logo: string }>;
  cause: 'age' | 'health' | 'bankrupt' | null;
  social: { followers: number; posts: Post[]; verified?: boolean; lastPostDay?: number };
  // v12.5 — social post queue: AI event auto-posts are queued here instead
  // of pushed directly to s.social.posts (which caps at 12 and could lose
  // posts when multiple events fire simultaneously). The tick() function
  // releases one queued post per game day.
  socialQueue: { text: string; day: number; likes: number; reactions?: NonNullable<Post['reactions']> }[];
  ach: string[];
  // v10.4 — used-market purchases and player Hall of Fame entry written at
  // game over. Kept on the same GameState shape so save migration is trivial.
  used: { id: string; baseId: string; name: string; brand?: string; cat: string; c: string; art: string; ageYears: number; condition: number; paid: number; day: number; lux: number; rate: number; story: string }[];
  // v11.28 — timed marketplace. Items the player put up for AUCTION (bids
  // arrive over several game days, final price can exceed the ask, and the
  // item may find NO buyer) or posted as a fixed-price SALE LISTING (slower,
  // no bidding war, but a higher chance the ask is met). While a job runs the
  // item lives here (removed from s.lots / s.used) and still counts toward
  // net worth at its `est` estimate, so listing something doesn't nuke the
  // player's balance sheet.
  mkt: MarketJob[];
  // v11.33 — favourites watchlist (item ids the player stars to track).
  favs: string[];
  // v11.33 — the rare-auction circuit. Grail pieces (RARE_ITEMS) never appear
  // in shops: they are ANNOUNCED (rareUp, bidding opens in N days), then go
  // LIVE (rareLive) where NPC collectors raise the price every couple of days
  // and the player must outbid them before the window closes. One live lot at
  // a time; at most two scheduled at once.
  rareUp: { id: string; atDay: number }[];
  rareLive: { id: string; endDay: number; bid: number; leader: 'npc' | 'you'; my: number } | null;
  hall: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string } | null;
  // v10.5 — reincarnation ledger. Each entry is a past life recorded at the
  // moment of reincarnation (not at game over — game over only writes s.hall).
  // Lives across reincarnations so the player can look back at the chain.
  pastLives: { name: string; nation: string; era: string; industry: string; peakNetWorth: string; note: string; livedTo: number; tier: string; cause: 'age' | 'health' | 'bankrupt' | 'reincarnated' }[];
  // v10.5 — relationships: per-NPC friendship/romance + interaction log.
  // Keyed by NPC id. friendship is -100..100 (hostile to best friend);
  // romance is 0..100 (only meaningful for one NPC at a time).
  relations: Record<string, { friendship: number; romance: number; lastInteract: number; interactions: number }>;
  // v10.5 — pets. Up to MAX_PETS (3). Each tracks happiness + health + care
  // history. Happiness decays each game-day; below 30, bonuses stop and the
  // pet's own health starts dropping. Caring (feed / play / walk) raises it.
  pets: { typeId: string; name: string; happiness: number; health: number; adoptedDay: number; lastCare: number }[];
  // v11 — flag set by processDay when a random AI oracle popup should fire.
  // The React layer watches this and calls askAI() (async) when it flips true.
  aiEvPending: boolean;
  // v11.17 — toast queue. Engine functions (finishStudy, yearEnd, processDay)
  // push short user-facing notification strings here; tick() drains the queue
  // into its return value so the React layer can surface them as toasts. This
  // lets us notify the player of milestones (graduation, branch closure,
  // scandal, power promotion, ambient mini-events) without refactoring every
  // engine function's signature. Capped at 20 entries to avoid runaway growth.
  pendingToasts: string[];
  // v11 — short courses the player has completed (ids from SHORT_COURSES).
  // Each completion grants a 10% tuition reduction on the matching full
  // degree field, read by tuitionOf.
  shortCompleted: string[];
  // v11.2 — multi-year crisis state. Set by YearEvents with biz/fac/rates/
  // risk/demand modifiers; carries them forward for `yearsLeft` years after
  // the trigger year. effEraBiz/effEraFac/effLoanRate/effRisk/effDemand read
  // this. Cleared on the Jan 1 once yearsLeft hits 0.
  crisis: {
    cause: string; biz: number; fac: number; rates: number; risk: number; demand: number;
    yearsLeft: number; startYear: number;
  } | null;
  // v11.2 — delayed stock/deposit shocks. YearEvents with stk/dep split their
  // hit into an instant slice (sqrt or ^0.7) and a delayed slice (the rest)
  // that fires `daysAhead` later — simulates how real crashes unfold over
  // weeks, not overnight. processDay drains shocks whose day has come.
  shocks: { day: number; stk?: Record<string, number>; dep?: number; note?: string }[];
  // v11.20 — business R&D investment. A one-time purchase that grants a
  // temporary bizMultiplier boost for `durationDays` game-days. Higher
  // `amount` → higher boost (capped). The multiplier reads this via
  // bizRndMult(); when s.day passes untilDay, the boost expires.
  bizRnd?: { amount: number; investedDay: number; untilDay: number; boostMult: number } | null;
  // v11.21 — Spirit-tab activity log for daily spirit-gain cap. Each
  // Spirit panel (Kinh Dịch / Tử Vi / Phong Thuỷ / Tarot nâng cao) calls
  // grantSpirit() which adds to s.spirit but is capped per game-day so the
  // player can't farm spirit by spamming casts. { day, gained } where day
  // is the game-day and gained is the total spirit added that day.
  spiritGainToday?: { day: number; gained: number } | null;
  // v11.2 — market research. lastResearchDay is the day the player last
  // paid for a brief; researchBrief caches the lines so the UI can show
  // them until next research. Cleared by Jan 1 of a new year (stale).
  lastResearchDay: number;
  researchBrief: string[] | null;
  // v11.3 — power & influence. PowerState tracks the player's unlocked
  // power tier (driven by net worth), accumulated influence resource, and
  // the influence log. Fresh games start with freshPower(). Migrate()
  // backfills it on old saves.
  power: PowerState;
  // v11.5 — entity system. The player's political organisation: conglomerate
  // → autonomous → nation → empire → federation. Auto-promotes to
  // conglomerate at $1M net worth; later tiers require deliberate actions
  // (declareAutonomy, declareIndependence) plus thresholds + recognition.
  entity: EntityState;
  // v12.2 — AI event difficulty. Set by the admin dashboard's "🎮 Điều khiển"
  // tab via the setDifficulty admin action; the engine reads it in
  // rollRiskOutcome() to scale win chances + failure penalties:
  //   easy   → win +10% (safe 90 / med 60 / high 30), penalties -50%
  //   normal → current values (safe 80 / med 50 / high 20)
  //   hard   → win -10% (safe 70 / med 40 / high 10), penalties +50%
  // Defaults to 'normal'; migrate() backfills it on old saves.
  aiDifficulty: AiDifficulty;
  // v13.2 — per-item remaining stock. Keyed by item id. An item with
  // `ItemDef.stock: number` is limited-quantity; each purchase decrements the
  // counter here. Items with no `stock` field stay unlimited (undefined).
  // `itemStockLeft(s, id)` returns null (unlimited) or the remaining count.
  itemStock: Record<string, number>;
  // v14 — admin gig overrides. Keyed by gig id. An entry with `base` replaces
  // the gig's GIGS[].base pay (used by gigPay); an entry with `cd` replaces
  // the gig's cooldown (used by gigReady + gigLock). Empty {} = no overrides
  // → all gigs fall back to the GIGS array defaults. Cleared by the admin
  // `resetGigs` action; set by `setGigPay` / `setGigCd`. Survives save/load
  // + reincarnation (it's just a GameState field, like aiDifficulty).
  gigOverrides: Record<string, { base?: number; cd?: number }>;
  // v14.1 — admin stock management. stockOverrides patches built-in STOCKS
  // entries (price / volatility / display name / art icon) without removing
  // them from the catalogue. customStocks is the runtime list of entirely
  // admin-created tickers (id / name / p / vol / art). Both broadcast to
  // every player (same pattern as gigOverrides) so the market stays
  // consistent across the community. Cleared by `resetStocks`; mutated by
  // `createStock` / `editStock` / `deleteStock`. Reads happen via
  // stocksOf(s) which merges built-ins + overrides + custom into a single
  // array that stockVal, processDay's price-walk, trade, and the StockTab
  // UI all consume.
  stockOverrides: Record<string, { p?: number; vol?: number; name?: string; art?: string }>;
  customStocks: { id: string; name: string; p: number; vol: number; art: string }[];
}
// v12.2 — AI event difficulty enum.
export type AiDifficulty = 'easy' | 'normal' | 'hard';
export const AI_DIFFICULTIES: AiDifficulty[] = ['easy', 'normal', 'hard'];
export function normaliseDifficulty(v: unknown): AiDifficulty {
  return v === 'easy' || v === 'hard' ? v : 'normal';
}

// ---------- wellbeing: body & mind ----------
export type T = (k: string, f?: string, v?: Record<string, string | number>) => string;
// v11.57 — paid wellbeing cooldowns increased (user request: "ở phần có phí
// hãy tăng thêm thời gian"). Free actions unchanged. This makes free options
// (rest/selftrain/meditate) more valuable relative to paid ones.
export const GYM_COST = 80, GYM_CD = 30, GYM_HP = 6;          // v11.58: 1 month (was 3d)
export const CHECKUP_COST = 600, CHECKUP_CD = 45, CHECKUP_HP = 15;  // was cd=30
// v11.29 — deep medical treatment: the "I'm really weak, fix me NOW" option.
// Expensive and a long-ish cooldown, but heals far more than a check-up.
export const TREAT_COST = 3000, TREAT_CD = 8, TREAT_HP = 45;  // was cd=5
export const DIET_COST = 6;
export const TEMPLE_COST = 500, TEMPLE_CD = 5;               // was cd=3
export const RETREAT_COST = 8000, RETREAT_CD = 90;            // was cd=60
export interface WellDef { id: string; cost: number; cd: number }
export const FAITH_PRACTICE_COST = 250, FAITH_PRACTICE_CD = 7;
export const WELL: WellDef[] = [
  { id: 'gym', cost: GYM_COST, cd: GYM_CD },
  { id: 'checkup', cost: CHECKUP_COST, cd: CHECKUP_CD },
  { id: 'treat', cost: TREAT_COST, cd: TREAT_CD },
  // v11.40 — free health options: rest (sleep more, no cost) + self-train
  // (bodyweight exercise at home, no gym fee). Both recover less than gym
  // but cost $0 and have a 1-day cooldown.
  { id: 'rest', cost: 0, cd: 1 },
  { id: 'selftrain', cost: 0, cd: 1 },
  // v11.40 — timed recovery: a 7-day or 30-day rest cure. Costs nothing but
  // locks the action for the duration; at the end, health jumps up. The
  // engine applies the bonus when the cooldown expires (see wellLeft check).
  { id: 'rest7', cost: 0, cd: 7 },
  { id: 'rest30', cost: 0, cd: 30 },
  { id: 'meditate', cost: 0, cd: 1 },
  { id: 'temple', cost: TEMPLE_COST, cd: TEMPLE_CD },
  { id: 'retreat', cost: RETREAT_COST, cd: RETREAT_CD },
  { id: 'faithPractice', cost: FAITH_PRACTICE_COST, cd: FAITH_PRACTICE_CD },
];
export const wellDef = (id: string) => WELL.find(w => w.id === id);
// v11.29 — the doctor check-up no longer locks you out for 30 straight days
// while your health is collapsing. The cooldown adapts to how weak you are:
//   health ≥ 60 → 30d (routine), 35–59 → 7d (run down), < 35 → 1d (urgent).
// Every other well action keeps its static cooldown.
export const effWellCd = (s: GameState, id: string): number => {
  const w = wellDef(id); if (!w) return 0;
  if (id === 'checkup') return s.health < 35 ? 1 : s.health < 60 ? 7 : CHECKUP_CD;
  return w.cd;
};
export const wellReady = (s: GameState, id: string) => {
  const w = wellDef(id); if (!w) return false;
  const last = s.well[id];
  // v11.57 — free actions (cost === 0) skip the money check entirely so they
  // work even when cash is negative. Was `s.money >= w.cost` which blocked
  // rest/selftrain/meditate when the player was in debt.
  return (last == null || s.lastDay - last >= effWellCd(s, id)) && (w.cost === 0 || s.money >= w.cost);
};
export const wellLeft = (s: GameState, id: string) => {
  const w = wellDef(id); if (!w) return 0;
  const last = s.well[id];
  return last == null ? 0 : Math.max(0, effWellCd(s, id) - (s.lastDay - last));
};
export const healthMult = (s: GameState) => 0.7 + 0.3 * (s.health / 100);
export const sleepHealthMult = (hours: number) =>
  // v11.49 — kept positive (decay multiplier on ageDecayPerDay). Recovery at
  // 7h+ sleep is handled separately by sleepHealthRecovery() so the existing
  // display formula (mult - 1) * 100 still works.
  //  4h → +45% decay · 6h → +15% · 7h → 0% · 8h → 0% · 9h → −10% · 10h → −20%
  hours < 7
    ? 1 + (7 - hours) * .15
    : 1 - Math.min(.2, Math.max(0, hours - 8) * .1);
// v11.49 — health RECOVERY at 7h+ sleep. Returns an absolute amount added to
// s.health each game day (NOT a multiplier). 0 below 7h (no recovery); rises
// linearly with extra sleep so 12h (catch-up) recovers ~5× faster than 8h.
//   7h → +0.05 · 8h → +0.10 · 9h → +0.20 · 10h → +0.30 · 12h → +0.50
export const sleepHealthRecovery = (hours: number) =>
  hours <= 7 ? 0 : Math.min(.5, Math.round((hours - 7) * .1 * 1000) / 1000);
export const studyPace = (hours: number) => 1 + Math.max(0, 8 - hours) * .06;
// v11.49 — sleep-debt penalty on study pace. Sleep debt accumulates 1/hour/day
// below 7h, and is paid down at 2/hour/day above 7h (catch-up sleep is faster
// than deficit accumulation, so a 12h night recovers 10 debt). Penalties:
//   debt >  7 (1 day short)  → study pace × 0.90  (-10%)
//   debt > 21 (3 days short) → study pace × 0.75  (-25%)  + health decay × 1.20
export const sleepDebtStudyMult = (debt: number) => debt > 21 ? 0.75 : debt > 7 ? 0.9 : 1;
export const sleepDebtHealthMult = (debt: number) => debt > 21 ? 1.2 : 1;
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
  if (id === 'treat') { s.health = Math.min(100, s.health + TREAT_HP); addXp(s, 10); return t('hp.treatDone', '', { n: TREAT_HP }); }
  // v11.40 — free health options. Rest = sleep in (+3 hp, no cost, 1d cd).
  // Self-train = bodyweight exercise at home (+4 hp, no cost, 1d cd). Both
  // are weaker than gym (+6) but free — so low-cash players can still recover.
  if (id === 'rest') { s.health = Math.min(100, s.health + 3); addXp(s, 1); return t('hp.restDone', '', { n: 3 }); }
  if (id === 'selftrain') { s.health = Math.min(100, s.health + 4); addXp(s, 2); return t('hp.selftrainDone', '', { n: 4 }); }
  // v11.40 — timed recovery: start a 7-day or 30-day rest cure. The health
  // bonus is applied UPFRONT (so the player sees the gain immediately), but
  // the cooldown locks the action for the full duration. This gives players
  // a "take a week off to recover" option that costs nothing but time.
  if (id === 'rest7') { s.health = Math.min(100, s.health + 20); addXp(s, 5); pushLog(s, '7-day rest cure — a full week of recovery.'); return t('hp.rest7Done', '', { n: 20 }); }
  if (id === 'rest30') { s.health = Math.min(100, s.health + 50); addXp(s, 15); pushLog(s, '30-day sabbatical — a full month of deep recovery.'); return t('hp.rest30Done', '', { n: 50 }); }
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
// v14 — admin gig overrides: helpers that consult s.gigOverrides first,
// then fall back to the GIGS array defaults. gigPay / gigReady / gigLock all
// call these so a `setGigPay` / `setGigCd` admin action takes effect
// immediately (the next time the player taps the gig button or the Gigs tab
// re-renders). Returns NaN / undefined-safe when the override is missing.
export function gigBase(s: GameState, g: GigDef): number {
  const ov = s.gigOverrides && s.gigOverrides[g.id];
  const b = ov && typeof ov.base === 'number' && Number.isFinite(ov.base) ? ov.base : g.base;
  return Math.max(0, b);
}
export function gigCd(s: GameState, g: GigDef): number {
  const ov = s.gigOverrides && s.gigOverrides[g.id];
  const c = ov && typeof ov.cd === 'number' && Number.isFinite(ov.cd) ? ov.cd : g.cd;
  return Math.max(0, c);
}
export function gigReady(s: GameState, g: GigDef): boolean {
  const last = s.gigs[g.id];
  if (last != null && s.lastDay - last < gigCd(s, g)) return false;
  if (g.minFollowers && s.social.followers < g.minFollowers) return false;
  return meets(s, g.req);
}
export function gigLock(s: GameState, g: GigDef): string {
  if (g.minFollowers && s.social.followers < g.minFollowers) return fmt(g.minFollowers) + ' followers';
  if (g.req && !meets(s, g.req)) return reqText(g.req);
  return '';
}
export function gigPay(s: GameState, g: GigDef): number {
  let pay = gigBase(s, g) + 0.05 * Math.sqrt(Math.max(0, yearIncome(s)));
  // v11.1 fix: scale sponsored pay by sqrt(followers) not linear — prevents
  // the $7.5T-per-ad explosion when followers get large.
  if (g.id === 'sponsored') pay += Math.sqrt(Math.max(0, s.social.followers)) * 2;
  pay *= levelMult(s) * (1 + Math.log10(Math.max(1, s.fame + 1)) * 0.2) * healthMult(s);
  if (s.ints.includes('sports') || s.tals.includes('hands')) pay *= 1.15;
  return Math.max(5, Math.round(pay));
}
export function doGig(s: GameState, id: string, t?: T, rng: () => number = Math.random): string | null {
  const g = GIGS.find(x => x.id === id); if (!g) return null;
  if (!gigReady(s, g)) return null;
  s.gigs[g.id] = s.lastDay;
  const pay = gigPay(s, g);
  s.money += pay; s.yIncome += pay;
  // v11.26 — gigs are real work: each one now drains health by its `hp` cost
  // (watching ads included — the ad gig has no cooldown, so its small cost is
  // the anti-spam valve). Floored at 0: a gig alone can never push health
  // negative; death-by-health is still only evaluated on the day tick.
  if (g.hp && g.hp > 0) {
    s.health = Math.max(0, s.health - g.hp);
    const name = t ? t('gig.' + g.id, g.id) : g.id;
    queueToast(s, '💢 ' + (t ? t('gig.healthCost', '', { name, n: g.hp }) : name + ': health -' + g.hp));
  }
  addXp(s, g.id === 'ad' ? 4 : 10, rng);
  if (g.id !== 'ad' && rng() < 0.04) s.fame = s.fame + 1;
  const gigName = t ? t('gig.' + g.id, g.id) : g.id;
  recordTx(s, { kind: 'income', asset: 'gig', ref: g.id, name: gigName, qty: 1, unit: pay, amount: pay });
  return '+' + fmt(pay);
}
export function socialIncome(s: GameState): number { // annual ad revenue
  // v11.1 fix: scale by sqrt(followers) not linear — prevents the
  // $10^21/year income explosion. At 1M followers → ~$6K/yr; 100M → $60K;
  // 2B (cap) → ~$270K/yr. Meaningful but not universe-conquering.
  // v11.6 — zodiac arts affinity (+5% if zodiac is an arts-affinity sign)
  return s.social.followers >= 500 ? Math.sqrt(s.social.followers) * 6 * levelMult(s) * zodiacAffinityMult(s, 'arts') : 0;
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
// v11.1 — hard cap on followers. 2 billion is more than any real-world
// social media account (Instagram's most-followed is ~700M). Prevents the
// exponential explosion where likes ∝ followers and followers += likes*0.3.
export const MAX_FOLLOWERS = 2_000_000_000;

// v11.9 — anti-exploit cooldown: ONE post per game day, any type. Before, the
// Social tab buttons could be clicked in rapid succession with no limit,
// farming followers/likes indefinitely (each click gained likes*0.3 followers
// and likes scale with sqrt(followers) — so spam-clicking kept pushing both up).
export const POST_COOLDOWN_DAYS = 1;
export const canPost = (s: GameState): boolean =>
  s.social.lastPostDay == null || s.lastDay - s.social.lastPostDay >= POST_COOLDOWN_DAYS;
export const postCooldownLeft = (s: GameState): number =>
  s.social.lastPostDay == null ? 0 : Math.max(0, POST_COOLDOWN_DAYS - (s.lastDay - s.social.lastPostDay));

// v11.50 — addPost now returns the created Post (or null if on cooldown)
// so callers like applyAIChoice can attach NPC reactions to it.
export function addPost(s: GameState, t: string, boost = 1, rng: () => number = Math.random): Post | null {
  // v13.2 — removed the canPost cooldown guard. Engine-generated posts (from
  // openBranch, buyItem, franchise, graduation, etc.) were being silently
  // dropped when the player had already posted today. The posts array is
  // already capped at 12 (oldest popped), so spam isn't an issue. The manual
  // post buttons in SocialTab are still disabled via `canPost(s)` in the UI
  // `disabled` attribute — that cooldown is enforced client-side, not here.
  // v11.20 — advertising/hype posts reduce health. Posts with boost ≥ 1.4
  // (hype = 1.6, viral brand deals = 2.0, etc.) are 'ad-flavoured' and the
  // promo grind wears the player down: 0.5-2 health per hype post, scaled
  // by boost. The toast is queued so the player sees the cost.
  if (boost >= 1.4) {
    const healthCost = Math.round((boost - 1.2) * 1.5 * 10) / 10; // boost 1.4 → 0.3, 1.6 → 0.6, 2.0 → 1.2
    s.health = Math.max(0, s.health - healthCost);
    queueToast(s, `💢 ${'Hype post — stressed from promo grind, health −' + healthCost}`);
  }
  // v11.1 fix: scale likes by sqrt(followers) not linear. Before:
  //   likes = followers * 0.05 → followers += likes * 0.3 = followers * 0.015
  //   each post multiplied followers by ~1.015, compounding to 10^23 over time.
  // After: likes = sqrt(followers) * 5 → follower gain per post is ~sqrt(fol)*1.5,
  //   which is sublinear and can never blow up.
  const fameLikes = Math.sqrt(Math.max(0, s.fame)) * 30;
  const followerLikes = Math.sqrt(Math.max(0, s.social.followers)) * 5;
  let likes = Math.round((followerLikes + fameLikes + 5) * (0.4 + rng() * 1.2) * boost);
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
  const post: Post = { d: s.lastDay, t, likes };
  s.social.posts.unshift(post);
  s.social.lastPostDay = s.lastDay;
  if (s.social.posts.length > 12) s.social.posts.pop();
  const gainMult = spike ? 2 + rng() : 1;
  s.social.followers = Math.min(MAX_FOLLOWERS, s.social.followers + Math.round(likes * 0.3 * boost * gainMult) + (s.fame > 0 ? 2 : 0));
  if (spike) pushLog(s, `A post went viral — followers surged.`);
  if (s.social.followers >= 100000 && !s.social.verified) {
    s.social.verified = true;
    pushLog(s, 'Your account got the blue check. Verified!');
    addXp(s, 40);
  }
  return post;
}

// v11.50 — generate NPC reactions for an AI-event social post. The player's
// relations (s.relations) decide who comments and the sentiment:
//   friendship > 50  → supportive comments (pos)
//   0..50            → mixed acknowledgment (neutral)
//   < 0              → snarky/critical (neg)
// Picks up to 3 commenters (one per sentiment bucket if available), favouring
// the most-interacted NPCs. Returns the reactions array (may be empty).
export function generateNpcReactions(s: GameState, eventTitle: string, rng: () => number = Math.random): NonNullable<Post['reactions']> {
  const rels = Object.entries(s.relations)
    .filter(([, r]) => r && typeof r.friendship === 'number')
    .map(([npcId, r]) => ({ npcId, friendship: r.friendship, interactions: r.interactions || 0 }))
    .sort((a, b) => b.interactions - a.interactions);
  if (rels.length === 0) return [];
  // Bucket by sentiment.
  const pos = rels.filter(r => r.friendship > 50);
  const neu = rels.filter(r => r.friendship >= 0 && r.friendship <= 50);
  const neg = rels.filter(r => r.friendship < 0);
  // Reaction template pools per sentiment (translated client-side via name only;
  // the body text stays in English because NPC flavour doesn't need full i18n).
  const posTemplates = [
    'Proud of you 🙌',
    'Knew you had it in you!',
    'This is huge — congrats!',
    'About time the world noticed.',
    'You earned every bit of this.',
  ];
  const neuTemplates = [
    'Interesting news.',
    'Heard about this — wild.',
    'Just saw the headline.',
    'Quite the development.',
    'Wow, didn\'t see that coming.',
  ];
  const negTemplates = [
    'Could\'ve gone differently.',
    'Not surprised, honestly.',
    'Bold move... risky.',
    'We\'ll see how this turns out.',
    'Hmm. Debatable.',
  ];
  const pick = (arr: string[]) => arr[Math.floor(rng() * arr.length)];
  const reactions: NonNullable<Post['reactions']> = [];
  // Pick one commenter from each non-empty bucket (up to 3 total).
  if (pos.length) {
    const r = pos[Math.floor(rng() * pos.length)];
    const npc = NPC_BY[r.npcId];
    if (npc) reactions.push({ name: npc.name, text: pick(posTemplates), sentiment: 'pos' });
  }
  if (neu.length && reactions.length < 3) {
    const r = neu[Math.floor(rng() * neu.length)];
    const npc = NPC_BY[r.npcId];
    if (npc) reactions.push({ name: npc.name, text: pick(neuTemplates), sentiment: 'neutral' });
  }
  if (neg.length && reactions.length < 3) {
    const r = neg[Math.floor(rng() * neg.length)];
    const npc = NPC_BY[r.npcId];
    if (npc) reactions.push({ name: npc.name, text: pick(negTemplates), sentiment: 'neg' });
  }
  return reactions;
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
  recordTx(s, { kind: 'buy', asset: 'space', ref: id, name: l.name, qty: 1, unit: l.cost, amount: -l.cost });
  return `${l.name} founded! Welcome to the cosmic frontier.`;
}

export function fresh(): GameState {
  const s: GameState = {
    schemaVersion: 4,
    uid: '',
    money: 0, age: START, day: 0, lastDay: 0, lastYr: START, lastSeen: null, biz: {}, branches: {}, farm: {}, fac: {},
    farmBought: {}, facBought: {}, spaceBought: {}, spaceUpgrade: null, spaceTravel: false,
    lots: [], stk: {},     club: null, ownClub: null, job: null, sideJob: null,
    jobExp: {}, jobContractEnd: 0, jobRaises: 0,
    travelLastDay: 0,
    deg: { business: 0, engineering: 0, medicine: 0, science: 0, arts: 0 }, lic: {}, study: null, sideStudy: null,
    name: 'Alex', byear: 1992, nation: 'Vietnam', religion: 'none', ints: [], tals: [], topField: null, started: false,
    avatar: '🧑',
    gender: 'nonbinary', birthMonth: 1, birthDay: 15, zodiac: 'capricorn', psychic: freshPsychic(),
    bank: { dep: 0, loan: 0 }, fame: 0, donated: 0, donatedThisYear: 0, yIncome: 0, yTax: 0,
    prices: {}, hist: {}, eraBiz: 1, eraFac: 1,
    log: [], over: false, pending: null, aiEv: null,
    partner: false, married: false, kids: 0, m1: false, story: { used: [] },
    level: 1, xp: 0, gigs: {}, space: {}, social: { followers: 0, posts: [] }, socialQueue: [],
    health: 92, spirit: 18, karma: 0, diet: false, well: {}, cause: null,
    sleepHours: 6, sleepDebt: 0, timeline: [], ach: [],
    txSeq: 0, transactions: [], costBasis: {},
    brands: {},
    used: [], mkt: [], favs: [], rareUp: [], rareLive: null, hall: null, pastLives: [], relations: {}, pets: [], clubs: [], aiEvPending: false, shortCompleted: [],
    pendingToasts: [],
    crisis: null, shocks: [], lastResearchDay: 0, researchBrief: null,
    bizRnd: null, spiritGainToday: null,
    power: freshPower(),
    entity: freshEntity(),
    aiDifficulty: 'normal',
    itemStock: {},
    gigOverrides: {},
    // v14.1 — admin stock overrides + custom stocks. Both start empty on a
    // fresh game; migrate() backfills them for old saves. The built-in
    // STOCKS array provides the seed prices + history just below.
    stockOverrides: {},
    customStocks: [],
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
      // v11.49 — default daily sleep drops from 8h to 6h. Sleep-debt system
      // makes the trade-off explicit: 6h = +12% study / +15% health decay.
      // Existing v1 saves (which never had a sleepHours field) get the new
      // default rather than the old 8h.
      s.sleepHours = 6;
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
  if (typeof (s as any).donatedThisYear !== 'number') (s as any).donatedThisYear = 0;
  s.story = s.story || { used: [] };
  // v12 — backfill the player UID for pre-v12 saves. Old saves have no uid
  // field; generate one now so the social layer + admin dashboard always
  // have a stable identifier for this life. Already-set uids (new saves) are
  // kept verbatim. Trim defensively in case a corrupted save stored whitespace.
  if (typeof s.uid !== 'string' || !s.uid.trim()) s.uid = genUid();
  else s.uid = s.uid.trim();
  s.used = Array.isArray(s.used) ? s.used : [];
  // v11.28 — timed marketplace jobs backfill for old saves.
  s.mkt = Array.isArray(s.mkt) ? s.mkt : [];
  // v11.33 — favourites + rare-auction circuit backfill for old saves.
  s.favs = Array.isArray(s.favs) ? s.favs : [];
  s.rareUp = Array.isArray(s.rareUp) ? s.rareUp : [];
  s.rareLive = s.rareLive && typeof s.rareLive === 'object' ? s.rareLive : null;
  s.hall = s.hall || null;
  s.pastLives = Array.isArray(s.pastLives) ? s.pastLives : [];
  s.relations = s.relations && typeof s.relations === 'object' ? s.relations : {};
  s.pets = Array.isArray(s.pets) ? s.pets : [];
  s.clubs = Array.isArray(s.clubs) ? s.clubs : (s.club ? [s.club] : []);
  // v11.39 — career system backfill for old saves.
  s.jobExp = s.jobExp && typeof s.jobExp === 'object' ? s.jobExp : {};
  s.jobContractEnd = typeof s.jobContractEnd === 'number' ? s.jobContractEnd : 0;
  s.jobRaises = typeof s.jobRaises === 'number' ? s.jobRaises : 0;
  // v11.40 — travel cooldown backfill.
  s.travelLastDay = typeof s.travelLastDay === 'number' ? s.travelLastDay : 0;
  s.aiEvPending = !!s.aiEvPending;
  s.shortCompleted = Array.isArray(s.shortCompleted) ? s.shortCompleted : [];
  // v11.17 — toast queue (backfill for old saves).
  s.pendingToasts = Array.isArray(s.pendingToasts) ? s.pendingToasts : [];
  // v11.2 — crisis/shocks/research fields. Old saves have no crisis; default
  // to null. Shocks array defaults to []. lastResearchDay defaults to 0.
  s.crisis = s.crisis && typeof s.crisis === 'object' ? s.crisis : null;
  s.shocks = Array.isArray(s.shocks) ? s.shocks : [];
  // v11.20 — bizRnd backfill for old saves.
  s.bizRnd = s.bizRnd && typeof s.bizRnd === 'object' ? s.bizRnd : null;
  // v11.21 — spiritGainToday backfill for old saves.
  s.spiritGainToday = s.spiritGainToday && typeof s.spiritGainToday === 'object' ? s.spiritGainToday : null;
  s.lastResearchDay = typeof s.lastResearchDay === 'number' ? s.lastResearchDay : 0;
  s.researchBrief = Array.isArray(s.researchBrief) ? s.researchBrief : null;
  // v11.3 — power state. Old saves have no power; fresh-start it. If the
  // save has a partial PowerState (e.g. only unlockedTier), keep the known
  // fields and backfill the rest from freshPower().
  s.power = s.power && typeof s.power === 'object'
    ? Object.assign(freshPower(), s.power)
    : freshPower();
  // v11.5 — entity state. Same pattern: backfill from freshEntity().
  s.entity = s.entity && typeof s.entity === 'object'
    ? Object.assign(freshEntity(), s.entity)
    : freshEntity();
  // v12.2 — aiDifficulty backfill for old saves.
  s.aiDifficulty = normaliseDifficulty(s.aiDifficulty);
  // v13.2 — itemStock backfill for old saves. Pre-v13.2 saves have no
  // itemStock map; default to {} so lookups are safe. Items purchased before
  // this version obviously didn't track stock, so we leave the map empty
  // rather than synthesising values — limited-quantity items only exist via
  // custom_items created after this change.
  s.itemStock = s.itemStock && typeof s.itemStock === 'object' ? s.itemStock : {};
  // v14 — gigOverrides backfill for old saves. Pre-v14 saves have no
  // gigOverrides map; default to {} so gigPay / gigReady / gigLock fall
  // straight through to the GIGS array defaults.
  s.gigOverrides = s.gigOverrides && typeof s.gigOverrides === 'object' ? s.gigOverrides : {};
  // v14.1 — stockOverrides + customStocks backfill for old saves. Pre-v14.1
  // saves have neither field; default to {} / [] so stocksOf(s) returns
  // the plain STOCKS array unchanged. customStocks entries are filtered
  // defensively (must have a string id) so a corrupted save can't crash
  // the price-walk loop. Prices + history for any custom stock the save
  // already references are seeded here so the player's holdings stay live.
  s.stockOverrides = s.stockOverrides && typeof s.stockOverrides === 'object' ? s.stockOverrides : {};
  s.customStocks = Array.isArray(s.customStocks)
    ? s.customStocks.filter(c => c && typeof c === 'object' && typeof c.id === 'string'
        && typeof c.name === 'string' && typeof c.p === 'number' && typeof c.vol === 'number')
    : [];
  s.customStocks.forEach(c => {
    if (s.prices[c.id] == null) { s.prices[c.id] = c.p; s.hist[c.id] = [c.p]; }
  });
  // v11.6 — zodiac / gender / birthMonth / psychic. Old saves have none;
  // backfill from freshPsychic() + defaults. gender defaults to
  // 'nonbinary', birthMonth to 1 (Jan), zodiac to 'capricorn'.
  if (!RELIGIONS.includes(s.religion)) s.religion = 'none';
  s.gender = (s.gender === 'male' || s.gender === 'female' || s.gender === 'nonbinary') ? s.gender : 'nonbinary';
  // v11.36 — avatar backfill for old saves.
  s.avatar = typeof s.avatar === 'string' && s.avatar.trim() ? s.avatar.trim().slice(0, 8) : '🧑';
  s.birthMonth = Number.isFinite(s.birthMonth) && s.birthMonth >= 1 && s.birthMonth <= 12 ? s.birthMonth : 1;
  // v11.19 — birthDay backfill for old saves.
  s.birthDay = Number.isFinite(s.birthDay) && s.birthDay >= 1 && s.birthDay <= 31 ? s.birthDay : 15;
  s.zodiac = (ZODIAC.some(z => z.id === s.zodiac)) ? s.zodiac : zodiacOf(s.birthMonth, 1);
  s.psychic = s.psychic && typeof s.psychic === 'object'
    ? Object.assign(freshPsychic(), s.psychic)
    : freshPsychic();
  // v11.1 fix: clamp existing saves with astronomical follower counts.
  // Some saves had 10^23 followers due to the linear-growth bug; cap them
  // at MAX_FOLLOWERS (2B) so the new sqrt formulas produce sane numbers.
  if (s.social && typeof s.social.followers === 'number' && s.social.followers > MAX_FOLLOWERS) {
    s.social.followers = MAX_FOLLOWERS;
  }
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
  // v11.49 — clamp sleep hours to [4, 12] (12 added for catch-up sleep).
  // Default for saves missing the field entirely is 6 (new default).
  s.sleepHours = typeof s.sleepHours === 'number' ? Math.min(12, Math.max(4, s.sleepHours)) : 6;
  // v11.49 — backfill sleep debt + portfolio fields for old saves.
  s.sleepDebt = typeof s.sleepDebt === 'number' ? Math.min(35, Math.max(0, s.sleepDebt)) : 0;
  s.txSeq = typeof s.txSeq === 'number' ? s.txSeq : 0;
  s.transactions = Array.isArray(s.transactions) ? s.transactions.slice(-TX_CAP) : [];
  s.costBasis = s.costBasis && typeof s.costBasis === 'object' ? s.costBasis : {};
  // v11.50 — backfill brand customization map for old saves.
  s.brands = s.brands && typeof s.brands === 'object' ? s.brands : {};
  // v12.5 — backfill social post queue for old saves.
  s.socialQueue = Array.isArray(s.socialQueue) ? s.socialQueue : [];
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
export function begin(s: GameState, opts: { name: string; byear: number; nation: string; religion?: Religion; ints: string[]; tals: string[]; gender?: Gender; birthMonth?: number; birthDay?: number; avatar?: string }) {
  const a = analyze(opts.ints, opts.tals);
  Object.assign(s, fresh(), { started: true });
  // v12 — generate a fresh UID at the start of each life. Carried on the
  // GameState so the social layer + admin dashboard can disambiguate
  // same-name players. fresh() initialises it to '' so begin() is the single
  // authority for assigning it (avoids leaking a stale UID from a prior
  // fresh() call into a new life — Object.assign above already nuked it).
  s.uid = genUid();
  s.name = opts.name.slice(0, 24) || 'Alex';
  // v11.36 — player-chosen emoji avatar. Default by gender if not provided.
  s.avatar = (opts.avatar || '').trim().slice(0, 8) || (opts.gender === 'male' ? '👨' : opts.gender === 'female' ? '👩' : '🧑');
  s.byear = opts.byear; s.nation = opts.nation; s.religion = opts.religion || 'none';
  s.ints = [...opts.ints]; s.tals = [...opts.tals]; s.topField = a.top;
  // v11.6 — gender + birth month + zodiac. Birth month drives the zodiac
  // sign at game start; the React layer passes both in from the Intro.
  // v11.19 — birthDay (1-31) collected next to birthMonth in the Intro;
  // feeds the Spirit tab panels (Tử Vi / Phong Thuỷ) and the zodiac calc.
  s.gender = opts.gender || 'nonbinary';
  s.birthMonth = Number.isFinite(opts.birthMonth) && opts.birthMonth! >= 1 && opts.birthMonth! <= 12 ? opts.birthMonth! : 1;
  s.birthDay = Number.isFinite(opts.birthDay) && opts.birthDay! >= 1 && opts.birthDay! <= 31 ? opts.birthDay! : 15;
  s.zodiac = zodiacOf(s.birthMonth, s.birthDay);
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
  return a + n * inc * effEraFac(s);
}, 0);
// v11.2 — effective era multipliers + loan rate + closure risk. Read the
// active crisis (set by YearEvents with `lasts > 0`) and stack it on top
// of the per-year eraBiz/eraFac. Old saves (no crisis) just see eraBiz*1.
export const effEraBiz = (s: GameState) => (s.eraBiz || 1) * (s.crisis ? s.crisis.biz : 1);
export const effEraFac = (s: GameState) => (s.eraFac || 1) * (s.crisis ? s.crisis.fac : 1);
export const effLoanRate = (s: GameState) => LOAN_RATE * (s.crisis ? s.crisis.rates : 1);
export const effRisk = (s: GameState) => (s.crisis ? s.crisis.risk : 0);
export const effDemand = (s: GameState) => s.crisis ? s.crisis.demand : 1;
// v11.20 — R&D boost factor (1.0 if no active R&D or expired). Boost scales
// with amount invested: $50k → +5%, $500k → +20%, capped at +25%. Duration
// is 365 game-days (one year) regardless of amount.
export const bizRndMult = (s: GameState): number => {
  if (!s.bizRnd) return 1;
  if (s.day > s.bizRnd.untilDay) return 1;
  return s.bizRnd.boostMult;
};
export const bizMultiplier = (s: GameState) => Math.min(
  BIZ_MULTIPLIER_CAP,
  clubMult(s) * (1 + BIZ_DEGREE_BONUS * s.deg.business) * fameBonus(s) * effEraBiz(s) * levelMult(s) * spiritBizMult(s)
    * (s.power?.boardNomineeBiz || 1) // v11.3 — advocacy 'boardNominee' grants +10%
    * (constitutionById(s.entity?.constitution || 'democratic' as Constitution).bizMult) // v11.5 — constitution bizMult
    * zodiacAffinityMult(s, 'business') // v11.6 — zodiac industry affinity (+5% if zodiac = business)
    * bizRndMult(s) // v11.20 — R&D investment temporary boost
);
// v13.13 — single source of truth: bizIncome === bizNet. Previously bizIncome
// duplicated the P&L with different ordering (costs before multiplier, no manager
// fee / farm-fac upkeep, floor before multiplier) so cash paid != P&L shown.
export const bizIncome = (s: GameState): number => bizNet(s);
export const jobsOf = (s: GameState) => [s.job, s.sideJob]
  .filter((id, index, all): id is string => !!id && all.indexOf(id) === index)
  .map(id => JOBS.find(j => j.id === id))
  .filter((job): job is (typeof JOBS)[number] => !!job);
export const jobOf = (s: GameState) => jobsOf(s)[0];
export const jobIncome = (s: GameState) => jobsOf(s).reduce((total, job) => {
  // v11.6 — zodiac affinity: if the job's degree req matches the player's
  // zodiac affinity, +5% salary. Falls back to the affinity lookup, which
  // returns 1.0 for non-matching fields (no penalty).
  let mult = job.ft ? studyWorkMult(s) : 1;
  // Check if this job's req matches the zodiac affinity field
  if (job.req?.deg) {
    const fields = Object.keys(job.req.deg) as FieldKey[];
    for (const f of fields) {
      mult *= zodiacAffinityMult(s, f);
      break; // only apply the first matching field (most jobs have one)
    }
  }
  return total + job.salary * mult;
}, 0);
export const studyTuition = (s: GameState) => [s.study, s.sideStudy]
  .reduce((total, study) => total + (study?.kind === 'deg' ? study.tuition : 0), 0);
export const yearIncome = (s: GameState) => bizIncome(s) + spaceIncome(s) + socialIncome(s) + jobIncome(s) + (s.age >= RETIRE ? PENSION : 0);
export const living = (age: number) => Math.round(3000 * Math.pow(1.03, age - START));
// v11.53 — Finance Overview: total annual expenses (living + upkeep + tuition
// + loan interest + biz costs + diet + kids). Used by the cash-flow panel +
// action suggestions. Returns 0 for a fresh state with no expenses yet.
export const yearExpenses = (s: GameState): number => {
  const livingCost = living(Math.floor(s.age));
  const upk = upkeep(s);
  const tuition = studyTuition(s);
  const loanInt = s.bank.loan * effLoanRate(s);
  const bizC = bizCosts(s);
  const diet = s.diet ? DIET_COST * 12 : 0;
  const kids = s.kids * 400 * 12;
  return livingCost + upk + tuition + loanInt + bizC + diet + kids;
};
// v11.53 — Finance Overview: income broken down by source, returned as a
// sorted array (largest first) so the UI can render a clean table.
export interface IncomeSource {
  id: string;          // 'salary' | 'biz' | 'social' | 'space' | 'pension' | 'interest'
  label: 'Salary' | 'Business' | 'Social' | 'Space' | 'Pension' | 'Bank interest';
  amount: number;      // annual $ amount
  link: string;        // tab id to navigate to for this source
}
export const incomeBreakdown = (s: GameState): IncomeSource[] => {
  const out: IncomeSource[] = [];
  const sal = jobIncome(s);
  if (sal > 0) out.push({ id: 'salary', label: 'Salary', amount: sal, link: 'career' });
  const biz = bizIncome(s);
  if (biz > 0) out.push({ id: 'biz', label: 'Business', amount: biz, link: 'biz' });
  const soc = socialIncome(s);
  if (soc > 0) out.push({ id: 'social', label: 'Social', amount: soc, link: 'social' });
  const sp = spaceIncome(s);
  if (sp > 0) out.push({ id: 'space', label: 'Space', amount: sp, link: 'space' });
  const pen = s.age >= RETIRE ? PENSION : 0;
  if (pen > 0) out.push({ id: 'pension', label: 'Pension', amount: pen, link: 'career' });
  const interest = s.bank.dep * SAVE_RATE;
  if (interest > 0) out.push({ id: 'interest', label: 'Bank interest', amount: interest, link: 'bank' });
  return out.sort((a, b) => b.amount - a.amount);
};
// v11.53 — Finance Overview: expenses broken down by category.
export interface ExpenseItem {
  id: string;          // 'living' | 'upkeep' | 'tuition' | 'loanInt' | 'bizCosts' | 'diet' | 'kids'
  label: 'Living' | 'Asset upkeep' | 'Tuition' | 'Loan interest' | 'Business costs' | 'Diet' | 'Kids';
  amount: number;      // annual $ amount
  link: string;        // tab id to navigate to
}
export const expenseBreakdown = (s: GameState): ExpenseItem[] => {
  const out: ExpenseItem[] = [];
  const lv = living(Math.floor(s.age));
  if (lv > 0) out.push({ id: 'living', label: 'Living', amount: lv, link: 'career' });
  const upk = upkeep(s);
  if (upk > 0) out.push({ id: 'upkeep', label: 'Asset upkeep', amount: upk, link: 'assets' });
  const tuition = studyTuition(s);
  if (tuition > 0) out.push({ id: 'tuition', label: 'Tuition', amount: tuition, link: 'edu' });
  const loanInt = s.bank.loan * effLoanRate(s);
  if (loanInt > 0) out.push({ id: 'loanInt', label: 'Loan interest', amount: loanInt, link: 'bank' });
  const bizC = bizCosts(s);
  if (bizC > 0) out.push({ id: 'bizCosts', label: 'Business costs', amount: bizC, link: 'biz' });
  if (s.diet) out.push({ id: 'diet', label: 'Diet', amount: DIET_COST * 12, link: 'health' });
  if (s.kids > 0) out.push({ id: 'kids', label: 'Kids', amount: s.kids * 400 * 12, link: 'home' });
  return out.sort((a, b) => b.amount - a.amount);
};
// v11.53 — Finance Overview: asset breakdown by category.
export interface AssetItem {
  id: string;          // 'cash' | 'savings' | 'stocks' | 'items' | 'biz' | 'farm' | 'fac' | 'space'
  label: 'Cash' | 'Savings' | 'Stocks' | 'Items' | 'Business' | 'Farm' | 'Factory' | 'Space';
  amount: number;
  link: string;
}
export const assetBreakdown = (s: GameState): AssetItem[] => {
  const out: AssetItem[] = [];
  if (s.money > 0) out.push({ id: 'cash', label: 'Cash', amount: s.money, link: 'bank' });
  if (s.bank.dep > 0) out.push({ id: 'savings', label: 'Savings', amount: s.bank.dep, link: 'bank' });
  const stk = stockVal(s);
  if (stk > 0) out.push({ id: 'stocks', label: 'Stocks', amount: stk, link: 'markets' });
  const items = assetVal(s);
  if (items > 0) out.push({ id: 'items', label: 'Items', amount: items, link: 'assets' });
  const biz = bizVal(s);
  if (biz > 0) out.push({ id: 'biz', label: 'Business', amount: biz, link: 'biz' });
  return out.sort((a, b) => b.amount - a.amount);
};
// v11.53 — Finance Overview: action suggestions based on the player's state.
// Returns a priority-sorted list of { id, text, link } tuples — each one
// identifies a concrete thing the player could do to improve their finances.
export interface FinanceAction {
  id: string;
  priority: 'high' | 'medium' | 'low';
  text: string;        // human-readable suggestion (caller can i18n the prefix)
  link: string;        // tab id to navigate to
}
export function financeActions(s: GameState): FinanceAction[] {
  const out: FinanceAction[] = [];
  const yi = yearIncome(s);
  const ye = yearExpenses(s);
  const monthlyExpenses = ye / 12;
  // 1. Income below expenses — high priority.
  if (yi < ye && ye > 0) {
    out.push({
      id: 'deficit',
      priority: 'high',
      text: `Income ${fmt(yi)}/yr is below expenses ${fmt(ye)}/yr — increase revenue or cut costs.`,
      link: 'career',
    });
  }
  // 2. Loan active — repay to save interest (high if interest is large).
  if (s.bank.loan > 0) {
    const interestYr = s.bank.loan * effLoanRate(s);
    out.push({
      id: 'repay',
      priority: interestYr > 5000 ? 'high' : 'medium',
      text: `Loan ${fmt(s.bank.loan)} costs ${fmt(interestYr)}/yr in interest — repay to save.`,
      link: 'bank',
    });
  }
  // 3. Idle cash — deposit to savings (medium).
  if (s.money > 3 * monthlyExpenses && s.money > 1000 && s.bank.dep < s.money * 0.5) {
    const potential = s.money * 0.5 * SAVE_RATE;
    out.push({
      id: 'deposit',
      priority: 'medium',
      text: `${fmt(s.money)} idle cash — deposit ~half to savings to earn ${fmt(potential)}/yr.`,
      link: 'bank',
    });
  }
  // 4. Active study — finish to stop tuition (medium).
  if (s.study || s.sideStudy) {
    const tuitionYr = studyTuition(s);
    if (tuitionYr > 0) {
      out.push({
        id: 'study',
        priority: 'medium',
        text: `Paying ${fmt(tuitionYr)}/yr tuition — finish the degree to stop the bleed.`,
        link: 'edu',
      });
    }
  }
  // 5. Stocks held — review portfolio (low).
  const stk = stockVal(s);
  if (stk > 0) {
    out.push({
      id: 'portfolio',
      priority: 'low',
      text: `Holding ${fmt(stk)} in stocks — review ROI in the Portfolio tab.`,
      link: 'portfolio',
    });
  }
  // 6. No business — consider opening one (low, only if has cash).
  const totalBranches = BIZ.reduce((n, b) => n + branchCount(s, b.id), 0);
  if (totalBranches === 0 && s.money > 1000) {
    out.push({
      id: 'startbiz',
      priority: 'low',
      text: `No business yet — opening one builds passive income. Cash ${fmt(s.money)} available.`,
      link: 'biz',
    });
  }
  // 7. Biz profitable — consider expanding (low).
  const bn = bizNet(s);
  if (bn > 5000) {
    out.push({
      id: 'expand',
      priority: 'low',
      text: `Business nets ${fmt(bn)}/yr — consider opening more branches to scale.`,
      link: 'biz',
    });
  }
  // 8. Health low — health-care costs are coming (high).
  if (s.health < 35) {
    out.push({
      id: 'health',
      priority: 'high',
      text: `Health critical (${Math.round(s.health)}/100) — rest or see a doctor before medical bills hit.`,
      link: 'health',
    });
  }
  // Sort by priority: high → medium → low.
  const order: Record<FinanceAction['priority'], number> = { high: 0, medium: 1, low: 2 };
  return out.sort((a, b) => order[a.priority] - order[b.priority]);
}
export const lotValue = (s: GameState, l: { id: string; paid: number; day: number; condition?: number }) => {
  // Saves may outlive catalogue revisions. Unknown legacy lots must not crash valuation.
  const it = l?.id ? ITEM_BY[l.id] : undefined;
  const rawRate = Number(it?.rate);
  const itemRate = Number.isFinite(rawRate) ? rawRate : ASSET_DEPRECIATION_RATE;
  const rate = Math.min(itemRate, ASSET_DEPRECIATION_RATE);
  const paid = Number.isFinite(Number(l?.paid)) ? Math.max(0, Number(l.paid)) : 0;
  const boughtDay = Number.isFinite(Number(l?.day)) ? Number(l.day) : s.day;
  const yrs = Math.max(0, (s.day - boughtDay) / 365.25);
  const base = paid * Math.pow(1 - rate, yrs);
  // v10.5: condition multiplies value (40-100% range → 0.4-1.0 of base).
  // Unknown legacy items use common rarity and conservative depreciation.
  const cond = Number.isFinite(Number(l?.condition)) ? Number(l.condition) : 100;
  const rarity = it ? itemRarity(it) : 'common';
  // v13.2 — mythic tier sits above legendary: higher condition floor (80)
  // and a 2.0× premium (vs legendary's 1.6×). Ultra-limited pieces hold
  // value almost regardless of condition.
  const floor = rarity === 'mythic' ? 80 : rarity === 'legendary' ? 70 : rarity === 'rare' ? 55 : rarity === 'uncommon' ? 45 : 35;
  const eff = Math.max(floor, Math.min(100, Math.max(0, cond)));
  const condFactor = 0.4 + 0.6 * (eff / 100);
  return base * condFactor * (rarity === 'mythic' ? 2 : rarity === 'legendary' ? 1.6 : rarity === 'rare' ? 1.2 : rarity === 'uncommon' ? 1.05 : 1);
};
// v11 — upkeep now includes optional crew cost for Yacht / Private jet.
// The player no longer needs a licence to own these — they hire a crew
// instead. If they DO have the relevant licence (boat / pilot), the crew
// cost is halved because they can self-drive part of the time.
export const crewCostFor = (s: GameState, l: { id: string }): number => {
  const it = ITEM_BY[l.id]; if (!it) return 0;
  const base = CREW_COST[it.cat] || 0;
  if (!base) return 0;
  const hasLic = (it.cat === 'Yacht' && s.lic['boat']) || (it.cat === 'Private jet' && s.lic['pilot']);
  return hasLic ? Math.round(base / 2) : base;
};
export const upkeep = (s: GameState) => s.lots.reduce((a, l) => a + lotValue(s, l) * 0.02 + crewCostFor(s, l), 0);
// v11.20 — business P&L helpers. bizRevenue = gross annual revenue from all
// branches + farm + fac lines (before bizMultiplier, before costs).
// bizCosts = sum of per-branch overhead (base/24 per branch per year, the
// same formula bizIncome subtracts) + manager fees (MANAGER_MONTHLY × 12 per
// capital-path branch) + farm/fac line upkeep (1% of cost per year).
// bizNet = (revenue × bizMultiplier) - costs. This is what bizIncome approximates
// but split out so the UI can show a P&L breakdown.
export const bizRevenue = (s: GameState): number => {
  let rev = 0;
  // v13.13 — franchised branches pay 10% royalty: revenue here is net of royalty so bizNet/bizIncome agree.
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => {
    const royalty = br.franchised ? (1 - FRANCHISE_ROYALTY) : 1;
    rev += b.inc * REG_MULT[br.r % REG_MULT.length] * br.mood * royalty;
  }));
  rev += farmIncome(s) + facIncome(s);
  return Math.max(0, rev);
};
export const bizCosts = (s: GameState): number => {
  let costs = 0;
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => {
    costs += b.base / 24; // per-branch overhead (matches bizIncome subtraction)
    // Capital-path branches pay a manager — MANAGER_MONTHLY × 12 per year.
    const c = bizCost(s, b);
    if (br.paid > c * 1.5) costs += MANAGER_MONTHLY(b.base) * 12;
  }));
  // Farm + fac line upkeep: 1% of cost per year (light upkeep on infrastructure).
  FARM_LINES.forEach(l => { if (s.farm[l.id]) costs += l.cost * 0.01; });
  FAC_LINES.forEach(l => { if (s.fac[l.id]) costs += l.cost * 0.01; });
  return costs;
};
export const bizNet = (s: GameState): number => Math.max(0, bizRevenue(s) * bizMultiplier(s)) - bizCosts(s);
// Market share: player's branch count vs a notional "full market" of 60
// branches (6 BIZ types × 10 branches each as a soft cap). Returns 0..1.
export const bizMarketShare = (s: GameState): number => {
  const total = BIZ.reduce((n, b) => n + branchCount(s, b.id), 0);
  return Math.min(1, total / 60);
};
// v11.20 — R&D investment action. `amount` is the cash spent; returns the
// boost % granted (5-25%). Boost lasts 365 game-days. Re-investing while
// active replaces the previous boost (doesn't stack). Throws nothing —
// returns null on insufficient funds.
export function investBizRnd(s: GameState, amount: number): { pct: number; untilDay: number } | null {
  if (!Number.isFinite(amount) || amount < 50_000) return null;
  if (s.money < amount) return null;
  // Boost: log-capped. $50k → 5%, $500k → ~20%, $5M → cap 25%.
  // Formula: 5 + 8 * log10(amount / 50000), clamped to [5, 25].
  const pct = Math.max(5, Math.min(25, 5 + 8 * Math.log10(amount / 50_000)));
  const boostMult = 1 + pct / 100;
  s.money -= amount;
  s.bizRnd = { amount, investedDay: s.day, untilDay: s.day + 365, boostMult };
  pushLog(s, `R&D invested ${fmt(amount)} → biz +${pct.toFixed(1)}% for 365 days.`);
  return { pct, untilDay: s.day + 365 };
}
export const assetVal = (s: GameState) => s.lots.reduce((a, l) => a + lotValue(s, l), 0);
export const bizVal = (s: GameState) => {
  const valueAt = (paid: number, boughtDay: number) =>
    paid * Math.pow(1 - ASSET_DEPRECIATION_RATE, Math.max(0, (s.day - boughtDay) / 365.25));
  let total = 0;
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => { total += valueAt(br.paid, br.day); }));
  FARM_LINES.forEach(l => { if (s.farm[l.id]) total += valueAt(l.cost, s.farmBought[l.id] ?? s.day); });
  FAC_LINES.forEach(l => { if (s.fac[l.id]) total += valueAt(l.cost, s.facBought[l.id] ?? s.day); });
  SPACE_LINES.forEach(l => { if (s.space[l.id]) total += valueAt(l.cost, s.spaceBought[l.id] ?? s.day); });
  return total;
};
export const stockVal = (s: GameState) => stocksOf(s).reduce((a, x) => a + (s.stk[x.id] || 0) * s.prices[x.id], 0);
export const netWorth = (s: GameState) => s.money + stockVal(s) + assetVal(s) + bizVal(s) + s.bank.dep - s.bank.loan + marketVal(s);

// v14.1 — admin stock catalogue helpers. The built-in STOCKS array is the
// immutable seed list shipped in gameData.ts; stockOverrides patches the
// built-ins (price / volatility / name / art) without removing them, and
// customStocks adds entirely new tickers. stocksOf(s) merges all three into
// a single StockDef[] that stockVal, processDay's price-walk, trade(),
// portfolioUnrealizedGains, and the StockTab UI consume — so adding /
// editing / deleting a stock takes effect everywhere the market is read.
export type StockDef = { id: string; name: string; p: number; vol: number; art: string };
export function stocksOf(s: GameState): StockDef[] {
  const out: StockDef[] = STOCKS.map(x => {
    const ov = s.stockOverrides && s.stockOverrides[x.id];
    if (!ov) return x;
    return {
      id: x.id,
      name: typeof ov.name === 'string' && ov.name.trim() ? ov.name.trim() : x.name,
      p: typeof ov.p === 'number' && Number.isFinite(ov.p) && ov.p > 0 ? ov.p : x.p,
      vol: typeof ov.vol === 'number' && Number.isFinite(ov.vol) && ov.vol >= 0 ? ov.vol : x.vol,
      art: typeof ov.art === 'string' && ov.art.trim() ? ov.art.trim() : x.art,
    };
  });
  const customs = Array.isArray(s.customStocks) ? s.customStocks : [];
  for (const c of customs) {
    if (c && typeof c.id === 'string' && !out.some(x => x.id === c.id)) {
      out.push({ id: c.id, name: c.name, p: c.p, vol: c.vol, art: c.art });
    }
  }
  return out;
}
// v14.1 — register a stock into s.customStocks (idempotent: re-registering an
// existing id is a no-op). Mirrors registerItem() in gameData.ts but writes
// to the durable GameState field so admin-created stocks survive save/load.
// Called by adminCreateStock; exposed for direct engine callers (tests,
// future server-side scripts) that need to seed a custom ticker without going
// through the ADMIN_ACTION broadcast.
export function registerStock(s: GameState, stock: StockDef): void {
  if (!s.customStocks) s.customStocks = [];
  if (s.customStocks.some(x => x.id === stock.id)) return;
  if (STOCKS.some(x => x.id === stock.id)) return; // don't shadow a built-in
  s.customStocks.push({ id: stock.id, name: stock.name, p: stock.p, vol: stock.vol, art: stock.art });
}

// ================= v11.49 — PORTFOLIO DASHBOARD =================
// Transaction log + cost-basis tracking so the Portfolio tab can show P&L,
// per-asset ROI, and a chronological ledger. Every cash-touching action
// (stocks, items, biz, bank, gigs, tuition, donations) calls recordTx.
//
// Cost basis is tracked per stock id as a single weighted-average dollar
// figure (total $ invested in that stock). On a partial sell we deduct the
// proportional share of the basis and realize the difference as P&L.
export function recordTx(s: GameState, tx: Omit<Transaction, 'id' | 'day'>): void {
  s.txSeq = (s.txSeq || 0) + 1;
  s.transactions.push({ ...tx, id: s.txSeq, day: s.day });
  if (s.transactions.length > TX_CAP) s.transactions = s.transactions.slice(-TX_CAP);
}
// v11.49 — realized P&L across all SELL transactions (stocks + items + biz).
export const portfolioRealizedGains = (s: GameState): number =>
  s.transactions.reduce((sum, tx) => sum + (tx.realizedPnL || 0), 0);
// v11.49 — unrealized P&L: current market value minus cost basis, per holding.
// Stocks: stk_qty × current_price − costBasis[id]. Lots + biz: lotValue/bizVal
// already track appreciation from `paid`, so we expose them via the same API.
export const portfolioUnrealizedGains = (s: GameState): number => {
  let gains = 0;
  // Stocks: weighted-avg cost basis tracked in s.costBasis[id].
  // v14.1 — iterates stocksOf(s) so custom + overridden stocks are included.
  for (const x of stocksOf(s)) {
    const qty = s.stk[x.id] || 0;
    if (qty <= 0) continue;
    const basis = s.costBasis[x.id] || 0;
    gains += qty * s.prices[x.id] - basis;
  }
  // Lots: current value minus `paid` (depreciation + condition already applied).
  gains += s.lots.reduce((a, l) => a + lotValue(s, l) - l.paid, 0);
  // Businesses: per-branch current value minus `paid`.
  const bizGains = (paid: number, boughtDay: number) =>
    paid * Math.pow(1 - ASSET_DEPRECIATION_RATE, Math.max(0, (s.day - boughtDay) / 365.25)) - paid;
  BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => { gains += bizGains(br.paid, br.day); }));
  FARM_LINES.forEach(l => { if (s.farm[l.id]) gains += bizGains(l.cost, s.farmBought[l.id] ?? s.day); });
  FAC_LINES.forEach(l => { if (s.fac[l.id]) gains += bizGains(l.cost, s.facBought[l.id] ?? s.day); });
  SPACE_LINES.forEach(l => { if (s.space[l.id]) gains += bizGains(l.cost, s.spaceBought[l.id] ?? s.day); });
  return gains;
};
// v11.49 — total invested (sum of all BUY transactions' amounts, sign-flipped
// to positive). Excludes transfers (bank deposits/loans) and income. Useful
// for ROI denominator: ROI = (currentNW - totalInvested) / totalInvested.
export const portfolioInvested = (s: GameState): number =>
  s.transactions.reduce((sum, tx) => tx.kind === 'buy' ? sum + Math.abs(tx.amount) : sum, 0);
// v11.49 — total income earned (gigs + jobs + dividends). Realized gains are
// reported separately via portfolioRealizedGains to keep the breakdown clean.
export const portfolioIncome = (s: GameState): number =>
  s.transactions.reduce((sum, tx) => tx.kind === 'income' || tx.kind === 'dividend' ? sum + tx.amount : sum, 0);
// v11.49 — overall ROI % across all invested capital. Includes both realized
// and unrealized gains. Returns null when no investments yet (avoid div/0).
export function portfolioROI(s: GameState): number | null {
  const invested = portfolioInvested(s);
  if (invested <= 0) return null;
  return (portfolioRealizedGains(s) + portfolioUnrealizedGains(s)) / invested;
}
// v11.49 — per-stock ROI breakdown for the holdings table.
export function stockROI(s: GameState, stockId: string): number | null {
  const qty = s.stk[stockId] || 0;
  if (qty <= 0) return null;
  const basis = s.costBasis[stockId] || 0;
  if (basis <= 0) return null;
  return (qty * s.prices[stockId] - basis) / basis;
}
// v11.49 — net cash flow over a window of the last N days (default 30).
// Income minus expenses minus investments. Useful for the burn-rate panel.
export function cashFlowLastDays(s: GameState, days = 30): number {
  const since = s.day - days;
  return s.transactions.reduce((sum, tx) => {
    if (tx.day < since) return sum;
    if (tx.kind === 'transfer') return sum; // bank deposits/withdrawals are not P&L
    return sum + tx.amount;
  }, 0);
}
export const clickVal = (s: GameState) => Math.max(25, Math.round((30 + 0.01 * yearIncome(s)) * ((s.ints.includes('sports') || s.tals.includes('hands')) ? 1.25 : 1)));
export const taxOf = (inc: number) => {
  let t = 0, lo = 0;
  for (const [hi, rate] of TAX_BRACKETS) { if (inc > lo) { t += (Math.min(inc, hi) - lo) * rate; lo = hi; } else break; }
  return Math.round(t);
};
export const tuitionOf = (s: GameState, f: FieldKey, l: number) => {
  let base = FIELDS[f].tuition[l - 1];
  if (s.topField === f) base *= .8;
  // v11 — short course in the same field grants 10% tuition reduction.
  const hasShort = s.shortCompleted?.some(id => SHORT_BY[id]?.field === f);
  if (hasShort) base *= .9;
  return Math.round(base);
};
export const effYears = (s: GameState, f: FieldKey, l: number) =>
  FIELDS[f].years[l - 1] * (s.topField && s.topField !== f ? 1.25 : 1) * (s.tals.includes('focus') ? .9 : 1);
export const studyWorkMult = (s: GameState) => (s.study || s.sideStudy) && jobsOf(s).some(job => job.ft) ? .6 : 1;
export const spaceUpgradeDays = 365;
export const SPACE_TRAVEL_COST = 10000000;
export const sleepHoursOptions = [4, 5, 6, 7, 8, 9, 10, 12] as const;
export const spaceUpgradeReady = (s: GameState) =>
  !s.spaceTravel && !s.spaceUpgrade && !!s.space.orbital && s.level >= 12 &&
  worldYear(s) >= 2025 && s.money >= SPACE_TRAVEL_COST;
export const lineUnlocked = (s: GameState, l: LineDef) => worldYear(s) >= l.since;
export const lineReady = (s: GameState, l: LineDef) =>
  lineUnlocked(s, l) && (l.farm ? branchCount(s, 'farm') > 0 : true) && (l.fac ? branchCount(s, 'fac') > 0 : true) &&
  (!l.food || branchCount(s, 'farm') > 0) && (!l.needs || (s.fac[l.needs] || 0) > 0);
export function pushLog(s: GameState, t: string) { s.log.push(t); if (s.log.length > 80) s.log.shift(); }
// v11.17 — queue a user-facing toast. Engine functions call this when a
// milestone, incident, or piece of good/bad news happens that the player
// should see immediately (graduation, branch closure, scandal, ambient mini-
// events). tick() drains s.pendingToasts into its return value; the React
// layer surfaces each entry via showToast(). Capped at 20 to avoid runaway.
export function queueToast(s: GameState, msg: string): void {
  if (!msg) return;
  s.pendingToasts.push(msg);
  if (s.pendingToasts.length > 20) s.pendingToasts.shift();
}
// v11.21 — grant spirit points from a Spirit-tab activity (Kinh Dịch /
// Tử Vi / Phong Thuỷ / Tarot). Capped at SPIRIT_DAILY_CAP per game-day so
// the player can't farm spirit by spamming casts. Resets the cap when the
// game-day rolls over. Returns the amount actually granted (may be less
// than requested if the cap is hit, or 0 if the cap is already reached).
export const SPIRIT_DAILY_CAP = 8;
export function grantSpirit(s: GameState, amount: number, source: string): number {
  if (amount <= 0) return 0;
  const today = Math.floor(s.day);
  if (!s.spiritGainToday || s.spiritGainToday.day !== today) {
    s.spiritGainToday = { day: today, gained: 0 };
  }
  const remaining = SPIRIT_DAILY_CAP - s.spiritGainToday.gained;
  if (remaining <= 0) return 0;
  const granted = Math.min(amount, remaining);
  s.spirit = Math.min(100, s.spirit + granted);
  s.spiritGainToday.gained += granted;
  pushLog(s, `${source} — spirit +${granted} (today ${s.spiritGainToday.gained}/${SPIRIT_DAILY_CAP}).`);
  return granted;
}
export const spiritGainTodayLeft = (s: GameState): number => {
  if (!s.spiritGainToday || s.spiritGainToday.day !== Math.floor(s.day)) return SPIRIT_DAILY_CAP;
  return Math.max(0, SPIRIT_DAILY_CAP - s.spiritGainToday.gained);
};
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
  // v10.5 — pet passive effects (spirit regen + neglect health-drain).
  tickPets(s);
  // v11 — random AI oracle popup. v11.7: increased to ~3% chance per
  // game-day (was 1%) and lowered the play-time threshold from 180 days
  // to 30 days (~10 minutes of real time, was ~60 min). The original
  // numbers made popups too rare to ever see in a typical session.
  // v11.12: bumped to ~4%/day so career/business situations (good and bad)
  // fire more often, per the player's request for more in-work events.
  // v11.17: bumped to ~6%/day (more online AI popups) + added a separate
  // ambient mini-event pool below that fires lightweight "tin vui / sự cố"
  // flavor toasts without spinning up a full LLM call.
  // v11.22 — bumped to ~9%/day (was 6%) per player complaint that AI popups
  // are not showing. At 9%/day with 30s=1day, that's roughly one popup every
  // ~5.5 minutes of active play — frequent enough to feel alive.
  // v11.24 — threshold lowered day>30 → day>3. THE REAL BUG behind "thông báo
  // không hoạt động": day>30 = 15 minutes of real play before the FIRST event
  // could ever roll — most sessions ended before anything fired. Rates are
  // useless if the gate blocks the whole session; now events can start after
  // ~90 seconds of play.
  if (!s.aiEvPending && !s.pending && !s.aiEv && s.started && s.day > 3 && rng() < 0.09) {
    s.aiEvPending = true;
  }
  // v11.22 — ambient mini-events ~6%/day. At 30s=1day, roughly one ambient
  // toast every ~8 minutes. These are the "tin vui / sự cố" flavor
  // notifications (found $20, parking ticket, etc.) that make the world feel
  // alive during online play. NOT full AI oracle popups — short toast-only
  // flavor lines with small ±$50–$500 swings.
  // v11.24 — same threshold fix: day>30 → day>3.
  if (!s.pending && !s.aiEv && s.started && s.day > 3 && rng() < 0.06) {
    const ambient = AMBIENT_EVENTS[Math.floor(rng() * AMBIENT_EVENTS.length)];
    if (ambient.cash) s.money += ambient.cash;
    if (ambient.health) s.health = Math.max(0, Math.min(100, s.health + ambient.health));
    if (ambient.spirit) s.spirit = Math.max(0, Math.min(100, s.spirit + ambient.spirit));
    pushLog(s, ambient.msg + (ambient.cash ? ` ${ambient.cash >= 0 ? '+' : '−'}${fmt(Math.abs(ambient.cash))}` : ''));
    queueToast(s, ambient.toast);
  }
  // v11.24 — DAILY stock price walk. THE REAL BUG behind "market chưa hoạt
  // động": STOCKS[].vol was defined but never used, and s.hist was never
  // pushed to — prices only moved on year-boundary shocks and crises, so in
  // calm years the chart was a dead flat line and there was nothing to trade.
  // Each stock now does a small geometric random walk every game-day (30s),
  // scaled by its own volatility (COIN ±9% … BANK ±2%), with a gentle mean
  // reversion toward the listing price so prices can't wander to 0 or ∞.
  // History is appended (capped at 60 points) so sparklines finally move.
  if (s.started && !s.over) {
    // v14.1 — walk every stock (built-ins + overridden + custom) so the
    // admin-managed market moves in lockstep with the seed tickers. The
    // override's p / vol take effect here automatically via stocksOf(s).
    stocksOf(s).forEach(x => {
      const cur = s.prices[x.id] || x.p;
      const vol = x.vol || 0.02;
      const walk = (rng() * 2 - 1) * vol;
      const revert = ((x.p - cur) / x.p) * 0.012; // ≤1.2%/day pull toward listing price
      const next = cur * (1 + walk + revert);
      s.prices[x.id] = Math.max(x.p * 0.25, Math.min(x.p * 6, next));
      const h = s.hist[x.id] || (s.hist[x.id] = []);
      h.push(s.prices[x.id]);
      if (h.length > 60) h.shift();
    });
  }
  // v11.49 — sleep debt: accumulate when < 7h, pay down when > 7h (catch-up
  // rate is 2× the deficit rate so a single 12h night recovers a 4h deficit).
  // Debt is clamped to [0, 35] (5 days of accumulated 4h-shortfall cap).
  // Penalties use the BEFORE-sleep debt level — today's catch-up only reduces
  // TOMORROW's penalty, not today's. So 10h sleep on day 3 of deficit (debt=21)
  // still feels the penalty today but starts fresh tomorrow.
  const debtBefore = s.sleepDebt;
  const deficit = Math.max(0, 7 - s.sleepHours);
  const catchup = Math.max(0, s.sleepHours - 7) * 2;
  s.sleepDebt = Math.max(0, Math.min(35, s.sleepDebt + deficit - catchup));
  // Sleep trades study time for health recovery; other wellbeing modifiers still apply.
  // v11.49 — sleep ≥ 7h now RECOVERS health (sleepHealthRecovery adds a positive
  // amount per day). Sleep-debt penalty (>21) multiplies decay by 1.2 (chronic
  // deprivation also blocks recovery).
  const dhp = ageDecayPerDay(s.age) * sleepHealthMult(s.sleepHours) * sleepDebtHealthMult(debtBefore) * (s.diet ? .55 : 1) * (s.spirit >= 70 ? .85 : 1);
  const recovery = debtBefore > 21 ? 0 : sleepHealthRecovery(s.sleepHours); // exhausted = no recovery
  s.health = Math.min(100, Math.max(0, s.health - dhp * (0.75 + rng() * 0.5) + recovery));
  // v11.49 — apply sleep-debt penalty to study pace (>7 debt → ×0.9, >21 → ×0.75).
  const debtMult = sleepDebtStudyMult(debtBefore);
  if (s.study) s.study.end -= (studyPace(s.sleepHours) - 1) * debtMult;
  if (s.sideStudy) s.sideStudy.end -= (studyPace(s.sleepHours) - 1) * debtMult;
  if (s.diet) s.money -= DIET_COST;
  // v12.5 — drain one queued social post per game day. AI events push to
  // s.socialQueue instead of directly to s.social.posts so multiple
  // simultaneous events don't get lost (posts array caps at 12).
  if (s.socialQueue && s.socialQueue.length > 0) {
    const next = s.socialQueue.shift()!;
    s.social.posts.unshift({ d: next.day, t: next.text, likes: next.likes, reactions: next.reactions });
    s.social.lastPostDay = s.lastDay;
    if (s.social.posts.length > 12) s.social.posts.pop();
  }
  if (s.health <= 15 && d % 30 === 0) pushLog(s, 'Your health is fragile — eat well, rest, see a doctor.');
  if (d % 14 === 0) {
    const net = jobIncome(s) / 26 + (s.age >= RETIRE ? PENSION / 26 : 0);
    if (net > 0) { s.money += net; s.yIncome += net; pushLog(s, `Payday: +${fmt(net)}.`); }
  }
  if (dt.getUTCDate() === 1) {
    const profit = bizIncome(s) / 12 + spaceIncome(s) / 12 + socialIncome(s) / 12;
    const tuition = studyTuition(s) / 12;
    // v11.2 — loan interest uses effLoanRate, which multiplies LOAN_RATE by
    // crisis.rates (1.6 during 2008 etc.) so debt service balloons in a
    // credit crunch. Mirrors real-world rate-hike dynamics.
    const loanInt = s.bank.loan * effLoanRate(s) / 12;
    const bills = living(s.age) / 12 + upkeep(s) / 12 + tuition + s.kids * 400 + loanInt;
    const interest = s.bank.dep * SAVE_RATE / 12;
    s.bank.dep += interest; s.yIncome += Math.max(0, interest);
    s.money += profit - bills;
    if (profit > 0) s.yIncome += profit;
    // social media: follower graph drifts with fame every month (sqrt growth + hard cap)
    // v11.1: raise the cap from 200M to MAX_FOLLOWERS (2B) and clamp properly.
    const fg = Math.min(
      Math.round((Math.sqrt(Math.max(0, s.fame)) * 140 + Math.sqrt(s.social.followers) * 8) * (0.4 + rng() * 1.2)),
      MAX_FOLLOWERS - s.social.followers);
    if (fg > 0) s.social.followers = Math.min(MAX_FOLLOWERS, s.social.followers + fg);
    if (s.social.followers > 0) addXp(s, Math.min(12, 1 + s.social.followers / 20000), rng);
    if (bizIncome(s) > 0) addXp(s, Math.min(25, 1 + profit / 12000), rng);
    let booms = 0, busts = 0;
    // v11.2 — branch mood drift now applies a small additive drag during a
    // demand crisis. Multiplicative scaling was too brutal (0.7^12 ≈ 0.014
    // → branches hit the floor in 3 months); an additive drag of
    // (1−demand)*0.1 per month compounds to ~0.65 over a year at demand=0.7,
    // which matches the "business climate weakens for a year" feel without
    // instantly ruining the player's portfolio. The random walk still
    // applies on top so individual branches still vary.
    const demandDrag = s.crisis && s.crisis.demand < 1 ? (1 - s.crisis.demand) * 0.1 : 0;
    BIZ.forEach(b => (s.branches[b.id] || []).forEach(br => {
      const noise = (rng() - .5) * .22 - demandDrag;
      br.mood = Math.min(1.7, Math.max(.25, br.mood + noise));
      if (br.mood >= 1.4) booms++; if (br.mood <= .5) busts++;
    }));
    pushLog(s, `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}: business ${profit >= 0 ? '+' : '\u2212'}${fmt(Math.abs(profit))}, rent & bills \u2212${fmt(bills)}.${booms ? ' Some branches are booming!' : ''}${busts ? ' Some branches are struggling!' : ''}`);
  }
  if (dt.getUTCMonth() === 0 && dt.getUTCDate() === 1) {
    const y = dt.getUTCFullYear();
    if (s.yIncome > 0) {
      const charityDeduction = Math.min(s.donatedThisYear || 0, s.yIncome * 0.2);
      const taxable = Math.max(0, s.yIncome - charityDeduction);
      const t = taxOf(taxable);
      s.yTax = t; s.money -= t;
      pushLog(s, `Tax season ${y}: income ${fmt(s.yIncome)} - charity ${fmt(charityDeduction)} → tax bill ${fmt(t)}.`);
      s.yIncome = 0;
      s.donatedThisYear = 0;
    }
    // v11.2 — tick existing crisis first. If yearsLeft hits 0, clear it
    // and log a normalisation message. Done BEFORE applying this year's
    // event so a new crisis (e.g. 1931 following 1929) can replace an
    // expiring one cleanly.
    if (s.crisis) {
      s.crisis.yearsLeft -= 1;
      if (s.crisis.yearsLeft <= 0) {
        pushLog(s, `1 Jan ${y}: The ${s.crisis.cause} has eased. Markets normalise.`);
        s.crisis = null;
      }
    }
    // v11.2 — research brief goes stale at the start of a new year.
    if (s.researchBrief) s.researchBrief = null;
    s.eraBiz = 1; s.eraFac = 1;
    const ye = YEAR_EVENTS[y];
    if (ye) {
      // v11.2 — split stock + deposit shocks into an instant slice and a
      // delayed slice (fires ~30 days later for stocks, ~60 for deposits).
      // Net effect over the delay window is the original `m`; the split
      // simulates how real crashes unfold over weeks rather than overnight.
      // For m=0.5: instant sqrt(0.5)≈0.707, delayed 0.5/0.707≈0.707. Net
      // 0.707 * 0.707 = 0.5. ✓
      if (ye.stk) {
        const instant: Record<string, number> = {};
        const delayed: Record<string, number> = {};
        for (const k of Object.keys(ye.stk)) {
          const m = ye.stk[k]; if (m == null) continue;
          const inst = Math.sqrt(m);
          instant[k] = inst;
          delayed[k] = m / inst;
        }
        STOCKS.forEach(x => {
          const m = instant[x.id] != null ? instant[x.id] : instant['*'];
          if (m) s.prices[x.id] *= m;
        });
        const hasDelayed = Object.values(delayed).some(v => Math.abs(v - 1) > 1e-9);
        if (hasDelayed) s.shocks.push({ day: s.lastDay + 30, stk: delayed, note: 'stock shock' });
      }
      if (ye.dep) {
        const m = ye.dep;
        const inst = Math.pow(m, 0.7);
        s.bank.dep *= inst;
        const rest = m / inst;
        if (Math.abs(rest - 1) > 1e-9) s.shocks.push({ day: s.lastDay + 60, dep: rest, note: 'bank-run tail' });
      }
      if (ye.cash) s.money += ye.cash;
      // v11.2 — start a crisis that carries the biz/fac/rates/risk/demand
      // modifiers for `lasts` years. Trigger year: eraBiz stays 1, effEraBiz
      // = eraBiz * crisis.biz = ye.biz. Following years: eraBiz resets to 1
      // (no event), crisis persists, effEraBiz = crisis.biz. So `lasts: 3`
      // applies the biz hit for the trigger year + 2 more years = 3 total.
      // Single-year events (lasts undefined or 1) also go through crisis
      // for consistency — they just clear on the next Jan 1.
      if (ye.biz || ye.fac || ye.rates || ye.risk || ye.demand) {
        s.crisis = {
          cause: ye.msg.replace(/[!.]/g, '').slice(0, 60),
          biz: ye.biz || 1, fac: ye.fac || 1,
          rates: ye.rates || 1, risk: ye.risk || 0, demand: ye.demand || 1,
          yearsLeft: ye.lasts || 1,
          startYear: y,
        };
      }
      pushLog(s, `1 Jan ${y}: ${ye.msg}`);
    }
    const news = ALLNEWS[y];
    pushLog(s, `1 Jan ${y}: ${news ? news.join(' \u2022 ') : eraOf(y).name + ' continues.'}`);
  }
  // v11.2 — drain delayed shocks whose day has come. Each shock applies its
  // stock/deposit multiplier and logs a note. This runs every processDay
  // call so a shock scheduled for day X fires on the first processDay where
  // s.lastDay >= X (i.e. on the daily tick that crosses the threshold).
  if (s.shocks.length) {
    const due = s.shocks.filter(sh => sh.day <= s.lastDay);
    if (due.length) {
      for (const sh of due) {
        if (sh.stk) {
          STOCKS.forEach(x => {
            const m = sh.stk![x.id] != null ? sh.stk![x.id] : sh.stk!['*'];
            if (m) s.prices[x.id] *= m;
          });
          pushLog(s, `Shock propagates — stocks slide further.`);
        }
        if (sh.dep) {
          s.bank.dep *= sh.dep;
          pushLog(s, `Bank-run tail hits — deposits drop further.`);
        }
      }
      s.shocks = s.shocks.filter(sh => sh.day > s.lastDay);
    }
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
// v11.17 — ambient mini-events. These fire ~3% per game-day during online play
// and surface as short toast-only flavor lines (no LLM call). Small cash /
// health / spirit swings so they don't unbalance the economy. Each entry has:
//   msg    — log line (terse, internal)
//   toast  — user-facing toast line (with emoji prefix + tag)
//   cash   — optional small ± swing (kept under ±$500)
//   health — optional ± swing (kept within ±5)
//   spirit — optional ± swing (kept within ±5)
// Tag conventions: 🎉 tin vui (good), 💢 sự cố (bad), 🍵 misc (neutral flavor).
const AMBIENT_EVENTS: { msg: string; toast: string; cash?: number; health?: number; spirit?: number }[] = [
  { msg: 'Found $20 on the sidewalk.', toast: '🎉 Found $20 on the sidewalk.', cash: 20 },
  { msg: 'A colleague bought your coffee.', toast: '☕ A colleague bought your coffee.', spirit: 1 },
  { msg: 'Parking ticket.', toast: '💢 Parking ticket.', cash: -60 },
  { msg: 'Sold an old gadget online.', toast: '🎉 Sold an old gadget online.', cash: 120 },
  { msg: 'Caught a minor cold.', toast: '💢 Caught a minor cold — feeling under the weather.', cash: -40, health: -3 },
  { msg: 'A friend dropped by with food.', toast: '🍵 A friend dropped by with food.', spirit: 3 },
  { msg: 'Rebate cheque in the mail.', toast: '🎉 Rebate cheque in the mail.', cash: 80 },
  { msg: 'Lost your wallet — cancelled cards.', toast: '💢 Lost your wallet — cancelled cards.', cash: -150, spirit: -2 },
  { msg: 'Won a small office raffle.', toast: '🎉 Won a small office raffle.', cash: 90 },
  { msg: 'Bus delayed — late for a meeting.', toast: '💢 Bus delayed — late for a meeting.', spirit: -2 },
  { msg: 'A neighbour returned your borrowed tool.', toast: '🍵 A neighbour returned your borrowed tool.', spirit: 1 },
  { msg: 'Subscription you forgot about renewed.', toast: '💢 Subscription you forgot about renewed.', cash: -25 },
  { msg: 'Found a $5 in last winter\'s coat.', toast: '🎉 Found $5 in last winter\'s coat.', cash: 5, spirit: 2 },
  { msg: 'Birds woke you at dawn — restless morning.', toast: '💢 Birds woke you at dawn — restless morning.', health: -1, spirit: -1 },
  { msg: 'Free samples at the corner store.', toast: '🍵 Free samples at the corner store.', spirit: 1 },
  { msg: 'Refunded for a defective product.', toast: '🎉 Refunded for a defective product.', cash: 45 },
  { msg: 'Tip jar overflowed at your gig.', toast: '🎉 Tip jar overflowed at your gig.', cash: 35 },
  { msg: 'Wi-Fi down for an hour.', toast: '💢 Wi-Fi down for an hour.', spirit: -2 },
  { msg: 'A stranger complimented your outfit.', toast: '🍵 A stranger complimented your outfit.', spirit: 2 },
  { msg: 'Drainpipe leak — quick plumber visit.', toast: '💢 Drainpipe leak — quick plumber visit.', cash: -110 },
];
export function yearEnd(s: GameState, age: number, rng: () => number = Math.random): void {
  pushLog(s, `Happy birthday. You are now ${age}.`);
  if (age === RETIRE) { s.job = null; s.sideJob = null; pushLog(s, 'You retired. Your pension starts.'); }
  // v11.39 — career: add 1 year of experience to current job + roll firing risk.
  if (age < RETIRE) {
    addJobExperience(s, 1);
    if (rollJobFiring(s, rng)) {
      queueToast(s, '💼 You were fired — contract expired.');
    }
  }
  if (s.fame > 0) s.fame = Math.max(0, Math.round(s.fame * .92));
  // v10.5 — pets grant passive fame per year (only happy pets).
  const petFame = petFameBonus(s);
  if (petFame > 0) s.fame = s.fame + petFame;
  // v10.5 — club opportunities. Each joined club rolls for a cash or fame
  // opportunity; 2+ clubs get a synergy bonus chance. Member dues have
  // already been paid upfront at join time.
  const clubOps = rollClubOpportunities(s, rng);
  if (clubOps) { pushLog(s, `Club network: ${clubOps}`); queueToast(s, `🤝 Club network: ${clubOps}`); }
  // v11 — branch closure risk. Each branch rolls a closure chance based on
  // market mood, headcount, and manager quality.
  const closed = rollBranchClosures(s, rng);
  if (closed > 0) {
    pushLog(s, `${closed} branch(es) closed this year.`);
    queueToast(s, `⚠️ Business setback: ${closed} branch${closed > 1 ? 'es' : ''} closed this year.`);
  }
  if (rng() < .6) {
    const ev = EVENTS[Math.floor(rng() * EVENTS.length)](s, rng);
    s.money += ev.cash;
    if (ev.fame) s.fame = Math.max(0, s.fame + ev.fame);
    if (ev.dip) STOCKS.forEach(x => s.prices[x.id] *= .9);
    pushLog(s, `${ev.msg} ${ev.cash >= 0 ? '+' : '\u2212'}${fmt(Math.abs(ev.cash))}`);
    // v11.17 — surface significant EVENTS as toasts (|cash| > 5000 OR fame swing).
    // Small swings stay in the log only — toasts would be too noisy otherwise.
    if (Math.abs(ev.cash) >= 5000 || (ev.fame && Math.abs(ev.fame) >= 10)) {
      const tag = ev.cash >= 0 ? 'tin vui' : 'sự cố';
      const sign = ev.cash >= 0 ? '+' : '−';
      const amt = fmt(Math.abs(ev.cash));
      const famBit = ev.fame ? ` · fame ${ev.fame >= 0 ? '+' : ''}${ev.fame}` : '';
      queueToast(s, `${ev.cash >= 0 ? '🎉' : '💢'} ${ev.msg} (${sign}${amt}${famBit})`);
    }
  }
  // v11.3 — yearly power tick. Combines tier-promotion check (does net
  // worth cross a new threshold?) with the passive influence sources
  // (club chair / board seat / media ownership). Net worth is computed
  // here and passed in so power.ts doesn't need to import netWorth().
  // v11.4 — now uses tickPowerV11_4 which also ticks scrutiny, decays
  // alliances/rivals, and rolls for scandal events.
  // v11.5 — also ticks entity (auto-promote conglomerate + inflation).
  const nw = netWorth(s);
  const powerTick = tickPowerV11_4(s, nw, rng);
  if (powerTick.promotedTo) {
    const label = POWER_TIERS.find(r => r.tier === powerTick.promotedTo)?.label || powerTick.promotedTo;
    pushLog(s, `Power tier unlocked: ${label}. New political avenues open.`);
    queueToast(s, `🏛️ Power tier unlocked: ${label}`);
  }
  if (powerTick.influenceGained > 0) {
    pushLog(s, `Passive influence +${powerTick.influenceGained} this year (club / board / media).`);
  }
  if (powerTick.scandal) {
    pushLog(s, `Scandal! Press leaks dog you. Scrutiny +10, rivals emboldened, influence −5.`);
    queueToast(s, `📰 Scandal! Press leaks — scrutiny +10, influence −5.`);
  }
  // v11.5 — entity tick (auto-promote conglomerate + inflation erosion
  // for nation+ tiers). Net worth passed in to avoid the circular import.
  const entityTick = tickEntity(s, nw, (msg: string) => pushLog(s, msg));
  if (entityTick.promotedTo) {
    pushLog(s, `Entity tier unlocked: ${entityTick.promotedTo}.`);
    queueToast(s, `🏢 Entity tier unlocked: ${entityTick.promotedTo}`);
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
  // v11.49 — record biz branch purchase (degree path) with cost as basis.
  recordTx(s, { kind: 'buy', asset: 'branch', ref: `${b.id}#${s.biz[b.id] - 1}`, name: `${b.name} branch`, qty: 1, unit: c, amount: -c });
  return `Opened a ${b.name} in ${reg}!`;
}
// v11 — capital path: open a branch WITHOUT a degree by paying 2.5× the
// normal cost (capital reserve) and committing to a monthly manager fee.
// The branch is tagged managerHired=true so branchNet accounts for the
// manager's quality boost (random 0.8..1.2 multiplier, rolled at open).
// Requires the player to keep ≥20% of the cost as cash reserve after
// purchase (so they can't dump everything into one branch).
export const CAPITAL_PATH_MULT = 2.5;
export const CAPITAL_RESERVE_PCT = 0.20;
export const MANAGER_MONTHLY = (base: number) => Math.round(base * 0.015); // ~1.5% of base per month
export function capitalPathCost(s: GameState, b: { id: string; base: number }): number {
  return Math.round(bizCost(s, b) * CAPITAL_PATH_MULT);
}
export function openBranchCapital(s: GameState, id: string): string | null {
  const b = BIZ.find(x => x.id === id); if (!b) return null;
  const c = capitalPathCost(s, b);
  // Player must have the cost AND a 20% reserve left after paying.
  if (s.money < c + c * CAPITAL_RESERVE_PCT) return null;
  s.money -= c;
  // Manager quality: random 0.8..1.2 — stored in the branch's mood field
  // (scaled). branchNet reads mood to apply the multiplier.
  const managerQuality = 0.8 + Math.random() * 0.4;
  s.branches[b.id] = (s.branches[b.id] || []).concat([{ r: branchCount(s, b.id) % 6, mood: managerQuality, paid: c, day: s.day }]);
  s.biz[b.id] = branchCount(s, b.id);
  s.fame = s.fame + 1; // less fame than the degree path — you bought your way in
  addXp(s, 15);
  const reg = b.reg[(branchCount(s, b.id) - 1) % b.reg.length];
  pushLog(s, `Opened ${b.name} via capital path in ${reg} (manager quality ${(managerQuality * 100).toFixed(0)}%).`);
  addPost(s, `Bought my way into ${b.name} — ${reg}. The manager starts Monday.`, 1.1);
  // v11.49 — record biz branch purchase (capital path) with cost as basis.
  recordTx(s, { kind: 'buy', asset: 'branch', ref: `${b.id}#${s.biz[b.id] - 1}`, name: `${b.name} branch (capital)`, qty: 1, unit: c, amount: -c });
  return `Opened ${b.name} (capital path) in ${reg}!`;
}
// v11 — monthly closure risk per branch. Rolled in yearEnd. Based on:
//   - market mood (effEraBiz — a down era raises closure odds)
//   - headcount (more branches = more exposure)
//   - manager quality (mood < 0.9 raises odds)
//   - v11.2: active crisis risk modifier (2008 +10%, 1929 +10%, etc.)
// Returns the number of branches that closed this roll.
export function rollBranchClosures(s: GameState, rng: () => number = Math.random): number {
  let closed = 0;
  // v11.2 — effEraBiz captures crisis.biz (vs old s.eraBiz); effRisk is the
  // additive closure modifier the crisis carries (1929: 0.10, 2008: 0.10).
  const eb = effEraBiz(s);
  const crisisRisk = effRisk(s);
  for (const bizId of Object.keys(s.branches)) {
    const list = s.branches[bizId];
    const kept: Branch[] = [];
    for (const br of list) {
      // Base closure chance 4%/year, modified by:
      //   manager quality (mood < 0.9 → +6%, mood > 1.05 → −2%)
      //   era downturn (effEraBiz < 0.9 → +8%)
      //   v11.2 crisis.risk (additive, e.g. +10%)
      //   branch count > 5 (+1% each)
      let chance = 0.04 + crisisRisk;
      if (br.mood < 0.9) chance += 0.06;
      if (br.mood > 1.05) chance -= 0.02;
      if (eb < 0.9) chance += 0.08;
      const count = list.length;
      if (count > 5) chance += 0.01 * (count - 5);
      chance = Math.max(0.01, Math.min(0.5, chance));
      if (rng() < chance) {
        closed++;
        pushLog(s, `${BIZ.find(x => x.id === bizId)?.name || bizId} branch closed (market + management risk).`);
      } else {
        kept.push(br);
      }
    }
    s.branches[bizId] = kept;
    s.biz[bizId] = kept.length;
    if (kept.length === 0) {
      delete s.branches[bizId];
      delete s.biz[bizId];
    }
  }
  if (closed > 0) addPost(s, `Tough quarter — ${closed} branch(es) closed. The market does not wait.`, 0.8);
  return closed;
}

// v11.37 — FRANCHISE: convert an existing branch into a franchised outlet.
// The player receives an upfront franchise fee (cash injection) but the
// branch's income is reduced by a royalty rate (8-12%) paid to the franchisee.
// This is a capital-raise mechanism: trade long-term income for immediate cash.
// Only works on branches the player owns (not capital-path manager branches).
export const FRANCHISE_FEE_MULT = 0.8;   // upfront fee = branch paid × 0.8
export const FRANCHISE_ROYALTY = 0.10;   // 10% income reduction post-franchise
export function franchiseBranch(s: GameState, bizId: string, branchIdx: number): string | null {
  const list = s.branches[bizId];
  if (!list || branchIdx < 0 || branchIdx >= list.length) return null;
  const br = list[branchIdx];
  if (br.franchised) return null; // already franchised
  const fee = Math.round(br.paid * FRANCHISE_FEE_MULT);
  br.franchised = true;
  s.money += fee;
  s.fame += 1;
  addXp(s, 10);
  const b = BIZ.find(x => x.id === bizId);
  pushLog(s, `Franchised ${b?.name || bizId} outlet — received $${fee.toLocaleString()} upfront, royalty ${FRANCHISE_ROYALTY * 100}% ongoing.`);
  addPost(s, `Franchised a ${b?.name || 'business'} outlet — cash boost of $${fee.toLocaleString()}!`, 1.1);
  // v11.49 — record franchise fee as income (cash injection from franchisee).
  recordTx(s, { kind: 'income', asset: 'branch', ref: `${bizId}#${branchIdx}`, name: `Franchise fee: ${b?.name || bizId}`, qty: 1, unit: fee, amount: fee });
  return `Franchised! +$${fee.toLocaleString()} upfront (royalty ${FRANCHISE_ROYALTY * 100}% ongoing).`;
}

// v11.50 — brand customization for a biz chain. Player must own ≥1 branch of
// the biz to set the brand. Name is clamped to 24 chars; logo is a single
// emoji (clamped to 4 code-point chars to allow skin-tone modifiers etc.).
// Setting a brand updates how the biz appears in BizTab + branch chips + any
// social hype posts referencing the chain. Returns a toast message.
export function setBizBrand(s: GameState, bizId: string, name: string, logo: string): string | null {
  const b = BIZ.find(x => x.id === bizId);
  if (!b) return null;
  if (branchCount(s, bizId) <= 0) return null; // must own ≥1 branch
  const trimmedName = name.trim().slice(0, 24) || b.name;
  const trimmedLogo = (Array.from(logo.trim())[0] || '').slice(0, 4) || '';
  s.brands = s.brands || {};
  s.brands[bizId] = { name: trimmedName, logo: trimmedLogo };
  pushLog(s, `Rebranded ${b.name} → ${trimmedLogo} ${trimmedName}.`);
  return `Brand set: ${trimmedLogo} ${trimmedName}`;
}

// v11.50 — read helper for the brand display. Returns the brand or falls back
// to the biz's default name + an emoji derived from its art id.
export function bizBrandOf(s: GameState, bizId: string): { name: string; logo: string } {
  const b = BIZ.find(x => x.id === bizId);
  const brand = s.brands?.[bizId];
  if (brand) return brand;
  // Fall back to default biz name + a sensible emoji from the art id.
  const fallbackEmojis: Record<string, string> = {
    'cafe': '☕', 'shop': '🛍️', 'farm': '🌾', 'factory': '🏭', 'tech': '💻',
    'hotel': '🏨', 'studio': '🎬', 'retail': '🛒', 'bank': '🏦', 'restaurant': '🍽️',
  };
  return { name: b?.name || bizId, logo: fallbackEmojis[bizId] || '🏢' };
}

// v11.37 — NEGOTIATE SELL: sell a business branch to an NPC buyer at a
// negotiated price. The buyer makes an initial offer (70-100% of paid value);
// the player can accept, or push for a higher price (risk: buyer walks 25%).
// Returns the offer; the player accepts via acceptBizOffer().
export interface BizOffer { bizId: string; branchIdx: number; offer: number; buyerName: string; pushed: boolean }
const BIZ_BUYERS = ['a private equity firm', 'a competitor chain', 'a family office', 'a sovereign fund', 'a strategic investor', 'a local entrepreneur'];
export function negotiateBizSell(s: GameState, bizId: string, branchIdx: number): BizOffer | null {
  const list = s.branches[bizId];
  if (!list || branchIdx < 0 || branchIdx >= list.length) return null;
  const br = list[branchIdx];
  // Initial offer: 70-100% of paid value (market variance)
  const pct = 0.70 + Math.random() * 0.30;
  const offer = Math.round(br.paid * pct);
  const buyerName = BIZ_BUYERS[Math.floor(Math.random() * BIZ_BUYERS.length)];
  return { bizId, branchIdx, offer, buyerName, pushed: false };
}
export function pushBizOffer(s: GameState, offer: BizOffer): BizOffer | null {
  if (offer.pushed) return offer; // can only push once
  // 75% chance the buyer accepts a 10-20% higher counter; 25% they walk
  // (offer drops to 0 = deal dead). The risk/reward of negotiation.
  if (Math.random() < 0.75) {
    const bump = 1.10 + Math.random() * 0.10;
    return { ...offer, offer: Math.round(offer.offer * bump), pushed: true };
  }
  return { ...offer, offer: 0, pushed: true }; // buyer walked
}
export function acceptBizOffer(s: GameState, offer: BizOffer): string | null {
  if (offer.offer <= 0) return null; // deal dead
  const list = s.branches[offer.bizId];
  if (!list || offer.branchIdx < 0 || offer.branchIdx >= list.length) return null;
  const br = list[offer.branchIdx];
  const costBasis = br.paid; // original purchase price = realized P&L baseline
  s.money += offer.offer;
  // Remove the branch
  list.splice(offer.branchIdx, 1);
  s.biz[offer.bizId] = list.length;
  if (list.length === 0) { delete s.branches[offer.bizId]; delete s.biz[offer.bizId]; }
  s.fame += 2;
  addXp(s, 20);
  const b = BIZ.find(x => x.id === offer.bizId);
  pushLog(s, `Sold ${b?.name || offer.bizId} outlet to ${offer.buyerName} for $${offer.offer.toLocaleString()}.`);
  addPost(s, `Closed a deal — sold a ${b?.name || 'business'} outlet for $${offer.offer.toLocaleString()}.`, 1.2);
  // v11.49 — record biz sale with realized P&L (sale price − original paid).
  const pnl = offer.offer - costBasis;
  recordTx(s, { kind: 'sell', asset: 'biz_sell', ref: offer.bizId, name: `Sold ${b?.name || offer.bizId}`, qty: 1, unit: offer.offer, amount: offer.offer, realizedPnL: pnl });
  return `Sold for $${offer.offer.toLocaleString()}!`;
}

// ---------------------------------------------------------------- v11.39 — admin game control
// Server-side wrappers the /api/admin/game route calls to let the operator
// directly manipulate a player's GameState. Each function takes the state
// (already loaded from localStorage on the client, or reconstructed from a
// save snapshot on the server) and mutates it in place. Returns a toast msg.
export function adminGrantItem(s: GameState, itemId: string): string | null {
  const it = (ITEM_BY as Record<string, { name: string; price: number }>)[itemId];
  if (!it) return null;
  s.lots.push({ id: itemId, paid: it.price, day: s.day, condition: 100, condDay: s.day, repaired: 0 });
  pushLog(s, `Admin granted: ${it.name}.`);
  return `✅ Granted ${it.name}`;
}
export function adminSetMoney(s: GameState, amount: number): string {
  s.money = Math.max(-1e12, Math.min(1e15, Number(amount) || 0));
  return `✅ Money set to $${s.money.toLocaleString()}`;
}
export function adminSetFame(s: GameState, amount: number): string {
  s.fame = Math.max(0, Math.min(1e6, Math.round(Number(amount) || 0)));
  return `✅ Fame set to ${s.fame}`;
}
export function adminSetHealth(s: GameState, amount: number): string {
  s.health = Math.max(0, Math.min(100, Number(amount) || 0));
  return `✅ Health set to ${Math.round(s.health)}`;
}
export function adminSetSpirit(s: GameState, amount: number): string {
  s.spirit = Math.max(0, Math.min(100, Number(amount) || 0));
  return `✅ Spirit set to ${Math.round(s.spirit)}`;
}
export function adminSetLevel(s: GameState, lvl: number): string {
  s.level = Math.max(1, Math.min(999, Math.round(Number(lvl) || 1)));
  s.xp = 0;
  return `✅ Level set to ${s.level}`;
}
export function adminTriggerElection(s: GameState): string {
  // Force the election flag — the next yearEnd tick will run the election
  // if the player has national_power tier + influence ≥ 80.
  s.power = s.power || freshPower();
  s.power.electionPending = true;
  pushLog(s, 'Admin triggered an election cycle.');
  return '✅ Election triggered (resolves at next year-end if eligible)';
}
export function adminAdvanceTime(s: GameState, days: number): string {
  const d = Math.max(0, Math.min(3650, Math.round(Number(days) || 0)));
  s.lastDay += d;
  s.day += d;
  pushLog(s, `Admin advanced time by ${d} days.`);
  return `✅ Advanced ${d} days`;
}

// ---------------------------------------------------------------- v14 — admin banking / business / gigs control
// Per-action mutators the new admin dashboard tabs (🏦 Ngân hàng / 🏢 Kinh
// doanh / ⚡ Việc nhanh) drive via /api/admin/game. Each takes the GameState
// already loaded by the client polling loop (the API itself only writes an
// ADMIN_ACTION row; the client picks it up and calls applyAdminActions).
// Returns a toast string. Defensive on inputs (NaN / out-of-range / unknown
// ids → returns a clear "skipped" message rather than throwing).
export function adminSetSavings(s: GameState, amount: number): string {
  const a = Math.max(-1e12, Math.min(1e15, Number(amount) || 0));
  s.bank = s.bank || { dep: 0, loan: 0 };
  s.bank.dep = a;
  pushLog(s, `Admin set savings to $${a.toLocaleString()}.`);
  return `✅ Savings set to $${a.toLocaleString()}`;
}
export function adminSetLoan(s: GameState, amount: number): string {
  const a = Math.max(0, Math.min(1e15, Number(amount) || 0));
  s.bank = s.bank || { dep: 0, loan: 0 };
  s.bank.loan = a;
  pushLog(s, `Admin set loan to $${a.toLocaleString()}.`);
  return `✅ Loan set to $${a.toLocaleString()}`;
}
export function adminAdjustLoan(s: GameState, delta: number): string {
  const d = Number(delta) || 0;
  s.bank = s.bank || { dep: 0, loan: 0 };
  s.bank.loan = Math.max(0, s.bank.loan + d);
  pushLog(s, `Admin adjusted loan by ${d >= 0 ? '+' : ''}$${d.toLocaleString()} → $${s.bank.loan.toLocaleString()}.`);
  return `✅ Loan ${d >= 0 ? '+' : ''}${d.toLocaleString()} → $${s.bank.loan.toLocaleString()}`;
}
// v14 — grant N branches of a biz, bypassing the degree requirement + cost.
// Each new branch is tagged paid = bizCost at the time of grant (so net worth
// + resale value still work), day = s.day, mood = 1 (full health). Splits the
// region list across the granted count so each branch lands in a different
// region (mirrors openBranch's behaviour).
export function adminGrantBranch(s: GameState, bizId: string, count: number): string {
  const b = BIZ.find(x => x.id === bizId);
  if (!b) return `⚠️ Unknown business: ${bizId}`;
  const n = Math.max(1, Math.min(50, Math.round(Number(count) || 1)));
  const list = s.branches[bizId] || [];
  const c = bizCost(s, b);
  for (let i = 0; i < n; i++) {
    const idx = list.length;
    list.push({ r: idx % 6, mood: 1, paid: c, day: s.day });
  }
  s.branches[bizId] = list;
  s.biz[bizId] = list.length;
  pushLog(s, `Admin granted ${n} × ${b.name} branch(es).`);
  return `✅ Granted ${n} × ${b.name}`;
}
export function adminRemoveBranch(s: GameState, bizId: string, count: number): string {
  const b = BIZ.find(x => x.id === bizId);
  if (!b) return `⚠️ Unknown business: ${bizId}`;
  const list = s.branches[bizId] || [];
  const n = Math.max(1, Math.min(list.length, Math.round(Number(count) || 1)));
  if (n === 0) return `ℹ️ No branches to remove`;
  // v14 — splice from the end (LIFO) so the oldest branches survive; this
  // keeps region numbering stable for any UI that shows branches in order.
  list.splice(list.length - n, n);
  if (list.length === 0) {
    delete s.branches[bizId];
    delete s.biz[bizId];
  } else {
    s.branches[bizId] = list;
    s.biz[bizId] = list.length;
  }
  pushLog(s, `Admin removed ${n} × ${b.name} branch(es).`);
  return `✅ Removed ${n} × ${b.name}`;
}
export function adminSetBizMood(s: GameState, bizId: string, mood: number): string {
  const b = BIZ.find(x => x.id === bizId);
  if (!b) return `⚠️ Unknown business: ${bizId}`;
  const m = Math.max(0.5, Math.min(1.5, Number(mood) || 1));
  const list = s.branches[bizId];
  if (!list || !list.length) return `ℹ️ No branches of ${b.name}`;
  for (const br of list) br.mood = m;
  pushLog(s, `Admin set ${b.name} branch mood → ${m}.`);
  return `✅ ${b.name} mood = ${m}`;
}
export function adminFranchiseAll(s: GameState, bizId: string): string {
  const b = BIZ.find(x => x.id === bizId);
  if (!b) return `⚠️ Unknown business: ${bizId}`;
  const list = s.branches[bizId];
  if (!list || !list.length) return `ℹ️ No branches of ${b.name}`;
  let count = 0;
  let fee = 0;
  for (const br of list) {
    if (br.franchised) continue;
    br.franchised = true;
    const f = Math.round(br.paid * FRANCHISE_FEE_MULT);
    s.money += f;
    s.fame += 1;
    fee += f;
    count++;
  }
  if (count === 0) return `ℹ️ All ${b.name} branches already franchised`;
  addXp(s, count * 10);
  pushLog(s, `Admin franchised ${count} × ${b.name} branch(es) — +$${fee.toLocaleString()} upfront.`);
  addPost(s, `Franchised ${count} × ${b.name} outlet(s) — cash boost of $${fee.toLocaleString()}!`, 1.1);
  recordTx(s, { kind: 'income', asset: 'branch', ref: bizId, name: `Franchise fee: ${b.name} × ${count}`, qty: count, unit: Math.round(fee / count), amount: fee });
  return `✅ Franchised ${count} × ${b.name} (+$${fee.toLocaleString()})`;
}
// v14 — gig pay / cd overrides stored on GameState (not the GIGS table —
// that's a build-time constant). The override map persists across save/load
// + reincarnation (fresh() resets it to {}). Passing undefined / NaN /
// negative resets that field back to the GIGS default.
export function adminSetGigPay(s: GameState, gigId: string, basePay: number): string {
  const g = GIGS.find(x => x.id === gigId);
  if (!g) return `⚠️ Unknown gig: ${gigId}`;
  s.gigOverrides = s.gigOverrides || {};
  const ov = s.gigOverrides[gigId] || {};
  const bp = Number(basePay);
  if (!Number.isFinite(bp) || bp < 0) {
    delete ov.base;
  } else {
    ov.base = Math.max(0, Math.min(1e9, Math.round(bp)));
  }
  if (Object.keys(ov).length) s.gigOverrides[gigId] = ov;
  else delete s.gigOverrides[gigId];
  pushLog(s, `Admin set gig pay [${gigId}] → ${ov.base != null ? ov.base : 'default'}.`);
  return `✅ ${gigId} base pay → ${ov.base != null ? '$' + ov.base.toLocaleString() : 'default'}`;
}
export function adminSetGigCd(s: GameState, gigId: string, cd: number): string {
  const g = GIGS.find(x => x.id === gigId);
  if (!g) return `⚠️ Unknown gig: ${gigId}`;
  s.gigOverrides = s.gigOverrides || {};
  const ov = s.gigOverrides[gigId] || {};
  const c = Number(cd);
  if (!Number.isFinite(c) || c < 0) {
    delete ov.cd;
  } else {
    ov.cd = Math.max(0, Math.min(365, Math.round(c)));
  }
  if (Object.keys(ov).length) s.gigOverrides[gigId] = ov;
  else delete s.gigOverrides[gigId];
  pushLog(s, `Admin set gig cd [${gigId}] → ${ov.cd != null ? ov.cd : 'default'}.`);
  return `✅ ${gigId} cooldown → ${ov.cd != null ? ov.cd + 'd' : 'default'}`;
}
export function adminResetGigs(s: GameState): string {
  s.gigOverrides = {};
  pushLog(s, 'Admin reset all gig overrides to defaults.');
  return '✅ Gig overrides cleared';
}

// v14.1 — admin stock management. createStock pushes a brand-new ticker into
// s.customStocks (refuses to clobber an existing built-in or custom id).
// editStock either patches a customStock entry directly OR writes an override
// for a built-in ticker. deleteStock removes a custom stock (built-ins are
// protected) and refunds the player's holdings at the current price. resetStocks
// wipes overrides + customs (refunding any custom-stock holdings) and reseeds
// the built-in prices back to the STOCKS defaults. All four are broadcast
// actions (no per-uid targeting) so every player sees the same market.
export function adminCreateStock(s: GameState, stock: { id: string; name: string; p: number; vol: number; art: string }): string {
  const id = String(stock.id || '').trim().toUpperCase();
  // 1-16 chars, starts with a letter, alphanumeric + underscore/hyphen only —
  // keeps ticker ids readable + safe for use as React keys + object keys.
  if (!/^[A-Z][A-Z0-9_-]{0,15}$/.test(id)) return '⚠️ Bad stock id (1–16 chars, starts with a letter, A-Z/0-9/_/-)';
  if (STOCKS.some(x => x.id === id) || (s.customStocks || []).some(x => x.id === id)) {
    return `⚠️ Stock id already exists: ${id}`;
  }
  const name = String(stock.name || '').trim().slice(0, 60);
  if (!name) return '⚠️ Stock name required';
  const pNum = Number(stock.p);
  if (!Number.isFinite(pNum) || pNum <= 0) return '⚠️ Price must be > 0';
  const p = Math.max(1, Math.min(1e9, pNum));
  const vNum = Number(stock.vol);
  const vol = Number.isFinite(vNum) && vNum >= 0 ? Math.max(0, Math.min(1, vNum)) : 0.02;
  const art = String(stock.art || 's-tech').trim().slice(0, 30) || 's-tech';
  const def: StockDef = { id, name, p, vol, art };
  registerStock(s, def);
  // Seed price + history so the new ticker shows up immediately in the UI
  // and the daily random-walk loop picks it up next tick.
  if (s.prices[id] == null) { s.prices[id] = p; s.hist[id] = [p]; }
  pushLog(s, `Admin created stock ${id} (${name}) @ ${fmt(p)} vol ${(vol * 100).toFixed(1)}%`);
  return `✅ Created stock ${id} (${name})`;
}
export function adminEditStock(s: GameState, id: string, patch: { p?: number; vol?: number; name?: string; art?: string }): string {
  const sid = String(id || '').trim().toUpperCase();
  if (!sid) return '⚠️ Stock id required';
  const builtIn = STOCKS.find(x => x.id === sid);
  const custom = (s.customStocks || []).find(x => x.id === sid);
  if (!builtIn && !custom) return `⚠️ Unknown stock id: ${sid}`;
  // Normalise the patch fields. Missing / NaN fields are skipped (the caller
  // can send a partial patch). Empty strings are treated as missing for the
  // name + art fields so the admin can't accidentally blank out a stock.
  const name = patch.name != null ? String(patch.name).trim().slice(0, 60) : '';
  const pNum = patch.p != null ? Number(patch.p) : NaN;
  const vNum = patch.vol != null ? Number(patch.vol) : NaN;
  const art = patch.art != null ? String(patch.art).trim().slice(0, 30) : '';
  if (custom) {
    // Directly mutate the customStocks entry — these are mutable by design.
    if (name) custom.name = name;
    if (Number.isFinite(pNum) && pNum > 0) {
      custom.p = Math.max(1, Math.min(1e9, pNum));
      // Re-seed price + history so the new base takes effect immediately
      // (otherwise the mean-reversion formula would yank the price back
      // toward the old base for days).
      s.prices[sid] = custom.p;
      s.hist[sid] = [custom.p];
    }
    if (Number.isFinite(vNum) && vNum >= 0) custom.vol = Math.max(0, Math.min(1, vNum));
    if (art) custom.art = art;
    pushLog(s, `Admin edited custom stock ${sid}.`);
    return `✅ Edited custom stock ${sid}`;
  }
  // Built-in stock → write an override patch.
  s.stockOverrides = s.stockOverrides || {};
  const ov = s.stockOverrides[sid] || {};
  let hasChange = false;
  if (name) { ov.name = name; hasChange = true; }
  if (Number.isFinite(pNum) && pNum > 0) {
    ov.p = Math.max(1, Math.min(1e9, pNum));
    // Apply the new base price immediately (the random walk continues from
    // here). Player holdings keep their qty; the new base only sets the
    // mean-reversion anchor + the clamp band.
    s.prices[sid] = ov.p;
    s.hist[sid] = [ov.p];
    hasChange = true;
  }
  if (Number.isFinite(vNum) && vNum >= 0) { ov.vol = Math.max(0, Math.min(1, vNum)); hasChange = true; }
  if (art) { ov.art = art; hasChange = true; }
  if (!hasChange) return `ℹ️ No changes for ${sid}`;
  s.stockOverrides[sid] = ov;
  pushLog(s, `Admin edited stock ${sid} (override: ${Object.keys(ov).join(', ')}).`);
  return `✅ Edited stock ${sid}`;
}
export function adminDeleteStock(s: GameState, id: string): string {
  const sid = String(id || '').trim().toUpperCase();
  if (!sid) return '⚠️ Stock id required';
  if (STOCKS.some(x => x.id === sid)) return `⚠️ Cannot delete built-in stock: ${sid}`;
  const before = (s.customStocks || []).length;
  s.customStocks = (s.customStocks || []).filter(x => x.id !== sid);
  if (s.customStocks.length === before) return `⚠️ No custom stock with id: ${sid}`;
  // Refund the player's holdings at the current price so deletion doesn't
  // silently wipe their stake. Built-in stocks can't be deleted, so this
  // only ever runs on custom tickers the admin created.
  const held = s.stk[sid] || 0;
  let refund = 0;
  if (held > 0) {
    const price = s.prices[sid] || 0;
    refund = held * price;
    s.money += refund;
    recordTx(s, { kind: 'sell', asset: 'stock', ref: sid, name: `Deleted stock ${sid}`, qty: held, unit: price, amount: refund, realizedPnL: refund - (s.costBasis[sid] || 0) });
  }
  delete s.stk[sid];
  delete s.costBasis[sid];
  delete s.prices[sid];
  delete s.hist[sid];
  // Clean up any stale override for the same id (defensive — a built-in
  // override couldn't have applied since this was a custom stock, but a
  // corrupted save could carry a stray entry).
  if (s.stockOverrides) delete s.stockOverrides[sid];
  pushLog(s, `Admin deleted custom stock ${sid}${held > 0 ? ` (refunded ${fmt(refund)} for ${held} shares)` : ''}.`);
  return held > 0
    ? `✅ Deleted ${sid} (refunded ${fmt(refund)} for ${held} shares)`
    : `✅ Deleted custom stock ${sid}`;
}
export function adminResetStocks(s: GameState): string {
  let refund = 0;
  // Refund any holdings in custom stocks before wiping (the player bought
  // those shares with real cash; wiping them silently would be a bug).
  for (const c of s.customStocks || []) {
    const held = s.stk[c.id] || 0;
    if (held > 0) {
      const proceeds = held * (s.prices[c.id] || c.p);
      refund += proceeds;
      recordTx(s, { kind: 'sell', asset: 'stock', ref: c.id, name: `Reset stock ${c.id}`, qty: held, unit: s.prices[c.id] || c.p, amount: proceeds, realizedPnL: proceeds - (s.costBasis[c.id] || 0) });
    }
    delete s.stk[c.id];
    delete s.costBasis[c.id];
    delete s.prices[c.id];
    delete s.hist[c.id];
  }
  if (refund > 0) s.money += refund;
  s.stockOverrides = {};
  s.customStocks = [];
  // Re-apply built-in stock defaults so a price that drifted under an
  // override snaps back to the seed value immediately. Without this, an
  // overridden TECH at $500 with the override cleared would keep trading
  // at $500 (drifted) instead of snapping back to the $230 seed.
  STOCKS.forEach(x => { s.prices[x.id] = x.p; s.hist[x.id] = [x.p]; });
  pushLog(s, `Admin reset all stocks${refund > 0 ? ` (refunded ${fmt(refund)})` : ''}.`);
  return refund > 0 ? `✅ Reset all stocks (refunded ${fmt(refund)})` : '✅ Reset all stocks';
}

// v14 — the dispatcher. Given a list of { action, uid, ... } action records
// (each one mirrors a row the admin API wrote as an ADMIN_ACTION message),
// apply each to the GameState and return the corresponding toast per action.
// Unknown actions produce a "skipped" message rather than throwing, so a
// malformed action never breaks the rest of the batch. The `uid` field is
// matched against s.uid; an action targeting a different uid is silently
// skipped (the polling client only fetches its own actions, but this guards
// against a misrouted message).
export interface AdminAction {
  action: string;
  uid?: string;
  [key: string]: unknown;
}
export function applyAdminActions(s: GameState, actions: AdminAction[]): string[] {
  const out: string[] = [];
  for (const a of actions) {
    if (!a || typeof a !== 'object') { out.push('⚠️ Skipped malformed action'); continue; }
    const act = String(a.action || '');
    // v14 — gig actions target the gig, not a player; they always apply to
    // the local state (no uid match). Same for resetGigs.
    // v14.1 — stock catalogue actions (createStock / editStock / deleteStock /
    // resetStocks) are also broadcast — every player sees the same market.
    const isGlobalGigAction = act === 'setGigPay' || act === 'setGigCd' || act === 'resetGigs'
      || act === 'createStock' || act === 'editStock' || act === 'deleteStock' || act === 'resetStocks';
    if (!isGlobalGigAction) {
      const targetUid = String(a.uid || '').trim();
      // v14 — match the target uid against this player's uid OR their HB-
      // code (saved players don't store their HB-code on GameState; the
      // server-side player row does, but the client polling doesn't have it).
      // Practically the client only fetches ADMIN_ACTION messages addressed
      // to it (filtered at the API), so an empty targetUid means "broadcast"
      // and is accepted.
      if (targetUid && s.uid && targetUid !== s.uid) {
        out.push(`⚙️ Admin: ${act} skipped (different uid)`);
        continue;
      }
    }
    switch (act) {
      case 'setMoney':       out.push(adminSetMoney(s, Number(a.amount))); break;
      case 'setFame':        out.push(adminSetFame(s, Number(a.amount))); break;
      case 'setHealth':      out.push(adminSetHealth(s, Number(a.amount))); break;
      case 'setSpirit':      out.push(adminSetSpirit(s, Number(a.amount))); break;
      case 'setLevel':       out.push(adminSetLevel(s, Number(a.level ?? a.amount))); break;
      case 'triggerElection':out.push(adminTriggerElection(s)); break;
      case 'advanceTime':    out.push(adminAdvanceTime(s, Number(a.days ?? a.amount))); break;
      case 'grantItem': {
        const r = adminGrantItem(s, String(a.itemId || ''));
        out.push(r || '⚠️ grantItem: unknown item');
        break;
      }
      case 'setSavings':     out.push(adminSetSavings(s, Number(a.amount))); break;
      case 'setLoan':        out.push(adminSetLoan(s, Number(a.amount))); break;
      case 'adjustLoan':     out.push(adminAdjustLoan(s, Number(a.delta ?? a.amount))); break;
      case 'grantBranch':    out.push(adminGrantBranch(s, String(a.bizId || ''), Number(a.count ?? 1))); break;
      case 'removeBranch':   out.push(adminRemoveBranch(s, String(a.bizId || ''), Number(a.count ?? 1))); break;
      case 'setBizMood':     out.push(adminSetBizMood(s, String(a.bizId || ''), Number(a.mood ?? 1))); break;
      case 'franchiseAll':   out.push(adminFranchiseAll(s, String(a.bizId || ''))); break;
      case 'setGigPay':      out.push(adminSetGigPay(s, String(a.gigId || ''), Number(a.basePay))); break;
      case 'setGigCd':       out.push(adminSetGigCd(s, String(a.gigId || ''), Number(a.cd))); break;
      case 'resetGigs':      out.push(adminResetGigs(s)); break;
      // v14.1 — admin stock management (broadcast).
      case 'createStock':   out.push(adminCreateStock(s, { id: String(a.id || ''), name: String(a.name || ''), p: Number(a.p ?? 100), vol: Number(a.vol ?? 0.02), art: String(a.art || 's-tech') })); break;
      case 'editStock':     out.push(adminEditStock(s, String(a.id || ''), {
        p: a.p != null ? Number(a.p) : undefined,
        vol: a.vol != null ? Number(a.vol) : undefined,
        name: a.name != null ? String(a.name) : undefined,
        art: a.art != null ? String(a.art) : undefined,
      })); break;
      case 'deleteStock':   out.push(adminDeleteStock(s, String(a.id || ''))); break;
      case 'resetStocks':   out.push(adminResetStocks(s)); break;
      default: out.push(`⚠️ Unknown admin action: ${act}`);
    }
  }
  return out;
}
export function buyFarmLine(s: GameState, id: string): string | null {
  const l = FARM_LINES.find(x => x.id === id); if (!l || s.farm[l.id]) return null;
  if (!lineReady(s, l) || s.money < l.cost) return null;
  s.money -= l.cost; s.farm[l.id] = 1; s.farmBought[l.id] = s.day;
  addXp(s, 20);
  pushLog(s, `Farm expanded: ${l.name}.`);
  recordTx(s, { kind: 'buy', asset: 'farm', ref: id, name: l.name, qty: 1, unit: l.cost, amount: -l.cost });
  return `${l.name} is now part of your farm!`;
}
export function buyFacLine(s: GameState, id: string): string | null {
  const l = FAC_LINES.find(x => x.id === id); if (!l || s.fac[l.id]) return null;
  if (!lineReady(s, l) || s.money < l.cost) return null;
  s.money -= l.cost; s.fac[l.id] = 1; s.facBought[l.id] = s.day;
  addXp(s, 20);
  pushLog(s, `Factory line: ${l.name}.`);
  recordTx(s, { kind: 'buy', asset: 'fac', ref: id, name: l.name, qty: 1, unit: l.cost, amount: -l.cost });
  return `${l.name} built!${l.food ? ' Your farm supplies it (+30%).' : ''}`;
}
export function buyItem(s: GameState, id: string): string | null {
  const it = ITEM_BY[id]; if (!it || s.money < it.price) return null;
  // v13.2 — limited-quantity items: an item with `stock: number` decrements a
  // per-item counter on purchase. Sold-out items (0 left) can't be bought.
  // v13.4 — compute serial number BEFORE decrementing: serial = original - remaining + 1.
  //   stock=10, first buy: serial = 10 - 10 + 1 = 1 → "1 of 10"
  //   stock=10, last buy:  serial = 10 - 1 + 1 = 10 → "10 of 10"
  //   stock=1, only buy:   serial = 1 - 1 + 1 = 1 → "1 of 1" (unique piece)
  let serial: number | undefined;
  let serialOf: number | undefined;
  if (typeof it.stock === 'number') {
    if (s.itemStock[id] == null) s.itemStock[id] = it.stock;
    if (s.itemStock[id] <= 0) return null;
    serial = it.stock - s.itemStock[id] + 1;
    serialOf = it.stock;
    s.itemStock[id] -= 1;
  }
  s.money -= it.price;
  // v13.4 — addLot with serial info for limited items.
  s.lots.push({ id, paid: it.price, day: s.day, condition: 100, condDay: s.day, repaired: 0, serial, serialOf });
  s.fame = s.fame + (it.lux >= 100 ? 3 : it.lux >= 30 ? 1 : 0);
  if (it.price >= 10000) addPost(s, `Just picked up a new ${it.name}${serial ? ` (#${serial}/${serialOf})` : ''}. Life is good.`, it.lux >= 100 ? 2 : 1);
  recordTx(s, { kind: 'buy', asset: 'lot', ref: id, name: it.name, qty: 1, unit: it.price, amount: -it.price });
  return 'Bought ' + it.name;
}
// v13.2 — remaining stock for an item. Returns null when the item has no
// stock cap (unlimited), otherwise the number left (it.stock when freshly
// registered, decremented after each buy). The UI uses this to show "Only X
// left!" badges and "SOLD OUT" overlays.
export function itemStockLeft(s: GameState, id: string): number | null {
  const it = ITEM_BY[id];
  if (!it || typeof it.stock !== 'number') return null;
  const cur = s.itemStock[id];
  return cur == null ? it.stock : cur;
}
export function sellLot(s: GameState, idx: number): string | null {
  const l = s.lots[idx]; if (!l) return null;
  const gross = lotValue(s, l);
  const got = gross * (1 - RESALE_FEE);
  s.money += got; s.lots.splice(idx, 1);
  const fee = gross * RESALE_FEE;
  const pnl = got - l.paid; // got already net of RESALE_FEE, do not subtract fee twice
  recordTx(s, { kind: 'sell', asset: 'lot', ref: l.id, name: ITEM_BY[l.id]?.name || 'Item', qty: 1, unit: got, amount: got, realizedPnL: pnl });
  return 'Sold for ' + fmt(got);
}
export function trade(s: GameState, id: string, action: 'buy' | 'sell', qty: number): { ok: boolean; msg: string } {
  const p = s.prices[id]; const q = Math.max(1, Math.floor(qty || 1));
  // v14.1 — look up the stock name across built-ins + overridden + custom so
  // the transaction ledger shows the right label even for admin tickers.
  const stock = stocksOf(s).find(x => x.id === id);
  const stockName = stock ? stock.name : id;
  if (action === 'buy') {
    // v13.12 — stock trade fee 0.1%: prevents free wash-trading, fee is expense (not in costBasis).
    const cost = p * q;
    const buyFee = Math.round(cost * 0.001);
    const total = cost + buyFee;
    if (s.money < total) return { ok: false, msg: `Not enough cash for ${q} share${q > 1 ? 's' : ''} (+${fmt(buyFee)} fee)` };
    s.money -= total; s.stk[id] = (s.stk[id] || 0) + q;
    // v11.49 — weighted-average cost basis: add to total $ invested.
    s.costBasis[id] = (s.costBasis[id] || 0) + cost;
    recordTx(s, { kind: 'buy', asset: 'stock', ref: id, name: stockName, qty: q, unit: p, amount: -cost });
    return { ok: true, msg: `Bought ${q} \u00d7 ${id}` };
  }
  const held = s.stk[id] || 0; if (!held) return { ok: false, msg: 'Nothing to sell' };
  const n = Math.min(q, held);
  const proceeds = p * n;
  // v13.12 — stock trade fee 0.1% on sell, net proceeds only.
  const sellFee = Math.round(proceeds * 0.001);
  const netProceeds = proceeds - sellFee;
  s.money += netProceeds; s.stk[id] = held - n;
  addXp(s, 4);
  // v11.49 — realize P&L from the proportional cost basis being sold.
  const totalBasis = s.costBasis[id] || 0;
  const avgPerShare = held > 0 ? totalBasis / held : 0;
  const soldBasis = avgPerShare * n;
  s.costBasis[id] = Math.max(0, totalBasis - soldBasis);
  const pnl = netProceeds - soldBasis;
  // v13.12 — realized stock gains count toward yIncome so they get taxed at year-end like salary/biz. Losses do not reduce yIncome.
  if (pnl > 0) s.yIncome += pnl;
  recordTx(s, { kind: 'sell', asset: 'stock', ref: id, name: stockName, qty: n, unit: p, amount: netProceeds, realizedPnL: pnl });
  return { ok: true, msg: `Sold ${n} \u00d7 ${id} for ${fmt(netProceeds)} (fee ${fmt(sellFee)})` };
}
export function joinClub(s: GameState, id: string): string | null {
  const z = CLUBS.find(q => q.id === id); if (!z) return null;
  if (s.clubs.includes(id)) return `Already a member of ${z.name}.`;
  if (netWorth(s) < z.min || s.money < z.fee) return null;
  s.money -= z.fee;
  s.clubs.push(id);
  // Active club = highest multiplier among joined (or 'own' if founded).
  recomputeActiveClub(s);
  addXp(s, 30);
  pushLog(s, `Joined ${z.name}.`);
  recordTx(s, { kind: 'expense', asset: 'bank', ref: id, name: `Join club: ${z.name}`, qty: 1, unit: z.fee, amount: -z.fee });
  return 'Welcome to the ' + z.name + '!';
}
// v10.5 — leave a club. No refund. Recomputes active.
export function leaveClub(s: GameState, id: string): string | null {
  const z = CLUBS.find(q => q.id === id); if (!z) return null;
  if (!s.clubs.includes(id)) return null;
  s.clubs = s.clubs.filter(c => c !== id);
  recomputeActiveClub(s);
  pushLog(s, `Left ${z.name}.`);
  return 'Left ' + z.name;
}
// Active club = the joined club with the highest mult. If the player owns
// a club, that wins (1.2×). If no clubs joined, s.club = null.
function recomputeActiveClub(s: GameState) {
  if (s.ownClub) { s.club = 'own'; return; }
  if (s.clubs.length === 0) { s.club = null; return; }
  let best: { id: string; mult: number } | null = null;
  for (const id of s.clubs) {
    const z = CLUBS.find(c => c.id === id);
    if (z && (!best || z.mult > best.mult)) best = { id: z.id, mult: z.mult };
  }
  s.club = best ? best.id : null;
}
// v10.5 — club opportunities. Called from yearEnd. Each club the player is
// a member of rolls a chance to bring a networking opportunity: a small
// cash boost, a fame bump, or a synergy bonus when two+ clubs pair up.
// Returns a human-readable summary appended to the year-end log.
export function rollClubOpportunities(s: GameState, rng: () => number = Math.random): string | null {
  if (s.clubs.length === 0 && !s.ownClub) return null;
  const events: string[] = [];
  let cashGain = 0;
  let fameGain = 0;
  // Per-club roll: 40% chance of a small opportunity.
  for (const id of s.clubs) {
    const z = CLUBS.find(c => c.id === id); if (!z) continue;
    if (rng() < 0.4) {
      // Scale by club mult — pricier clubs bring bigger opportunities.
      const scale = (z.mult - 1) * 5;
      if (rng() < 0.6) {
        // cash opportunity
        const gain = Math.round(z.fee * (0.2 + rng() * 0.4) * scale);
        cashGain += gain;
        events.push(`${z.name} introduced a deal (+${fmt(gain)}).`);
      } else {
        // fame opportunity
        const gain = Math.max(1, Math.round(scale * (0.5 + rng())));
        fameGain += gain;
        events.push(`${z.name} brought press (+${gain} fame).`);
      }
    }
  }
  // Synergy bonus: 2+ clubs = 15% chance of a synergy windfall.
  if (s.clubs.length >= 2 && rng() < 0.15) {
    const syn = Math.round(cashGain * 0.5 + s.clubs.length * 10000);
    cashGain += syn;
    events.push(`${s.clubs.length}-club network synergy (+${fmt(syn)}).`);
  }
  if (cashGain > 0) s.money += cashGain;
  if (fameGain > 0) s.fame = s.fame + fameGain;
  return events.length ? events.join(' ') : null;
}
export function foundClub(s: GameState, name: string): string | null {
  if (netWorth(s) < FOUND_MIN_NW || s.money < FOUND_COST) return null;
  s.money -= FOUND_COST; s.club = 'own'; s.ownClub = (name || s.name + '\u2019s circle').slice(0, 30);
  addXp(s, 60);
  pushLog(s, `Founded your own club: ${s.ownClub}.`);
  addPost(s, `Proud to announce ${s.ownClub} — a circle for people who build things.`, 1.5);
  recordTx(s, { kind: 'expense', asset: 'bank', ref: 'found_club', name: `Found club: ${s.ownClub}`, qty: 1, unit: FOUND_COST, amount: -FOUND_COST });
  return `${s.ownClub} is founded!`;
}
export function hire(s: GameState, id: string): string | null {
  const j = JOBS.find(q => q.id === id); if (!j) return null;
  if (s.job === j.id) { s.job = null; pushLog(s, `Quit ${j.name}.`); return 'You quit ' + j.name; }
  if (s.sideJob === j.id) { s.sideJob = null; pushLog(s, `Quit ${j.name}.`); return 'You quit ' + j.name; }
  const current = jobsOf(s).find(job => job.ft === j.ft);
  if (current) return `Quit ${current.name} first to change this work slot.`;
  const key = j.ft ? 'job' : 'sideJob';
  s[key] = j.id;
  // v11.39 — start a 1-year contract for full-time jobs + init experience.
  if (j.ft) s.jobContractEnd = s.day + 365;
  s.jobExp = s.jobExp || {};
  if (s.jobExp[id] == null) s.jobExp[id] = 0;
  pushLog(s, `Started work as ${j.name}.`);
  return 'Hired as ' + j.name + '!';
}
// v11.39 — career: negotiate a raise. Success chance based on experience in
// the current job (jobExp) + level + fame. Risk: if negotiation fails, 15%
// chance of being fired. Returns a toast message.
export function negotiateRaise(s: GameState): string {
  const job = jobOf(s);
  if (!job) return 'No active job to negotiate for.';
  const exp = s.jobExp[job.id] || 0;
  // Success chance: base 30% + 5% per 100 exp + 3% per level + 2% per 10 fame, capped 80%.
  const chance = Math.min(0.80, 0.30 + exp / 2000 + s.level * 0.03 + s.fame / 500);
  if (Math.random() < chance) {
    const raise = Math.round(job.salary * (0.08 + Math.random() * 0.12)); // 8-20% raise
    s.jobRaises++;
    pushLog(s, `Negotiated a raise at ${job.name}: +$${raise.toLocaleString()}/yr.`);
    return `✅ Raise approved! +$${raise.toLocaleString()}/yr`;
  }
  // Failed negotiation — 15% chance of being fired.
  if (Math.random() < 0.15) {
    s.job = null;
    s.jobContractEnd = 0;
    pushLog(s, `Negotiation failed — fired from ${job.name}.`);
    return `❌ Negotiation failed — you were fired from ${job.name}!`;
  }
  pushLog(s, `Raise request denied at ${job.name}. No change.`);
  return '❌ Raise denied. Try again later.';
}
// v11.39 — career: quit a job voluntarily. Clears the slot + contract.
export function quitJob(s: GameState): string {
  const job = jobOf(s);
  if (!job) return 'No active job to quit.';
  s.job = null;
  s.jobContractEnd = 0;
  pushLog(s, `Quit ${job.name} voluntarily.`);
  return `You quit ${job.name}.`;
}
// v11.39 — career: add experience to the current job (called from yearEnd).
export function addJobExperience(s: GameState, years: number): void {
  const job = jobOf(s);
  if (!job) return;
  s.jobExp = s.jobExp || {};
  s.jobExp[job.id] = (s.jobExp[job.id] || 0) + Math.round(years * 100);
}
// v11.39 — career: check if the player should be fired (contract expired +
// poor performance). Called from yearEnd. Returns true if fired.
export function rollJobFiring(s: GameState, rng: () => number = Math.random): boolean {
  const job = jobOf(s);
  if (!job) return false;
  // If contract expired, 8% base chance of being fired per year (modified by performance).
  if (s.jobContractEnd > 0 && s.day < s.jobContractEnd) return false; // still under contract
  const exp = s.jobExp[job.id] || 0;
  // More experience = safer. Low health = higher risk.
  let chance = 0.08 + (s.health < 40 ? 0.06 : 0) - Math.min(0.06, exp / 8000);
  chance = Math.max(0.02, Math.min(0.25, chance));
  if (rng() < chance) {
    s.job = null;
    s.jobContractEnd = 0;
    pushLog(s, `Fired from ${job.name} (contract expired, performance review).`);
    return true;
  }
  return false;
}
// v11.40 — travel: take a trip to a destination. Costs cash + advances game
// time by `days`; grants spirit + health + fame boosts. Cooldown per destination
// prevents spamming. Returns a toast message.
export function travel(s: GameState, destId: string): string | null {
  const dest = TRAVEL.find(d => d.id === destId);
  if (!dest) return null;
  if (dest.minLevel && s.level < dest.minLevel) return `Requires level ${dest.minLevel}`;
  if (s.money < dest.cost) return 'Not enough cash';
  if (s.travelLastDay > 0 && s.lastDay - s.travelLastDay < dest.cd) {
    const left = dest.cd - (s.lastDay - s.travelLastDay);
    return `Trip cooldown: ${left} days left`;
  }
  s.money -= dest.cost;
  s.lastDay += dest.days;
  s.day += dest.days;
  s.spirit = Math.min(100, s.spirit + dest.spirit);
  s.health = Math.min(100, s.health + dest.health);
  s.fame += dest.fame;
  s.travelLastDay = s.lastDay;
  addXp(s, dest.spirit);
  pushLog(s, `Travelled to ${dest.name} (${dest.days} days): spirit +${dest.spirit}, health +${dest.health}, fame +${dest.fame}.`);
  // v11.49 — record travel as expense (leisure outflow).
  recordTx(s, { kind: 'expense', asset: 'bank', ref: destId, name: `Travel: ${dest.name}`, qty: 1, unit: dest.cost, amount: -dest.cost });
  return `✈️ ${dest.name}: spirit +${dest.spirit}, health +${dest.health}${dest.fame ? `, fame +${dest.fame}` : ''}`;
}
export function travelReady(s: GameState, destId: string): boolean {
  const dest = TRAVEL.find(d => d.id === destId);
  if (!dest) return false;
  if (dest.minLevel && s.level < dest.minLevel) return false;
  if (s.money < dest.cost) return false;
  if (s.travelLastDay > 0 && s.lastDay - s.travelLastDay < dest.cd) return false;
  return true;
}
export function travelCooldownLeft(s: GameState, destId: string): number {
  const dest = TRAVEL.find(d => d.id === destId);
  if (!dest) return 0;
  if (s.travelLastDay === 0) return 0;
  return Math.max(0, dest.cd - (s.lastDay - s.travelLastDay));
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
  // v11.49 — record licence tuition as expense.
  recordTx(s, { kind: 'expense', asset: 'tuition', ref: id, name: `Licence: ${l.name}`, qty: 1, unit: l.cost, amount: -l.cost });
  return `Enrolled: ${l.name}${parallel ? ' (parallel course)' : ''}`;
}

// v11 — short / accelerated courses. Uses the same Study slot mechanism
// as licences but completes faster and costs less. On completion, grants
// a small XP boost + 10% tuition reduction for the matching full degree
// (handled via a 'shortCompleted' record read by tuitionOf).
export function enrollShortCourse(s: GameState, id: string): string | null {
  const c = SHORT_BY[id]; if (!c) return null;
  if (s.money < c.cost) return null;
  if ([s.study, s.sideStudy].filter(Boolean).length >= 2) return null;
  if (s.shortCompleted?.includes(id)) return `Already completed ${c.name}.`;
  s.money -= c.cost;
  const course: Study = { kind: 'lic', id: c.id, name: c.name, end: s.day + c.days, tuition: 0 };
  if (s.study) s.sideStudy = course;
  else s.study = course;
  pushLog(s, `Enrolled: ${c.name}.`);
  return `Enrolled: ${c.name}`;
}
// v11 — player-initiated drop-out. Frees a study slot immediately; the
// study's progress is lost. Costs a small spirit hit (the guilt).
export function dropStudySlot(s: GameState, slot: 'study' | 'sideStudy'): string | null {
  const study = s[slot]; if (!study) return null;
  pushLog(s, `Dropped ${study.name} (player-initiated).`);
  s[slot] = null;
  s.spirit = Math.max(0, s.spirit - 3);
  return `Dropped ${study.name}`;
}
// v11 — change an interest mid-life. Costs cash + a small spirit hit
// (life pivot). The new interest must not already be in s.ints; the old
// one is removed. Useful when the era shifts and the player wants to
// re-skill into a different field.
export function changeInterest(s: GameState, oldId: string, newId: string): string | null {
  if (!s.ints.includes(oldId)) return null;
  if (s.ints.includes(newId)) return null;
  if (s.money < 5000) return null;
  s.money -= 5000;
  s.spirit = Math.max(0, s.spirit - 5);
  s.ints = s.ints.filter(i => i !== oldId);
  s.ints.push(newId);
  // Re-analyse top field since interests changed.
  const a = analyze(s.ints, s.tals);
  s.topField = a.top;
  pushLog(s, `Pivoted interest: ${oldId} → ${newId}. Re-evaluated strongest field.`);
  return `Pivoted: ${oldId} → ${newId}`;
}
// v11.57 — loan limit helper for the BankTab UI. Returns the max borrowable
// amount + the breakdown (base NW credit + income credit − existing loan).
export function maxLoanOf(s: GameState): { total: number; base: number; incomeCredit: number; existing: number } {
  const yi = yearIncome(s);
  const incomeCredit = yi > 0 ? Math.floor(yi * 0.3) : 0;
  // v13.15 — insolvent (netWorth <= 0) gets zero credit: blocks borrowing to dodge bankruptcy.
  if (netWorth(s) <= 0) return { total: 0, base: 0, incomeCredit: 0, existing: s.bank.loan };
  const base = Math.floor(netWorth(s) * 0.5);
  const existing = s.bank.loan;
  return { total: Math.max(0, base + incomeCredit - existing), base, incomeCredit, existing };
}
export function bankOp(s: GameState, op: 'dep' | 'wd' | 'loan' | 'repay', amt: number | 'all'): string | null {
  // v11.57 — loan limit now includes income-based credit: players with a
  // job or business income can borrow more. Base = NW * 0.5, income bonus
  // = yearIncome * 0.3 (about 3 months of income as extra credit line).
  const yi = yearIncome(s);
  const incomeCredit = yi > 0 ? Math.floor(yi * 0.3) : 0;
  // v13.15 — insolvent cannot borrow: prevents infinite borrow-to-dodge-bankruptcy loop.
  const maxLoan = netWorth(s) <= 0 ? 0 : Math.max(0, Math.floor(netWorth(s) * .5 + incomeCredit - s.bank.loan));
  if (op === 'dep') {
    const a = amt === 'all' ? Math.floor(s.money) : amt;
    if (a <= 0 || s.money < a) return null;
    s.money -= a; s.bank.dep += a;
    recordTx(s, { kind: 'transfer', asset: 'bank', ref: 'dep', name: 'Deposit', qty: 1, unit: a, amount: -a });
    return 'Deposited ' + fmt(a);
  }
  if (op === 'wd') {
    const a = amt === 'all' ? Math.floor(s.bank.dep) : amt;
    if (a <= 0 || s.bank.dep < a) return null;
    s.bank.dep -= a; s.money += a;
    recordTx(s, { kind: 'transfer', asset: 'bank', ref: 'wd', name: 'Withdraw', qty: 1, unit: a, amount: a });
    return 'Withdrew ' + fmt(a);
  }
  if (op === 'loan') {
    const a = amt === 'all' ? maxLoan : Math.min(amt, maxLoan);
    if (a <= 0) return null;
    s.bank.loan += a; s.money += a;
    recordTx(s, { kind: 'transfer', asset: 'bank', ref: 'loan', name: 'Loan', qty: 1, unit: a, amount: a });
    return `Borrowed ${fmt(a)} at 6%/yr`;
  }
  const a = amt === 'all' ? Math.min(s.bank.loan, Math.floor(s.money)) : amt;
  if (a <= 0 || s.money < a) return null;
  s.money -= a; s.bank.loan = Math.max(0, s.bank.loan - a);
  recordTx(s, { kind: 'transfer', asset: 'bank', ref: 'repay', name: 'Repay loan', qty: 1, unit: a, amount: -a });
  return 'Repaid ' + fmt(a);
}
// v11.2 — market research. Player pays a fee scaled by the modern era
// (cheaper before 1990, rises slowly after) for a brief on:
//   1. The current crisis (cause, years left, rate/risk/demand hits)
//   2. A noised prediction of next year's YearEvent (if any)
// Predictions have noise:
//   - ~15% false negative (real event missed — "no event expected")
//   - ~10% false positive (no event but "rumours of a shock")
//   - True positives leak partial info (the msg + whether stocks/biz move)
// The brief is cached in s.researchBrief until the next Jan 1 (cleared by
// processDay) so the UI can keep showing it without re-paying.
export function researchCost(s: GameState): number {
  const y = worldYear(s);
  return Math.round(2000 + 500 * Math.max(0, (y - 1990) / 10));
}
export function researchMarket(s: GameState, rng: () => number = Math.random): { ok: boolean; lines: string[]; cost: number } {
  if (!s.started) return { ok: false, lines: ['Not playing yet.'], cost: 0 };
  const y = worldYear(s);
  const cost = researchCost(s);
  if (s.money < cost) return { ok: false, lines: [`Need ${fmt(cost)} for research.`], cost };
  s.money -= cost;
  s.lastResearchDay = s.lastDay;
  const lines: string[] = [];
  lines.push(`Market research — ${fmt(cost)} paid. Brief as of Jan ${y}:`);
  // 1. Active crisis
  if (s.crisis) {
    lines.push(`Active crisis: ${s.crisis.cause}. ${s.crisis.yearsLeft} year(s) left.`);
    if (s.crisis.rates > 1) lines.push(`  Loan rates ${((s.crisis.rates - 1) * 100).toFixed(0)}% above normal.`);
    else if (s.crisis.rates < 1) lines.push(`  Loan rates ${((1 - s.crisis.rates) * 100).toFixed(0)}% below normal (stimulus).`);
    if (s.crisis.risk > 0) lines.push(`  Branch closure risk +${(s.crisis.risk * 100).toFixed(0)}%.`);
    if (s.crisis.demand < 1) lines.push(`  Consumer demand ${((1 - s.crisis.demand) * 100).toFixed(0)}% below normal.`);
    else if (s.crisis.demand > 1) lines.push(`  Consumer demand ${((s.crisis.demand - 1) * 100).toFixed(0)}% above normal.`);
    if (s.crisis.biz < 1) lines.push(`  Business climate ${((1 - s.crisis.biz) * 100).toFixed(0)}% depressed.`);
    else if (s.crisis.biz > 1) lines.push(`  Business climate ${((s.crisis.biz - 1) * 100).toFixed(0)}% elevated.`);
  } else {
    lines.push('No active crisis. Markets are calm.');
  }
  // 2. Predicted next-year event (with noise)
  const ny = y + 1;
  const actual = YEAR_EVENTS[ny];
  const roll = rng();
  if (actual && roll > 0.15) {
    // True positive (~85% of the time when there is a real event)
    lines.push(`Outlook ${ny}: ${actual.msg}`);
    if (actual.stk) {
      const k = Object.keys(actual.stk)[0];
      const m = actual.stk[k];
      const dir = m < 1 ? 'down' : 'up';
      lines.push(`  Stocks (incl. ${k === '*' ? 'broad market' : k}) expected ${dir} ${Math.abs((m - 1) * 100).toFixed(0)}%.`);
    }
    if (actual.biz && actual.biz < 1) lines.push(`  Business climate likely to worsen.`);
    else if (actual.biz && actual.biz > 1) lines.push(`  Business climate likely to improve.`);
    if (actual.rates && actual.rates > 1) lines.push(`  Loan rates likely to rise.`);
    if (actual.demand && actual.demand < 1) lines.push(`  Consumer demand likely to soften.`);
    if (actual.dep) lines.push(`  Bank-deposit risk: depositors may lose ${((1 - actual.dep) * 100).toFixed(0)}%.`);
  } else if (!actual && roll < 0.10) {
    // False positive (~10% when no real event)
    lines.push(`Outlook ${ny}: rumours of a market shock — analysts split.`);
  } else if (!actual) {
    lines.push(`Outlook ${ny}: no major event expected.`);
  } else {
    // False negative (~15% missed real event)
    lines.push(`Outlook ${ny}: no major event expected.`);
  }
  s.researchBrief = lines;
  pushLog(s, `Market research: ${lines[1] || lines[0]}`);
  return { ok: true, lines, cost };
}
export function donate(s: GameState, amt: number): string | null {
  if (s.money < amt) return null;
  s.money -= amt; s.donated += amt; s.donatedThisYear = (s.donatedThisYear || 0) + amt;
  const g = amt >= 100000 ? 5 : amt >= 10000 ? 2 : 1;
  const ka = amt >= 100000 ? 8 : amt >= 10000 ? 3 : 1;
  s.fame = Math.max(0, s.fame + g);
  s.karma += ka;
  addXp(s, Math.max(2, Math.round(amt / 10000)));
  // v11.3 — charity grants influence: 1 base per $10K donated. The
  // diminishing-returns factor in addInfluence() reduces the actual
  // gain as the player accumulates more influence, so the first
  // million donated counts much more than the tenth.
  let infMsg = '';
  const baseInf = influenceFromCharity(amt);
  if (baseInf > 0) {
    const gained = addInfluence(s, baseInf, 'charity');
    infMsg = ` · influence +${gained}`;
  }
  if (amt >= 10000) addPost(s, `Gave ${fmt(amt)} to charity today. Small acts, big ripples.`, 1.3);
  pushLog(s, `Donated ${fmt(amt)} to charity. Fame +${g}, karma +${ka}${infMsg}.`);
  // v11.49 — record donation as expense (tax-deductible charity outflow).
  recordTx(s, { kind: 'expense', asset: 'donate', ref: 'charity', name: 'Charity donation', qty: 1, unit: amt, amount: -amt });
  return `Donated ${fmt(amt)} \u00b7 fame +${g}${infMsg}`;
}

// v11.5 — entity actions (declareAutonomy, declareIndependence,
// courtRecognition). Wrappers that compute net worth + influence and
// call into the empire module. Used by the React layer via act().
export function actDeclareAutonomy(s: GameState): { ok: boolean; reason?: string } {
  const nw = netWorth(s);
  const inf = s.power?.influence || 0;
  return declareAutonomy(s, nw, inf, (msg: string) => pushLog(s, msg));
}
export function actCourtRecognition(s: GameState): { ok: boolean; reason?: string } {
  const inf = s.power?.influence || 0;
  if (inf < 30) return { ok: false, reason: 'noInfluence' };
  const r = courtRecognition(s, inf, (msg: string) => pushLog(s, msg));
  if (r.ok && s.power) s.power.influence -= 30;
  return r;
}
export function actDeclareIndependence(s: GameState, constitution: Constitution, currency: string): { ok: boolean; reason?: string } {
  const nw = netWorth(s);
  const inf = s.power?.influence || 0;
  return declareIndependence(s, nw, inf, constitution, currency, (msg: string) => pushLog(s, msg));
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
export function applyAIChoice(s: GameState, idx: number, rng: () => number = Math.random): string {
  const ev = s.aiEv; if (!ev) return '';
  const c = ev.choices[idx]; if (!c) return '';
  // v10.5: risk-weighted outcome. The choice's static money/fame/decline are
  // the UPSIDE; rollRiskOutcome applies a commensurate DOWNSIDE when the dice
  // roll against the player. Cost is always paid (the player committed to it).
  if (c.cost) s.money -= c.cost;
  const risk = choiceRisk(c, Math.max(100000, netWorth(s)));
  // v12.2 — pass s.aiDifficulty so the admin-set difficulty flows through.
  const roll = rollRiskOutcome(c, risk, rng, s.aiDifficulty);
  s.money += roll.money;
  if (roll.fame) s.fame = Math.max(0, s.fame + roll.fame);
  if (roll.decline) {
    s.health = Math.max(0, s.health - roll.decline);
    s.spirit = Math.max(0, s.spirit - Math.round(roll.decline * 0.6));
  }
  // v13.14 — REMOVED v12.2 auto-donate: losing money used to grant donated +
  // fame + karma + XP + influence for free, farmable by intentionally picking
  // losing choices. A loss is now just a loss; only real donate() counts.
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
  // v11.50 — auto-post AI events to social as rumors. Skip the 1/day cooldown
  // guard (rumours spread regardless of when the player last posted) by
  // pushing directly to s.social.posts. Attach NPC reactions based on the
  // player's relationship state — friends comment supportive, rivals snark.
  const rumorText = rumorHeadline(ev.title, ev.kind);
  const reactions = generateNpcReactions(s, ev.title);
  // v12.5 — queue the post instead of pushing directly. The tick() function
  // releases one queued post per game day so multiple simultaneous events
  // don't overwrite each other (the posts array caps at 12).
  s.socialQueue = s.socialQueue || [];
  s.socialQueue.push({
    text: rumorText,
    day: s.lastDay,
    likes: Math.round(5 + (s.social.followers > 1000 ? Math.sqrt(s.social.followers) : 0)),
    reactions: reactions.length ? reactions : undefined,
  });
  if (s.socialQueue.length > 20) s.socialQueue = s.socialQueue.slice(-20); // cap queue
  if (reactions.length) {
    pushLog(s, `NPCs reacted: ${reactions.map(r => `${r.name} (${r.sentiment})`).join(' · ')}`);
  }
  s.story.used.push(ev.title); if (s.story.used.length > 24) s.story.used.shift();
  s.aiEv = null;
  return msg;
}

// v11.50 — turn an AI event title into a social-feed rumour headline. Different
// framing by event kind so the feed feels varied (luck = announcement, badluck
// = leaked news, lifestage = pivot announcement, story = vague teaser).
function rumorHeadline(title: string, kind?: AIEventKind): string {
  switch (kind) {
    case 'luck': return `📈 ${title} — sources close to the player confirm.`;
    case 'badluck': return `📉 Rumour: ${title}. Insiders are talking.`;
    case 'lifestage': return `🔄 ${title} — a new chapter begins.`;
    default: return `📰 ${title}. Word is spreading.`;
  }
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
//
// v12.2 — optional `difficulty` parameter (defaults to 'normal') scales win
// chances + failure penalties per the admin-set AI difficulty:
//   easy   → win +10% (safe 90 / med 60 / high 30), penalties ×0.5
//   normal → unchanged (safe 80 / med 50 / high 20)
//   hard   → win −10% (safe 70 / med 40 / high 10), penalties ×1.5
// applyAIChoice() passes s.aiDifficulty in so the player's setting flows
// through. Other callers can omit it to keep the legacy behaviour.
export function rollRiskOutcome(c: { cost?: number; money?: number; fame?: number; decline?: number }, risk: ChoiceRisk, rng: () => number = Math.random, difficulty: AiDifficulty = 'normal'): { money: number; fame: number; decline: number; success: boolean } {
  // v12.3 — base failure penalties kept light per user request. v12.2 then
  // applies a difficulty multiplier on top (0.5 for easy, 1.5 for hard).
  //   high failure: money -30% (was -50% pre-v12.3), decline 3 (was 5)
  //   medium failure: decline 1 (was 2)
  const winChanceBase = risk === 'safe' ? 0.8 : risk === 'medium' ? 0.5 : 0.2;
  const winChance = difficulty === 'easy' ? winChanceBase + 0.1 : difficulty === 'hard' ? winChanceBase - 0.1 : winChanceBase;
  const penMult = difficulty === 'easy' ? 0.5 : difficulty === 'hard' ? 1.5 : 1;
  const success = rng() < winChance;
  if (success) {
    // upside as advertised
    return { money: c.money || 0, fame: c.fame || 0, decline: 0, success: true };
  }
  // failure — commensurate downside (scales with risk); penalties scaled by
  // the difficulty multiplier (rounded to keep the legacy integer shape).
  if (risk === 'safe') {
    // safe failure: small partial upside (80/20 means even the 20% case isn't terrible).
    // Hard mode shrinks the consolation prize; easy mode widens it.
    return { money: Math.round((c.money || 0) * 0.3 * penMult), fame: 0, decline: 0, success: false };
  }
  if (risk === 'medium') {
    // medium failure: zero upside, small decline (rounded; min 1 when hard)
    const dec = Math.max(1, Math.round(1 * penMult));
    return { money: 0, fame: c.fame ? -Math.round(Math.abs(c.fame) * penMult) : 0, decline: dec, success: false };
  }
  // high failure: negative money (reduced from -50% to -30% in v12.3), decline 3 (was 5).
  // Easy halves the loss + decline; hard bumps them ~50%.
  const moneyPen = c.money ? -Math.round(Math.abs(c.money) * 0.3 * penMult) : (c.cost ? -Math.round(c.cost * 0.1 * penMult) : 0);
  const baseDecline = c.decline ? Math.min(c.decline, 3) : 3;
  return {
    money: moneyPen,
    fame: c.fame ? -Math.round(Math.abs(c.fame) * penMult) : 0,
    decline: Math.max(1, Math.round(baseDecline * penMult)),
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
// ---------- v11.28: timed marketplace — auction house + sale listings ----------
// Replaces the v10.5 instant auction. Listing an item now TAKES TIME:
//   • AUCTION  (4-7 game days): bids roll in one by one; the hammer can land
//     above the ask (bidding war) or the item finds no buyer at all. 3%
//     upfront fee, lost when nothing sells. High-risk, high-reward, fast.
//   • LISTING  (8-12 game days): one buyer either meets the fixed ask or
//     doesn't. 1.5% upfront fee. Slower but steadier — and rarer items draw
//     more watchers, so the odds scale with rarity and window length.
// The sell chance shown in the UI is the exact chance of >=1 buyer over the
// window: 1 - (1-p)^days, p = P_BID[rarity] x kind factor. resolveMarket()
// rolls one rng per game-day at resolution, so the odds match the sim.
export const AUCTION_DAYS: [number, number] = [4, 7];
export const LISTING_DAYS: [number, number] = [8, 12];
export const AUCTION_FEE = 0.03;   // % of ask, paid upfront
export const LISTING_FEE = 0.015;  // % of ask, paid upfront
// Per-day chance an interested buyer shows up, by rarity. Auctions draw more
// eyes (a live event); listings rely on passive browsing (x0.75).
// v13.2 — mythic added. Ultra-limited pieces draw huge interest (0.35),
// higher than legendary, since their scarcity guarantees a queue of buyers.
const P_BID: Record<Rarity, number> = { legendary: .22, rare: .19, uncommon: .15, common: .11, mythic: .35 };
export const sellChanceOf = (rarity: Rarity, kind: 'auction' | 'listing', days: number) =>
  1 - Math.pow(1 - P_BID[rarity] * (kind === 'auction' ? 1 : 0.75), days);

function mktView(item: MarketItem): { name: string; brand?: string; c: string; art: string; rarity: Rarity } {
  if ('src' in item) {
    const it = ITEM_BY[item.id];
    return { name: it ? it.name : item.id, brand: it?.brand, c: it ? it.c : '#888', art: it ? it.art : 'ic-bag', rarity: it ? itemRarity(it) : 'common' };
  }
  return { name: item.name, brand: item.brand, c: item.c, art: item.art, rarity: itemRarity(item) };
}
function mktImg(item: MarketItem): string | undefined {
  if ('src' in item) return ITEM_IMAGES[item.id];
  return USED_IMAGES[item.id];
}
// Put an owned item up for AUCTION. The item is removed from the inventory
// for the duration (it "lives at the auction house"); the upfront fee is
// charged immediately. Resolution happens on tick via resolveMarket().
export function putUpAuction(s: GameState, src: 'lot' | 'used', idx: number, t?: T, rng: () => number = Math.random): string | null {
  return listForMarket(s, src, idx, 'auction', t, rng);
}
// Post an owned item as a fixed-price SALE LISTING (replaces the old
// social-feed-only postItemListing — now it's a real market entry).
export function postSaleListing(s: GameState, src: 'lot' | 'used', idx: number, t?: T, rng: () => number = Math.random): string | null {
  return listForMarket(s, src, idx, 'listing', t, rng);
}
function listForMarket(s: GameState, src: 'lot' | 'used', idx: number, kind: 'auction' | 'listing', t?: T, rng: () => number = Math.random): string | null {
  const auction = kind === 'auction';
  let item: MarketItem; let est: number;
  if (src === 'lot') {
    const l = s.lots[idx]; if (!l) return null;
    const it = ITEM_BY[l.id]; if (!it) return null;
    est = lotValue(s, l);
    item = { ...l, src: 'lot' as const };
    s.lots.splice(idx, 1);
  } else {
    const u = s.used[idx]; if (!u) return null;
    est = usedItemValue(s, u);
    item = { ...u };
    s.used.splice(idx, 1);
  }
  const rarity = itemRarity('src' in item ? ITEM_BY[item.id] : item);
  const ask = Math.round(est * RARITY_MULT[rarity] * 1.4);
  const fee = Math.round(ask * (auction ? AUCTION_FEE : LISTING_FEE));
  if (s.money < fee) {
    // can't afford the upfront fee — put the item back where it came from
    if (src === 'lot') s.lots.push({ id: (item as { id: string }).id, paid: (item as { paid: number }).paid, day: (item as { day: number }).day, condition: (item as { condition?: number }).condition, condDay: (item as { condDay?: number }).condDay, repaired: (item as { repaired?: number }).repaired });
    else s.used.push(item as GameState['used'][number]);
    return null;
  }
  s.money -= fee;
  const [dLo, dHi] = auction ? AUCTION_DAYS : LISTING_DAYS;
  const days = dLo + Math.floor(rng() * (dHi - dLo + 1));
  const v = mktView(item);
  s.mkt.push({
    kind, src, item, name: v.name, brand: v.brand, c: v.c, art: v.art, img: mktImg(item), rarity,
    ask, est, fee, startDay: s.day, endDay: s.day + days, bids: 0, best: 0
  });
  addPost(s, auction
    ? `My ${v.name} is live at the auction house — bids close in ${days} days. Asking ${fmt(ask)}.`
    : `Anyone want my ${v.name}? Fixed price ${fmt(ask)}, ${days}-day listing.`, auction ? 1.8 : 1.4, rng);
  pushLog(s, `${auction ? 'Auction' : 'Listing'}: ${v.name} at ${fmt(ask)} for ${days} days (fee ${fmt(fee)}).`);
  return t
    ? t(auction ? 'mkt.upAuction' : 'mkt.upListing', '', { name: v.name, x: fmt(ask), n: days })
    : `${auction ? 'Auction' : 'Listing'}: ${v.name} @ ${fmt(ask)} (${days}d)`;
}
// Pull an item out of the market early. The upfront fee is forfeited — the
// auction house doesn't refund appointments. Item returns to the inventory.
export function cancelMarketJob(s: GameState, ji: number, t?: T): string | null {
  const j = s.mkt[ji]; if (!j) return null;
  s.mkt.splice(ji, 1);
  if (j.src === 'lot') s.lots.push({ id: (j.item as { id: string }).id, paid: (j.item as { paid: number }).paid, day: (j.item as { day: number }).day, condition: (j.item as { condition?: number }).condition, condDay: (j.item as { condDay?: number }).condDay, repaired: (j.item as { repaired?: number }).repaired });
  else s.used.push(j.item as GameState['used'][number]);
  pushLog(s, `Withdrew ${j.name} from the ${j.kind === 'auction' ? 'auction' : 'listing'} (fee ${fmt(j.fee)} forfeited).`);
  return t ? t('mkt.cancelled', '', { name: j.name, x: fmt(j.fee) }) : `Withdrew ${j.name} — lost ${fmt(j.fee)} fee`;
}
// Value locked in running market jobs — added to netWorth so listing an item
// doesn't make the player suddenly "poorer" while it sits at the auction house.
export const marketVal = (s: GameState) => (s.mkt || []).reduce((a, j) => a + j.est, 0);
// Called from tick() after the day loop. Resolves every job whose window has
// closed, simulating the bids that arrived over the elapsed days (one roll per
// game-day, so the advertised sell chance matches the simulation exactly).
export function resolveMarket(s: GameState, t?: T, rng: () => number = Math.random): void {
  if (!s.mkt.length) return;
  for (let i = s.mkt.length - 1; i >= 0; i--) {
    const j = s.mkt[i];
    if (s.day < j.endDay) continue;
    const days = Math.max(1, Math.round(j.endDay - j.startDay));
    let bids = 0, best = 0;
    const p = P_BID[j.rarity] * (j.kind === 'auction' ? 1 : 0.75);
    for (let d = 0; d < days; d++) {
      if (rng() < p) {
        bids++;
        // each bid lands between 95% and 140% of the ask (bidding war)
        best = Math.max(best, j.ask * (0.95 + rng() * 0.45));
      }
    }
    const sold = bids > 0;
    j.bids = bids; j.best = best;
    if (sold) {
      const final = j.kind === 'auction' ? best : j.ask;
      const proceeds = Math.round(final * (1 - RESALE_FEE));
      s.money += proceeds;
      s.mkt.splice(i, 1);
      pushLog(s, `${j.kind === 'auction' ? 'Auction' : 'Listing'}: ${j.name} ${bids > 1 ? `(${bids} bids, hammer ${fmt(final)}) ` : ''}sold for ${fmt(proceeds)}.`);
      addPost(s, j.kind === 'auction'
        ? `Hammer down! ${j.name} sold at auction for ${fmt(proceeds)} after ${bids} bid${bids > 1 ? 's' : ''}.`
        : `Sold my ${j.name} for ${fmt(proceeds)} — listing closed.`, 1.8, rng);
      queueToast(s, t
        ? t(j.kind === 'auction' ? 'mkt.soldAuction' : 'mkt.soldListing', '', { name: j.name, x: fmt(proceeds), n: bids })
        : `${j.kind === 'auction' ? 'Auction sold' : 'Sold'}: ${j.name} +${fmt(proceeds)}`);
      addXp(s, bids > 1 ? 12 : 6, rng); // negotiating pays XP
    } else {
      s.mkt.splice(i, 1);
      if (j.src === 'lot') s.lots.push({ id: (j.item as { id: string }).id, paid: (j.item as { paid: number }).paid, day: (j.item as { day: number }).day, condition: (j.item as { condition?: number }).condition, condDay: (j.item as { condDay?: number }).condDay, repaired: (j.item as { repaired?: number }).repaired });
      else s.used.push(j.item as GameState['used'][number]);
      pushLog(s, `${j.kind === 'auction' ? 'Auction' : 'Listing'}: ${j.name} found no buyer in ${days} days. Fee ${fmt(j.fee)} lost.`);
      queueToast(s, t
        ? t('mkt.noBuyer', '', { name: j.name, x: fmt(j.fee) })
        : `No buyer for ${j.name} — lost ${fmt(j.fee)} fee`);
    }
  }
}

// ================= v11.33 — RARE AUCTION CIRCUIT =================
// Grail pieces surface RANDOMLY (~once every ~70 game days), are announced
// 10–28 days ahead (toast + auction-house schedule), then go LIVE for 5–9
// days. While live, NPC collectors raise the highest bid every 2 days, and
// if the player has bid they can be OUTBID — a real bidding war with a real
// chance of losing. Winning charges the player's bid and delivers the piece
// in mint condition; being outbid (or not paying) loses nothing but the lot.
const RARE_SPAWN_P = 1 / 70;
const RARE_NOTICE_DAYS: [number, number] = [10, 28];
const RARE_LIVE_DAYS: [number, number] = [5, 9];

export function tickRareAuctions(s: GameState, t?: T, rng: () => number = Math.random): void {
  if (s.over) { s.rareUp = s.rareUp || []; return; }
  s.rareUp = Array.isArray(s.rareUp) ? s.rareUp : [];
  // 1) schedule a new grail announcement (never one the player already owns)
  if (!s.rareLive && s.rareUp.length < 2 && rng() < RARE_SPAWN_P) {
    const owned = new Set([...s.lots.map(l => l.id), ...s.used.map(u => u.baseId)]);
    const pool = RARE_ITEMS.filter(r => !owned.has(r.id) && !s.rareUp.some(u => u.id === r.id));
    if (pool.length) {
      const pick = pool[Math.floor(rng() * pool.length)];
      const lead = RARE_NOTICE_DAYS[0] + Math.floor(rng() * (RARE_NOTICE_DAYS[1] - RARE_NOTICE_DAYS[0] + 1));
      s.rareUp.push({ id: pick.id, atDay: s.day + lead });
      queueToast(s, t
        ? t('rare.soon', '', { name: pick.name, n: lead, x: fmt(pick.price) })
        : `Rare auction announced: ${pick.name} — bidding opens in ${lead} days.`);
      pushLog(s, `Auction house: ${pick.name} — bids open in ${lead} days (est ${fmt(pick.price)}).`);
    }
  }
  // 2) move due announcements to the live block (one at a time)
  if (!s.rareLive && s.rareUp.length) {
    const due = s.rareUp.findIndex(u => s.day >= u.atDay);
    if (due > -1) {
      const { id, atDay } = s.rareUp.splice(due, 1)[0];
      const it = ITEM_BY[id];
      const open = Math.round(it.price * (0.5 + rng() * 0.2));
      const days = RARE_LIVE_DAYS[0] + Math.floor(rng() * (RARE_LIVE_DAYS[1] - RARE_LIVE_DAYS[0] + 1));
      s.rareLive = { id, endDay: s.day + days, bid: open, leader: 'npc', my: 0 };
      queueToast(s, t
        ? t('rare.open', '', { name: it.name, x: fmt(open), n: days })
        : `BIDDING OPEN: ${it.name} — opening bid ${fmt(open)}, ${days} days left.`);
      pushLog(s, `Rare auction LIVE: ${it.name}, opening ${fmt(open)} (${days}d). Late by ${s.day - atDay}d.`);
    }
  }
  // 3) while live: NPC war-chest escalates every 2 days, may outbid the player
  const L = s.rareLive;
  if (L && s.day < L.endDay && s.day % 2 === 0) {
    const it = ITEM_BY[L.id];
    if (L.leader === 'npc') {
      L.bid = Math.round(L.bid * (1.03 + rng() * 0.06));
    } else if (rng() < 0.45) {
      L.bid = Math.round(L.my * (1.04 + rng() * 0.08));
      L.leader = 'npc';
      queueToast(s, t
        ? t('rare.outbid', '', { name: it.name, x: fmt(L.bid) })
        : `Outbid! NPC raised ${it.name} to ${fmt(L.bid)}.`);
    }
  }
  // 4) hammer falls
  if (L && s.day >= L.endDay) {
    const it = ITEM_BY[L.id];
    if (L.leader === 'you' && s.money >= L.my) {
      s.money -= L.my;
      s.lots.push({ id: L.id, paid: L.my, day: s.day, condition: 100, condDay: s.day });
      addXp(s, 25, rng);
      addPost(s, `Won ${it.name} at auction for ${fmt(L.my)} after a bidding war. It's MINE.`, 2.4, rng);
      queueToast(s, t
        ? t('rare.won', '', { name: it.name, x: fmt(L.my) })
        : `🏆 WON: ${it.name} for ${fmt(L.my)}! Delivered in mint condition.`);
      pushLog(s, `Auction WON: ${it.name} — hammer ${fmt(L.my)}.`);
    } else {
      const lost = L.leader === 'you'
        ? (t ? t('rare.cantPay', '', { name: it.name }) : `Won ${it.name} but couldn't pay — lot forfeited.`)
        : (t ? t('rare.lost', '', { name: it.name, x: fmt(L.bid) }) : `Lost the auction: ${it.name} went for ${fmt(L.bid)}.`);
      queueToast(s, lost);
      pushLog(s, `Auction lost: ${it.name} (${L.leader === 'you' ? 'payment failed' : 'NPC hammer ' + fmt(L.bid)}).`);
    }
    s.rareLive = null;
  }
}
// Place (or raise) the player's bid on the live rare lot. Must beat the
// current high bid by at least 5%. Cash is only charged when the hammer
// falls in the player's favour.
export function placeBidRare(s: GameState, amount: number, t?: T): string | null {
  const L = s.rareLive; if (!L) return null;
  const it = ITEM_BY[L.id];
  const min = Math.ceil(L.bid * 1.05);
  if (!Number.isFinite(amount) || amount < min) {
    return t ? t('rare.bidLow', '', { x: fmt(min) }) : `Bid too low — minimum ${fmt(min)}.`;
  }
  if (s.money < amount) return t ? t('rare.noCash', '', { x: fmt(amount) }) : 'Not enough cash for that bid.';
  L.my = Math.round(amount);
  L.leader = 'you';
  pushLog(s, `Bid ${fmt(L.my)} on ${it.name}.`);
  return t ? t('rare.bidOk', '', { name: it.name, x: fmt(L.my) }) : `Bid placed: ${fmt(L.my)} on ${it.name}.`;
}
// v11.33 — favourites: star an item id to track it in the watchlist.
export function toggleFav(s: GameState, id: string): void {
  const i = (s.favs || []).indexOf(id);
  if (i > -1) s.favs.splice(i, 1); else s.favs.push(id);
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
  // v11.4 — append the power ending to the hall note so the Hall of
  // Fame records how the player's political arc ended.
  const ending = s.power ? computeEnding(s) : null;
  const endingNote = ending ? ` · ending: ${ending}` : '';
  return {
    name: s.name,
    nation: s.nation,
    era: eraOf(y).name,
    industry: playerIndustry(s),
    peakNetWorth: fmt(nw),
    note: `${s.cause === 'health' ? 'Burned out at ' + Math.floor(s.age) : 'Lived to ' + Math.floor(s.age)} · ${tier} · ${s.ach.length}/${ACHIEVEMENTS.length} milestones · level ${s.level}${endingNote}`,
    livedTo: Math.floor(s.age),
    tier
  };
}
export function recordHallOnGameOver(s: GameState): void {
  if (!s.over) return;
  // v11.4 — compute + record the power ending before freezing the hall entry.
  if (s.power) s.power.ending = computeEnding(s);
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
  // 5. v11.19 — Licences: ALWAYS forget every licence on reincarnation.
  //    Previously this was a ~50% chance per licence, which left players with
  //    surviving licences they couldn't re-enroll in (the licence UI shows
  //    "✓ Done" for owned licences). The reincarnation narrative is a fresh
  //    start, so licences are wiped — the player can re-enroll any of them.
  //    (Degrees still fade by 30-80% above; shortCompleted is reset by fresh().)
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

// ---------- v10.5: pets ----------
// Adopt a pet (up to MAX_PETS). Cost is the adoption fee; the player can
// name the pet. Passive bonuses (spirit / fame / health-drain) start
// applying on the next tick.
export function adoptPet(s: GameState, typeId: string, name: string): string | null {
  const def = PET_BY[typeId]; if (!def) return null;
  if (s.pets.length >= MAX_PETS) return `You already have ${MAX_PETS} pets — find a home for one first.`;
  if (s.money < def.cost) return null;
  s.money -= def.cost;
  s.pets.push({
    typeId, name: (name || def.name).slice(0, 24),
    happiness: 80, health: 100, adoptedDay: s.day, lastCare: s.day
  });
  pushLog(s, `Adopted a ${def.name}${name ? ' named ' + name : ''}.`);
  addPost(s, `New family member today: a ${def.name}${name ? ' named ' + name : ''}. The office will never be the same.`, 1.3);
  s.spirit = Math.min(100, s.spirit + 5);
  return `Adopted a ${def.name}!`;
}
// Care actions: feed / play / walk. Each raises happiness, costs cash or
// time. 1-day cooldown per pet per action.
export function careForPet(s: GameState, idx: number, action: 'feed' | 'play' | 'walk'): string | null {
  const pet = s.pets[idx]; if (!pet) return null;
  if (s.lastDay - pet.lastCare < 1) return 'Give them a day.';
  const def = PET_BY[pet.typeId]; if (!def) return null;
  pet.lastCare = s.day;
  switch (action) {
    case 'feed': {
      const cost = Math.round(def.upkeep * 0.5);
      if (s.money < cost) return null;
      s.money -= cost;
      pet.happiness = Math.min(100, pet.happiness + 8);
      pet.health = Math.min(100, pet.health + 3);
      return `Fed ${pet.name}: +8 happiness, +3 health.`;
    }
    case 'play': {
      // Free; small happiness + small spirit regen to the player
      pet.happiness = Math.min(100, pet.happiness + 6);
      s.spirit = Math.min(100, s.spirit + 2);
      return `Played with ${pet.name}: +6 happiness, +2 spirit.`;
    }
    case 'walk': {
      // Free; bigger happiness + small health regen to the player (only dogs)
      if (pet.typeId !== 'dog' && pet.typeId !== 'horse') return `${def.name}s don't really walk.`;
      pet.happiness = Math.min(100, pet.happiness + 10);
      s.health = Math.min(100, s.health + 2);
      return `Walked ${pet.name}: +10 happiness, +2 health.`;
    }
  }
}
// Give away a pet (free, no refund). Used when the player hits MAX_PETS
// and wants to swap, or when a pet's health has collapsed.
export function abandonPet(s: GameState, idx: number): string | null {
  const pet = s.pets[idx]; if (!pet) return null;
  const def = PET_BY[pet.typeId];
  s.pets.splice(idx, 1);
  pushLog(s, `Rehomed ${pet.name}.`);
  s.spirit = Math.max(0, s.spirit - 5);
  if (pet.happiness < 30) s.karma -= 2;
  return `Rehomed ${pet.name} the ${def?.name || 'pet'}.`;
}
// Passive pet effects per game-day. Called from processDay. Applies the
// spiritBonus when the pet is happy (≥30), drains healthDrain when neglected.
export function tickPets(s: GameState): void {
  for (const pet of s.pets) {
    const def = PET_BY[pet.typeId]; if (!def) continue;
    // Happiness decays ~1.5/day; health follows happiness.
    pet.happiness = Math.max(0, pet.happiness - 1.5);
    if (pet.happiness < 30) pet.health = Math.max(0, pet.health - 1);
    // Apply passive bonus only if the pet is happy enough.
    if (pet.happiness >= 30) {
      s.spirit = Math.min(100, s.spirit + def.spiritBonus);
    }
    if (def.healthDrain > 0 && pet.happiness < 30) {
      // Exotic pets that aren't cared for can hurt the player's health too.
      s.health = Math.max(0, s.health - def.healthDrain);
    }
  }
}
// Passive fame per year from pets — called from yearEnd.
export function petFameBonus(s: GameState): number {
  return s.pets.reduce((sum, pet) => {
    const def = PET_BY[pet.typeId];
    return sum + (def && pet.happiness >= 30 ? def.fameBonus : 0);
  }, 0);
}
function finishStudy(s: GameState, study: Study, rng: () => number): void {
  if (study.kind === 'deg' && study.field) s.deg[study.field] = study.lvl!;
  else if (study.id) {
    // v11.43 BUG E fix: short courses reuse kind:'lic' for the study-slot
    // mechanism, but they must NOT write to s.lic (that map is for real
    // driver/boat/pilot licences checked by meets() + crewCostFor). Only
    // write to s.lic if this is a genuine licence (in LIC_BY) and NOT a
    // short course (in SHORT_BY).
    const isShortCourse = !!SHORT_BY[study.id];
    if (!isShortCourse) s.lic[study.id] = true;
    // v11 — if this was a short course, record it in shortCompleted so
    // the matching full degree gets a 10% tuition reduction later.
    if (isShortCourse && !s.shortCompleted.includes(study.id)) {
      s.shortCompleted.push(study.id);
    }
  }
  addXp(s, study.kind === 'deg' ? 150 : 40, rng);
  pushLog(s, `Graduated: ${study.name}.`);
  // v11.43 — short courses say "Short course" not "licence" in the log + post.
  const isShort = study.kind === 'lic' && study.id && SHORT_BY[study.id];
  addPost(s, study.kind === 'deg' ? `Officially graduated — ${study.name}!` : isShort ? `Completed short course: ${study.name}.` : `Picked up a new licence: ${study.name}.`, 1.2, rng);
  recordActivity(s, `Completed: ${study.name}`);
  // v11.17 — surface as a toast so the player sees it even if they're not on
  // the career/edu tab when the study ends.
  queueToast(s, study.kind === 'deg'
    ? `🎓 Graduated: ${study.name}`
    : `📜 ${isShort ? 'Short course' : 'Licence'} complete: ${study.name}`);
}
export function gameOverTier(s: GameState): { tier: string; nw: number } {
  const nw = netWorth(s);
  const tier = nw < 1e6 ? 'Humble beginnings' : nw < 1e7 ? 'Comfortable life' : nw < 1e8 ? 'Tycoon' : nw < 1e9 ? 'Billionaire' : 'Legend';
  return { tier, nw };
}

// ---------- main tick ----------
export function tick(s: GameState, dtMs: number, rng: () => number = Math.random, t?: T): { taxToast?: string; yearToast?: string; gameJustOver?: boolean; toasts?: string[] } {
  const out: { taxToast?: string; yearToast?: string; gameJustOver?: boolean; toasts?: string[] } = {};
  if (s.over || s.pending || s.aiEv || !s.started) return out;
  s.day += dtMs / DAY_MS; // dt is milliseconds; DAY_MS milliseconds = 1 game day
  s.age = START + s.day / 365.25;
  const beforeYear = worldYear(s);
  while (s.lastDay < Math.floor(s.day) && !s.over) { s.lastDay++; processDay(s, s.lastDay, rng); }
  if (s.spaceUpgrade && s.day >= s.spaceUpgrade.completesDay) {
    s.spaceUpgrade = null;
    s.spaceTravel = true;
    pushLog(s, 'Deep-space navigation certified. Space venture income is now 20% higher.');
    queueToast(s, '🚀 Deep-space navigation certified — space venture income +20%.');
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
  // v11.28 — resolve timed marketplace jobs (auctions + sale listings) whose
  // window closed. Runs after the day loop so results land the moment the
  // clock passes endDay; t is threaded through for localised toasts.
  if (s.mkt.length) resolveMarket(s, t, rng);
  // v11.33 — the rare-auction circuit: schedule grail announcements, open
  // live bidding, escalate NPC bids, resolve the hammer (see above).
  tickRareAuctions(s, t, rng);
  while (Math.floor(s.age) > s.lastYr && !s.over) { s.lastYr++; yearEnd(s, s.lastYr, rng); }
  if (s.age >= END_AGE && !s.over) { s.age = END_AGE; s.over = true; s.cause = 'age'; out.gameJustOver = true; }
  if (!s.over && s.health <= 0) { s.over = true; s.cause = 'health'; out.gameJustOver = true; }
  // Part 6 — bankruptcy: cash negative AND net worth negative = insolvent.
  // netWorth() already includes money + stocks + assets + biz + deposits - loan,
  // so a player who is cash-negative but still holds assets is NOT bankrupt.
  if (!s.over && s.started && s.money < 0 && netWorth(s) < 0) {
    s.over = true; s.cause = 'bankrupt'; out.gameJustOver = true;
    pushLog(s, `Bankruptcy: cash ${fmt(s.money)} and net worth ${fmt(netWorth(s))} — insolvent.`);
  }
  // v11.17 — drain the pending toast queue into the return value so the React
  // layer can surface each entry. The queue is cleared here; engine functions
  // called above (processDay, yearEnd, finishStudy, etc.) pushed into it.
  if (s.pendingToasts.length > 0) {
    out.toasts = s.pendingToasts.slice();
    s.pendingToasts = [];
  }
  return out;
}

// v11.12 — offline catch-up. Called on mount and when the tab becomes visible
// again. Advances time at the slower OFFLINE_DAY_MS rate (10 real-minutes per
// game day) for the wall-clock elapsed since s.lastSeen, capped at 30 game days
// so an arbitrarily long absence can't jump the player years ahead. Each
// unmonitored business then faces an extra closure roll + operational loss,
// because nobody was minding the shop. Returns a human summary for the toast,
// or null if no catch-up applied.
export function applyOffline(s: GameState, rng: () => number = Math.random, t?: T): { summary: string; days: number; closures: number; losses: number; gameJustOver?: boolean; toasts?: string[] } | null {
  if (!s.started || s.over || s.lastSeen == null) {
    s.lastSeen = Date.now();
    return null;
  }
  const now = Date.now();
  const elapsed = now - s.lastSeen;
  if (elapsed < 60_000) {            // < 1 min away — ignore, just refresh
    s.lastSeen = now;
    return null;
  }
  const days = Math.min(Math.floor(elapsed / OFFLINE_DAY_MS), 30);
  if (days < 1) {                    // away < 10 min — not a full offline day
    s.lastSeen = now;
    return null;
  }
  // Advance the calendar (processDay runs for each elapsed day, same as the
  // online clock). tick() guards against pending events / game over itself.
  // v11.28 — t threads through so auction/listing results come back localised.
  const res = tick(s, days * DAY_MS, rng, t);
  // Elevated unsupervised-business risk: per offline day, each branch faces an
  // extra ~2% closure chance (capped) on top of the normal roll inside
  // processDay, plus a lump operational loss proportional to the portfolio.
  let closures = 0;
  const bizIds = Object.keys(s.branches);
  for (const bizId of bizIds) {
    const list = s.branches[bizId];
    if (!list || !list.length) continue;
    const kept: Branch[] = [];
    for (const br of list) {
      const ch = Math.min(0.5, 0.02 * days + (br.mood < 0.9 ? 0.05 : 0));
      if (rng() < ch) {
        closures++;
        pushLog(s, `${BIZ.find(x => x.id === bizId)?.name || bizId} branch closed while you were away (unsupervised).`);
      } else {
        kept.push(br);
      }
    }
    s.branches[bizId] = kept;
    s.biz[bizId] = kept.length;
    if (kept.length === 0) { delete s.branches[bizId]; delete s.biz[bizId]; }
  }
  const branchTotal = bizIds.reduce((n, id) => n + (s.branches[id]?.length || 0), 0) + closures; // pre-closure count
  const losses = Math.round(branchTotal * 200 * days * (0.5 + rng()));
  if (losses > 0) s.money -= losses;
  s.lastSeen = now;
  // Build a localised-ish summary (the toast layer localises nothing; this is
  // short and the numbers carry the meaning. A future pass can route through t().)
  const parts: string[] = [];
  parts.push(`${days}d away`);
  if (closures > 0) parts.push(`${closures} branch closure(s)`);
  if (losses > 0) parts.push(`−${fmt(losses)} unsupervised`);
  if (closures === 0 && losses === 0) parts.push('ventures ran smoothly');
  if (res.gameJustOver) parts.push('life ended');
  const summary = 'While you were away: ' + parts.join(' · ') + '.';
  pushLog(s, summary);
  // v11.17 — surface the most important offline toasts (capped at 3 so the
  // player isn't spammed if many things happened). The summary covers the
  // routine stuff (closures, losses); the toasts cover milestones that the
  // player would otherwise miss (graduation, scandal, power promotion).
  const offlineToasts = res.toasts ? res.toasts.slice(0, 3) : undefined;
  return { summary, days, closures, losses, gameJustOver: res.gameJustOver, toasts: offlineToasts };
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
// v13.9 — fmtFull: full dollar value with thousand separators (en-US grouping)
// for TABLE CELLS and DETAILED DISPLAYS where compact $1.2K/$3.4M would be
// unreadable for very large numbers (> 100 tỷ = > $100B). Use this in tables,
// item rows, banking breakdowns, etc. Keep fmt() for chips/badges/toasts.
export function fmtFull(n: number): string {
  const neg = n < 0; n = Math.abs(n);
  return (neg ? '\u2212' : '') + '$' + Math.floor(n).toLocaleString('en-US');
}
