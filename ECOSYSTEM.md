# Lộ trình hệ sinh thái HuyenBao

> Tài liệu này mô tả toàn cảnh hệ sinh thái ứng dụng quanh **HuyenBao** — app trung tâm (game mô phỏng đời) — và lộ trình phát triển cho các thành phần liên kết: các game mô phỏng khác (đua xe, trồng trọt, chăn nuôi, sản xuất, xây dựng căn cứ vũ khí vũ trang), **Elliot** (crypto trading để kiếm tiền thật), và **Huyền Học AI** (app.huyenbao.com — nghiên cứu huyền học áp dụng đời sống).
>
> Tài liệu phát triển (forward-looking), không phải lịch sử phát hành. Cập nhật theo từng pha.

---

## 1. Tầm nhìn

Một hệ sinh thái mà mỗi app **đứng độc lập được** (người dùng có thể chơi/dùng một app mà không cần app khác) nhưng **chia sẻ cùng một vũ trụ**: cùng nhân thân người dùng, cùng LLM local (Ollama), cùng quy ước i18n (EN / TIẾNG VIỆT / 中文), cùng stack kỹ thuật (Next.js 16 + TypeScript + Tailwind 4 + React 19). Tài sản, danh tiếng, và tiến trình có thể đi chéo giữa các app: một tay đua xe giỏi trong game đua có thể đem tiếng tăm về HuyenBao; một nhà giao dịch crypto thành công trên Elliot có thể đem vốn về xây đế chế trong HuyenBao.

**Trụ cột triết lý:**
- **Giải trí trước, không thay thế chuyên gia.** Mọi diễn giải huyền học, mọi "lời khuyên" AI, mọi dự báo thị trường đều là hư cấu / tham khảo trong game, không phải tư vấn y tế, pháp lý, tài chính hay tâm linh đời thật. Người dùng tự chịu hoàn toàn trách nhiệm pháp lý cho hành động ngoài đời.
- **Local-first.** Tận dụng LLM Ollama chạy local cho toàn hệ sinh thái — riêng tư, không phụ thuộc cloud, chạy được cả khi offline.
- **Một ngôn ngữ across ecosystem.** TypeScript xuyên suốt; không trộn Python frontend với JS frontend.

---

## 2. Hệ sinh thái đầy đủ (8 thành phần)

