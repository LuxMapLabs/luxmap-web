# LuxMap Web App — Web GIS Platform & Dashboard

Hệ thống bản đồ số GIS tích hợp IoT và thị giác máy tính để quản lý tài sản và sự cố chiếu sáng đường giao thông nông thôn.

## 🚀 Khởi chạy dự án

```bash
# Cài đặt thư viện
npm install

# Chạy Dev Server
npm run dev

# Build Production
npm run build
```

## 🛠️ Công nghệ sử dụng
- **Core:** React 18 + TypeScript + Vite
- **Styling:** TailwindCSS v4
- **State Management:** Redux Toolkit + Redux-Saga
- **Routing:** React Router v7
- **HTTP Client:** Axios với Token Interceptor

## 🚢 Deploy (tự động)

Mỗi lần merge vào **`dev`**, workflow [`.github/workflows/deploy-web.yml`](./.github/workflows/deploy-web.yml) tự chạy:
`npm ci && npm run build` với `VITE_API_URL=/api/v1` (web và API cùng domain `https://luxmap.com.vn`) → chặn bản build còn
trỏ `localhost:<cổng>` → `rsync` lên VPS → kiểm trang đang chạy đúng bundle vừa build. Không cần build tay hay quyền SSH.

- Build lỗi thì **không deploy**, bản đang chạy giữ nguyên. Workflow **không** chạy `npm test` — chạy test trước khi merge.
  Xem kết quả ở tab **Actions** của repo.
- **Quay lui:** revert commit lỗi trên `dev`, workflow tự deploy lại bản trước.
- Chạy lại thủ công: Actions → *Deploy web to VPS* → **Run workflow**.
- Secrets: `VPS_DEPLOY_KEY` (key chỉ được rsync vào thư mục web trên server), `VITE_MAPTILER_KEY`.

## 📚 Tài liệu tham khảo
- Xem hướng dẫn chi tiết tại [GUIDE.md](./GUIDE.md)
- Xem quy định phát triển tại [RULES.md](./RULES.md)
