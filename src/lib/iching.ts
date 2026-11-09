// HuyenBao v11.11 — I Ching (Kinh Dịch) deterministic engine.
// Ported from the Huyen-Hoc-AI FastAPI backend (backend/divination/kinh_dich.py)
// so the main app can run divination entirely client-side + via its own LLM
// pipeline (/api/divine), with no runtime dependency on the FastAPI service.
//
// Coin-cast (3 coins × 6 lines) → King Wen hexagram lookup → moving lines
// (hào động) → transformed hexagram (quẻ biến). All 64 hexagram names are the
// standard Sino-Vietnamese / Wilhelm-English / original Chinese set — no
// invented names.

export type TrigramId = 'Càn' | 'Đoài' | 'Ly' | 'Chấn' | 'Tốn' | 'Khảm' | 'Cấn' | 'Khôn';

export interface Trigram {
  id: TrigramId;
  symbol: string;        // ☰ ☱ ☲ ...
  element: { vi: string; en: string; zh: string };
}

// Trigram keyed by (line1, line2, line3) where 1 = yang (solid), 0 = yin (broken),
// read bottom → top. Matches the source's TRIGRAMS table.
const TRIGRAMS: Record<string, Trigram> = {
  '1,1,1': { id: 'Càn', symbol: '☰', element: { vi: 'Trời', en: 'Heaven', zh: '天' } },
  '1,1,0': { id: 'Đoài', symbol: '☱', element: { vi: 'Đầm', en: 'Lake', zh: '泽' } },
  '1,0,1': { id: 'Ly', symbol: '☲', element: { vi: 'Lửa', en: 'Fire', zh: '火' } },
  '1,0,0': { id: 'Chấn', symbol: '☳', element: { vi: 'Sấm', en: 'Thunder', zh: '雷' } },
  '0,1,1': { id: 'Tốn', symbol: '☴', element: { vi: 'Gió', en: 'Wind', zh: '风' } },
  '0,1,0': { id: 'Khảm', symbol: '☵', element: { vi: 'Nước', en: 'Water', zh: '水' } },
  '0,0,1': { id: 'Cấn', symbol: '☶', element: { vi: 'Núi', en: 'Mountain', zh: '山' } },
  '0,0,0': { id: 'Khôn', symbol: '☷', element: { vi: 'Đất', en: 'Earth', zh: '地' } },
};
const TRIGRAM_ORDER: TrigramId[] = ['Càn', 'Đoài', 'Ly', 'Chấn', 'Tốn', 'Khảm', 'Cấn', 'Khôn'];

// King Wen sequence: KING_WEN[upperTrigramIndex][lowerTrigramIndex] = hexagram number 1..64.
// Copied verbatim from the source engine.
const KING_WEN: number[][] = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2],
];

export interface Hexagram {
  num: number;            // 1..64 (King Wen number)
  name: { vi: string; en: string; zh: string };
  theme: { vi: string; en: string; zh: string };
}

