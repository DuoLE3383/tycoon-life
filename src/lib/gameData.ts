// ================= GAME DATA (ported from the static game) =================
// v11.58 — ITEMS / RARE_ITEMS / USED_MARKET data lives in /public/items.json
// (single source of truth, shipped to clients as a static asset). The TS file
// imports the JSON at module-load so the engine + tests can read the data
// synchronously; `loadItems()` re-fetches /items.json at runtime on the client
// so newly generated items (via /api/items/generate) can be merged in. The
// TypeScript interfaces (ItemDef, UsedItem, Rarity) stay here.
import itemsData from '../../public/items.json';
export type FieldKey = 'business' | 'engineering' | 'medicine' | 'science' | 'arts';

// v11.12 — online time runs at 30 real-seconds per game day (was 20s). When the
// player is offline, time advances much slower — 10 real-minutes per game day —
// and unmonitored businesses face extra risk (see engine.applyOffline). The two
// rates decouple "playing actively" from "away": a closed tab no longer pauses
// the world entirely, but neither does it let weeks pass in minutes.
export const DAY_MS = 30000;       // 30 real seconds per game day (online)
export const OFFLINE_DAY_MS = 600000; // 10 real minutes per game day (offline)
export const START = 18, END_AGE = 90, RETIRE = 65, PENSION = 18000;
export const RESALE_FEE = .03, BIZ_DEGREE_BONUS = .15;
export const FOUND_COST = 250000, FOUND_MIN_NW = 1000000, OWN_CLUB_MULT = 1.2, OWN_CLUB_MAX_MEMBERS = 200;
export const SAVE_RATE = .02, LOAN_RATE = .06;

// v10.5 — varied post templates so the feed doesn't read like a bot.
// Templates interpolate {year} {era} {nation} {biz} {name} at post time.
export const POST_TEMPLATES: { update: string[]; hype: string[]; charity: string[]; milestone: string[] } = {
  update: [
    'Quiet morning in {nation}. Reading the paper. The {era} moves fast.',
    'Walked past my first office today. Different city, same lesson: keep showing up.',
    'Coffee with an old friend from before any of this. He still calls me by my childhood nickname.',
    'A {year} kind of day. The kind that asks hard questions in a soft voice.',
    'Someone asked what I would tell my 18-year-old self. Same thing I tell myself now: stop rehearsing, start doing.',
    'The {era} rewards motion. So I move. Tomorrow I will move again.',
    'Took the long way home. The city looks different at walking speed.',
    'I am not the smartest person in any room. I am usually the most stubborn. That has been enough.',
    'Spent an hour today just watching people. The {era} is loud; people are quieter than you think.',
    'A reporter asked my secret. There is no secret. There is only the next decision.',
  ],
  hype: [
    'Behind the scenes at {biz} today. The team is sharper than the press gives them credit for.',
    'We just shipped something I have wanted since {year}. The {era} finally caught up.',
    'Expansion day. {biz} opens its doors in a new region tomorrow. The signs are already up.',
    'Hiring 40 people this quarter. The {era} does not wait. Neither do we.',
    'Proud of {biz} today. The numbers are good. The team is better.',
    'A mentor once told me: hire people who scare you a little. We just hired three. The office is electric.',
    'The factory floor at {biz} is humming. I do not have a corner office. I have a corner of the factory floor.',
    'Big quarter. Bigger plans. The {era} belongs to people who keep building.',
    'Three new {biz} branches this month. Two in cities I had never visited before last year.',
    'Today we promoted someone I hired five years ago. Watching people grow is the real compounding.',
  ],
  charity: [
    'Proud to support causes bigger than any of us. Join me?',
    'Cut a cheque today for a school that needs a roof before the rainy season. Small act. Real roof.',
    'Donated to a {nation} literacy program. Reading is the first freedom.',
    'The {era} gave me a lot. Today I gave some of it back. The cheque cleared; the gratitude stays.',
    'Funded ten scholarships this year. The names on the list are the future of {nation}.',
    'Walked through the hospital wing my donation helped build. The nurse who recognised me would not take a tip.',
    'Spent the morning at the shelter. The {era} is hard. Show up anyway.',
    'A reader asked why I give so publicly. So others will too. That is the whole reason.',
    'Matched every employee donation this quarter. {biz} people are generous. I just opened the door.',
    'Donated art to the city museum. The {era} produced it; the {era} deserves to see it.',
  ],
  milestone: [
    'Another year. The {era} keeps turning. I am still here, still building.',
    'They asked me to give the commencement speech this year. I said yes. The students deserve an honest talk.',
    'Number one on the list this quarter. The list is fun; the work is the point.',
    'A magazine put me on the cover. I look tired in the photo. That is honest.',
    'Twenty years since I started {biz}. I remember the first sale like it was yesterday.',
  ],
};
export const ASSET_DEPRECIATION_RATE = -.1, BIZ_MULTIPLIER_CAP = 3;
export const TAX_FREE = 20000;
export const TAX_BRACKETS: [number, number][] = [[20000, 0], [60000, .15], [150000, .25], [1e15, .35]];
export const BRANCH_GROWTH = 1.35;
export const REG_MULT = [1.25, 1.15, 1.3, .85, 1.0, 1.05];

export const NEWS: Record<number, string[]> = {
  2010: ['Devastating earthquake hits Haiti\u2019s capital', 'Chilean miners rescued after 69 days underground', 'Spain wins the FIFA World Cup in South Africa'],
  2011: ['Japan earthquake and tsunami trigger the Fukushima nuclear crisis', 'Osama bin Laden killed in Pakistan', 'Arab Spring protests topple leaders in Tunisia and Egypt'],
  2012: ['London hosts the Summer Olympics', 'Curiosity rover lands on Mars', 'Barack Obama re-elected as US president'],
  2013: ['Edward Snowden reveals NSA surveillance programs', 'Boston Marathon bombing', 'Nelson Mandela dies at 95'],
  2014: ['Russia annexes Crimea', 'Malaysia Airlines flight MH370 disappears', 'Ebola epidemic spreads across West Africa'],
  2015: ['Paris attacks kill 130 people', 'Paris Climate Agreement adopted', 'US Supreme Court legalizes same-sex marriage nationwide'],
  2016: ['Britain votes to leave the European Union', 'Donald Trump wins the US presidential election', 'Leicester City wins the Premier League'],
  2017: ['Hurricane Harvey floods Houston', 'The #MeToo movement goes viral', 'Bitcoin soars to nearly $20,000'],
  2018: ['Stephen Hawking dies at 76', 'Prince Harry marries Meghan Markle', 'France wins the FIFA World Cup in Russia'],
  2019: ['Notre-Dame cathedral badly damaged by fire', 'First COVID-19 cases reported in Wuhan, China', 'Mass protests in Hong Kong'],
  2020: ['WHO declares COVID-19 a pandemic', 'George Floyd protests spread worldwide', 'Joe Biden wins the US presidential election'],
  2021: ['Storming of the US Capitol on January 6', 'Taliban retake Kabul', 'COVID-19 vaccines roll out worldwide'],
  2022: ['Russia invades Ukraine', 'Queen Elizabeth II dies', 'ChatGPT launches and sparks an AI boom'],
  2023: ['Earthquake devastates Turkey and Syria', 'Hamas attack on Israel starts war in Gaza', 'Hollywood writers and actors go on strike'],
  2024: ['Paris hosts the Summer Olympics', 'Donald Trump wins the US election again', 'Assad government falls in Syria'],
  2025: ['Donald Trump begins second term as US president', 'Pope Francis dies', 'Pope Leo XIV elected'],
  2026: ['FIFA World Cup kicks off in the US, Canada and Mexico']
};
export const HIST: Record<number, string[]> = {
  1920: ['League of Nations founded', 'US women win the right to vote'], 1922: ['King Tutankhamun\u2019s tomb discovered', 'Soviet Union founded'],
  1923: ['Hyperinflation wrecks the German mark', 'The Walt Disney Company founded'], 1925: ['The Great Gatsby published', 'First public TV demonstration'],
  1927: ['Lindbergh flies solo across the Atlantic', 'The Jazz Singer, first talkie movie'], 1928: ['Penicillin discovered by Fleming', 'Mickey Mouse debuts'],
  1929: ['Wall Street Crash starts the Great Depression'], 1930: ['Pluto discovered', 'First FIFA World Cup in Uruguay'],
  1933: ['Roosevelt launches the New Deal'], 1935: ['US Social Security Act signed', 'First around-the-world solo flight'],
  1936: ['Spanish Civil War begins', 'Hoover Dam completed'], 1937: ['Golden Gate Bridge opens', 'Hindenburg disaster'],
  1938: ['Superman first appears in comics'], 1939: ['World War II begins', 'Gone with the Wind premieres'],
  1941: ['Pearl Harbor attacked, US joins the war'], 1944: ['D-Day landings in Normandy', 'Bretton Woods shapes the postwar economy'],
  1945: ['WWII ends after Hiroshima and Nagasaki', 'United Nations founded'], 1946: ['ENIAC unveiled', 'Churchill\u2019s Iron Curtain speech'],
  1947: ['India gains independence', 'Sound barrier broken'], 1948: ['Universal Declaration of Human Rights adopted', 'Israel founded'],
  1949: ['NATO founded', 'Soviet Union tests its first atomic bomb'], 1950: ['Korean War begins', 'First successful organ transplant'],
  1953: ['DNA structure discovered', 'Everest first climbed'], 1955: ['Disneyland opens', 'Rosa Parks and the bus boycott'],
  1957: ['Sputnik 1 starts the space race'], 1959: ['Cuban revolution', 'First Barbie doll sold'],
  1961: ['Gagarin is the first human in space', 'Berlin Wall built'], 1963: ['JFK assassinated', 'Martin Luther King: I Have a Dream'],
  1964: ['The Beatles conquer America', 'Civil Rights Act signed'], 1966: ['Star Trek premieres', 'England wins the World Cup'],
  1968: ['Apollo 8 orbits the Moon', 'MLK assassinated'], 1969: ['Apollo 11 lands on the Moon', 'Woodstock festival', 'ARPANET sends its first message'],
  1971: ['Intel releases the first microprocessor', 'Walt Disney World opens'], 1972: ['Watergate scandal begins'],
  1973: ['Oil crisis triggers global recession', 'Sydney Opera House opens'], 1975: ['Saigon falls, Vietnam War ends', 'Microsoft founded'],
  1976: ['Apple founded in a garage', 'Concorde begins passenger flights'], 1977: ['Star Wars premieres', 'Elvis Presley dies'],
  1979: ['Second oil shock', 'Sony Walkman launches'], 1980: ['CNN launches', 'Rubik\u2019s Cube goes global'],
  1981: ['First space shuttle launches', 'IBM PC debuts'], 1985: ['Live Aid concerts', 'Nintendo Entertainment System launches'],
  1986: ['Challenger disaster', 'Chernobyl nuclear accident'], 1987: ['Black Monday: markets crash worldwide'],
  1989: ['Berlin Wall falls', 'Tiananmen Square protests', 'First World Wide Web proposal'], 1990: ['Reunification of Germany', 'Hubble telescope launched'],
  1991: ['Soviet Union dissolves', 'First website goes live'], 1992: ['Maastricht Treaty creates the EU'],
  1994: ['Nelson Mandela elected president', 'Amazon founded'], 1995: ['Windows 95 launches', 'eBay takes off'],
  1997: ['Harry Potter book published', 'Deep Blue beats Kasparov', 'Hong Kong returns to China'], 1998: ['Google founded'],
  1999: ['Euro launched', 'Napster sparks music sharing', 'Y2K panic builds'], 2000: ['Dot-com bubble bursts', 'Sydney Olympics'],
  2001: ['September 11 attacks reshape the world', 'Wikipedia and iPod launch'], 2003: ['Human Genome Project completed', 'Concorde retires'],
  2004: ['Facebook founded at Harvard', 'Athens hosts the Summer Olympics', 'EU expands by 10 new member states'],
  2005: ['YouTube launches', 'Hurricane Katrina floods New Orleans'], 2006: ['Twitter founded', 'Italy wins the World Cup'],
  2007: ['First iPhone released', 'Global credit crunch begins'], 2008: ['Lehman Brothers collapses, global financial crisis', 'Bitcoin whitepaper published'],
  2009: ['Barack Obama inaugurated', 'Bitcoin network launches', 'Michael Jackson dies']
};
export const ALLNEWS: Record<number, string[]> = Object.assign({}, HIST, NEWS);

