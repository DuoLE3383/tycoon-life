// ================= v11.6 — Zodiac, Tarot, Psychic affinity =================
// Adds gender + birth month as character-creation inputs, derives a zodiac
// sign, exposes an industry affinity (passive income bonus), and unlocks
// optional monthly tarot draws that hint at the future. The pre-game
// "suggestion" combines zodiac + historical era to recommend a starting
// path that matches the player's astrological strengths.
//
// This module is TYPE-ONLY dependent on engine.ts (GameState). All helpers
// that need engine internals (like worldYear, pushLog) accept those values
// as arguments so there is no runtime circular import.

import type { GameState } from './engine';
import type { FieldKey } from './gameData';

// v11.6 — gender (cosmetic + minor dialogue tweaks later). 'nonbinary'
// is the default to avoid forcing a binary choice; the player can pick.
export type Gender = 'male' | 'female' | 'nonbinary';

// v11.6 — 12 zodiac signs. Each maps to a date range (month + day) and
// has an industry affinity: the field that "rules" that sign. The
// player gets a passive +5% income bonus in their affinity field.
//   Aries (Mar 21 – Apr 19)  → engineering (initiative + first-mover)
//   Taurus (Apr 20 – May 20)  → business (stability + accumulation)
//   Gemini (May 21 – Jun 20)  → arts (versatility + communication)
//   Cancer (Jun 21 – Jul 22)  → medicine (caring + nurturing)
//   Leo (Jul 23 – Aug 22)     → arts (performance + drama)
//   Virgo (Aug 23 – Sep 22)   → science (precision + analysis)
//   Libra (Sep 23 – Oct 22)   → arts (aesthetics + balance)
//   Scorpio (Oct 23 – Nov 21) → medicine (intensity + research)
//   Sagittarius (Nov 22 – Dec 21) → business (expansion + travel)
//   Capricorn (Dec 22 – Jan 19) → business (ambition + discipline)
//   Aquarius (Jan 20 – Feb 18) → engineering (innovation + rebellion)
//   Pisces (Feb 19 – Mar 20)   → arts (intuition + dreaminess)
//
// Affinities are spread 5 arts / 3 business / 2 engineering / 2 medicine
// / 0 science — chosen to match the artistic/creative bias of astrology
// while leaving science as a neutral (any-sign) path. (Future tuners can
// rebalance; v11.6 keeps it as-is for thematic consistency.)
export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

export interface ZodiacDef {
  id: ZodiacSign;
  symbol: string;            // ♈ ♉ ♊ ...
  startMonth: number;        // 1-12
  startDay: number;          // 1-31 (inclusive)
  endMonth: number;
  endDay: number;            // inclusive
  affinity: FieldKey;        // strong industry
  trait: { en: string; vi: string; zh: string }; // one-word personality
  blurb: { en: string; vi: string; zh: string }; // 1-line horoscope-style
}

