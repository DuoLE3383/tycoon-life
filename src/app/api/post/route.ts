// POST /api/post — generates one in-game social-media post for the player's
// exact situation (era, nation, wealth, businesses, fame). Tries the local
// LLM at LLM_BASE_URL (default http://0.0.0.0:8888) first, falls back to ZAI
// cloud, then to a static template. The client (SocialTab.aiPost) does its
// own local fallback as well, so this endpoint always returns SOMETHING.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

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

let zaiClient: ReturnType<typeof ZAI.create> | null = null;
async function getZaiClient(): Promise<ZAI> {
  if (!zaiClient) zaiClient = ZAI.create();
  try { return await zaiClient; }
  catch (e) { zaiClient = null; throw e; }
}

async function callLocalLLM(sys: string, user: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.9, stream: false }),
      signal: ctrl.signal
    });
    if (res.ok) {
      const j = await res.json() as { choices?: { message?: { content?: string } }[] };
      const raw = j.choices?.[0]?.message?.content || '';
      if (raw) return raw;
    }
    const res2 = await fetch(`${LLM_BASE_URL}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], stream: false }),
      signal: ctrl.signal
    });
    if (res2.ok) {
      const j2 = await res2.json() as { message?: { content?: string } };
      const raw2 = j2.message?.content || '';
      if (raw2) return raw2;
    }
    return null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip')?.trim() || 'unknown';
  if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many post requests. Slow down.' }, { status: 429, headers: { 'Retry-After': '60' } });
  let body: { state?: Record<string, unknown> } = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const snap = body.state || {};
  const sys = [
    'You are the in-game social-media ghost writer for a tycoon in the Mogul life-simulation game.',
    'Given the player\'s snapshot (era, nation, wealth, businesses, fame), write ONE post — max 220 chars, second person, grounded in their exact situation.',
    'No hashtags, no emoji spam. Mention one concrete detail from the snapshot.',
    'Vary the tone: reflective, hype, grateful, or wry — never corporate.',
    'Respond with ONLY a JSON object: {"text": string}. No markdown, no extra keys.'
  ].join(' ');
  const user = JSON.stringify({ player: snap });
  // 1. Local LLM
  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        const parsed = JSON.parse(m[0]) as { text?: string };
        if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
          return NextResponse.json({ text: parsed.text.slice(0, 240), source: 'backend-local' });
        }
      }
      // Sometimes the model returns the post as plain text without JSON wrapping.
      const clean = raw.trim().replace(/^["']|["']$/g, '');
      if (clean.length > 8 && clean.length < 400) {
        return NextResponse.json({ text: clean.slice(0, 240), source: 'backend-local' });
      }
    }
  } catch (e) { console.error('post: local LLM failed:', e); }
  // 2. ZAI cloud
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]) as { text?: string };
      if (parsed && typeof parsed.text === 'string' && parsed.text.trim()) {
        return NextResponse.json({ text: parsed.text.slice(0, 240), source: 'backend' });
      }
    }
  } catch (e) { console.error('post: ZAI failed:', e); }
  // 3. Static fallback — the client also has its own creativePost fallback,
  // so returning a 502 here is fine; the client will use the local template.
  return NextResponse.json({ error: 'No post generated' }, { status: 502 });
}
