// POST /api/deduce — given an event + chosen option + player state, asks the
// local LLM at LLM_BASE_URL (default http://0.0.0.0:8888) to deduce / extend
// the outcome text. Falls back to the static `out` from the choice if the LLM
// is unreachable, so the engine always has SOMETHING to show.
//
// Body: { event: { title, text, kind? }, choice: { l, cost?, money?, fame?,
//         decline?, dropout?, liquidate?, out? }, state: snapshot }
// Returns: { out: string, source: 'backend-local' | 'static' }
import { NextRequest, NextResponse } from 'next/server';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://0.0.0.0:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 12000);

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 30;
const requestsByIp = new Map<string, { count: number; resetAt: number }>();

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

async function callLocalLLM(sys: string, user: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: user }
        ],
        temperature: 0.7,
        stream: false
      }),
      signal: ctrl.signal
    });
    if (res.ok) {
      const j = await res.json() as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content || '';
      if (raw) return raw;
    }
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
      { error: 'Too many deduce requests. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  let body: {
    event?: { title?: string; text?: string; kind?: string };
    choice?: { l?: string; cost?: number; money?: number; fame?: number; out?: string; decline?: number; dropout?: unknown; liquidate?: unknown };
    state?: Record<string, unknown>;
  } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const ev = body.event || {};
  const choice = body.choice || {};
  const state = body.state || {};
  const staticOut = typeof choice.out === 'string' && choice.out.trim()
    ? String(choice.out).slice(0, 220)
    : 'You make the call and live with it.';

  const sys = [
    'You are the Outcome Engine of "Tycoon Life", a life-simulation game.',
    'Given a life event and the choice the player just made, write ONE follow-up sentence that dramatises the immediate consequence.',
    'Second person, past tense, grounded in the player\'s era and assets. No moralising.',
    'Respond with ONLY a JSON object: {"out": string (max 180 chars)}. No markdown, no extra keys.'
  ].join(' ');
  const user = JSON.stringify({
    player: state,
    event: { title: ev.title, text: ev.text, kind: ev.kind },
    choice: {
      label: choice.l,
      cost: choice.cost, money: choice.money, fame: choice.fame,
      decline: choice.decline,
      dropout: choice.dropout ? 'drops out' : undefined,
      liquidate: choice.liquidate ? 'liquidates' : undefined
    }
  });

  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { out?: string };
        if (parsed && typeof parsed.out === 'string' && parsed.out.trim()) {
          return NextResponse.json({ out: parsed.out.slice(0, 220), source: 'backend-local' });
        }
      }
    }
  } catch (e) {
    console.error('deduce: local LLM failed, using static out:', e);
  }
  return NextResponse.json({ out: staticOut, source: 'static' });
}
