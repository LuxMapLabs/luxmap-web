import type { PoleListItem, UpdatePoleRequest } from '../../types/assets/poles'

/** Cột đã sửa trong form Sửa cột → body PUT /assets/poles/{id}. Dùng chung cho tab tài sản và Bản đồ GIS. */
export const poleUpdateRequest = (updated: PoleListItem): UpdatePoleRequest => ({
  external_ref: updated.external_ref || updated.pole_id,
  segment_id: updated.segment_id || null,
  feeder_id: updated.feeder_id || null,
  geom_wkt: updated.location ? `POINT(${updated.location.lng} ${updated.location.lat})` : null,
  near_sensitive_poi: !!updated.near_sensitive_poi,
  data_source: updated.data_source || 'field',
  note: updated.note ?? null,
})
