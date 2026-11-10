# CÁC LUỒNG HOẠT ĐỘNG CHÍNH - LUXMAP (SYSTEM FLOWS)

Hệ thống LuxMap được thiết kế chuẩn hóa xoay quanh **5 luồng nghiệp vụ cốt lõi**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        HỆ SINH THÁI LUXMAP (5 LUỒNG)                        │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
 ├── [LUỒNG 1] Nạp tài sản từ File & Quét QR gán GPS (Onboarding & QR-GPS Binding)
 ├── [LUỒNG 2] Phát hiện & Xử lý sự cố (Fault Detection & Handling)
 ├── [LUỒNG 3] Lập lịch & Nghiệm thu ca công tác (Scheduling & Task Acceptance)
 ├── [LUỒNG 4] Khảo sát ban đêm bằng ảnh/clip ngắn AI (Night Survey with CV)
 └── [LUỒNG 5] Điều khiển Bật/Tắt/Auto & Giám sát điện năng (Control & Monitoring)
```

---

## 1. [LUỒNG 1] Nạp tài sản từ File & Quét QR gán tọa độ GPS
> **Mục đích:** Xã nạp danh sách tài sản từ giấy tờ/sổ sách lên hệ thống, sau đó in tem QR và đi thực địa quét mã để gán GPS chính xác từng cột.

```
[1. Manager trên Web GIS]
     │
     │──► Nhập 1 file Excel/CSV tổng hợp (Tuyến, Tủ, Mạch, Cột, Đèn - cột GPS để trống)
     ▼
[Hệ thống lưu tài sản] ──► Trạng thái: "Chưa có GPS"
     │
     │──► Manager bấm "In Tem QR" (dàn trang in khổ A4)
     │──► Tạo Lịch công tác giao cho kỹ sư đi thực địa
     ▼
[2. Kỹ sư ra thực địa]
     │
     │──► Cầm cuộn tem QR ra tuyến đường, dán lên từng thân cột
     │──► Mở Mobile App -> Quét mã QR vừa dán trên cột
     ▼
[Mobile App tự bắt GPS] ──► Tự lấy tọa độ thực tế ngay tại chân cột
     │
     │──► Gửi API cập nhật tọa độ GPS cho cột đó
     ▼
