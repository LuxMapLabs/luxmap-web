import type { TaskKind, Severity } from '../common/enums'

export interface DispatchProposal {
  task_kind: TaskKind | 'inspection'
  title: string
  scheduled_date: string
  due_date: string
  assigned_to: string | null
  assigned_to_name: string | null
  fault_ids: string[]
  note: string
  commune_id: string
  segment_id: string
  segment_name: string
  pole_ids: string[]
  pole_count: number
  max_severity: Severity | 'critical' | 'high' | 'medium' | 'low'
  unassigned_reason: string | null
}

export interface DispatchSkipped {
  fault_id: string
  reason: string
}

export interface AutoDispatchPreview {
  start_date: string
  fault_count: number
  order_count: number
  proposals: DispatchProposal[]
  skipped: DispatchSkipped[]
}

export interface AutoDispatchRequest {
  commune_id?: string
}

export interface BatchCreateWorkOrdersResponse {
  count: number
  created_items: any[]
}

