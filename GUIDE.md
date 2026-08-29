# 📖 HƯỚNG DẪN PHÁT TRIỂN (LUXMAP WEB APP DEVELOPER GUIDE)

Tài liệu này hướng dẫn cách cấu hình môi trường, chạy dự án và lập trình các chức năng mới theo chuẩn kiến trúc của **LuxMap Web App** (Web GIS Platform & SPA Dashboard).

---

## 🛠️ 1. Cấu hình môi trường & Chạy dự án

### Yêu cầu hệ thống:
- **Node.js**: Phiên bản 18 trở lên (khuyên dùng **Node.js v20 LTS**).
- **npm**: v9 trở lên.

### Các bước bắt đầu:
1. Di chuyển vào thư mục dự án:
   ```bash
   cd code/luxmap-web
   ```
2. Cài đặt các thư viện phụ thuộc bằng lệnh chuẩn:
   ```bash
   npm ci
   ```
   *(Hoặc `npm install` nếu đang khởi tạo dự án lần đầu).*
3. Cấu hình biến môi trường:
   Sao chép file `.env.example` thành `.env` tại thư mục gốc và thiết lập địa chỉ Host của Backend API:
   ```bash
   cp .env.example .env
   ```
   *Ví dụ trong file `.env`:*
   ```env
   VITE_API_URL=http://localhost:5000
   ```
   *(Hệ thống `apiClient.ts` tự động gắn thêm `/api/v1` thành `http://localhost:5000/api/v1`).*
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

## 🔄 2. Quy trình Tự động sinh TypeScript Types từ Backend (`npm run gen`)

Mỗi khi Backend (BE) cập nhật code mới, thêm API hoặc sửa/xóa trường dữ liệu, Frontend chỉ cần gõ **1 lệnh ngắn duy nhất**:

```bash
npm run gen
```

### 🧠 Cơ chế tự động hóa thông minh:
1. **Kết nối Swagger:** Tự động đọc Swagger Schema từ Backend (`http://localhost:5141/swagger/v1/swagger.json` hoặc URL cấu hình).
2. **Tự động bóc tách theo Module sau `/api/v1/`:**
   - Endpoint `/api/v1/auth/*` ➔ Tự động sinh **`src/types/auth.ts`**
   - Endpoint `/api/v1/Health/*` ➔ Tự động sinh **`src/types/health.ts`**
   - Sau này có `/api/v1/poles/*` ➔ Tự động sinh **`src/types/poles.ts`**
   - Sau này có `/api/v1/faults/*` ➔ Tự động sinh **`src/types/faults.ts`**
   - Sau này có `/api/v1/work-orders/*` ➔ Tự động sinh **`src/types/workorders.ts`**
3. **Phân loại `common.ts` thông minh:**
   - Bất kỳ type nào dùng chung từ 2 module trở lên hoặc các cấu trúc lỗi/phân trang (`ApiError`, `PaginationMeta`, `UserDto`, `UserRole`) sẽ được tự động gom vào **`src/types/common.ts`**.
   - Các file domain tự động đính kèm `import type { ... } from './common'` tương ứng.
4. **Cập nhật Barrel Export:** Tự động cập nhật **`src/types/index.ts`** để export toàn bộ.

### 💻 Cách sử dụng Types & Gọi API trong Code:
Bạn có thể import trực tiếp từ `@/types` và gọi qua `apiClient`:
```typescript
import apiClient from '@/config/apiClient'
import type { LoginRequest, AuthResponse } from '@/types'

// Ví dụ hàm gọi API (Base URL đã có sẵn /api/v1):
export const loginApi = async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', payload)
    return response.data.data
}
```

---

## 🏗️ 3. Quy trình thêm một tính năng mới (Feature)

Mỗi chức năng Redux (ví dụ: `auth`, `assets`, `faults`, `workOrders`) tuân thủ cấu trúc phẳng trong thư mục `src/feature/[tên-chức-năng]/`. Các giao diện trang hiển thị nằm độc lập trong thư mục `src/pages/[tên-trang]/`.

### Cấu trúc chuẩn:
```text
src/
├── config/
│   └── apiClient.ts        # Axios Client cấu hình tự động Base URL (/api/v1) & Token Interceptors
├── feature/assets/         # Thư mục logic Redux quản lý tài sản
│   ├── assetAPI.ts         # Các hàm gọi API tới backend (sử dụng apiClient)
│   ├── assetSaga.ts        # Saga quản lý tác vụ async (gọi API, side effects)
│   └── assetSlice.ts       # Slice quản lý state & actions bằng Redux Toolkit
├── pages/assets/           # Thư mục chứa giao diện view riêng biệt
│   ├── components/         # Component riêng cho trang assets (Modal, Table...)
│   ├── AssetMapPage.tsx    # Trang bản đồ tài sản GIS
│   └── AssetRegisterPage.tsx # Trang đăng ký / import tài sản CSV
└── components/common/      # Các component dùng chung chính thức của dự án
```

---

## 🎨 4. Thiết kế giao diện (UI/UX) với Tailwind v4

- Sử dụng các Design Tokens màu sắc chủ đạo được cấu hình trong `src/index.css`:
  - `bg-primary` / `text-primary` (`#1f3864`) — Xanh Navy chủ đạo quản lý.
  - `bg-secondary` / `text-secondary` (`#3e86c9`) — Xanh dương cho link, icon, button.
  - `bg-accent` (`#5fc4b0`) — Xanh ngọc cho trạng thái đèn bình thường (Normal).
  - `bg-warning` (`#e9a23b`) — Vàng cam cho trạng thái đèn mờ (Dim).
  - `bg-danger` (`#d64545`) — Đỏ cho trạng thái đèn tắt/hỏng (Out) hoặc cảnh báo quá hạn SLA.
  - `bg-surface` (`#f5f7fa`) — Màu nền xám nhạt dịu mắt cho trang Web.
- Đảm bảo giao diện Responsive chuẩn trên màn hình máy tính từ `1366px` đến `2560px`.

---

## 🔍 5. Debug Redux Store & API Interceptor

- **Redux DevTools**: Dự án đã bật `devTools: true` trong `src/redux/store.ts`. Bạn chỉ cần mở trình duyệt Google Chrome, nhấn **F12** và chọn tab **Redux** để debug state, action timeline.
- **Token Interceptor**: `apiClient.ts` tự động gắn `Authorization: Bearer <token>` vào mọi request và tự động refresh token khi gặp mã lỗi `401 Unauthorized`.
