// POST /api/story — LLM "life director": invents a brand-new life event for the
// player's exact situation (era, wealth, career, family...) while avoiding every
// premise the player has already seen. Falls back to a local generator so the
// endpoint ALWAYS returns a valid event.
//
// v10.4: tries a local LLM (Ollama-style) at LLM_BASE_URL (default
// http://0.0.0.0:8888) FIRST. If unreachable, falls back to ZAI cloud, then
// to the deterministic local template engine. Also accepts a `kind` hint so
// the random "luck / badluck / lifestage / story" dispatch on the client can
// be honoured by the LLM prompt.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { localTwist, pickKind } from '@/lib/story';
import type { AIEvent, AIEventKind } from '@/lib/engine';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://0.0.0.0:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 20000);

const DIRECTIONS_BY_KIND: Record<AIEventKind, string[]> = {
  story: [
    'a career crossroads: a risky promotion, a rival offering a job, or a bold pivot',
    'a brush with fame or scandal that changes how people see the player',
    'a romance twist that collides with business ambitions',
    'a mysterious encounter: an old letter, a stranger, a forgotten debt'
  ],
  luck: [
    'a windfall that arrives in an unusual way (inheritance, viral moment, forgotten asset)',
    'a lucky break that boosts the player\'s fame, money, or connections',
    'a serendipitous meeting that opens an unexpected door'
  ],
  badluck: [
    'a loss that arrives in an unusual way (fire, theft, lawsuit, market crash)',
    'a scandal or PR crisis that demands a fast decision',
    'a betrayal by a trusted hire or partner that costs money and trust'
  ],
  lifestage: [
    'a life-stage pivot: closing a losing line early to cut losses, liquidating branches',
    'dropping out of a course mid-way to chase what the era actually needs',
    'a wrong turn the player took that they now have to undo',
    'a buyout offer for the player\'s main business line',
    'burnout at the door: the body is keeping a ledger'
  ]
};

interface Choice { l: string; cost?: number; money?: number; fame?: number; out?: string; decline?: number; dropout?: { slot: 'study' | 'sideStudy' }; liquidate?: { biz: string; n: number } }
interface StoryEv { title: string; text: string; choices: Choice[]; kind?: AIEventKind }

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();
let zaiClient: ReturnType<typeof ZAI.create> | null = null;

