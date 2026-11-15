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
  story: string; lux: number; rate: number; art: string; c: string;
  images: string[]; sources: string[]; priceSource: 'web' | 'llm' | 'none';
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

async function searchImages(query: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const zai = await getZai();
    const tries = [query, query + ' product photo', query + ' car', query + ' motorcycle'];
    for (const q of tries) {
      const r = await zai.images.search.create({ query: q, count: 6 });
      for (const it of (r?.results ?? [])) {
        const u = cleanUrl((it as { original_url?: unknown }).original_url)
          || cleanUrl((it as { url?: unknown }).url);
        if (u && !out.includes(u)) out.push(u);
      }
      if (out.length >= 3) break;
    }
  } catch (e) { console.error('[lookup] z-ai images failed:', e); }
  // Fallback: Wikimedia Commons (khong can key, anh that) khi z-ai rong / 0 anh
  if (out.length === 0) {
    try {
      const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=800&origin=*`, { signal: AbortSignal.timeout(8000) });
      const j = await r.json() as { query?: { pages?: Record<string, { imageinfo?: { thumburl?: string; url?: string }[] }> } };
      const pages = Object.values(j.query?.pages ?? {});
      for (const pg of pages) { const u = pg.imageinfo?.[0]?.thumburl || pg.imageinfo?.[0]?.url; if (u && !out.includes(u)) out.push(u); }
    } catch (e) { console.error('[lookup] wikimedia images failed:', e); }
  }
  return out.slice(0, 1); // Quy uoc: chi 1 anh duy nhat
}

async function searchWeb(query: string): Promise<{ snippet: string; url: string }[]> {
  try {
    const zai = await getZai();
    const web = (zai as unknown as { web?: { search?: { create: (a: { query: string; count: number }) => Promise<unknown> } } }).web;
    if (!web?.search?.create) return [];
    const all: { title?: string; snippet?: string; content?: string; url?: string; link?: string }[] = [];
    for (const q of [`${query} price`, `${query} specs price`, `${query} buy price`, `${query} motorcycle car`]) {
      try {
        const r = await web.search.create({ query: q, count: 5 }) as { results?: { title?: string; snippet?: string; content?: string; url?: string; link?: string }[] };
        all.push(...(r?.results ?? []));
      } catch {}
      if (all.length >= 5) break;
    }
    return all.map((x) => ({
      snippet: String(x.snippet ?? x.content ?? x.title ?? '').slice(0, 600),
      url: String(x.url ?? x.link ?? ''),
    })).filter((x) => x.snippet);
  } catch (e) { console.error('[lookup] z-ai web failed:', e); return []; }
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
    `Neu web search rong, dung kien thuc that cua ban ve vat pham nay (vd: RC 390 = KTM RC 390 xe may, M3 = BMW M3 xe hoi). Gia la gia ban le that uoc tinh, KHONG de null neu ban biet khoang gia.`,
    context,
    `Tra ve JSON duy nhat: {"brand": string, "name": string, "cat": string (1 trong 16: Sport bike, Phone, Watch, Jewelry, Suit, Car, Property, Yacht, Private jet, Art, Collectibles, Sneakers, Handbag, Audio, Camera, Classic car), "price": number|null (gia ban le that USD, lay tu snippet; neu snippet khong co gia thi null, TUYET DOI khong doan), "rarity": "common|uncommon|rare|legendary|mythic" (dua tren do hiem that), "story": string (1-2 cau mo ta that, tieng Viet, toi da 220 ky tu), "lux": number (0-12000, dua tren do xa xi), "rate": number (-0.4..0.1, tang/giam gia hang nam uoc tinh), "art": string (1 trong: i-bike,i-phone,i-watch,i-ring,i-suit,i-lambo,i-house,i-yacht,i-jet,i-art,i-coin,i-shoe,i-handbag,i-sound,i-cam), "c": string (hex mau chu dao, vd "#1d4ed8")}`,
    `Neu khong chac brand/name thi giu nguyen query. price=null neu khong thay gia.`,
  ].join('\n');
  const raw = await callLlama(prompt);
  const m = raw?.match(/\{[\s\S]*\}/);
  let parsed: Partial<LookupOut> = {};
  try { parsed = m ? JSON.parse(m[0]) as Partial<LookupOut> : {}; } catch { parsed = {}; }

  const price = typeof parsed.price === 'number' && Number.isFinite(parsed.price) && parsed.price > 0 ? Math.round(parsed.price) : null;
  const out: LookupOut = {
    name: (typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : query).slice(0, 80),
    brand: (typeof parsed.brand === 'string' ? parsed.brand.trim() : '').slice(0, 30) || query.split(' ')[0],
    cat: pickCat(query, typeof parsed.cat === 'string' ? parsed.cat : ''),
    price,
    rarity: (['common', 'uncommon', 'rare', 'legendary', 'mythic'].includes(String(parsed.rarity)) ? parsed.rarity : 'rare') as LookupOut['rarity'],
    story: (typeof parsed.story === 'string' && parsed.story.trim() ? parsed.story.trim() : `Vat pham that: ${query}. Admin kiem tra lai gia/mo ta truoc khi tao.`).slice(0, 280),
    lux: typeof parsed.lux === 'number' && Number.isFinite(parsed.lux) ? Math.max(0, Math.min(12000, Math.round(parsed.lux))) : 100,
    rate: typeof parsed.rate === 'number' && Number.isFinite(parsed.rate) ? Math.max(-0.4, Math.min(0.1, parsed.rate)) : 0,
    art: typeof parsed.art === 'string' && parsed.art.startsWith('i-') ? parsed.art.slice(0, 20) : 'i-coin',
    c: typeof parsed.c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(parsed.c.trim()) ? parsed.c.trim() : '#888888',
    images,
    sources: web.map((w) => w.url).filter(Boolean).slice(0, 5),
    priceSource: price != null ? (web.length ? 'web' : 'llm') : 'none',
  };
  return NextResponse.json({ ok: true, item: out, imagesFound: images.length, webFound: web.length });
}
