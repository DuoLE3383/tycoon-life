// HuyenBao v11.14 — Tử Vi (紫微斗数) natal chart engine.
// Ported faithfully from the Huyen-Hoc-AI FastAPI backend
// (backend/divination/tu_vi.py) so the main app can build a simplified Tử Vi
// lá số entirely client-side, with the LLM interpretation via /api/tuvi.
//
// Two source typos fixed in the port:
//   - an_phu_tinh: "Hồng Loan": ồng[year_branch_index]  →  hồng[year_branch_index]
//   - lap_la_so:   gio_sinh label "CHIour_index]"        →  CHI[hour_index]
// Otherwise the algorithms (AmLich solar→lunar UTC+7, nap âm, cục mệnh, an sao)
// are translated verbatim — no invented logic. The chart is a "giản lược"
// (simplified) reference per the source disclaimer; it may differ from a given
// Tử Vi school.

export const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
export const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
export const CUNG = [
  'Mệnh', 'Phụ Mẫu', 'Phúc Đức', 'Điền Trạch', 'Quan Lộc', 'Nô Bộc',
  'Thiên Di', 'Tật Ách', 'Tài Bạch', 'Tử Tức', 'Phu Thê', 'Huynh Đệ',
];
// Nạp âm element for each pair-index in the 60-cycle (index // 2 → 30 pairs).
const NAP_AM = [
  'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim', 'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc',
  'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy', 'Kim', 'Hỏa', 'Mộc', 'Thổ', 'Kim',
  'Hỏa', 'Thủy', 'Thổ', 'Kim', 'Mộc', 'Thủy', 'Thổ', 'Hỏa', 'Mộc', 'Thủy',
];
const CUC_BY_ELEMENT: Record<string, string> = {
  'Thủy': 'Thủy Nhị Cục', 'Mộc': 'Mộc Tam Cục', 'Kim': 'Kim Tứ Cục',
  'Thổ': 'Thổ Ngũ Cục', 'Hỏa': 'Hỏa Lục Cục',
};
const CUC_NUMBER: Record<string, number> = {
  'Thủy Nhị Cục': 2, 'Mộc Tam Cục': 3, 'Kim Tứ Cục': 4, 'Thổ Ngũ Cục': 5, 'Hỏa Lục Cục': 6,
};
export const CHINH_TINH = [
  'Tử Vi', 'Thiên Cơ', 'Thái Dương', 'Vũ Khúc', 'Thiên Đồng', 'Liêm Trinh',
  'Thiên Phủ', 'Thái Âm', 'Tham Lang', 'Cự Môn', 'Thiên Tướng', 'Thiên Lương',
  'Thất Sát', 'Phá Quân',
];
// Star state (Miếu/Vượng/Đắc/Bình/Hãm) per palace branch index 0..11.
const TRANG_THAI: Record<string, string[]> = {
  'Tử Vi':       ['Bình', 'Vượng', 'Miếu', 'Vượng', 'Đắc', 'Miếu', 'Miếu', 'Vượng', 'Đắc', 'Vượng', 'Miếu', 'Vượng'],
  'Thiên Cơ':    ['Miếu', 'Đắc', 'Đắc', 'Vượng', 'Miếu', 'Hãm', 'Hãm', 'Đắc', 'Vượng', 'Miếu', 'Hãm', 'Hãm'],
  'Thái Dương':  ['Hãm', 'Hãm', 'Vượng', 'Miếu', 'Miếu', 'Vượng', 'Đắc', 'Đắc', 'Bình', 'Hãm', 'Hãm', 'Bình'],
  'Vũ Khúc':     ['Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Bình', 'Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Bình'],
  'Thiên Đồng':  ['Vượng', 'Đắc', 'Hãm', 'Hãm', 'Bình', 'Vượng', 'Miếu', 'Đắc', 'Hãm', 'Hãm', 'Bình', 'Vượng'],
  'Liêm Trinh':  ['Miếu', 'Bình', 'Vượng', 'Hãm', 'Hãm', 'Vượng', 'Miếu', 'Bình', 'Vượng', 'Hãm', 'Hãm', 'Vượng'],
  'Thiên Phủ':   ['Miếu', 'Vượng', 'Đắc', 'Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Đắc'],
  'Thái Âm':     ['Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm', 'Hãm', 'Bình', 'Đắc', 'Vượng', 'Miếu', 'Vượng', 'Đắc'],
  'Tham Lang':   ['Bình', 'Hãm', 'Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm', 'Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm'],
  'Cự Môn':      ['Vượng', 'Miếu', 'Đắc', 'Vượng', 'Bình', 'Hãm', 'Hãm', 'Bình', 'Vượng', 'Miếu', 'Đắc', 'Vượng'],
  'Thiên Tướng': ['Miếu', 'Đắc', 'Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Đắc', 'Vượng', 'Miếu', 'Đắc', 'Vượng'],
  'Thiên Lương': ['Miếu', 'Vượng', 'Đắc', 'Miếu', 'Vượng', 'Đắc', 'Miếu', 'Vượng', 'Đắc', 'Miếu', 'Vượng', 'Đắc'],
  'Thất Sát':    ['Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm', 'Vượng', 'Miếu', 'Vượng', 'Đắc', 'Bình', 'Hãm', 'Vượng'],
  'Phá Quân':    ['Miếu', 'Vượng', 'Đắc', 'Hãm', 'Bình', 'Vượng', 'Miếu', 'Vượng', 'Đắc', 'Hãm', 'Bình', 'Vượng'],
};

