// v13.23 A — real CHANGELOG map. Single source of truth for What's New.
// scripts/show-version.mjs reads this file to sync public/version.json,
// so a version bump can never again leave version.json stale at v13.11.
// WhatsNewModal keeps reading version.json (via useGameController),
// so the modal shows exactly what is here.
export interface ChangelogEntry {
  headline: string;
  summary: string;
  features: string[];
}
export const CHANGELOG: Record<string, ChangelogEntry> = {
  'v13.22': {
    headline: 'HuyenBao v13.22 — Assets update + refactored app',
    summary: 'v13.22: Improved asset organization and refactored the application into separate layout, tab, and modal components while preserving game features.',
    features: [
      'Assets: improved organization of owned items and categories',
      'App structure: tabs, layout, and modals are separated into components',
      'Game features and behavior preserved across the refactor',
    ],
  },
  'v13.23': {
    headline: 'HuyenBao v13.23 — Shop first, profit-aware business, clear property costs',
    summary: 'v13.23: In Assets, shopping items now appear before owned items. Business value follows profit, sale offers follow business value. Property costs split into Property tax 1% + Asset upkeep 1% with the same 2% total.',
    features: [
      'Assets: shopping items (buy catalogue + used items) now appear before owned items',
      'Business: business value is profit-aware (paid + 2x annual net, clamped -25% / +50%)',
      'Business: sale offers are based on profit-aware fair value, not raw paid price',
      'Finance: Property tax 1%/yr and Asset upkeep 1%/yr shown as separate lines, total still 2%',
    ],
  },
  'v13.24': {
    headline: 'HuyenBao v13.24 — Travel modal fixed + Vietnamese thousand dots',
    summary: 'v13.24: Travel modal now renders via Portal to document.body so it covers the full viewport instead of being clipped to 34px. All numbers now use Vietnamese thousand-dot grouping (vi-VN), e.g. +$1.602.817.222.',
    features: [
      'Travel: modal rendered via Portal to document.body, full-viewport overlay, no longer clipped or overlapping',
      'Numbers: all numbers use Vietnamese thousand-dot grouping (vi-VN), e.g. +$1.602.817.222',
      'Numbers: fmtFull and all toLocaleString() calls now use vi-VN',
    ],
  },
  'v13.25': {
    headline: 'HuyenBao v13.25 — Travel + More modals fixed with Portal tgame wrapper',
    summary: 'v13.25: Travel and More modals render via Portal to document.body wrapped in .tgame, so they keep full game styling and cover the full viewport instead of being clipped or oversized.',
    features: [
      'Travel: Portal to document.body wrapped in .tgame, full-viewport overlay, icon back to normal size',
      'More: same Portal + .tgame fix for Guide / News / Achievements / Timeline / Log popup',
      'Modals: no longer clipped to 34px or overlapping Tips / footer',
    ],
  },
  'v13.26': {
    headline: 'HuyenBao v13.26 — Elliott guide in Market',
    summary: 'v13.26: Market tab now has a local Elliott Wave investment guide above the companion-app link: impulse 1-2-3-4-5, corrective A-B-C, and capital rules. No external API, no iframe. SpiritTab unchanged.',
    features: [
      'Market: local Elliott Wave guide panel above the companion-app link',
      'Market: impulse 1-2-3-4-5, corrective A-B-C, and capital / take-profit / stop-loss rules',
      'Ecosystem: Elliott stays in Market, mysticism stays in Tam Linh, no Hub',
    ],
  },
  'v13.27': {
    headline: 'HuyenBao v13.27 — Đổi nhân vật bằng Game ID',
    summary: 'v13.27: Edit Profile thành Setting, thêm Đổi nhân vật bằng Game ID khác. Mỗi nhân vật = 1 Game ID = 1 save riêng, đổi là load save đó, ID cũ vẫn còn nguyên.',
    features: [
      'Profile: nút Edit ✏ đổi thành Setting ⚙️',
      'Profile: Đổi nhân vật = nhập Game ID khác, load save của nhân vật đó',
      'Intro: giữ nguyên Continue bằng User ID từ v13.21, không thêm nút mới',
    ],
  },
  'v13.42': {
    headline: 'HuyenBao v13.42 — Version sync + Popup Gigs thoat khoi dashboard',
    summary: 'v13.42: Dong bo version hien thi voi git log (v13.27 -> v13.42). Popup Quick gigs thoat khoi .pinzone overflow:hidden, khong con bi kep.',
    features: [
      'Version: BUNDLED_VERSION + CHANGELOG + version.json dong bo v13.42',
      'Dashboard v13.34-13.41: pin-actions-bar tach rieng, Net Worth to mau 4 dong, Sleep/Income gon',
      'Popup: Quick gigs thoat khoi dashboard, khong con bi kep boi overflow:hidden',
    ],
  },
  'v13.43': {
    headline: 'HuyenBao v13.43 — GigsPopup Portal, het bi kep',
    summary: 'v13.43: GigsPopup Portal ra document.body + boc .tgame. Fix .pinzone backdrop-filter lam kep modal-overlay, khong con dung overflow hack.',
    features: [
      'GigsPopup: Portal to document.body, giu nguyen modal-box + glow + Esc',
      'Fix goc: backdrop-filter tren .pinzone tao containing block cho position:fixed',
    ],
  },
  'v13.44': {
    headline: 'HuyenBao v13.44 — i18n missing keys + Assets labels + Sleep redesign',
    summary: 'v13.44: Them key thieu soc.online, hp.decay, divine.thinking, mk.elliottGuide, v11.gen. AssetsTab labels qua t(). Sleep card tach 3 khoi.',
    features: [
      'i18n: them key thieu, het hien fallback EN',
      'Assets: category labels dich VI/ZH',
      'Sleep: tach Status / Effects / Debt, day Rent xuong block rieng',
    ],
  },
  'v13.45': {
    headline: 'HuyenBao v13.45 — Sleep 3 blocks + Finance i18n + Gigs Close + Club Phase 1',
    summary: 'v13.45: Sleep tach 3 khoi Status/Effects/Debt, FinanceOverview qua t(), Gigs nut Dong, Club hien Level/Members/Maintenance/Event/Buff.',
    features: [
      'Sleep: tach 3 khoi, day Rent/Jobs/Study ra block rieng',
      'Finance: 2 doan giai thich + header qua t()',
      'Gigs: nut Close -> Dong, khong con Hủy',
      'Club Phase 1: hien Level/Members/Maintenance/Event/Buff per-type',
    ],
  },
  'v13.46': {
    headline: 'HuyenBao v13.46 — Market deterministic + Business rescale, cafe khong con 100$/thang',
    summary: 'v13.46: Market Phase 1 gia theo seed(uid+day+stock), reload khong doi gia. Business rescale toan bo BIZ, cafe 18000/36000 lai ~2937$/thang, branchNet sua loi don vi thang/nam.',
    features: [
      'Market Phase 1: gia stock seed theo game uid + day + stockId, cung game cung ngay = cung gia',
      'Business: rescale 20 BIZ, street 2500/12000 lam biz khoi dau, cafe 18000/36000',
      'Business: branchNet sua loi tru chi phi ca nam vao 1 thang, them royalty + manager',
      'BizTab: sua hien thi ifSteady tu inc*12 ve inc (inc la /nam)',
      'i18n: suggest cafe 800$ -> 18000$, starter doi sang street stall',
    ],
  },
  'v13.47': {
    headline: 'HuyenBao v13.47 - Club Phase 2: real dues, levels, fame buffs',
    summary: 'v13.47: Clubs now have real logic. Maintenance is charged yearly, insufficient funds auto-leave. Level grows with years joined (cap 5), members grow with level and fame. Fame buffs from social and fame clubs apply to fame gains. Events use real club event names. Sky buff fixed to +70% to match mult 1.7.',
    features: [
      'Clubs: maintenance charged yearly in yearEnd, auto-leave + toast if insufficient funds',
      'Clubs: Level = 1 + years joined, cap 5; members = base + (Level-1) x 15, own club capped at 200',
      'Clubs: Fame buffs stack (Wine +10%, Car +15%, Polo +25%, Yacht +40%) into fame gains + passive fame',
      'Clubs: monthly dues now show maintenance/12, not fee/12; events log real names (Wine Tasting, Golf Tournament...)',
      'Clubs: Sky buff fixed +50% -> +70% to match mult 1.7',
    ],
  },
  'v13.48': {
    headline: 'HuyenBao v13.48 - Than phan: ngon ngu + quoc tich + 30 nuoc',
    summary: 'v13.48: Tab Than phan moi. Hoc 19 ngon ngu Level 1-5, nhap tich can ngon ngu Lv 4+, cu tru 180 ngay, phi 500.000$, Fame 500 hoac tai san 5M, cho duyet 90 ngay. 30 nuoc, Dubai hien thi United Arab Emirates (Dubai).',
    features: [
      'Than phan: tab moi trong nhom Character - quoc tich hien tai / goc, ngoai ngu, cu tru, nhap tich',
      'Ngon ngu: 19 ngon ngu, Level 1-5, phi 10.000$ x Lv dich x (1 + Lv hien tai x 0.2), 30 ngay x Lv dich, +50 XP x Lv dich khi xong',
      'Quoc tich: can 1 ngon ngu Lv 4+, cu tru 180 ngay, phi 500.000$ tru that, Fame >= 500 hoac tai san rong >= 5M, cho duyet 90 ngay',
      'Di chuyen: di toi 1 nuoc cu the +7 ngay cu tru, phi 2.000$ + 500$ x so chuyen, cooldown 14 ngay',
      'Nuoc: mo rong len Top 30, Dubai hien thi United Arab Emirates (Dubai), khong luu rieng Dubai',
    ],
  },

};