[3. Bản đồ Web GIS] ──► Cột tự động chuyển sang "Đã định vị" & xuất hiện trên bản đồ vệ tinh!
```

---

## 2. [LUỒNG 2] Phát hiện & Xử lý sự cố (Fault Detection & Handling)
> **Mục đích:** Hợp nhất 3 kênh phát hiện sự cố (Khảo sát đêm AI/CV, Cảnh báo IoT, Phản ánh hiện trường & Người dân quét QR) $\rightarrow$ Đối soát, khử trùng lặp, xếp hạng ưu tiên và điều phối ca công tác (thủ công hoặc tự động Auto-Dispatch).

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. INPUT SOURCES (3 Kênh đầu vào: CV, IoT & Field/Citizen Report)                                              │
│    ├─ 1. Night Survey (Flow 04 - Kênh cv): AI nhận diện bóng ON/OFF & đối chiếu đỉnh cảm biến quang (Peak Lux) │
│    ├─ 2. IoT Alerts (Flow 05 - Kênh iot): Thiết bị tủ điện mất kết nối (node_offline) / suy giảm (runtime)     │
│    └─ 3. Field & Citizen QR Scan (Kênh field_report): Kỹ sư báo lỗi hiện trường hoặc Người dân quét QR cột đèn │
│    *(Ghi chú: CV & IoT là 2 kênh bằng chứng tự động độc lập; QR người dân có kiểm tra khoảng cách GPS <= 200m)*│
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼ (Kênh CV / IoT / Kỹ sư)               ▼ (Kênh Người dân quét mã QR `/r/{code}`)
┌───────────────────────────────────────────────┐   ┌────────────────────────────────────────────────────────────┐
│ 2A. AUTOMATIC FAULT INGESTION (Backend)       │   │ 2B. CITIZEN REPORT QUEUE (Hàng đợi phản ánh người dân)     │
│  ├─ Tự động gom & khử trùng lặp theo từng cột │   │  ├─ Lưu vào hàng đợi `citizen_report` (Status: "pending")  │
│  ├─ Phân cụm sự cố cùng nguyên nhân (Cluster) │   │  ├─ Đánh dấu cảnh báo nếu vị trí gửi cách cột > 200m       │
│  └─ Trạng thái khởi tạo: "detected"           │   │  └─ AI chạy gợi ý tự động trên ảnh đính kèm của người dân  │
└───────────────────┬───────────────────────────┘   └───────────────────────┬────────────────────────────────────┘
                    │                                                       │
                    └───────────────────┬───────────────────────────────────┘
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. MANAGER ĐỐI SOÁT & XÁC NHẬN (Web GIS Dashboard & Citizen Review)                                            │
│    ├─ A. Với sự cố "detected" (CV / IoT):                                                                      │
│    │    ├─ KHÔNG HỢP LỆ ──► Từ chối (Reject / Báo động giả) -> Trạng thái: "rejected"                          │
│    │    └─ HỢP LỆ       ──► Xác nhận (Confirm) / Đổi phân loại (lamp_out <-> lamp_dim), gán mức độ Severity    │
│    │                        -> Chuyển trạng thái: "confirmed"                                                  │
│    └─ B. Với phản ánh QR người dân ("pending"):                                                                │
│         ├─ KHÔNG HỢP LỆ ──► Từ chối phản ánh (kèm lý do bắt buộc) -> Trạng thái: "rejected"                    │
│         ├─ TRÙNG SỰ CỐ  ──► Gộp (Merge) vào sự cố đang mở sẵn trên cùng cột đèn -> Trạng thái: "merged"        │
│         └─ HỢP LỆ MỚI   ──► Duyệt (Accept) -> Tự động tạo Fault mới ở trạng thái "confirmed" ngay lập tức      │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. THUẬT TOÁN XẾP HẠNG ƯU TIÊN (Priority Ranking Algorithm - Backend)                                          │
│    └─ Đánh giá theo Mức độ nghiêm trọng (Severity: Critical > High > Medium > Low), Điểm ưu tiên vị trí        │
│       nhạy cảm (`near_sensitive_poi` / `priority_score`) và Thời điểm phát hiện (`detected_at`)                │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. LẬP & ĐIỀU PHỐI LỆNH CÔNG TÁC (Manual Dispatch / Auto-Dispatch - Manager Web GIS)                           │
│    ├─ Tạo thủ công: Manager chọn các sự cố trên tuyến đường để giao ca Kiểm tra (Inspection) / Sửa chữa        │
│    └─ Tự động (Auto-Dispatch): Hệ thống gom nhóm sự cố theo tuyến (tối đa 8 cột/ca), tự động cân bằng tải      │
│       theo định mức ca/ngày (`QuotaPerDay`) và chọn Kỹ sư phụ trách địa bàn xã tương ứng                       │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 6. FIELD ENGINEER (Mobile App)                                                                                 │
│    └─ Nhận thông báo & đồng bộ lịch ca trực trên Mobile App (hỗ trợ Offline-first qua `sync_queue`)            │
│    └─ Tiến hành ra hiện trường xử lý theo chuỗi công việc (Chuyển tiếp sang LUỒNG 3)                           │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. [LUỒNG 3] Lập lịch & Nghiệm thu ca công tác (Scheduling and Task Acceptance)
> **Mục đích:** Khép kín vòng đời lệnh công tác theo **chuỗi 3 giai đoạn (`Survey` $\rightarrow$ `Inspection` $\rightarrow$ `Repair`)** gắn kết qua `case_id` $\rightarrow$ Kỹ sư thực hiện ngoài hiện trường có GIS dẫn đường & chụp ảnh nghiệm thu $\rightarrow$ Manager thẩm định $\rightarrow$ Cấp trên (Superior) giám sát SLA & kiểm toán bảo hành.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MANAGER (Planning, Chain Dispatch & Schedule Management)                                                       │
│  ├─ 1. Create / Follow-up Work Order (Theo chuỗi liên kết `case_id` / `parent_work_order_id`):                 │
│  │      • Giai đoạn 1 - Khảo sát (`survey`): Giao tuyến đường khảo sát định kỳ hoặc đột xuất                   │
│  │      • Giai đoạn 2 - Kiểm tra (`inspection`): Kế thừa các cột lỗi từ khảo sát hoặc sự cố `detected`         │
│  │      • Giai đoạn 3 - Sửa chữa (`repair`): Kế thừa các sự cố đã xác nhận (`confirmed` / `fault_present`)     │
│  └─ 2. Assign Engineer & Schedule: Gán Kỹ sư thực địa, lịch thực hiện (`scheduled_date`, `due_date`)           │
│        & ghi chú vật tư dự kiến (`materials_note`) -> Trạng thái WorkOrder: "assigned"                         │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │ (Đồng bộ nhiệm vụ xuống Mobile App)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FIELD ENGINEER (Mobile App Execution - Offline-First)                                                          │
│  ├─ 3. Receive Task on Mobile App: Nhận ca trực & danh sách cột/sự cố;                                         │
│  │      *(Nếu bận đột xuất khi chưa bắt đầu: Có thể gửi Yêu cầu xin hủy ca `request_cancellation` để đổi người)*│
│  ├─ 4. Start & GIS Route Navigation: Bấm Bắt đầu ("start" -> `in_progress`, sự cố Repair sang `in_progress`),  │
│  │      bản đồ số dẫn đường đến từng cột đèn / tuyến đường                                                     │
│  └─ 5. Execute & Submit Field Report (Bấm Hoàn thành "complete" -> Chuyển trạng thái WorkOrder: "done"):       │
│       • Nếu là ca Kiểm tra (`inspection`): Chốt kết quả từng cột (`fault_present` / `fault_absent` / ...)      │
│       • Nếu là ca Sửa chữa (`repair`): Thay bóng/sửa dây, nhập vật tư thực tế (`materials_used`) &             │
│         BẮT BUỘC chụp ảnh bằng chứng hoàn thành sau sửa chữa (Mandatory `After` Evidence Photo)                │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │ (Gửi báo cáo nghiệm thu về Web GIS)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MANAGER ĐỐI SOÁT, DUYỆT & KẾ THỪA CHUỖI (Review, Acceptance & Follow-Up)                                       │
│  ├─ 6. Review Field Report: Đối soát ảnh minh chứng (`Before`/`After`), kết quả kiểm tra & ghi chú thực địa    │
│  ├─ Quyết định nghiệm thu:                                                                                     │
│  │    ├─ CHƯA ĐẠT (Thiếu ảnh / sửa chưa đạt) ──► Trả về yêu cầu làm lại ("return" -> Quay về `in_progress`)    │
│  │    └─ ĐẠT CHUẨN ("verify")                ──► 7. Verify & Transition State:                                 │
│  │         • WorkOrder chuyển sang trạng thái: "verified" (Đã nghiệm thu đóng ca)                              │
│  │         • Nếu là `inspection`: Các sự cố `fault_present` tự động chuyển `detected` -> `confirmed`,          │
│  │           Manager có thể bấm [Tạo lịch tiếp theo (`follow_up`)] để sinh ca `repair` kế thừa danh sách lỗi   │
│  │         • Nếu là `repair`: Các sự cố liên kết tự động chuyển `in_progress` -> `resolved` -> `verified`      │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SUPERIOR (Supervisory Authority & Audit - Lãnh đạo / Cơ quan quản lý cấp trên)                                 │
│  ├─ Real-Time Status Visibility (Read-Only): Dashboard & Bản đồ theo dõi trực tiếp tiến độ toàn địa bàn        │
│  ├─ SLA Oversight: Giám sát tỷ lệ xử lý đúng hạn (Repair Timeliness / Overdue SLA) không làm gián đoạn điều phối│
│  └─ 8. Receive & Audit Maintenance Report (Governance):                                                        │
│       Tra cứu/xuất PDF hồ sơ nghiệm thu, thống kê KPI vận hành & kiểm toán bảo hành thiết bị ──► Complete!     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. [LUỒNG 4] Khảo sát ban đêm bằng ảnh/video ngắn hỗ trợ bởi AI (Night Survey with CV)
> **Mục đích:** Kỹ sư đi tuần tra ban đêm dọc tuyến đường, phát hiện cột đèn nào bị mờ/tắt/lỗi thì **dừng lại chụp ảnh hoặc quay clip ngắn** $\rightarrow$ AI (Computer Vision) nhận diện & phân loại tự động $\rightarrow$ Đẩy vào Luồng 2 để xử lý sự cố.

```
[1. Manager trên Web GIS]
     │
     │──► Giao nhiệm vụ khảo sát đêm theo tuyến đường (Assign survey route to Field Engineer)
     ▼
