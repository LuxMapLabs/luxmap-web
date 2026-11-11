/**
 * Auto-generated Types for: survey-schedules/recurring
 * Sinh tự động từ endpoint Backend
 */
export interface CreateSurveyRecurringRequest {
    commune_id?: string | null
    segment_id?: string | null
    day_of_week?: any
    assigned_to?: string | null
    note?: string | null
    schedule_id?: any
    starts_on_week?: any
    is_active?: any
    created_by?: any
    first_occurrence_date?: any
}

export interface PatchSurveyRecurringRequest {
    is_active?: any
    assigned_to?: any
    note?: any
    day_of_week?: any
    segment_id?: any
    commune_id?: any
    schedule_id?: any
    starts_on_week?: any
    created_by?: any
    first_occurrence_date?: any
}

export interface SurveyRecurringItem {
    schedule_id?: string | null
    commune_id?: string | null
    segment_id?: string | null
    segment_name?: string | null
    day_of_week?: number
    assigned_to?: string | null
    assigned_to_name?: string | null
    is_active?: boolean
    note?: string | null
    starts_on_week?: string | null
    first_occurrence_date?: string | null
    created_at?: string | null
    created_by?: string | null
    updated_at?: string | null
}

export interface SurveyRecurringItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: SurveyRecurringItem[]
}

