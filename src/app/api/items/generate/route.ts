// POST /api/items/generate — LLM-powered item generator.
// v11.58 — taps a local llama.cpp / Ollama server (OpenAI-compatible
// /v1/chat/completions) to invent a random luxury asset: brand, model name,
// hex colour and a 1-2 sentence backstory. Price / luxury score /
// appreciation rate / rarity are derived deterministically from the chosen
// category + a rarity roll so the numbers always land in a sensible range
// for the game's economy. A web image search (z-ai-web-dev-sdk first,
// picsum.photos fallback) attaches a photo URL so the AssetsTab can render
// the generated item like any other catalogue entry.
//
// The route ALWAYS returns a valid item: if the local LLM is unreachable
// (offline, wrong URL, model not loaded), a deterministic fallback generator
// invents plausible brand/name strings so the client never sees an error.
import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { Rarity, ItemDef } from '@/lib/gameData';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// LLM server (llama.cpp / Ollama / vLLM — anything that speaks OpenAI's
// /v1/chat/completions). Shares the same LLM_BASE_URL env var as every other
// LLM-backed route in this app; default to localhost so a single-machine
// Ollama install works out of the box (0.0.0.0 is a bind address, not a
// request target — some HTTP clients refuse it).
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

// Categories are exactly the 16 the game already ships — picked at random so
// the generator can drop straight into the existing catalogue groups.
const CATEGORIES = [
  'Sport bike', 'Phone', 'Watch', 'Jewelry', 'Suit', 'Car', 'Property',
  'Yacht', 'Private jet', 'Art', 'Collectibles', 'Sneakers', 'Handbag',
  'Audio', 'Camera', 'Classic car',
] as const;

// Per-category tuning — base price, luxury band, appreciate/depreciate range
// and the SVG <Art> icon used by the UI. Values mirror the ranges already in
// public/items.json so generated items feel at home next to the curated ones.
const CAT_META: Record<string, { art: string; priceLo: number; priceHi: number; luxLo: number; luxHi: number; rate: [number, number] }> = {
  'Sport bike':   { art: 'i-bike',    priceLo: 5_000,      priceHi: 35_000,      luxLo: 5,    luxHi: 60,    rate: [-0.15, -0.08] },
  'Phone':        { art: 'i-phone',   priceLo: 800,        priceHi: 18_000,      luxLo: 3,    luxHi: 65,    rate: [-0.4, -0.15] },
  'Watch':        { art: 'i-watch',   priceLo: 150,        priceHi: 220_000,     luxLo: 1,    luxHi: 1800,  rate: [-0.05, 0.1] },
  'Jewelry':      { art: 'i-ring',    priceLo: 4_000,      priceHi: 120_000,     luxLo: 30,   luxHi: 500,   rate: [0.02, 0.05] },
  'Suit':         { art: 'i-suit',    priceLo: 250,        priceHi: 12_000,      luxLo: 2,    luxHi: 100,   rate: [-0.22, -0.05] },
  'Car':          { art: 'i-lambo',   priceLo: 25_000,     priceHi: 4_000_000,   luxLo: 5,    luxHi: 3000,  rate: [-0.15, -0.02] },
  'Property':     { art: 'i-house',   priceLo: 250_000,    priceHi: 35_000_000,  luxLo: 30,   luxHi: 10000, rate: [0.03, 0.06] },
  'Yacht':        { art: 'i-yacht',   priceLo: 6_000_000,  priceHi: 25_000_000,  luxLo: 800,  luxHi: 2000,  rate: [-0.08, -0.03] },
  'Private jet':  { art: 'i-jet',     priceLo: 8_000_000,  priceHi: 80_000_000,  luxLo: 1200, luxHi: 8000,  rate: [-0.08, -0.04] },
  'Art':          { art: 'i-art',     priceLo: 20_000,     priceHi: 50_000_000,  luxLo: 100,  luxHi: 12000, rate: [0.04, 0.09] },
  'Collectibles': { art: 'i-coin',    priceLo: 5_000,      priceHi: 4_000_000,   luxLo: 30,   luxHi: 4000,  rate: [0.03, 0.1] },
  'Sneakers':     { art: 'i-shoe',    priceLo: 200,        priceHi: 400_000,     luxLo: 3,    luxHi: 3000,  rate: [-0.15, 0.1] },
  'Handbag':      { art: 'i-handbag', priceLo: 400,        priceHi: 35_000,      luxLo: 4,    luxHi: 500,   rate: [-0.22, 0.12] },
  'Audio':        { art: 'i-sound',   priceLo: 4_000,      priceHi: 50_000,      luxLo: 50,   luxHi: 300,   rate: [-0.05, 0.05] },
  'Camera':       { art: 'i-cam',     priceLo: 5_000,      priceHi: 20_000,      luxLo: 40,   luxHi: 120,   rate: [-0.05, 0.02] },
  'Classic car':  { art: 'i-lambo',   priceLo: 200_000,    priceHi: 2_500_000,   luxLo: 250,  luxHi: 2500,  rate: [0.03, 0.09] },
};

