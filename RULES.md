# 📜 QUY ĐỊNH PHÁT TRIỂN DỰ ÁN CIVICFLOW

Quy định này áp dụng cho toàn bộ lập trình viên tham gia phát triển mã nguồn của dự án CivicFlow. Tất cả các hành động trước khi cam kết (commit) và đẩy mã nguồn (push) lên GitHub đều phải tuân thủ nghiêm ngặt quy trình dưới đây.

---

## 🔄 1. Git Workflow & Quy trình Commit/Push

Trước khi đẩy bất kỳ thay đổi nào lên Remote Repository, bạn bắt buộc phải thực hiện theo các bước sau:

### Bước 1: Chạy build kiểm tra lỗi cục bộ (Local Build Check)
Chạy lệnh build ngay tại thư mục dự án:
```bash
npm run build
```
- **Yêu cầu bắt buộc**: Bản build phải hoàn thành thành công 100%, không được chứa bất kỳ lỗi TypeScript, compile-time, hay cảnh báo ESLint nghiêm trọng nào.
- Nếu build thất bại, phải sửa sạch lỗi trước khi tiếp tục.

### Bước 2: Tạo nhánh chức năng mới (Feature Branch)
Để tránh ảnh hưởng trực tiếp đến các nhánh chính (`main`, `dev`), hãy tạo một nhánh làm việc riêng cho tính năng hoặc màn hình vừa hoàn thiện:
```bash
# Ví dụ: từ nhánh làm việc hiện tại, chuyển sang nhánh mới
git checkout -b feature/FD-01-init
```

### Bước 3: Đồng bộ mã nguồn từ nhánh `dev`
Pull phiên bản mới nhất từ nhánh `dev` của dự án về nhánh làm việc hiện tại của bạn để kiểm tra tính tương thích:
```bash
git pull origin dev
```

### Bước 4: Xử lý xung đột (Conflict Handling)
Nếu quá trình pull xảy ra xung đột (conflict):
1. **Xác định cụ thể**: Tìm các file bị xung đột và các khối dòng bị chồng chéo.
2. **Giải quyết xung đột**:
   - Mở IDE, đối chiếu cẩn thận giữa phần code mới của bạn và phần code mới nhất của các thành viên khác trên nhánh `dev`.
   - Kết hợp code chính xác, giữ lại đầy đủ logic nghiệp vụ của cả hai bên.
3. **Build lại kiểm tra**: Sau khi giải quyết xong conflict, bắt buộc chạy lại `npm run build` để đảm bảo code sau khi giải quyết vẫn chạy và biên dịch bình thường.

### Bước 5: Commit và Push lên GitHub
Khi build đã thành công và conflict được xử lý sạch sẽ:
```bash
git add .
git commit -m "feat: hoàn thành khởi tạo dự án và cấu hình thư mục"
git push origin feature/FD-01-init
```

---

## 💻 2. Nguyên tắc Code (Coding Guidelines)

Dựa trên hướng dẫn **Karpathy Guidelines** đã thống nhất:
- **Đơn giản tối đa (Simplicity First)**: Code ngắn gọn nhất có thể để giải quyết đúng vấn đề được giao. Không tự vẽ thêm tính năng, không viết các lớp trừu tượng dư thừa (over-engineering).
- **Thay đổi chính xác (Surgical Changes)**: Chỉ chỉnh sửa hoặc viết code liên quan trực tiếp đến nhiệm vụ hiện tại. Không refactor hoặc định dạng lại code cũ xung quanh của người khác nếu nó đang hoạt động ổn định.
- **Thử nghiệm trước khi bàn giao**: Phải thực hiện kiểm tra tay cẩn thận các trạng thái hiển thị của UI (Tải dữ liệu / Có dữ liệu / Trống / Bị lỗi) trước khi bàn giao.