export const ERAS = [
  { from: 1920, to: 1929, name: 'Roaring Twenties', art: 'c-wine' }, { from: 1930, to: 1938, name: 'Great Depression', art: 'b-bank' },
  { from: 1939, to: 1945, name: 'World War II', art: 'j-pt' }, { from: 1946, to: 1956, name: 'Post-war boom', art: 'i-house' },
  { from: 1957, to: 1968, name: 'Space age & rock\u2019n\u2019roll', art: 'i-jet' }, { from: 1969, to: 1979, name: 'Moon landing & oil shocks', art: 's-oil' },
  { from: 1980, to: 1989, name: 'Yuppie decade', art: 'i-watch' }, { from: 1990, to: 1999, name: 'Dot-com boom', art: 'i-phone' },
  { from: 2000, to: 2007, name: 'Internet goes mainstream', art: 's-tech' }, { from: 2008, to: 2013, name: 'Global financial crisis & recovery', art: 'b-bank' },
  { from: 2014, to: 2019, name: 'Social media era', art: 'i-phone' }, { from: 2020, to: 2021, name: 'Pandemic era', art: 's-pharma' },
  { from: 2022, to: 2029, name: 'AI revolution', art: 's-ai' }, { from: 2030, to: 2049, name: 'Green & space future', art: 's-solar' },
  { from: 2050, to: 2100, name: 'The far future', art: 's-ai' }
];
export const eraOf = (y: number) => ERAS.find(e => y >= e.from && y <= e.to) || ERAS[ERAS.length - 1];

// v11.2 — YearEvents now carry four crisis dimensions beyond stocks/cash:
//   rates  — loan-rate multiplier during the crisis (1.5 = +50% interest/yr)
//   risk   — extra branch-closure probability (additive, 0.10 = +10%/yr)
//   demand — branch-mood multiplier (0.8 = -20% customer demand)
//   lasts  — crisis persists N years (1 = single year, default)
// Multi-year events (lasts>1) write a `crisis` state on GameState; the eff*
// helpers in engine.ts read it so biz/fac/loan/mood all carry the hit forward
// until the crisis clears on Jan 1. Stock and deposit shocks are also split
// into an instant slice and a 30/60-day delayed shock (processDay drains
// s.shocks) so crashes unfold over weeks rather than overnight.
export interface YearEvent {
  msg: string;
  stk?: Record<string, number>;
  dep?: number;
  biz?: number;
  fac?: number;
  cash?: number;
  rates?: number;   // v11.2 — loan-rate multiplier during the crisis
  risk?: number;     // v11.2 — extra branch-closure probability (additive)
  demand?: number;   // v11.2 — branch-mood multiplier (0..1 = down, >1 = up)
  lasts?: number;    // v11.2 — crisis persists N years (1 = single year)
}
export const YEAR_EVENTS: Record<number, YearEvent> = {
  1929: { msg: 'Wall Street Crash! Stocks collapse, banks hoard cash.', stk: { '*': .5 }, biz: .7, rates: 1.6, risk: 0.10, demand: .8, lasts: 3 },
  1931: { msg: 'Banks fail across the world. Depositors lose 30% of savings.', dep: .7, biz: .85, rates: 1.4, risk: 0.06, lasts: 2 },
  1939: { msg: 'War breaks out in Europe. Trade collapses.', biz: .65, risk: 0.04, lasts: 2 },
  1941: { msg: 'The war economy ramps up. Factories boom!', biz: 1.3, fac: 1.5 },
  1945: { msg: 'Victory celebrations and the baby boom. Consumers spend!', biz: 1.2, cash: 1000 },
  1957: { msg: 'Sputnik launch. Science and engineering are the future.', stk: { TECH: 1.25 } },
  1969: { msg: 'Moon landing! Technology stocks surge.', stk: { TECH: 1.4 } },
  1973: { msg: 'Oil crisis! Fuel prices quadruple, recession looms.', stk: { OIL: 1.9, '*': .85 }, biz: .85, rates: 1.4, risk: 0.06, demand: .85, lasts: 2 },
  1979: { msg: 'Second oil shock squeezes the economy.', stk: { OIL: 1.5, '*': .9 }, biz: .9, rates: 1.3, demand: .9, lasts: 2 },
  1987: { msg: 'Black Monday: markets crash worldwide.', stk: { '*': .72 }, biz: .9, rates: 1.2, risk: 0.03, lasts: 1 },
  1995: { msg: 'The web goes commercial. Dot-com mania begins.', stk: { TECH: 2 } },
  2000: { msg: 'Dot-com bubble bursts.', stk: { TECH: .45, '*': .9 }, biz: .9, rates: 1.2, risk: 0.04, lasts: 2 },
  2001: { msg: 'Terror attacks shake markets.', stk: { '*': .85 }, biz: .9, risk: 0.03, lasts: 1 },
  2008: { msg: 'Global financial crisis! Real estate and banks tumble.', stk: { '*': .6, BANK: .5 }, biz: .8, rates: 1.6, risk: 0.10, demand: .8, lasts: 2 },
  2020: { msg: 'COVID-19 pandemic lockdowns the world.', stk: { PHARMA: 1.6, '*': .75 }, biz: .7, rates: 0.7, risk: 0.06, demand: .7, lasts: 1 },
  2021: { msg: 'Stimulus checks arrive as vaccines roll out.', cash: 1400, biz: 1.1 },
  2022: { msg: 'AI boom begins. NeuroAI surges.', stk: { AI: 1.8 } },
  2030: { msg: 'Fusion power milestone. Energy is cheap.', stk: { SOLAR: 1.7, OIL: .6 } },
  2040: { msg: 'First city on Mars announced. Space stocks soar.', stk: { TECH: 1.5, SKY: 1.6 } }
};

export const NATIONS = ['Vietnam', 'United States', 'United Kingdom', 'Japan', 'South Korea', 'France', 'Germany', 'Brazil', 'Nigeria', 'India', 'Australia', 'Canada'];