export const ZODIAC: ZodiacDef[] = [
  { id: 'capricorn', symbol: '♑', startMonth: 12, startDay: 22, endMonth: 1, endDay: 19, affinity: 'business',
    trait: { en: 'Ambitious', vi: 'Tham vọng', zh: '雄心' },
    blurb: { en: 'The climber. Disciplined and patient — your fortune compounds.',
             vi: 'Người leo núi. Kỷ luật và kiên nhẫn — tài sản tích tụ.',
             zh: '攀登者。自律且耐心 — 财富复利累积。' } },
  { id: 'aquarius', symbol: '♒', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18, affinity: 'engineering',
    trait: { en: 'Innovative', vi: 'Sáng tạo', zh: '革新' },
    blurb: { en: 'The visionary. You invent futures other people trade in.',
             vi: 'Nhà tiên tri. Bạn sáng tạo tương lai mà người khác giao dịch.',
             zh: '远见者。你发明他人交易的未来。' } },
  { id: 'pisces', symbol: '♓', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20, affinity: 'arts',
    trait: { en: 'Intuitive', vi: 'Trực giác', zh: '直觉' },
    blurb: { en: 'The dreamer. Sensitive and creative — you see what others miss.',
             vi: 'Người mơ mộng. Nhạy cảm và sáng tạo — bạn thấy điều người khác bỏ sót.',
             zh: '梦者。敏感且富有创意 — 你能看到他人忽略的。' } },
  { id: 'aries', symbol: '♈', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19, affinity: 'engineering',
    trait: { en: 'Pioneering', vi: 'Tiên phong', zh: '开拓' },
    blurb: { en: 'The initiator. Bold first moves — you open markets others fear.',
             vi: 'Người khởi xướng. Quyết định đầu tiên táo bạo — bạn mở thị trường người khác sợ.',
             zh: '开拓者。大胆开局 — 你打开他人畏惧的市场。' } },
  { id: 'taurus', symbol: '♉', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20, affinity: 'business',
    trait: { en: 'Steady', vi: 'Vững chãi', zh: '稳健' },
    blurb: { en: 'The accumulator. Patient compounding — your wealth outlasts fads.',
             vi: 'Người tích tụ. Tích lũy kiên nhẫn — tài sản bạn vượt thời.',
             zh: '积累者。耐心复利 — 财富穿越潮流。' } },
  { id: 'gemini', symbol: '♊', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20, affinity: 'arts',
    trait: { en: 'Versatile', vi: 'Linh hoạt', zh: '多变' },
    blurb: { en: 'The communicator. You move markets with words.',
             vi: 'Người giao tiếp. Bạn di chuyển thị trường bằng lời.',
             zh: '沟通者。你用语言撬动市场。' } },
  { id: 'cancer', symbol: '♋', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22, affinity: 'medicine',
    trait: { en: 'Caring', vi: 'Chăm sóc', zh: '关怀' },
    blurb: { en: 'The nurturer. Healing hands build lasting institutions.',
             vi: 'Người chăm sóc. Bàn tay chữa lành xây dựng tổ chức bền vững.',
             zh: '关怀者。治愈之手构建持久机构。' } },
  { id: 'leo', symbol: '♌', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22, affinity: 'arts',
    trait: { en: 'Magnetic', vi: 'Lôi cuốn', zh: '魅力' },
    blurb: { en: 'The performer. Your stage is wherever you stand.',
             vi: 'Người biểu diễn. Sân khấu của bạn ở bất cứ nơi nào bạn đứng.',
             zh: '表演者。你站之处便是舞台。' } },
  { id: 'virgo', symbol: '♍', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22, affinity: 'science',
    trait: { en: 'Analytical', vi: 'Phân tích', zh: '分析' },
    blurb: { en: 'The analyst. Numbers reveal what hype conceals.',
             vi: 'Nhà phân tích. Con số tiết lộ điều mà sự hô hào che giấu.',
             zh: '分析师。数字揭示喧嚣之下的真相。' } },
  { id: 'libra', symbol: '♎', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22, affinity: 'arts',
    trait: { en: 'Balanced', vi: 'Cân bằng', zh: '平衡' },
    blurb: { en: 'The diplomat. You weigh, you balance, you broker.',
             vi: 'Nhà ngoại giao. Bạn cân nhắc, bạn cân bằng, bạn môi giới.',
             zh: '外交家。权衡、平衡、斡旋。' } },
  { id: 'scorpio', symbol: '♏', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21, affinity: 'medicine',
    trait: { en: 'Intense', vi: 'Mãnh liệt', zh: '深邃' },
    blurb: { en: 'The researcher. You go where others fear and bring back cures.',
             vi: 'Nhà nghiên cứu. Bạn đến nơi người khác sợ và mang về phương thuốc.',
             zh: '研究者。你深入他人畏惧之处带回解药。' } },
  { id: 'sagittarius', symbol: '♐', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21, affinity: 'business',
    trait: { en: 'Expansive', vi: 'Mở rộng', zh: '扩张' },
    blurb: { en: 'The explorer. New frontiers, new markets, new empires.',
             vi: 'Nhà thám hiểm. Biên giới mới, thị trường mới, đế chế mới.',
             zh: '探险家。新边疆、新市场、新帝国。' } },
];

