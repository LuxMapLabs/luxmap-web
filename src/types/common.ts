/**
 * Common Types & Response Wrappers
 * Auto-generated from Backend Swagger
 */

export interface ApiError {
    code: string | null
    message: string | null
    details?: Record<string, string | null[]>
    correlationId?: string | null
}

export interface PaginationMeta {
    page: number
    pageSize: number
    totalItems: number
    totalPages?: number
    hasPrevious?: boolean
    hasNext?: boolean
}

export interface UserDto {
    id?: string | null
    fullName?: string | null
    email?: string | null
    phoneNumber?: string | null
    role?: UserRole
    administrativeUnitId?: string | null
}

export type UserRole = 0 | 1 | 2 | 3

export interface ObjectApiResponse {
    data?: unknown
    error?: ApiError
    pagination?: PaginationMeta
}

