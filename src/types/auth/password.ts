/**
 * Auto-generated Types for: auth/password
 * Sinh tự động từ endpoint Backend
 */
export interface ChangePasswordRequest {
    old_password: string | null
    new_password: string | null
}

export interface ForgotPasswordRequest {
    email: string | null
}

export interface ForgotPasswordResponse {
    message?: string | null
}

export interface SetPasswordRequest {
    token: string | null
    new_password: string | null
}

