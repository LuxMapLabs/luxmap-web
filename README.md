# 🏛️ CivicFlow — Desktop Application

Nền tảng quản lý và phục vụ hành chính số dành cho Cán bộ (Officer), Lãnh đạo (Leader), và Quản trị viên (Admin) thuộc UBND cấp xã/phường.

---

## 🚀 Công nghệ sử dụng

- **Electron** — Desktop Wrapper
- **Vite** — Build tool cực nhanh
- **React 18 + TypeScript** — Xây dựng UI
- **Redux Toolkit + Redux-Saga** — Quản lý State & các Side Effects (gọi API)
- **Tailwind CSS v4** — Thiết kế giao diện hiện đại, tối ưu
- **Sonner** — Thư viện hiển thị Toast thông báo đẹp mắt

---

## 📁 Cấu trúc thư mục chính

```text
civicflow-desktop/
├── electron/          # Electron Process (quản lý Window, IPC, Preload)
│   ├── main.ts        # Electron Main process
│   └── preload.ts     # Preload script
└── src/               # React Frontend (Vite Renderer)
    ├── assets/        # Tài nguyên hình ảnh, SVGs
    │   └── images/
    │       └── icon.svg   # Icon hệ thống chính thức
    ├── components/    # Components dùng chung (Button, Table...)
    ├── constants/     # Hằng số hệ thống (routes, enums, colors...)
    ├── feature/       # Tầng Logic Redux (API, Saga, Slice) - Số ít
    │   └── [feature]/
    │       ├── [feature]API.ts  # API gọi backend (viết hoa API)
    │       ├── [feature]Saga.ts # Xử lý các tác vụ async
    │       └── [feature]Slice.ts# Quản lý state cục bộ
    ├── hooks/         # Custom hooks dùng chung
    ├── layouts/       # Khung layout ứng dụng (AppLayout, AuthLayout)
    ├── pages/         # Tầng giao diện (UI Views)
    │   └── [page]/
    │       ├── components/ # Component dành riêng cho trang
    │       └── [PageName].tsx # File view chính
    ├── redux/         # Cấu hình Redux chính (store, rootReducer, rootSaga)
    ├── types/         # Types/Interfaces dùng chung (ví dụ: auth.ts)
    ├── util/          # Các hàm tiện ích dùng chung (formatDate, helper...)
    └── validates/     # File kiểm tra dữ liệu hợp lệ (validation schemas)
```

---

## 🛠️ Lệnh phát triển & Build

### Khởi chạy môi trường phát triển (Dev)
```bash
npm run dev
```

### Kiểm tra Lint
```bash
npm run lint
```

### Đóng gói Build kiểm tra lỗi & đóng gói Windows Installer
```bash
npm run build
```

---

## 📜 Quy định & Hướng dẫn Phát triển
- **Quy trình làm việc**: Tuân thủ nghiêm ngặt Git workflow và kiểm tra build tại [RULES.md](./RULES.md).
- **Hướng dẫn lập trình**: Xem cách viết code, thêm feature, Redux Toolkit + Saga tại [GUIDE.md](./GUIDE.md).

