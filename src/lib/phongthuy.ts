// HuyenBao v11.15 — Bát Trạch (八宅) + Cửu Tinh (九星) phong thuỷ engine.
// Ported faithfully from the Huyen-Hoc-AI FastAPI backend
// (backend/divination/phong_thuy.py) so the main app can build a simplified
// phong thuỷ reading entirely client-side, with the LLM interpretation via
// /api/phongthuy.
//
// The algorithms (cung phi giới tính via digit-sum, Bát Trạch hướng tốt/xấu
// table, hóp hướng nhà lookup, niên phi tinh (annual flying star) via Lo Shu,
// phi tinh bảy cung layout) are translated verbatim — no invented logic.
// The reading is a "giản lược" (simplified) reference per the source
// disclaimer; it may differ from a given phong thuỷ school.
//
// NOTE on JS modulo: Python's `%` always returns non-negative for positive
// divisor; JS `%` preserves the sign of the dividend. We use the standard
// `((x % n) + n) % n` idiom wherever Python's behaviour is required (e.g.
// tinh_nien_phi_tinh's `(11 - digit) % 9`). Same fix as the v11.14 Tử Vi port.

// ---- 8 hướng (directions) ----
export const HUONG = [
  'Bắc', 'Đông Bắc', 'Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc',
] as const;
export type Huong = typeof HUONG[number];

// ---- Cung phi quai (1–9 → name) ----
export const CUNG_PHI_QUAI: Record<number, string> = {
  1: 'Khảm', 2: 'Khôn', 3: 'Chấn', 4: 'Tốn', 5: 'Trung',
  6: 'Càn', 7: 'Đoài', 8: 'Cấn', 9: 'Ly',
};

// Đông tứ mệnh = {1, 3, 4, 9}; Tây tứ mệnh = the rest (excluding 5).
const DONG_TU_MENH = new Set([1, 3, 4, 9]);

// ---- 8 cung vị (4 tốt + 4 xấu) và ý nghĩa ----
export const CUNG_VI_Y_NGHIA: Record<string, string> = {
  'Sinh Khí': 'Tài lộc và phát triển (diễn giải truyền thống)',
  'Thiên Y': 'Sức khỏe và chăm sóc (diễn giải truyền thống)',
  'Diên Niên': 'Quan hệ và hòa hợp (diễn giải truyền thống)',
  'Phục Vị': 'Ổn định và tĩnh tại (diễn giải truyền thống)',
  'Tuyệt Mệnh': 'Một cung bất lợi theo cách diễn giải Bát Trạch',
  'Ngũ Quỷ': 'Một cung bất lợi theo cách diễn giải Bát Trạch',
  'Lục Sát': 'Một cung bất lợi theo cách diễn giải Bát Trạch',
  'Họa Hại': 'Một cung bất lợi theo cách diễn giải Bát Trạch',
};

