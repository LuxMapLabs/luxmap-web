import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import { toast } from 'sonner'
import {
  ALL_FAULT_DATA_SOURCES,
  fetchSegmentsList,
  fetchWarrantyStatistics,
  fetchFaultsList,
  fetchFixtureStatusStatistics,
  fetchDashboardPoles,
  fetchDashboardUnlocatedPoles,
  fetchCitizenScreeningStatistics,
} from './dashboardAPI'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import type { PoleListItem, PoleListItemPagedResult } from '../../types/assets/poles'
import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotFeederHistorySample, IotFeederHistoryResult } from '../../types/iot/feeders'
import type { RootState } from '../../redux/store'
import type { CitizenScreeningStatistics } from '../../types/statistics/citizen-screening'
import { screeningWindow } from '../../utils/dashboard/citizenScreening'
import iotAPI from '../iot/iotAPI'
import {
  fetchDashboardDataRequest,
  fetchDashboardDataSuccess,
  fetchDashboardDataFailure,
  fetchDashboardIotRequest,
  fetchDashboardIotSuccess,
  setIncludeCalibrationRig,
  updateFaultsListSuccess,
  fetchFeederHistoryRequest,
  fetchFeederHistorySuccess,
  fetchCitizenScreeningRequest,
  fetchCitizenScreeningSuccess,
} from './dashboardSlice'

async function fetchIotSummarySafe(): Promise<IotDiagnosticSummaryItem[]> {
  try {
    const res = await iotAPI.getDiagnosticsSummary({ page: 1, page_size: 200 })
    return res.items || []
  } catch {
    return []
  }
}

async function fetchIotServersSafe(): Promise<IotServerStatus[]> {
  try {
    return (await iotAPI.getServers()) || []
  } catch {
    return []
  }
}

function buildSegmentFeederMap(poles: PoleListItem[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {}
  poles.forEach((pole) => {
    if (pole.segment_id && pole.feeder_id) {
      if (!map[pole.segment_id]) map[pole.segment_id] = new Set()
      map[pole.segment_id].add(pole.feeder_id)
    }
  })
  const result: Record<string, string[]> = {}
  Object.entries(map).forEach(([segId, feeders]) => {
    result[segId] = Array.from(feeders)
  })
  return result
}

/**
 * Worker Saga tải toàn bộ dữ liệu Dashboard (Tuyến đường, Bảo hành <= 30 ngày, Danh sách sự cố, Tổng hợp IoT)
 */
function* handleFetchDashboardData() {
  try {
    const includeRig: boolean = yield select(
      (state: RootState) => state.dashboard.includeCalibrationRig
    )

    const [
      segments,
      warrantyRes,
      faultsRes,
      fixtureStatusRes,
      poles,
      unlocatedPolesRes,
      iotSummary,
      iotServers,
    ]: [
      SegmentListItem[],
      WarrantyList,
      FaultItem[],
      FixtureStatusStatistics,
      PoleListItem[],
      PoleListItemPagedResult,
      IotDiagnosticSummaryItem[],
      IotServerStatus[]
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
        data_source: includeRig ? ALL_FAULT_DATA_SOURCES : undefined,
      }),
      call(fetchFixtureStatusStatistics, { group_by: 'segment' }),
      call(fetchDashboardPoles),
      call(fetchDashboardUnlocatedPoles),
      call(fetchIotSummarySafe),
      call(fetchIotServersSafe),
    ])

    const validWarrantyItems = (warrantyRes?.items || []).filter(
      (i) => i.days_remaining != null && i.days_remaining <= 30
    )

    const finalWarranty: WarrantyList = {
      ...warrantyRes,
      total: validWarrantyItems.length,
      items: validWarrantyItems,
    }

    const poleList = poles || []
    const isMissingGps = (pole: PoleListItem) =>
      !pole.location ||
      typeof pole.location.lat !== 'number' ||
      typeof pole.location.lng !== 'number'

    const rawUnlocatedItems = (unlocatedPolesRes?.items || []).filter(isMissingGps)
    const fallbackUnlocatedItems =
      rawUnlocatedItems.length > 0 ? rawUnlocatedItems : poleList.filter(isMissingGps)

    const unlocatedPoleSegments = fallbackUnlocatedItems.map((pole) => pole.segment_id ?? null)
    const unlocatedTotal =
      typeof unlocatedPolesRes?.total === 'number' && unlocatedPolesRes.total > 0
        ? unlocatedPolesRes.total
        : unlocatedPoleSegments.length
    const polesCapped =
      unlocatedTotal > unlocatedPoleSegments.length || unlocatedPoleSegments.length >= 200

    yield put(
      fetchDashboardDataSuccess({
        segments: segments || [],
        warranty: finalWarranty,
        faults: faultsRes || [],
        fixtureStatusRows: fixtureStatusRes?.rows || [],
        iotSummary: iotSummary || [],
        iotServers: iotServers || [],
        segmentFeederMap: buildSegmentFeederMap(poleList),
        unlocatedPoleSegments,
        polesCapped,
      })
    )
  } catch (error: unknown) {
    const errObj = error as { response?: { data?: { message?: string } }; message?: string }
    const errorMsg =
      errObj?.response?.data?.message ||
      errObj?.message ||
      'Không thể đồng bộ dữ liệu dashboard mới nhất từ máy chủ.'
    yield put(fetchDashboardDataFailure(errorMsg))
    toast.error(errorMsg)
  }
}

