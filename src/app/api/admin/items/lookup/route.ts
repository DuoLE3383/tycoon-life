// v13.49 — POST /api/admin/items/lookup — Admin Item auto-info (A + gia that).
// Nhan { query } (ten item that admin go) -> tra ve info de dien san form
// admin, KHONG tu dong tao item. Admin van duyet/sua tay roi moi bam Tao/Cap nhat.
// Nguon: z-ai web search (gia that, mo ta that) + z-ai image search (URL anh that).
// Khong picsum, khong placeholder, khong bia gia. Neu search hong -> tra
// { ok:false, error:'lookup-failed' } de admin nhap tay, khong tra gia ao.
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { adminGuard, readBody } from '@/lib/server/adminAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

const CATEGORIES = [
  'Sport bike', 'Phone', 'Watch', 'Jewelry', 'Suit', 'Car', 'Property',
  'Yacht', 'Private jet', 'Art', 'Collectibles', 'Sneakers', 'Handbag',
  'Audio', 'Camera', 'Classic car',
] as const;

type LookupOut = {
  name: string; brand: string; cat: string; price: number | null;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'mythic';
  story: string; specs: string[]; lux: number; rate: number; art: string; c: string;
  images: string[]; sources: string[]; priceSource: 'web' | 'none'; priceEvidence: string; confidence: 'high' | 'medium' | 'low';
};

let zaiClient: Promise<ZAI> | null = null;
async function getZai(): Promise<ZAI> {
  if (!zaiClient) zaiClient = ZAI.create();
  try { return await zaiClient; }
  catch (e) { zaiClient = null; throw e; }
}

function cleanUrl(u: unknown): string | null {
  if (typeof u !== 'string') return null;
  const s = u.trim();
  if (!/^https?:\/\//i.test(s)) return null;
  if (/picsum\.photos/i.test(s)) return null;
  return s;
}

async function searchBingImages(query: string): Promise<string[]> {
  // Thu query goc + query + ' handbag/bag' — tranh Tabby -> buom, Birkin -> trang
  const tries = [query, query + ' handbag', query + ' bag', query + ' product'];
  for (const q of tries) {
    const r = await searchBingOne(q);
    if (r.length) return r;
  }
  return [];
}
async function searchBingOne(query: string): Promise<string[]> {
  try {
    const r = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2`, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { console.error('[lookup] bing images HTTP', r.status); return []; }
    const html = await r.text();
    const out: string[] = [];
    const re = /"murl":"(https:[^"]+)"/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) && out.length < 5) {
      const c = cleanUrl(m[1].replace(/\\u0026/g, '&'));
      if (c && !out.includes(c)) out.push(c);
    }
    return out;
  } catch (e) { console.error('[lookup] bing images failed:', e); return []; }
}
async function searchOpenverse(query: string): Promise<string[]> {
  try {
    const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=5`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const j = await r.json() as { results?: { url?: string }[] };
    return (j.results ?? []).map((x) => cleanUrl(x.url)).filter((x): x is string => !!x);
  } catch (e) { console.error('[lookup] openverse failed:', e); return []; }
}
async function searchImages(query: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const zai = await getZai();
    const tries = [query, `"${query}"`, query + ' product photo']; // v13.67 - khong them car/motorcycle/bag: de anh lac sang item khac
    for (const q of tries) {
      const r = await zai.images.search.create({ query: q, count: 6 });
      for (const it of (r?.results ?? [])) {
        const ttl = String((it as { title?: unknown }).title ?? (it as { alt?: unknown }).alt ?? '').toLowerCase();
        const toks = query.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length >= 3);
        if (ttl && toks.length && !toks.some((tk) => ttl.includes(tk))) continue; // co title ma khong lien quan -> bo
        const u = cleanUrl((it as { original_url?: unknown }).original_url)
          || cleanUrl((it as { url?: unknown }).url);
        if (u && !out.includes(u)) out.push(u);
      }
      if (out.length >= 3) break;
    }
  } catch (e) { console.error('[lookup] z-ai images failed:', e); }
  // Khong API: Bing -> Openverse -> Wikimedia
  if (out.length === 0) { for (const u of await searchBingImages(query)) if (!out.includes(u)) out.push(u); }
  if (out.length === 0) { for (const u of await searchOpenverse(query)) if (!out.includes(u)) out.push(u); }
  // v13.68 - BO fallback Wikimedia: no tra anh theo mo ta file (vd: rung) chu khong theo ten item -> anh lac.
  return out.slice(0, 1); // Quy uoc: chi 1 anh duy nhat
}