// v11 — name pools for the random-character button in the Intro.
export const NAME_POOLS: Record<string, string[]> = {
  Vietnam: ['Minh', 'Linh', 'Nam', 'Hoa', 'Dũng', 'Mai', 'Anh', 'Quân', 'Trang', 'Hùng'],
  'United States': ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Avery', 'Skyler', 'Drew'],
  'United Kingdom': ['Oliver', 'Amelia', 'Harry', 'Isla', 'George', 'Ava', 'Jack', 'Mia', 'Charlie', 'Sophie'],
  Japan: ['Haruto', 'Yui', 'Sota', 'Aoi', 'Yuto', 'Hina', 'Sora', 'Yuna', 'Ren', 'Sakura'],
  'South Korea': ['Min-jun', 'Seo-yeon', 'Ji-ho', 'Yu-jin', 'Joon-ho', 'So-eun', 'Tae-hyung', 'Ji-woo', 'Do-yoon', 'Ha-eun'],
  France: ['Lucas', 'Emma', 'Hugo', 'Léa', 'Louis', 'Chloé', 'Nathan', 'Manon', 'Theo', 'Camille'],
  Germany: ['Felix', 'Lena', 'Jonas', 'Mia', 'Max', 'Hannah', 'Paul', 'Sophie', 'Leon', 'Marie'],
  Brazil: ['Pedro', 'Ana', 'João', 'Beatriz', 'Lucas', 'Carla', 'Gabriel', 'Júlia', 'Rafael', 'Sofia'],
  Nigeria: ['Chidi', 'Amara', 'Emeka', 'Ngozi', 'Tunde', 'Chioma', 'Kunle', 'Zainab', 'Seyi', 'Folake'],
  India: ['Aarav', 'Diya', 'Vihaan', 'Ananya', 'Arjun', 'Aadhya', 'Rohan', 'Saanvi', 'Karan', 'Myra'],
  Australia: ['Jack', 'Charlotte', 'William', 'Olivia', 'Noah', 'Ava', 'Thomas', 'Mia', 'James', 'Grace'],
  Canada: ['Liam', 'Olivia', 'Noah', 'Emma', 'Lucas', 'Charlotte', 'William', 'Amelia', 'Benjamin', 'Sophia']
};

export const INTERESTS = [
  { id: 'cars', label: 'Cars & speed', art: 'i-lambo', w: { engineering: 2 } },
  { id: 'tech', label: 'Gadgets & tech', art: 'i-phone', w: { engineering: 2, science: 1 } },
  { id: 'fashion', label: 'Fashion & style', art: 'i-suit', w: { arts: 2, business: 1 } },
  { id: 'money', label: 'Money & markets', art: 's-coin', w: { business: 3 } },
  { id: 'sports', label: 'Sports & fitness', art: 'i-bike', w: { medicine: 1, business: 1 } },
  { id: 'art', label: 'Music & art', art: 'i-art', w: { arts: 3 } },
  { id: 'science', label: 'Science & nature', art: 'u-book', w: { science: 3 } },
  { id: 'helping', label: 'Helping people', art: 'j-nurse', w: { medicine: 3, science: 1 } },
  { id: 'travel', label: 'Travel & adventure', art: 'i-jet', w: { business: 1, arts: 1 } },
  { id: 'food', label: 'Food & farming', art: 'b-farm', w: { business: 2 } },
  { id: 'teaching', label: 'Teaching & writing', art: 'j-teach', w: { arts: 2, science: 1 } }
];
export const TALENTS = [
  { id: 'math', label: 'Math & logic', art: 's-tech', w: { engineering: 2, science: 2 } },
  { id: 'creative', label: 'Creativity & design', art: 'i-art', w: { arts: 3 } },
  { id: 'social', label: 'Speaking & leadership', art: 'j-mgr', w: { business: 3 } },
  { id: 'hands', label: 'Hands-on & mechanical', art: 'j-eng', w: { engineering: 3 } },
  { id: 'caring', label: 'Patience & caring', art: 'j-nurse', w: { medicine: 3 } },
  { id: 'focus', label: 'Discipline & focus', art: 'u-univ', w: { science: 2, medicine: 1 } }
];

// v10.5 — Relationships NPCs. Each character has their own interests,
// nation, career arc, and personality. The player's friendship score with
// each is computed from shared interests (each shared interest = +5 base)
// minus clashing vibes (each interest the player DOESN'T share = -2 base),
// plus the history of interactions recorded in state.relations[id].
export interface NPCDef {
  id: string;
  name: string;
  gender: 'm' | 'f';
  nation: string;
  age: number;
  career: string;
  interests: string[];
  vibe: 'calm' | 'ambitious' | 'artistic' | 'analytical' | 'warm' | 'irreverent';
  blurb: string; // one-line intro shown in the relations tab
  art: string;
}
export const NPCS: NPCDef[] = [
  { id: 'minh', name: 'Minh Trần', gender: 'm', nation: 'Vietnam', age: 28, career: 'Software engineer', interests: ['tech', 'science', 'sports'], vibe: 'analytical', blurb: 'Builds things late at night, runs at dawn. Will debate architecture for hours.', art: 'j-eng' },
  { id: 'linh', name: 'Linh Nguyễn', gender: 'f', nation: 'Vietnam', age: 31, career: 'Fashion designer', interests: ['fashion', 'art', 'travel'], vibe: 'artistic', blurb: 'Cut her first pattern at 14. Now shows in Paris and Hanoi. Hates small talk.', art: 'i-suit' },
  { id: 'alex', name: 'Alex Reyes', gender: 'm', nation: 'United States', age: 35, career: 'Venture capitalist', interests: ['money', 'tech', 'food'], vibe: 'ambitious', blurb: 'Says no to ninety-nine ideas to find the hundredth. The yes is legendary.', art: 'j-mgr' },
  { id: 'sofia', name: 'Sofía Marín', gender: 'f', nation: 'Spain', age: 27, career: 'Chef & restaurateur', interests: ['food', 'travel', 'helping'], vibe: 'warm', blurb: 'Trained in her grandmother\'s kitchen. Now three Michelin stars and a soup kitchen.', art: 'b-cafe' },
  { id: 'ravi', name: 'Ravi Krishnan', gender: 'm', nation: 'India', age: 40, career: 'Cardiac surgeon', interests: ['science', 'helping', 'sports'], vibe: 'calm', blurb: 'Quiet hands, loud results. Saved two thousand hearts and counting.', art: 'j-surg' },
  { id: 'yuki', name: 'Yuki Sato', gender: 'f', nation: 'Japan', age: 24, career: 'Indie game developer', interests: ['art', 'tech', 'teaching'], vibe: 'irreverent', blurb: 'Shipped her first game from a dorm room. Refuses to grow up; grows anyway.', art: 'j-eng' },
  { id: 'omar', name: 'Omar Haddad', gender: 'm', nation: 'Morocco', age: 45, career: 'Architecture professor', interests: ['art', 'science', 'teaching'], vibe: 'calm', blurb: 'Designs buildings that breathe. His students become the next generation\'s designers.', art: 'u-univ' },
  { id: 'priya', name: 'Priya Sharma', gender: 'f', nation: 'India', age: 33, career: 'Biotech founder', interests: ['science', 'money', 'helping'], vibe: 'ambitious', blurb: 'Wants to cure a disease before 40. Already has two patents and a series B.', art: 'j-mgr' },
];
export const NPC_BY: Record<string, NPCDef> = Object.fromEntries(NPCS.map(n => [n.id, n]));

// v10.5 — pets. Each pet type has an upfront adoption cost, a monthly
// upkeep, and a passive bonus (spirit / fame / health). Happiness decays
// if not cared for; low happiness reduces the bonus and can eventually
// drop the pet's health. The player can own up to 3 pets at once.
export interface PetDef {
  id: string;
  name: string;
  art: string;
  cost: number;       // adoption fee
  upkeep: number;     // monthly upkeep cost
  spiritBonus: number; // flat spirit regen per game-day when happy
  fameBonus: number;   // passive fame per game-year
  healthDrain: number; // health lost per game-day when neglected (happiness 0)
  blurb: string;
}
export const PETS: PetDef[] = [
  { id: 'dog', name: 'Dog', art: 'ic-paw', cost: 500, upkeep: 80, spiritBonus: 0.3, fameBonus: 0, healthDrain: 0, blurb: 'Loyal. Walks you as much as you walk it.' },
  { id: 'cat', name: 'Cat', art: 'ic-paw', cost: 300, upkeep: 50, spiritBonus: 0.25, fameBonus: 0, healthDrain: 0, blurb: 'Picks you. The contract is non-negotiable.' },
  { id: 'parrot', name: 'Parrot', art: 'ic-paw', cost: 1500, upkeep: 120, spiritBonus: 0.2, fameBonus: 1, healthDrain: 0, blurb: 'Outlives most plans. Will learn your best lines.' },
  { id: 'horse', name: 'Horse', art: 'ic-paw', cost: 8000, upkeep: 600, spiritBonus: 0.5, fameBonus: 3, healthDrain: 0, blurb: 'Riding clears the inbox in your head faster than email.' },
  { id: 'koi', name: 'Koi pond', art: 'ic-paw', cost: 5000, upkeep: 100, spiritBonus: 0.15, fameBonus: 2, healthDrain: 0, blurb: 'A living watercolour. Some outlive tycoons.' },
  { id: 'tiger', name: 'Tiger (exotic)', art: 'ic-paw', cost: 50000, upkeep: 2000, spiritBonus: 0.8, fameBonus: 12, healthDrain: 0.05, blurb: 'Not legal everywhere. Definitely a conversation starter.' },
];
export const PET_BY: Record<string, PetDef> = Object.fromEntries(PETS.map(p => [p.id, p]));
export const MAX_PETS = 3;
export const PATHS: Record<FieldKey, { jobs: string; biz: string }> = {
  business: { jobs: 'Accountant, Project manager, Marketing director, Executive director', biz: 'Convenience store, Boutique hotel, Private bank, Conglomerate' },
  engineering: { jobs: 'Software engineer, Lead engineer', biz: 'Factory, Software studio' },
  medicine: { jobs: 'Surgeon (after MD)', biz: 'Few options yet, start with a Boutique hotel or a Coffee shop' },
  science: { jobs: 'Lab researcher, Research scientist', biz: 'Software studio' },
  arts: { jobs: 'High school teacher', biz: 'Film studio' }
};
export function analyze(ints: string[], tals: string[]) {
  const sc: Record<FieldKey, number> = { business: 0, engineering: 0, medicine: 0, science: 0, arts: 0 };
  ints.forEach(id => { const it = INTERESTS.find(x => x.id === id); if (it) for (const f in it.w) sc[f as FieldKey] += it.w[f as FieldKey]!; });
  tals.forEach(id => { const it = TALENTS.find(x => x.id === id); if (it) for (const f in it.w) sc[f as FieldKey] += it.w[f as FieldKey]!; });
  const ranked = Object.keys(sc).sort((a, b) => sc[b as FieldKey] - sc[a as FieldKey]) as FieldKey[];
  const top = sc[ranked[0]] > 0 ? ranked[0] : null, second = sc[ranked[1]] > 0 ? ranked[1] : null;
  const perks: string[] = [];
  if (top) perks.push(FIELDS[top].name + ' tuition \u221220%');
  if (ints.includes('money')) perks.push('Starting savings +$5,000');
  if (ints.includes('sports') || tals.includes('hands')) perks.push('Side hustle +25%');
  if (tals.includes('focus')) perks.push('Degrees finish 10% sooner');
  return { sc, top, second, perks };
}

