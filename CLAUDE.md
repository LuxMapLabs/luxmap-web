@RULES.md
@FLOWS.md

- Thư mục `../luxmap_backend` (và `../mobile` nếu có) chỉ dùng để đọc API/logic, tuyệt đối không sửa, xóa hay ghi đè. Mọi code chỉ viết cho frontend.

## Nguyên tắc làm việc (theo andrej-karpathy-skills)

- **Nghĩ trước khi code:** nêu giả định, có nhiều cách hiểu thì hỏi, không tự chọn. Khớp với bước "Lập Plan, chờ duyệt" trong `RULES.md` mục 4.
- **Đơn giản trước:** viết ít code nhất đủ giải quyết, không thêm tính năng hay trừu tượng không ai yêu cầu.
- **Sửa đúng chỗ:** mỗi dòng đổi phải truy được về yêu cầu. Không sửa `src/types/` (tự sinh) và `../luxmap_backend`. Thấy code chết có sẵn thì báo, không tự xóa.
- **Kiểm chứng:** xong khi `npx tsc --noEmit`, `npm run lint`, `npm run build` và test đều đạt.

## Phối hợp với agy (Antigravity CLI)

- Claude lo ý tưởng, plan, giao việc, review. Claude chỉ git add/commit khi tôi bảo, không tự commit. agy KHÔNG git add/commit/push.
- Sửa nhỏ (1-2 file) Claude tự làm. Việc nặng (nhiều file, code lặp) thì giao agy, sau khi plan được duyệt theo `RULES.md` mục 4.
- KHÔNG dùng `--yolo` / `--dangerously-skip-permissions`. agy chạy mode `auto` (tự chạy lệnh, không hỏi), `Non-Workspace Access = off`, luôn từ thư mục gốc frontend. An toàn nhờ `permissions.deny` trong `~/.gemini/antigravity-cli/settings.json` (chặn git ghi, npm install, `npm run gen`, xoá/di chuyển file, ghi `src/types/`, `package*.json`, `../luxmap_backend`, `../mobile`). Trên Windows mỗi luật phải có thêm dạng `command(regex:<lệnh>( .*)?)`. Sửa settings xong phải đóng khung agy và mở lại.
- Việc có ghi file chạy trên branch riêng, working tree sạch trước khi giao.

### Cách giao việc (qua terminal Orca để tôi xem trực tiếp)

KHÔNG dùng `agy -p`, KHÔNG dùng `/antigravity:delegate`, không chạy ngầm.

1. `orca terminal list --worktree active --json` tìm khung agy đang mở. Chưa có thì `orca terminal split --terminal <handle khung hiện tại> --direction vertical --command "agy" --json`. Dùng lại khung cũ.
2. Gửi spec: `orca terminal send --terminal <handle> --text "<spec>" --enter --json`. Spec dài thì ghi vào `.agy/task.md` rồi bảo agy đọc file đó (`.agy/` nằm trong `.gitignore`).
3. Chờ: `orca terminal wait --terminal <handle> --for tui-idle --timeout-ms 600000 --json`, đọc kết quả bằng `orca terminal read`.
4. Hiện cho tôi spec đã gửi và tóm tắt kết quả 5-10 dòng.
5. Agy treo, hỏi trust/quyền, hết quota thì dừng và báo tôi, không tự bấm, không tự thử cờ khác.

### Chia việc

- Chia task nhỏ, mỗi task một việc, tối đa khoảng 3-5 file, giao lần lượt. Review xong task này mới giao task kế.
- Mỗi spec phải có: mục tiêu, **danh sách file được sửa/tạo**, tiêu chí xong, và nhắc không sửa `src/types/` và `../luxmap_backend`.
- agy KHÔNG tạo/xoá/đổi tên/di chuyển file hoặc thư mục, không sửa `package.json`, dependency, file cấu hình (tsconfig, eslint, vite/next config...), trừ khi spec ghi rõ. Việc đổi cấu trúc do Claude tự làm hoặc làm thành task riêng.

### Review sau khi agy xong

1. `git status` + `git diff --stat`: có file ngoài danh sách, file bị xoá/đổi tên, hay đổi ở `src/types/` không. Có thì dừng, `git restore` phần ngoài phạm vi và báo tôi.
2. Chạy `tsc`, `lint`, `build`, test. Fail thì trả lại agy sửa.
3. Đọc diff chi tiết (không đọc cả file). Log dài thì pipe qua `tail`/`grep`.
4. Đạt thì báo tôi kết quả và chờ tôi bảo mới commit. Không tự commit. Không đạt thì ghi rõ lỗi và giao lại.