// 64 hexagrams in King Wen order (index 0 = hexagram #1).
// VI names are the exact Sino-Vietnamese names from the Huyen-Hoc-AI source.
// EN names are the standard Wilhelm/Baynes renderings; ZH names are the original
// Chinese hexagram names (the etymological root). Themes: VI from source, EN/ZH
// are faithful concise translations.
export const HEXAGRAMS: Hexagram[] = [
  { num: 1, name: { vi: 'Thuần Càn', en: 'The Creative', zh: '乾' }, theme: { vi: 'Chủ động và chính trực', en: 'Active and upright', zh: '主动正直' } },
  { num: 2, name: { vi: 'Thuần Khôn', en: 'The Receptive', zh: '坤' }, theme: { vi: 'Nuôi dưỡng và tiếp nhận', en: 'Nurturing and receptive', zh: '滋养包容' } },
  { num: 3, name: { vi: 'Thủy Lôi Truân', en: 'Difficulty at the Beginning', zh: '屯' }, theme: { vi: 'Khởi đầu giữa thử thách', en: 'A difficult beginning', zh: '艰难起步' } },
  { num: 4, name: { vi: 'Sơn Thủy Mông', en: 'Youthful Folly', zh: '蒙' }, theme: { vi: 'Học hỏi trước điều chưa biết', en: 'Learn before the unknown', zh: '童蒙求我' } },
  { num: 5, name: { vi: 'Thủy Thiên Nhu', en: 'Waiting', zh: '需' }, theme: { vi: 'Kiên nhẫn chờ thời', en: 'Wait patiently for the right time', zh: '耐心待时' } },
  { num: 6, name: { vi: 'Thiên Thủy Tụng', en: 'Conflict', zh: '訟' }, theme: { vi: 'Đối thoại và xử lý bất đồng', en: 'Dialogue and resolve conflict', zh: '慎争息讼' } },
  { num: 7, name: { vi: 'Địa Thủy Sư', en: 'The Army', zh: '師' }, theme: { vi: 'Kỷ luật và cùng phối hợp', en: 'Discipline and coordination', zh: '纪律协同' } },
  { num: 8, name: { vi: 'Thủy Địa Tỷ', en: 'Holding Together', zh: '比' }, theme: { vi: 'Tìm sự đồng lòng', en: 'Seek unity and allegiance', zh: '寻求同心' } },
  { num: 9, name: { vi: 'Phong Thiên Tiểu Súc', en: 'Small Taming', zh: '小畜' }, theme: { vi: 'Tiến từng bước nhỏ', en: 'Small steps forward', zh: '积小成大' } },
  { num: 10, name: { vi: 'Thiên Trạch Lý', en: 'Treading', zh: '履' }, theme: { vi: 'Giữ chừng mực khi tiến lên', en: 'Tread carefully upward', zh: '履险如夷' } },
  { num: 11, name: { vi: 'Địa Thiên Thái', en: 'Peace', zh: '泰' }, theme: { vi: 'Hài hòa và hanh thông', en: 'Harmony and flow', zh: '通泰和顺' } },
  { num: 12, name: { vi: 'Thiên Địa Bĩ', en: 'Standstill', zh: '否' }, theme: { vi: 'Nhận biết giai đoạn trì trệ', en: 'Recognise a stagnant phase', zh: '识时知否' } },
  { num: 13, name: { vi: 'Thiên Hỏa Đồng Nhân', en: 'Fellowship', zh: '同人' }, theme: { vi: 'Hợp tác vì mục tiêu chung', en: 'Cooperate for a shared goal', zh: '同人共志' } },
  { num: 14, name: { vi: 'Hỏa Thiên Đại Hữu', en: 'Great Possession', zh: '大有' }, theme: { vi: 'Quản lý thành quả có trách nhiệm', en: 'Manage success responsibly', zh: '大有节制' } },
  { num: 15, name: { vi: 'Địa Sơn Khiêm', en: 'Modesty', zh: '謙' }, theme: { vi: 'Khiêm nhường và cân bằng', en: 'Modest and balanced', zh: '谦逊平衡' } },
  { num: 16, name: { vi: 'Lôi Địa Dự', en: 'Enthusiasm', zh: '豫' }, theme: { vi: 'Chuẩn bị cho cơ hội', en: 'Prepare for opportunity', zh: '顺势备机' } },
  { num: 17, name: { vi: 'Trạch Lôi Tùy', en: 'Following', zh: '隨' }, theme: { vi: 'Linh hoạt trước thay đổi', en: 'Adapt to change', zh: '随顺应变' } },
  { num: 18, name: { vi: 'Sơn Phong Cổ', en: 'Work on the Decayed', zh: '蠱' }, theme: { vi: 'Sửa điều cũ để làm mới', en: 'Repair the old to renew', zh: '革故鼎新' } },
  { num: 19, name: { vi: 'Địa Trạch Lâm', en: 'Approach', zh: '臨' }, theme: { vi: 'Tiến gần với sự quan tâm', en: 'Approach with care', zh: '临之以庄' } },
  { num: 20, name: { vi: 'Phong Địa Quán', en: 'Contemplation', zh: '觀' }, theme: { vi: 'Quan sát trước khi quyết định', en: 'Observe before deciding', zh: '观而后行' } },
  { num: 21, name: { vi: 'Hỏa Lôi Phệ Hạp', en: 'Biting Through', zh: '噬嗑' }, theme: { vi: 'Nhìn thẳng vào hệ quả', en: 'Face the consequences squarely', zh: '噬嗑明断' } },
  { num: 22, name: { vi: 'Sơn Hỏa Bí', en: 'Grace', zh: '賁' }, theme: { vi: 'Chú trọng nền tảng và hình thức', en: 'Mind form and foundation', zh: '文质并重' } },
  { num: 23, name: { vi: 'Sơn Địa Bác', en: 'Splitting Apart', zh: '剝' }, theme: { vi: 'Buông bỏ điều không còn phù hợp', en: 'Let go of the obsolete', zh: '剥落去旧' } },
  { num: 24, name: { vi: 'Địa Lôi Phục', en: 'Return', zh: '復' }, theme: { vi: 'Trở về với gốc rễ', en: 'Return to the root', zh: '复归根本' } },
  { num: 25, name: { vi: 'Thiên Lôi Vô Vọng', en: 'Innocence', zh: '無妄' }, theme: { vi: 'Hành động chân thành, không cưỡng cầu', en: 'Act sincerely, without forcing', zh: '无妄至诚' } },
  { num: 26, name: { vi: 'Sơn Thiên Đại Súc', en: 'Great Taming', zh: '大畜' }, theme: { vi: 'Tích lũy và chuẩn bị', en: 'Accumulate and prepare', zh: '畜德备势' } },
  { num: 27, name: { vi: 'Sơn Lôi Di', en: 'Nourishment', zh: '頤' }, theme: { vi: 'Nuôi dưỡng thân tâm đúng cách', en: 'Nourish body and mind rightly', zh: '颐养正道' } },
  { num: 28, name: { vi: 'Trạch Phong Đại Quá', en: 'Great Exceeding', zh: '大過' }, theme: { vi: 'Chấp nhận gánh nặng lớn', en: 'Bear a great burden', zh: '独立不惧' } },
  { num: 29, name: { vi: 'Thuần Khảm', en: 'The Abysmal', zh: '坎' }, theme: { vi: 'Vượt qua hiểm nguy bằng bình tĩnh', en: 'Cross danger with composure', zh: '履险如常' } },
  { num: 30, name: { vi: 'Thuần Ly', en: 'The Clinging', zh: '離' }, theme: { vi: 'Giữ sáng suốt và chính trực', en: 'Stay bright and upright', zh: '明德继明' } },
  { num: 31, name: { vi: 'Trạch Sơn Hàm', en: 'Influence', zh: '咸' }, theme: { vi: 'Cảm ứng và kết nối', en: 'Resonance and connection', zh: '感应相结' } },
  { num: 32, name: { vi: 'Lôi Phong Hằng', en: 'Duration', zh: '恆' }, theme: { vi: 'Bền vững qua thời gian', en: 'Endure through time', zh: '持之以恒' } },
  { num: 33, name: { vi: 'Thiên Sơn Độn', en: 'Retreat', zh: '遯' }, theme: { vi: 'Rút lui đúng lúc', en: 'Retreat at the right time', zh: '知机而退' } },
  { num: 34, name: { vi: 'Lôi Thiên Đại Tráng', en: 'Great Power', zh: '大壯' }, theme: { vi: 'Dùng sức mạnh đúng chỗ', en: 'Use power rightly', zh: '壮而有节' } },
  { num: 35, name: { vi: 'Hỏa Địa Tấn', en: 'Progress', zh: '晉' }, theme: { vi: 'Tiến lên không ngừng', en: 'Progress steadily', zh: '晋进不止' } },
  { num: 36, name: { vi: 'Địa Hỏa Minh Di', en: 'Darkening of the Light', zh: '明夷' }, theme: { vi: 'Giữ ánh sáng giữa nghịch cảnh', en: 'Keep your light in adversity', zh: '明夷晦明' } },
  { num: 37, name: { vi: 'Phong Hỏa Gia Nhân', en: 'The Family', zh: '家人' }, theme: { vi: 'Xây dựng gia đình và tổ chức', en: 'Build family and order', zh: '齐家正伦' } },
  { num: 38, name: { vi: 'Hỏa Trạch Khuê', en: 'Opposition', zh: '睽' }, theme: { vi: 'Tôn trọng khác biệt', en: 'Respect differences', zh: '求同存异' } },
  { num: 39, name: { vi: 'Thủy Sơn Kiển', en: 'Obstruction', zh: '蹇' }, theme: { vi: 'Tìm lối đi thận trọng qua trở ngại', en: 'Pick a careful path through obstacles', zh: '险中慎行' } },
  { num: 40, name: { vi: 'Lôi Thủy Giải', en: 'Deliverance', zh: '解' }, theme: { vi: 'Giải tỏa nút thắt', en: 'Untie the knot', zh: '解难释结' } },
  { num: 41, name: { vi: 'Sơn Trạch Tổn', en: 'Decrease', zh: '損' }, theme: { vi: 'Giảm bớt để tăng thêm', en: 'Decrease to increase', zh: '损上益下' } },
  { num: 42, name: { vi: 'Phong Lôi Ích', en: 'Increase', zh: '益' }, theme: { vi: 'Tăng trưởng có kiểm soát', en: 'Growth with control', zh: '益而不溢' } },
  { num: 43, name: { vi: 'Trạch Thiên Quải', en: 'Breakthrough', zh: '夬' }, theme: { vi: 'Quyết đoán loại bỏ điều xấu', en: 'Resolve to cut out the bad', zh: '决去小人' } },
  { num: 44, name: { vi: 'Thiên Phong Cấu', en: 'Coming to Meet', zh: '姤' }, theme: { vi: 'Gặp gỡ đúng người đúng lúc', en: 'Meet the right one at the right time', zh: '姤遇有时' } },
  { num: 45, name: { vi: 'Trạch Địa Tụy', en: 'Gathering Together', zh: '萃' }, theme: { vi: 'Tập hợp và kết nối', en: 'Gather and connect', zh: '萃聚有道' } },
  { num: 46, name: { vi: 'Địa Phong Thăng', en: 'Pushing Upward', zh: '升' }, theme: { vi: 'Vươn lên không ngừng', en: 'Rise without ceasing', zh: '升而不息' } },
  { num: 47, name: { vi: 'Trạch Thủy Khốn', en: 'Oppression', zh: '困' }, theme: { vi: 'Vượt khốn bằng nội lực', en: 'Rise from hardship by inner strength', zh: '困而自强' } },
  { num: 48, name: { vi: 'Thủy Phong Tỉnh', en: 'The Well', zh: '井' }, theme: { vi: 'Bảo dưỡng nguồn lực chung', en: 'Maintain the shared well', zh: '井养不穷' } },
  { num: 49, name: { vi: 'Trạch Hỏa Cách', en: 'Revolution', zh: '革' }, theme: { vi: 'Thay cũ đổi mới', en: 'Renew the old', zh: '革故改新' } },
  { num: 50, name: { vi: 'Hỏa Phong Đỉnh', en: 'The Cauldron', zh: '鼎' }, theme: { vi: 'Định vị và nuôi dưỡng', en: 'Establish and nourish', zh: '鼎立养贤' } },
  { num: 51, name: { vi: 'Thuần Chấn', en: 'The Arousing', zh: '震' }, theme: { vi: 'Chấn động để tỉnh thức', en: 'Shock that awakens', zh: '震惊致醒' } },
  { num: 52, name: { vi: 'Thuần Cấn', en: 'Keeping Still', zh: '艮' }, theme: { vi: 'Dừng lại đúng lúc', en: 'Stop at the right time', zh: '止于至善' } },
  { num: 53, name: { vi: 'Phong Sơn Tiệm', en: 'Development', zh: '漸' }, theme: { vi: 'Tiến từng bước vững chắc', en: 'Steady gradual progress', zh: '循序渐进' } },
  { num: 54, name: { vi: 'Lôi Trạch Quy Muội', en: 'Marrying Maiden', zh: '歸妹' }, theme: { vi: 'Tôn trọng cam kết và cảm xúc', en: 'Honour commitment and feeling', zh: '归妹慎终' } },
  { num: 55, name: { vi: 'Lôi Hỏa Phong', en: 'Abundance', zh: '豐' }, theme: { vi: 'Tỏa sáng rực rỡ', en: 'Shine in fullness', zh: '丰大光明' } },
  { num: 56, name: { vi: 'Hỏa Sơn Lữ', en: 'The Wanderer', zh: '旅' }, theme: { vi: 'Đi xa cần giữ mình', en: 'Travel far, mind yourself', zh: '行旅自慎' } },
  { num: 57, name: { vi: 'Thuần Tốn', en: 'The Gentle', zh: '巽' }, theme: { vi: 'Thuận theo và thấm sâu', en: 'Follow and penetrate', zh: '巽顺而入' } },
  { num: 58, name: { vi: 'Thuần Đoài', en: 'The Joyous', zh: '兌' }, theme: { vi: 'Vui vẻ và giao hòa', en: 'Joyful and harmonious', zh: '兑以和乐' } },
  { num: 59, name: { vi: 'Phong Thủy Hoán', en: 'Dispersion', zh: '渙' }, theme: { vi: 'Tan rã để tái tạo', en: 'Disperse to renew', zh: '涣散重聚' } },
  { num: 60, name: { vi: 'Thủy Trạch Tiết', en: 'Limitation', zh: '節' }, theme: { vi: 'Tiết chế và giới hạn', en: 'Limit and measure', zh: '节以有度' } },
  { num: 61, name: { vi: 'Phong Trạch Trung Phu', en: 'Inner Truth', zh: '中孚' }, theme: { vi: 'Chân thành từ bên trong', en: 'Inner truth and sincerity', zh: '中孚信诚' } },
  { num: 62, name: { vi: 'Lôi Sơn Tiểu Quá', en: 'Small Exceeding', zh: '小過' }, theme: { vi: 'Vượt quá nhỏ bé', en: 'Exceed slightly, stay small', zh: '小过慎微' } },
  { num: 63, name: { vi: 'Thủy Hỏa Ký Tế', en: 'After Completion', zh: '既濟' }, theme: { vi: 'Hoàn thành chu kỳ', en: 'Completing the cycle', zh: '既济定成' } },
  { num: 64, name: { vi: 'Hỏa Thủy Vị Tế', en: 'Before Completion', zh: '未濟' }, theme: { vi: 'Chưa hoàn thành, tiếp tục', en: 'Not yet complete — keep going', zh: '未济不息' } },
];