export const FIELDS: Record<FieldKey, { name: string; names: string[]; years: number[]; tuition: number[]; maxAge: number[]; art: string; schools: string[]; roadmap: { goal: string; strengths: string; careers: string } }> = {
  business: { name: 'Business', names: ['BBA', 'MBA'], years: [4, 2], tuition: [5000, 10000], maxAge: [30, 36], art: 'b-corp', schools: ['Wharton (Penn)', 'Harvard Business School', 'Stanford GSB', 'INSEAD', 'London Business School', 'CEIBS Shanghai'], roadmap: { goal: 'Run and grow companies; raise capital; eventually IPO.', strengths: 'Income multiplies with every branch + business degree level. MBA unlocks the Executive director role and the found-your-own-club path.', careers: 'Accountant → Marketing director → Executive director → Conglomerate founder.' } },
  engineering: { name: 'Engineering', names: ['B.Eng', 'M.Eng'], years: [4, 2], tuition: [6000, 12000], maxAge: [30, 36], art: 'j-eng', schools: ['MIT', 'Stanford', 'ETH Zürich', 'IIT Bombay', 'Tsinghua', 'Tokyo Tech'], roadmap: { goal: 'Build products, factories, and tech ventures.', strengths: 'Engineering degree unlocks the Factory and Software studio — the highest-margin businesses. M.Eng lifts you to Lead engineer ($135K).', careers: 'Software engineer → Lead engineer → Factory owner → Tech studio founder.' } },
  medicine: { name: 'Medicine', names: ['Pre-med B.Sc.', 'MD'], years: [4, 4], tuition: [5000, 30000], maxAge: [30, 36], art: 'j-surg', schools: ['Johns Hopkins', 'Harvard Medical', 'Oxford Medical', 'Karolinska', 'AIIMS Delhi', 'University of Tokyo Medical'], roadmap: { goal: 'Cure people, then build a healthcare empire.', strengths: 'MD unlocks Surgeon ($280K/yr — the highest single-job income). Long road (8 years total) but the payoff is unmatched.', careers: 'Pre-med → MD → Surgeon → Healthcare administrator → Biotech founder.' } },
  science: { name: 'Science', names: ['B.Sc.', 'M.Sc.', 'PhD'], years: [4, 2, 4], tuition: [5000, 10000, 0], maxAge: [30, 36, 40], art: 'u-book', schools: ['Caltech', 'Cambridge', 'Max Planck', 'ENS Paris', 'Peking University', 'Seoul National University'], roadmap: { goal: 'Discover, publish, and commercialise research.', strengths: 'PhD is FUNDED (zero tuition) and unlocks Research scientist ($140K). The cleanest path for players who want to avoid debt.', careers: 'Lab researcher → Research scientist → Biotech founder → Conglomerate R&D division.' } },
  arts: { name: 'Arts', names: ['B.A.', 'M.A.'], years: [4, 2], tuition: [4000, 8000], maxAge: [30, 36], art: 'u-univ', schools: ['RISD', 'Central Saint Martins', 'École des Beaux-Arts', 'Pratt', 'Tokyo Geidai', 'Yale School of Art'], roadmap: { goal: 'Create, perform, and build a media empire.', strengths: 'Arts degree + Engineering minor unlocks Product designer. Arts + Business unlocks Film studio — the biggest single-business income.', careers: 'Product designer → Film studio founder → Streaming-city mogul → Cultural conglomerate.' }
} };

// v11 — short / accelerated courses. Cheaper and faster than a full degree
// but only grant a partial skill boost (counted as degree level 0.5 — they
// don't unlock degree-gated jobs on their own, but they DO reduce tuition
// of the matching full degree by 10% and add a small income bonus).
export interface ShortCourseDef { id: string; name: string; field: FieldKey; days: number; cost: number; art: string; blurb: string }
export const SHORT_COURSES: ShortCourseDef[] = [
  { id: 'bootcamp', name: 'Coding bootcamp (90 days)', field: 'engineering', days: 90, cost: 8000, art: 'j-eng', blurb: 'Intensive. Halves the time to a B.Eng later. +5% to engineering gig pay.' },
  { id: 'mba-fast', name: 'Executive MBA fast-track (1 year)', field: 'business', days: 365, cost: 25000, art: 'b-corp', blurb: 'For professionals who already work. Counts as half an MBA; unlocks Accounting gig.' },
  { id: 'first-aid', name: 'First-responder first aid (30 days)', field: 'medicine', days: 30, cost: 1200, art: 'j-nurse', blurb: 'Quick medical literacy. +3% to medical gig pay; small spirit boost.' },
  { id: 'stats', name: 'Statistics intensive (60 days)', field: 'science', days: 60, cost: 4000, art: 'u-book', blurb: 'Data literacy. Halves M.Sc. time later; +5% to research gig pay.' },
  { id: 'design', name: 'Design fundamentals (45 days)', field: 'arts', days: 45, cost: 3000, art: 'i-art', blurb: 'Visual thinking. Halves B.A. time later; +5% to social-post likes.' },
  { id: 'real-estate', name: 'Real-estate licence prep (60 days)', field: 'business', days: 60, cost: 3500, art: 'i-house', blurb: 'Property literacy. +10% to property resale value; counts toward BBA.' },
];
export const SHORT_BY: Record<string, ShortCourseDef> = Object.fromEntries(SHORT_COURSES.map(c => [c.id, c]));
export const LICENSES = [
  { id: 'moto', name: 'Motorcycle licence', cost: 350, days: 30, art: 'i-bike' },
  { id: 'car', name: "Driver's licence (car)", cost: 600, days: 60, art: 'i-lambo' },
  { id: 'boat', name: 'Boating licence', cost: 1500, days: 90, art: 'i-yacht' },
  { id: 'pilot', name: 'Private pilot licence', cost: 20000, days: 365, art: 'i-jet' },
  { id: 'mechanic', name: 'Mechanic certification', cost: 2500, days: 120, art: 'i-handbag' }
];
export const LIC_BY = Object.fromEntries(LICENSES.map(l => [l.id, l]));
export const LIC_FOR: Record<string, string> = { 'Sport bike': 'moto', 'Car': 'car' };
// v11 — Yacht and Private jet no longer require a licence. The player can
// hire a crew instead (monthly cost). If the player DOES have the relevant
// licence (boat / pilot), the crew cost is halved (they can self-drive part
// of the time). Items without crewCost stay at 0.
export const CREW_COST: Record<string, number> = {
  'Yacht': 50000,        // $50K/month for a small yacht crew
  'Private jet': 200000, // $200K/month for pilots + cabin crew
};

