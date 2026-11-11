'use client';

export { useCallback, useEffect, useMemo, useRef, useState } from 'react';
export { Art, Ic, ART_DEFS } from '@/lib/art';
export { useGame, getState, persist, bump, resetState, reincarnateState } from '@/lib/store';
export {
  START, END_AGE, RETIRE, RESALE_FEE, FOUND_COST, FOUND_MIN_NW, OWN_CLUB_MULT,
  SAVE_RATE, LOAN_RATE, TAX_FREE, TAX_BRACKETS, ALLNEWS, eraOf, NATIONS, NAME_POOLS, INTERESTS, TALENTS, PATHS,
  analyze, FIELDS, LICENSES, LIC_BY, LIC_FOR, STAGES, BIZ, FARM_LINES, FAC_LINES, ITEM_BY, ITEM_IMAGES, USED_IMAGES, ASSET_DEPRECIATION_RATE,
  CLUBS, JOBS, GIGS, SPACE_LINES, TABS, GROUPS, xpNeed, ITEMS, USED_MARKET, HALL_OF_FAME, itemRarity, RARITY_COLOR, RARITY_MULT, NPCS, NPC_BY, PETS, PET_BY, MAX_PETS, CREW_COST, SHORT_COURSES, SHORT_BY, BOTS, REG_MULT, type Rarity, type FieldKey, type Req, type ItemDef, type UsedItem,
  RARE_ITEMS, RARE_IDS, itemGroup, type ItemGroup,
  TRAVEL, registerItem,
} from '@/lib/gameData';
export {
  fmt, fmtFull, taxOf, fresh, begin, tick, applyOffline, stageOf, worldYear, branchCount, bizCost, clubMult, branchNet, fameBonus, bizMultiplier,
  bizIncome, yearIncome, living, lotValue, upkeep, assetVal, bizVal, stockVal, netWorth,
  bizRevenue, bizCosts, bizNet, bizMarketShare, bizRndMult, investBizRnd, farmIncome, facIncome,
  grantSpirit, spiritGainTodayLeft, SPIRIT_DAILY_CAP,
  effYears, tuitionOf, meets, reqText, knowledgeText, snapshot, dateOf,
  processDay, yearEnd,
  doGig, gigReady, gigLock, gigPay, addPost, buySpace, spaceIncome, socialIncome, levelMult, canPost, postCooldownLeft,
  openBranch, openBranchCapital, capitalPathCost, MANAGER_MONTHLY, rollBranchClosures, buyFarmLine, buyFacLine, buyItem, sellLot, trade, joinClub, leaveClub, foundClub,
  franchiseBranch, negotiateBizSell, pushBizOffer, acceptBizOffer, type BizOffer,
  setBizBrand, bizBrandOf,
  hire, enrollDeg, enrollLic, enrollShortCourse, dropStudySlot, changeInterest, bankOp, donate, applyEventChoice, applyAIChoice, currentEvent, studyWorkMult,
  negotiateRaise, quitJob,
  travel, travelReady, travelCooldownLeft,
  spaceUpgradeReady, startSpaceUpgrade, spaceUpgradeDays, spaceMultiplier, SPACE_TRAVEL_COST,
  recordActivity, studyPace, sleepHealthMult, sleepHealthRecovery, sleepHoursOptions, sleepDebtStudyMult, sleepDebtHealthMult,
  gameOverTier, botRows, type AIEvent, type AIEventKind, type GameState, type Transaction, type TxKind, TX_CAP,
  // v11.49 — Portfolio Dashboard helpers + v11.53 Finance Overview helpers
  recordTx, portfolioRealizedGains, portfolioUnrealizedGains, portfolioInvested, portfolioIncome, portfolioROI, stockROI, cashFlowLastDays,
  yearExpenses, incomeBreakdown, expenseBreakdown, assetBreakdown, financeActions, type IncomeSource, type ExpenseItem, type AssetItem, type FinanceAction,
  // v11.57 — banking credit breakdown
  maxLoanOf,
  doWell, toggleDiet, wellReady, wellLeft, effWellCd, healthMult, healthState, healthWarnings, spiritState, decayPerYear,
  jobsOf, jobIncome, studyTuition, type Religion, RELIGIONS,
  spiritBizMult, cosmicMult, GYM_COST, GYM_CD, CHECKUP_COST, CHECKUP_CD, TREAT_COST, TREAT_CD, DIET_COST,
  TEMPLE_COST, TEMPLE_CD, RETREAT_COST, RETREAT_CD, FAITH_PRACTICE_COST, FAITH_PRACTICE_CD,
  ACHIEVEMENTS, checkAch,
  buyUsedItem, sellUsed, usedItemValue, playerHallEntry, recordHallOnGameOver,
  putUpAuction, postSaleListing, cancelMarketJob, sellChanceOf, AUCTION_DAYS, LISTING_DAYS, AUCTION_FEE, LISTING_FEE, marketVal,
  // v11.33 — rare-auction circuit + favourites
  placeBidRare, toggleFav,
  repairLot, repairUsed, repairSkill, repairCost,
  // v13.2 — limited-stock item system
  itemStockLeft,
  choiceRisk, type ChoiceRisk,
  creativePost,
  relationState, interactNPC, proposeToNPC,
  adoptPet, careForPet, abandonPet, petFameBonus,
  // v11.2 — real events affecting market
  effEraBiz, effEraFac, effLoanRate, effRisk, effDemand, researchCost, researchMarket,
  // v11.3 — power & influence
  powerTierOf, powerTierIdx, nextTierOf, POWER_TIERS, ADVOCACY_ACTIONS,
  doAdvocacy, INFLUENCE_SOURCE_LABELS, type PowerTier, type InfluenceSource, type AdvocacyAction,
  // v11.4 — elections + scrutiny + alliances/rivals + endings
  ELECTION_PARAMS, electionParamsFor, runElection, TRANSPARENCY_ACTIONS, doTransparency,
  offerAlliance, breakWith, computeEnding, tickPowerV11_4,
  // v11.5 — entity system
  entityTierOf, qualifiedEntityTier, nextEntityTier, ENTITY_TIERS, CONSTITUTIONS, constitutionById,
  actDeclareAutonomy, actCourtRecognition, actDeclareIndependence,
  type EntityState, type EntityTier, type Constitution,
  // v11.6 — zodiac + tarot + psychic affinity
  ZODIAC, zodiacOf, zodiacById, freshPsychic, TAROT_CARDS, tarotDraw, togglePsychic, zodiacAffinityMult, zodiacIntroSuggestion,
  type ZodiacSign, type Gender, type ZodiacDef, type PsychicState,
  // v11.6 — MONTHS array renamed to avoid clashing with month names below
  MONTHS as MONTHS_NAMES,
  // v14 — admin actions queue: applies pending ADMIN_ACTION rows polled from
  // /api/social/ping?uid=xxx (banking / business / gigs / player-stat tweaks).
  applyAdminActions, type AdminAction,
  // v14.1 — admin stock catalogue: stocksOf merges built-in + overridden +
  // custom stocks into a single list so the StockTab + trade() read the same
  // market the admin dashboard mutates.
  stocksOf, type StockDef,
} from '@/lib/engine';
export { localTwist, pickKind } from '@/lib/story';
export { ChatView, FriendsView, BoardView } from '@/app/community';
export { useCommunity } from '@/lib/social';
export { castHexagram, validateQuestion, type CastResult } from '@/lib/iching';
export { lapLaSo, type LaSo } from '@/lib/tuvi';
export { phanTichToanDien, HUONG, type PhongThuyReading, type Huong } from '@/lib/phongthuy';
export { drawCards, spreadLabels, TAROT_GHI_CHU, type TarotCard } from '@/lib/tarot';
export { useT, LANGS, type Lang } from '@/lib/i18n';



