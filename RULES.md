# 📜 QUY ĐỊNH PHÁT TRIỂN DỰ ÁN LUXMAP WEB APP

Quy định này áp dụng cho toàn bộ lập trình viên Frontend tham gia phát triển mã nguồn của dự án **LuxMap Web App**. Tất cả các hành động trước khi commit và push lên GitHub đều phải tuân thủ nghiêm ngặt quy trình dưới đây.

---

## 🔄 1. Git Workflow, Quản lý Thư viện & Quy trình Commit/Push

Trước khi đẩy bất kỳ thay đổi nào lên Remote Repository, bạn bắt buộc phải thực hiện theo các bước sau:

### Bước 1: Quản lý Thư viện & Thống nhất Môi trường (`npm ci` vs `npm i`)
- **Phiên bản chuẩn**: Thống nhất sử dụng **Node.js v20 LTS** (hoặc v18+) và **npm v9+**.
- **Khi pull code về máy**: Luôn chạy lệnh:
  ```bash
  npm ci
  ```
  *(Lệnh `npm ci` đọc trực tiếp từ `package-lock.json`, cài đặt chuẩn xác 100% môi trường và TUYỆT ĐỐI KHÔNG làm thay đổi file `package-lock.json`).*
- **Khi cài thêm thư viện mới**:
  - Chạy `npm i <tên-thư-viện>` (hoặc `npm i -D <tên-thư-viện>` nếu là devDependency).
  - **Bắt buộc commit cả 2 file `package.json` và `package-lock.json`** lên Git để đồng bộ cho toàn bộ thành viên trong nhóm.
- **Nếu `package-lock.json` bị sửa ngoài ý muốn (Modified `M`) khi chỉ pull code**:
  - Chạy `git restore package-lock.json` để hoàn tác, không commit file lock nếu không cài thêm package mới.

### Bước 2: Chạy build kiểm tra lỗi cục bộ (Local Build Check)
Chạy lệnh build ngay tại thư mục dự án:
```bash
npm run build
```
- **Yêu cầu bắt buộc**: Bản build phải hoàn thành thành công 100%, không được chứa bất kỳ lỗi TypeScript, compile-time hay lỗi cú pháp nào.
- Nếu build thất bại, phải sửa sạch lỗi trước khi tiếp tục.

### Bước 3: Tạo nhánh chức năng mới (Feature Branch)
Để tránh ảnh hưởng trực tiếp đến các nhánh chính (`main`, `dev`), hãy tạo một nhánh làm việc riêng theo mã task trong TaskList:
```bash
# Ví dụ: từ nhánh làm việc hiện tại, chuyển sang nhánh mới
git checkout -b feature/FW-07-asset-map
```

### Bước 4: Đồng bộ mã nguồn từ nhánh `dev`
Pull phiên bản mới nhất từ nhánh `dev` của dự án về nhánh làm việc hiện tại của bạn:
```bash
git pull origin dev
```

### Bước 5: Xử lý xung đột (Conflict Handling)
Nếu quá trình pull xảy ra xung đột (conflict):
1. Mở IDE đối chiếu cẩn thận giữa phần code mới của bạn và phần code của các thành viên khác.
2. Giữ lại đầy đủ logic nghiệp vụ chính xác của cả hai bên.
3. Chạy lại `npm run build` để kiểm tra sau khi giải quyết conflict.

### Bước 6: Commit và Push lên GitHub
Khi build đã thành công và conflict được xử lý sạch sẽ:
```bash
git add .
git commit -m "feat(FW-07): hoàn thành bản đồ tài sản GIS lớp cột và feeder"
git push origin feature/FW-07-asset-map
```

---

## 🌐 2. Quy chuẩn Gọi API & Base URL (`/api/v1`)

1. **Cấu hình Base URL**: Cung cấp Host URL gốc trong file `.env` (ví dụ: `VITE_API_URL=http://localhost:5000`).
2. **Tiền tố `/api/v1` mặc định**: Hệ thống `apiClient` (`src/config/apiClient.ts`) đã tự động cấu hình gắn `/api/v1` vào Base URL (`http://localhost:5000/api/v1`).
3. **Đường dẫn trong API Files**: Khi định nghĩa các hàm gọi API trong `src/feature/[module]/*API.ts`, chỉ cần viết endpoint ngắn gọn:
   - ✅ **Đúng**: `apiClient.post('/auth/login', payload)`
   - ✅ **Đúng**: `apiClient.get('/poles')`
   - ✅ **Đúng**: `apiClient.post('/work-orders', data)`
   - ❌ **Không cần lặp lại**: `apiClient.post('/api/v1/auth/login', payload)`

---

## 📁 3. Quy chuẩn Cấu trúc Thư mục Dự án

- `src/feature/[module]/`: Chứa Redux Slice, Saga và API thực tế cho từng module nghiệp vụ.
- `src/pages/[page]/`: Chứa các trang UI kết nối Redux thực tế cho từng chức năng.
- `src/components/common/`: Chứa các UI Components tái sử dụng dùng chung chính thức khi triển khai các task.

---

## 💻 4. Nguyên tắc Code (Karpathy Coding Guidelines)

1. **Đơn giản tối đa (Simplicity First)**: Code ngắn gọn, trực diện nhất có thể để giải quyết đúng yêu cầu task giao. Không tự vẽ thêm tính năng ngoài đặc tả, không viết các tầng trừu tượng dư thừa (over-engineering).
2. **Thay đổi chính xác (Surgical Changes)**: Chỉ chỉnh sửa hoặc viết code liên quan trực tiếp đến module được phân công. Không tự ý format hay refactor lại code của người khác nếu đang hoạt động ổn định.
3. **Chuẩn hóa 4 trạng thái UI**: Mọi trang/component gọi API đều phải xử lý đầy đủ 4 trạng thái:
   - 🔄 **Loading** (Đang tải dữ liệu)
   - ✅ **Has-Data** (Có dữ liệu)
   - 📭 **Empty** (Dữ liệu rỗng)
   - ❌ **Error** (Bị lỗi kết nối)
