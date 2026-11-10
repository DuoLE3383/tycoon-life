# Deploy HuyenBao lên VPS — mogul.huyenbao.com

**mogul.huyenbao.com (v11.35): domain GAME-FIRST — admin dashboard dời về `/ads`:**

| URL | Nội dung |
| --- | --- |
| `https://mogul.huyenbao.com/` | **Game** đầy đủ (có backend xã hội SQLite) — mở domain vào là chơi |
| `https://mogul.huyenbao.com/ads` | **Admin dashboard toàn diện** — 7 tab: Tổng quan · Hệ thống · Người chơi · Trò chuyện · Quà tặng · Bảng XH · CSDL |
| `https://mogul.huyenbao.com/adm` | **Alias → /ads** (rewrite ngầm, URL giữ nguyên — bookmark cũ vẫn hoạt động) |
| `https://mogul.huyenbao.com/game` | **Alias → /** (rewrite ngầm, URL giữ nguyên — bookmark cũ vẫn hoạt động) |
| `https://mogul.huyenbao.com/admin` | **404** — đường dẫn cũ đã bị xoá hẳn |
| `https://mogul.huyenbao.com/api/*` | API xã hội + admin API (JSON, vẫn chặn bằng ADMIN_KEY) |

Game cho người chơi thường vẫn ở **https://huyenbao.com** (bản static GitHub Pages).

Sơ đồ: **trình duyệt → https://mogul.huyenbao.com → reverse proxy (Caddy/nginx) → `http://localhost:3334` → `npm start` (Next.js + src/proxy.ts)**

> Lịch sử: v11.32 từng ẩn admin ở root. v11.35 đảo chiều — root về game, admin dời ra `/ads` (đường dẫn trực diện) và mở rộng thành dashboard toàn diện 7 tab. `/adm` và `/game` giữ làm alias (rewrite ngầm) để bookmark cũ không hỏng.
> Caddy/nginx không cần đổi gì — tiếp tục truyền đủ header `Host` là được.

## 1. Build + chạy server (port 3334)

```bash
cd /opt/tycoon-life            # thư mục repo trên VPS
npm ci                         # hoặc: bun install --frozen-lockfile
npm run build                  # next build (Node server, KHÔNG phải build:static)
```

`npm start` hiện chạy `next start -H 0.0.0.0 -p 3334` — bind mọi interface,
port **3334**, đúng điểm đích `service: http://localhost:3334` của proxy.

Chạy thử tay để kiểm tra:

```bash
ADMIN_KEY=dat-key-o-day npm start
# terminal khác:
curl -s http://localhost:3334/version.json   # phải trả JSON phiên bản
```

## 2. Chạy nền bằng systemd (khuyến nghị)

```bash
sudo cp deploy/huyenbao.service /etc/systemd/system/
sudo nano /etc/systemd/system/huyenbao.service   # sửa WorkingDirectory + ADMIN_KEY
sudo systemctl daemon-reload
sudo systemctl enable --now huyenbao
journalctl -u huyenbao -f
```

## 3. Trỏ domain → VPS

DNS: bản ghi **A** của `mogul.huyenbao.com` → IP VPS.
(Đã có huyenbao.com trên Cloudflare/manager DNS — chỉ thêm record `mogul`.)

## 4. Reverse proxy — chọn 1 trong 2

### Caddy (dễ nhất, tự HTTPS)

```bash
sudo cp deploy/Caddyfile.mogul /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### nginx + certbot

```bash
sudo cp deploy/nginx-mogul.conf /etc/nginx/sites-available/mogul.conf
sudo ln -sf /etc/nginx/sites-available/mogul.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d mogul.huyenbao.com
sudo nginx -t && sudo systemctl reload nginx
```

## 5. Bật admin dashboard toàn diện ở `/ads`

1. Đặt `ADMIN_KEY=<bí mật>` trong môi trường trước `npm start`
   (đã có sẵn trong `deploy/huyenbao.service` — nhớ đổi giá trị mặc định).
2. Mở `https://mogul.huyenbao.com/ads` (hoặc `https://mogul.huyenbao.com/adm` — sẽ rewrite sang `/ads`),
   dán key một lần (lưu sessionStorage).
3. 7 tab:
   - 📊 **Tổng quan** — server stats + top 10 tài sản (auto-refresh 10s)
   - ⚙️ **Hệ thống** — Node version, uptime, RAM, env status, file SQLite (main+WAL+SHM)
   - 👥 **Người chơi** — sửa/cấm/xoá + gửi quà inline cho từng người
   - 💬 **Trò chuyện** — xoá tin, cấm spam, phát 📢 broadcast
   - 🎁 **Quà tặng** — log + xoá + gửi quà admin (danh nghĩa HuyenBao 📢)
   - 🏆 **Bảng XH** — top 50 + reset toàn bộ (nw=0, level=1)
   - 🗄 **CSDL** — VACUUM, xoá chat
4. Mở `https://mogul.huyenbao.com/` để chơi bản có backend xã hội.
5. Bảo mật thật sự vẫn là `ADMIN_KEY` (fail-closed khi chưa đặt — API trả 403 với mọi request).
   `/admin` cũ trả 404; `/adm` alias rewrite sang `/ads`; `/game` alias rewrite về `/`.

## 6. File dữ liệu

SQLite nằm ở `<repo>/data/social.db` (WAL). Muốn chuyển nơi khác:
`SOCIAL_DB_PATH=/var/lib/huyenbao/social.db` trong systemd unit.
Backup: `sqlite3 data/social.db ".backup /root/backup/social-$(date +%F).db"`
