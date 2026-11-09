// ================= GAME DATA (ported from the static game) =================
export type FieldKey = 'business' | 'engineering' | 'medicine' | 'science' | 'arts';

export const DAY_MS = 20000; // 20 real seconds per game day.
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

export interface YearEvent { msg: string; stk?: Record<string, number>; dep?: number; biz?: number; fac?: number; cash?: number }
export const YEAR_EVENTS: Record<number, YearEvent> = {
  1929: { msg: 'Wall Street Crash! Stock prices collapse.', stk: { '*': .5 } },
  1931: { msg: 'Banks fail across the world. Depositors lose 30% of savings.', dep: .7 },
  1939: { msg: 'War breaks out in Europe. Trade collapses.', biz: .65 },
  1941: { msg: 'The war economy ramps up. Factories boom!', biz: 1.3, fac: 1.5 },
  1945: { msg: 'Victory celebrations and the baby boom. Consumers spend!', biz: 1.2, cash: 1000 },
  1957: { msg: 'Sputnik launch. Science and engineering are the future.', stk: { TECH: 1.25 } },
  1969: { msg: 'Moon landing! Technology stocks surge.', stk: { TECH: 1.4 } },
  1973: { msg: 'Oil crisis! Fuel prices quadruple.', stk: { OIL: 1.9, '*': .85 } },
  1979: { msg: 'Second oil shock squeezes the economy.', stk: { OIL: 1.5, '*': .9 } },
  1987: { msg: 'Black Monday: markets crash worldwide.', stk: { '*': .72 } },
  1995: { msg: 'The web goes commercial. Dot-com mania begins.', stk: { TECH: 2 } },
  2000: { msg: 'Dot-com bubble bursts.', stk: { TECH: .45, '*': .9 } },
  2001: { msg: 'Terror attacks shake markets.', stk: { '*': .85 } },
  2008: { msg: 'Global financial crisis! Real estate and banks tumble.', stk: { '*': .6, BANK: .5 } },
  2020: { msg: 'COVID-19 pandemic lockdowns the world.', stk: { PHARMA: 1.6, '*': .75 }, biz: .7 },
  2021: { msg: 'Stimulus checks arrive as vaccines roll out.', cash: 1400 },
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

export const FIELDS: Record<FieldKey, { name: string; names: string[]; years: number[]; tuition: number[]; maxAge: number[]; art: string; schools: string[] }> = {
  business: { name: 'Business', names: ['BBA', 'MBA'], years: [4, 2], tuition: [5000, 10000], maxAge: [30, 36], art: 'b-corp', schools: ['Wharton (Penn)', 'Harvard Business School', 'Stanford GSB', 'INSEAD', 'London Business School', 'CEIBS Shanghai'] },
  engineering: { name: 'Engineering', names: ['B.Eng', 'M.Eng'], years: [4, 2], tuition: [6000, 12000], maxAge: [30, 36], art: 'j-eng', schools: ['MIT', 'Stanford', 'ETH Zürich', 'IIT Bombay', 'Tsinghua', 'Tokyo Tech'] },
  medicine: { name: 'Medicine', names: ['Pre-med B.Sc.', 'MD'], years: [4, 4], tuition: [5000, 30000], maxAge: [30, 36], art: 'j-surg', schools: ['Johns Hopkins', 'Harvard Medical', 'Oxford Medical', 'Karolinska', 'AIIMS Delhi', 'University of Tokyo Medical'] },
  science: { name: 'Science', names: ['B.Sc.', 'M.Sc.', 'PhD'], years: [4, 2, 4], tuition: [5000, 10000, 0], maxAge: [30, 36, 40], art: 'u-book', schools: ['Caltech', 'Cambridge', 'Max Planck', 'ENS Paris', 'Peking University', 'Seoul National University'] },
  arts: { name: 'Arts', names: ['B.A.', 'M.A.'], years: [4, 2], tuition: [4000, 8000], maxAge: [30, 36], art: 'u-univ', schools: ['RISD', 'Central Saint Martins', 'École des Beaux-Arts', 'Pratt', 'Tokyo Geidai', 'Yale School of Art'] }
};
export const LICENSES = [
  { id: 'moto', name: 'Motorcycle licence', cost: 350, days: 30, art: 'i-bike' },
  { id: 'car', name: "Driver's licence (car)", cost: 600, days: 60, art: 'i-lambo' },
  { id: 'boat', name: 'Boating licence', cost: 1500, days: 90, art: 'i-yacht' },
  { id: 'pilot', name: 'Private pilot licence', cost: 20000, days: 365, art: 'i-jet' },
  { id: 'mechanic', name: 'Mechanic certification', cost: 2500, days: 120, art: 'i-bag' }
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
  { id: 'farm', name: 'Organic farm', base: 60000, inc: 90000, art: 'b-farm', req: { deg: { business: 1 } }, ind: 'Agriculture', reg: ['Mekong Delta, Vietnam', 'Napa Valley, California', 'Hokkaido, Japan', 'Tuscany, Italy', 'Punjab, India', 'Normandy, France'] },
  { id: 'fac', name: 'Factory', base: 90000, inc: 160000, art: 'b-fac', req: { deg: { engineering: 1 } }, ind: 'Industry', reg: ['Shenzhen, China', 'Detroit, Michigan', 'Busan, South Korea', 'Ruhr, Germany', 'Pune, India', 'Monterrey, Mexico'] },
  { id: 'hotel', name: 'Boutique hotel', base: 2500000, inc: 3500000, art: 'b-hotel', req: { deg: { business: 2 } }, ind: 'Tourism', reg: ['Bali Seminyak', 'Santorini Oia', 'Aspen, Colorado', 'Lake Como, Italy', 'Marrakech Medina', 'Maldives Atoll'] },
  { id: 'ret', name: 'Retail chain', base: 900000, inc: 1500000, art: 'b-ret', req: { deg: { business: 1 } }, ind: 'Retail', reg: ['Dubai Mall', 'Tokyo Ginza Six', 'New York Fifth Ave', 'Paris Champs-Élysées', 'London Oxford Street', 'Shanghai Nanjing Road'] },
  { id: 'tech', name: 'Software studio', base: 6000000, inc: 9000000, art: 'b-tech', req: { deg: { engineering: 1 } }, ind: 'Tech', reg: ['Silicon Valley, Palo Alto', 'Tel Aviv Startup Strip', 'Bangalore Electronic City', 'Berlin Silicon Allee', 'Singapore One-North', 'Stockholm Kista'] },
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
export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const RARITY_MULT: Record<Rarity, number> = { common: 1, uncommon: 1.4, rare: 2.2, legendary: 4 };
export const RARITY_COLOR: Record<Rarity, string> = { common: '#78725f', uncommon: '#3a5a99', rare: '#5b3da3', legendary: '#a16207' };
export interface ItemDef { id: string; cat: string; brand?: string; name: string; c: string; price: number; lux: number; rate: number; art: string; rarity?: Rarity }
export const ITEMS: ItemDef[] = [
  { id: 'bike-ktm', cat: 'Sport bike', brand: 'KTM', name: 'RC 390', c: '#f97316', price: 6000, lux: 6, rate: -.15, art: 'i-bike' },
  { id: 'bike-ninja', cat: 'Sport bike', brand: 'Kawasaki', name: 'Ninja ZX-10R', c: '#16a34a', price: 16000, lux: 20, rate: -.12, art: 'i-bike' },
  { id: 'bike-r1', cat: 'Sport bike', brand: 'Yamaha', name: 'YZF-R1', c: '#2563eb', price: 18000, lux: 25, rate: -.12, art: 'i-bike' },
  { id: 'bike-s1000', cat: 'Sport bike', brand: 'BMW', name: 'S 1000 RR', c: '#1d4ed8', price: 20000, lux: 30, rate: -.12, art: 'i-bike' },
  { id: 'bike-cbr', cat: 'Sport bike', brand: 'Honda', name: 'CBR1000RR-R', c: '#dc2626', price: 25000, lux: 35, rate: -.12, art: 'i-bike' },
  { id: 'bike-panigale', cat: 'Sport bike', brand: 'Ducati', name: 'Panigale V4', c: '#ef4444', price: 30000, lux: 50, rate: -.1, art: 'i-bike' },
  { id: 'ph-pixel', cat: 'Phone', brand: 'Google', name: 'Pixel 9 Pro', c: '#10b981', price: 999, lux: 3, rate: -.35, art: 'i-phone' },
  { id: 'ph-iphone', cat: 'Phone', brand: 'Apple', name: 'iPhone 16 Pro', c: '#64748b', price: 1199, lux: 4, rate: -.35, art: 'i-phone' },
  { id: 'ph-samsung', cat: 'Phone', brand: 'Samsung', name: 'Galaxy S25 Ultra', c: '#1e40af', price: 1299, lux: 5, rate: -.35, art: 'i-phone' },
  { id: 'ph-vertu', cat: 'Phone', brand: 'Vertu', name: 'Signature Gold', c: '#ca8a04', price: 15000, lux: 60, rate: -.2, art: 'i-phone' },
  { id: 'w-casio', cat: 'Watch', brand: 'Casio', name: 'G-Shock', c: '#374151', price: 150, lux: 1, rate: -.1, art: 'i-watch' },
  { id: 'w-tag', cat: 'Watch', brand: 'TAG Heuer', name: 'Carrera', c: '#0f766e', price: 6000, lux: 25, rate: -.02, art: 'i-watch' },
  { id: 'w-omega', cat: 'Watch', brand: 'Omega', name: 'Speedmaster', c: '#1e3a8a', price: 6500, lux: 28, rate: .01, art: 'i-watch' },
  { id: 'w-rolex', cat: 'Watch', brand: 'Rolex', name: 'Submariner', c: '#15803d', price: 10000, lux: 80, rate: .05, art: 'i-watch' },
  { id: 'w-ap', cat: 'Watch', brand: 'Audemars Piguet', name: 'Royal Oak', c: '#7c3aed', price: 30000, lux: 200, rate: .06, art: 'i-watch' },
  { id: 'w-patek', cat: 'Watch', brand: 'Patek Philippe', name: 'Nautilus', c: '#0c4a6e', price: 35000, lux: 300, rate: .07, art: 'i-watch' },
  { id: 'j-tiffany', cat: 'Jewelry', brand: 'Tiffany & Co.', name: 'Solitaire ring', c: '#0ea5e9', price: 12000, lux: 60, rate: .02, art: 'i-ring' },
  { id: 'j-cartier', cat: 'Jewelry', brand: 'Cartier', name: 'Love bracelet', c: '#b91c1c', price: 7500, lux: 50, rate: .03, art: 'i-ring' },
  { id: 'j-bulgari', cat: 'Jewelry', brand: 'Bulgari', name: 'Serpenti necklace', c: '#854d0e', price: 14000, lux: 90, rate: .03, art: 'i-ring' },
  { id: 's-zara', cat: 'Suit', brand: 'Zara', name: 'Slim suit', c: '#111827', price: 250, lux: 2, rate: -.2, art: 'i-suit' },
  { id: 's-boss', cat: 'Suit', brand: 'Hugo Boss', name: 'Business suit', c: '#1f2937', price: 800, lux: 6, rate: -.2, art: 'i-suit' },
  { id: 's-armani', cat: 'Suit', brand: 'Armani', name: 'Two-piece suit', c: '#312e81', price: 2500, lux: 20, rate: -.15, art: 'i-suit' },
  { id: 's-brioni', cat: 'Suit', brand: 'Brioni', name: 'Bespoke suit', c: '#4c1d95', price: 4000, lux: 40, rate: -.1, art: 'i-suit' },
  { id: 'c-toyota', cat: 'Car', brand: 'Toyota', name: 'Camry', c: '#dc2626', price: 30000, lux: 5, rate: -.12, art: 'i-lambo' },
  { id: 'c-tesla', cat: 'Car', brand: 'Tesla', name: 'Model S Plaid', c: '#7f1d1d', price: 100000, lux: 40, rate: -.13, art: 'i-lambo' },
  { id: 'c-bmw', cat: 'Car', brand: 'BMW', name: 'M3', c: '#1d4ed8', price: 85000, lux: 60, rate: -.12, art: 'i-lambo' },
  { id: 'c-porsche', cat: 'Car', brand: 'Porsche', name: '911 Carrera', c: '#ca8a04', price: 120000, lux: 80, rate: -.1, art: 'i-lambo' },
  { id: 'c-lambo', cat: 'Car', brand: 'Lamborghini', name: 'Urus', c: '#16a34a', price: 240000, lux: 250, rate: -.1, art: 'i-lambo' },
  { id: 'c-ferrari', cat: 'Car', brand: 'Ferrari', name: '296 GTB', c: '#dc2626', price: 330000, lux: 300, rate: -.08, art: 'i-lambo' },
  { id: 'c-rr', cat: 'Car', brand: 'Rolls-Royce', name: 'Ghost', c: '#171717', price: 350000, lux: 400, rate: -.08, art: 'i-lambo' },
  { id: 'h-condo', cat: 'Property', name: 'City condo', c: '#0ea5e9', price: 300000, lux: 40, rate: .03, art: 'i-house' },
  { id: 'h-house', cat: 'Property', name: 'Suburban house', c: '#16a34a', price: 550000, lux: 60, rate: .03, art: 'i-house' },
  { id: 'h-penthouse', cat: 'Property', name: 'Downtown penthouse', c: '#7c3aed', price: 2500000, lux: 250, rate: .04, art: 'i-house' },
  { id: 'h-villa', cat: 'Property', name: 'Beach villa', c: '#f59e0b', price: 3500000, lux: 350, rate: .04, art: 'i-villa' },
  { id: 'h-island', cat: 'Property', name: 'Private island', c: '#06b6d4', price: 30000000, lux: 9000, rate: .05, art: 'i-island' },
  { id: 'y-azimut', cat: 'Yacht', brand: 'Azimut', name: '40 m motor yacht', c: '#0369a1', price: 8000000, lux: 900, rate: -.06, art: 'i-yacht' },
  { id: 'y-sunseeker', cat: 'Yacht', brand: 'Sunseeker', name: 'Predator 74', c: '#0f172a', price: 12000000, lux: 1400, rate: -.06, art: 'i-yacht' },
  { id: 'p-cessna', cat: 'Private jet', brand: 'Cessna', name: 'Citation CJ3', c: '#475569', price: 10000000, lux: 1500, rate: -.08, art: 'i-jet' },
  { id: 'p-gulf', cat: 'Private jet', brand: 'Gulfstream', name: 'G650', c: '#1e293b', price: 70000000, lux: 6000, rate: -.07, art: 'i-jet' },
  { id: 'a-contemp', cat: 'Art', name: 'Contemporary canvas', c: '#db2777', price: 50000, lux: 150, rate: .06, art: 'i-art' },
  { id: 'a-impress', cat: 'Art', name: 'Impressionist original', c: '#a16207', price: 40000000, lux: 9000, rate: .07, art: 'i-art' }
];
// v10.5 — derive rarity from luxury tier if not set explicitly.
// 0-9 common · 10-49 uncommon · 50-299 rare · 300+ legendary.
export function itemRarity(it: { rarity?: Rarity; lux: number }): Rarity {
  if (it.rarity) return it.rarity;
  const l = it.lux || 0;
  if (l >= 300) return 'legendary';
  if (l >= 50) return 'rare';
  if (l >= 10) return 'uncommon';
  return 'common';
}
export const ITEM_BY = Object.fromEntries(ITEMS.map(i => [i.id, i]));

// v10.5 — real-world item photos. Mapped by item id; falls back to the SVG
// <Art> icon when no photo is available. Photos are compressed to ~800px wide.
export const ITEM_IMAGES: Record<string, string> = {
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
};
// Same mapping keyed by USED_MARKET listing id — used listings inherit the
// photo of their base item when available.
export const USED_IMAGES: Record<string, string> = {
  'u-camry-12y': '/img/items/lambo.jpg',     // closest: a Toyota saloon
  'u-3-series-8y': '/img/items/porsche.jpg', // BMW M3 — closest sport sedan photo
  'u-911-22y': '/img/items/porsche.jpg',
  'u-tesla-4y': '/img/items/tesla.jpg',
  'u-submariner-30y': '/img/items/rolex.jpg',
  'u-speedmaster-45y': '/img/items/rolex.jpg', // vintage watch — closest
  'u-carrera-15y': '/img/items/patek.jpg',     // TAG Heuer — closest sport photo
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
export const USED_MARKET: UsedItem[] = [
  { id: 'u-camry-12y', baseId: 'c-toyota', name: 'Camry — 12y old, one owner', brand: 'Toyota', cat: 'Car', c: '#dc2626', art: 'i-lambo', ageYears: 12, condition: 62, askPrice: 8800, newPrice: 30000, lux: 3, rate: -.12, story: 'Retired teacher\'s daily driver. Service book in the glovebox.', since: 1983 },
  { id: 'u-3-series-8y', baseId: 'c-bmw', name: 'BMW M3 — 8y old, modified', brand: 'BMW', cat: 'Car', c: '#1d4ed8', art: 'i-lambo', ageYears: 8, condition: 71, askPrice: 32000, newPrice: 85000, lux: 38, rate: -.12, story: 'Track-day toy of an enthusiast. Aftermarket exhaust, original parts included.', since: 1986 },
  { id: 'u-911-22y', baseId: 'c-porsche', name: 'Porsche 911 — 22y old, air-cooled', brand: 'Porsche', cat: 'Car', c: '#ca8a04', art: 'i-lambo', ageYears: 22, condition: 84, askPrice: 58000, newPrice: 120000, lux: 95, rate: .02, story: 'Garage-kept, numbers-matching. Already appreciating.', since: 1964 },
  { id: 'u-tesla-4y', baseId: 'c-tesla', name: 'Tesla Model S — 4y old, Plaid', brand: 'Tesla', cat: 'Car', c: '#7f1d1d', art: 'i-lambo', ageYears: 4, condition: 78, askPrice: 52000, newPrice: 100000, lux: 28, rate: -.13, story: 'Battery health 92%. Software-unlocked. First owner hit a kerb once.', since: 2012 },
  { id: 'u-submariner-30y', baseId: 'w-rolex', name: 'Rolex Submariner — 30y old, patina', brand: 'Rolex', cat: 'Watch', c: '#15803d', art: 'i-watch', ageYears: 30, condition: 70, askPrice: 18500, newPrice: 10000, lux: 120, rate: .08, story: 'Tropical dial. Watchmaker\'s receipt in the box. A collector\'s piece.', since: 1953 },
  { id: 'u-speedmaster-45y', baseId: 'w-omega', name: 'Omega Speedmaster — 45y old, pre-Moon', brand: 'Omega', cat: 'Watch', c: '#1e3a8a', art: 'i-watch', ageYears: 45, condition: 66, askPrice: 12000, newPrice: 6500, lux: 130, rate: .06, story: 'Cousin of the Moon watch. Original bracelet, lightly polished.', since: 1957 },
  { id: 'u-carrera-15y', baseId: 'w-tag', name: 'TAG Heuer Carrera — 15y old', brand: 'TAG Heuer', cat: 'Watch', c: '#0f766e', art: 'i-watch', ageYears: 15, condition: 58, askPrice: 1800, newPrice: 6000, lux: 18, rate: -.02, story: 'Daily wearer for a dentist. Crystal has one tiny chip at 4 o\'clock.', since: 1963 },
  { id: 'u-impress-50y', baseId: 'a-impress', name: 'Impressionist sketch — ~50y old', cat: 'Art', c: '#a16207', art: 'i-art', ageYears: 50, condition: 52, askPrice: 220000, newPrice: 40000000, lux: 1800, rate: .05, story: 'Attributed to a student of the master. Provenance paper-creased but legible.', since: 1870 },
  { id: 'u-contemp-3y', baseId: 'a-contemp', name: 'Contemporary canvas — 3y old, rising artist', cat: 'Art', c: '#db2777', art: 'i-art', ageYears: 3, condition: 90, askPrice: 32000, newPrice: 50000, lux: 110, rate: .12, story: 'Bought at the artist\'s first solo show. Now in two museum collections.', since: 1990 },
  { id: 'u-ghost-5y', baseId: 'c-rr', name: 'Rolls-Royce Ghost — 5y old, executive lease', brand: 'Rolls-Royce', cat: 'Car', c: '#171717', art: 'i-lambo', ageYears: 5, condition: 82, askPrice: 195000, newPrice: 350000, lux: 280, rate: -.08, story: 'Chauffeur-driven for a bank. Starlight headliner intact, full service history.', since: 2010 },
  { id: 'u-panigale-6y', baseId: 'bike-panigale', name: 'Ducati Panigale V4 — 6y old, low km', brand: 'Ducati', cat: 'Sport bike', c: '#ef4444', art: 'i-bike', ageYears: 6, condition: 74, askPrice: 14000, newPrice: 30000, lux: 30, rate: -.1, story: 'Weekend rider. Removed the mirrors for trackdays, will refit on request.', since: 2018 },
  { id: 'u-cbr-10y', baseId: 'bike-cbr', name: 'Honda CBR1000RR-R — 10y old', brand: 'Honda', cat: 'Sport bike', c: '#dc2626', art: 'i-bike', ageYears: 10, condition: 60, askPrice: 7800, newPrice: 25000, lux: 18, rate: -.12, story: 'Stunt-practice spare. Crashed twice, repaired honestly.', since: 2004 }
];
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

export const STOCKS = [
  { id: 'TECH', name: 'Nova Technologies (large-cap tech)', p: 100, vol: .035, art: 's-tech' },
  { id: 'BANK', name: 'Continental Banking Group', p: 60, vol: .02, art: 'b-bank' },
  { id: 'OIL', name: 'Petrorig Global Energy', p: 40, vol: .05, art: 's-oil' },
  { id: 'COIN', name: 'Ledger crypto fund', p: 20, vol: .09, art: 's-coin' },
  { id: 'PHARMA', name: 'Helix BioPharma', p: 85, vol: .03, art: 's-pharma' },
  { id: 'RETAIL', name: 'Metro Retail Holdings', p: 55, vol: .025, art: 'b-ret' },
  { id: 'SOLAR', name: 'Solaris Dynamics', p: 35, vol: .04, art: 's-solar' },
  { id: 'AI', name: 'NeuroAI Labs (frontier AI)', p: 150, vol: .06, art: 's-ai' },
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
  ['rank', 'Ranking', 't-rank'], ['fame', 'Hall of Fame', 'ic-trophy']
];

// v10.5: navigation — reorganised into 6 scientific groups along a
// personal → human-capital → enterprise → portfolio → network → world axis.
// Tab labels use proper terminology (Character / Wellbeing / Capital /
// Ventures / Markets / Banking / Vault / Sphere / Society / Registry).
export const GROUPS: [string, string, string, [string, string, string][]][] = [
  ['life', 'Character', 't-life', [['home', 'Overview', 't-life'], ['health', 'Wellbeing', 'w-heart'], ['spirit', 'Mind', 'w-lotus'], ['pets', 'Companions', 'ic-paw']]],
  ['growth', 'Capital', 't-cap', [['edu', 'Education', 't-cap'], ['career', 'Career', 't-work']]],
  ['empire', 'Ventures', 't-biz', [['biz', 'Business', 't-biz'], ['space', 'Space', 't-space']]],
  ['wealth', 'Portfolio', 't-bank', [['assets', 'Assets', 'ic-bag'], ['markets', 'Markets', 't-stock'], ['bank', 'Banking', 't-bank']]],
  ['network', 'Sphere', 't-social', [['social', 'Social', 't-social'], ['relations', 'Relations', 'ic-heart'], ['club', 'Clubs', 't-club']]],
  ['world', 'World', 't-rank', [['rank', 'Ranking', 't-rank'], ['fame', 'Hall of Fame', 'ic-trophy'], ['links', 'Systems', 'ic-link']]],
];

// ================= v8: gigs, levels & XP, the cosmic frontier =================
export const LEVEL_INCOME_BONUS = 0.02;   // +2% income per level above 1
export const xpNeed = (lvl: number) => Math.round(120 * Math.pow(lvl, 1.55));

export interface GigDef { id: string; base: number; cd: number; icon: string; minFollowers?: number; req?: Req }
// Quick ways to earn cash. 'ad' is always available (tiny) — yes, you get paid
// to watch ads. Others pay more but have a cooldown measured in game days.
export const GIGS: GigDef[] = [
  { id: 'ad', base: 15, cd: 0, icon: 'ic-play' },
  { id: 'delivery', base: 60, cd: 1, icon: 'j-driver' },
  { id: 'freelance', base: 150, cd: 2, icon: 'j-eng' },
  { id: 'tutor', base: 130, cd: 2, icon: 'j-teach', req: { any: 1 } },
  { id: 'sponsored', base: 80, cd: 4, icon: 't-social', minFollowers: 1000 },
  { id: 'consult', base: 550, cd: 6, icon: 'j-mgr', req: { deg: { business: 1 } } }
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
