# MOGUL 🏙️

**MOGUL** (trước đây là *Tycoon Life*) — game mô phỏng cuộc đời: bắt đầu ở tuổi 18 trong **chính thời đại lịch sử của bạn** (năm sinh + 18), đi làm, học hành, xây chuỗi kinh doanh khắp các vùng, cho nhà máy ăn từ trang trại của chính mình, lướt sóng chứng khoán, nổi tiếng trên mạng xã hội, nộp thuế, làm từ thiện — và cuối đời, đưa đế chế của bạn **lên vũ trụ** 🚀.

▶ **Chơi ngay:** <https://huyenbao.com/> *(miền chính thức)* · <https://duole3383.github.io/tycoon-life/> *(phương án dự phòng — tự chuyển hướng)*

📱 **Cài lên điện thoại:** mở huyenbao.com trên Chrome/Safari → “Thêm vào Màn hình chính” — MOGUL chạy như một ứng dụng riêng (PWA), không cần cửa hàng ứng dụng.

| | |
|---|---|
| 🌐 Ngôn ngữ | **English · Tiếng Việt · 中文** — chọn ngay trong popup chào mừng, đổi mọi lúc trên header |
| 🌙 Giao diện | **Dark** (mặc định) & **Light** — nút ☀/☾ trên header, nhớ lựa chọn của bạn |
| 💻 Công nghệ | Next.js 16 (App Router, TypeScript) · React 19 · Tailwind 4 · static export cho GitHub Pages · **chỉ dùng npm, không Bun** |
| 🤖 AI | Bộ máy truyện "AI tiên tri" (LLM khi tự host, engine cục bộ khi chạy tĩnh) + ảnh phong cách sinh bởi AI |

---

## Mục lục

