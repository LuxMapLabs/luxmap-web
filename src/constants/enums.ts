export enum ReportStatus {
    RECEIVED = 'received',
    IN_PROGRESS = 'in_progress',
    RESOLVED = 'resolved',
    REJECTED = 'rejected',
    CLOSED = 'closed',
}

export enum WorkOrderStatus {
    NEW = 'new',
    ASSIGNED = 'assigned',
    IN_PROGRESS = 'in_progress',
    DONE = 'done',
    OVERDUE = 'overdue',
    CANCELLED = 'cancelled',
}

export enum UserRole {
    CITIZEN = 'citizen',
    OFFICER = 'officer',
    LEADER = 'leader',
    ADMIN = 'admin',
}