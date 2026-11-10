// POST /api/divine — Kinh Dịch (I Ching) interpretation.
// v11.11: the deterministic coin-cast + hexagram lookup runs client-side
// (src/lib/iching.ts). This endpoint takes the cast result + the player's
// question and asks the local LLM (Ollama, same client as /api/story) for a
// short interpretation in the player's UI language. Falls back to ZAI cloud,
// then to a deterministic local reading built from the hexagram theme — so the
// endpoint ALWAYS returns a valid reading.
//
// This reuses the main app's existing Ollama connection (no runtime dependency
// on the separate Huyen-Hoc-AI FastAPI service). The FastAPI backend can be
// wired in as an optional source in a future version.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { Lang } from '@/lib/i18n';
import { HEXAGRAMS, type CastResult } from '@/lib/iching';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://0.0.0.0:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 30000);

const LANG_NAME: Record<Lang, string> = {
  en: 'English',
  vi: 'Tiếng Việt (Vietnamese)',
  zh: '简体中文 (Simplified Chinese)'
};
const LANG_DIRECTIVE: Record<Lang, string> = {
  en: 'Write the interpretation, advice, and verdictLabel in English.',
  vi: 'Write the interpretation, advice, and verdictLabel in Tiếng Việt (Vietnamese). Do NOT use English.',
  zh: '请用简体中文撰写 interpretation、advice 和 verdictLabel。不要使用英文。'
};

interface DivineBody {
  cast?: CastResult;
  question?: string;
  lang?: Lang;
}