function kingWenIndex(values: number[]): number {
  const lower = values.slice(0, 3).join(',');
  const upper = values.slice(3, 6).join(',');
  const lowerTri = TRIGRAMS[lower];
  const upperTri = TRIGRAMS[upper];
  if (!lowerTri || !upperTri) throw new Error('bad trigram');
  const lowerIdx = TRIGRAM_ORDER.indexOf(lowerTri.id);
  const upperIdx = TRIGRAM_ORDER.indexOf(upperTri.id);
  return KING_WEN[upperIdx][lowerIdx];
}

interface Line { pos: number; yang: boolean; moving: boolean; }

interface HexResult {
  num: number;
  name: { vi: string; en: string; zh: string };
  theme: { vi: string; en: string; zh: string };
  upper: Trigram;
  lower: Trigram;
  lines: Line[];   // 6 lines, index 0 = bottom (hào 1)
}

function buildHex(values: number[], moving: number[]): HexResult {
  const num = kingWenIndex(values);
  const h = HEXAGRAMS[num - 1];
  const lower = TRIGRAMS[values.slice(0, 3).join(',')];
  const upper = TRIGRAMS[values.slice(3, 6).join(',')];
  return {
    num, name: h.name, theme: h.theme, upper, lower,
    lines: values.map((v, i) => ({ pos: i + 1, yang: !!v, moving: moving.includes(i + 1) })),
  };
}

