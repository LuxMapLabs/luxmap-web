# 📖 HƯỚNG DẪN PHÁT TRIỂN (LUXMAP WEB APP DEVELOPER GUIDE)

Tài liệu này hướng dẫn cách cấu hình môi trường, chạy dự án và lập trình các chức năng mới theo chuẩn kiến trúc của **LuxMap Web App** (Web GIS Platform & SPA Dashboard).

---

## 🛠️ 1. Cấu hình môi trường & Chạy dự án

### Yêu cầu hệ thống:
- **Node.js**: Phiên bản 18 trở lên (khuyên dùng v20 LTS).
- **npm**: v9 trở lên.

### Các bước bắt đầu:
1. Di chuyển vào thư mục dự án:
   ```bash
   cd code/luxmap-web
   ```
2. Cài đặt các thư viện phụ thuộc:
   ```bash
   npm install
   ```
3. Cấu hình biến môi trường:
   Sao chép file `.env.example` thành `.env` tại thư mục gốc và thiết lập địa chỉ URL của Backend API:
   ```bash
   cp .env.example .env
   ```
4. Chạy ứng dụng trong môi trường phát triển (Dev Server):
   ```bash
   npm run dev
   ```
   *(Trình duyệt sẽ tự động mở tại `http://localhost:5173`).*

5. Kiểm tra build production:
   ```bash
   npm run build
   ```

---

## 🏗️ 2. Quy trình thêm một tính năng mới (Feature)

Mỗi chức năng Redux (ví dụ: `auth`, `assets`, `faults`, `workOrders`) tuân thủ cấu trúc phẳng trong thư mục `src/feature/[tên-chức-năng]/`. Các giao diện trang hiển thị nằm độc lập trong thư mục `src/pages/[tên-trang]/`.

### Cấu trúc chuẩn:
```text
src/feature/assets/         # Thư mục logic Redux quản lý tài sản
├── assetAPI.ts             # Các hàm gọi API tới backend
├── assetSaga.ts            # Saga quản lý tác vụ async (gọi API, side effects)
└── assetSlice.ts           # Slice quản lý state & actions bằng Redux Toolkit

src/pages/assets/           # Thư mục chứa giao diện view riêng biệt
├── components/             # Component riêng cho trang assets (Modal, Table...)
├── AssetMapPage.tsx        # Trang bản đồ tài sản GIS
└── AssetRegisterPage.tsx   # Trang đăng ký / import tài sản CSV
```

### Các bước thực hiện:
1. **Viết API**: Định nghĩa các endpoint trong `[feature]API.ts` sử dụng `apiClient` từ `src/config/apiClient.ts`.
2. **Tạo Slice**: Tạo actions và reducers trong `[feature]Slice.ts`.
3. **Tạo Saga**: Xử lý async side effects trong `[feature]Saga.ts` bằng `redux-saga/effects` (`call`, `put`, `takeLatest`).
4. **Đăng ký vào Store**:
   - Thêm reducer vào `src/redux/rootReducer.ts`
   - Thêm saga vào `src/redux/rootSaga.ts`
5. **Xây dựng UI Component & Page**: Kết nối với Redux Store qua `useSelector` và `useDispatch` trong thư mục `src/pages/`.

---

## 🎨 3. Thiết kế giao diện (UI/UX) với Tailwind v4

- Sử dụng các Design Tokens màu sắc chủ đạo được cấu hình trong `src/index.css`:
  - `bg-primary` / `text-primary` (`#1f3864`) — Xanh Navy chủ đạo quản lý.
  - `bg-secondary` / `text-secondary` (`#3e86c9`) — Xanh dương cho link, icon, button.
  - `bg-accent` (`#5fc4b0`) — Xanh ngọc cho trạng thái đèn bình thường (Normal).
  - `bg-warning` (`#e9a23b`) — Vàng cam cho trạng thái đèn mờ (Dim).
  - `bg-danger` (`#d64545`) — Đỏ cho trạng thái đèn tắt/hỏng (Out) hoặc cảnh báo quá hạn SLA.
  - `bg-surface` (`#f5f7fa`) — Màu nền xám nhạt dịu mắt cho trang Web.
- Đảm bảo giao diện Responsive chuẩn trên màn hình máy tính từ `1366px` đến `2560px`.

---

## 🔍 4. Debug Redux Store & API Interceptor

- **Redux DevTools**: Dự án đã bật `devTools: true` trong `src/redux/store.ts`. Bạn chỉ cần mở trình duyệt Google Chrome, nhấn **F12** và chọn tab **Redux** để debug state, action timeline.
- **Token Interceptor**: `apiClient.ts` tự động gắn `Authorization: Bearer <token>` vào mọi request và tự động refresh token khi gặp mã lỗi `401 Unauthorized`.
