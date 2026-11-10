// POST /api/phongthuy — Bát Trạch (八宅) + Cửu Tinh (九星) phong thuỷ interpretation.
// v11.15: the deterministic reading is built client-side (src/lib/phongthuy.ts).
// This endpoint takes the reading + the player's UI language and asks the local
// LLM (Ollama, same client as /api/story + /api/divine + /api/tuvi) for a short
// interpretation. Falls back to ZAI cloud, then to a deterministic local reading
// built from the Kua number + house-direction match — so the endpoint ALWAYS
// returns a reading.
//
// Same architecture as /api/divine (Kinh Dịch) and /api/tuvi (Tử Vi): no runtime
// dependency on the separate Huyen-Hoc-AI FastAPI service — uses the main app's
// own Ollama.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { Lang } from '@/lib/i18n';
import type { PhongThuyReading } from '@/lib/phongthuy';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://0.0.0.0:8888';
const LLM_MODEL = process.env.LLM_MODEL || 'qwen2.5:7b';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS || 30000);

const LANG_NAME: Record<Lang, string> = {
  en: 'English', vi: 'Tiếng Việt (Vietnamese)', zh: '简体中文 (Simplified Chinese)'
};
const LANG_DIRECTIVE: Record<Lang, string> = {
  en: 'Write the interpretation and advice in English.',
  vi: 'Write the interpretation and advice in Tiếng Việt (Vietnamese). Do NOT use English.',
  zh: '请用简体中文撰写 interpretation 和 advice。不要使用英文。'
};

interface PhongThuyBody { reading?: PhongThuyReading; lang?: Lang; }
interface PhongThuyResponse {
  interpretation: string;
  advice: string;
  source: 'backend-local' | 'backend-zai' | 'local-fallback';
}

let zaiClient: ReturnType<typeof ZAI.create> | null = null;
async function getZaiClient(): Promise<ZAI> {
  if (!zaiClient) zaiClient = ZAI.create();
  try { return await zaiClient; } catch (e) { zaiClient = null; throw e; }
}
async function callLocalLLM(sys: string, user: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${LLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: LLM_MODEL, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.7, stream: false }),
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
  } catch { return null; } finally { clearTimeout(timer); }
}

// Compress the full reading into a few lines the LLM can reason over. We focus
// on: Kua number + quai + group, all 4 good directions (with their cung-vi),
// the house/kitchen/bedroom direction matches, and today's flying-star center.
function describeReading(r: PhongThuyReading): string {
  const goodDirs = r.huongTot.map(h => `${h.cung} → ${h.huong}`).join(', ');
  const badDirs = r.huongXau.map(h => `${h.cung} → ${h.huong}`).join(', ');
  const houseLine = `House direction ${r.huongNha.huongNha}: falls in ${r.huongNha.cung} (${r.huongNha.tot ? 'good' : 'bad'}, score ${r.huongNha.diemThamKhao}/100)`;
  const kitchenLine = r.huongBep
    ? `Kitchen direction ${r.huongBep.huongNha}: ${r.huongBep.cung} (${r.huongBep.tot ? 'good' : 'bad'}, ${r.huongBep.diemThamKhao}/100)`
    : '(kitchen direction not provided)';
  const bedroomLine = r.huongPhongNgu
    ? `Bedroom direction ${r.huongPhongNgu.huongNha}: ${r.huongPhongNgu.cung} (${r.huongPhongNgu.tot ? 'good' : 'bad'}, ${r.huongPhongNgu.diemThamKhao}/100)`
    : '(bedroom direction not provided)';
  const today = r.phiTinhHomNay;
  return [
    `Cung phi (Kua): ${r.cungPhi} — quai ${r.quai} — nhóm ${r.nhom}`,
    `4 good directions: ${goodDirs}`,
    `4 bad directions: ${badDirs}`,
    houseLine,
    kitchenLine,
    bedroomLine,
    `Today (${today.ngay}) niên phi tinh: sao trung cung = ${today.saoTrungCung} (${today.saoInfo.ten}, hành ${today.saoInfo.hanh})`,
  ].join('\n');
}

function buildPrompt(r: PhongThuyReading, lang: Lang): { sys: string; user: string } {
  const summary = describeReading(r);
  const sys = [
    'You are the Bát Trạch (八宅 / Vietnamese feng-shui) oracle of "HuyenBao", a life-simulation game.',
    'A player has generated their simplified phong thuỷ reading. Interpret it for them.',
    'Use ONLY the Kua number, directions, cung-vi matches, and flying-star info provided in "summary". Do NOT invent directions or stars not listed.',
    'Focus on: (1) whether the player\'s house direction matches their Kua (the strongest signal), then briefly touch kitchen + bedroom if provided; (2) which of their 4 good directions are most relevant for the player\'s purposes; (3) today\'s flying star centre.',
    'Keep the tone reflective and grounded. This is entertainment within a game, NOT real feng-shui advice — never tell the player to renovate, move, or change real-life decisions based on it.',
    LANG_DIRECTIVE[lang],
    'Respond with ONLY a JSON object, no markdown, in this exact shape:',
    '{"interpretation": string (4-6 sentences, second person, grounded in the directions actually provided), "advice": string (1-2 sentences, a gentle non-binding reflection — not a real-life directive)}',
  ].filter(Boolean).join(' ');
  const user = JSON.stringify({ summary, responseLanguage: LANG_NAME[lang] });
  return { sys, user };
}

