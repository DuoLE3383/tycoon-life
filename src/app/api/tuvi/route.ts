// POST /api/tuvi — Tử Vi (紫微斗数) natal chart interpretation.
// v11.14: the deterministic chart is built client-side (src/lib/tuvi.ts). This
// endpoint takes the lá số + the player's UI language and asks the local LLM
// (Ollama, same client as /api/story + /api/divine) for a short interpretation.
// Falls back to ZAI cloud, then to a deterministic local reading built from the
// Mệnh palace's chính tinh + trạng thái — so the endpoint ALWAYS returns a reading.
//
// Same architecture as /api/divine (Kinh Dịch): no runtime dependency on the
// separate Huyen-Hoc-AI FastAPI service — uses the main app's own Ollama.
import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import type { Lang } from '@/lib/i18n';
import type { LaSo } from '@/lib/tuvi';

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://127.0.0.1:8888';
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

interface TuViBody { laso?: LaSo; lang?: Lang; }
interface TuViResponse { interpretation: string; advice: string; source: 'backend-local' | 'backend-zai' | 'local-fallback'; }

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

function describeLaSo(laso: LaSo): string {
  const m = laso.cung.find(p => p.laMenh);
  const menhStars = m ? m.chinhTinh.map(s => `${s.sao} (${s.trangThai})`).join(', ') : '(none)';
  const thanPalace = laso.cung.find(p => p.laThan);
  const thanStars = thanPalace ? thanPalace.chinhTinh.map(s => s.sao).join(', ') : '(none)';
  // The three most-read palaces besides Mệnh: Quan Lộc (career), Tài Bạch (money), Phu Thê (spouse).
  const career = laso.cung.find(p => p.cung === 'Quan Lộc');
  const money = laso.cung.find(p => p.cung === 'Tài Bạch');
  const spouse = laso.cung.find(p => p.cung === 'Phu Thê');
  const fmt = (p?: typeof career) => p ? (p.chinhTinh.length ? p.chinhTinh.map(s => `${s.sao} (${s.trangThai})`).join(', ') : '(no main star)') : '(none)';
  return [
    `Dương lịch: ${laso.duongLich} — Âm lịch: ${laso.amLich}`,
    `Can Chi năm: ${laso.canChiNam}`,
    `Giờ sinh: ${laso.gioSinh}`,
    `Cục: ${laso.cuc}`,
    `Mệnh cung tại ${laso.menhChi} — chính tinh: ${menhStars}`,
    `Thân cung tại ${laso.thanChi} — chính tinh: ${thanStars}`,
    `Tử Vi tọa tại ${laso.tuViTai}`,
    `Quan Lộc (career): ${fmt(career)}`,
    `Tài Bạch (money): ${fmt(money)}`,
    `Phu Thê (spouse): ${fmt(spouse)}`,
  ].join('\n');
}

function buildPrompt(laso: LaSo, lang: Lang): { sys: string; user: string } {
  const chart = describeLaSo(laso);
  const sys = [
    'You are the Tử Vi (紫微斗数 / Vietnamese astrology) oracle of "HuyenBao", a life-simulation game.',
    'A player has generated their simplified Tử Vi natal chart (lá số). Interpret it for them.',
    'Use ONLY the palaces, stars, and states provided in "chart". Do NOT invent stars or palaces that are not listed.',
    'Focus on the Mệnh (life palace) chính tinh + their trạng thái (Miếu/Vượng/Đắc/Bình/Hãm), then touch Quan Lộc (career), Tài Bạch (money), and Phu Thê (spouse) briefly.',
    'Keep the tone reflective and grounded. This is entertainment within a game, NOT real prophecy, astrology, or life advice — never tell the player to act on it in real life.',
    LANG_DIRECTIVE[lang],
    'Respond with ONLY a JSON object, no markdown, in this exact shape:',
    '{"interpretation": string (4-6 sentences, second person, grounded in the stars actually present), "advice": string (1-2 sentences, a gentle non-binding reflection — not a real-life directive)}',
  ].filter(Boolean).join(' ');
  const user = JSON.stringify({ chart, responseLanguage: LANG_NAME[lang] });
  return { sys, user };
}