export const STAGES = [
  { to: 22, name: 'Student', art: 'u-univ', color: '#2ec4b6' },
  { to: 26, name: 'Young worker', art: 'j-clerk', color: '#ff9f1c' },
  { to: 65, name: 'Career', art: 'j-mgr', color: '#ff5d8f' },
  { to: 91, name: 'Retirement', art: 'st-ret', color: '#9d4edd' }
];
export interface BizDef { id: string; name: string; base: number; inc: number; art: string; req: Req; ind: string; reg: string[] }
export interface Req { any?: number; deg?: Partial<Record<FieldKey, number>>; lic?: string[]; age?: number }
export const BIZ: BizDef[] = [
  { id: 'cafe', name: 'Coffee shop', base: 800, inc: 1500, art: 'b-cafe', req: {}, ind: 'Food', reg: ['Hanoi Old Quarter', 'Ho Chi Minh City District 1', 'Brooklyn Williamsburg', 'Tokyo Ginza', 'Paris Le Marais', 'London Shoreditch'] },
  { id: 'shop', name: 'Convenience store', base: 8000, inc: 12000, art: 'b-shop', req: { deg: { business: 1 } }, ind: 'Retail', reg: ['Singapore Orchard Road', 'Bangkok Sukhumvit', 'Seoul Myeongdong', 'New York Times Square', 'Berlin Mitte', 'São Paulo Paulista'] },
  { id: 'street', name: 'Street food stall', base: 300, inc: 700, art: 'b-cafe', req: {}, ind: 'Food', reg: ['Hanoi Old Quarter', 'Bangkok Yaowarat', 'Penang Georgetown', 'Taipei Shilin', 'Mexico City Centro', 'Marrakech Jemaa'] },
  { id: 'gym', name: 'Boutique gym', base: 25000, inc: 40000, art: 'b-shop', req: { deg: { business: 1 } }, ind: 'Services', reg: ['Los Angeles Venice', 'Miami South Beach', 'Sydney Bondi', 'Singapore Tanjong', 'Dubai Marina', 'Berlin Mitte'] },
  { id: 'salon', name: 'Beauty salon chain', base: 18000, inc: 32000, art: 'b-shop', req: { deg: { business: 1 } }, ind: 'Services', reg: ['Seoul Gangnam', 'Tokyo Omotesando', 'Bangkok Thonglor', 'Taipei Xinyi', 'Shanghai Jingan', 'Ho Chi Minh City District 2'] },
  { id: 'farm', name: 'Organic farm', base: 60000, inc: 90000, art: 'b-farm', req: { deg: { business: 1 } }, ind: 'Agriculture', reg: ['Mekong Delta, Vietnam', 'Napa Valley, California', 'Hokkaido, Japan', 'Tuscany, Italy', 'Punjab, India', 'Normandy, France'] },
  { id: 'fac', name: 'Factory', base: 90000, inc: 160000, art: 'b-fac', req: { deg: { engineering: 1 } }, ind: 'Industry', reg: ['Shenzhen, China', 'Detroit, Michigan', 'Busan, South Korea', 'Ruhr, Germany', 'Pune, India', 'Monterrey, Mexico'] },
  { id: 'restaurant', name: 'Restaurant chain', base: 120000, inc: 220000, art: 'b-cafe', req: { deg: { business: 1 } }, ind: 'Food', reg: ['Tokyo Ginza', 'New York West Village', 'Paris Marais', 'Singapore Dempsey', 'Bangkok Sukhumvit', 'London Soho'] },
  { id: 'logistics', name: 'Logistics & courier', base: 350000, inc: 580000, art: 'b-fac', req: { deg: { engineering: 1 } }, ind: 'Services', reg: ['Shenzhen, China', 'Rotterdam Port', 'Singapore Tuas', 'Memphis, Tennessee', 'Dubai South', 'Incheon, Korea'] },
  { id: 'clinic', name: 'Private clinic', base: 500000, inc: 850000, art: 'b-bank', req: { deg: { medicine: 1 } }, ind: 'Health', reg: ['Singapore Orchard', 'Zurich Bahnhofstrasse', 'Boston Longwood', 'Seoul Gangnam', 'Dubai Healthcare', 'Bangkok Sukhumvit'] },
  { id: 'school', name: 'Private school', base: 800000, inc: 1300000, art: 'b-bank', req: { deg: { arts: 1, business: 1 } }, ind: 'Education', reg: ['Boston, Massachusetts', 'Oxford, UK', 'Singapore Bukit', 'Tokyo Hiroo', 'Geneva, Switzerland', 'Melbourne, Australia'] },
  { id: 'realestate', name: 'Real estate dev', base: 2000000, inc: 3200000, art: 'b-ret', req: { deg: { business: 2 } }, ind: 'Real Estate', reg: ['Dubai Marina', 'Singapore Marina Bay', 'Hong Kong Central', 'Miami Brickell', 'London Canary Wharf', 'Tokyo Roppongi'] },
  { id: 'hotel', name: 'Boutique hotel', base: 2500000, inc: 3500000, art: 'b-hotel', req: { deg: { business: 2 } }, ind: 'Tourism', reg: ['Bali Seminyak', 'Santorini Oia', 'Aspen, Colorado', 'Lake Como, Italy', 'Marrakech Medina', 'Maldives Atoll'] },
  { id: 'ret', name: 'Retail chain', base: 900000, inc: 1500000, art: 'b-ret', req: { deg: { business: 1 } }, ind: 'Retail', reg: ['Dubai Mall', 'Tokyo Ginza Six', 'New York Fifth Ave', 'Paris Champs-Élysées', 'London Oxford Street', 'Shanghai Nanjing Road'] },
  { id: 'esports', name: 'Esports arena', base: 3500000, inc: 5500000, art: 'b-tech', req: { deg: { arts: 1 } }, ind: 'Media', reg: ['Seoul Gangnam', 'Shanghai Jingan', 'Los Angeles', 'Stockholm', 'Berlin', 'Tokyo Akihabara'] },
  { id: 'tech', name: 'Software studio', base: 6000000, inc: 9000000, art: 'b-tech', req: { deg: { engineering: 1 } }, ind: 'Tech', reg: ['Silicon Valley, Palo Alto', 'Tel Aviv Startup Strip', 'Bangalore Electronic City', 'Berlin Silicon Allee', 'Singapore One-North', 'Stockholm Kista'] },
  { id: 'franchise', name: 'Franchise network', base: 8000000, inc: 14000000, art: 'b-ret', req: { deg: { business: 2 } }, ind: 'Franchise', reg: ['Global', 'Global', 'Global', 'Global', 'Global', 'Global'] },
  { id: 'bank', name: 'Private bank', base: 12000000, inc: 22000000, art: 'b-bank', req: { deg: { business: 2 } }, ind: 'Finance', reg: ['Wall Street, NYC', 'London City', 'Zurich Bahnhofstrasse', 'Hong Kong Central', 'Singapore Marina Bay', 'Frankfurt Bankenviertel'] },
  { id: 'studio', name: 'Film studio', base: 40000000, inc: 60000000, art: 'b-studio', req: { deg: { arts: 1, business: 1 } }, ind: 'Media', reg: ['Hollywood, Los Angeles', 'Bollywood, Mumbai', 'Pinewood, London', 'Nollywood, Lagos', 'Hallyuwood, Seoul', 'Cinecittà, Rome'] },
  { id: 'corp', name: 'Conglomerate', base: 150000000, inc: 280000000, art: 'b-corp', req: { deg: { business: 2 } }, ind: 'Diversified', reg: ['Tokyo Marunouchi HQ', 'Seoul Gangnam HQ', 'Manila BGC HQ', 'Mumbai BKC HQ', 'Istanbul Levent HQ', 'São Paulo Faria Lima HQ'] }
];
export interface LineDef { id: string; name: string; since: number; cost: number; inc: number; food?: boolean; needs?: string; farm?: boolean; fac?: boolean }
export const FARM_LINES: LineDef[] = [
  { id: 'crop', name: 'Staple crops', since: 1900, cost: 20000, inc: 30000, farm: true },
  { id: 'dairy', name: 'Dairy & livestock', since: 1920, cost: 60000, inc: 80000, farm: true },
  { id: 'orchard', name: 'Orchards & coffee', since: 1935, cost: 120000, inc: 150000, farm: true },
  { id: 'fishery', name: 'Aquaculture', since: 1960, cost: 250000, inc: 300000, farm: true },
  { id: 'green', name: 'Hydroponic greenhouses', since: 1985, cost: 600000, inc: 700000, farm: true },
  { id: 'solarfarm', name: 'Agrivoltaic solar fields', since: 2010, cost: 1500000, inc: 2000000, farm: true }
];
export const FAC_LINES: LineDef[] = [
  { id: 'cannery', name: 'Cannery (farm supply)', since: 1900, cost: 50000, inc: 70000, food: true, fac: true },
  { id: 'textile', name: 'Textile mill', since: 1920, cost: 90000, inc: 110000, fac: true },
  { id: 'assembly', name: 'Appliance assembly', since: 1960, cost: 400000, inc: 500000, fac: true },
  { id: 'solarfac', name: 'Solar panel plant', since: 2000, cost: 1200000, inc: 1500000, fac: true },
  { id: 'ev', name: 'EV assembly plant', since: 2010, cost: 5000000, inc: 6500000, needs: 'assembly', fac: true },
  { id: 'chip', name: 'Semiconductor fab', since: 2020, cost: 20000000, inc: 30000000, fac: true }
];
// v13.2 — mythic tier added ABOVE legendary for ultra-limited items (1-10
// exist globally). RARITY_MULT=8 (vs legendary=4) so mythic resale prices
// tower over even legendary grails. RARITY_COLOR crimson red stands apart
// from the gold legendary chip. itemRarity() only returns 'mythic' when an
// item explicitly opts in (it.rarity === 'mythic') AND has lux >= 5000;
// the auto-derivation never spontaneously produces a mythic tier.
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
export const RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1.4, rare: 2.2, legendary: 4, mythic: 8 };
export const RARITY_COLOR: Record<Rarity, string> = { common: '#78725f', uncommon: '#3a5a99', rare: '#5b3da3', legendary: '#a16207', mythic: '#e11d48' };
export interface ItemDef { id: string; cat: string; brand?: string; name: string; c: string; price: number; lux: number; rate: number; art: string; rarity?: Rarity; stock?: number }
// v11.58 — ITEMS now loads from /public/items.json (single source of truth).
// `as ItemDef[]` because the JSON import is typed as a plain object.
export const ITEMS: ItemDef[] = itemsData.items as ItemDef[];
// v10.5 — derive rarity from luxury tier if not set explicitly.
// 0-9 common · 10-49 uncommon · 50-299 rare · 300+ legendary.
// v13.2 — mythic is OPT-IN only: an item is mythic iff it.rarity==='mythic'
// AND lux >= 5000. The auto-derivation otherwise never produces mythic, so
// existing items keep their current tier.
export function itemRarity(it: { rarity?: Rarity; lux: number }): Rarity {
  if (it.rarity === 'mythic' && (it.lux || 0) >= 5000) return 'mythic';
  if (it.rarity && it.rarity !== 'mythic') return it.rarity;
  const l = it.lux || 0;
  if (l >= 300) return 'legendary';
  if (l >= 50) return 'rare';
  if (l >= 10) return 'uncommon';
  return 'common';
}
// ================= v11.33 — RARE LOOTS (auction-only grails) =================
// "Đồ hiếm thật, giá trị thật": these pieces NEVER appear in any shop
// catalogue — the only way to own one is the scheduled RARE AUCTION where
// NPC collectors bid against the player (see tickRareAuctions in engine.ts).
// They still live in ITEM_BY so owned lots / resale / repair all work.
export const RARE_ITEMS: ItemDef[] = itemsData.rareItems as ItemDef[];
export const RARE_IDS = new Set(RARE_ITEMS.map(i => i.id));
export const ITEM_BY: Record<string, ItemDef> = Object.fromEntries([...ITEMS, ...RARE_ITEMS].map(i => [i.id, i]));

