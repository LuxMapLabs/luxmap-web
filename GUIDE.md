# 📖 HƯỚNG DẪN PHÁT TRIỂN (DEVELOPER GUIDE)

Tài liệu này hướng dẫn cách cấu hình môi trường, chạy dự án và lập trình các chức năng mới theo đúng chuẩn kiến trúc của CivicFlow Desktop App.

---

## 🛠️ 1. Cấu hình môi trường & Chạy dự án

### Yêu cầu hệ thống:
- **Node.js**: Phiên bản 18 trở lên (khuyên dùng v20 LTS).
- **npm**: v9 trở lên.

### Các bước bắt đầu:
1. Di chuyển vào thư mục dự án:
   ```bash
   cd .../civicflow-desktop
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
4. Chạy ứng dụng trong môi trường phát triển (Dev Mode):
   - **Chạy bản App Desktop Electron (đầy đủ):**
     ```bash
     npm run dev
     ```
   - **Chạy bản Web-only (chỉ chạy Dev Server, khuyên dùng khi lập trình UI & debug Redux):**
     ```bash
     npm run dev:web
     ```
     *(Server chạy tại `http://localhost:5173`, giúp bạn mở trực tiếp trên Chrome để dùng extension Redux DevTools mượt mà).*


---

## 🏗️ 2. Quy trình thêm một tính năng mới (Feature)

Mỗi chức năng Redux (ví dụ: `auth`, `reports`) đều phải tuân thủ cấu trúc phẳng trong thư mục `src/feature/[tên-chức-năng]/`. Các giao diện trang hiển thị sẽ nằm độc lập trong thư mục `src/pages/[tên-trang]/`.

Hãy thực hiện theo các bước sau để thêm tính năng mới:

### Bước 1: Tạo thư mục chức năng mới
Ví dụ bạn muốn tạo chức năng quản lý phản ánh (`reports`):
```text
src/feature/reports/      # Thư mục logic Redux
├── reportAPI.ts          # Các hàm gọi API tới backend (hậu tố API viết hoa)
├── reportSaga.ts         # Saga quản lý tác vụ async (gọi API, side effects...)
└── reportSlice.ts        # Slice quản lý state & actions bằng Redux Toolkit

src/pages/reports/        # Thư mục chứa giao diện view riêng biệt
├── components/           # Component dành riêng cho trang reports
├── ReportQueuePage.tsx   # Trang danh sách hàng đợi tiếp nhận
└── ReportDetailPage.tsx  # Trang chi tiết phản ánh
```

### Bước 2: Viết API trong `reportAPI.ts`
Sử dụng `apiClient` từ `shared/lib/api.ts` hoặc axios trực tiếp để gọi API:
```typescript
import axios from 'axios'

export const reportAPI = {
  getReports: async (params?: any) => {
    const response = await axios.get('/reports', { params })
    return response.data
  }
}
```

### Bước 3: Định nghĩa State & Reducers trong `reportSlice.ts`
Sử dụng `@reduxjs/toolkit` để tạo slice:
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const reportSlice = createSlice({
  name: 'reports',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    fetchReportsRequest: (state) => { state.loading = true },
    fetchReportsSuccess: (state, action: PayloadAction<any>) => {
      state.loading = false
      state.list = action.payload
    },
    fetchReportsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    }
  }
})

export const { fetchReportsRequest, fetchReportsSuccess, fetchReportsFailure } = reportSlice.actions
export default reportSlice.reducer
```

### Bước 4: Xử lý Side Effects trong `reportSaga.ts`
Sử dụng `redux-saga` để bắt action request, gọi API và trả về kết quả:
```typescript
import { call, put, takeLatest } from 'redux-saga/effects'
import { reportAPI } from './reportAPI'
import { fetchReportsRequest, fetchReportsSuccess, fetchReportsFailure } from './reportSlice'

function* handleFetchReports() {
  try {
    const data = yield call(reportAPI.getReports)
    yield put(fetchReportsSuccess(data))
  } catch (error: any) {
    yield put(fetchReportsFailure(error.message))
  }
}

export function* reportSaga() {
  yield takeLatest(fetchReportsRequest.type, handleFetchReports)
}
```

### Bước 5: Đăng ký Slice và Saga vào Redux Store
- Thêm reducer mới vào `src/redux/rootReducer.ts`
- Thêm saga mới vào `src/redux/rootSaga.ts`

---

## 🎨 3. Thiết kế giao diện (UI/UX) với Tailwind v4

- Hãy sử dụng các màu sắc chủ đạo được định nghĩa trong hệ thống màu của dự án (xem ở CSS `@theme` trong `src/index.css`):
  - `bg-primary` / `text-primary` — Màu Navy chính của UBND.
  - `bg-secondary` / `text-secondary` — Xanh dương cho link, icon.
  - `bg-accent` — Xanh ngọc cho trạng thái đã xử lý xong.
  - `bg-danger` — Đỏ cho trường hợp quá hạn hoặc nút xoá.
- Đảm bảo thiết kế đáp ứng (Responsive) tốt trên màn hình máy tính từ `1366px` đến `2560px`.

## 🔍 4. Hướng dẫn Debug Redux Store trong môi trường Dev

Do nhân Electron v30+ có lỗi tương thích khiến các tiện ích mở rộng của Chrome (như Redux DevTools) không thể nạp trực tiếp vào cửa sổ Electron Desktop, bạn hãy sử dụng Google Chrome để debug trực quan:

1. Khởi động dự án bằng chế độ web-only (không mở app desktop):
   ```bash
   npm run dev:web
   ```
2. Mở trình duyệt **Google Chrome** và truy cập: `http://localhost:5173`
3. Nhấn **F12** và chọn tab **Redux** để sử dụng giao diện đồ họa theo dõi state, action và timeline mượt mà và trực quan nhất.




