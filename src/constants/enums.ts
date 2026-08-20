export enum LightStatus {
    NORMAL = 'normal',
    DIM = 'dim',
    OUT = 'out',
}

export enum FaultType {
    LAMP_OUT = 'lamp_out',
    LAMP_DIM = 'lamp_dim',
    SOLAR_RUNTIME_DEGRADED = 'solar_runtime_degraded',
    FEEDER_POWER_LOSS = 'feeder_power_loss',
    POLE_DAMAGED = 'pole_damaged',
}

export enum FaultStatus {
    DETECTED = 'detected',       // Mới phát hiện từ AI / IoT
    CONFIRMED = 'confirmed',     // Kỹ sư đã duyệt xác nhận
    RECLASSIFIED = 'reclassified', // Kỹ sư đã đổi loại
    REJECTED = 'rejected',       // Kỹ sư bác bỏ (AI nhận nhầm)
    RESOLVED = 'resolved',       // Đã sửa chữa xong
}

export enum WorkOrderStatus {
    NEW = 'new',
    ASSIGNED = 'assigned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    VERIFIED = 'verified',       // Kỹ sư đã nghiệm thu
    CANCELLED = 'cancelled',
}

export enum UserRole {
    MANAGEMENT_AGENCY = 'management_agency',     // Cơ quan quản lý
    MAINTENANCE_ENGINEER = 'maintenance_engineer', // Kỹ sư bảo trì
    FIELD_SURVEYOR_REPAIR = 'field_surveyor_repair', // Tổ khảo sát & sửa chữa
    ADMIN = 'admin',                             // Quản trị viên
}

export enum PowerSource {
    GRID = 'grid',
    SOLAR = 'solar',
}
