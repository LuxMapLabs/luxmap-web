/**
 * Auto-generated Types for: assets/import
 * Sinh tự động từ endpoint Backend
 */
export interface ImportResult {
    inserted?: number
    updated?: number
    unchanged?: number
    failed?: number
    total_errors?: number
    truncated?: boolean
    rows?: ImportRowError[]
    total_warnings?: number
    warnings?: ImportRowError[]
}

export interface ImportRowError {
    row?: number
    column?: string | null
    message?: string | null
}

export interface WorkbookImportResult {
    committed?: boolean
    segments?: WorkbookKindCounts
    cabinets?: WorkbookKindCounts
    feeders?: WorkbookKindCounts
    poles?: WorkbookKindCounts
    fixtures?: WorkbookKindCounts
    failed?: number
    total_errors?: number
    truncated?: boolean
    rows?: ImportRowError[]
    total_warnings?: number
    warnings?: ImportRowError[]
}

export interface WorkbookKindCounts {
    inserted?: number
    updated?: number
    unchanged?: number
}

