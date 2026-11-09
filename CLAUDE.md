@RULES.md
@FLOWS.md

- Thư mục `../luxmap_backend` (và `../mobile` nếu có) chỉ dùng để đọc API/logic, tuyệt đối không sửa, xóa hay ghi đè. Mọi code chỉ viết cho frontend.

## Nguyên tắc làm việc (theo andrej-karpathy-skills)

- **Nghĩ trước khi code:** nêu giả định, có nhiều cách hiểu thì hỏi, không tự chọn. Khớp với bước "Lập Plan, chờ duyệt" trong `RULES.md` mục 4.
- **Đơn giản trước:** viết ít code nhất đủ giải quyết, không thêm tính năng hay trừu tượng không ai yêu cầu.
- **Sửa đúng chỗ:** mỗi dòng đổi phải truy được về yêu cầu. Không sửa `src/types/` (tự sinh) và `../luxmap_backend`. Thấy code chết có sẵn thì báo, không tự xóa.
- **Kiểm chứng:** xong khi `npx tsc --noEmit`, `npm run lint`, `npm run build` và test đều đạt.