// Bát Trạch table: for each cung phi (1–9), which direction each cung-vi falls in.
// Verbatim from phong_thuy.py BAT_TRACH_TABLE.
const BAT_TRACH_TABLE: Record<number, Record<string, Huong>> = {
  1: { 'Sinh Khí': 'Đông Nam', 'Thiên Y': 'Đông',   'Diên Niên': 'Nam',     'Phục Vị': 'Bắc',
       'Tuyệt Mệnh': 'Tây Nam',  'Ngũ Quỷ': 'Đông Bắc','Lục Sát': 'Tây Bắc',  'Họa Hại': 'Tây' },
  2: { 'Sinh Khí': 'Đông Bắc', 'Thiên Y': 'Tây',    'Diên Niên': 'Tây Bắc', 'Phục Vị': 'Tây Nam',
       'Tuyệt Mệnh': 'Bắc',      'Ngũ Quỷ': 'Đông Nam','Lục Sát': 'Nam',      'Họa Hại': 'Đông' },
  3: { 'Sinh Khí': 'Nam',      'Thiên Y': 'Bắc',    'Diên Niên': 'Đông Nam','Phục Vị': 'Đông',
       'Tuyệt Mệnh': 'Tây',      'Ngũ Quỷ': 'Tây Bắc', 'Lục Sát': 'Đông Bắc', 'Họa Hại': 'Tây Nam' },
  4: { 'Sinh Khí': 'Bắc',      'Thiên Y': 'Nam',    'Diên Niên': 'Đông',    'Phục Vị': 'Đông Nam',
       'Tuyệt Mệnh': 'Đông Bắc', 'Ngũ Quỷ': 'Tây Nam', 'Lục Sát': 'Tây',     'Họa Hại': 'Tây Bắc' },
  // cung phi 5: nam → 2, nữ → 8. We keep the same table as 2 here (matches
  // phong_thuy.py: BAT_TRACH_TABLE[5] is identical to [2]).
  5: { 'Sinh Khí': 'Đông Bắc', 'Thiên Y': 'Tây',    'Diên Niên': 'Tây Bắc', 'Phục Vị': 'Tây Nam',
       'Tuyệt Mệnh': 'Bắc',      'Ngũ Quỷ': 'Đông Nam','Lục Sát': 'Nam',      'Họa Hại': 'Đông' },
  6: { 'Sinh Khí': 'Tây',      'Thiên Y': 'Đông Bắc','Diên Niên': 'Tây Nam','Phục Vị': 'Tây Bắc',
       'Tuyệt Mệnh': 'Nam',      'Ngũ Quỷ': 'Đông',    'Lục Sát': 'Bắc',      'Họa Hại': 'Đông Nam' },
  7: { 'Sinh Khí': 'Tây Bắc',  'Thiên Y': 'Tây Nam','Diên Niên': 'Đông Bắc','Phục Vị': 'Tây',
       'Tuyệt Mệnh': 'Đông',     'Ngũ Quỷ': 'Nam',     'Lục Sát': 'Đông Nam', 'Họa Hại': 'Bắc' },
  8: { 'Sinh Khí': 'Tây Nam',  'Thiên Y': 'Tây Bắc','Diên Niên': 'Tây',     'Phục Vị': 'Đông Bắc',
       'Tuyệt Mệnh': 'Đông Nam', 'Ngũ Quỷ': 'Bắc',     'Lục Sát': 'Đông',     'Họa Hại': 'Nam' },
  9: { 'Sinh Khí': 'Đông',     'Thiên Y': 'Đông Nam','Diên Niên': 'Bắc',    'Phục Vị': 'Nam',
       'Tuyệt Mệnh': 'Tây Bắc',  'Ngũ Quỷ': 'Tây',     'Lục Sát': 'Tây Nam',  'Họa Hại': 'Đông Bắc' },
};

// 4 good cung-vi (the rest are bad).
const TOT = ['Sinh Khí', 'Thiên Y', 'Diên Niên', 'Phục Vị'];

// Reference "score" for each cung-vi — used only for the comparison display,
// matches phong_thuy.py hop_huong_nha's diem_tham_khao dict.
const DIEM_THAM_KHAO: Record<string, number> = {
  'Sinh Khí': 90, 'Thiên Y': 80, 'Diên Niên': 75, 'Phục Vị': 70,
  'Họa Hại': 30, 'Lục Sát': 20, 'Ngũ Quỷ': 10, 'Tuyệt Mệnh': 5,
};

// ---- Cửu Tinh (9 flying stars) ----
export interface CuuTinh {
  sao: number;
  ten: string;
  hanh: string;
  catHung: string;     // "Tham khảo" for all 9 — matches source cat_hung field
  yNghia: string;
}
export const CUU_TINH: Record<number, Omit<CuuTinh, 'sao'>> = {
  1: { ten: 'Nhất Bạch', hanh: 'Thủy', catHung: 'Tham khảo', yNghia: 'Quan lộc, danh tiếng' },
  2: { ten: 'Nhị Hắc',  hanh: 'Thổ',  catHung: 'Tham khảo', yNghia: 'Ổn định, chăm sóc' },
  3: { ten: 'Tam Bích',  hanh: 'Mộc',  catHung: 'Tham khảo', yNghia: 'Giao tiếp, thay đổi' },
  4: { ten: 'Tứ Lục',   hanh: 'Mộc',  catHung: 'Tham khảo', yNghia: 'Học tập, sáng tạo' },
  5: { ten: 'Ngũ Hoàng', hanh: 'Thổ',  catHung: 'Tham khảo', yNghia: 'Trung cung' },
  6: { ten: 'Lục Bạch', hanh: 'Kim',  catHung: 'Tham khảo', yNghia: 'Kỷ luật, trách nhiệm' },
  7: { ten: 'Thất Xích', hanh: 'Kim',  catHung: 'Tham khảo', yNghia: 'Giao tiếp, trao đổi' },
  8: { ten: 'Bát Bạch', hanh: 'Thổ',  catHung: 'Tham khảo', yNghia: 'Tổ chức, tích lũy' },
  9: { ten: 'Cửu Tử',   hanh: 'Hỏa',  catHung: 'Tham khảo', yNghia: 'Sáng tạo, biểu đạt' },
};

// Lo Shu flight order: index 0 = center, 1 = Tây Bắc, 2 = Tây, 3 = Đông Bắc,
// 4 = Nam, 5 = Bắc, 6 = Tây Nam, 7 = Đông, 8 = Đông Nam.
const LO_SHU_FLIGHT = [
  'Trung cung', 'Tây Bắc', 'Tây', 'Đông Bắc', 'Nam',
  'Bắc', 'Tây Nam', 'Đông', 'Đông Nam',
] as const;