async function searchWeb(query: string): Promise<{ snippet: string; url: string }[]> {
  try {
    const zai = await getZai();
    const web = (zai as unknown as { web?: { search?: { create: (a: { query: string; count: number }) => Promise<unknown> } } }).web;
    if (!web?.search?.create) return [];
    const all: { title?: string; snippet?: string; content?: string; url?: string; link?: string }[] = [];
    for (const q of [`"${query}" price`, `"${query}" specifications`, `"${query}" review`, `"${query}" official`]) {
      try {
        const r = await web.search.create({ query: q, count: 5 }) as { results?: { title?: string; snippet?: string; content?: string; url?: string; link?: string }[] };
        all.push(...(r?.results ?? []));
      } catch {}
      if (all.length >= 5) break;
    }
    return all.map((x) => ({
      snippet: (x.title ? `[${x.title}] ` : '') + String(x.snippet ?? x.content ?? '').slice(0, 800),
      url: String(x.url ?? x.link ?? ''),
    })).filter((x) => x.snippet);
  } catch (e) { console.error('[lookup] z-ai web failed:', e); return []; }
}

// v13.67 - trich gia $/USD trong snippet web de verify gia LLM.
function extractSnippetPrices(text: string): number[] {
  const out: number[] = [];
  const res = [...text.matchAll(/\$\s*([\d,]+(?:\.\d+)?)/g), ...text.matchAll(/([\d,]+)\s*(?:USD|dollars?)/gi)];
  for (const m of res) { const n = Number(String(m[1]).replace(/,/g, '')); if (Number.isFinite(n) && n > 0 && n < 1e9) out.push(n); }
  return out.sort((a, b) => a - b);
}
function medianNum(a: number[]): number | null { if (!a.length) return null; return a[Math.floor(a.length / 2)]; }

// v13.68 - specs chi giu khi co tu khoa xuat hien trong snippet web.
function filterSpecs(specs: string[], snippetText: string): string[] {
  const low = snippetText.toLowerCase();
  return specs.filter((sp) => {
    const words = sp.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length >= 4);
    if (!words.length) return false;
    return words.some((w) => low.includes(w));
  });
}

async function callLlama(prompt: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: 'You extract item facts from web search snippets. Reply with a single compact JSON object and nothing else.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json() as { choices?: { message?: { content?: string } }[] };
    return j.choices?.[0]?.message?.content ?? null;
  } catch { return null; } finally { clearTimeout(timer); }
}

function pickCat(query: string, llmCat: string): string {
  const q = query.toLowerCase();
  if (/(rolex|patek|audemars|watch|dong ho)/.test(q)) return 'Watch';
  if (/(iphone|galaxy|pixel|phone|dien thoai)/.test(q)) return 'Phone';
  if (/(lamborghini|ferrari|porsche|rolls|bentley|car|xe hoi|oto)/.test(q)) return 'Car';
  if (/(handbag|birkin|tui)/.test(q)) return 'Handbag';
  if (/(sneaker|giay|nike|jordan)/.test(q)) return 'Sneakers';
  if (/(yacht|du thuyen)/.test(q)) return 'Yacht';
  if (/(jet|may bay)/.test(q)) return 'Private jet';
  if (/(house|villa|penthouse|nha|biet thu)/.test(q)) return 'Property';
  if (/(necklace|ring|diamond|nhan|kim cuong)/.test(q)) return 'Jewelry';
  if (/(painting|tranh|art)/.test(q)) return 'Art';
  if (/(sport ?bike|motorcycle|moto|xe may|rc ?390|ninja|panigale)/.test(q)) return 'Sport bike';
  if (/(classic car|vintage car|xe co)/.test(q)) return 'Classic car';
  if (/(headphone|speaker|loa|tai nghe|audio|am thanh)/.test(q)) return 'Audio';
  if (/(camera|may anh|ong kinh|lens)/.test(q)) return 'Camera';
  if (/(suit|vest|bo vest|tuxedo)/.test(q)) return 'Suit';
  if (CATEGORIES.includes(llmCat as typeof CATEGORIES[number])) return llmCat;
  return 'Collectibles';
}