// ---- AmLich: solar → lunar (Vietnamese UTC+7) via astronomical new moon ----
function jdFromYmd(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const year = y + 4800 - a;
  const month = m + 12 * a - 3;
  return d + Math.floor((153 * month + 2) / 5) + 365 * year + Math.floor(year / 4)
    - Math.floor(year / 100) + Math.floor(year / 400) - 32045;
}
function newMoonDay(k: number, tz = 7.0): number {
  const t = k / 1236.85;
  const t2 = t * t, t3 = t2 * t;
  const rad = Math.PI / 180;
  let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3;
  jd += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * rad);
  const meanSun = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const meanMoon = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const moonArg = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let c = (0.1734 - 0.000393 * t) * Math.sin(meanSun * rad);
  c += 0.0021 * Math.sin(2 * meanSun * rad);
  c -= 0.4068 * Math.sin(meanMoon * rad);
  c += 0.0161 * Math.sin(2 * meanMoon * rad);
  c -= 0.0004 * Math.sin(3 * meanMoon * rad);
  c += 0.0104 * Math.sin(2 * moonArg * rad);
  c -= 0.0051 * Math.sin((meanSun + meanMoon) * rad);
  c -= 0.0074 * Math.sin((meanSun - meanMoon) * rad);
  c += 0.0004 * Math.sin((2 * moonArg + meanSun) * rad);
  c -= 0.0004 * Math.sin((2 * moonArg - meanSun) * rad);
  c -= 0.0006 * Math.sin((2 * moonArg + meanMoon) * rad);
  c += 0.0010 * Math.sin((2 * moonArg - meanMoon) * rad);
  c += 0.0005 * Math.sin((2 * meanMoon + meanSun) * rad);
  const deltaT = t < -11
    ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
    : -0.000278 + 0.000265 * t + 0.000262 * t2;
  return Math.floor(jd + c - deltaT + 0.5 + tz / 24);
}
function sunLongitudeSector(dayNumber: number, tz = 7.0): number {
  const t = (dayNumber - 2451545.5 - tz / 24) / 36525;
  const t2 = t * t;
  const rad = Math.PI / 180;
  const meanAnom = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t2 * t;
  const meanLong = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  let d = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.sin(meanAnom * rad);
  d += (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnom * rad);
  d += 0.000290 * Math.sin(3 * meanAnom * rad);
  // JS `%` can return negative for negative operands (unlike Python's modulo,
  // which always returns non-negative). Normalise to [0, 360) so the sector
  // floor matches the Python source exactly.
  const longitude = (((meanLong + d) % 360) + 360) % 360;
  return Math.floor(longitude / 30);
}
function lunarMonth11(year: number, tz = 7.0): number {
  const offset = jdFromYmd(year, 12, 31) - 2415021;
  const k = Math.floor(offset / 29.530588853);
  let nm = newMoonDay(k, tz);
  if (sunLongitudeSector(nm, tz) >= 9) nm = newMoonDay(k - 1, tz);
  return nm;
}
function leapMonthOffset(month11: number, tz = 7.0): number {
  const k = Math.floor(0.5 + (month11 - 2415021.076998695) / 29.530588853);
  let lastArc = -1;
  let index = 1;
  let arc = sunLongitudeSector(newMoonDay(k + index, tz), tz);
  while (arc !== lastArc && index < 14) {
    lastArc = arc;
    index++;
    arc = sunLongitudeSector(newMoonDay(k + index, tz), tz);
  }
  return index - 1;
}
export function solarToLunar(y: number, m: number, d: number, tz = 7.0): { day: number; month: number; year: number; isLeap: boolean } {
  const jd = jdFromYmd(y, m, d);
  const k = Math.floor((jd - 2415021.076998695) / 29.530588853);
  let monthStart = newMoonDay(k + 1, tz);
  if (monthStart > jd) monthStart = newMoonDay(k, tz);
  let month11 = lunarMonth11(y, tz);
  let nextMonth11 = month11;
  let lunarYear: number;
  if (month11 >= monthStart) {
    lunarYear = y;
    month11 = lunarMonth11(y - 1, tz);
  } else {
    lunarYear = y + 1;
    nextMonth11 = lunarMonth11(y + 1, tz);
  }
  const lunarDay = jd - monthStart + 1;
  let monthDiff = Math.floor((monthStart - month11) / 29.0);
  let lunarMonth = monthDiff + 11;
  let isLeap = false;
  if (nextMonth11 - month11 > 365) {
    const leapOff = leapMonthOffset(month11, tz);
    if (monthDiff >= leapOff) {
      lunarMonth = monthDiff + 10;
      isLeap = monthDiff === leapOff;
    }
  }
  if (lunarMonth > 12) lunarMonth -= 12;
  if (lunarMonth >= 11 && monthDiff < 4) lunarYear -= 1;
  return { day: lunarDay, month: lunarMonth, year: lunarYear, isLeap };
}

