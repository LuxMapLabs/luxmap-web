import { describe, it, expect } from 'vitest'
import reducer, {
  openReportRequest,
  openReportDetailSuccess,
  closeReport,
  fetchReportsFailure,
} from '../../feature/reports/reportsSlice'
import type { SuperiorReportItem } from '../../types/reports/report'

const item = (id: string, extra: Partial<SuperiorReportItem> = {}) => ({ workOrderId: id, ...extra }) as SuperiorReportItem

describe('reportsSlice', () => {
  it('chi tiết đến muộn của báo cáo đã đóng không mở lại modal', () => {
    let state = reducer(undefined, openReportRequest(item('WO-1')))
    state = reducer(state, closeReport())
    state = reducer(state, openReportDetailSuccess(item('WO-1', { reviewNote: 'x' })))
    expect(state.selectedReport).toBeNull()
  })

  it('chi tiết của báo cáo khác không thay thế báo cáo đang mở', () => {
    let state = reducer(undefined, openReportRequest(item('WO-2')))
    state = reducer(state, openReportDetailSuccess(item('WO-1', { reviewNote: 'x' })))
    expect(state.selectedReport?.workOrderId).toBe('WO-2')
  })

  it('chi tiết đúng báo cáo thì thay bản tóm tắt', () => {
    let state = reducer(undefined, openReportRequest(item('WO-1')))
    state = reducer(state, openReportDetailSuccess(item('WO-1', { reviewNote: 'ok' })))
    expect(state.selectedReport?.reviewNote).toBe('ok')
  })

  it('tải thất bại thì xoá danh sách cũ và bật cờ lỗi', () => {
    const state = reducer(undefined, fetchReportsFailure())
    expect(state).toMatchObject({ loading: false, loadFailed: true, reports: [] })
  })
})
