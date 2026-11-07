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
> **Mục đích:** Hợp nhất 3 kênh phát hiện sự cố (Khảo sát đêm AI, Cảnh báo IoT, Người dân quét QR) $\rightarrow$ Đánh giá, xếp hạng ưu tiên và điều phối ca sửa chữa.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. INPUT SOURCES (Sensors & Citizen)                                                                           │
│    ├─ 1. Night Survey (Flow 04): CV ON/OFF & Lux Sensor Peaks (AI nhận diện camera & cảm biến quang)           │
│    ├─ 2. IoT Alerts (Flow 05): Độ lệch dòng/áp vượt ngưỡng (Current/Voltage Deviation >= Threshold), Offline   │
│    └─ 3. Citizen QR Scan: Người dân quét QR trên cột & gửi ảnh chụp sự cố                                     │
│    *(Ghi chú: CV & IoT là 2 kênh bằng chứng độc lập)*                                                         │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. LUXMAP BACKEND (AI, PostGIS & Queue)                                                                        │
│    └─ Automatic Fault Ingestion: Tự động gom & khử trùng lặp theo từng cột (De-duplication per pole)           │
│       Trạng thái: "detected"                                                                                  │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. MANAGER (Web GIS Dashboard)                                                                                 │
│    ├─ REVIEW & Cross-Check: Đánh giá & đối soát bằng chứng từ cả 3 nguồn (CV, IoT, Citizen)                    │
│    ├─ Kiểm tra tính hợp lệ:                                                                                   │
│    │    ├─ KHÔNG HỢP LỆ ──► Từ chối (Reject / False alarm / Invalid report)                                   │
│    │    └─ HỢP LỆ       ──► Xác nhận sự cố (Confirm Fault) -> Chuyển trạng thái: "confirmed"                  │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. THUẬT TOÁN XẾP HẠNG ƯU TIÊN (Priority Ranking Algorithm - Backend)                                         │
│    └─ Công thức: Mức độ nghiêm trọng (Severity) × Độ quan trọng của vị trí (Location Importance)              │
│       Phân cấp: Critical > High > Medium > Low                                                                │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 5. TẠO & ĐIỀU PHỐI LỆNH CÔNG TÁC (Create & Dispatch Work Order - Manager Web GIS)                              │
│    └─ Manager tạo WorkOrder dựa theo thứ tự ưu tiên & phân công cho Kỹ sư / Thợ điện                          │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 6. FIELD ENGINEER (Mobile App)                                                                                 │
│    └─ Nhận nhiệm vụ & thông báo (Receive Task & Notification), đồng bộ lịch ca trực trên Mobile App            │
│    └─ Tiến hành ra hiện trường sửa chữa (Chuyển tiếp sang LUỒNG 3)                                             │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. [LUỒNG 3] Lập lịch & Nghiệm thu ca công tác (Scheduling and Task Acceptance)
> **Mục đích:** Khép kín quy trình từ lúc giao việc $\rightarrow$ Kỹ sư thực hiện ngoài hiện trường có GPS dẫn đường & chụp ảnh nghiệm thu $\rightarrow$ Manager thẩm định $\rightarrow$ Cấp trên (Superior) giám sát tiến độ SLA & lưu trữ hồ sơ bảo hành.

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MANAGER (Planning, Dispatch & Verification)                                                                    │
│  ├─ 1. Create Work Order: Lập lệnh công tác (Kiểm tra sự cố / Sửa chữa / Khảo sát tuyến đường)                  │
│  └─ 2. Assign Engineer & Schedule: Gán Kỹ sư thực địa, ngày thực hiện & vật tư thay thế                        │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │ (Đồng bộ nhiệm vụ xuống Mobile)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FIELD ENGINEER (Mobile App Execution)                                                                          │
│  ├─ 3. Receive Task on Mobile App: Nhận ca trực & danh sách tài sản cần xử lý trên điện thoại                   │
│  ├─ 4. Start & GIS Route Navigation: Bản đồ số dẫn đường chính xác đến từng cột đèn / tuyến đường             │
│  └─ 5. Execute & Submit Field Report:                                                                          │
│       • Thực hiện: Thay bóng đèn / Sửa dây / Kiểm tra lỗi                                                      │
│       • Bắt buộc: Chụp ảnh bằng chứng hoàn thành (Mandatory After Photo)                                       │
│       • Nộp báo cáo ca trực hoàn tất (Submit shift completion report)                                          │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │ (Gửi báo cáo nghiệm thu về Web GIS)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MANAGER ĐỐI SOÁT & DUYỆT (Review & Acceptance)                                                                 │
│  ├─ 6. Review Field Report: Soi ảnh nghiệm thu sau sửa chữa & ghi chú thực địa                                 │
│  ├─ Quyết định nghiệm thu:                                                                                     │
│  │    ├─ CHƯA ĐẠT (Thiếu ảnh / sửa chưa xong) ──► Trả về yêu cầu làm lại (Return for Rework)                  │
│  │    └─ ĐẠT CHUẨN                            ──► 7. Verify & Close Fault                                      │
│  │                                                Chuyển trạng thái Order & Fault: "verified" (Completed)      │
└───────────────────────────────────────┬────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ SUPERIOR (Supervisory Authority & Audit - Cấp trên / Lãnh đạo giám sát)                                        │
│  ├─ Real-Time Status Visibility (Read-Only): Dashboard trực tiếp theo dõi tiến độ các ca công tác đang mở     │
│  ├─ SLA Oversight: Giám sát thời hạn xử lý cam kết (SLA) mà không làm gián đoạn điều phối                      │
│  └─ 8. Receive & Audit Maintenance Report (Governance):                                                        │
│       Lưu trữ hồ sơ nghiệm thu, tổng hợp chỉ số KPI & kiểm toán bảo hành thiết bị ──► Complete!               │
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
