// ================= GAME DATA (ported from the static game) =================
export type FieldKey = 'business' | 'engineering' | 'medicine' | 'science' | 'arts';

export const DAY_MS = 20000; // 20 real seconds = 1 game day (speed feels right; matches the classic edition)
export const START = 18, END_AGE = 90, RETIRE = 65, PENSION = 18000;
export const RESALE_FEE = .03, BIZ_DEGREE_BONUS = .15;
export const FOUND_COST = 250000, FOUND_MIN_NW = 1000000, OWN_CLUB_MULT = 1.2, OWN_CLUB_MAX_MEMBERS = 200;
export const SAVE_RATE = .02, LOAN_RATE = .06;
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

export const FIELDS: Record<FieldKey, { name: string; names: string[]; years: number[]; tuition: number[]; maxAge: number[]; art: string }> = {
  business: { name: 'Business', names: ['BBA', 'MBA'], years: [4, 2], tuition: [5000, 10000], maxAge: [30, 36], art: 'b-corp' },
  engineering: { name: 'Engineering', names: ['B.Eng', 'M.Eng'], years: [4, 2], tuition: [6000, 12000], maxAge: [30, 36], art: 'j-eng' },
  medicine: { name: 'Medicine', names: ['Pre-med B.Sc.', 'MD'], years: [4, 4], tuition: [5000, 30000], maxAge: [30, 36], art: 'j-surg' },
  science: { name: 'Science', names: ['B.Sc.', 'M.Sc.', 'PhD'], years: [4, 2, 4], tuition: [5000, 10000, 0], maxAge: [30, 36, 40], art: 'u-book' },
  arts: { name: 'Arts', names: ['B.A.', 'M.A.'], years: [4, 2], tuition: [4000, 8000], maxAge: [30, 36], art: 'u-univ' }
};
export const LICENSES = [
  { id: 'moto', name: 'Motorcycle licence', cost: 350, days: 30, art: 'i-bike' },
  { id: 'car', name: "Driver's licence (car)", cost: 600, days: 60, art: 'i-lambo' },
  { id: 'boat', name: 'Boating licence', cost: 1500, days: 90, art: 'i-yacht' },
  { id: 'pilot', name: 'Private pilot licence', cost: 20000, days: 365, art: 'i-jet' }
];
export const LIC_BY = Object.fromEntries(LICENSES.map(l => [l.id, l]));
export const LIC_FOR: Record<string, string> = { 'Sport bike': 'moto', 'Car': 'car', 'Yacht': 'boat', 'Private jet': 'pilot' };