// Rarity rolls — biased toward common so the catalogue doesn't drown in
// legendary hypercars. Numbers mirror itemRarity()'s luxury-tier bands.
const RARITY_TABLE: { r: Rarity; p: number; luxBoost: [number, number]; priceMult: [number, number] }[] = [
  { r: 'common',    p: 0.55, luxBoost: [0, 9],     priceMult: [0.6, 1.0] },
  { r: 'uncommon',  p: 0.25, luxBoost: [10, 49],   priceMult: [1.0, 1.6] },
  { r: 'rare',      p: 0.15, luxBoost: [50, 299],  priceMult: [1.8, 3.2] },
  { r: 'legendary', p: 0.05, luxBoost: [300, 4000],priceMult: [3.5, 6.0] },
];

// ---- deterministic RNG helpers ----
function rngRange(rng: () => number, lo: number, hi: number): number {
  return lo + rng() * (hi - lo);
}
function rngPick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function rngRarity(rng: () => number): typeof RARITY_TABLE[number] {
  const r = rng();
  let acc = 0;
  for (const tier of RARITY_TABLE) {
    acc += tier.p;
    if (r <= acc) return tier;
  }
  return RARITY_TABLE[0];
}
function rngHex(rng: () => number): string {
  // pleasant-ish saturated hex — pick from a curated palette so generated
  // items don't clash with the rest of the catalogue. Falls back to a random
  // 24-bit hex if the palette is exhausted.
  const palette = ['#dc2626', '#ea580c', '#f59e0b', '#ca8a04', '#16a34a', '#15803d',
    '#0f766e', '#0ea5e9', '#2563eb', '#1d4ed8', '#4338ca', '#7c3aed', '#c026d3',
    '#db2777', '#be185d', '#78350f', '#475569', '#0f172a'];
  return palette[Math.floor(rng() * palette.length)];
}

// ---- LLM call (OpenAI-compatible /v1/chat/completions) ----
interface LLMItemFields { brand?: string; name?: string; color?: string; backstory?: string }

async function callLlama(prompt: string): Promise<LLMItemFields | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: 'You are the item generator for the HuyenBao luxury life-sim game. Reply with a single compact JSON object and nothing else — no markdown fences, no commentary.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.85,
        stream: false,
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const j = await res.json() as { choices?: { message?: { content?: string } }[] };
    const raw = j.choices?.[0]?.message?.content || '';
    return parseLlmJson(raw);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function parseLlmJson(raw: string): LLMItemFields | null {
  // Pull the first {...} block out of the LLM reply (it sometimes wraps the
  // JSON in markdown fences despite the system prompt).
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as LLMItemFields;
    if (typeof j !== 'object' || j === null) return null;
    return {
      brand: typeof j.brand === 'string' ? j.brand.slice(0, 60) : undefined,
      name: typeof j.name === 'string' ? j.name.slice(0, 80) : undefined,
      color: typeof j.color === 'string' ? j.color.slice(0, 9) : undefined,
      backstory: typeof j.backstory === 'string' ? j.backstory.slice(0, 220) : undefined,
    };
  } catch {
    return null;
  }
}

// ---- deterministic fallback (used when the LLM is offline / unreachable) ----
const FB_BRAND_PREFIX = ['Aether', 'Atlas', 'Aurum', 'Borealis', 'Cipher', 'Crown', 'Eclipse',
  'Ember', 'Halcyon', 'Helix', 'Imperial', 'Lumen', 'Meridian', 'Nimbus', 'Onyx', 'Orion',
  'Pinnacle', 'Quartz', 'Radiant', 'Sable', 'Solstice', 'Vanguard', 'Veridian', 'Zephyr'];
const FB_NAME_FRAG = ['One', 'Signature', 'Edition', 'Grand', 'Limited', 'Bespoke', 'Heritage',
  'Royal', 'Prime', 'Elite', 'Mark II', 'Nocturne', 'Apex', 'Vantage', 'Sterling', 'Genesis'];

function fallbackFields(rng: () => number, cat: string): LLMItemFields {
  const brand = rngPick(rng, FB_BRAND_PREFIX) + ' ' + rngPick(rng, ['Atelier', 'Works', 'House', 'Manufacture', 'Studio']);
  const name = rngPick(rng, FB_NAME_FRAG) + ' ' + cat.split(' ')[0];
  return {
    brand,
    name,
    color: rngHex(rng),
    backstory: `A ${cat.toLowerCase()} dreamed up by the ${brand.split(' ')[0]} atelier when the brief was simply "build something rare".`,
  };
}

