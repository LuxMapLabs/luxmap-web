import type { JobStatusItem, StorageSummary } from '../../types/admin/system'

/**
 * Đếm số mục cần chú ý trên Tổng quan Admin:
 * worker thất bại, worker bị kẹt, ổ cứng sắp đầy.
 */
export const getIncidentCount = (jobs: JobStatusItem[], storage?: StorageSummary): number => {
  const failing = jobs.filter((j) => j.state === 'failing').length
  const stalled = jobs.filter((j) => j.state === 'stalled').length
  const diskLow = storage?.disk?.low ? 1 : 0
  return failing + stalled + diskLow
}