export const STAGES = [
  { to: 22, name: 'Student', art: 'u-univ', color: '#2ec4b6' },
  { to: 26, name: 'Young worker', art: 'j-clerk', color: '#ff9f1c' },
  { to: 65, name: 'Career', art: 'j-mgr', color: '#ff5d8f' },
  { to: 91, name: 'Retirement', art: 'st-ret', color: '#9d4edd' }
];
export interface BizDef { id: string; name: string; base: number; inc: number; art: string; req: Req; ind: string; reg: string[] }
export interface Req { any?: number; deg?: Partial<Record<FieldKey, number>>; lic?: string[]; age?: number }
export const BIZ: BizDef[] = [
  { id: 'cafe', name: 'Coffee shop', base: 800, inc: 1500, art: 'b-cafe', req: {}, ind: 'Food', reg: ['Old Town walking street', 'University quarter', 'Business district', 'Harbor promenade', 'Suburb mall', 'Riverside market'] },
  { id: 'shop', name: 'Convenience store', base: 8000, inc: 12000, art: 'b-shop', req: { deg: { business: 1 } }, ind: 'Retail', reg: ['Downtown core', 'Night market alley', 'Highway rest stop', 'Residential ward', 'Tourist old quarter', 'Metro interchange'] },
  { id: 'farm', name: 'Organic farm', base: 60000, inc: 90000, art: 'b-farm', req: { deg: { business: 1 } }, ind: 'Agriculture', reg: ['River delta plains', 'Highland terraces', 'Coastal wetlands', 'Volcanic foothills', 'Northern valleys', 'Red soil plateau'] },
  { id: 'fac', name: 'Factory', base: 90000, inc: 160000, art: 'b-fac', req: { deg: { engineering: 1 } }, ind: 'Industry', reg: ['Canal industrial park', 'Free-trade zone', 'Old steel district', 'Port logistics hub', 'Inland export zone', 'Tech-valley estate'] },
  { id: 'hotel', name: 'Boutique hotel', base: 2500000, inc: 3500000, art: 'b-hotel', req: { deg: { business: 2 } }, ind: 'Tourism', reg: ['Beachfront strip', 'Old town square', 'Mountain resort', 'Lake district', 'Safari gateway', 'Island marina'] },
  { id: 'ret', name: 'Retail chain', base: 900000, inc: 1500000, art: 'b-ret', req: { deg: { business: 1 } }, ind: 'Retail', reg: ['Capital megastore', 'Regional mall', 'Airport terminal', 'Border trade town', 'Seaside boulevard', 'Northern highlands'] },
  { id: 'tech', name: 'Software studio', base: 6000000, inc: 9000000, art: 'b-tech', req: { deg: { engineering: 1 } }, ind: 'Tech', reg: ['Silicon roundabout', 'University science park', 'Fintech district', 'Media city tower', 'Game-dev loft', 'Deep-tech campus'] },
  { id: 'bank', name: 'Private bank', base: 12000000, inc: 22000000, art: 'b-bank', req: { deg: { business: 2 } }, ind: 'Finance', reg: ['Financial mile', 'Offshore center', 'Old-money quarter', 'Emerging-market hub', 'Diamond district', 'Crypto valley'] },
  { id: 'studio', name: 'Film studio', base: 40000000, inc: 60000000, art: 'b-studio', req: { deg: { arts: 1, business: 1 } }, ind: 'Media', reg: ['Sunset backlot', 'Heritage studios', 'Desert ranch sets', 'Harbor soundstages', 'Animation wing', 'Streaming city lot'] },
  { id: 'corp', name: 'Conglomerate', base: 150000000, inc: 280000000, art: 'b-corp', req: { deg: { business: 2 } }, ind: 'Diversified', reg: ['HQ tower, capital', 'Global trading arm', 'Energy division', 'Infra division', 'Biotech division', 'Space division'] }
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
export interface ItemDef { id: string; cat: string; brand?: string; name: string; c: string; price: number; lux: number; rate: number; art: string }
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
export const ITEM_BY = Object.fromEntries(ITEMS.map(i => [i.id, i]));
export const STOCKS = [
  { id: 'TECH', name: 'Alpha Tech', p: 100, vol: .035, art: 's-tech' },
  { id: 'BANK', name: 'Beta Bank', p: 60, vol: .02, art: 'b-bank' },
  { id: 'OIL', name: 'Gamma Oil', p: 40, vol: .05, art: 's-oil' },
  { id: 'COIN', name: 'Delta Crypto', p: 20, vol: .09, art: 's-coin' },
  { id: 'PHARMA', name: 'Helix Pharma', p: 85, vol: .03, art: 's-pharma' },
  { id: 'RETAIL', name: 'Mega Retail', p: 55, vol: .025, art: 'b-ret' },
  { id: 'SOLAR', name: 'Solar Dynamics', p: 35, vol: .04, art: 's-solar' },
  { id: 'AI', name: 'NeuroAI', p: 150, vol: .06, art: 's-ai' },
  { id: 'SKY', name: 'Sky Airlines', p: 30, vol: .05, art: 'i-jet' }
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
  { id: 'nurse', name: 'Registered nurse', salary: 62000, req: { deg: { science: 1 } }, ft: true, art: 'j-nurse' },
  { id: 'mgr', name: 'Project manager', salary: 95000, req: { deg: { business: 1 }, age: 26 }, ft: true, art: 'j-mgr' },
  { id: 'eng', name: 'Software engineer', salary: 110000, req: { deg: { engineering: 1 }, age: 22 }, ft: true, art: 'j-eng' },
  { id: 'lead', name: 'Lead engineer', salary: 135000, req: { deg: { engineering: 2 }, age: 26 }, ft: true, art: 'j-eng' },
  { id: 'lab', name: 'Lab researcher', salary: 80000, req: { deg: { science: 2 } }, ft: true, art: 'u-book' },
  { id: 'scientist', name: 'Research scientist', salary: 140000, req: { deg: { science: 3 } }, ft: true, art: 'u-book' },
  { id: 'mkt', name: 'Marketing director', salary: 150000, req: { deg: { business: 2 }, age: 28 }, ft: true, art: 'b-corp' },
  { id: 'exec', name: 'Executive director', salary: 220000, req: { deg: { business: 2 }, age: 30 }, ft: true, art: 'b-corp' },
  { id: 'pilot', name: 'Commercial pilot', salary: 200000, req: { lic: ['pilot'], age: 21 }, ft: true, art: 'i-jet' },
  { id: 'surg', name: 'Surgeon', salary: 280000, req: { deg: { medicine: 2 } }, ft: true, art: 'j-surg' }
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
  ['home', 'Home', 't-life'], ['career', 'Jobs', 't-work'], ['edu', 'Education', 't-cap'], ['biz', 'Business', 't-biz'], ['space', 'Space', 't-space'],
  ['health', 'Health', 'w-heart'], ['spirit', 'Mind', 'w-lotus'],
  ['shop', 'Shop', 't-shop'], ['stock', 'Stocks', 't-stock'], ['social', 'Social', 't-social'],
  ['club', 'Clubs', 't-club'], ['bank', 'Bank', 't-bank'], ['rank', 'Ranking', 't-rank']
];

// v9: two-level navigation — 6 groups arranged as a life pipeline:
// personal foundation → human capital → enterprises → wealth → network → the world.
export const GROUPS: [string, string, string, [string, string, string][]][] = [
  ['life', 'Life', 't-life', [['home', 'Home', 't-life'], ['health', 'Health', 'w-heart'], ['spirit', 'Mind & spirit', 'w-lotus']]],
  ['growth', 'Growth', 't-cap', [['edu', 'Education', 't-cap'], ['career', 'Jobs', 't-work']]],
  ['empire', 'Empire', 't-biz', [['biz', 'Business', 't-biz'], ['space', 'Space', 't-space']]],
  ['wealth', 'Wealth', 't-bank', [['stock', 'Stocks', 't-stock'], ['bank', 'Bank', 't-bank'], ['shop', 'Shop', 't-shop']]],
  ['network', 'Network', 't-social', [['social', 'Social', 't-social'], ['club', 'Clubs', 't-club']]],
  ['world', 'World', 't-rank', [['rank', 'Ranking', 't-rank'], ['links', 'Links', 'ic-link']]],
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