export async function POST(req: Request) {
  const denied = adminGuard(req);
  if (denied) return denied;
  const body = await readBody(req);
  const query = String((body as { query?: unknown }).query ?? '').trim().slice(0, 120);
  if (!query) return NextResponse.json({ ok: false, error: 'bad-query' }, { status: 400 });

  const [images, web] = await Promise.all([searchImages(query), searchWeb(query)]);
  const context = web.map((w, i) => `[${i + 1}] ${w.snippet} (nguon: ${w.url})`).join('\n') || '(khong co ket qua web search)';
  const prompt = [
    `Nguoi dung hoi ve vat pham that: "${query}".`,
    `Ket qua web search (uu tien dung thong tin trong nay):`,
    `Specs: CHI lay tu snippet ben tren, copy dung tu ngu trong snippet. Neu snippet khong co thong so nao thi specs=[]. TUYET DOI khong tu nghi ra thong so (vd: khong doan kieu dong co, kieu may).`,
      `Neu web search rong, chi dung kien thuc de xac dinh brand/name/cat/story - RIENG GIA thi price=null, TUYET DOI khong doan gia.`, 
    context,
    `Tra ve JSON duy nhat: {"brand": string, "name": string, "cat": string (1 trong 16), "price": number|null (CHI lay gia USD co trong snippet ben tren, copy dung so; neu khong snippet nao co gia thi null, TUYET DOI khong doan), "priceEvidence": string (trich NGUYEN VAN 1 snippet chua gia do, neu khong co gia thi ""), "rarity": "common|uncommon|rare|legendary|mythic", "specs": [string], "story": string (1-2 cau, tieng Viet, toi da 220 ky tu), "lux": number (0-12000), "rate": number (-0.4..0.1), "art": string, "c": string}`, 
    `Neu khong chac brand/name thi giu nguyen query. price=null neu khong thay gia.`,
  ].join('\n');
  const raw = await callLlama(prompt);
  const m = raw?.match(/\{[\s\S]*\}/);
  let parsed: Partial<LookupOut> = {};
  try { parsed = m ? JSON.parse(m[0]) as Partial<LookupOut> : {}; } catch { parsed = {}; }

  // v13.67 - verify gia: chi tin gia LLM neu snippet web that su co gia gan do.
  const snippetPrices = extractSnippetPrices(web.map((w) => w.snippet).join('\n'));
  const snippetMedian = medianNum(snippetPrices);
  let price = typeof parsed.price === 'number' && Number.isFinite(parsed.price) && parsed.price > 0 ? Math.round(parsed.price) : null;
  let priceEvidence = typeof (parsed as { priceEvidence?: unknown }).priceEvidence === 'string' ? String((parsed as { priceEvidence?: string }).priceEvidence).slice(0, 300) : '';
  if (price != null) {
    if (snippetPrices.length === 0) { price = null; priceEvidence = ''; }
    else if (snippetMedian != null && (price < snippetMedian / 3 || price > snippetMedian * 3)) { price = snippetMedian; priceEvidence = ''; }
  }
  const out: LookupOut = {
    name: (typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : query).slice(0, 80),
    brand: (typeof parsed.brand === 'string' ? parsed.brand.trim() : '').slice(0, 30) || query.split(' ')[0],
    cat: pickCat(query, typeof parsed.cat === 'string' ? parsed.cat : ''),
    price,
    rarity: (function () {
      const raw = String(parsed.rarity ?? 'rare');
      const r = (['common', 'uncommon', 'rare', 'legendary', 'mythic'].includes(raw) ? raw : 'rare') as LookupOut['rarity'];
      if (price != null) { if (price >= 20000 && (r === 'common' || r === 'uncommon')) return 'legendary'; if (price >= 5000 && r === 'common') return 'rare'; }
      return r;
    })(),
    specs: filterSpecs(Array.isArray(parsed.specs) ? parsed.specs.filter((x) => typeof x === 'string' && x.trim()).map((x) => String(x).trim().slice(0, 80)).slice(0, 5) : [], web.map((w) => w.snippet).join('\n')),
    story: (typeof parsed.story === 'string' && parsed.story.trim() ? parsed.story.trim() : `Vat pham that: ${query}. Admin kiem tra lai gia/mo ta truoc khi tao.`).slice(0, 280),
    lux: typeof parsed.lux === 'number' && Number.isFinite(parsed.lux) ? Math.max(0, Math.min(12000, Math.round(parsed.lux))) : 100,
    rate: typeof parsed.rate === 'number' && Number.isFinite(parsed.rate) ? Math.max(-0.4, Math.min(0.1, parsed.rate)) : 0,
    art: typeof parsed.art === 'string' && parsed.art.startsWith('i-') ? parsed.art.slice(0, 20) : 'i-coin',
    c: typeof parsed.c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(parsed.c.trim()) ? parsed.c.trim() : '#888888',
    images,
    sources: web.map((w) => w.url).filter(Boolean).slice(0, 5),
    priceSource: price != null ? 'web' : 'none', // v13.67 - khong con 'llm'
    priceEvidence,
    confidence: web.length ? (price != null ? 'high' : 'medium') : 'low',
  };
  return NextResponse.json({ ok: true, item: out, imagesFound: images.length, webFound: web.length });
}
