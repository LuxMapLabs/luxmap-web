export interface SurveyRecurringItem {
  schedule_id: string
  commune_id: string
  segment_id: string
  segment_name: string | null
  day_of_week: number // 1 = Thứ Hai ... 7 = Chủ Nhật
  assigned_to: string | null
  assigned_to_name: string | null
  is_active: boolean
  note: string | null
  starts_on_week: string
  first_occurrence_date: string
  created_at: string
  created_by: string
  updated_at: string
}

export interface SurveyRecurringPagedResult {
  items: SurveyRecurringItem[]
  total: number
  page: number
  page_size: number
}

export interface CreateSurveyRecurringRequest {
  commune_id: string
  segment_id: string
  day_of_week: number
  assigned_to?: string | null
  note?: string | null
}

export interface PatchSurveyRecurringRequest {
  is_active?: boolean
  assigned_to?: string | null
  note?: string | null
  day_of_week?: number
}

