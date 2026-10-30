# LUXMAP-WEB FRONTEND RULES

## 1. Tech Stack & Directory Structure
- **Stack**: React 18 + TypeScript 5 + Vite 5 | Redux Toolkit + **Redux-Saga** | TailwindCSS v4 + Lucide + Sonner | React Hook Form + Zod v4 | React Router v7 | MapLibre GL | Axios (`src/config/apiClient.ts`).
- **Structure (`src/`)**:
  - `types/`: 100% Auto-generated Backend DTOs & Enums (`npm run gen`). **READ-ONLY**.
  - `feature/<module>/`: Quản lý State & API theo chuẩn 3 files: `<module>API.ts`, `<module>Slice.ts`, `<module>Saga.ts`.
  - `redux/`: Root Store (`store.ts`, `rootReducer.ts`, `rootSaga.ts`).
  - `pages/<page>/` & `components/`: Màn hình chính, sub-components cục bộ và shared UI components.
  - `hooks/` & `utils/`: Custom hooks và hàm tiện ích thuần túy theo domain.
  - `test/`: Tập trung toàn bộ Unit/Integration Tests (`npx vitest run`).

---

## 2. Architecture Skeleton

### 2.1. Routes & RBAC (`src/App.tsx`)
Phân quyền qua `UserRole`: `Admin (3)`, `MaintenanceEngineer / Manager (1)`, `ManagementAgency / Superior (0)`, `FieldCrew (2)`:
- **Public**: `/login`, `/r/:code` & `/report` (Báo cáo QR người dân - không gọi `checkAuth`), `/forbidden`.
- **Manager (`MaintenanceEngineer`)**: `/dashboard`, `/gis-map`, `/work-schedule`, `/assets` (Tuyến, Tủ, Mạch, Cột, Đèn, IoT), `/citizen-reports`.
- **Superior (`ManagementAgency`)**: `/reports`, `/gis-map`.
- **Admin (`Admin`)**: `/admin/dashboard`, `/admin/system` (Users), `/admin/communes` (Địa bàn & BBox), `/admin/firmware`, `/admin/settings`.

### 2.2. State, API & Types Principle
- **Store**: Mọi state toàn cục đăng ký tại `src/redux/rootReducer.ts` và `src/redux/rootSaga.ts`. Khi làm module nào, mở trực tiếp `src/feature/<module>/` để xem Slice/Actions/Saga của module đó.
- **API Client (`src/config/apiClient.ts`)**: Đã gắn sẵn tiền tố `/api/v1`, HttpOnly Cookie & Token Interceptor, tự unwrap `response.data.data`. Trong `*API.ts` chỉ truyền path sau `/api/v1` (VD: `apiClient.get('/assets/poles')`, không lặp lại `/api/v1`).
- **Types (`src/types/`)**: Toàn bộ DTO và Enum nghiệp vụ nằm sẵn trong `src/types/` (chia theo domain: `common/`, `auth/`, `assets/`, `map/`, `workorders/`, `citizen/`, `faults/`, `admin/`). Bắt buộc mở `src/types/` tra cứu và import trực tiếp.

---

## 3. Core Engineering Rules & Anti-Patterns

### 3.1. Chu trình Dữ liệu Chuẩn (4-Tier Redux-Saga Flow)
`UI Component/Hook` --(`dispatch(actionRequest)`)--> `Slice` (bật loading) --> `Saga` (gọi `*API.ts` qua `apiClient`, xử lý `try/catch`, bắn `toast`) --(`put(Success/Failure)`)--> `Store` --(`useSelector`)--> `UI Re-render` (đảm bảo đủ 4 trạng thái: `Loading`, `Has-Data`, `Empty`, `Error`).

### 3.2. Những Điều TUYỆT ĐỐI CẤM (Strict Anti-Patterns)
1. **CẤM gọi API ngoài Redux-Saga**: Không dùng `fetch`, `axios`, `apiClient`, hay `createAsyncThunk` trực tiếp trong Component, Hook, hay `useEffect`.
2. **CẤM vi phạm API-Types-First**:
   - Không tự viết lại interface đã có trong `src/types/`, không dùng `as any`.
   - Không kế thừa/bọc type thừa (`extends`, `&`, `Omit`).
   - Không nhét state thuần UI (`isOpen`, `activeTab`) hoặc trường của thực thể khác vào DTO Backend (dữ liệu liên kết phải lookup bằng `.find()` từ Store).
3. **CẤM Mock Data & Fake Fallbacks**:
   - Không tạo dữ liệu giả hoặc fallback chuỗi bịa đặt trong `||`, `??` (như `'POLE-0001'`, `'Tuyến A'`).
   - Quy tắc fallback: Trong logic code dùng `''`; khi hiển thị UI thiếu dữ liệu dùng `'-'`.
4. **CẤM chạm vào Backend & Phá cấu trúc**:
   - Repo `../luxmap_backend` là **100% READ-ONLY**.
   - Không dùng `window.confirm` / `window.alert` (phải dùng Custom Modal).
   - Chỉ sửa đúng phạm vi task (Surgical Changes), không over-engineering.

---

## 4. Workflow Instructions for AI
Khi nhận task mới, thực hiện đúng thứ tự:
1. **Lập Plan (Tiếng Việt)**: Khảo sát code, trình bày phương án (Mục tiêu, File tác động, Types & Store sử dụng) và **chờ User duyệt trước khi code**.
2. **Kiểm tra Types & Store**: Đọc `src/types/<domain>/` và `src/feature/<domain>/` liên quan trước khi viết logic. Nếu Backend mới đổi schema, chạy `npm run gen`.
3. **Triển khai & Xác minh**: Giữ nguyên cấu trúc thư mục; kiểm tra lỗi tĩnh bằng `npx tsc --noEmit` và `npm run build` (không tự mở trình duyệt test).