export interface CastResult {
  primary: HexResult;
  changed: HexResult | null;   // null when there are no moving lines (quẻ tĩnh)
  movingLines: number[];       // positions 1..6
  coinsLog: { coins: number[]; sum: number; lineType: string }[]; // lineType: Lão Âm / Thiếu Dương / Thiếu Âm / Lão Dương
}

// Cryptographically-fair coin: 0 = heads (value 2), 1 = tails (value 3).
function flipCoin(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    return buf[0] & 1;
  }
  return Math.random() < 0.5 ? 0 : 1;
}

const LINE_TYPE: Record<number, { vi: string; en: string; zh: string }> = {
  6: { vi: 'Lão Âm (âm, động)', en: 'Old Yin (moving)', zh: '老阴（动）' },
  7: { vi: 'Thiếu Dương (tĩnh)', en: 'Young Yang (static)', zh: '少阳（静）' },
  8: { vi: 'Thiếu Âm (tĩnh)', en: 'Old Yin (static)', zh: '少阴（静）' },
  9: { vi: 'Lão Dương (dương, động)', en: 'Old Yang (moving)', zh: '老阳（动）' },
};

// Cast 6 lines using 3 coins each — one consistent draw.
//   6 (2+2+2) = Lão Âm    → yin,  moving, flips to yang
//   7 (2+2+3) = Thiếu Dương → yang, static
//   8 (2+3+3) = Thiếu Âm   → yin,  static
//   9 (3+3+3) = Lão Dương  → yang, moving, flips to yin
export function castHexagram(): CastResult {
  const primaryVals: number[] = [];   // 0 = yin, 1 = yang
  const changedVals: number[] = [];
  const moving: number[] = [];
  const coinsLog: CastResult['coinsLog'] = [];

  for (let i = 0; i < 6; i++) {
    const coins = [flipCoin(), flipCoin(), flipCoin()];
    const sum = coins.reduce((a, c) => a + (c ? 3 : 2), 0);
    coinsLog.push({ coins, sum, lineType: '' });
    if (sum === 6) {        // Lão Âm → yin, moving, → yang
      primaryVals.push(0); changedVals.push(1); moving.push(i + 1);
    } else if (sum === 7) { // Thiếu Dương → yang, static
      primaryVals.push(1); changedVals.push(1);
    } else if (sum === 8) { // Thiếu Âm → yin, static
      primaryVals.push(0); changedVals.push(0);
    } else {                // 9, Lão Dương → yang, moving, → yin
      primaryVals.push(1); changedVals.push(0); moving.push(i + 1);
    }
  }
  // stamp lineType label after the fact
  coinsLog.forEach((c, i) => { c.lineType = (LINE_TYPE as Record<number, { vi: string; en: string; zh: string }>)[coinsLog[i].sum].vi; });

  const primary = buildHex(primaryVals, moving);
  const changed = moving.length ? buildHex(changedVals, moving) : null;
  return { primary, changed, movingLines: moving, coinsLog };
}

// Validate the player's question (mirrors the source's validate_question).
export function validateQuestion(q: string, lang: 'en' | 'vi' | 'zh'): string {
  const s = (q || '').trim();
  const minMsg = lang === 'vi' ? 'Câu hỏi cần ít nhất 5 ký tự.'
    : lang === 'zh' ? '问题至少需要5个字符。'
    : 'The question needs at least 5 characters.';
  const maxMsg = lang === 'vi' ? 'Câu hỏi không quá 500 ký tự.'
    : lang === 'zh' ? '问题不能超过500字符。'
    : 'The question must be 500 characters or fewer.';
  if (s.length < 5) throw new Error(minMsg);
  if (s.length > 500) throw new Error(maxMsg);
  return s;
}