function* handleFetchDashboardIot() {
  const includeRig: boolean = yield select(
    (state: RootState) => state.dashboard.includeCalibrationRig
  )
  const [iotSummary, iotServers, faults]: [
    IotDiagnosticSummaryItem[],
    IotServerStatus[],
    FaultItem[]
  ] = yield all([
    call(fetchIotSummarySafe),
    call(fetchIotServersSafe),
    call(fetchFaultsList, {
      sort: '-detected_at',
      page_size: 100,
      data_source: includeRig ? ALL_FAULT_DATA_SOURCES : undefined,
    }),
  ])
  yield put(fetchDashboardIotSuccess({ iotSummary, iotServers }))
  if (faults) {
    yield put(updateFaultsListSuccess(faults))
  }
}

function* handleToggleCalibrationRig(action: ReturnType<typeof setIncludeCalibrationRig>) {
  const includeRig = action.payload
  const faults: FaultItem[] = yield call(fetchFaultsList, {
    sort: '-detected_at',
    page_size: 100,
    data_source: includeRig ? ALL_FAULT_DATA_SOURCES : undefined,
  })
  yield put(updateFaultsListSuccess(faults || []))
}

function* handleFetchFeederHistory(action: ReturnType<typeof fetchFeederHistoryRequest>) {
  const requestedFeederId = action.payload
  try {
    const res: IotFeederHistoryResult = yield call(
      iotAPI.getFeederElectricalHistory,
      requestedFeederId,
      { page: 1, page_size: 20, sort_by: 'measured_at' }
    )
    const activeFeederId: string | null = yield select(
      (state: RootState) => state.dashboard.selectedFeederId
    )
    if (activeFeederId && activeFeederId !== requestedFeederId) {
      return
    }
    const items: IotFeederHistorySample[] = [...(res?.items || [])].sort((a, b) => {
      const ta = Date.parse(a.measured_at || a.received_at || '')
      const tb = Date.parse(b.measured_at || b.received_at || '')
      if (Number.isFinite(ta) && Number.isFinite(tb)) return ta - tb
      return 0
    })
    yield put(fetchFeederHistorySuccess(items))
  } catch {
    const activeFeederId: string | null = yield select(
      (state: RootState) => state.dashboard.selectedFeederId
    )
    if (!activeFeederId || activeFeederId === requestedFeederId) {
      const existing: IotFeederHistorySample[] = yield select(
        (state: RootState) => state.dashboard.selectedFeederHistory
      )
      yield put(fetchFeederHistorySuccess(existing))
    }
  }
}

function* handleFetchCitizenScreening(action: ReturnType<typeof fetchCitizenScreeningRequest>) {
  const stats: CitizenScreeningStatistics | null = yield call(fetchCitizenScreeningStatistics, {
    ...screeningWindow(new Date()),
    segment_id: action.payload ?? undefined,
  })
  yield put(fetchCitizenScreeningSuccess(stats))
}

export default function* dashboardSaga() {
  yield takeLatest(fetchDashboardDataRequest.type, handleFetchDashboardData)
  yield takeLatest(fetchDashboardIotRequest.type, handleFetchDashboardIot)
  yield takeLatest(setIncludeCalibrationRig.type, handleToggleCalibrationRig)
  yield takeLatest(fetchFeederHistoryRequest.type, handleFetchFeederHistory)
  yield takeLatest(fetchCitizenScreeningRequest.type, handleFetchCitizenScreening)
}