// Deterministic local reading used when both Ollama + ZAI fail. Mirrors the
// tuvi local fallback: builds a sentence from the Kua + house-direction match.
function localReading(r: PhongThuyReading, lang: Lang): PhongThuyResponse {
  const house = r.huongNha;
  const goodList = r.huongTot.map(h => `${h.huong} (${h.cung})`).join(', ');
  const today = r.phiTinhHomNay;
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;

  const interp = lang === 'vi'
    ? `Bát Trạch giản lược — Cung phi (Kua) ${r.cungPhi}, quai ${r.quai}, nhóm ${r.nhom}. `
      + `Hướng nhà ${house.huongNha} rơi vào cung ${house.cung} (${house.tot ? 'hướng tốt' : 'hướng xấu'}, điểm tham khảo ${house.diemThamKhao}/100). `
      + (house.tot
        ? `Bốn hướng tốt cho bạn là: ${goodList}. `
        : `Hướng nhà hiện tại không thuộc nhóm bốn hướng tốt (${goodList}). `)
      + (r.huongBep ? `Bếp hướng ${r.huongBep.huongNha} → ${r.huongBep.cung} (${r.huongBep.tot ? 'tốt' : 'xấu'}). ` : '')
      + (r.huongPhongNgu ? `Phòng ngủ hướng ${r.huongPhongNgu.huongNha} → ${r.huongPhongNgu.cung} (${r.huongPhongNgu.tot ? 'tốt' : 'xấu'}). ` : '')
      + `Hôm nay (${today.ngay}) sao trung cung phi tinh = ${today.saoTrungCung} (${today.saoInfo.ten}, hành ${today.saoInfo.hanh}). `
      + `Đây là diễn giải tham khảo trong game, không phải tư vấn phong thủy đời thật.`
    : lang === 'zh'
      ? `简略八宅 — 命卦（Kua）${r.cungPhi}，${r.quai}卦，${r.nhom}。`
        + `宅向${house.huongNha}落入${house.cung}宫（${house.tot ? '吉方' : '凶方'}，参考分${house.diemThamKhao}/100）。`
        + (house.tot
          ? `你的四个吉方为：${goodList}。`
          : `当前宅向不在四个吉方之列（${goodList}）。`)
        + (r.huongBep ? `厨向${r.huongBep.huongNha} → ${r.huongBep.cung}（${r.huongBep.tot ? '吉' : '凶'}）。` : '')
        + (r.huongPhongNgu ? `卧向${r.huongPhongNgu.huongNha} → ${r.huongPhongNgu.cung}（${r.huongPhongNgu.tot ? '吉' : '凶'}）。` : '')
        + `今日（${today.ngay}）中宫飞星 = ${today.saoTrungCung}（${today.saoInfo.ten}，${today.saoInfo.hanh}行）。`
        + `此为游戏内参考解读，并非现实风水咨询。`
      : `Simplified Bát Trạch — Kua number ${r.cungPhi}, quai ${r.quai}, ${r.nhom}. `
        + `House direction ${house.huongNha} falls in the ${house.cung} cung-vi (${house.tot ? 'a good direction' : 'a bad direction'}, reference score ${house.diemThamKhao}/100). `
        + (house.tot
          ? `Your four good directions are: ${goodList}. `
          : `The current house direction is not among your four good directions (${goodList}). `)
        + (r.huongBep ? `Kitchen faces ${r.huongBep.huongNha} → ${r.huongBep.cung} (${r.huongBep.tot ? 'good' : 'bad'}). ` : '')
        + (r.huongPhongNgu ? `Bedroom faces ${r.huongPhongNgu.huongNha} → ${r.huongPhongNgu.cung} (${r.huongPhongNgu.tot ? 'good' : 'bad'}). ` : '')
        + `Today (${today.ngay}) flying-star centre = ${today.saoTrungCung} (${today.saoInfo.ten}, ${today.saoInfo.hanh} element). `
        + `This is an in-game reference reading, not real feng-shui advice.`;

  const advice = L({
    vi: 'Hãy coi đây là tham khảo trong trò chơi — quyết định đời thật do bạn tự chịu trách nhiệm.',
    zh: '请将其视为游戏内的参考——现实决策由你自行负责。',
    en: 'Treat this as in-game reference only — real-life decisions are your own responsibility.',
  });
  return { interpretation: interp, advice, source: 'local-fallback' };
}

function parseReading(raw: string, source: PhongThuyResponse['source']): PhongThuyResponse | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<PhongThuyResponse>;
    if (!j.interpretation) return null;
    return {
      interpretation: String(j.interpretation).slice(0, 900),
      advice: String(j.advice || '').slice(0, 240),
      source
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  let body: PhongThuyBody = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const lang: Lang = (['en', 'vi', 'zh'].includes(body.lang as string) ? body.lang : 'en') as Lang;
  const r = body.reading;
  if (!r || typeof r.cungPhi !== 'number' || !Array.isArray(r.huongTot) || !r.huongNha) {
    return NextResponse.json({ error: 'Missing or invalid phong thuỷ reading.' }, { status: 400 });
  }
  const { sys, user } = buildPrompt(r, lang);
  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) { const parsed = parseReading(raw, 'backend-local'); if (parsed) return NextResponse.json(parsed); }
  } catch (e) { console.error('phongthuy: local LLM failed:', e); }
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const parsed = parseReading(raw, 'backend-zai');
    if (parsed) return NextResponse.json(parsed);
  } catch (e) { console.error('phongthuy: ZAI failed, using local reading:', e); }
  return NextResponse.json(localReading(r, lang));
}