// Compute the zodiac sign from a (month, day). Months are 1-12.
export function zodiacOf(month: number, day: number): ZodiacSign {
  for (const z of ZODIAC) {
    if (z.startMonth === z.endMonth) {
      // Same-month range (not used in our defs, but kept for completeness)
      if (month === z.startMonth && day >= z.startDay && day <= z.endDay) return z.id;
    } else {
      // Cross-month range (e.g. Capricorn Dec 22 - Jan 19)
      if (z.startMonth > z.endMonth) {
        // Wraps year-end
        if ((month === z.startMonth && day >= z.startDay) ||
            (month === z.endMonth && day <= z.endDay)) return z.id;
      } else {
        if ((month === z.startMonth && day >= z.startDay) ||
            (month === z.endMonth && day <= z.endDay)) return z.id;
      }
    }
  }
  return 'capricorn'; // fallback
}

export const zodiacById = (id: ZodiacSign): ZodiacDef =>
  ZODIAC.find(z => z.id === id) || ZODIAC[0];

// v11.6 — PsychicState lives on GameState. Tracks whether the player
// opted into tarot draws, last draw day, and a small log of past draws.
// Tarot draws are FREE monthly actions if opted-in; each gives a cryptic
// hint about next year's YearEvent (similar to researchMarket but
// life-event focused, with more noise — false negatives ~20%).
export interface PsychicState {
  optedIn: boolean;             // true if the player enabled tarot draws
  lastDrawDay: number;          // day of the last tarot draw (cooldown 30 days)
  draws: { day: number; card: string; meaning: string }[]; // last 10
}

export function freshPsychic(): PsychicState {
  return { optedIn: false, lastDrawDay: 0, draws: [] };
}