| # | Thành phần | Repo / Vị trí | Trạng thái | Vai trò trong hệ sinh thái |
|---|------------|---------------|------------|---------------------------|
| 1 | **HuyenBao** (game mô phỏng đời) | [DuoLE3383/tycoon-life](https://github.com/DuoLE3383/tycoon-life) · huyenbao.com | ✅ Đang phát triển (v11.x) | **Trung tâm (hub)** — build đế chế trước 90 tuổi. Nơi hội tụ danh tiếng, tài sản, và tiến trình từ mọi app khác |
| 2 | **Đua xe** (racing sim) | (repo mới, dự kiến `DuoLE3383/racing`) | 🔲 Chưa bắt đầu | Game đua xe mô phỏng: garage, đua giải, fame từ HuyenBao ảnh hưởng lượt xem, tiền thưởng đưa về hub |
| 3 | **Trồng trọt** (farming sim) | (repo mới, dự kiến `DuoLE3383/farm`) | 🔲 Chưa bắt đầu | Farm sim: mùa vụ, thời tiết, nguồn cung cho module sản xuất của HuyenBao (+30% như đã có trong hub) |
| 4 | **Chăn nuôi** (livestock sim) | (repo mới, dự kiến `DuoLE3383/ranch`) | 🔲 Chưa bắt đầu | Chăn nuôi: giống, thức ăn, sức khoẻ đàn, sản phẩm phụ (sữa, lông, thịt) cấp cho nhà máy |
| 5 | **Sản xuất** (manufacturing sim) | (repo mới, dự kiến `DuoLE3383/factory`) | 🔲 Chưa bắt đầu | Chuỗi sản xuất: nguyên liệu ← farm/ranch → nhà máy → thành phẩm → chuỗi bán lẻ trong HuyenBao |
| 6 | **Căn cứ vũ khí vũ trang** (base building) | (repo mới, dự kiến `DuoLE3383/arsenal`) | 🔲 Chưa bắt đầu | Xây căn cứ, R&D vũ khí, huấn luyện, phòng thủ — tầng late-game chiến thuật, có thể fold làm mod mở rộng của HuyenBao |
| 7 | **Elliot** (crypto trading) | [DuoLE3383/Elliot](https://github.com/DuoLE3383/Elliot) | ⚠️ Khởi tạo, để sau | Trang giao dịch crypto (paper / live tùy cấu hình) để **kiếm tiền thật**; lợi nhuận có thể nạp về vốn khởi điểm trong HuyenBao |
| 8 | **Huyền Học AI** | [DuoLE3383/Huyen-Hoc-AI](https://github.com/DuoLE3383/Huyen-Hoc-AI) · app.huyenbao.com | ✅ Backend FastAPI + Ollama chạy tốt; đang tích hợp dần vào HuyenBao | Nghiên cứu huyền học áp dụng đời sống: Tử Vi, Kinh Dịch, Tarot, Phong thủy. Backend giữ, frontend convert sang React nhúng vào hub |

---

## 3. Nguyên tắc kết nối

**Shared identity (kế hoạch):** một tài khoản `huyenbao.com` dùng cho toàn hệ sinh thái. v11.x hiện chưa bắt buộc đăng nhập (theo quyết định kiến trúc: tận dụng Ollama local, không bắt login). Khi Elliot cần giao dịch thật, login sẽ trở lại — nhưng chỉ ở Elliot, không bắt buộc ở hub hay các game sim.

**Shared local LLM:** toàn bộ 8 thành phần dùng chung một instance Ollama (mặc định `LLM_BASE_URL=http://0.0.0.0:8888`, model `qwen2.5:7b`). Mỗi app tự gọi `/v1/chat/completions` hoặc `/api/chat`; không có LLM gateway trung tâm (giữ đơn giản, mỗi app self-contained). HuyenBao và Huyền Học AI đã chia cùng pattern client (so sánh `tycoon-life/src/app/api/story/route.ts` với `Huyen-Hoc-AI/nextjs/src/lib/llm.ts`).

**Cross-game assets (tầm nhìn pha 5):** tiến trình giữa các app đi chéo qua một "ecosystem ledger" (local-first, có thể sync cloud tùy chọn). Ví dụ:
- Đua xe: top giải → +fame trong HuyenBao → +followers social → +thu nhập kinh doanh.
- Farm/ranch: nguồn cung → nhà máy HuyenBao → +biên lợi nhuận.
- Elliot: lợi nhuận giao dịch → vốn khởi điểm HuyenBao (cap để không phá cân bằng).
- Huyền Học: lá số Tử Vi / quẻ Kinh Dịch → hint chiến lược trong HuyenBao (đã bắt đầu: Kinh Dịch v11.11).

**Shared i18n + design:** cùng bộ EN/VI/ZH, cùng Tailwind tokens, cùng component vocabulary. Khi đủ chín, trích thành package `@duole/ecosystem` (chưa làm, nằm trong pha 5).

---

## 4. Lộ trình theo pha

### Pha 1 — Hub + Huyền học (đang làm, ~v11.x)
- ✅ HuyenBao core: mô phỏng đời đầy đủ (sự nghiệp, kinh doanh, chứng khoán, social, vũ trụ, power/entity)
- ✅ AI oracle tự popup (luck / setback / life-stage / story) + fallback local 24 templates × 3 ngôn ngữ
- ✅ Cảnh báo pháp lý (v11.10): mandatory ack, footer, modal notes
- ✅ Kinh Dịch tích hợp từ Huyền-Học-AI (v11.11): engine TS + `/api/divine` LLM
- ✅ Thời gian online 30s/ngày + offline 10 phút/ngày + rủi ro kinh doanh không giám sát (v11.12)
- 🔲 Tử Vi (v11.14 dự kiến): port module `bat_tu/` sang TS, tích hợp vào Spirit tab
- 🔲 Tarot nâng cao (full spread + LLM luận giải đa lá)
- 🔲 Phong thủy Bát Trạch (port từ Huyền-Học-AI)

### Pha 2 — Elliot crypto trading MVP
- Paper trading trước (giả lập, không tiền thật) để thử strategy
- Sau đó live trading tùy cấu hình + người dùng tự chịu trách nhiệm
- Tích hợp giá Việt Nam (VN-Index, tỷ giá) đã có trong Huyền-Học-AI `routes/api.py` — tái dùng
- **Disclaimer nặng:** không phải tư vấn đầu tư, người dùng tự chịu rủi ro tài chính
- Kết nối nhẹ về hub: lợi nhuận (cap) có thể nạp vốn khởi điểm HuyenBao

### Pha 3 — Simulation games (đua xe, trồng trọt, chăn nuôi)
- Cùng engine pattern như HuyenBao: tick-based, DAY_MS, save local, PWA
- Mỗi game repo riêng, deploy subdomain riêng (race.huyenbao.com, farm.huyenbao.com, ranch.huyenbao.com)
- Cross-assets fame/supply về hub
- Ưu tiên: Farm + Ranch trước (cấp nguồn cho sản xuất), Đua xe sau (độc lập hơn)

### Pha 4 — Sản xuất + Căn cứ vũ khí vũ trang
- Sản xuất: chuỗi cung ứng kết nối Farm/Ranch ↔ HuyenBao factories
- Căn cứ vũ khí: có thể là app riêng HOẶC mod mở rộng late-game của HuyenBao (quyết định khi đến pha)
- Tầng chiến thuật sâu, cần R&D tree, phòng thủ, huấn luyện

### Pha 5 — Ecosystem glue
- Shared identity (`huyenbao.com` account) cho toàn hệ sinh thái
- Ecosystem ledger: cross-game assets/currency/fame sync (local-first + optional cloud)
- Package `@duole/ecosystem`: shared i18n, LLM client, design tokens
- Unified dashboard: xem toàn bộ tiến trình các app cùng lúc

---

## 5. Tech stack chung

| Tầng | Công nghệ |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Ngôn ngữ | TypeScript strict |
| Styling | Tailwind CSS 4 |
| LLM | Ollama local (`qwen2.5:7b` mặc định), fallback ZAI cloud |
| i18n | EN / TIẾNG VIỆT / 中文 — cùng `useT()` pattern |
| Lưu trữ | LocalStorage (save game), SQLite (Huyền-Học-AI backend), Prisma (Elliot) |
| Deploy | PWA, mobile-first responsive, basePath per domain |
| Mobile | PWA install-to-home-screen (không dùng Capacitor rebuild) |

---

## 6. Chạy song song ở dev

```bash
# 1. HuyenBao (hub)
cd ~/tycoon-life && npm run dev          # http://localhost:3000

# 2. Huyền Học AI (Next.js rewrite, khi hoàn tất)
cd ~/Huyen-Hoc-AI/nextjs && npm run dev  # đổi port nếu trùng

# 3. Elliot (khi bắt đầu)
cd ~/Elliot && npm run dev               # PORT=3001

# LLM chung
ollama serve &                            # http://0.0.0.0:11434
ollama pull qwen2.5:7b                    # ~5 GB, một lần
```

---

## 7. Disclaimer (toàn hệ sinh thái)

Mọi thành phần trong hệ sinh thái HuyenBao đều là **giải trí / tham khảo**:
- Game mô phỏng (HuyenBao, đua xe, farm, ranch, sản xuất, căn cứ vũ khí): **không phải đời thật** — không áp dụng quyết định game vào đời thực, người dùng tự chịu hoàn toàn trách nhiệm pháp lý cho hành động ngoài đời.
- Huyền Học AI: diễn giải không phải dự đoán khoa học, không thay thế tư vấn chuyên môn (y tế, pháp lý, tài chính, tâm linh).
- Elliot: **không phải tư vấn đầu tư** — giao dịch crypto có rủi ro mất vốn; người dùng tự chịu trách nhiệm tài chính. Paper trading trước, live trading tùy trách nhiệm người dùng.

Xem thêm cảnh báo pháp lý trong app: màn hình tạo nhân vật (bắt buộc ack), footer mọi tab, modal sự kiện/AI.
