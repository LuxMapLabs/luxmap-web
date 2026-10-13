/**
 * Domain Enums (Dùng chung toàn hệ thống)
 * Tự động sinh từ Backend Swagger
 */

export type AgendaFlag = 'in_progress' | 'scheduled_tonight' | 'carried_over' | 'unscheduled' | 'overdue'

export type DataSource = 'field' | 'public_imagery' | 'calibration_rig' | 'simulated'

export type EvidenceKind = 'before' | 'after' | 'observation'

export type FaultStatus = 'detected' | 'confirmed' | 'rejected' | 'in_progress' | 'resolved' | 'verified'

export type FaultType = 'lamp_out' | 'lamp_dim' | 'segment_outage' | 'node_offline' | 'runtime_decline'

export type FeederControlMode = 'on' | 'off' | 'auto'

export type FixtureStatus = 'normal' | 'dim' | 'out' | 'unknown'

export type FixtureType = 'led_road_lamp'

export type InspectionOutcome = 'fault_present' | 'fault_absent' | 'inconclusive'

export type LightingAckResult = 'applied' | 'failed'

export type LightingCommandStatus = 'pending' | 'delivered' | 'applied' | 'failed' | 'expired' | 'superseded'

export type LightingExclusionReason = 'not_wired' | 'remote_control_unsupported' | 'no_credential'

export type LightingTargetKind = 'feeder' | 'segment'

export type NodeRole = 'segment_controller'

export type NodeStatus = 'online' | 'offline' | 'never_reported'

export type NotificationEntityType = 'work_order' | 'survey_sweep' | 'fault'

export type NotificationType = 'work_order_assigned' | 'work_order_unassigned' | 'work_order_rescheduled' | 'work_order_returned' | 'work_order_cancelled' | 'work_order_completed' | 'work_order_verified' | 'survey_returned' | 'survey_ready_for_review' | 'survey_processing_failed' | 'fault_reported'

export type PowerSource = 'grid'

export type RoadClass = 'inter_commune' | 'inter_village'

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export type SourceChannel = 'cv' | 'iot' | 'field_report'

export type SurveyRawKind = 'gps_track' | 'lux_log' | 'capture_config'

export type SweepProcessingStatus = 'not_started' | 'queued' | 'processing' | 'succeeded' | 'failed'

export type SweepStatus = 'uploading' | 'queued' | 'processing' | 'awaiting_review' | 'accepted' | 'returned' | 'failed'

export type TaskKind = 'inspection' | 'repair' | 'survey'

export type TopologySource = 'verified' | 'inferred'

export type UserRole = 'superior' | 'manager' | 'field_engineer' | 'system_admin'

export type WarrantyStatus = 'active' | 'expiring' | 'expired' | 'unknown'

export type WorkOrderStatus = 'open' | 'assigned' | 'in_progress' | 'done' | 'verified' | 'cancelled'

