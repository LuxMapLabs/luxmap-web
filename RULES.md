# LUXMAP-WEB FRONTEND RULES

## 1. Công nghệ & Cấu trúc

- **Stack:** React, TypeScript, Vite, Redux Toolkit, Redux-Saga, TailwindCSS, Lucide, Sonner, React Hook Form, Zod, React Router, MapLibre GL, Axios.
- **Thư mục chính (`src/`):**
  - `types/`: Chứa DTO & Enum tự động từ Backend (`npm run gen`) - **Chỉ đọc, không sửa**.
  - `feature/<tên_module>/`: Quản lý State & API theo bộ 3 file: `*API.ts`, `*Slice.ts`, `*Saga.ts`.
  - `redux/`: Store tổng (`store.ts`, `rootReducer.ts`, `rootSaga.ts`).
  - `pages/` & `components/`: Màn hình giao diện và component dùng chung.
  - `hooks/` & `utils/`: Custom hooks và hàm tiện ích.
  - `test/`: Toàn bộ Unit/Integration Tests.

---

## 2. Phân quyền & Định tuyến (`src/App.tsx`)

- **Public:** `/login`, `/r/:code` & `/report` (Quét QR người dân), `/privacy`, `/forbidden`.
- **Manager (`MaintenanceEngineer`):** `/dashboard`, `/gis-map`, `/work-schedule`, `/assets`, `/citizen-reports`.
- **Superior (`ManagementAgency`):** `/reports`, `/gis-map`.
- **Admin (`Admin`):** `/admin/dashboard`, `/admin/system`, `/admin/communes`, `/admin/firmware`, `/admin/settings`.

---

## 3. Nguyên tắc cốt lõi & Những điều TUYỆT ĐỐI CẤM

### 3.1. Luồng dữ liệu chuẩn (Redux-Saga)

`UI Component` --(dispatch)--> `Slice` (loading) --> `Saga` (gọi API qua `apiClient`, try/catch, toast) --(put)--> `Store` --(useSelector)--> `UI Re-render`.
_Luôn xử lý đủ 4 trạng thái UI:_ `Loading`, `Có dữ liệu`, `Rỗng (Empty)`, `Lỗi (Error)`.

### 3.2. Những điều CẤM:

1. **CẤM gọi API ngoài Saga:** Không dùng `axios`, `fetch`, `apiClient` trực tiếp trong Component hay `useEffect`.
2. **CẤM sửa/tự tạo Types:** Dùng trực tiếp DTO trong `src/types/`. Không dùng `any`, không bọc thừa (`extends`, `&`, `Omit`).
3. **CẤM Mock Data & Bịa Fallback:** Không bịa dữ liệu giả (`'POLE-001'`, `'Tuyến A'`). Giá trị rỗng dùng `''`, khi hiển thị thiếu dữ liệu dùng `'-'`.
4. **CẤM dùng dialog mặc định:** Không dùng `window.confirm`, `window.alert` (phải dùng Custom Modal).
5. **CẤM sửa Backend:** Repo `../luxmap_backend` là **Read-Only**. Chỉ sửa code đúng phạm vi task frontend.

---

## 4. Quy trình làm việc

1. **Lập Plan (Tiếng Việt):** Trình bày rõ mục tiêu, file tác động, Types & Store sử dụng $\rightarrow$ **Chờ User duyệt trước khi code**.
2. **Kiểm tra Types & Store:** Chạy `npm run gen` . Sau đó mở `src/types/` và `src/feature/` đọc trước khi viết logic.
3. **Triển khai & Kiểm tra:** Viết code chuẩn và luôn chạy xác thực:
   - `npx tsc --noEmit`
   - `npm run lint`
   - `npm run build`