[2. Kỹ sư đi tuần tra ban đêm trên tuyến (Mobile App)]
     │
     │──► Di chuyển dọc theo tuyến đường khảo sát
     │──► KHI THẤY TRỤ CÓ VẤN ĐỀ (Đèn tắt, đèn mờ, chớp nháy):
     │      • Dừng xe lại tại trụ đó
     │      • Chụp ảnh hiện trường hoặc quay 1 clip ngắn (Photo / Short Video)
     ▼
[3. Tải dữ liệu lên hệ thống (Upload photo/short video)]
     │
     │──► Tự động đính kèm tọa độ GPS vị trí cột & dữ liệu cảm biến đo sáng (Lux)
     ▼
[4. AI Computer Vision tự động phân tích (AI classifies pole)]
     │
     │──► AI nhận diện trạng thái bóng đèn: BẬT (On) / TẮT (Off) / MỜ (Dimmed) / LỖI
     ▼
[5. Kỹ sư xác nhận kết quả trên Mobile (Field Engineer Review)]
     │
     │──► Kỹ sư xem lại nhãn AI gán và bấm xác nhận
     ▼
[6. Manager duyệt kết quả khảo sát trên Web (Manager Approval)]
     │
     │──► Manager phê duyệt kết quả khảo sát đêm
     │──► Tự động tạo bản ghi sự cố chuyển sang [LUỒNG 2: FAULT INGESTION]!