interface DivineResponse {
  interpretation: string;
  advice: string;
  verdict: 'CAT' | 'HUNG' | 'TINH';
  verdictLabel: string;
  source: 'backend-local' | 'backend-zai' | 'local-fallback';
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
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
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
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
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function describeCast(cast: CastResult, lang: Lang): string {
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;
  const p = cast.primary;
  const lines = p.lines.slice().reverse() // top → bottom for readability
    .map(l => `hào ${l.pos}: ${l.yang ? '━━━━━ (dương)' : '━━ ━━ (âm)'}${l.moving ? ' [động]' : ''}`)
    .join('\n');
  const moved = cast.movingLines.length
    ? `Hào động: ${cast.movingLines.join(', ')}`
    : 'Hào động: không có (quẻ tĩnh)';
  const changed = cast.changed
    ? `Quẻ biến: #${cast.changed.num} ${L(cast.changed.name)} — ${L(cast.changed.theme)}`
    : 'Quẻ biến: không có (quẻ tĩnh, không hào động)';
  return [
    `Quẻ chính: #${p.num} ${p.name.vi} (${L(p.name)})`,
    `Chủ đề: ${L(p.theme)}`,
    `Thượng quái: ${p.upper.id} ${p.upper.symbol} (${L(p.upper.element)})`,
    `Hạ quái: ${p.lower.id} ${p.lower.symbol} (${L(p.lower.element)})`,
    moved,
    changed,
    `Các hào (từ trên xuống dưới):\n${lines}`
  ].join('\n');
}

function buildPrompt(cast: CastResult, question: string, lang: Lang): { sys: string; user: string } {
  const castInfo = describeCast(cast, lang);
  const sys = [
    'You are the Kinh Dịch (I Ching) oracle of "HuyenBao", a life-simulation game.',
    'A player has cast the coins and asked a question. Interpret the hexagram for them.',
    'Use ONLY the hexagram name, theme, trigrams, and moving lines provided in "castInfo". Do NOT invent a different hexagram or fabricate Chinese characters.',
    'If there are moving lines, the interpretation must explain the transition from the primary hexagram (quẻ chính) to the changed hexagram (quẻ biến).',
    'Keep the tone reflective and grounded. This is entertainment within a game, NOT real prophecy or advice — never tell the player to act on it in real life.',
    LANG_DIRECTIVE[lang],
    'Respond with ONLY a JSON object, no markdown, in this exact shape:',
    '{"interpretation": string (3-5 sentences, second person, grounded in the hexagram symbolism), "advice": string (1-2 sentences, a gentle, non-binding reflection — not a real-life directive), "verdict": "CAT" | "HUNG" | "TINH", "verdictLabel": string (one short word in the response language: auspicious / inauspicious / neutral)}',
    'verdict guide: CAT = the hexagram + moving lines suggest a favourable flow; HUNG = obstacles or caution; TINH = neutral, wait, or transitional.'
  ].filter(Boolean).join(' ');
  const user = JSON.stringify({ question, castInfo, responseLanguage: LANG_NAME[lang] });
  return { sys, user };
}

function localReading(cast: CastResult, question: string, lang: Lang): DivineResponse {
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;
  const p = cast.primary;
  const moved = cast.movingLines.length;
  // Deterministic-ish verdict: moving lines → transitional (TINH); otherwise
  // a soft heuristic from the hexagram number parity (odd → CAT-leaning, even →
  // TINH-leaning). This is a FALLBACK only — the LLM does the real reading.
  // (Cast to the full union so the label switch below stays type-safe.)
  const verdict = (moved ? 'TINH' : (p.num % 2 === 1 ? 'CAT' : 'TINH')) as DivineResponse['verdict'];
  const verdictLabel = verdict === 'CAT'
    ? (lang === 'vi' ? 'Cát' : lang === 'zh' ? '吉' : 'Auspicious')
    : verdict === 'HUNG'
      ? (lang === 'vi' ? 'Hung' : lang === 'zh' ? '凶' : 'Inauspicious')
      : (lang === 'vi' ? 'Tĩnh' : lang === 'zh' ? '静' : 'Neutral');
  const interp = lang === 'vi'
    ? `Quẻ ${p.num} · ${p.name.vi} — ${p.theme.vi}. Thượng quái ${p.upper.id} (${p.upper.element.vi}), hạ quái ${p.lower.id} (${p.lower.element.vi}). `
      + (moved ? `Có hào động ở vị trí ${cast.movingLines.join(', ')}, dẫn đến quẻ biến #${cast.changed!.num} ${cast.changed!.name.vi} — ${cast.changed!.theme.vi}: tình hình đang chuyển biến, cần chủ động ứng phó. ` : 'Quẻ tĩnh (không hào động): giữ trạng thái hiện tại, chờ thời. ')
      + `Đây là diễn giải tham khảo trong game, không phải lời tiên tri hay khuyên bạn hành động ngoài đời.`
    : lang === 'zh'
      ? `第${p.num}卦 · ${p.name.zh}（${p.name.vi}）— ${p.theme.zh}。上卦${p.upper.id}（${p.upper.element.zh}），下卦${p.lower.id}（${p.lower.element.zh}）。`
        + (moved ? `动爻在第${cast.movingLines.join('、')}位，变为第${cast.changed!.num}卦 ${cast.changed!.name.zh} — ${cast.changed!.theme.zh}：局势正在转变，需主动应对。` : '静卦（无动爻）：维持现状，待时而动。')
        + `此为游戏中的参考解读，并非预言或现实建议。`
      : `Hexagram ${p.num} · ${p.name.en} (${p.name.vi}) — ${p.theme.en}. Upper trigram ${p.upper.id} (${p.upper.element.en}), lower trigram ${p.lower.id} (${p.lower.element.en}). `
        + (moved ? `Moving lines at position${cast.movingLines.length > 1 ? 's' : ''} ${cast.movingLines.join(', ')}, leading to changed hexagram #${cast.changed!.num} ${cast.changed!.name.en} — ${cast.changed!.theme.en}: the situation is transitioning, respond actively. ` : 'Static hexagram (no moving lines): hold the current state, wait for the right moment. ')
        + `This is an in-game reference reading, not a prophecy or real-life advice.`;
  const advice = lang === 'vi'
    ? 'Hãy coi đây là gợi ý tham khảo trong trò chơi — quyết định đời thật do bạn tự chịu trách nhiệm.'
    : lang === 'zh'
      ? '请将其视为游戏内的参考——现实决策由你自行负责。'
      : 'Treat this as in-game reference only — real-life decisions are your own responsibility.';
  return { interpretation: interp, advice, verdict, verdictLabel, source: 'local-fallback' };
}

function parseReading(raw: string, cast: CastResult, question: string, lang: Lang, source: DivineResponse['source']): DivineResponse | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<DivineResponse>;
    if (!j.interpretation) return null;
    const v = (j.verdict === 'CAT' || j.verdict === 'HUNG' || j.verdict === 'TINH') ? j.verdict : 'TINH';
    return {
      interpretation: String(j.interpretation).slice(0, 600),
      advice: String(j.advice || '').slice(0, 240),
      verdict: v,
      verdictLabel: String(j.verdictLabel || v).slice(0, 24),
      source
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  let body: DivineBody = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const lang: Lang = (['en', 'vi', 'zh'].includes(body.lang as string) ? body.lang : 'en') as Lang;
  const cast = body.cast;
  const question = (body.question || '').trim();
  if (!cast || !cast.primary || !question) {
    return NextResponse.json({ error: 'Missing cast or question.' }, { status: 400 });
  }
  // Sanity-check the cast against the canonical hexagram table (defence against
  // a malformed/malicious client payload).
  const ref = HEXAGRAMS[cast.primary.num - 1];
  if (!ref) {
    return NextResponse.json({ error: 'Invalid hexagram.' }, { status: 400 });
  }

  const { sys, user } = buildPrompt(cast, question, lang);

  // 1. Local LLM (Ollama).
  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) {
      const r = parseReading(raw, cast, question, lang, 'backend-local');
      if (r) return NextResponse.json(r);
    }
  } catch (e) {
    console.error('divine: local LLM failed:', e);
  }

  // 2. ZAI cloud.
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const r = parseReading(raw, cast, question, lang, 'backend-zai');
    if (r) return NextResponse.json(r);
  } catch (e) {
    console.error('divine: ZAI failed, using local reading:', e);
  }

  // 3. Deterministic local reading.
  return NextResponse.json(localReading(cast, question, lang));
}