// v11.6 — 22 major-arcana tarot cards. Each has a one-line meaning that
// the player can interpret. The draw is random; the meaning guides but
// doesn't determine. Used by tarotDraw() below.
export const TAROT_CARDS: { id: string; name: { en: string; vi: string; zh: string }; upright: { en: string; vi: string; zh: string } }[] = [
  { id: 'fool', name: { en: 'The Fool', vi: 'The Fool', zh: '愚者' },
    upright: { en: 'A new beginning — risks taken now pay later.', vi: 'Khởi đầu mới — rủi ro bây giờ trả sau.', zh: '新的开始 — 当下的冒险未来会有回报。' } },
  { id: 'magician', name: { en: 'The Magician', vi: 'The Magician', zh: '魔术师' },
    upright: { en: 'You have all the tools — act with intent.', vi: 'Bạn có đủ công cụ — hành động có chủ đích.', zh: '你拥有所有工具 — 有意图地行动。' } },
  { id: 'highPriestess', name: { en: 'The High Priestess', vi: 'The High Priestess', zh: '女祭司' },
    upright: { en: 'Listen to intuition — a hidden truth surfaces.', vi: 'Lắng nghe trực giác — một sự thật ẩn sẽ lộ.', zh: '倾听直觉 — 隐藏的真相浮现。' } },
  { id: 'empress', name: { en: 'The Empress', vi: 'The Empress', zh: '皇后' },
    upright: { en: 'Abundance — a creative venture flourishes.', vi: 'Phong phú — một dự án sáng tạo phát triển.', zh: '丰饶 — 创意事业蓬勃发展。' } },
  { id: 'emperor', name: { en: 'The Emperor', vi: 'The Emperor', zh: '皇帝' },
    upright: { en: 'Authority — structure pays; build your empire.', vi: 'Quyền lực — cấu trúc được đền đáp; xây đế chế của bạn.', zh: '权威 — 结构有回报；建立你的帝国。' } },
  { id: 'hierophant', name: { en: 'The Hierophant', vi: 'The Hierophant', zh: '教皇' },
    upright: { en: 'Tradition — follow a proven path this season.', vi: 'Truyền thống — đi theo con đường đã chứng minh mùa này.', zh: '传统 — 这个季节走被验证的道路。' } },
  { id: 'lovers', name: { en: 'The Lovers', vi: 'The Lovers', zh: '恋人' },
    upright: { en: 'A choice — heart and mind diverge; pick wisely.', vi: 'Một lựa chọn — trái tim và lý trí phân kỳ; chọn khôn ngoan.', zh: '选择 — 感性与理性分歧；明智选择。' } },
  { id: 'chariot', name: { en: 'The Chariot', vi: 'The Chariot', zh: '战车' },
    upright: { en: 'Willpower — push through obstacles; victory comes.', vi: 'Ý chí — vượt chướng ngại; chiến thắng đến.', zh: '意志力 — 冲破障碍；胜利将至。' } },
  { id: 'strength', name: { en: 'Strength', vi: 'Strength', zh: '力量' },
    upright: { en: 'Inner power — patience tames a wild situation.', vi: 'Sức mạnh nội tâm — kiên nhẫn thuần phục tình thế.', zh: '内在力量 — 耐心驯服乱局。' } },
  { id: 'hermit', name: { en: 'The Hermit', vi: 'The Hermit', zh: '隐者' },
    upright: { en: 'Solitude — withdraw to find your next move.', vi: 'Tĩnh lặng — rút lui để tìm bước tiếp theo.', zh: '孤独 — 退避以寻下一步。' } },
  { id: 'wheel', name: { en: 'Wheel of Fortune', vi: 'Wheel of Fortune', zh: '命运之轮' },
    upright: { en: 'Cycles turn — a tide rises; ride it.', vi: 'Vòng xoay — một triều dâng; cưỡi nó.', zh: '循环转动 — 潮水上涨；驾驭它。' } },
  { id: 'justice', name: { en: 'Justice', vi: 'Justice', zh: '正义' },
    upright: { en: 'Balance — accounts settle; what you sowed returns.', vi: 'Cân bằng — sổ sách thanh toán; gieo gì gặt nấy.', zh: '平衡 — 账目清算；种瓜得瓜。' } },
  { id: 'hangedMan', name: { en: 'The Hanged Man', vi: 'The Hanged Man', zh: '倒吊人' },
    upright: { en: 'Surrender — see from a new angle; the pause pays.', vi: 'Buông bỏ — nhìn từ góc mới; sự dừng lại có giá.', zh: '臣服 — 从新角度看；停顿有回报。' } },
  { id: 'death', name: { en: 'Death', vi: 'Death', zh: '死神' },
    upright: { en: 'Transformation — the old ends; the new begins.', vi: 'Biến đổi — cái cũ kết; cái mới bắt đầu.', zh: '蜕变 — 旧的结束；新的开始。' } },
  { id: 'temperance', name: { en: 'Temperance', vi: 'Temperance', zh: '节制' },
    upright: { en: 'Moderation — mix wisely; balance brings growth.', vi: 'Tiết độ — pha trộn khôn khéo; cân bằng mang tăng trưởng.', zh: '节制 — 善于调配；平衡带来增长。' } },
  { id: 'devil', name: { en: 'The Devil', vi: 'The Devil', zh: '魔鬼' },
    upright: { en: 'Attachment — break a chain; do not over-leverage.', vi: 'Luyến ái — cắt một xiềng xích; đừng đòn bẩy quá mức.', zh: '执念 — 斩断锁链；勿过度杠杆。' } },
  { id: 'tower', name: { en: 'The Tower', vi: 'The Tower', zh: '高塔' },
    upright: { en: 'Upheaval — sudden change; what falls needed to.', vi: 'Đảo lộn — thay đổi đột ngột; cái đổ cần đổ.', zh: '动荡 — 突变；该倒的终须倒。' } },
  { id: 'star', name: { en: 'The Star', vi: 'The Star', zh: '星星' },
    upright: { en: 'Hope — renewal after trials; faith is warranted.', vi: 'Hy vọng — đổi mới sau thử thách; niềm tin có cơ sở.', zh: '希望 — 历难后更新；信念有据。' } },
  { id: 'moon', name: { en: 'The Moon', vi: 'The Moon', zh: '月亮' },
    upright: { en: 'Illusion — not all is as it seems; verify.', vi: 'Ảo ảnh — không phải mọi thứ như vẻ; kiểm chứng.', zh: '幻象 — 未必如表象；核实。' } },
  { id: 'sun', name: { en: 'The Sun', vi: 'The Sun', zh: '太阳' },
    upright: { en: 'Joy — success shines; momentum builds.', vi: 'Niềm vui — thành công tỏa sáng; đà tăng lên.', zh: '喜悦 — 成功闪耀；势头累积。' } },
  { id: 'judgement', name: { en: 'Judgement', vi: 'Judgement', zh: '审判' },
    upright: { en: 'Awakening — a calling; answer it now.', vi: 'Tỉnh thức — một tiếng gọi; đáp ngay.', zh: '觉醒 — 召唤；即刻回应。' } },
  { id: 'world', name: { en: 'The World', vi: 'The World', zh: '世界' },
    upright: { en: 'Completion — a cycle closes; you graduate.', vi: 'Hoàn tất — một vòng khép lại; bạn tốt nghiệp.', zh: '完成 — 一个循环结束；你毕业了。' } },
];