// v11.58 — runtime loader for client-side use. Re-fetches /items.json over the
// network (so a freshly generated item — POST /api/items/generate → server
// appends to a runtime registry — can be picked up without a full reload).
// Falls back to the synchronously-imported data on any error (SSR, offline,
// older build without the route). Returns the three pools the engine needs.
export interface LoadedItems {
  items: ItemDef[];
  rareItems: ItemDef[];
  usedMarket: UsedItem[];
}
export async function loadItems(): Promise<LoadedItems> {
  if (typeof fetch !== 'undefined') {
    try {
      const base = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BASE_PATH) || '';
      const res = await fetch(base + '/items.json', { cache: 'no-store' });
      if (res.ok) {
        const j = (await res.json()) as Partial<LoadedItems>;
        if (Array.isArray(j.items) && Array.isArray(j.rareItems) && Array.isArray(j.usedMarket)) {
          return {
            items: j.items as ItemDef[],
            rareItems: j.rareItems as ItemDef[],
            usedMarket: j.usedMarket as UsedItem[],
          };
        }
      }
    } catch { /* fall through to the static import */ }
  }
  return { items: ITEMS, rareItems: RARE_ITEMS, usedMarket: USED_MARKET };
}

// v11.58 — register a freshly generated item (LLM-produced) into the runtime
// pool. Mutates ITEMS + ITEM_BY so the new item is immediately buyable in the
// AssetsTab. Idempotent: re-registering an existing id is a no-op.
export function registerItem(item: ItemDef): void {
  if (ITEM_BY[item.id]) return;
  ITEMS.push(item);
  ITEM_BY[item.id] = item;
}

// v11.33 — the three BUY catalogue groups requested by players:
//   'bds'    Bất động sản — all Property
//   'lux'    Đồ cao cấp   — luxury tier (lux score >= 15)
//   'budget' Đồ bình dân  — everyday goods (lux < 15)
// Rare/legendary grails above are NOT in ITEMS so they never show here.
export type ItemGroup = 'bds' | 'lux' | 'budget';
export function itemGroup(it: { cat: string; lux: number }): ItemGroup {
  if (it.cat === 'Property') return 'bds';
  return it.lux >= 15 ? 'lux' : 'budget';
}

// v11.18 — real-world item photos. Mapped by item id; falls back to the SVG
// <Art> icon when no photo is available. Photos are compressed to ~800px wide.
// v11.18 expanded the photo set from 10 → 30 entries via image-search fetches.
export const ITEM_IMAGES: Record<string, string> = {
  // original 10 photos
  'c-lambo': '/img/items/lambo.jpg',
  'c-rr': '/img/items/rr.jpg',
  'c-porsche': '/img/items/porsche.jpg',
  'c-tesla': '/img/items/tesla.jpg',
  'w-rolex': '/img/items/rolex.jpg',
  'w-patek': '/img/items/patek.jpg',
  'bike-panigale': '/img/items/panigale.jpg',
  'a-contemp': '/img/items/art.jpg',
  'p-gulf': '/img/items/gulf.jpg',
  'y-sunseeker': '/img/items/yacht.jpg',
  // v11.18 — new photos fetched via image-search
  'bike-ktm': '/img/items/ktm.jpg',
  'w-omega': '/img/items/omega.jpg',
  'w-ap': '/img/items/ap.jpg',
  'w-tag': '/img/items/tag.jpg',
  'w-casio': '/img/items/casio.jpg',
  'c-ferrari': '/img/items/ferrari.jpg',
  'c-bmw': '/img/items/bmw.jpg',
  'c-toyota': '/img/items/toyota.jpg',
  'ph-iphone': '/img/items/iphone.jpg',
  'j-cartier': '/img/items/cartier.jpg',
  'j-tiffany': '/img/items/tiffany.jpg',
  'h-penthouse': '/img/items/penthouse.jpg',
  'h-villa': '/img/items/villa.jpg',
  'h-island': '/img/items/island.jpg',
  'y-azimut': '/img/items/azimut.jpg',
  'p-cessna': '/img/items/cessna.jpg',
  's-armani': '/img/items/armani.jpg',
  // collectibles
  'col-goldcoin': '/img/items/goldcoin.jpg',
  'col-stamp': '/img/items/stamp.jpg',
  'col-wine': '/img/items/wine.jpg',
};
// Same mapping keyed by USED_MARKET listing id — used listings inherit the
// photo of their base item when available. v11.18: re-pointed at the new
// real photos where the base item now has one (Toyota Camry → toyota.jpg
// instead of the old lambo.jpg fallback).
export const USED_IMAGES: Record<string, string> = {
  'u-camry-12y': '/img/items/toyota.jpg',
  'u-3-series-8y': '/img/items/bmw.jpg',
  'u-911-22y': '/img/items/porsche.jpg',
  'u-tesla-4y': '/img/items/tesla.jpg',
  'u-submariner-30y': '/img/items/rolex.jpg',
  'u-speedmaster-45y': '/img/items/omega.jpg',
  'u-carrera-15y': '/img/items/tag.jpg',
  'u-impress-50y': '/img/items/art.jpg',
  'u-contemp-3y': '/img/items/art.jpg',
  'u-ghost-5y': '/img/items/rr.jpg',
  'u-panigale-6y': '/img/items/panigale.jpg',
  'u-cbr-10y': '/img/items/panigale.jpg',
};

// ---- v10.4: used market — buy/sell pre-owned cars, watches, art at a discount
// vs new, but each unit carries an ageYears + condition rating that drives its
// resale price and upkeep. Listings appear with randomised condition; the
// player can also list owned lots on social for a chance at premium offers.
export interface UsedItem {
  id: string;            // listing id (unique perused listing)
  baseId: string;        // references ITEMS[].id
  name: string;          // display name (NO absolute years — use ageYears instead)
  brand?: string;
  cat: string;
  c: string;
  art: string;
  ageYears: number;      // 0..40
  condition: number;     // 0..100 (100 = mint, 0 = scrap)
  askPrice: number;      // what the seller is asking right now
  newPrice: number;      // price of an equivalent new unit (for reference)
  lux: number;
  rate: number;          // appreciation/depreciation rate inherited from the item
  story: string;         // one-line backstory shown in the listing
  since: number;         // v10.5: the real-world year this model first existed — used to filter the market by era
}
export const USED_MARKET: UsedItem[] = itemsData.usedMarket as UsedItem[];
// Static pool of rotating listings shown to the player — at any given visit,
// we surface a deterministic-ish 6-8 slice derived from USED_MARKET + a small
// random shuffle seed stored in state.
export const USED_MARKET_BY = Object.fromEntries(USED_MARKET.map(u => [u.id, u]));

// ---- v10.4: Hall of Fame — curated list of real-world icons + their note.
// Renders as a separate tab under the World group, next to Ranking. The
// player's own run also writes a Hall entry on game over (saved to state).
export interface HallEntry {
  id: string;
  name: string;
  nation: string;
  era: string;          // human-readable era label
  industry: string;
  peakNetWorth: string; // human-readable, can be a number-string or a label like "undisclosed"
  note: string;         // one-line quote / legacy note (EN, can be translated at display if desired)
  kind: 'real' | 'player' | 'rival';
}
export const HALL_OF_FAME: HallEntry[] = [
  { id: 'h-rockefeller', name: 'John D. Rockefeller', nation: 'United States', era: 'Gilded Age', industry: 'Oil', peakNetWorth: '~$400B (in today\'s dollars)', note: 'Founded Standard Oil; gave away more than half his fortune before he died.', kind: 'real' },
  { id: 'h-ford', name: 'Henry Ford', nation: 'United States', era: 'Roaring Twenties', industry: 'Manufacturing', peakNetWorth: '~$200B equivalent', note: 'Put the world on wheels with the Model T and the assembly line.', kind: 'real' },
  { id: 'h-esteelauder', name: 'Estée Lauder', nation: 'United States', era: 'Post-war boom', industry: 'Beauty', peakNetWorth: 'Undisclosed (private)', note: 'Built a cosmetics empire one jar at a time, then gave women a seat in the boardroom.', kind: 'real' },
  { id: 'h-onassis', name: 'Aristotle Onassis', nation: 'Greece', era: 'Mid-century', industry: 'Shipping', peakNetWorth: '~$500M (1960s)', note: 'Owned the world\'s largest private tanker fleet and a private island.', kind: 'real' },
  { id: 'h-walton', name: 'Sam Walton', nation: 'United States', era: 'Late 20th century', industry: 'Retail', peakNetWorth: '~$8B at death', note: 'Drove a pickup truck to work while building the largest retailer on Earth.', kind: 'real' },
  { id: 'h-ikea', name: 'Ingvar Kamprad', nation: 'Sweden', era: 'Late 20th century', industry: 'Retail', peakNetWorth: '~$40B+', note: 'Flew economy, bought clothes at flea markets — and sold furniture to the world.', kind: 'real' },
  { id: 'h-buffett', name: 'Warren Buffett', nation: 'United States', era: 'Modern era', industry: 'Finance', peakNetWorth: '~$100B+', note: 'Pledged 99% of his wealth away. Still lives in the house he bought in 1958.', kind: 'real' },
  { id: 'h-ma', name: 'Jack Ma', nation: 'China', era: 'Internet era', industry: 'Tech', peakNetWorth: '~$40B+', note: 'Was an English teacher before Alibaba. "Today is hard, tomorrow is worse, but the day after tomorrow is sunshine."', kind: 'real' },
  { id: 'h-musk', name: 'Elon Musk', nation: 'United States', era: '2020s', industry: 'Tech / Space', peakNetWorth: '~$200B+', note: 'Slept on the factory floor when Tesla nearly went under. Reusable rockets changed the economics of space.', kind: 'real' },
  { id: 'h-zhou', name: 'Zhou Qunfei', nation: 'China', era: '2010s', industry: 'Manufacturing', peakNetWorth: '~$10B+', note: 'Started as a factory worker; built Lens Technology into a glass-screen empire.', kind: 'real' },
  { id: 'h-dangote', name: 'Aliko Dangote', nation: 'Nigeria', era: 'Modern era', industry: 'Industry', peakNetWorth: '~$10B+', note: 'Built Africa\'s largest conglomerate from a small trading firm.', kind: 'real' },
  { id: 'h-strive', name: 'Strive Masiyiwa', nation: 'Zimbabwe / UK', era: '2000s', industry: 'Telecom', peakNetWorth: '~$1B+', note: 'Won a 5-year court battle to break the telecom monopoly. Then wired a continent.', kind: 'real' },
];

