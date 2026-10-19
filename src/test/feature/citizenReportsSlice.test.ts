import { describe, it, expect } from 'vitest'
import citizenReportsReducer, {
  fetchReportsRequest,
  fetchReportsSuccess,
  fetchReportsFailure,
  fetchPendingCountSuccess,
  fetchReportDetailRequest,
  fetchReportDetailSuccess,
  fetchReportDetailFailure,
  clearReportDetail,
  setStatusFilter,
  setCommuneFilter,
  setPoleFilter,
  setPage,
  setPageSize,
  acceptReportRequest,
  acceptReportSuccess,
  acceptReportFailure,
  mergeReportRequest,
  mergeReportSuccess,
  mergeReportFailure,
  rejectReportRequest,
  rejectReportSuccess,
  rejectReportFailure,
} from '../../feature/citizen-reports/citizenReportsSlice'
import type { CitizenReportsState } from '../../feature/citizen-reports/citizenReportsSlice'
import type {
  CitizenReportItem,
  CitizenReportDetail,
} from '../../types/citizen-reports/citizen-reports'

describe('citizenReportsSlice Unit Tests (Redux State & Actions)', () => {
  const initialSliceState: CitizenReportsState = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    isFetchingList: false,
    listError: null,

    statusFilter: [],
    communeFilter: [],
    poleFilter: null,

    selectedReportId: null,
    selectedDetail: null,
    isFetchingDetail: false,
    detailError: null,

    isSubmittingDecision: false,
    decisionError: null,

    pendingCount: 0,
  }

  const mockItemPending: CitizenReportItem = {
    report_id: 'rep-001',
    pole_id: 'pole-101',
    commune_id: 'Xã Phú Hòa',
    data_source: 'field',
    night_of: '2026-10-14',
    status: 'pending',
    created_at: '2026-10-14T19:00:00Z',
    last_submitted_at: '2026-10-14T20:30:00Z',
    submission_count: 2,
    photo_count: 3,
    kinds: ['lamp_out', 'lamp_dim'],
    far_from_pole: false,
    fault_id: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
  }

  const mockDetail: CitizenReportDetail = {
    report_id: 'rep-001',
    pole_id: 'pole-101',
    commune_id: 'Xã Phú Hòa',
    data_source: 'field',
    night_of: '2026-10-14',
    status: 'pending',
    created_at: '2026-10-14T19:00:00Z',
    last_submitted_at: '2026-10-14T20:30:00Z',
    submission_count: 2,
    photo_count: 3,
    kinds: ['lamp_out', 'lamp_dim'],
    far_from_pole: false,
    fault_id: null,
    decided_by: null,
    decided_at: null,
    decision_note: null,
    pole: {
      pole_id: 'pole-101',
      segment_id: 'seg-1',
      location: { lat: 10.8, lng: 106.6 },
      fixture_status: 'unknown',
      last_seen_at: null,
    },
    open_faults: [],
    submissions: [
      {
        submission_id: 'sub-01',
        kind: 'lamp_out',
        description: 'Đèn mất sáng toàn tuyến',
        far_from_pole: false,
        photos_dropped: 'over_quota',
        received_at: '2026-10-14T19:00:00Z',
        photo_count: 2,
        photos: [],
      },
    ],
    allowed_actions: ['accept', 'reject'],
    acceptable_fault_types: ['lamp_out'],
  }

  // 1. Initial State
  it('1. should return initialState when action type is unknown', () => {
    const state = citizenReportsReducer(undefined, { type: 'UNKNOWN_ACTION' })
    expect(state).toEqual(initialSliceState)
  })

  // 2. Fetch Reports Request & Success
  it('2. should handle fetchReportsRequest and fetchReportsSuccess with pending count calculation', () => {
    // Request sets isFetchingList = true, listError = null
    const stateRequest = citizenReportsReducer(
      { ...initialSliceState, listError: 'Old error' },
      fetchReportsRequest()
    )
    expect(stateRequest.isFetchingList).toBe(true)
    expect(stateRequest.listError).toBeNull()

    // Success stores items, total, page, pageSize and updates pendingCount if statusFilter is ['pending']
    const stateWithPendingFilter: CitizenReportsState = {
      ...stateRequest,
      statusFilter: ['pending'],
    }

    const stateSuccess = citizenReportsReducer(
      stateWithPendingFilter,
      fetchReportsSuccess({
        items: [mockItemPending],
        total: 1,
        page: 1,
        pageSize: 10,
      })
    )

    expect(stateSuccess.isFetchingList).toBe(false)
    expect(stateSuccess.items).toHaveLength(1)
    expect(stateSuccess.total).toBe(1)
    expect(stateSuccess.page).toBe(1)
    expect(stateSuccess.pageSize).toBe(10)
    expect(stateSuccess.pendingCount).toBe(1)
  })

  // 3. Fetch Reports Failure
  it('3. should handle fetchReportsFailure', () => {
    const stateBefore = { ...initialSliceState, isFetchingList: true }
    const state = citizenReportsReducer(stateBefore, fetchReportsFailure('Network 500 error'))
    expect(state.isFetchingList).toBe(false)
    expect(state.listError).toBe('Network 500 error')
  })

  // 4. Fetch Pending Count Success (Sidebar Badge)
  it('4. should handle fetchPendingCountSuccess', () => {
    const state = citizenReportsReducer(initialSliceState, fetchPendingCountSuccess(5))
    expect(state.pendingCount).toBe(5)
  })

  // 5. Filter Reducers (status, commune, pole, page, pageSize)
  it('5. should update filters and reset page to 1 when filters change', () => {
    const stateWithPage: CitizenReportsState = { ...initialSliceState, page: 3 }

    // setStatusFilter
    const stateStatus = citizenReportsReducer(stateWithPage, setStatusFilter(['pending', 'accepted']))
    expect(stateStatus.statusFilter).toEqual(['pending', 'accepted'])
    expect(stateStatus.page).toBe(1)

    // setCommuneFilter
    const stateCommune = citizenReportsReducer(stateStatus, setCommuneFilter(['Xã Tân Thạnh Đông']))
    expect(stateCommune.communeFilter).toEqual(['Xã Tân Thạnh Đông'])
    expect(stateCommune.page).toBe(1)

    // setPoleFilter
    const statePole = citizenReportsReducer(stateCommune, setPoleFilter('POLE-1234'))
    expect(statePole.poleFilter).toBe('POLE-1234')
    expect(statePole.page).toBe(1)

    // setPage
    const statePage = citizenReportsReducer(statePole, setPage(2))
    expect(statePage.page).toBe(2)

    // setPageSize
    const statePageSize = citizenReportsReducer(statePage, setPageSize(25))
    expect(statePageSize.pageSize).toBe(25)
    expect(statePageSize.page).toBe(1)
  })

  // 6. Report Detail actions
  it('6. should handle fetchReportDetailRequest, fetchReportDetailSuccess, fetchReportDetailFailure, and clearReportDetail', () => {
    // Request
    const stateRequest = citizenReportsReducer(initialSliceState, fetchReportDetailRequest('rep-001'))
    expect(stateRequest.selectedReportId).toBe('rep-001')
    expect(stateRequest.isFetchingDetail).toBe(true)
    expect(stateRequest.detailError).toBeNull()

    // Success
    const stateSuccess = citizenReportsReducer(stateRequest, fetchReportDetailSuccess(mockDetail))
    expect(stateSuccess.isFetchingDetail).toBe(false)
    expect(stateSuccess.selectedDetail).toEqual(mockDetail)

    // Failure
    const stateFailure = citizenReportsReducer(
      stateRequest,
      fetchReportDetailFailure('Không tìm thấy chi tiết phản ánh')
    )
    expect(stateFailure.isFetchingDetail).toBe(false)
    expect(stateFailure.detailError).toBe('Không tìm thấy chi tiết phản ánh')

    // Clear
    const stateClear = citizenReportsReducer(stateSuccess, clearReportDetail())
    expect(stateClear.selectedReportId).toBeNull()
    expect(stateClear.selectedDetail).toBeNull()
    expect(stateClear.isFetchingDetail).toBe(false)
    expect(stateClear.detailError).toBeNull()
  })

  // 7. Decision Actions (Accept, Merge, Reject)
  it('7. should handle acceptReportRequest, acceptReportSuccess, and acceptReportFailure', () => {
    // Request
    const stateReq = citizenReportsReducer(
      initialSliceState,
      acceptReportRequest({
        reportId: 'rep-001',
        data: { fault_type: 'lamp_out', severity: 'medium', note: 'Chấp thuận' },
      })
    )
    expect(stateReq.isSubmittingDecision).toBe(true)
    expect(stateReq.decisionError).toBeNull()

    // Success
    const updatedDetail = { ...mockDetail, status: 'accepted' as const, fault_id: 'FLT-100' }
    const stateSuccess = citizenReportsReducer(stateReq, acceptReportSuccess(updatedDetail))
    expect(stateSuccess.isSubmittingDecision).toBe(false)
    expect(stateSuccess.selectedDetail).toEqual(updatedDetail)

    // Failure
    const stateFail = citizenReportsReducer(stateReq, acceptReportFailure('409 Conflict: Report changed'))
    expect(stateFail.isSubmittingDecision).toBe(false)
    expect(stateFail.decisionError).toBe('409 Conflict: Report changed')
  })

  it('8. should handle mergeReportRequest, mergeReportSuccess, and mergeReportFailure', () => {
    const stateReq = citizenReportsReducer(
      initialSliceState,
      mergeReportRequest({
        reportId: 'rep-001',
        data: { fault_id: 'FLT-001', note: 'Gộp vào sự cố cũ' },
      })
    )
    expect(stateReq.isSubmittingDecision).toBe(true)

    const updatedDetail = { ...mockDetail, status: 'merged' as const, fault_id: 'FLT-001' }
    const stateSuccess = citizenReportsReducer(stateReq, mergeReportSuccess(updatedDetail))
    expect(stateSuccess.isSubmittingDecision).toBe(false)
    expect(stateSuccess.selectedDetail?.status).toBe('merged')

    const stateFail = citizenReportsReducer(stateReq, mergeReportFailure('Lỗi khi gộp sự cố'))
    expect(stateFail.isSubmittingDecision).toBe(false)
    expect(stateFail.decisionError).toBe('Lỗi khi gộp sự cố')
  })

  it('9. should handle rejectReportRequest, rejectReportSuccess, and rejectReportFailure', () => {
    const stateReq = citizenReportsReducer(
      initialSliceState,
      rejectReportRequest({
        reportId: 'rep-001',
        data: { reason: 'Ảnh không rõ ràng, đèn vẫn sáng bình thường' },
      })
    )
    expect(stateReq.isSubmittingDecision).toBe(true)

    const updatedDetail = { ...mockDetail, status: 'rejected' as const, decision_note: 'Từ chối' }
    const stateSuccess = citizenReportsReducer(stateReq, rejectReportSuccess(updatedDetail))
    expect(stateSuccess.isSubmittingDecision).toBe(false)
    expect(stateSuccess.selectedDetail?.status).toBe('rejected')

    const stateFail = citizenReportsReducer(stateReq, rejectReportFailure('Lỗi từ chối'))
    expect(stateFail.isSubmittingDecision).toBe(false)
    expect(stateFail.decisionError).toBe('Lỗi từ chối')
  })
})