// ---- helpers ----

// Validate (year, month, day) as a real Gregorian date. We avoid the JS Date
// constructor here because Date.UTC maps years 0–99 to 1900–1999, breaking
// dates like year=1. Matches Python's `date(year, month, day)` strictness.
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function isValidDate(y: number, m: number, d: number): boolean {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (y < 1 || m < 1 || m > 12 || d < 1) return false;
  let dim = DAYS_IN_MONTH[m - 1];
  if (m === 2) {
    const leap = (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
    if (leap) dim = 29;
  }
  return d <= dim;
}

// Repeatedly sum the digits of `value` until it is a single digit (1..9).
// Python `_digit_sum` uses `while value > 9: value = sum(int(c) for c in str(value))`.
// Note: Python returns 0 for value=0; this returns 0 too (loop never runs).
// Important: it does NOT reduce to 1..9 — value 0 stays 0. The niên phi tinh
// formula handles the 0 case explicitly with `or 9`.
function digitSum(value: number): number {
  let v = Math.abs(Math.trunc(value));
  while (v > 9) {
    v = String(v).split('').reduce((acc, ch) => acc + (+ch), 0);
  }
  return v;
}

// Compute the Kua number (cung phi) from birth date + gender.
// Verbatim from tinh_cung_phi_gioi_tinh.
export function tinhCungPhi(day: number, month: number, year: number, gioiTinh: 'nam' | 'nu'): number {
  if (!isValidDate(year, month, day)) {
    throw new Error('Ngày sinh không hợp lệ.');
  }
  if (gioiTinh !== 'nam' && gioiTinh !== 'nu') {
    throw new Error("gioi_tinh phải là 'nam' hoặc 'nu'.");
  }
  const yearDigits = digitSum(year % 100);
  let kua: number;
  if (year < 2000) {
    kua = gioiTinh === 'nam' ? 10 - yearDigits : yearDigits + 5;
  } else {
    kua = gioiTinh === 'nam' ? 9 - yearDigits : yearDigits + 6;
  }
  kua = digitSum(kua);
  if (kua === 5) {
    return gioiTinh === 'nam' ? 2 : 8;
  }
  return kua;
}

// All 8 cung-vi for a given Kua number, split into good (4) and bad (4).
// Verbatim from huong_tot_xau.
export interface HuongEntry {
  cung: string;       // cung-vi name (Sinh Khí, ...)
  huong: Huong;       // direction
  yNghia: string;     // meaning
  loai: 'tham khảo';
}
export interface HuongTotXau {
  cungPhi: number;
  quai: string;
  nhom: 'Đông tứ mệnh' | 'Tây tứ mệnh';
  huongTot: HuongEntry[];
  huongXau: HuongEntry[];
}
export function huongTotXau(cungPhi: number): HuongTotXau {
  if (!(cungPhi in BAT_TRACH_TABLE)) {
    throw new Error('Cung phi phải nằm trong khoảng 1–9.');
  }
  const table = BAT_TRACH_TABLE[cungPhi];
  return {
    cungPhi,
    quai: CUNG_PHI_QUAI[cungPhi],
    nhom: DONG_TU_MENH.has(cungPhi) ? 'Đông tứ mệnh' : 'Tây tứ mệnh',
    huongTot: TOT.map(name => ({
      cung: name, huong: table[name], yNghia: CUNG_VI_Y_NGHIA[name], loai: 'tham khảo' as const,
    })),
    huongXau: Object.keys(table)
      .filter(name => !TOT.includes(name))
      .map(name => ({
        cung: name, huong: table[name], yNghia: CUNG_VI_Y_NGHIA[name], loai: 'tham khảo' as const,
      })),
  };
}

// Lookup which cung-vi a specific house direction falls in, for a given Kua.
// Verbatim from hop_huong_nha.
export interface HopHuongResult {
  huongNha: Huong;
  cung: string;          // cung-vi name
  yNghia: string;
  tot: boolean;
  diemThamKhao: number;  // 90/80/75/70/30/20/10/5 by cung-vi
}
export function hopHuong(cungPhi: number, huongNha: Huong): HopHuongResult {
  if (!HUONG.includes(huongNha)) {
    throw new Error('Hướng nhà không hợp lệ.');
  }
  const table = BAT_TRACH_TABLE[cungPhi];
  if (!table) {
    throw new Error('Cung phi phải nằm trong khoảng 1–9.');
  }
  // Find the cung-vi whose direction matches huongNha (matches Python's
  // `next(name for name, direction in table.items() if direction == huong_nha)`).
  const cung = Object.keys(table).find(name => table[name] === huongNha)!;
  return {
    huongNha,
    cung,
    yNghia: CUNG_VI_Y_NGHIA[cung],
    tot: TOT.includes(cung),
    diemThamKhao: DIEM_THAM_KHAO[cung],
  };
}

// Annual flying star (niên phi tinh) — the central palace star for a given
// solar year. Verbatim from tinh_nien_phi_tinh.
//   star = (11 - digit_sum(year)) % 9  or  9
// Note the Python idiom: `(x % 9) or 9` returns 9 when x % 9 == 0. We mirror
// it explicitly because of the JS modulo behaviour for negative dividends.
export function tinhNienPhiTinh(year: number): number {
  if (year < 1) {
    throw new Error('Năm không hợp lệ.');
  }
  const m = ((11 - digitSum(year)) % 9 + 9) % 9;
  return m === 0 ? 9 : m;
}

// Lay out all 9 flying stars across the 8 directions + center, given the
// central star. Verbatim from phi_tinh_bay_cung.
export type BayCungResult = Record<string, CuuTinh>;
export function phiTinhBayCung(centerStar: number): BayCungResult {
  if (!(centerStar in CUU_TINH)) {
    throw new Error('Sao trung cung phải nằm trong khoảng 1–9.');
  }
  const result: BayCungResult = {};
  LO_SHU_FLIGHT.forEach((direction, offset) => {
    // star = (centerStar + offset - 1) % 9 + 1   — JS modulo fix.
    const star = ((centerStar + offset - 1) % 9 + 9) % 9 + 1;
    result[direction] = { sao: star, ...CUU_TINH[star] };
  });
  return result;
}

// Flying star for a specific day. Verbatim from phi_tinh_ngay.
// Uses the year's annual star (we don't compute daily flight — matches the
// Python source's "giản lược" disclaimer).
export interface PhiTinhNgay {
  ngay: string;          // ISO date (yyyy-mm-dd)
  saoTrungCung: number;
  saoInfo: Omit<CuuTinh, 'sao'>;
  bayCung: BayCungResult;
  ghiChu: string;
}
export function phiTinhNgay(year: number, month: number, day: number): PhiTinhNgay {
  if (!isValidDate(year, month, day)) {
    throw new Error('Ngày không hợp lệ.');
  }
  const star = tinhNienPhiTinh(year);
  // ISO yyyy-mm-dd, year zero-padded to 4 digits to match Python's
  // `date.isoformat()` (e.g. date(1,1,1).isoformat() == '0001-01-01').
  const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return {
    ngay: iso,
    saoTrungCung: star,
    saoInfo: CUU_TINH[star],
    bayCung: phiTinhBayCung(star),
    ghiChu: 'Bảng phi tinh năm giản lược; không dùng làm căn cứ cho quyết định quan trọng.',
  };
}

// Full reading for a person. Verbatim from phan_tich_toan_dien.
// Adds: house direction match (+ optional kitchen + bedroom directions) and
// today's flying star.
export interface PhongThuyReading {
  cungPhi: number;
  quai: string;
  nhom: 'Đông tứ mệnh' | 'Tây tứ mệnh';
  huongTot: HuongEntry[];
  huongXau: HuongEntry[];
  huongNha: HopHuongResult;
  huongBep?: HopHuongResult;
  huongPhongNgu?: HopHuongResult;
  phiTinhHomNay: PhiTinhNgay;
  ghiChu: string;
}
export function phanTichToanDien(
  day: number,
  month: number,
  year: number,
  gioiTinh: 'nam' | 'nu' = 'nam',
  huongNha: Huong = 'Nam',
  huongBep?: Huong,
  huongPhongNgu?: Huong,
): PhongThuyReading {
  const kua = tinhCungPhi(day, month, year, gioiTinh);
  const dirs = huongTotXau(kua);
  // Python source uses `date.today()` — system local date. Mirror it by
  // reading local (not UTC) fields on `new Date()`.
  const today = new Date();
  const result: PhongThuyReading = {
    ...dirs,
    huongNha: hopHuong(kua, huongNha),
    phiTinhHomNay: phiTinhNgay(today.getFullYear(), today.getMonth() + 1, today.getDate()),
    ghiChu:
      'Các phép tính phong thủy là nội dung văn hóa tham khảo, không có giá trị dự đoán khoa học. '
      + 'Cung phi đang dùng năm dương lịch; quy ước có thể khác nếu xét năm âm lịch.',
  };
  if (huongBep) result.huongBep = hopHuong(kua, huongBep);
  if (huongPhongNgu) result.huongPhongNgu = hopHuong(kua, huongPhongNgu);
  return result;
}