```

---

## 5. [LUỒNG 5] Điều khiển Bật/Tắt/Auto & Giám sát dòng điện (ON / OFF / AUTO Control & Monitoring)
> **Mục đích:** Điều khiển rơ-le cấp nguồn chiếu sáng theo 3 cấp độ ưu tiên (Manual > Schedule > Auto) và giám sát quá dòng/lệch áp để cảnh báo sự cố.

```
                        ┌────────────────────────┐
                        │      CHỌN CHẾ ĐỘ       │
                        │  (Select Control Mode) │
                        └───────────┬────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼ (Thủ công)               ▼ (Theo lịch)              ▼ (Tự động)
┌──────────────────┐       ┌──────────────────┐       ┌────────────────────────┐
│   PRIORITY 1     │       │   PRIORITY 2     │       │      PRIORITY 3        │
│     MANUAL       │       │    SCHEDULE      │       │         AUTO           │
│ (Ưu tiên cao nhất)│       │  (Ưu tiên nhì)   │       │   (Ưu tiên cơ bản)     │
└────────┬─────────┘       └────────┬─────────┘       └───────────┬────────────┘
         │                          │                             │
   [Lệnh trực tiếp]         [Khung giờ tắt tiết kiệm?]    [Khung thời gian?]
         │                   (VD: 20:00 - 22:00)                  │
         ├─ Force ON                │                             ├─ Đêm (18h-06h) ──► Relay ON
         │    ▼                     ├─ Đúng giờ tắt               │                      (Cấp nguồn)
         │  Relay ON                │    ▼                        └─ Ngày (06h-18h)
         │  (Cấp nguồn)             │  Relay OFF                       │
         │                          │  (Cắt nguồn tiết kiệm điện)       ▼
         └─ Force OFF               │                             [Cảm biến ánh sáng]
              ▼                     └─ Ngoài giờ tắt              (Sensor lux < threshold?)
            Relay OFF                    ▼                             │
            (Cắt nguồn tiết kiệm)      Relay ON                        ├─ Trời bão/tối ──► Relay ON
                                       (Bật lại bình thường)           └─ Trời sáng    ──► Relay OFF
```

> **Nguyên tắc ưu tiên (Priority Order):**
> 1. **Manual (Thủ công):** Lệnh bật/tắt cưỡng bức của con người luôn có quyền đè (override) mọi chế độ khác.
> 2. **Schedule (Lịch hẹn):** Áp dụng khi không có lệnh thủ công.
> 3. **Auto (Tự động cảm biến & thời gian):** Tự động thích ứng theo giờ và thời tiết thực tế (trời mưa bão, trời tối thì tự bật dù ban ngày).
> *Khi dòng điện/điện áp đo được lệch ngưỡng $\ge$ quy định hoặc thiết bị offline $\rightarrow$ Kích hoạt cảnh báo IoT gửi thẳng về **[LUỒNG 2: INPUT SOURCES]**.*