// v11.19 — base prices updated to real-world-inspired values (approximate
// late-2024 levels). The fictional ticker names stay (game fiction + save-
// state compatibility) but the price + volatility levels now feel like real
// markets: large-cap tech ~$230, banking ~$60 (steady), EV ~$250, oil ~$75,
// crypto fund ~$95 (BTC proxy), pharma ~$85, retail ~$55, solar ~$35,
// AI frontier ~$580, airline ~$30.
// The game still drives prices via a deterministic random walk per game-day;
// these are the seed values for a fresh game.
export const STOCKS = [
  { id: 'TECH', name: 'Nova Technologies (large-cap tech)', p: 230, vol: .035, art: 's-tech' },
  { id: 'BANK', name: 'Continental Banking Group', p: 60, vol: .02, art: 'b-bank' },
  { id: 'OIL', name: 'Petrorig Global Energy', p: 75, vol: .04, art: 's-oil' },
  { id: 'COIN', name: 'Ledger crypto fund (BTC proxy)', p: 95, vol: .09, art: 's-coin' },
  { id: 'PHARMA', name: 'Helix BioPharma', p: 85, vol: .03, art: 's-pharma' },
  { id: 'RETAIL', name: 'Metro Retail Holdings', p: 55, vol: .025, art: 'b-ret' },
  { id: 'SOLAR', name: 'Solaris Dynamics', p: 35, vol: .045, art: 's-solar' },
  { id: 'AI', name: 'NeuroAI Labs (frontier AI)', p: 580, vol: .07, art: 's-ai' },
  { id: 'SKY', name: 'SkyAtlantic Airlines', p: 30, vol: .05, art: 'i-jet' }
];
export const CLUBS = [
  { id: 'wine', name: 'Wine Connoisseurs', min: 2000000, fee: 150000, mult: 1.15, art: 'c-wine' },
  { id: 'golf', name: 'Royal Golf Club', min: 500000, fee: 50000, mult: 1.1, art: 'c-golf' },
  { id: 'car', name: 'Supercar Club', min: 5000000, fee: 600000, mult: 1.25, art: 'i-lambo' },
  { id: 'polo', name: 'Polo & Equestrian', min: 20000000, fee: 1500000, mult: 1.35, art: 'c-polo' },
  { id: 'yacht', name: 'Yacht Club', min: 100000000, fee: 8000000, mult: 1.5, art: 'i-yacht' },
  { id: 'sky', name: 'Sky Lounge Penthouse', min: 300000000, fee: 20000000, mult: 1.7, art: 'c-sky' }
];
export interface JobDef { id: string; name: string; salary: number; req: Req; ft: boolean; art: string }
export const JOBS: JobDef[] = [
  { id: 'part', name: 'Part-time cashier', salary: 11000, req: {}, ft: false, art: 'j-pt' },
  { id: 'driver', name: 'Delivery driver', salary: 18000, req: { lic: ['car'] }, ft: false, art: 'j-driver' },
  { id: 'clerk', name: 'Office clerk', salary: 32000, req: { any: 1 }, ft: true, art: 'j-clerk' },
  { id: 'teacher', name: 'High school teacher', salary: 48000, req: { any: 1 }, ft: true, art: 'j-teach' },
  { id: 'accountant', name: 'Accountant', salary: 70000, req: { deg: { business: 1 } }, ft: true, art: 'j-clerk' },
  { id: 'nurse', name: 'Registered nurse', salary: 62000, req: { deg: { medicine: 1 } }, ft: true, art: 'j-nurse' },
  { id: 'mgr', name: 'Project manager', salary: 95000, req: { deg: { business: 1 }, age: 26 }, ft: true, art: 'j-mgr' },
  { id: 'eng', name: 'Software engineer', salary: 110000, req: { deg: { engineering: 1 }, age: 22 }, ft: true, art: 'j-eng' },
  { id: 'lead', name: 'Lead engineer', salary: 135000, req: { deg: { engineering: 2 }, age: 26 }, ft: true, art: 'j-eng' },
  { id: 'lab', name: 'Lab researcher', salary: 80000, req: { deg: { science: 2 } }, ft: true, art: 'u-book' },
  { id: 'scientist', name: 'Research scientist', salary: 140000, req: { deg: { science: 3 } }, ft: true, art: 'u-book' },
  { id: 'mkt', name: 'Marketing director', salary: 150000, req: { deg: { business: 2 }, age: 28 }, ft: true, art: 'b-corp' },
  { id: 'exec', name: 'Executive director', salary: 220000, req: { deg: { business: 2 }, age: 30 }, ft: true, art: 'b-corp' },
  { id: 'pilot', name: 'Commercial pilot', salary: 200000, req: { lic: ['pilot'], age: 21 }, ft: true, art: 'i-jet' },
  { id: 'surg', name: 'Surgeon', salary: 280000, req: { deg: { medicine: 2 } }, ft: true, art: 'j-surg' },
  { id: 'product', name: 'Product designer', salary: 96000, req: { deg: { engineering: 1, arts: 1 } }, ft: true, art: 'j-eng' },
  { id: 'healthadmin', name: 'Healthcare administrator', salary: 135000, req: { deg: { business: 1, medicine: 1 } }, ft: true, art: 'j-mgr' },
  { id: 'biotech', name: 'Biotech researcher', salary: 170000, req: { deg: { science: 2, medicine: 1 } }, ft: true, art: 'u-book' }
];
// Rivals: [name, age, nation, industry, base net worth]
export const BOTS: [string, number, string, string, number][] = [
  ['Alex Chen', 33, 'United States', 'Tech', 3e5], ['Sofia Rossi', 45, 'United Kingdom', 'Fashion', 1.2e6],
  ['Liam Walker', 51, 'Canada', 'Finance', 6e6], ['Yuki Tanaka', 38, 'Japan', 'Tech', 3e7],
  ['Omar Haddad', 57, 'France', 'Energy', 1.5e8], ['Mia Johnson', 29, 'Australia', 'Media', 7e8],
  ['Noah Kim', 41, 'South Korea', 'Industry', 3e9], ['Minh Nguyen', 26, 'Vietnam', 'Tech', 4.5e5],
  ['An Pham', 34, 'Vietnam', 'Food', 2.2e6], ['Chi Tran', 61, 'Vietnam', 'Retail', 8.5e7],
  ['Ravi Patel', 36, 'India', 'Tech', 9e7], ['Priya Sharma', 44, 'India', 'Pharma', 6.2e8],
  ['Amara Okafor', 31, 'Nigeria', 'Media', 1.8e6], ['Chidi Eze', 48, 'Nigeria', 'Energy', 4.1e8],
  ['Hans Müller', 55, 'Germany', 'Industry', 2.3e9], ['Lena Fischer', 27, 'Germany', 'Tech', 1.1e6],
  ['Pedro Silva', 42, 'Brazil', 'Agriculture', 5.5e8], ['Ana Souza', 24, 'Brazil', 'Media', 9e5],
  ['Grace Taylor', 39, 'United States', 'Finance', 1.9e9], ['Jack Morgan', 72, 'United States', 'Finance', 2.4e10],
  ['Sakura Sato', 22, 'Japan', 'Fashion', 3.8e5], ['Hiro Yamada', 66, 'Japan', 'Industry', 8.8e9],
  ['Ji-woo Park', 30, 'South Korea', 'Tech', 7.2e8], ['Clara Laurent', 47, 'France', 'Tourism', 3.3e8],
  ['Ella Brown', 21, 'United Kingdom', 'Media', 2.1e5], ['Charlotte Eve', 19, 'United Kingdom', 'Fashion', 5.2e5]
];
export const TABS: [string, string, string][] = [
  ['home', 'Overview', 't-life'], ['career', 'Career', 't-work'], ['edu', 'Education', 't-cap'], ['biz', 'Business', 't-biz'], ['space', 'Space', 't-space'],
  ['health', 'Wellbeing', 'w-heart'], ['spirit', 'Mind', 'w-lotus'], ['pets', 'Companions', 'ic-paw'],
  ['assets', 'Assets', 'ic-bag'], ['markets', 'Markets', 't-stock'], ['bank', 'Banking', 't-bank'],
  ['social', 'Social', 't-social'], ['relations', 'Relations', 'ic-heart'], ['club', 'Clubs', 't-club'],
  ['power', 'Power', 't-power'], ['entity', 'Empire', 'b-corp'], ['rank', 'Ranking', 't-rank'], ['fame', 'Hall of Fame', 'ic-trophy']
];

