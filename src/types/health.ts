/**
 * Auto-generated Types for Module: health
 * Tự động tạo dựa trên endpoint: /api/v1/health/*
 */
import type { ApiError, PaginationMeta } from './common'

export interface DatabaseHealthResponse {
    database?: string | null
    postGis?: string | null
    administrativeUnits?: number
}

export interface DatabaseHealthResponseApiResponse {
    data?: DatabaseHealthResponse
    error?: ApiError
    pagination?: PaginationMeta
}

