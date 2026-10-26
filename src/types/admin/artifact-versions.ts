/**
 * Auto-generated Types for: admin/artifact-versions
 * Sinh tự động từ endpoint Backend
 */
export interface ArtifactVersionItem {
    version_id?: number
    component?: string | null
    version?: string | null
    artifact_hash?: string | null
    metadata?: any
    created_at?: string | null
    created_by?: string | null
}

export interface ArtifactVersionItemPagedResult {
    page?: number
    page_size?: number
    total?: number
    items?: ArtifactVersionItem[]
}

export interface ArtifactVersionUsage {
    version?: ArtifactVersionItem
    results?: ResultCount[]
}

export interface RegisterArtifactVersionRequest {
    component?: string | null
    version?: string | null
    artifact_hash?: string | null
    metadata?: Record<string, any>
}

export interface ResultCount {
    result?: string | null
    count?: number
    by_data_source?: Record<string, number>
}

