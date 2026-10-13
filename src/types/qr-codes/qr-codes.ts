/**
 * Auto-generated Types for: qr-codes/qr-codes
 * Sinh tự động từ endpoint Backend
 */
export interface IssueQrCodeRequest {
    pole_id: string | null
}

export interface QrCodeItem {
    qr_id: string | null
    code: string | null
    url: string | null
    pole_id: string | null
    commune_id: string | null
    active: boolean
    created_at: string | null
    created_by: string | null
    revoked_at: string | null
    revoked_by: string | null
}

export interface QrCodeItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: QrCodeItem[]
}

