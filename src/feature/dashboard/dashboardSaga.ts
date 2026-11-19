import { all, call, put, select, takeLatest } from 'redux-saga/effects'
import { toast } from 'sonner'
import {
  fetchSegmentsList,
  fetchWarrantyStatistics,
  fetchFaultsList,
  fetchFixtureStatusStatistics,
  fetchDashboardPoles,
} from './dashboardAPI'
import type { SegmentListItem } from '../../types/assets/segments'
import type { WarrantyList } from '../../types/statistics/warranty'
import type { FaultItem } from '../../types/faults/faults'
import type { FixtureStatusStatistics } from '../../types/statistics/fixture-status'
import type { PoleListItem } from '../../types/assets/poles'
import type { IotDiagnosticSummaryItem } from '../../types/iot/diagnostics'
import type { IotServerStatus } from '../../types/iot/servers'
import type { IotFeederAverage, IotFeederHistoryResult } from '../../types/iot/feeders'
import type { RootState } from '../../redux/store'
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
} from './dashboardSlice'

const ALL_FAULT_DATA_SOURCES = 'field,public_imagery,simulated,calibration_rig'

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

    const [segments, warrantyRes, faultsRes, fixtureStatusRes, poles, iotSummary, iotServers]: [
      SegmentListItem[],
      WarrantyList,
      FaultItem[],
      FixtureStatusStatistics,
      PoleListItem[],
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
    const unlocatedPoleSegments = poleList
      .filter(
        (pole) =>
          !pole.location ||
          typeof pole.location.lat !== 'number' ||
          typeof pole.location.lng !== 'number'
      )
      .map((pole) => pole.segment_id ?? null)
    const polesCapped = poleList.length >= 200

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
  const [iotSummary, iotServers]: [IotDiagnosticSummaryItem[], IotServerStatus[]] = yield all([
    call(fetchIotSummarySafe),
    call(fetchIotServersSafe),
  ])
  yield put(fetchDashboardIotSuccess({ iotSummary, iotServers }))
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
  try {
    const res: IotFeederHistoryResult = yield call(
      iotAPI.getFeederElectricalHistory,
      action.payload,
      { page: 1, page_size: 20 }
    )
    const items: IotFeederAverage[] = [...(res?.items || [])].reverse()
    yield put(fetchFeederHistorySuccess(items))
  } catch {
    yield put(fetchFeederHistorySuccess([]))
  }
}

export default function* dashboardSaga() {
  yield takeLatest(fetchDashboardDataRequest.type, handleFetchDashboardData)
  yield takeLatest(fetchDashboardIotRequest.type, handleFetchDashboardIot)
  yield takeLatest(setIncludeCalibrationRig.type, handleToggleCalibrationRig)
  yield takeLatest(fetchFeederHistoryRequest.type, handleFetchFeederHistory)
}