function localReading(laso: LaSo, lang: Lang): TuViResponse {
  const m = laso.cung.find(p => p.laMenh);
  const stars = m?.chinhTinh ?? [];
  const L = (o: { vi: string; en: string; zh: string }) => lang === 'vi' ? o.vi : lang === 'zh' ? o.zh : o.en;
  const starList = stars.length ? stars.map(s => `${s.sao} (${s.trangThai})`).join(', ') : 'không có chính tinh';
  const interp = lang === 'vi'
    ? `Lá số Tử Vi giản lược — Cục ${laso.cuc}, Mệnh cung tại ${laso.menhChi} với chính tinh: ${starList}. Tử Vi tọa tại ${laso.tuViTai}. `
      + (stars.length ? `Sao chủ đạo (${stars[0].sao}) ở trạng thái ${stars[0].trangThai} định màu sắc cho tính cách và hướng đời. ` : 'Cung Mệnh không có chính tinh — tính cách nhiều chiều, phụ thuộc lưu niên. ')
      + `Âm lịch sinh: ${laso.amLich}, Can Chi năm ${laso.canChiNam}. Đây là diễn giải tham khảo trong game, không phải tiên tri hay tư vấn đời thật.`
    : lang === 'zh'
      ? `简略紫微命盘 — ${laso.cuc}，命宫在${laso.menhChi}，正星：${starList}。紫微星坐${laso.tuViTai}。`
        + (stars.length ? `主星（${stars[0].sao}）处于${stars[0].trangThai}状态，决定性格与人生基调。` : '命宫无正星——性格多元，取决于流年。')
        + `农历：${laso.amLich}，年柱${laso.canChiNam}。此为游戏内参考解读，并非预言或现实咨询。`
      : `Simplified Tử Vi chart — ${laso.cuc}, Mệnh palace at ${laso.menhChi} with main stars: ${starList}. Tử Vi sits at ${laso.tuViTai}. `
        + (stars.length ? `The lead star (${stars[0].sao}) in ${stars[0].trangThai} state colours the temperament and life direction. ` : 'The Mệnh palace has no main star — the temperament is multifaceted, dependent on yearly transits. ')
        + `Lunar birth: ${laso.amLich}, year Can-Chi ${laso.canChiNam}. This is an in-game reference reading, not prophecy or real-life advice.`;
  const advice = lang === 'vi'
    ? 'Hãy coi đây là tham khảo trong trò chơi — quyết định đời thật do bạn tự chịu trách nhiệm.'
    : lang === 'zh'
      ? '请将其视为游戏内的参考——现实决策由你自行负责。'
      : 'Treat this as in-game reference only — real-life decisions are your own responsibility.';
  return { interpretation: interp, advice, source: 'local-fallback' };
}

function parseReading(raw: string, source: TuViResponse['source']): TuViResponse | null {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as Partial<TuViResponse>;
    if (!j.interpretation) return null;
    return {
      interpretation: String(j.interpretation).slice(0, 800),
      advice: String(j.advice || '').slice(0, 240),
      source
    };
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  let body: TuViBody = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const lang: Lang = (['en', 'vi', 'zh'].includes(body.lang as string) ? body.lang : 'en') as Lang;
  const laso = body.laso;
  if (!laso || !Array.isArray(laso.cung) || laso.cung.length !== 12) {
    return NextResponse.json({ error: 'Missing or invalid lá số.' }, { status: 400 });
  }
  const { sys, user } = buildPrompt(laso, lang);
  try {
    const raw = await callLocalLLM(sys, user);
    if (raw) { const r = parseReading(raw, 'backend-local'); if (r) return NextResponse.json(r); }
  } catch (e) { console.error('tuvi: local LLM failed:', e); }
  try {
    const zai = await getZaiClient();
    const completion = await zai.chat.completions.create({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
      thinking: { type: 'disabled' }
    });
    const raw = completion.choices[0]?.message?.content || '';
    const r = parseReading(raw, 'backend-zai');
    if (r) return NextResponse.json(r);
  } catch (e) { console.error('tuvi: ZAI failed, using local reading:', e); }
  return NextResponse.json(localReading(laso, lang));
}
