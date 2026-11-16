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
    summary: 'v13.24: Travel modal now renders via Portal to document.body so it covers the full viewport instead of being clipped to 34px. All numbers now use Vietnamese thousand-dot grouping (en-US), e.g. +$1.602.817.222.',
    features: [
      'Travel: modal rendered via Portal to document.body, full-viewport overlay, no longer clipped or overlapping',
      'Numbers: all numbers use Vietnamese thousand-dot grouping (en-US), e.g. +$1.602.817.222',
      'Numbers: fmtFull and all toLocaleString() calls now use en-US',
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
  'v13.50': {
    headline: 'HuyenBao v13.50 - Tra cuu Bing + Rarity theo gia + Loai vat pham',
    summary: 'v13.50: Lookup them Bing/Openverse (khong can API key), anh thu handbag/bag tranh Tabby ra buom. Rarity floor theo gia that: >=20k len Legendary, >=5k len Rare. Them Loai used/standard/custom/rare + loc list.',
    features: [
      'Lookup: z-ai -> Bing (thu handbag/bag/product) -> Openverse -> Wikimedia, 1 anh, khong can Google API',
      'Rarity: floor theo gia that, Birkin 28k khong con Common',
      'Loai: form chon used/standard/custom/rare + list Loc Loai, backend luu isRare/isSeed/isUsed',
    ],
  },
  'v13.49': {
    headline: 'HuyenBao v13.49 - Tra cuu vat pham + Dong tien + Hoa don & Thue',
    summary: 'v13.49: Admin tra cuu vat pham lay thong tin that + gia thi truong that + chon anh. Finance them bieu do dong tien 200 giao dich gan nhat. Hoa don thang + thue nam thanh hoa don phai bam Tra, qua han phat 2%/thang, dashboard canh bao khi co hoa don moi.',
    features: [
      'Admin Items: nut Tra cuu lay brand/story/gia thi truong that + 4-6 anh that de chon, admin duyet truoc khi Tao/Cap nhat',
      'Finance: bieu do dong tien 200 giao dich gan nhat theo loai tai san (tien vao/ra/rong) + khau hao/nam, giai thich lai lon ma tai san tut',
      'Hoa don: hoa don thang (living + upkeep + hoc phi + con + lai vay) + thue thu nhap nam thanh hoa don phai tra, han 14/30 ngay',
      'Tre han: +2%/thang phat cong don, khong tru tien tu dong nua',
      'Dashboard: PinZone canh bao khi co hoa don chua tra / qua han, bam de sang Finance tra',
      'Tai san tut: khau hao vat pham -10%/nam tro len, gia tri doanh nghiep tran +50% von, thue cuoi nam la 3 ly do chinh',
    ],
  },

  'v13.57': {
    headline: 'HuyenBao v13.57 - PinZone gon + Assets chart + Tab scroll',
    summary: 'v13.57: PinZone gon chi con hop do: bill banner + ten/tuoi + chip tien. Assets them mini chart lich su + tab bar scroll ngang khong tran 2 ben.',
    features: [
      'PinZone: chi giu bill banner + ten/tuoi + chip tien, bo donut/tong tai san/thu nhap nam/ngu/quick actions ra Finance/Overview',
      'Assets: mini chart lich su tai san + tab bar scroll ngang, nut gon khong tran',
      'Finance: bill Pay la nut that noi bat, so ngay 2 so thap phan, am do / duong xanh',
    ],
  },
  'v13.58': {
    headline: 'HuyenBao v13.58 - PinZone chi con hop do',
    summary: 'v13.58: PinZone chi con bill banner + ten/tuoi + chip tien + ngay noi bat + canh bao quan trong. Donut/tong tai san/thu nhap nam/ngu/quick actions/age track doi ra Finance/Overview. Nut Gigs/Travel/More gon 1 hang cuon ngang.',
    features: [
      'PinZone: xoa chip Net Worth + Income, xoa donut/bar/sleep/age track',
      'PinZone: ngay thanh pin-date noi bat, warns thanh pin-important',
      'PinZone: Gigs/Travel/More gon 1 hang, khong tran 2 ben',
    ],
  },
  'v13.59': {
    headline: 'HuyenBao v13.59 - PinZone them Net Worth',
    summary: 'v13.59: PinZone bo chip level trung, them Net Worth + Thu nhap/nam + Tien gui ngan hang vao cho trong hang chip.',
    features: [
      'PinZone: bo chip level (da co o tren)',
      'PinZone: them chip Net Worth + Income/nam + Bank dep',
      'PinZone: hang chip gon, khong tran',
    ],
  },
  'v13.60': {
    headline: 'HuyenBao v13.60 - Finance co bieu do dong tien',
    summary: 'v13.60: Finance them bieu do duong cong don rong van hanh theo tung giao dich + bang chi tiet 30 giao dich gan nhat (loai/kind/tien vao/tien ra).',
    features: [
      'Finance: bieu do cong don rong van hanh, diem thap nhat/cao nhat/ket',
      'Finance: bang chi tiet 30 giao dich van hanh gan nhat',
      'Finance: giu nguyen tach van hanh vs dau tu',
    ],
  },
  'v13.61': {
    headline: 'HuyenBao v13.61 - Bang giao dich them cot Ngay',
    summary: 'v13.61: Bang 30 giao dich van hanh gan nhat them cot Ngay (doi tu tx.day ra ngay that, neu khong co thi hien —).',
    features: [
      'Finance: bang 30 giao dich them cot Ngay',
      'Finance: ngay doi tu tx.day theo lich game',
    ],
  },
  'v13.62': {
    headline: 'HuyenBao v13.62 - Assets khong bi che nut',
    summary: 'v13.62: Tang padding-bottom wrap len 140px de nut Auction/List/Sell khong bi bottom nav che. Mini chart hien du tat ca nhom nen tong khop. Tnav them padding-right de nut cuoi khong bi cat.',
    features: [
      'Assets: wrap padding-bottom 140px, nut cuoi khong bi che',
      'Assets: mini chart hien du tat ca nhom, tong khop',
      'Assets: tnav padding-right 16px, nut Grails khong bi cat',
    ],
  },
  'v13.63': {
    headline: 'HuyenBao v13.63 - Mini chart tong dung, khong dem trung',
    summary: 'v13.63: Tong tai san = so mon dang so huu (own), thanh bar chi chia theo BDS/Cao cap/Binh dan. Auction/Hiem/Workshop chi la trang thai, khong cong vao tong nua.',
    features: [
      'Assets: tong = own, khong dem trung bds/lux/budget',
      'Assets: bar chi 3 nhom phan hoach, cong lai dung bang own',
      'Assets: auction/rare/workshop hien dang trang thai',
    ],
  },
  'v13.64': {
    headline: 'HuyenBao v13.64 - Nut Tra hoa don len tren cung',
    summary: 'v13.64: Khoi Hoa don o Finance doi len dau tab, khong can cuon qua chart. PinZone: banner hoa don o dau hop do them nut Tra ngay tra truc tiep hoa don som nhat.',
    features: [
      'Finance: khoi Hoa don len dau tab',
      'PinZone: banner hoa don them nut Tra ngay',
      'PinZone: nut Tra ngay uu tien hoa don qua han',
    ],
  },
  'v13.65': {
    headline: 'HuyenBao v13.65 - Thong bao chay chu trong PinZone',
    summary: 'v13.65: Popup toast doi vao o trong ben phai PinZone lam chu chay, moi thong bao 10s, het thi lay cai tiep theo trong hang cho. Khong con popup che man hinh.',
    features: [
      'PinZone: ticker chu chay o trong ben phai hang chip tien',
      'Thong bao: moi cai 10s, hang cho giu nguyen cua useGameController',
      'Bo popup #ttoast cu che man hinh',
    ],
  },
  'v13.66': {
    headline: 'HuyenBao v13.66 - Thuê trợ lý lo hoá đơn, thuế, kinh doanh',
    summary: 'v13.66: Thuê Trợ lý hoá đơn / Kế toán thuế / Giám đốc kinh doanh. Tự trả hoá đơn đúng hạn, tự nộp thuế năm, giám đốc +mood chi nhánh mỗi tháng. Bật/tắt từng việc, sa thải bất cứ lúc nào.',
    features: [
      'Thuê trợ lý: Trợ lý hoá đơn, Kế toán thuế, Giám đốc kinh doanh',
      'Tự trả hoá đơn tháng + tự nộp thuế năm, tránh phạt +2%/tháng',
      'Giám đốc: +mood chi nhánh mỗi tháng, giảm nguy cơ đóng cửa',
      'Bật/tắt từng việc, lương trừ ngày 1, sa thải bất cứ lúc nào',
    ],
  },
  'v13.67': {
    headline: 'HuyenBao v13.67 - Lookup tra cuu item chinh xac hon',
    summary: 'v13.67: Lookup het bia gia - gia chi chap nhan khi co trong snippet web, lech qua xa thi lay median snippet. Query search chinh xac hon, phan loai du 16 loai, anh khong con lac sang item khac.',
    features: [
      'Lookup: gia phai co trong snippet web, khong doan gia',
      'Lookup: query ten item + specs/review/official chinh xac hon',
      'Lookup: phan loai du Sport bike / Audio / Camera / Classic car / Suit',
      'Lookup: anh chi tim dung ten item, khong them car/bag gay nham',
    ],
  },
  'v13.68': {
    headline: 'HuyenBao v13.68 - Lookup het bia specs + het anh lac',
    summary: 'v13.68: Specs chi giu khi co tu khoa trong snippet web, bo fallback anh Wikimedia, anh co title lac bi bo.',
    features: [
      'Lookup: specs phai co trong snippet web, khong tu bia thong so',
      'Lookup: bo fallback anh Wikimedia gay anh rung / mui tran',
      'Lookup: anh co title khong lien quan ten item thi bo',
    ],
  },
  'v13.69': {
    headline: 'HuyenBao v13.69 - Lookup anh lay tu Bing co verify title',
    summary: 'v13.69: Anh lay tu Bing truoc (verify title chua ten item), bo thu handbag/bag, z-ai xuong cuoi vi khong co title.',
    features: [
      'Lookup: anh Bing verify bang title, khong nhan anh lac',
      'Lookup: bo thu handbag/bag gay lac khi tim xe',
      'Lookup: z-ai xuong cuoi vi khong tra title de verify',
    ],
  },
  'v13.70': {
    headline: 'HuyenBao v13.70 - Lookup anh khong qua LLM, bo z-ai anh',
    summary: 'v13.70: Anh chi search thang Bing + Openverse co verify title, bo z-ai anh hay tra anh lac, sua regex Bing bat ca 2 thu tu t/murl.',
    features: [
      'Lookup: anh chi Bing + Openverse, verify title chua ten item',
      'Lookup: bo z-ai anh (khong co title, hay tra anh Flickr lac)',
      'Lookup: sua regex Bing bat ca truong hop t truoc murl',
    ],
  },
  'v13.71': {
    headline: 'HuyenBao v13.71 - Lookup anh siet title >=2 token + cam sai bien the',
    summary: 'v13.71: Anh chi nhan khi title khop >=2 token, query Gullwing ma title Roadster/Convertible thi loai.',
    features: [
      'Lookup: title anh phai khop >=2 token moi nhan',
      'Lookup: cam sai bien the Gullwing vs Roadster/Convertible',
      'Lookup: ap dung siet title cho ca Bing va Openverse',
    ],
  },
  'v13.72': {
    headline: 'HuyenBao v13.72 - Lookup sua parse Bing bi escape &quot;',
    summary: 'v13.72: Bing tra &quot;murl&quot; nen regex cu luon truot, decode &quot; truoc khi parse thi Bing moi tra duoc anh.',
    features: [
      'Lookup: decode &quot; &amp; truoc khi parse HTML Bing',
      'Lookup: Bing gio moi tra duoc anh co title verify',
    ],
  },
  'v13.73': {
    headline: 'HuyenBao v13.73 - Them o Prompt tra cuu sua tay duoc',
    summary: 'v13.73: Them o Prompt ngay cho Tra cuu, bam lan dau tu dien prompt mac dinh, admin sua prompt roi bam lai de tim theo prompt moi.',
    features: [
      'Admin: o Prompt tra cuu sua tay duoc ngay cho Tao vat pham',
      'Lookup: search web + anh theo prompt admin nhap, khong chi theo ten',
      'Lookup: prompt admin duoc dua vao chi dan LLM',
    ],
  },
  'v13.74': {
    headline: 'HuyenBao v13.74 - Them o Prompt vao /admin (admin.html)',
    summary: 'v13.74: O Prompt tra cuu nam dung trong /admin (admin.html), khong phai /ads. Bam Tra cuu tu dien prompt mac dinh, sua roi bam lai.',
    features: [
      'Admin (/admin): them o Prompt tra cuu sua tay duoc',
      'Admin: prompt duoc gui kem len API lookup',
    ],
  },
  'v13.75': {
    headline: 'HuyenBao v13.75 - Lookup prompt in English',
    summary: 'v13.75: Lookup prompt box, placeholder and default prompt in /admin switched to English.',
    features: [
      'Admin (/admin): lookup prompt label + placeholder in English',
      'Lookup: default prompt sent to API in English',
    ],
  },
  'v13.76': {
    headline: 'HuyenBao v13.76 - Lookup prompt is instruction only, story in English',
    summary: 'v13.76: Prompt no longer used as image/web search query (it returned wolf wallpapers), story template switched to English.',
    features: [
      'Lookup: web + image search use item name only, prompt is LLM instruction only',
      'Lookup: story/description in English, not Vietnamese',
    ],
  },
};