// ---- chart-building ----
function napAm(stemIdx: number, branchIdx: number): string {
  for (let cycleIdx = 0; cycleIdx < 60; cycleIdx++) {
    if (cycleIdx % 10 === stemIdx && cycleIdx % 12 === branchIdx) {
      return NAP_AM[Math.floor(cycleIdx / 2)];
    }
  }
  throw new Error('Can Chi không hợp lệ.');
}
function cucMenh(menhBranchIdx: number, yearStemIdx: number): string {
  // Ngũ Hổ Độn: find the Can at Dần (index 2), then the Can at the Mệnh palace.
  const stemAtDan = (yearStemIdx % 5 * 2 + 2) % 10;
  const palaceStem = (stemAtDan + menhBranchIdx - 2) % 10;
  const palaceElement = napAm(palaceStem, menhBranchIdx);
  return CUC_BY_ELEMENT[palaceElement];
}
function anTuVi(cuc: string, lunarDay: number): number {
  const bureau = CUC_NUMBER[cuc];
  const quotient = Math.ceil(lunarDay / bureau);
  const remainder = quotient * bureau - lunarDay;
  const position = quotient + (remainder % 2 === 0 ? remainder : -remainder);
  return (2 + position - 1) % 12;
}
function an14ChinhTinh(tuViIdx: number): Record<string, number> {
  const positions: Record<string, number> = {
    'Tử Vi': tuViIdx,
    'Thiên Cơ': (tuViIdx - 1 + 12) % 12,
    'Thái Dương': (tuViIdx - 3 + 12) % 12,
    'Vũ Khúc': (tuViIdx - 4 + 12) % 12,
    'Thiên Đồng': (tuViIdx - 5 + 12) % 12,
    'Liêm Trinh': (tuViIdx - 8 + 12) % 12,
  };
  const tianFu = (4 - tuViIdx + 12) % 12;
  positions['Thiên Phủ'] = tianFu;
  positions['Thái Âm'] = (tianFu + 1) % 12;
  positions['Tham Lang'] = (tianFu + 2) % 12;
  positions['Cự Môn'] = (tianFu + 3) % 12;
  positions['Thiên Tướng'] = (tianFu + 4) % 12;
  positions['Thiên Lương'] = (tianFu + 5) % 12;
  positions['Thất Sát'] = (tianFu + 6) % 12;
  positions['Phá Quân'] = (tianFu + 10) % 12;
  return positions;
}
// Auxiliary star lookup tables (indexed by year-stem or year-branch).
const KHOI = [1, 0, 11, 11, 1, 0, 1, 7, 6, 3];          // year stem 0..9
const VIET = [7, 8, 4, 5, 7, 8, 7, 1, 2, 5];            // year stem 0..9
const LOC = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];            // year stem 0..9
const DAO = [9, 6, 3, 0, 9, 6, 3, 0, 9, 6, 3, 0];       // year branch 0..11
const HONG = [3, 2, 1, 0, 11, 10, 9, 8, 7, 6, 5, 4];    // year branch 0..11
function anPhuTinh(yearStemIdx: number, yearBranchIdx: number, hourIdx: number, lunarMonth: number): Record<string, number[]> {
  const locIdx = LOC[yearStemIdx];
  return {
    'Tả Phù': [(2 + lunarMonth - 1) % 12],
    'Hữu Bật': [(10 - (lunarMonth - 1) + 12) % 12],
    'Văn Xương': [(10 - hourIdx + 12) % 12],
    'Văn Khúc': [(4 + hourIdx) % 12],
    'Thiên Khôi': [KHOI[yearStemIdx]],
    'Thiên Việt': [VIET[yearStemIdx]],
    'Lộc Tồn': [locIdx],
    'Kình Dương': [(locIdx + 1) % 12],
    'Đà La': [(locIdx - 1 + 12) % 12],
    'Hỏa Tinh': [(2 + hourIdx) % 12],
    'Linh Tinh': [(10 - hourIdx + 12) % 12],
    'Đào Hoa': [DAO[yearBranchIdx]],
    'Hồng Loan': [HONG[yearBranchIdx]],
  };
}