1. [Bắt đầu trong 2 phút](#bắt-đầu-trong-2-phút)
2. [Thời gian & vòng đời](#thời-gian--vòng-đời)
3. [Hướng dẫn chi tiết 14 tab (6 nhóm)](#hướng-dẫn-chi-tiết-14-tab-6-nhóm)
4. [Sự kiện đời người & dòng thời gian lịch sử](#sự-kiện-đời-người--dòng-thời-gian-lịch-sử)
5. [✨ AI — những gì khác biệt nhờ bổ sung AI](#-ai--những-gì-khác-biệt-nhờ-bổ-sung-ai)
6. [XP & Level](#xp--level)
7. [🏆 Thành tựu](#-thành-tựu)
8. [Chiến lược theo giai đoạn](#chiến-lược-theo-giai-đoạn)
9. [Bảng công thức nhanh](#bảng-công-thức-nhanh)
10. [Chạy & triển khai bằng npm](#chạy--triển-khai-bằng-npm)
11. [Kiến trúc mã nguồn](#kiến-trúc-mã-nguồn)
12. [Lưu trữ & kiểm thử](#lưu-trữ--kiểm-thử)
13. [Lịch sử phiên bản](#lịch-sử-phiên-bản)

## Cập nhật tính năng và cân bằng

- Vừa học vừa làm được; lương công việc toàn thời gian còn 60% khi đang học.
  Có thể học đồng thời hai chương trình ở các ngành khác nhau. Mỗi bằng hoặc
  chứng chỉ có tiến độ và học phí riêng; một số nghề mới cần kết hợp bằng cấp
  liên ngành. Có thể làm một công việc toàn thời gian cùng một việc bán thời gian.
- Chọn ngủ 4–10 giờ mỗi ngày: ngủ ít giúp học nhanh hơn nhưng làm sức khỏe
  suy giảm nhanh hơn; ngủ trên 8 giờ giúp bảo vệ sức khỏe. Timeline ở Home ghi
  lại nếp sinh hoạt và hành động trong 45 ngày game gần nhất.
- Chọn tôn giáo hoặc thế giới quan lúc tạo nhân vật; tab Tâm linh hiển thị
  gợi ý phù hợp và một hoạt động nhỏ. Có thể quyên góp từ thiện ở Ngân hàng;
  hoạt động Phật giáo về động vật hướng tới cứu hộ an toàn, không thả loài ngoại lai.
- Home và tab Sức khoẻ cảnh báo khi sức khoẻ thấp, ngủ thiếu hoặc cần chú ý
  chế độ ăn; gợi ý nghỉ ngơi, ăn lành mạnh, tập luyện và khám sức khoẻ.
- Thu nhập gig tăng theo căn bậc hai của thu nhập năm; tổng hệ số thu nhập
  kinh doanh có trần ×3. Tài sản kinh doanh, nông trại, nhà máy và vũ trụ đều
  được khấu hao theo năm game.
- Dữ liệu lưu có `schemaVersion` để migrate; API truyện dùng system role,
  tái sử dụng client và giới hạn 10 request/phút/IP.

---

## Bắt đầu trong 2 phút

Popup chào mừng đầu tiên là nơi bạn "đóng vai" cha mẹ nhân vật của chính mình:

| Mục | Ý nghĩa |
|---|---|
| **Tên** | Tối đa 24 ký tự. |
| **Năm sinh** | 1900 → (năm hiện tại − 18). Năm sinh quyết định **thời đại lịch sử** bạn chơi: sinh 1952 → lớn lên lúc 1970 (khủng hoảng dầu mỏ), sinh 2008 → mở mắt vào kỷ nguyên AI. Ngày bắt đầu: **1 tháng 9, năm sinh + 18**, tuổi 18. |
| **Quốc gia** | 12 nước (Vietnam, United States, United Kingdom, Japan, South Korea, France, Germany, Brazil, Nigeria, India, Australia, Canada) — quyết định bảng xếp hạng quốc gia của bạn. |
| **Sở thích** | Chọn tối đa **3/11** (xe cộ, công nghệ, thời trang, tiền bạc, thể thao, nghệ thuật, khoa học, giúp người, du lịch, ẩm thực, dạy học). Sở thích + tài năng quyết định **ngành sở trường** → giảm 20% học phí ngành đó. Chọn *Tiền bạc & thị trường* → khởi đầu với **$5,000**. |
| **Tài năng** | Chọn tối đa **2/6** (toán logic, sáng tạo, giao tiếp, cơ khí, chăm sóc, kỷ luật). *Kỷ luật & focus* → học nhanh hơn 10%; *Thể thao/cơ khí* → đi làm kiếm nhiều hơn 15–25%. |
| **Ngôn ngữ** | EN / VI / 中文 — chọn ngay trong popup này, không cần vào settings. |

Sau khi bấm bắt đầu, nhật ký dòng đầu tiên ghi rõ bạn vừa tròn 18 trong thời đại nào. Mục tiêu: **xây gia tài lớn nhất có thể trước 90 tuổi** (hoặc… giữ sức khoẻ để sống tới đó).

---

## Thời gian & vòng đời

- **20 giây thực = 1 ngày trong game** (khi tab đang mở; chuyển sang tab khác thì đồng hồ tạm dừng, không mất thời gian).
- Tức là ~10 phút cho 1 tháng, **~2 giờ thực cho 1 năm game**. Một trọn đời 72 năm ≈ 145 giờ — game **tự lưu liên tục** vào máy bạn (localStorage), chơi nhiều phiên thoải mái.
- Sự kiện thời gian: mỗi **14 ngày** nhận lương; ngày **1 hàng tháng** tổng kết kinh doanh + hoá đơn; ngày **1/1** nộp thuế + sự kiện lịch sử; mỗi khi **sinh nhật** có sự kiện đời người.
- **65 tuổi**: nghỉ hưu, lương dừng, nhận lương hưu $18,000/năm.
- **90 tuổi**: kết thúc — hoặc sớm hơn nếu **sức khoẻ về 0** (đúng, bạn có thể chết vì bỏ sức khoẻ).
- Kết thúc chia 5 hạng theo tài sản ròng: *Humble beginnings* (<$1M) → *Comfortable life* (<$10M) → *Tycoon* (<$100M) → *Billionaire* (<$1B) → **Legend** (≥$1B).

---

## Hướng dẫn chi tiết 14 tab (6 nhóm)

Thanh điều hướng 2 cấp sắp xếp như một **làn đời**: Đời sống → Tri thức → Đế chế → Tài sản → Quan hệ → Thế giới. Mỗi nhóm nhớ tab con bạn dùng lần cuối.

### 🧬 Nhóm ĐỜI SỐNG

#### 🏠 Home — trung tâm hành động
- **Nút "Work" (click kiếm tiền)**: mỗi click = `max($25, $30 + 1% thu nhập năm)`. Hữu ích năm 18, vô dụng năm 40 — đúng đời.
- **🏆 Thành tựu**: mục gập cuối Home ghi nhận 22 cột mốc của một kiếp (xem bảng ở mục Thành tựu dưới đây). Mở khoá thì có thông báo riêng.
- **6 việc nhanh (gigs)** — nguồn tiền sớm, mỗi việc có hồi chiêu riêng (đơn vị: ngày game):

| Việc | Thu nhập gốc | Hồi chiêu | Điều kiện |
|---|---|---|---|
| ▶ Xem quảng cáo | ~$15 | không có | — (+4 XP) |
| 🛵 Giao hàng | ~$60 | 1 ngày | — |
| 💻 Freelance | ~$150 | 2 ngày | — |
| 🎓 Gia sư | ~$130 | 2 ngày | 1 bằng bất kỳ |
| 📣 Bài đăng tài trợ | ~$80 **+ $0.02/follower** | 4 ngày | 1,000 followers |
| ☎ Tư vấn | ~$550 | 6 ngày | BBA |

  Thu nhập thật = `(gốc + 0.05 × √thu nhập năm)` nhân level × danh tiếng × sức khoẻ (×1.15 nếu thích thể thao hoặc tài năng cơ khí); bài đăng tài trợ còn cộng tiền theo follower. Mỗi việc (trừ xem quảng cáo) có 4% cơ hội +1 fame.
- **Nút 🤖 AI tiên tri** — bấm để AI viết một bước ngoặt mới cho cuộc đời bạn (chi tiết ở [mục AI](#-ai--những-gì-khác-biệt-nhờ-bổ-sung-ai)).
- **Nhật ký** 80 dòng gần nhất + các thanh wellbeing (sức khoẻ, tâm linh, karma, fame, level).
- **Giờ ngủ & timeline** — chọn ngủ 4–10 giờ/ngày; Home hiển thị nếp sinh hoạt và hành động trong tối đa 45 ngày game gần nhất.

#### ❤️ Health — sức khoẻ là tài sản
Bắt đầu 92/100. Suy giảm mỗi ngày theo tuổi (±25% random): **<30 tuổi: 0.015/ngày · 30–44: 0.04 · 45–59: 0.08 · 60–74: 0.13 · 75+: 0.18** — tức ~5.5 → 66 điểm/năm nếu không làm gì.

| Hành động | Giá | Hồi chiêu | Hiệu quả |
|---|---|---|---|
| 🏋️ Tập gym | $80 | 2 ngày | +6 HP, +4 XP |
| 🩺 Khám tổng quát | $600 | 30 ngày | +15 HP, +6 XP |
| 🥗 Chế độ ăn lành mạnh | $6/ngày (~$2,190/năm) | bật/tắt | suy giảm sức khoẻ **×0.55** |

- **Sức khoẻ thấp = nghèo hơn**: thu nhập từ việc nhanh nhân `0.7 + 0.3×HP/100` (HP 20 → chỉ nhận 76% tiền).
- Home và tab Sức khoẻ sẽ nhắc khi sức khoẻ xuống thấp, lịch ngủ dưới 7 giờ
  hoặc cần chú ý chế độ ăn; gợi ý nghỉ ngơi, ăn lành mạnh, tập luyện và khám
  sức khoẻ.
- Tâm linh ≥70 còn **chậm lão hoá thêm 15%**.
- HP về 0 → **kết thúc run ngay lập tức**. Dưới 15 HP, game nhắc bạn mỗi tháng.
- Sự kiện *Bệnh hiểm nghèo* (10%/năm): mổ tư $30,000 (+20 HP) · bệnh viện công −$5,000 (+5 HP, chờ hàng tháng trời) · nghỉ nhà (−10 HP, mất lương).

#### 🧘 Mind & spirit — tâm linh
Bắt đầu 18/100. Ba hành động:

| Hành động | Giá | Hồi chiêu | Hiệu quả |
|---|---|---|---|
| 🧘 Thiền | miễn phí | 1 ngày | +4 tâm linh, +1 karma, +3 XP |
| 🛕 Dâng lễ chùa | $500 | 3 ngày | +6 tâm linh, +5 karma, +5 XP |
| 🌄 Retreat tĩnh lặng | $8,000 | 60 ngày | +25 tâm linh, +15 karma, +5 HP, +30 XP |

- **Tâm linh ≥70**: thu nhập kinh doanh **×1.10** và lão hoá chậm 15%.
- **Tâm linh ≥80**: thu nhập vũ trụ **×1.25** (cosmic alignment).
- **Karma** tăng từ thiện, đám cưới, lễ chùa; giảm khi ly hôn, tang gia. Đời sống tinh thần bị sự kiện thật tác động: đám cưới +4/+5, sinh con +3, ly hôn −5..−8, tang cha/mẹ −10..−12, burnout −6.
- Chọn tôn giáo hoặc thế giới quan ngay khi tạo nhân vật; tab này đưa ra gợi ý
  tương ứng. Có hoạt động nhỏ mỗi 7 ngày; gợi ý phóng sinh được thể hiện bằng
  hỗ trợ cứu hộ động vật an toàn, không thả loài ngoại lai. Quyên góp từ thiện
  luôn có ở tab Ngân hàng.

### 📚 Nhóm TRI THỨC

#### 🎓 Education — học vấn & giấy phép (tab riêng, tách khỏi nghề)
5 ngành, mỗi ngành nhiều cấp độ (học xong cấp này mới học cấp tiếp):

| Ngành | Cấp độ | Thời gian | Học phí | Tuổi tối đa |
|---|---|---|---|---|
| Business | BBA → MBA | 4n / 2n | $5,000 / $10,000 | 30 / 36 |
| Engineering | B.Eng → M.Eng | 4n / 2n | $6,000 / $12,000 | 30 / 36 |
| Medicine | Pre-med → MD | 4n / 4n | $5,000 / $30,000 | 30 / 36 |
| Science | B.Sc → M.Sc → PhD | 4n / 2n / 4n | $5,000 / $10,000 / miễn | 30 / 36 / 40 |
| Arts | B.A → M.A | 4n / 2n | $4,000 / $8,000 | 30 / 36 |

- Ngành **sở trường** (từ sở thích + tài năng): học phí **−20%**; tài năng *focus*: thời gian **−10%**.
- Có thể học đồng thời hai chương trình ở các ngành khác nhau; mỗi chương trình
  có học phí và tiến độ riêng. Có thể vừa học vừa làm (lương toàn thời gian còn
  60%). Ngành không phải sở trường mất thêm 25% thời gian.
- Ngủ ít hơn 8 giờ giúp tiến độ học nhanh hơn nhưng làm sức khỏe suy giảm nhanh hơn; ngủ trên 8 giờ giúp bảo vệ sức khỏe.
- Giấy phép lái xe: mô tô $350 (30 ngày) · ô tô $600 (60) · thuyền $1,500 (90) · **phi công tư nhân $20,000 (365 ngày)** — khoá mở nghề phi công thương mại $200k/năm.
- Bằng Business còn cho **+15% thu nhập kinh doanh mỗi cấp** (MBA = +30%).

#### 💼 Jobs — nghề nghiệp
18 nghề, lương/năm, trả mỗi 14 ngày (≈ lương/26 kỳ). Có thể giữ một nghề toàn
thời gian cùng một nghề bán thời gian:

| Nghề | Lương/năm | Yêu cầu |
|---|---|---|
| Thu ngân part-time | $11,000 | — |
| Shipper | $18,000 | bằng lái ô tô |
| Nhân viên văn phòng | $32,000 | 1 bằng bất kỳ |
| Giáo viên | $48,000 | 1 bằng bất kỳ |
| Kế toán | $70,000 | BBA |
| Điều dưỡng | $62,000 | B.Sc |
| Quản lý dự án | $95,000 | BBA, 26+ |
| Kỹ sư phần mềm | $110,000 | B.Eng, 22+ |
| Trưởng nhóm kỹ thuật | $135,000 | M.Eng, 26+ |
| Nghiên cứu viên | $80,000 | M.Sc |
| Nhà khoa học | $140,000 | PhD |
| Giám đốc marketing | $150,000 | MBA, 28+ |
| Giám đốc điều hành | $220,000 | MBA, 30+ |
| Phi công thương mại | $200,000 | bằng phi công, 21+ |
| Bác sĩ phẫu thuật | $280,000 | MD |
| Thiết kế sản phẩm | $96,000 | Kỹ thuật + Nghệ thuật |
| Quản lý y tế | $135,000 | Kinh doanh + Y khoa |
| Nghiên cứu công nghệ sinh học | $170,000 | Khoa học cấp 2 + Y khoa |

- Nghỉ hưu ở 65 — sau đó kế sinh nhai là lương hưu + doanh nghiệp + đầu tư.
- Event *Sa thải* (chỉ nghề full-time): nhận trợ cấp 3 tháng lương, hoặc chống lại 50/50.

### 🏰 Nhóm ĐẾ CHẾ

#### 🏪 Business — chuỗi kinh doanh theo vùng (trái tim game)
10 dòng kinh doanh. **Mỗi lần mua = mở thêm 1 chi nhánh tại một vùng có tên thật** (Old Town walking street, University quarter, Harbor promenade…) và giá chi nhánh kế tiếp **×1.35**:

| Kinh doanh | Giá mở | Doanh thu/năm | Điều kiện | Ngành |
|---|---|---|---|---|
| ☕ Quán cà phê | $800 | $1,500 | — | Food |
| 🏪 Tiệm tiện lợi | $8,000 | $12,000 | BBA | Retail |
| 🌾 Trang trại hữu cơ | $60,000 | $90,000 | BBA | Agriculture |
| 🏭 Nhà máy | $90,000 | $160,000 | B.Eng | Industry |
| 🛍️ Chuỗi bán lẻ | $900,000 | $1,500,000 | BBA | Retail |
| 🏨 Khách sạn boutique | $2,500,000 | $3,500,000 | MBA | Tourism |
| 💻 Studio phần mềm | $6,000,000 | $9,000,000 | B.Eng | Tech |
| 🏦 Ngân hàng tư nhân | $12,000,000 | $22,000,000 | MBA | Finance |
| 🎬 Hãng phim | $40,000,000 | $60,000,000 | B.A + BBA | Media |
| 🏢 Tập đoàn | $150,000,000 | $280,000,000 | MBA | Diversified |

- **Mỗi chi nhánh có "tâm trạng" riêng**, dao động mỗi tháng, kẹp trong 0.25–1.7: ≥1.4 là *bùng nổ*, ≤0.5 là *lỗ*. Cùng một quán cà phê, chi nhánh phố cổ có thể đang in tiền trong khi chi nhánh sân bay khánh kiệt.
- **Hệ số vùng** (theo thứ tự mở): 1.25 / 1.15 / 1.30 / **0.85** / 1.00 / 1.05 — chi nhánh thứ 4 thường yếu nhất.
- Lợi nhuận chi nhánh/năm = `doanhThu × hệSốVùng × tâmTrạng − giáMở/24`.
- Toàn bộ thu nhập kinh doanh nhân chồng nhiều lớp: câu lạc bộ × bằng Business × fame × thời đại × level × tâm linh. Ví dụ quán cà phê đầu tiên: ≈ $1,842/năm với $800 vốn — về sau với đủ multiplier có thể gấp hàng chục lần.

#### 🌱⇄🏭 Chuỗi cung ứng nông trại ⇄ nhà máy (nằm trong tab Business)
- **6 dòng trang trại** mở theo năm lịch sử: cây lương thực (1900, $20k→$30k/năm) · chăn nuôi bò sữa (1920, $60k→$80k) · vườn cây & cà phê (1935, $120k→$150k) · thuỷ sản (1960, $250k→$300k) · nhà kính thuỷ canh (1985, $600k→$700k) · điện mặt trời nông nghiệp (2010, $1.5M→$2M). Yêu cầu: sở hữu ≥1 chi nhánh trang trại.
- **6 dòng nhà máy**: đóng hộp (cần trang trại — **nhận nguyên liệu từ farm, +30% doanh thu**, $50k→$70k) · dệt may (1920, $90k→$110k) · lắp ráp điện gia dụng (1960, $400k→$500k) · nhà máy pin mặt trời (2000, $1.2M→$1.5M) · **lắp ráp xe điện (2010, $5M→$6.5M, cần dây chuyền lắp ráp trước đó)** · Fab bán dẫn (2020, $20M→$30M).

#### 🚀 Space — mặt trận vũ trụ (tab riêng)
Từ **level 6** và đúng thời đại, năm dự án khai trường:

| Dự án | Level | Từ năm | Vốn | Thu/năm | ROI |
|---|---|---|---|---|---|
| 📡 Cho thuê vệ tinh | 6 | 2000 | $1.5M | $480k | ~3.1 năm |
| 🛰 Du lịch quỹ đạo | 10 | 2025 | $15M | $4.2M | ~3.6 năm |
| ☄️ Khoan thiên thạch | 14 | 2040 | $80M | $22M | ~3.6 năm |
| 🌕 Helium-3 Mặt Trăng | 18 | 2055 | $300M | $75M | ~4 năm |
| 🔴 Hậu cần thuộc địa Sao Hoả | 22 | 2070 | $900M | $200M | ~4.5 năm |

Khai trương: +5 fame, +200 XP, tự động đăng bài khoe lên mạng xã hội. Tâm linh ≥80 nhân thêm ×1.25. Đây là nguồn thu "chính thống" bổ sung cho nghề & kinh doanh cuối game.

### 💰 Nhóm TÀI SẢN

#### 📈 Stocks — chứng khoán
9 mã, mua/bán **theo số lượng nhập tay**, nút **BÁN màu đỏ / MUA màu xanh**, kèm biểu đồ sparkline:

| Mã | Công ty | Giá gốc | Đặc trưng |
|---|---|---|---|
| TECH | Alpha Tech | $100 | tăng mạnh thời kỳ công nghệ |
| BANK | Beta Bank | $60 | sập tệ nhất 2008 |
| OIL | Gamma Oil | $40 | bùng nổ khủng hoảng dầu 1973/1979 |
| COIN | Delta Crypto | $20 | rủi ro cao nhất |
| PHARMA | Helix Pharma | $85 | bùng nổ đại dịch 2020 |
| RETAIL | Mega Retail | $55 | ổn định |
| SOLAR | Solar Dynamics | $35 | cất cánh thời kỳ xanh 2030 |
| AI | NeuroAI | $150 | bùng nổ 2022 |
| SKY | Sky Airlines | $30 | nhạy cảm khủng hoảng |

Giá biến động theo **các cú sốc lịch sử ngày 1/1** và sự kiện đời người (crash −40% → chọn bán tháo hay ôm đợi phục hồi ×1.6; dip thường niên −10%). Sinh sớm vào 1929/1987/2008… sẽ hiểu thế nào là vòng tuần hoàn.

#### 🏦 Bank — ngân hàng, thuế & từ thiện (tab riêng)
- **Tiết kiệm**: lãi 2%/năm, cộng hàng tháng. (Năm 1931 ngân hàng sập → mất 30% tiền gửi!)
- **Vay**: tối đa 50% tài sản ròng, lãi 6%/năm, cộng dư nợ hàng tháng — đòn bẩy mở chi nhánh sớm.
- **Thuế thu nhập lũy tiến**, tính mỗi 1/1 trên toàn bộ thu nhập năm trước: **$20k đầu: 0% · tới $60k: 15% · tới $150k: 25% · phần còn lại: 35%**. Ví dụ: thu $60k → nộp $6,000; thu $500k → nộp $151,000. Tránh thuế hợp pháp duy nhất: làm từ thiện (ít nhất thì… cảm thấy tốt).
- **Hoá đơn hàng tháng**: chi phí sống `$3,000×1.03^(tuổi−18)`/năm ($3k ở 18 tuổi → $25k ở 90) + bảo trì tài sản 2%/năm + học phí + $400/tháng/con + lãi vay.
- **Từ thiện**: quyên góp → **+fame** (+1/+2/+5 theo mệnh giá $10k/$100k) và **+karma** (+1/+3/+8), đăng bài nếu ≥$10k. Fame bơm thu nhập kinh doanh (mỗi điểm fame +0.2%) và hút followers.

#### 🛒 Shop — cửa hàng (10 nhóm, 41 món, popup theo nhóm)
Xe máy thể thao (KTM → Ducati Panigale V4 $30k) · Điện thoại (Pixel/iPhone/Galaxy → Vertu vàng $15k) · Đồng hồ (G-Shock $150 → **Patek Philippe Nautilus $35k**) · Trang sức (Tiffany/Cartier/Bulgari) · Vest (Zara → Brioni $4k) · Ô tô (Camry $30k → Rolls-Royce Ghost $350k) · Bất động sản (condo $300k → **đảo riêng $30M**) · Du thuyền (Azimut $8M, Sunseeker $12M) · Máy bay riêng (Cessna $10M, Gulfstream G650 $70M) · Nghệ thuật ($50k → tranh gốc $40M).

- **Tài sản tăng giá**: Rolex +5%/năm, Patek +7%, nghệ thuật +6–7%, bất động sản +3–5%, đảo riêng +5%.
- **Tài sản mất giá**: điện thoại −35%/năm, xe máy −12–15%, siêu xe −8–13%.
- Bán lại = giá trị hiện tại − 3% phí. Bảo trì 2%/giá trị mỗi năm. Món ≥$10k tự động lên bài social; đồ xa xỉ (lux cao) +fame. Chiến thuật thật: mua Patek không chỉ để khoe — nó là tài khoản tiết kiệm có đế.

### 🤝 Nhóm QUAN HỆ

#### 📱 Social — mạng xã hội & nổi tiếng
- Bài đăng tự động theo sự kiện đời thực: mở chi nhánh, cưới, lên level tròn 5, từ thiện, mua đồ ≥$10k, khai trương vũ trụ… **Likes** = `(followers×5% + fame×3 + 5)×(0.4–1.6)×boost`, và rút ra ~30% likes thành followers mới.
- **Tăng follower tự nhiên mỗi tháng** = `(fame×14 + √followers×8)×(0.4–1.6)`, trần 200 triệu. Fame là nhiên liệu: fame 10 → +56–224/tháng; fame 50 với 100k followers → +1,292–5,168/tháng.
- **Dấu xanh verified ở 100k followers** (+40 XP).
- **Doanh thu quảng cáo hàng năm = 6% số follower** (cần ≥500): 100k followers → $6,000/năm, 1M → $60,000/năm, cộng thẳng vào thu nhập.
- Gig *bài tài trợ* (cần 1,000 followers) ăn thêm $0.02/follower mỗi lần — 50k followers = +$1,000/lần đăng.

#### 🥂 Clubs — câu lạc bộ elite
| CLB | Tài sản ròng tối thiểu | Phí vào | Nhân kinh doanh |
|---|---|---|---|
| Royal Golf Club | $500k | $50k | ×1.10 |
| Wine Connoisseurs | $2M | $150k | ×1.15 |
| Supercar Club | $5M | $600k | ×1.25 |
| Polo & Equestrian | $20M | $1.5M | ×1.35 |
| Yacht Club | $100M | $8M | ×1.50 |
| Sky Lounge Penthouse | $300M | $20M | ×1.70 |
| 🌟 **Tự sáng lập CLB riêng** | $1M (tài sản) | $250k | ×1.20 (tối đa 200 thành viên) |

Nhân với toàn bộ thu nhập kinh doanh — một chiếc thẻ Yacht Club đáng hơn rất nhiều lần phí vào.

### 🌍 Nhóm THẾ GIỚI

#### 🏆 Ranking — 4 bảng xếp hạng, 26 đối thủ mô phỏng
- **All**: top 15 giàu nhất (đối thủ giàu thêm ~12%/năm — không theo kịp là tụt hạng).
- **Young & rich**: dưới 35 tuổi & tài sản ≥$1M — bảng danh giá của các Minh Nguyen 26 tuổi.
- **Industry leaders**: ai dẫn đầu mỗi ngành (Tech, Finance, Food…) và bạn đang đứng thứ mấy.
- **By nation**: dẫn đầu theo từng quốc gia — bảng dễ lên số 1 nhất nếu chọn nước ít đối thủ mạnh (Australia, Canada).

#### 🕸️ Links — bản đồ liên kết hệ thống (tab mới ở v9)
Sơ đồ SVG **13 nút × 16 mũi tên** chạy realtime với số liệu của chính bạn:
- **Nét liền = tác động trực tiếp**: học vấn→nghề, học vấn→kinh doanh, nghề→thu nhập, kinh doanh→thu nhập, vũ trụ→thu nhập, mạng xã hội→thu nhập, level→thu nhập, fame→kinh doanh, CLB→kinh doanh, từ thiện→fame.
- **Nét đứt = tác động gián tiếp**: bank→thu nhập, sức khoẻ→thu nhập, tâm linh→sức khoẻ/kinh doanh/vũ trụ, fame→mạng xã hội.
- Dưới sơ đồ là **bảng 20 công thức** hiển thị đúng con số hiện tại (×1.30 MBA, ×1.25 cosmic, −12 HP/năm…). Đây là tab để trả lời câu hỏi "nếu tôi tăng fame thì được gì?" mà không cần đoán.

---

## Sự kiện đời người & dòng thời gian lịch sử

### 16 sự kiện kịch bản (mỗi năm sinh nhật roll theo xác suất)

| Sự kiện | Tuổi | Xác suất | Điểm nhấn |
|---|---|---|---|
| 💵 Triệu đầu tiên | mọi tuổi | khi đạt $1M | cột mốc, 1 lần |
| 💘 Người đặc biệt | 20–35 | 30% | bắt đầu hẹn hò |
| 💍 Đám cưới | 24–42 | 35% | tiệc sang $40k (+5 tâm linh) hay ký tòa $2k |
| 👶 Tin vui bất ngờ | 25–42 | 25% | +1 con (tối đa 3), hoá đơn +$400/tháng/con |
| 💔 Ly hôn | 28–65 | 12% | chia 40% tiền mặt hoặc ra tòa $30k, 50/50 |
| 📉 Bị sa thải | 20–64 | 15% | trợ cấp 3 tháng hoặc chống lại |
| 🏥 Bệnh hiểm nghèo | 18–90 | 10% | 3 hướng điều trị |
| 🚀 Cơ hội startup | 22–55 | 20% | góp $50k: 40% nhận $150k, 60% mất trắng |
| 🎰 Trúng số | 18–90 | 4% | nhận $1M, hoặc $500k chia gia đình |
| 📉 Sụp thị trường | 26–80 | 10% | cổ phiếu −40% ngay lập tức, chọn bán/ôm |
| 🏚 Suy thoái | 25–75 | 10% | chỉ xảy ra khi có kinh doanh |
| 🕯 Tang gia | 40–90 | 8% | −10..−12 tâm linh |
| 🏎 Khủng hoảng tuổi trung niên | 42–58 | 12% | Porsche 911 $120k hay du lịch Nhật $20k |
| 🔞 Cháy nhà | 25–90 | 10% | cần sở hữu bất động sản |
| 😵 Burnout | 22–70 | 12% | khi HP <65: nghỉ $15k (+18 HP) hay cày tiếp (−14 HP) |
| 🛕 Tiếng gọi tĩnh lặng | 28–82 | 10% | tuần tu $2k: +15 tâm linh, +10 karma |

Cộng thêm **7 sự kiện cuối năm ngẫu nhiên** (60% cơ hội mỗi năm): thừa kế $3k–$40k, bài viral +$15k & +3 fame, tai nạn −$6k..−$14k, hoàn thuế +$2.5k, bị kiểm tra thuế −2% tiền mặt, thị trường nhích −10%, bị bạn bè kéo đi du lịch sang −$8k.

### 19 cú sốc lịch sử ngày 1/1 (ảnh hưởng trực tiếp vào tài chính)

| Năm | Sự kiện | Tác động |
|---|---|---|
| 1929 | Wall Street sụp đổ | cổ phiếu ×0.5 |
| 1931 | Ngân hàng phá sản toàn cầu | tiền gửi ×0.7 |
| 1939 | Chiến tranh bùng nổ | kinh doanh ×0.65 |
| 1941 | Kinh tế chiến tranh | kinh doanh ×1.3, nhà máy ×1.5 |
| 1945 | Chiến thắng & baby boom | kinh doanh ×1.2, +$1,000 |
| 1957 | Sputnik | TECH ×1.25 |
| 1969 | Đổ bộ Mặt Trăng | TECH ×1.4 |
| 1973 | Khủng hoảng dầu | OIL ×1.9, còn lại ×0.85 |
| 1979 | Cú sốc dầu 2 | OIL ×1.5, còn lại ×0.9 |
| 1987 | Black Monday | toàn thị trường ×0.72 |
| 1995 | Web thương mại hoá | TECH ×2 (bong bóng dot-com) |
| 2000 | Dot-com nổ tung | TECH ×0.45 |
| 2001 | 11/9 | ×0.85 |
| 2008 | Khủng hoảng tài chính | ×0.6, BANK ×0.5 |
| 2020 | COVID-19 | PHARMA ×1.6, ×0.75, kinh doanh ×0.7 |
| 2021 | Tiền chi kích | +$1,400 |
| 2022 | Bùng nổ AI | AI ×1.8 |
| 2030 | Bứt phá năng lượng Fusion | SOLAR ×1.7, OIL ×0.6 |
| 2040 | Thành phố đầu tiên trên Sao Hoả | TECH ×1.5, SKY ×1.6 |

Kèm theo mỗi năm là **tin thật lịch sử** đăng trong nhật ký (2010 động đất Haiti, 2011 tsunami Nhật Bản, 1969 Moon landing, 2022 AI boom…), và 15 **thời đại** đặt tên cho hành trình bạn (Roaring Twenties → Great Depression → Post-war boom → Dot-com boom → AI revolution → The far future 2050–2100).

---

## ✨ AI — những gì khác biệt nhờ bổ sung AI

Đây là phần **MOGUL khác hẳn bản life-sim cổ điển**. AI không phải sticker trang trí — nó tham gia thẳng vào lối chơi.

### 1. 🤖 Bộ máy truyện "AI tiên tri" (AI Story Oracle)
Nút **"Hỏi AI tiên tri một bước ngoặt"** nằm ngay tab Home. Mỗi lần bấm, AI **viết một sự kiện đời người hoàn toàn mới** — không có sẵn trong code:

- **May đo theo đúng hoàn cảnh của bạn**: năm lịch sử & thời đại, quốc gia, tuổi, tiền mặt, tài sản ròng, nghề nghiệp, danh sách doanh nghiệp, dự án vũ trụ, tình trạng gia đình, fame, level, followers. Cùng bấm nút đó, người sinh 1930 nghèo đang ship hàng sẽ gặp chuyện khác hẳn tỷ phú 60 tuổi ở "Crypto valley".
- **Chỉ dẫn truyện ngẫu nhiên từ 12 hướng**: bước ngoặt sự nghiệp, drama gia đình, cơ hội buôn gắn với công nghệ thời đại, của đến/của mất lạ lùng, fame & tai tiếng, sức khoẻ, kình địch tỷ phú, "mẹo" đầu tư, tình yêu đâm xé tham vọng, thiện nguyện, di cư/mở rộng địa bàn, và những cuộc gặp bí ẩn (món nợ 30 năm, lá thư không người gửi…).
- **Nhớ và không lặp**: 24 bước ngoặt gần nhất được gửi kèm yêu cầu (`avoidThesePremises`) — AI phải tránh premise đã dùng.
- **Hệ quả là thật**: mỗi lựa chọn có `cost` (tiền mất), `money` (tiền về), `fame` (±danh tiếng) — ghi vào nhật ký với nhãn "AI twist", và tự động lên một bài trên mạng xã hội. Kết quả lời kể (`out`) do AI viết, mỗi lần một văn phong.

### 2. Hai chế độ vận hành — AI chạy được ở cả hai nơi

| | **Bản trên GitHub Pages** (bạn đang chơi) | **Tự host** (`npm run dev` / `npm start`) |
|---|---|---|
| Bộ máy | Engine truyện cục bộ **16 template** trong `src/lib/story.ts` | **LLM thật** qua `POST /api/story` (z-ai-web-dev-sdk) |
| Tốc độ | Tức thì, offline, không cần key | Vài giây, chữ nghĩa hoàn toàn mới từng lần |
| Thông minh | Chọn template theo era/gia tài, đổi mệnh giá theo tài sản ròng, chặn lặp | Đúng theo prompt: nhắc 1 chi tiết cụ thể từ snapshot, tránh 24 premise cũ, JSON chặt |
| Khi lỗi | — | Tự động rơi về engine cục bộ → **không bao giờ treo game** |

Prompt hệ thống của LLM yêu cầu: đúng 1 sự kiện, bám thời đại, nhắc một chi tiết tài sản thật của người chơi, không sáo rỗng, trả về JSON chuẩn `{"title","text","choices":[{"l","cost","money","fame","out"}]}` với 2–3 lựa chọn đánh đổi khác nhau.

### 3. 🛡️ Van an toàn — AI không thể phá cân bằng game
Mọi sự kiện AI (từ LLM hoặc local) đều bị kẹp trước khi áp vào state:
- Chi phí tối đa **40% tài sản ròng**; tiền nhận tối đa **3× ngưỡng đó** (tức AI không thể cho bạn $1 tỷ khi bạn mới $100k, cũng không thể phá sản bạn);
- fame chỉ dao động **−10..+10**; tiêu đề ≤64 ký tự, nội dung ≤300, tối đa 3 lựa chọn; thiếu lựa chọn thì thay bằng mặc định "Face it".
- **Mô phỏng kinh tế 100% cục bộ & xác định**: giá cổ phiếu, thuế, lãi suất, mood chi nhánh, bảng xếp hạng không bao giờ do AI quyết — AI chỉ viết truyện, không đổi luật.

### 4. 🖼️ Ảnh phong cách sinh bởi AI
7 ảnh trong `public/img/` (hero thành phố, cà phê, nông trại, nhà máy, công nghệ, khách sạn, vũ trụ) — tông trung tính, đậm chất "tài liệu doanh nhân", thay cho icon màu mè của bản cũ (chính là phần đáp lại góp ý *loè loẹt quá*).

### 5. Trước / sau khi có AI — khác biệt trong một bảng

| | Bản cổ điển (không AI) | Bản có AI |
|---|---|---|
| Nguồn sự kiện | 16 sự kiện cứng + 7 sự kiện ngẫu nhiên | Vô hạn sự kiện viết mới từng lần |
| Bối cảnh | Theo độ tuổi | Theo tuổi **+ thời đại + quốc gia + tài sản + gia đình + followers** |
| Lặp lại | Lặp theo vòng xác suất | Nhớ 24 lần gần nhất, chủ động tránh |
| Số tiền trong sự kiện | Cố định ($50k là $50k) | Co giãn theo tài sản ròng của bạn |
| Kết cục chữ nghĩa | 1–2 câu mẫu | Văn phong riêng mỗi lần (khi chạy LLM) |
| Chạy offline | ✓ | ✓ (engine cục bộ) + LLM khi có server, lỗi thì fallback |
| Ảnh minh hoạ | Icon SVG | Ảnh chụp phong cách sinh bởi AI |

### 6. Điều AI KHÔNG làm
Không cần API key của người chơi · không gửi dữ liệu đi đâu khi chạy bản tĩnh · không tự thay đổi giá cổ phiếu/thuế/tỷ lệ game · không đọc file hay mạng trên máy bạn. Sự kiện AI chỉ xuất hiện khi **bạn chủ động bấm nút** — game không bao giờ ngắt bạn bằng popup AI giữa chừng.

---

## XP & Level

Mọi hành động đều cho XP. Công thức lên cấp: cần `120 × level^1.55` XP cho cấp kế tiếp; **mỗi cấp = +2% mọi nguồn thu nhập** (level 10 = ×1.18, level 20 = ×1.38).

| Cấp | XP cần để vượt cấp này | Tổng XP từ đầu tới hết cấp này |
|---|---|---|
| 1 | 120 | 120 → Level 2 |
| 2 | 351 | 471 → Level 3 |
| 3 | 659 | 1,130 → Level 4 |
| 5 | 1,454 | **3,613 → Level 6 (mở khoá vũ trụ)** |
| 6 | 1,929 | 5,542 → Level 7 |
| 9 | 3,616 | 14,621 → Level 10 |
| 14 | 7,173 | 43,030 → Level 15 |
| 19 | 11,515 | 91,629 → Level 20 |

Nguồn XP đáng kể: tốt nghiệp đại học +150 · dự án vũ trụ +200 · sáng lập CLB +60 · verified +40 · bằng lái +40 · mở chi nhánh +25 · retreat +30 · gigs +4..10 · thiền +3 · từ thiện `max(2, số tiền/10,000)` · mỗi tháng có kinh doanh/followers + tối đa 25/12.

---

## 🏆 Thành tựu

22 cột mốc được theo dõi tự động suốt một kiếp — mở khoá thì hiện thông báo 🏆, xem lại cả bộ trong mục **Achievements** ở Home (đã mở khoá sáng rõ, chưa mở khoá mờ + mô tả gợi ý cách đạt):

| Nhóm | Thành tựu |
|---|---|
| Sự nghiệp | Khoản lương đầu tiên · Doanh nhân sơ khai · Chuỗi vùng miền (5 chi nhánh) · Tốt nghiệp · Đôi cánh (bằng phi công) · Cha đẻ câu lạc bộ |
| Tài chính | Triệu phú đầu tiên ($1M) · Cao thủ tài chính ($10M) · Đế chế thực thụ ($100M) · Cá mập chứng khoán ($1M cổ phiếu) · Cấp 10 |
| Gia đình & danh tiếng | Về chung một nhà · Con đông đứa (3 con) · Mặt nổi khắp nơi (fame 50) · Dấu tick xanh · Triệu người hâm mộ · Nhà hảo tâm (từ thiện $1M) |
| Tinh thần & vũ trụ | Karma sáng (50) · Đồng điệu vũ trụ (80) · Vươn khỏi Trái Đất · Du khách quỹ đạo · Trăm tuổi tròn 90 |

---

## Chiến lược theo giai đoạn

**18–25 (gốc rễ)**
1. Chọn ngành sở trường ngay (học phí −20%); trong lúc chờ tốt nghiệp, chạy gigs + nút Work + thiền miễn phí mỗi ngày (4 điểm tâm linh mỗi ngày cộng dồn rất mạnh).
2. Bật chế độ ăn lành mạnh sớm — $6/ngày rẻ hơn bất kỳ lần mổ nào.
3. Có $800: quán cà phê đầu tiên (vùng 1, hệ số 1.25) là khoản đầu tư hiệu quả nhất game.

**25–45 (tăng tốc)**
4. Luyện level: mở chi nhánh (+25 XP), tốt nghiệp (+150) — đạt **level 6 (tổng ~3,600 XP)** trước năm 2000 để mở vệ tinh sớm.
5. Trang trại → nhà máy đóng hộp (+30%) là cặp đôi kinh điển; Fab bán dẫn là cây tiền cuối game của đường kỹ sư.
6. Trước khi mua CLB lớn: đẩy tâm linh ≥70 (×1.10) và làm từ thiện vừa phải cho fame (mỗi điểm fame +0.2% kinh doanh).
7. Đầu tư trữ giá: Patek, tranh, bất động sản. Đừng ôn iPhone.

**45–90 (đế chế)**
8. Dòng tiền kinh doanh bơm vào vũ trụ; spirit ≥80 trước khi mua dự án không gian (×1.25).
9. Kẻ thù thật sự là tuổi tác: sau 75 suy giảm 0.18/ngày ≈ −66 HP/năm — giữ gym + khám + retreat đều.
10. Bấm AI tiên tri khi muốn bất ngờ — ở tài sản $10M+, các bước ngoặt của AI có trọng số xứng tầm tỷ phú.

---

## Bảng công thức nhanh

| Đại lượng | Công thức |
|---|---|
| Thu nhập/năm | kinh doanh + vũ trụ + mạng xã hội + lương (+$18k hưu) |
| Kinh doanh/năm | `Σ(doanh thu × vùng × mood − giá/24) + farm + factory`, nhân các bonus CLB/bằng/fame/era/level/tâm linh; tổng hệ số bonus tối đa ×3 |
| Việc nhanh | `(gốc + 0.05 × √thu nhập năm) × level × (1+0.4%×fame) × (0.7+0.3×HP/100)` |
| Work click | `max($25, $30 + 1% thu nhập năm)` (thể thao/cơ khí ×1.25) |
| Chi phí sống/năm | `$3,000 × 1.03^(tuổi−18)` + 2% giá trị tài sản + $400×12/con |
| Thuế | lũy tiến 0% (≤$20k) / 15% / 25% / 35%, tính 1/1 |
| Giá chi nhánh kế | `giá gốc × 1.35^số chi nhánh hiện có` |
| XP lên cấp | `120 × level^1.55` |
| Follower/tháng | `(fame×14 + 8×√followers) × (0.4–1.6)`, trần 200M |
| Quảng cáo xã hội/năm | `6% × followers` (≥500) |
| Likes bài đăng | `(5%×followers + 3×fame + 5) × (0.4–1.6) × boost` |
| Giá trị tài sản | Đồ cá nhân theo tỷ lệ thị trường (khấu hao tối thiểu 10%/năm); kinh doanh, nông trại, nhà máy, vũ trụ khấu hao 10%/năm |
| Tài sản ròng | tiền mặt + cổ phiếu + tài sản + giá trị biz + tiền gửi − nợ |

---

## Chạy & triển khai bằng npm

```bash
npm install
npm run dev          # http://localhost:3000 — bản đầy đủ, có backend LLM /api/story
```

Tự host bản production (giữ backend AI):

```bash
npm run build        # build server
npm start
```

Bản tĩnh (đúng cái GitHub Pages đang chạy — oracle dùng engine cục bộ):

```bash
npm run build:static # xuất ra ./out
```

## Triển khai lên GitHub Pages

`.github/workflows/deploy.yml`: mỗi push lên `main` chạy lint, typecheck, test,
sau đó build tĩnh bằng npm và deploy thư mục `out/` lên GitHub Pages
(concurrency chống dồn deploy). Static build đặt `NEXT_PUBLIC_HAS_BACKEND=0`
để AI tiên tri dùng engine cục bộ. Trong **Settings → Pages**, chọn nguồn
deploy **GitHub Actions**.

Run checks locally:

```bash
npm run lint
npm run typecheck
npm test
```

## Kiến trúc mã nguồn

```
src/app/page.tsx        toàn bộ UI game (nav 2 cấp 6 nhóm, 14 tab, bản đồ Links, popup sự kiện & AI)
src/app/api/story/      endpoint LLM "life director" (chỉ dùng khi tự host)
src/lib/engine.ts       engine: thời gian, kinh tế, thuế, gigs, level, social, sức khoẻ & tâm linh, ranking
src/lib/gameData.ts     dữ liệu: nav, 10 biz, farm/factory/space lines, 41 món shop, 9 cổ phiếu, 18 nghề, 26 đối thủ, lịch sử & thời đại
src/lib/story.ts        bộ máy truyện cục bộ (16 template, chống lặp, co giãn theo tài sản)
src/lib/store.ts        state ngoài React + tự lưu localStorage
src/lib/i18n.tsx        từ điển EN / VI / 中文 + bộ chuyển đổi
src/lib/art.tsx         thư viện icon SVG (bảng màu trung tính)
public/img/             7 ảnh phong cách sinh bởi AI
scripts/static-build.mjs  cấu hình build tĩnh cho Pages
```

## Lưu trữ & kiểm thử

- Save game: `localStorage["tycoon_life_react_v1"]` — dữ liệu có `schemaVersion` và được tự migrate; lưu định kỳ mỗi 3 giây, lưu ngay sau hành động và trước khi đóng trang. Nút reset nằm trên header.
- Hook kiểm thử: `window.__tycoon` (getState / persist / bump / processDay / yearEnd / tick) — dùng cho automation và các bạn thích nghịch console.

## Lịch sử phiên bản

- **v10** — **tên miền riêng huyenbao.com** (bản cũ github.io tự chuyển hướng), hệ **Thành tựu** 22 cột mốc + thông báo, **PWA** (cài lên màn hình chính, icon riêng, chế độ standalone), **tối ưu điện thoại** (nav bọc dòng, hero dọc, nút cỡ chạm, bản đồ Links cuộn ngang), schema save v4.
- **v9.1** — README mở rộng: hướng dẫn chơi chi tiết toàn hệ thống + mục riêng "AI — những gì khác biệt nhờ bổ sung AI".
- **v9** — đổi tên thành **MOGUL**, **điều hướng 2 cấp** (6 nhóm × 14 tab con xếp theo làn đời, mỗi nhóm nhớ tab cuối), tab mới **Links**: bản đồ SVG hệ thống 13 nút & 16 mũi tên trực tiếp/gián tiếp + bảng công thức thời gian thực; sửa nhãn thời gian bị trùng.
- **v8.1** — **dark theme** (mặc định) + nút ☀/☾, **chọn ngôn ngữ ngay trong popup chào mừng**, **tách Jobs & Education thành 2 tab**, hệ **Health** (gym/khám/diet, lão hoá theo tuổi, chết vì sức khoẻ) và **Mind & spirit** (thiền/chùa/retreat, karma, thưởng tâm linh: biz ×1.10, chậm lão, vũ trụ ×1.25), sự kiện burnout & tu viện, thanh wellbeing.
- **v8** — webapp lên gốc repo (index.html cổ điển nghỉ hưu), npm thay bun, EN/VI/中文, gigs thay side hustle (kèm việc "xem quảng cáo"), hệ level/XP, mạng xã hội (followers/verified/doanh thu quảng cáo), khai phá vũ trụ, Home gọn nhưng đầy đủ, thiết kế lại trung tính + ảnh sinh bởi AI, static export qua GitHub Actions.
- **v7** — chuỗi kinh doanh theo vùng, chuỗi cung ứng farm/factory, Bank (thuế/tiết kiệm/vay/từ thiện/fame), 4 bảng xếp hạng, tạo nhân vật, cổ phiếu số lượng + màu mua/bán, shop popup, **AI oracle + webapp React/Next.js với backend LLM /api/story**.
- **v5–v6** — sửa bug: modal sự kiện không mở giữa game (treo máy), deadlock khi không đủ tiền mua lựa chọn nào.
- **v4** — thời gian quá nhanh: giảm một nửa tốc độ nền (20 giây/ngày) + nút tốc độ trên bản classic.
