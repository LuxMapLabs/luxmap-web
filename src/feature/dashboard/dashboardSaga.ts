import { all, call, put, takeLatest } from 'redux-saga/effects'
import { toast } from 'sonner'
import {
  fetchSegmentsList,
  fetchWarrantyStatistics,
  fetchFaultsList,
  fetchFixtureStatusStatistics,
} from './dashboardAPI'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import {
  fetchDashboardDataRequest,
  fetchDashboardDataSuccess,
  fetchDashboardDataFailure,
} from './dashboardSlice'

/**
 * Worker Saga tải toàn bộ dữ liệu Dashboard (Tuyến đường, Bảo hành <= 30 ngày, Danh sách sự cố)
 */
function* handleFetchDashboardData() {
  try {
    const [segments, warrantyRes, faultsRes, fixtureStatusRes]: [
      SegmentListItem[],
      WarrantyList,
      FaultItem[],
      FixtureStatusStatistics
    ] = yield all([
      call(fetchSegmentsList),
      call(fetchWarrantyStatistics, {
        within_days: 30,
        status: 'expired,expiring',
        page_size: 100,
      }),
      call(fetchFaultsList, {
        sort: '-detected_at',
        page_size: 100,
      }),
      call(fetchFixtureStatusStatistics, { group_by: 'segment' }),
    ])

    // Lọc các bóng đèn có ngày hạn rõ ràng (<= 30 ngày)
    const validWarrantyItems = (warrantyRes?.items || []).filter(
      (i) => i.days_remaining != null && i.days_remaining <= 30
    )

    const finalWarranty: WarrantyList = {
      ...warrantyRes,
      total: validWarrantyItems.length,
      items: validWarrantyItems,
    }

    yield put(
      fetchDashboardDataSuccess({
        segments: segments || [],
        warranty: finalWarranty,
        faults: faultsRes || [],
        fixtureStatusRows: fixtureStatusRes?.rows || [],
      })
    )
  } catch (error: any) {
    const errorMsg =
      error?.response?.data?.message ||
      error?.message ||
      'Không thể đồng bộ dữ liệu dashboard mới nhất từ máy chủ.'
    yield put(fetchDashboardDataFailure(errorMsg))
    toast.error(errorMsg)
  }
}

/**
 * Watcher Saga lắng nghe các action của Dashboard
 */
export default function* dashboardSaga() {
  yield takeLatest(fetchDashboardDataRequest.type, handleFetchDashboardData)
}
