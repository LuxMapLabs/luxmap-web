/**
 * Auto-generated Types for: map/communes
 * Sinh tự động từ endpoint Backend
 */
import type { Geometry } from '../common/base'

export interface CommuneProperties {
    commune_id: string | null
    name: string | null
}

export interface CommunePropertiesFeature {
    type?: string | null
    geometry: Geometry
    properties: CommuneProperties
}

export interface CommunePropertiesFeatureCollection {
    type?: string | null
    crs_note?: string | null
    features: CommunePropertiesFeature[]
}

