import { all, call, put, takeLatest, takeLeading } from 'redux-saga/effects'
import type { PayloadAction } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import {
  fetchSegmentsList,
  fetchFixtureStatusStatistics,
  fetchRepairTimelinessStatistics,
  fetchWarrantyStatistics,
  fetchFaultsList,
  fetchCitizenFeedbackStatistics,
  fetchWorkOrderStatistics,
  downloadStatisticsCsv,
} from './dashboardAPI'
import {
  fetchSuperiorDashboardRequest,
  fetchSuperiorDashboardSuccess,
  fetchSuperiorDashboardFailure,
  exportSuperiorCsvRequest,
  type SuperiorDashboardData,
  type SuperiorDashboardRequest,
  type SuperiorCsvExportRequest,
  type StatisticsCsvType,
} from './superiorDashboardSlice'

const toDateOnly = (d: Date) => d.toISOString().split('T')[0]

/** Khoảng ngày [from, to] của chu kỳ thống kê tính lùi từ hôm nay */
function periodRange(periodDays: number): { from: string; to: string } {
  const today = new Date()
  const fromDate = new Date()
  fromDate.setDate(today.getDate() - periodDays)
  return { from: toDateOnly(fromDate), to: toDateOnly(today) }
}

/** Tải đồng thời mọi nguồn số liệu của dashboard Cấp giám sát */
export function* handleFetchSuperiorDashboard(action: PayloadAction<SuperiorDashboardRequest>) {
  const { communeId, segmentId, periodDays } = action.payload
  try {
    const { from, to } = periodRange(periodDays)
    const segmentParam = segmentId ? { segment_id: segmentId } : {}

    const [
      segments,
      fixtureStats,
      slaStats,
      warrantyData,
      faults,
      citizenFeedbackStats,
      workOrderStats,
    ]: [
      SuperiorDashboardData['segments'],
      SuperiorDashboardData['fixtureStats'],
      SuperiorDashboardData['slaStats'],
      SuperiorDashboardData['warrantyData'],
      SuperiorDashboardData['faults'],
      SuperiorDashboardData['citizenFeedbackStats'],
      SuperiorDashboardData['workOrderStats'],
    ] = yield all([
      call(fetchSegmentsList),
      call(fetchFixtureStatusStatistics, { commune_id: communeId, group_by: 'segment', ...segmentParam }),
      call(fetchRepairTimelinessStatistics, { commune_id: communeId, ...segmentParam, from, to }),
      call(fetchWarrantyStatistics, {
        commune_id: communeId,
        within_days: 90,
        status: 'active,expiring,expired,unknown',
        page_size: 200,
      }),
      call(fetchFaultsList, { sort: '-detected_at', page_size: 100 }),
      call(fetchCitizenFeedbackStatistics, { commune_id: communeId, ...segmentParam, from, to, group_by: 'segment' }),
      call(fetchWorkOrderStatistics, { commune_id: communeId, ...segmentParam, from, to, group_by: 'task_kind' }),
    ])

    yield put(
      fetchSuperiorDashboardSuccess({
        segments,
        fixtureStats,
        slaStats,
        warrantyData,
        faults,
        citizenFeedbackStats,
        workOrderStats,
      })
    )
  } catch (error) {
    console.error('[SuperiorDashboard] Load failed:', error)
    yield put(fetchSuperiorDashboardFailure('Có lỗi xảy ra khi đồng bộ số liệu'))
    toast.error('Có lỗi xảy ra khi đồng bộ số liệu')
  }
}

/** Tải lần lượt các báo cáo CSV đã chọn (mỗi báo cáo một file) */
export function* handleExportSuperiorCsv(action: PayloadAction<SuperiorCsvExportRequest>) {
  const { types, communeId, communeCode, segmentId, periodDays } = action.payload
  const todayStr = toDateOnly(new Date())
  const toastId = toast.loading(`Đang tải báo cáo 1/${types.length}...`)
  const failed: StatisticsCsvType[] = []

  for (const [index, type] of types.entries()) {
    toast.loading(`Đang tải báo cáo ${index + 1}/${types.length}...`, { id: toastId })
    const params: Record<string, string | number> = { commune_id: communeId }
    if (segmentId) params.segment_id = segmentId
    if (type === 'warranty') params.within_days = 90
    if (type === 'repair-timeliness' || type === 'citizen-feedback' || type === 'work-orders') {
      const range = periodRange(periodDays)
      params.from = range.from
      params.to = range.to
    }
    try {
      yield call(downloadStatisticsCsv, type, params, `${type}-${communeCode}-${todayStr}.csv`)
    } catch {
      failed.push(type)
    }
  }

  if (failed.length === 0) {
    toast.success(`Đã tải ${types.length} báo cáo CSV`, { id: toastId })
  } else if (failed.length === types.length) {
    toast.error('Không thể xuất file CSV từ máy chủ', { id: toastId })
  } else {
    toast.warning(`Đã tải ${types.length - failed.length}/${types.length} báo cáo, lỗi: ${failed.join(', ')}`, {
      id: toastId,
    })
  }
}

export default function* superiorDashboardSaga() {
  yield takeLatest(fetchSuperiorDashboardRequest.type, handleFetchSuperiorDashboard)
  yield takeLeading(exportSuperiorCsvRequest.type, handleExportSuperiorCsv)
}
