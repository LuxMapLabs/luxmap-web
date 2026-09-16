/**
 * Common Types & Response Wrappers
 * Auto-generated from Backend Swagger
 */

export interface ApiError {
    code?: string | null
    message?: string | null
    details?: Record<string, any>
}

export interface UserDto {
    id?: string | null
    username?: string | null
    email?: string | null
    full_name?: string | null
    role?: string | null
    commune_ids?: string[]
}

