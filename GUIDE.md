# 📖 HƯỚNG DẪN PHÁT TRIỂN (LUXMAP WEB APP DEVELOPER GUIDE)

Tài liệu này hướng dẫn cách cấu hình môi trường, chạy dự án, sinh Types từ Backend, quản lý Form & Validation và sử dụng bộ UI Components dùng chung theo chuẩn kiến trúc của **LuxMap Web App** (Web GIS Platform & SPA Dashboard).

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
4. **Cấu trúc Types theo từng Module:** Mỗi module sở hữu file type độc lập (ví dụ `src/types/auth.ts`, `src/types/common.ts`), import trực tiếp từ file tương ứng mà không dùng barrel index.

### 💻 Cách sử dụng Types & Gọi API trong Code:
Bạn có thể import trực tiếp từ `@/types/[module]` và gọi qua `apiClient`:
```typescript
import apiClient from '@/config/apiClient'
import type { LoginRequest, AuthResponse } from '@/types/auth'

// Ví dụ hàm gọi API (Base URL đã có sẵn /api/v1):
export const loginApi = async (payload: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', payload)
    return response.data.data
}
```


---

## 🛡️ 3. Quản lý Form & Xác thực dữ liệu với React Hook Form & Zod (`src/validations/`)

Toàn bộ hệ thống Form trong dự án tuân thủ tiêu chuẩn **100% Type-Safe**, kế thừa trực tiếp từ các kiểu dữ liệu tự động sinh trong `src/types/`.

### 📌 Nguyên tắc cốt lõi:
1. **Schema bắt buộc đi từ Type:** Khi viết schema Zod mới, luôn sử dụng cú pháp `satisfies z.ZodType<YourRequestType>` để TypeScript báo lỗi đỏ ngay nếu schema không khớp với Type từ Backend.
2. **Quy ước đặt tên file:** `src/validations/[module].schema.ts` (ví dụ: `auth.schema.ts`, `pole.schema.ts`).
3. **Regex chuẩn hóa:** Sử dụng `PHONE_REGEX` định dạng 10 số di động Việt Nam (`03, 05, 07, 08, 09`).

### 📝 Ví dụ định nghĩa Schema (`src/validations/auth.schema.ts`):
```typescript
import { z } from 'zod'
import type { LoginRequest } from '../types/auth'

export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, 'Vui lòng nhập Email hoặc Số điện thoại')
    .trim(),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
}) satisfies z.ZodType<LoginRequest>

export type LoginFormData = z.infer<typeof loginSchema>
```

### 💻 Cách sử dụng trong React Component:
```tsx
import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginFormData } from '@/validations/auth.schema'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { showToast } from '@/utils/toastUtils'

export const LoginForm: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    try {
      // Gọi API đăng nhập
      showToast.success('Đăng nhập thành công!')
    } catch (err) {
      showToast.error('Đăng nhập thất bại!')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Tài khoản (*)"
        placeholder="admin@civicflow.vn hoặc 0901234567"
        error={errors.emailOrPhone?.message}
        {...register('emailOrPhone')}
      />

      <Input
        label="Mật khẩu (*)"
        type="password"
        placeholder="Nhập mật khẩu"
        error={errors.password?.message}
        {...register('password')}
      />

      <Button type="submit" variant="primary" loading={isSubmitting} fullWidth>
        Đăng Nhập
      </Button>
    </form>
  )
}
```

---

## 🎨 4. Bộ UI Components Dùng Chung (Design System)

Tất cả các components dùng chung được đặt trực tiếp tại **`src/components/`** và import trực tiếp từ từng file component:

```typescript
// Import trực tiếp từ file component tương ứng
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { DateRangePicker } from '@/components/DateRangePicker'
import { showToast } from '@/utils/toastUtils'
```


### 📋 Danh sách Components & Cách Dùng:

1. **`Button`**:
   - `variant`: `'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost'`
   - `size`: `'sm' | 'md' | 'lg'`
   - `loading`: `true | false` (tự động hiện spinner và disable click)
   - `leftIcon` / `rightIcon`: Chèn Lucide icon linh hoạt.

2. **`Input` & `SearchInput`**:
   - Hỗ trợ `forwardRef` tương thích 100% với `react-hook-form`.
   - `label`, `helperText`, `error` (tự động đổi viền đỏ và hiện message báo lỗi).
   - `SearchInput`: Ô tìm kiếm nhanh kèm nút `X` xóa tức thì.

3. **`StatusBadge`**:
   - `type="fixture"`: Trạng thái bóng đèn (`normal`, `dim`, `out`, `unknown`).
   - `type="order"`: Trạng thái lệnh sửa chữa (`draft`, `assigned`, `in_progress`, `completed`, `cancelled`).
   - `type="sla"`: Tiến độ SLA (`ontime`, `warning`, `overdue`).

