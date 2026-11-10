// HuyenBao v11.16 — Tarot engine (full 78-card deck + 3 spreads + reversal).
// Ported faithfully from the Huyen-Hoc-AI FastAPI backend
// (backend/divination/tarot.py) so the main app can do a proper multi-card
// Tarot spread entirely client-side, with the LLM interpretation via /api/tarot.
//
// The deck (22 major arcana + 4 suits × 14 ranks = 56 minor arcana = 78 cards),
// the spread layouts (1/3/5 cards with position labels), and the reversal
// chance (~30%) are translated verbatim — no invented logic. The reading is a
// cultural / contemplation reference per the source disclaimer.
//
// Naming convention: camelCase fields (viTri, suitVn) to match tuvi.ts +
// phongthuy.ts. The Python source uses snake_case (vi_tri, suit_vn); the LLM
// prompt in /api/tarot compresses to a flat text summary so the field names
// don't leak to the model.

// ---- 22 major arcana: (English name, Vietnamese name, keyword) ----
// Verbatim from MAJOR_ARCANA in tarot.py.
const MAJOR_ARCANA: [string, string, string][] = [
  ['The Fool', 'Kẻ Khờ', 'khởi đầu, tự do, tò mò'],
  ['The Magician', 'Pháp Sư', 'sáng tạo, kỹ năng, chủ động'],
  ['The High Priestess', 'Nữ Tư Tế', 'trực giác, chiêm nghiệm, bí ẩn'],
  ['The Empress', 'Hoàng Hậu', 'nuôi dưỡng, sáng tạo, phong phú'],
  ['The Emperor', 'Hoàng Đế', 'cấu trúc, trách nhiệm, ổn định'],
  ['The Hierophant', 'Giáo Hoàng', 'truyền thống, học hỏi, cộng đồng'],
  ['The Lovers', 'Tình Nhân', 'kết nối, giá trị, lựa chọn'],
  ['The Chariot', 'Chiến Xa', 'ý chí, tập trung, tiến bước'],
  ['Strength', 'Sức Mạnh', 'kiên nhẫn, can đảm, tự chủ'],
  ['The Hermit', 'Ẩn Sĩ', 'tĩnh lặng, tìm hiểu, suy ngẫm'],
  ['Wheel of Fortune', 'Bánh Xe Số Phận', 'chu kỳ, thay đổi, thích nghi'],
  ['Justice', 'Công Lý', 'cân bằng, trách nhiệm, sự thật'],
  ['The Hanged Man', 'Người Treo', 'tạm dừng, góc nhìn mới, buông bỏ'],
  ['Death', 'Chuyển Hóa', 'kết thúc, đổi thay, khởi đầu mới'],
  ['Temperance', 'Tiết Chế', 'điều độ, hài hòa, kiên nhẫn'],
  ['The Devil', 'Ác Quỷ', 'ràng buộc, nhận thức, lựa chọn'],
  ['The Tower', 'Tòa Tháp', 'biến chuyển, thức tỉnh, tái cấu trúc'],
  ['The Star', 'Ngôi Sao', 'hy vọng, cảm hứng, hồi phục'],
  ['The Moon', 'Mặt Trăng', 'cảm xúc, bất định, trực giác'],
  ['The Sun', 'Mặt Trời', 'niềm vui, rõ ràng, sức sống'],
  ['Judgement', 'Thức Tỉnh', 'đánh giá, nhận ra, làm mới'],
  ['The World', 'Thế Giới', 'hoàn tất, hội nhập, mở rộng'],
];

// ---- 4 suits: (Vietnamese suit name, element, theme) ----
// Verbatim from SUITS in tarot.py.
interface SuitDef { suitVn: string; element: string; theme: string; }
const SUITS: Record<string, SuitDef> = {
  Wands:     { suitVn: 'Gậy',  element: 'Hỏa', theme: 'động lực, sáng kiến' },
  Cups:      { suitVn: 'Cốc',  element: 'Thủy', theme: 'cảm xúc, kết nối' },
  Swords:    { suitVn: 'Kiếm', element: 'Khí', theme: 'suy nghĩ, giao tiếp' },
  Pentacles: { suitVn: 'Tiền', element: 'Thổ', theme: 'nguồn lực, thực tế' },
};

// ---- 14 ranks: (English rank, Vietnamese rank, keyword) ----
// Verbatim from RANKS in tarot.py.
const RANKS: [string, string, string][] = [
  ['Ace', 'Át', 'khởi đầu'],
  ['2', 'Hai', 'cân nhắc'],
  ['3', 'Ba', 'phát triển'],
  ['4', 'Bốn', 'ổn định'],
  ['5', 'Năm', 'thử thách'],
  ['6', 'Sáu', 'điều chỉnh'],
  ['7', 'Bảy', 'kiên trì'],
  ['8', 'Tám', 'tiến triển'],
  ['9', 'Chín', 'hoàn thiện'],
  ['10', 'Mười', 'chuyển giai đoạn'],
  ['Page', 'Tiểu Đồng', 'tìm hiểu'],
  ['Knight', 'Kỵ Sĩ', 'hành động'],
  ['Queen', 'Hoàng Hậu', 'thấu hiểu'],
  ['King', 'Quốc Vương', 'làm chủ'],
];