// v10.5: navigation — reorganised into 6 scientific groups along a
// personal → human-capital → enterprise → portfolio → network → world axis.
// Tab labels use proper terminology (Character / Wellbeing / Capital /
// Ventures / Markets / Banking / Vault / Sphere / Society / Registry).
// v11.3 — Power tab joins the "world" group (alongside Ranking + Hall of
// Fame) since power is a world-level concern (unlocked by net worth and
// gating election/lobby actions).
// v11.22 — reordered to life-flow per UX feedback: Character → Education →
// Assets → Business → Social → Empire. Player accumulates cash (Assets)
// before opening businesses, and Empire (world/meta-game) sits last.
//   Old order: life → growth → empire → wealth → network → world
//   New order: life → growth → wealth → empire → network → world
// v11.24 — split 'wealth' (Portfolio) into TWO groups per UX feedback:
//   'assets'  (Tài sản)  — the diversified item/property catalogue
//   'finance' (Tài chính) — markets (stocks) + banking (savings/loans/tax)
// Physical possessions and financial instruments are different mental
// models; mixing them under one "Portfolio" umbrella was confusing.
// v11.28 — per UX feedback the Assets group (auction house, used market,
// rare items, repair workshop) moves UP to slot 2, right after Character:
// buying/fixing/selling stuff is the core loop the player touches most, so
// it should be one tap away from the overview — before education/career.
//   Old order: life → growth → assets → finance → empire → network → …
//   New order: life → ASSETS → growth → finance → empire → network → …
export const GROUPS: [string, string, string, [string, string, string][]][] = [
  ['life', 'Character', 't-life', [['home', 'Overview', 't-life'], ['health', 'Wellbeing', 'w-heart'], ['spirit', 'Mind', 'w-lotus'], ['pets', 'Companions', 'ic-paw']]],
  ['assets', 'Assets', 'ic-bag', [['assets', 'Assets', 'ic-bag']]],
  // v11.41 — Education split from Career per UX feedback. Education = degrees/
  // licences/short courses. Career = jobs + experience + contracts + raise.
  // Experience also feeds the Workshop (repair skill) so the two stay linked
  // conceptually even though they're separate groups now.
  ['edu', 'Education', 't-cap', [['edu', 'Education', 't-cap']]],
  ['career', 'Career', 't-work', [['career', 'Career', 't-work']]],
  ['finance', 'Finance', 't-bank', [['finance-overview', 'Overview', 'ic-coins'], ['markets', 'Markets', 't-stock'], ['bank', 'Banking', 't-bank'], ['portfolio', 'Portfolio', 'ic-pie']]],
  // v11.41 — Business group no longer carries Space; Space moves to the
  // Empire group (only relevant once the player is a super-entity).
  ['empire', 'Business', 't-biz', [['biz', 'Business', 't-biz']]],
  // v11.41 — Social + Community merged into ONE group. Sub-tabs distinguish:
  //   Social = AI NPC interactions (posts, relations, clubs)
  //   Community = real players (friends, chat, leaderboard)
  ['network', 'Network', 't-social', [
    ['social', 'Social', 't-social'],
    ['relations', 'Relations', 'ic-heart'],
    ['club', 'Clubs', 't-club'],
    ['friends', 'Friends', 'ic-users'],
    ['chat', 'Chat', 't-social'],
    ['lboard', 'Leaderboard', 'ic-trophy'],
  ]],
  // v11.41 — Empire group renamed + reiconned (was 't-rank' cup; now 'b-corp'
  // building = empire/conglomerate visual). Space tab now lives HERE, hidden
  // until the player reaches 'empire' entity tier (interstellar). Tier
  // explanations + what-to-do guidance added in the EntityTab UI.
  ['world', 'Empire', 'b-corp', [['power', 'Power', 't-power'], ['entity', 'Empire', 'b-corp'], ['rank', 'Ranking', 't-rank'], ['fame', 'Hall of Fame', 'ic-trophy'], ['space', 'Cosmic', 't-space'], ['links', 'Systems', 'ic-link']]],
];

// ================= v8: gigs, levels & XP, the cosmic frontier =================
export const LEVEL_INCOME_BONUS = 0.02;   // +2% income per level above 1
export const xpNeed = (lvl: number) => Math.round(120 * Math.pow(lvl, 1.55));

export interface GigDef { id: string; base: number; cd: number; icon: string; minFollowers?: number; req?: Req; hp?: number }
// v11.40 — travel destinations. Each trip costs cash + game days, and grants
// spirit/health/fame boosts. The cooldown prevents spamming travel for infinite
// spirit. Destinations scale from cheap local trips to luxury international.
export interface TravelDef { id: string; name: string; nameVi: string; cost: number; days: number; cd: number; spirit: number; health: number; fame: number; icon: string; minLevel?: number }
export const TRAVEL: TravelDef[] = [
  { id: 'local', name: 'Local weekend trip', nameVi: 'Cuối tuần gần nhà', cost: 500, days: 3, cd: 14, spirit: 8, health: 3, fame: 0, icon: 'i-house' },
  { id: 'beach', name: 'Beach getaway', nameVi: 'Nghỉ dưỡng biển', cost: 2000, days: 5, cd: 21, spirit: 15, health: 6, fame: 1, icon: 'b-hotel' },
  { id: 'mountain', name: 'Mountain retreat', nameVi: 'Vùng núi thanh bình', cost: 1500, days: 4, cd: 21, spirit: 12, health: 8, fame: 0, icon: 'b-farm' },
  { id: 'asia', name: 'Asian capital tour', nameVi: 'Tour thủ đô Á Châu', cost: 8000, days: 10, cd: 60, spirit: 25, health: 8, fame: 3, icon: 'b-ret', minLevel: 3 },
  { id: 'europe', name: 'European tour', nameVi: 'Tour Châu Âu', cost: 20000, days: 14, cd: 90, spirit: 35, health: 10, fame: 5, icon: 'b-bank', minLevel: 5 },
  { id: 'safari', name: 'African safari', nameVi: 'Safari Châu Phi', cost: 35000, days: 12, cd: 90, spirit: 40, health: 12, fame: 6, icon: 'b-farm', minLevel: 6 },
  { id: 'space', name: 'Orbital space tourism', nameVi: 'Du lịch vũ trụ', cost: 5000000, days: 7, cd: 365, spirit: 60, health: 5, fame: 50, icon: 's-sat', minLevel: 15 },
];
// Quick ways to earn cash. 'ad' is always available (tiny) — yes, you get paid
// to watch ads. Others pay more but have a cooldown measured in game days.
// v11.26 — `hp` is the health every gig drains (work is tiring). The ad gig's
// 0.5-per-watch doubles as an anti-spam valve: it has no cooldown, so an
// all-day ad grind wears the player down (gym / checkup restore it).
export const GIGS: GigDef[] = [
  { id: 'ad', base: 15, cd: 0, icon: 'ic-play', hp: 0.5 },
  { id: 'delivery', base: 60, cd: 1, icon: 'j-driver', hp: 2 },
  { id: 'busk', base: 45, cd: 1, icon: 'j-teach', hp: 1, req: { deg: { arts: 1 } } },
  { id: 'freelance', base: 150, cd: 2, icon: 'j-eng', hp: 1.5 },
  { id: 'tutor', base: 130, cd: 2, icon: 'j-teach', req: { any: 1 }, hp: 1.5 },
  { id: 'sponsored', base: 80, cd: 4, icon: 't-social', minFollowers: 1000, hp: 1 },
  { id: 'petcare', base: 90, cd: 2, icon: 'ic-paw', hp: 1 },
  { id: 'photoshoot', base: 220, cd: 3, icon: 't-social', minFollowers: 500, hp: 1.5 },
  { id: 'coding', base: 280, cd: 3, icon: 'j-eng', req: { deg: { engineering: 1 } }, hp: 2 },
  { id: 'medical', base: 340, cd: 4, icon: 'w-heart', req: { deg: { medicine: 1 } }, hp: 2.5 },
  { id: 'consult', base: 550, cd: 6, icon: 'j-mgr', req: { deg: { business: 1 } }, hp: 2 },
  { id: 'endorsement', base: 1200, cd: 8, icon: 't-social', minFollowers: 10000, hp: 2 },
  { id: 'speaking', base: 1800, cd: 10, icon: 'j-mgr', req: { any: 2 }, minFollowers: 5000, hp: 2.5 },
];

export interface SpaceDef { id: string; name: string; since: number; lvl: number; cost: number; inc: number; art: string; desc: string }
// The cosmic frontier — late-game ventures beyond Earth. Supplements the normal
// income sources; each needs a player level plus the right historical era.
export const SPACE_LINES: SpaceDef[] = [
  { id: 'sat', name: 'Satellite leasing', since: 2000, lvl: 6, cost: 1500000, inc: 480000, art: 's-sat', desc: 'Rent orbital bandwidth to TV and telecom companies.' },
  { id: 'orbital', name: 'Orbital tourism', since: 2025, lvl: 10, cost: 15000000, inc: 4200000, art: 's-orb', desc: 'Suborbital joyrides for the 0.001%.' },
  { id: 'mine', name: 'Asteroid mining', since: 2040, lvl: 14, cost: 80000000, inc: 22000000, art: 's-mine', desc: 'Platinum-group metals, hauled home by robots.' },
  { id: 'lunar', name: 'Lunar helium-3', since: 2055, lvl: 18, cost: 300000000, inc: 75000000, art: 's-lunar', desc: 'Fuel for Earth’s fusion reactors, mined on the Moon.' },
  { id: 'mars', name: 'Mars colony supply', since: 2070, lvl: 22, cost: 900000000, inc: 200000000, art: 's-mars', desc: 'Habitats, seeds and spare parts for the first Martians.' }
];
