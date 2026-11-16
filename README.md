# LuxMap Web App — Web GIS Platform & Dashboard

Hệ thống bản đồ số GIS tích hợp IoT và thị giác máy tính để quản lý tài sản và sự cố chiếu sáng đường giao thông nông thôn.

## 🚀 Khởi chạy dự án

```bash
# Cài đặt thư viện
npm install

# Chạy Dev Server
npm run dev

# Build Production
npm run build
```

## 🛠️ Công nghệ sử dụng
- **Core:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS v4
- **State Management:** Redux Toolkit + Redux-Saga
- **Routing:** React Router v7
- **HTTP Client:** Axios với Token Interceptor

## 🚢 Deploy (tự động)

Mỗi lần merge vào **`dev`**, workflow [`.github/workflows/deploy-web.yml`](./.github/workflows/deploy-web.yml) tự chạy:
`npm test` → build với `VITE_API_URL=/api/v1` (web và API cùng domain `https://luxmap.com.vn`) → chặn bản build còn trỏ
`localhost:<cổng>` → `rsync` lên VPS → kiểm trang đang chạy đúng bundle vừa build. Không cần build tay hay quyền SSH.

- Test đỏ hoặc build lỗi thì **không deploy**, bản đang chạy giữ nguyên. Xem kết quả ở tab **Actions** của repo.
- **Quay lui:** revert commit lỗi trên `dev`, workflow tự deploy lại bản trước.
- Chạy lại thủ công: Actions → *Deploy web to VPS* → **Run workflow**.
- Secrets: `VPS_DEPLOY_KEY` (key chỉ được rsync vào thư mục web trên server), `VITE_MAPTILER_KEY`.

## Điều khiển đèn IoT

Manager mở **Tài sản → Thiết bị IoT → Chi tiết** để dùng **Bật / Tắt / Tự động**
trên node hỗ trợ điều khiển từ xa. Cần xác nhận vì lệnh tác động lên toàn bộ feeder đấu vào rơ-le.
Tự động dùng lịch hiện có; giao diện này không đặt lịch mới.

Sau khi gửi, giao diện chờ GET xác nhận đúng `command_id`, đọc lại khoảng 2 giây/lần.
Lệnh khác thay thế sẽ kết thúc chờ; đến `expires_at` hoặc sau 60 giây nếu không có thời hạn,
giao diện dừng và không tự gửi lại. Đóng modal cũng dừng theo dõi. ACK chỉ xác nhận thiết bị
đã xử lý lệnh; cần số đo điện mới để kiểm chứng tải thực tế. Không cần thêm cấu hình frontend.

## 📚 Tài liệu tham khảo
- Xem hướng dẫn chi tiết tại [GUIDE.md](./GUIDE.md)
- Xem quy định phát triển tại [RULES.md](./RULES.md)