function isRateLimited(ip: string, now = Date.now()): boolean {
  for (const [key, value] of requestsByIp) {
    if (value.resetAt <= now) requestsByIp.delete(key);
  }
  const entry = requestsByIp.get(ip);
  if (!entry || entry.resetAt <= now) {
    if (requestsByIp.size >= 10_000) {
      const oldest = requestsByIp.keys().next().value;
      if (oldest) requestsByIp.delete(oldest);
    }
    requestsByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

async function getZaiClient(): Promise<ZAI> {
  if (!zaiClient) zaiClient = ZAI.create();
  try {
    return await zaiClient;
  } catch (error) {
    zaiClient = null;
    throw error;
  }
}

function clampEv(ev: StoryEv, netWorth: number): AIEvent {
  const cap = Math.max(5000, Math.round(Math.max(0, netWorth) * .4));
  const choices = (Array.isArray(ev.choices) ? ev.choices : []).slice(0, 3).map(c => ({
    l: String(c.l || 'Continue').slice(0, 48),
    cost: c.cost ? Math.min(Math.round(Math.abs(+c.cost)), cap) : undefined,
    money: c.money ? Math.max(-cap * 3, Math.min(Math.round(+c.money), cap * 3)) : undefined,
    fame: c.fame ? Math.max(-10, Math.min(10, Math.round(+c.fame))) : undefined,
    out: c.out ? String(c.out).slice(0, 140) : undefined,
    decline: c.decline ? Math.max(1, Math.min(20, Math.round(+c.decline))) : undefined,
    dropout: c.dropout && (c.dropout.slot === 'study' || c.dropout.slot === 'sideStudy') ? { slot: c.dropout.slot } : undefined,
    liquidate: c.liquidate && typeof c.liquidate.biz === 'string' && typeof c.liquidate.n === 'number'
      ? { biz: String(c.liquidate.biz).slice(0, 16), n: Math.max(1, Math.min(10, Math.round(+c.liquidate.n))) }
      : undefined
  }));
  return {
    title: String(ev.title || 'A twist of fate').slice(0, 64),
    text: String(ev.text || 'Something unexpected happens.').slice(0, 300),
    choices: choices.length ? choices : [{ l: 'Face it', out: 'You deal with it in your own way.' }],
    kind: ev.kind,
    source: 'backend'
  };
}

// ----- local LLM (Ollama-style /v1/chat/completions or /api/chat) -----
async function callLocalLLM(sys: string, user: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    // Try OpenAI-compatible /v1/chat/completions first (works for vLLM, LM Studio,
    // text-generation-webserver, and Ollama with the OpenAI shim enabled).
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ],
        temperature: 0.85,
        stream: false
      }),
      signal: ctrl.signal
    });
    if (res.ok) {
      const j = await res.json() as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content || '';
      if (raw) return raw;
    }
    // Fall back to Ollama's native /api/chat endpoint
    const res2 = await fetch(`${LLM_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ],
        stream: false
      }),
      signal: ctrl.signal
    });
    if (res2.ok) {
      const j2 = await res2.json() as { message?: { content?: string } };
      const raw2 = j2.message?.content || '';
      if (raw2) return raw2;
    }
    return null;
  } catch {
    // network error / abort / non-JSON response — fall through to next provider
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many story requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  let body: { state?: Record<string, unknown>; used?: string[]; kind?: AIEventKind } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const state = body.state || {};
  const used = Array.isArray(body.used) ? body.used.slice(-24) : [];
  // Honour the kind the client picked, or sample one from the snapshot.
  const kind: AIEventKind = (['story', 'luck', 'badluck', 'lifestage'].includes(body.kind as string))
    ? (body.kind as AIEventKind)
    : pickKind(state as Parameters<typeof pickKind>[0]);
  const direction = DIRECTIONS_BY_KIND[kind][Math.floor(Math.random() * DIRECTIONS_BY_KIND[kind].length)];

  const sys = [
    'You are the Story Engine of "Tycoon Life", a life-simulation game.',
    `Invent ONE brand-new life event of kind "${kind}".`,
    kind === 'luck' ? 'The event must be a genuine windfall — money, asset, or fame gain.' : '',
    kind === 'badluck' ? 'The event must be a real setback — loss, damage, scandal, or betrayal.' : '',
    kind === 'lifestage' ? 'The event must be a meaningful life-stage pivot: closing a losing line early, dropping out to chase the era, undoing a wrong turn, a buyout offer, or burnout.' : '',
    'The event must fit the player\'s exact situation: their era, country, age, wealth, career, businesses and family.',
    'Mention ONE concrete detail from the player\'s snapshot.',
    'It must NOT repeat any premise listed in "avoidThesePremises" and must not be generic.',
    'Respond with ONLY a JSON object, no markdown, in this exact shape:',
    '{"title": string (max 60 chars), "text": string (2-3 sentences, second person), "kind": "' + kind + '", "choices": [{"l": string (max 40 chars), "cost": number (optional money paid), "money": number (optional money gained, can be negative for a loss), "fame": number (optional -10..10), "decline": number (optional 1..20, health/spirit hit), "dropout": {"slot": "study"|"sideStudy"} (optional, only for lifestage), "liquidate": {"biz": string, "n": number} (optional, only for lifestage), "out": string (result sentence)}]}',
    'Give exactly 2 or 3 meaningful choices with different trade-offs.'
  ].filter(Boolean).join(' ');
  const user = JSON.stringify({ player: state, avoidThesePremises: used, direction, kind });

  // 1. Try the local LLM first (0.0.0.0:8888 by default).
  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as StoryEv;
        if (parsed && parsed.title && Array.isArray(parsed.choices) && parsed.choices.length) {
          const ev = clampEv({ ...parsed, kind }, Number(state.netWorth) || 0);
          return NextResponse.json({ ...ev, source: 'backend-local' });
        }
      }
    }
  } catch (e) {
    console.error('story: local LLM failed, falling back to ZAI:', e);
  }

  // 2. Fall back to ZAI cloud (when available).
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as StoryEv;
      if (parsed && parsed.title && Array.isArray(parsed.choices) && parsed.choices.length) {
        return NextResponse.json(clampEv({ ...parsed, kind }, Number(state.netWorth) || 0));
      }
    }
  } catch (e) {
    console.error('story: ZAI failed, using local template fallback:', e);
  }

  // 3. Final fallback — deterministic local template engine.
  const local = localTwist(state as Parameters<typeof localTwist>[0], used, kind);
  return NextResponse.json(local);
}