export const asset = (p: string) => {
  // v11.58 — URL-aware: leave absolute http(s)/data URLs alone so generated
  // items (whose image is a web URL returned by /api/items/generate) render
  // correctly even when NEXT_PUBLIC_BASE_PATH is set for a sub-path deploy.
  if (!p) return p;
  if (/^https?:\/\//.test(p) || p.startsWith('data:')) return p;
  return (process.env.NEXT_PUBLIC_BASE_PATH || '') + p;
};


// v11.8 — the bundled version. The /version.json file in /public is polled
// every 5 minutes; if its version is newer than this, a "reload to update"
// banner appears even in a running session (no F5 needed).
export const BUNDLED_VERSION = 'v13.10';

export const VERSION_POLL_MS = 5 * 60 * 1000;

// v11.44 — 'what's new' modal now fires PER PATCH (not per major version).
// The SEEN_KEY is derived from BUNDLED_VERSION so each new patch re-shows the
// modal once. Content is driven from /public/version.json (headline + features),
// which IS updated per-patch — so the modal always shows fresh, accurate
// changelog content instead of the stale static v11 list.
// v11.24 had switched to per-major (tycoon_seen_v11) to avoid the "stale list
// repeats" complaint, but that meant patch-level updates were never announced.
// The per-patch key + dynamic content from version.json solves both problems.
export const SEEN_KEY = 'tycoon_seen_' + BUNDLED_VERSION;