4. **`StatCard`**:
   - Thẻ hiển thị chỉ số KPI tổng quan, có biểu tượng màu sắc và xu hướng tăng/giảm (`trend`).

5. **`Modal` & `Drawer`**:
   - `Modal`: Hộp thoại popup xác nhận thao tác (Duyệt ngân sách, Xóa dữ liệu).
   - `Drawer`: Ngăn kéo trượt từ cạnh phải màn hình xem chi tiết cột đèn GIS.

6. **`DatePicker` & `DateRangePicker`**:
   - Chọn 1 ngày hoặc chọn khoảng thời gian.
   - Hỗ trợ `minDate` (khóa các ngày trước đó), `maxDate` (khóa các ngày sau đó).
   - Dropdown chọn nhanh Tháng & Năm với thanh cuộn siêu mảnh (`5px`).
   - Tự động đóng CHỈ KHI click ra ngoài.

7. **`showToast` (Sonner Wrapper)**:
   - `showToast.success('Tiêu đề', 'Mô tả chi tiết')`
   - `showToast.error(...)`, `showToast.warning(...)`, `showToast.info(...)`
   - `showToast.promise(asyncFunc, { loading: '...', success: '...', error: '...' })`

---

## 📅 5. Tiện ích Xử lý Thời gian (`src/utils/dateUtils.ts`)

- **`startOfDay(d)`**: Đưa thời gian về `00:00:00.000` triệt tiêu hoàn toàn sai lệch múi giờ.
- **`formatDate(d)`**: Định dạng ngày tháng chuẩn Việt Nam `DD/MM/YYYY`.
- **`formatDateRange(start, end)`**: Định dạng khoảng ngày `DD/MM/YYYY - DD/MM/YYYY`.
- **`isDateDisabled(d, minDate, maxDate)`**: Kiểm tra ngày có bị khóa hay không.
- **`getDateRangePresets()`**: Danh sách 4 phím tắt chọn nhanh (`Hôm nay`, `Hôm qua`, `7 ngày qua`, `30 ngày qua`).

---

## 📋 6. Hệ thống Enums Chuẩn Hóa (`src/constants/enums.ts`)

Khóa cứng và đồng bộ 100% theo **API Contract v1.1** & **Backend C# Identity (`UserRole.cs`)**:

- **`UserRole`**: `CITIZEN = 0`, `OFFICER = 1`, `LEADER = 2`, `ADMIN = 3`.
- **`FixtureStatus`**: `NORMAL = 'normal'`, `DIM = 'dim'`, `OUT = 'out'`, `UNKNOWN = 'unknown'`.
- **`FaultType`**: `LAMP_OUT`, `LAMP_DIM`, `SEGMENT_OUTAGE`, `NODE_OFFLINE`, `RUNTIME_DECLINE`.
- **`FaultStatus`**: `DETECTED`, `CONFIRMED`, `REJECTED`, `IN_PROGRESS`, `RESOLVED`, `VERIFIED`.
- **`WorkOrderStatus`**: `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `DONE`, `VERIFIED`, `CANCELLED`.
- **Bổ sung**: `FixtureType`, `PowerSource`, `Severity`, `SourceChannel`, `DataSource`, `NodeRole`, `NodeStatus`, `RoadClass`.

---

## 🏗️ 7. Quy trình thêm một tính năng mới (Feature)

Mỗi chức năng Redux tuân thủ cấu trúc phẳng trong thư mục `src/feature/[tên-chức-năng]/`. Các giao diện trang hiển thị nằm độc lập trong thư mục `src/pages/[tên-trang]/`.

### Cấu trúc chuẩn:
```text
src/
├── config/                 # Axios Client & Interceptors
├── constants/              # Enums chuẩn hóa toàn hệ thống
├── types/                  # TypeScript Types tự động sinh từ Swagger
├── utils/                  # Tiện ích dùng chung (dateUtils.ts...)
├── validations/            # Zod Validation Schemas (100% Type-Safe)
├── components/             # UI Components dùng chung (Button.tsx, Input.tsx, DatePicker.tsx...)
├── feature/assets/         # Thư mục logic Redux quản lý tài sản
│   ├── assetAPI.ts         # Gọi API tới backend
│   ├── assetSaga.ts        # Saga quản lý side effects
│   └── assetSlice.ts       # Slice quản lý state
└── pages/assets/           # Thư mục chứa giao diện view riêng biệt
    ├── components/         # Component riêng cho trang assets
    ├── AssetMapPage.tsx    # Trang bản đồ tài sản GIS
    └── AssetRegisterPage.tsx
```

---

## 🔍 8. Debug Redux Store & API Interceptor

- **Redux DevTools**: Dự án đã bật `devTools: true` trong `src/redux/store.ts`. Mở F12 chọn tab **Redux** để debug state timeline.
- **Token Interceptor**: `apiClient.ts` tự động gắn `Authorization: Bearer <token>` vào mọi request và tự động refresh token khi gặp mã lỗi `401 Unauthorized`.
