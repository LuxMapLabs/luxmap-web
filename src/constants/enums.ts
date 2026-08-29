/**
 * LuxMap System Enums (Khoá Cứng theo API Contract v1.1 & Backend C#)
 * Tham chiếu tài liệu: api-contract-v1.1.md Mục 1 & CivicFlow.Modules.Identity.Entities.UserRole
 */

/**
 * Vai trò người dùng (Khớp 100% Backend C# UserRole.cs & Swagger)
 */
export enum UserRole {
  CITIZEN = 0, // Người dân — chỉ thấy phản ánh của mình và dữ liệu công khai
  OFFICER = 1, // Cán bộ — thấy toàn bộ dữ liệu thuộc đơn vị hành chính của mình
  LEADER = 2,  // Lãnh đạo — xem số liệu tổng hợp, không sửa dữ liệu nghiệp vụ
  ADMIN = 3,   // Quản trị — toàn hệ thống
}

/**
 * Trạng thái bóng đèn chiếu sáng (Màu sắc trên GIS Map)
 */
export enum FixtureStatus {
  NORMAL = 'normal',   // Hoạt động bình thường
  DIM = 'dim',         // Sáng yếu / suy giảm quang thông (Giá trị cốt lõi đề tài)
  OUT = 'out',         // Mất sáng hoàn toàn
  UNKNOWN = 'unknown', // Sweep gần nhất không phủ được (bị che, ảnh hỏng, chưa quét)
}

/**
 * Nguồn cấp điện của cột đèn
 */
export enum PowerSource {
  GRID = 'grid',   // Lưới điện quốc gia
  SOLAR = 'solar', // Năng lượng mặt trời
}

/**
 * Loại thiết bị chiếu sáng
 */
export enum FixtureType {
  LED_ROAD_LAMP = 'led_road_lamp',       // Đèn LED đường phố
  SOLAR_ALL_IN_ONE = 'solar_all_in_one', // Đèn năng lượng mặt trời All-in-One
}

/**
 * Phân loại sự cố kỹ thuật
 */
export enum FaultType {
  LAMP_OUT = 'lamp_out',               // Đèn tắt / mất sáng
  LAMP_DIM = 'lamp_dim',               // Đèn suy giảm quang thông / sáng yếu
  SEGMENT_OUTAGE = 'segment_outage',   // Sự cố mất điện cả tuyến đường
  NODE_OFFLINE = 'node_offline',       // Mất kết nối cảm biến IoT
  RUNTIME_DECLINE = 'runtime_decline', // Thời lượng phát sáng suy giảm (từ IoT)
}

/**
 * Trạng thái vòng đời của sự cố
 */
export enum FaultStatus {
  DETECTED = 'detected',       // Mới phát hiện (từ CV, IoT hoặc người dân báo)
  CONFIRMED = 'confirmed',     // Kỹ sư/Cán bộ đã duyệt xác nhận
  REJECTED = 'rejected',       // Bác bỏ (AI nhận diện nhầm)
  IN_PROGRESS = 'in_progress', // Đang trong quá trình sửa chữa
  RESOLVED = 'resolved',       // Đội bảo trì đã sửa chữa xong
  VERIFIED = 'verified',       // Kỹ sư/Lãnh đạo đã nghiệm thu chất lượng
}

/**
 * Mức độ nghiêm trọng của sự cố
 */
export enum Severity {
  LOW = 'low',           // Thấp
  MEDIUM = 'medium',     // Trung bình
  HIGH = 'high',         // Cao
  CRITICAL = 'critical', // Khẩn cấp (nguy hiểm an toàn giao thông)
}

/**
 * Kênh phát hiện sự cố
 */
export enum SourceChannel {
  CV = 'cv',                     // Thị giác máy tính (quét ban đêm)
  IOT = 'iot',                   // Cảm biến đo sáng / vi điều khiển IoT
  FIELD_REPORT = 'field_report', // Báo cáo hiện trường / phản ánh người dân
}

/**
 * Nguồn gốc dữ liệu thu thập
 */
export enum DataSource {
  FIELD = 'field',                     // Đo đạc thực địa
  PUBLIC_IMAGERY = 'public_imagery',   // Ảnh vệ tinh / ảnh công cộng
  CALIBRATION_RIG = 'calibration_rig', // Dữ liệu từ thiết bị hiệu chuẩn
  SIMULATED = 'simulated',             // Dữ liệu mô phỏng
}

/**
 * Trạng thái Lệnh sửa chữa / Phiếu bảo trì (Work Order)
 */
export enum WorkOrderStatus {
  OPEN = 'open',               // Mới tạo / Chờ phân công
  ASSIGNED = 'assigned',       // Đã giao cho Đội thi công
  IN_PROGRESS = 'in_progress', // Đang tiến hành sửa chữa ngoài hiện trường
  DONE = 'done',               // Đội thi công báo cáo đã hoàn tất
  VERIFIED = 'verified',       // Kỹ sư đã nghiệm thu hiện trường
  CANCELLED = 'cancelled',     // Huỷ bỏ lệnh
}

/**
 * Vai trò của Node cảm biến IoT
 */
export enum NodeRole {
  SEGMENT_CONTROLLER = 'segment_controller', // Bộ điều khiển tuyến đường
  SAMPLED_FIXTURE = 'sampled_fixture',       // Cảm biến lấy mẫu trên từng bóng
}

/**
 * Trạng thái kết nối của Node cảm biến IoT
 */
export enum NodeStatus {
  ONLINE = 'online',                 // Đang kết nối
  OFFLINE = 'offline',               // Mất kết nối
  NEVER_REPORTED = 'never_reported', // Chưa từng gửi dữ liệu
}

/**
 * Phân cấp tuyến đường giao thông nông thôn
 */
export enum RoadClass {
  INTER_COMMUNE = 'inter_commune', // Đường liên xã
  INTER_VILLAGE = 'inter_village', // Đường liên thôn / xóm
}