export interface Palace {
  cung: string;          // palace name (Mệnh, Phụ Mẫu, ...)
  diaChi: string;        // branch (Tý, Sửu, ...)
  viTri: number;         // branch index 0..11
  laMenh: boolean;       // is this the Mệnh palace
  laThan: boolean;       // is this the Thân palace
  chinhTinh: { sao: string; trangThai: string }[];
  phuTinh: string[];
}
export interface LaSo {
  duongLich: string;     // dd/mm/yyyy
  amLich: string;        // dd/mm/yyyy [nhuận]
  canChiNam: string;     // e.g. "Giáp Tý"
  gioSinh: string;       // e.g. "12:00 (Chi Ngọ)"
  cuc: string;           // e.g. "Kim Tứ Cục"
  menhChi: string;
  thanChi: string;
  tuViTai: string;       // branch where Tử Vi sits
  cung: Palace[];        // 12 palaces
  ghiChu: string;
}
export function lapLaSo(day: number, month: number, year: number, hour = 0): LaSo {
  if (!(hour >= 0 && hour <= 23)) throw new Error('Giờ sinh phải nằm trong khoảng 0–23.');
  const lunar = solarToLunar(year, month, day);
  const yearStemIdx = (lunar.year - 4) % 10;
  const yearBranchIdx = (lunar.year - 4) % 12;
  const hourIdx = Math.floor((hour + 1) / 2) % 12;
  const lifeBranchIdx = (2 + lunar.month - 1 - hourIdx + 12) % 12;
  const bodyBranchIdx = (2 + lunar.month - 1 + hourIdx) % 12;
  const bureau = cucMenh(lifeBranchIdx, yearStemIdx);
  const ziweiIdx = anTuVi(bureau, lunar.day);
  const mainPos = an14ChinhTinh(ziweiIdx);
  const auxPos = anPhuTinh(yearStemIdx, yearBranchIdx, hourIdx, lunar.month);

  const cung: Palace[] = [];
  for (let off = 0; off < CUNG.length; off++) {
    const branchIdx = ((lifeBranchIdx - off) % 12 + 12) % 12;
    const mainStars = Object.entries(mainPos)
      .filter(([, pos]) => pos === branchIdx)
      .map(([star]) => ({ sao: star, trangThai: TRANG_THAI[star][branchIdx] }));
    const auxStars = Object.entries(auxPos)
      .filter(([, positions]) => positions.includes(branchIdx))
      .map(([star]) => star);
    cung.push({
      cung: CUNG[off],
      diaChi: CHI[branchIdx],
      viTri: branchIdx,
      laMenh: branchIdx === lifeBranchIdx,
      laThan: branchIdx === bodyBranchIdx,
      chinhTinh: mainStars,
      phuTinh: auxStars,
    });
  }
  const amLabel = `${String(lunar.day).padStart(2, '0')}/${String(lunar.month).padStart(2, '0')}/${lunar.year}${lunar.isLeap ? ' (nhuận)' : ''}`;
  return {
    duongLich: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    amLich: amLabel,
    canChiNam: `${CAN[yearStemIdx]} ${CHI[yearBranchIdx]}`,
    gioSinh: `${String(hour).padStart(2, '0')}:00 (Chi ${CHI[hourIdx]})`,
    cuc: bureau,
    menhChi: CHI[lifeBranchIdx],
    thanChi: CHI[bodyBranchIdx],
    tuViTai: CHI[ziweiIdx],
    cung,
    ghiChu: 'Ngày âm lịch tính theo UTC+7. Cách an sao, cục và trạng thái sao ở đây được giản lược để tham khảo, có thể khác trường phái Tử Vi.',
  };
}