// ---- Spread layouts: number of cards → array of position labels ----
// Verbatim from SPREADS in tarot.py.
export const SPREADS: Record<number, string[]> = {
  1: ['Thông điệp chính'],
  3: ['Quá khứ', 'Hiện tại', 'Bước tiếp theo'],
  5: ['Tình huống', 'Thách thức', 'Lời khuyên', 'Khả năng', 'Bước tiếp theo'],
};

// ---- Card type ----
export interface TarotCard {
  id: string;          // 'major-0' or 'wands-ace' etc.
  loai: 'major' | 'minor';
  name: string;        // English name ('The Fool' or 'Ace of Wands')
  vn: string;          // Vietnamese name ('Kẻ Khờ' or 'Át Gậy')
  keyword: string;
  // Minor-arcana only:
  suit?: string;
  suitVn?: string;
  rank?: string;
  element?: string;
  // Draw-time fields:
  reversed?: boolean;  // ~30% chance at draw time
  viTri?: string;      // position label from SPREADS
}

// ---- Deck construction (verbatim from _deck()) ----
let _deckCache: TarotCard[] | null = null;
export function deck(): TarotCard[] {
  if (_deckCache) return _deckCache;
  const cards: TarotCard[] = [];
  // 22 major arcana — id 'major-{number}', number = index in MAJOR_ARCANA.
  MAJOR_ARCANA.forEach(([name, vn, keyword], number) => {
    cards.push({ id: `major-${number}`, loai: 'major', name, vn, keyword });
  });
  // 56 minor arcana — 4 suits × 14 ranks.
  for (const [suit, { suitVn, element, theme }] of Object.entries(SUITS)) {
    for (const [rank, rankVn, rankKeyword] of RANKS) {
      cards.push({
        id: `${suit.toLowerCase()}-${rank.toLowerCase()}`,
        loai: 'minor',
        suit, suitVn, rank, element,
        name: `${rank} of ${suit}`,
        vn: `${rankVn} ${suitVn}`,
        keyword: `${rankKeyword}; ${theme}`,
      });
    }
  }
  _deckCache = cards;
  return cards;
}

// ---- Draw N cards without replacement + add reversed + position ----
// Verbatim logic from draw_cards(so_la). Reversal chance is 0.3 (30%).
// `rng` is injectable for tests; defaults to Math.random (matches the
// existing v11.6 tarotDraw in src/lib/zodiac.ts).
export function drawCards(
  soLa: 1 | 3 | 5,
  rng: () => number = Math.random,
): TarotCard[] {
  if (!(soLa in SPREADS)) {
    throw new Error('Tarot hỗ trợ rút 1, 3 hoặc 5 lá.');
  }
  const all = deck();
  // Sample without replacement — partial Fisher-Yates: shuffle indices, take first soLa.
  // Matches Python's `rng.sample(_deck(), so_la)` semantics (unique cards).
  const idx = all.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const positions = SPREADS[soLa];
  return idx.slice(0, soLa).map((cardIdx, i) => {
    const card = { ...all[cardIdx] };
    card.reversed = rng() < 0.3;
    card.viTri = positions[i];
    return card;
  });
}

// ---- Convenience for the UI: spread labels in player's language ----
// The Python source keeps Vietnamese position labels even for non-Vietnamese
// speakers. We mirror that for the LLM prompt (which is itself VN-anchored),
// but for the UI we expose a small translation table so EN/ZH players see
// their own language in the card position chips.
const SPREAD_LABELS_EN: Record<number, string[]> = {
  1: ['Core message'],
  3: ['Past', 'Present', 'Next step'],
  5: ['Situation', 'Challenge', 'Advice', 'Possibility', 'Next step'],
};
const SPREAD_LABELS_ZH: Record<number, string[]> = {
  1: ['核心讯息'],
  3: ['过去', '现在', '下一步'],
  5: ['处境', '挑战', '建议', '可能', '下一步'],
};
export function spreadLabels(soLa: 1 | 3 | 5, lang: 'en' | 'vi' | 'zh'): string[] {
  if (lang === 'en') return SPREAD_LABELS_EN[soLa];
  if (lang === 'zh') return SPREAD_LABELS_ZH[soLa];
  return SPREADS[soLa];  // vi — verbatim from source
}

// ---- Disclaimer (matches Python source ghi_chu) ----
export const TAROT_GHI_CHU = 'Bài rút ngẫu nhiên, chỉ phục vụ tự chiêm nghiệm và giải trí.';