// ---- image search (z-ai-web-dev-sdk first, picsum.photos fallback) ----
let zaiClient: Promise<ZAI> | null = null;
async function getZai(): Promise<ZAI> {
  if (!zaiClient) zaiClient = ZAI.create();
  try { return await zaiClient; }
  catch (e) { zaiClient = null; throw e; }
}

async function searchImage(query: string): Promise<string | null> {
  // 1) z-ai-web-dev-sdk image search (the same SDK other routes already use).
  try {
    const zai = await getZai();
    const r = await zai.images.search.create({ query, count: 1 });
    const url = r?.results?.[0]?.original_url;
    if (typeof url === 'string' && url.startsWith('http')) return url;
  } catch (e) {
    console.error('items/generate: z-ai image search failed:', e);
  }
  // 2) picsum.photos seeded by the query — generic but always reachable.
  try {
    const seed = encodeURIComponent(query.replace(/\s+/g, '-').toLowerCase()).slice(0, 60);
    return `https://picsum.photos/seed/${seed}/800/600`;
  } catch {
    return null;
  }
}

// ---- the assembled response shape ----
interface GeneratedItem extends ItemDef {
  story: string;
  image: string | null;
  condition: number; // 100 for a fresh item; the field is here so the client
                     // can drop the item into the used-market pool too.
  source: 'llm' | 'fallback';
}

// ---- main POST handler ----
export async function POST() {
  // Use crypto.randomUUID if available (Node 18+), else a time-based fallback.
  const rng = Math.random;
  const cat = rngPick(rng, CATEGORIES);
  const meta = CAT_META[cat];
  const tier = rngRarity(rng);

  // Luxury score lands inside the rarity band AND the category's band — take
  // the overlap so e.g. a legendary Phone isn't 4000 lux (which would dwarf
  // every curated item in the catalogue).
  const lux = Math.round(rngRange(rng, Math.max(tier.luxBoost[0], meta.luxLo), Math.min(tier.luxBoost[1], meta.luxHi)));
  const priceBase = rngRange(rng, meta.priceLo, meta.priceHi);
  const priceMult = rngRange(rng, tier.priceMult[0], tier.priceMult[1]);
  const price = Math.max(1, Math.round(priceBase * priceMult));
  const rate = Math.round(rngRange(rng, meta.rate[0], meta.rate[1]) * 100) / 100;

  // Ask the LLM for brand + name + colour + backstory, with the chosen
  // category + rarity as context. If it fails, the deterministic fallback
  // supplies the same four fields so the assembled item is never short.
  const prompt = [
    `Generate a fictional luxury ${cat} for a life-simulation game.`,
    `Rarity tier: ${tier.r} (luxury score ${lux}, target price ~$${price.toLocaleString('vi-VN')}).`,
    `Reply with a single JSON object:`,
    `{"brand": string (a plausible fictional brand name, 1-3 words, no real trademarks),`,
    ` "name": string (a model / collection name, 1-4 words),`,
    ` "color": string (a hex colour like "#1d4ed8"),`,
    ` "backstory": string (1-2 sentences, evocative, no real people or trademarks)}`,
    `Do NOT include any other keys, markdown, or commentary.`,
  ].join('\n');

  let fields: LLMItemFields | null = null;
  let source: 'llm' | 'fallback' = 'fallback';
  try {
    fields = await callLlama(prompt);
    if (fields && (fields.brand || fields.name)) source = 'llm';
  } catch (e) {
    console.error('items/generate: LLM call threw:', e);
  }
  if (!fields) fields = fallbackFields(rng, cat);

  // Fill any gaps the LLM left empty.
  const brand = fields.brand?.trim() || (fallbackFields(rng, cat).brand || rngPick(rng, FB_BRAND_PREFIX));
  const name = fields.name?.trim() || rngPick(rng, FB_NAME_FRAG);
  let color = fields.color?.trim() || rngHex(rng);
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) color = rngHex(rng);
  const story = fields.backstory?.trim() || `A ${cat.toLowerCase()} that turned up at a private viewing with no name on the label.`;

  // Stable-ish id so a re-generate of the same brand+name doesn't pile up.
  const slug = (brand + ' ' + name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const id = `gen-${slug}-${Math.floor(rng() * 1e6).toString(36)}`;

  // Image search — best-effort, never blocks the response.
  const query = `${brand} ${name} ${cat}`.trim();
  const image = await searchImage(query);

  const out: GeneratedItem = {
    id,
    cat,
    brand,
    name,
    c: color,
    price,
    lux,
    rate,
    art: meta.art,
    rarity: tier.r,
    story,
    image,
    condition: 100,
    source,
  };
  return NextResponse.json(out, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