// Draw a tarot card. The draw is random; the meaning guides but does
// not determine. Mutates s.psychic (appends to log, caps at 10). Returns
// the drawn card + meaning. If optedOut, returns null.
export function tarotDraw(s: GameState, rng: () => number = Math.random): { card: string; meaning: string } | null {
  if (!s.psychic || !s.psychic.optedIn) return null;
  // Cooldown 30 game-days. First draw (lastDrawDay = 0) is always allowed
  // so the player can opt in and immediately try.
  if (s.psychic.lastDrawDay > 0 && s.lastDay - s.psychic.lastDrawDay < 30) return null;
  s.psychic.lastDrawDay = s.lastDay;
  const card = TAROT_CARDS[Math.floor(rng() * TAROT_CARDS.length)];
  s.psychic.draws.push({ day: s.lastDay, card: card.id, meaning: card.upright.en });
  if (s.psychic.draws.length > 10) s.psychic.draws.shift();
  return { card: card.id, meaning: card.upright.en };
}

// v11.6 — toggle opt-in. The player can enable/disable tarot from the
// Spirit tab. Once opted in, the cooldown applies; toggling off pauses
// draws without losing the log.
export function togglePsychic(s: GameState): boolean {
  if (!s.psychic) s.psychic = freshPsychic();
  s.psychic.optedIn = !s.psychic.optedIn;
  return s.psychic.optedIn;
}

// v11.6 — zodiac industry affinity. The player gets +5% income bonus in
// their zodiac's affinity field. Used by bizMultiplier / jobIncome /
// socialIncome to stack on top of other bonuses.
export function zodiacAffinityMult(s: GameState, field: FieldKey): number {
  if (!s.psychic) return 1;
  // The player's zodiac is stored at game start in s.zodiac (set by begin()).
  // If not set (old save), no bonus.
  const z = (s as GameState & { zodiac?: ZodiacSign }).zodiac;
  if (!z) return 1;
  const def = zodiacById(z);
  return def.affinity === field ? 1.05 : 1;
}

// v11.6 — pre-game suggestion. Combines zodiac affinity + historical era
// to recommend a starting path. Returns a localized line. The React
// layer passes in the lang + the era name (already translated) + the
// zodiac def.
export function zodiacIntroSuggestion(
  zodiac: ZodiacSign,
  eraName: string,
  year18: number,
  lang: 'en' | 'vi' | 'zh',
): { zodiacLine: string; eraLine: string } {
  const def = zodiacById(zodiac);
  const t = (l: 'en' | 'vi' | 'zh', obj: { en: string; vi: string; zh: string }) =>
    l === 'vi' ? obj.vi : l === 'zh' ? obj.zh : obj.en;
  // Zodiac-specific line: tells the player which industry they're
  // astrologically drawn to + their dominant trait.
  const zodiacLine = `${def.symbol} ${t(lang, def.trait)} — ${t(lang, def.blurb)} (${t(lang, { en: 'affinity', vi: 'hợp', zh: '亲和' })}: ${t(lang, { en: def.affinity, vi: def.affinity, zh: def.affinity })})`;
  // Era-specific line: contextualises the suggestion to the historical
  // moment. We don't have translations for every era's specific advice;
  // we just note the era name + that timing matters.
  const eraLine = t(lang, {
    en: `Starting in ${eraName} (${year18}) — historical events and the era's mood will shape your opportunities.`,
    vi: `Bắt đầu trong ${eraName} (${year18}) — biến cố lịch sử và tinh thần thời đại sẽ định hình cơ hội của bạn.`,
    zh: `从${eraName}（${year18}）开始 — 历史事件与时代精神将塑造你的机会。`,
  });
  return { zodiacLine, eraLine };
}
