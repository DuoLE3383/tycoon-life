# 🏙️ Tycoon Life

Xây dựng đế chế riêng của bạn trước khi tròn 90 tuổi — game mô phỏng đời người chạy hoàn toàn trong trình duyệt, gói gọn trong một file `index.html`, không cần cài đặt gì cả.

🎮 **Chơi ngay:** https://duole3383.github.io/tycoon-life/

## Cách chơi

- Thời gian chạy thực: **10 giây thật = 1 ngày trong game** (mở tab khác thì thời gian tạm dừng).
- Bấm **Side hustle** để có thu nhập sớm, học bằng đại học hoặc lấy bằng lái để mở khóa công việc lương cao.
- Mở rộng kinh doanh từ quán cà phê tới tập đoàn đa ngành; đầu tư cổ phiếu (giá nhảy mỗi 3 giây); sưu tầm siêu xe, du thuyền, bất động sản.
- Vào các **câu lạc bộ triệu phú** để nhận hệ số thu nhập; đối trọng là thuế 18%, tiền thuê & hóa đơn mỗi tháng.
- Sống qua các sự kiện đời thực: tình yêu, đám cưới, con cái, trúng số, khủng hoảng thị trường… đến 90 tuổi sẽ có kết thúc với mức đánh giá tài sản.

## Bản vá trong phiên bản này

1. **Sửa lỗi treo game:** trước đây khi một sự kiện đời sống nổ ra giữa game, hộp thoại sự kiện không bao giờ được mở khiến thời gian đứng im vĩnh viễn. Giờ hộp thoại tự mở ngay khi sự kiện xảy ra.
2. **Chống kẹt hộp thoại sự kiện:** với các sự kiện mà mọi lựa chọn đều tính phí (đám cưới, khủng hoảng tuổi trung niên…), nếu không đủ tiền, tất cả lựa chọn sẽ được mở khóa để câu chuyện luôn tiếp tục diễn ra.

## Chạy cục bộ

Chỉ cần tải `index.html` về và mở bằng trình duyệt — tiến trình chơi được lưu tự động trong `localStorage` của máy bạn.

## Kiểm thử

Game đã được chạy thử tự động (Playwright/Chromium) qua trọn vòng đời 18 → 90 tuổi: chuyển đủ 6 tab, làm thêm, mua/bán đồ, mua/bán cổ phiếu, mở kinh doanh, vào club, học & tốt nghiệp, trả lời sự kiện, nghỉ hưu và kết thúc — không có bất kỳ lỗi console nào.
