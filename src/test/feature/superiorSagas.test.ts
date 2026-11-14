import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runSaga, type Saga } from 'redux-saga'
import type { Action } from '@reduxjs/toolkit'

vi.mock('sonner', () => ({
  toast: { loading: vi.fn(() => 'id'), success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))

vi.mock('../../feature/dashboard/dashboardAPI', () => ({
  fetchSegmentsList: vi.fn(),
  fetchFixtureStatusStatistics: vi.fn(),
  fetchRepairTimelinessStatistics: vi.fn(),
  fetchWarrantyStatistics: vi.fn(),
  fetchFaultsList: vi.fn(),
  fetchCitizenFeedbackStatistics: vi.fn(),
  fetchWorkOrderStatistics: vi.fn(),
  downloadStatisticsCsv: vi.fn(),
}))

vi.mock('../../feature/reports/reportsAPI', () => ({
  reportsAPI: { getVerifiedReports: vi.fn(), getReportDetail: vi.fn() },
}))

import * as dashboardAPI from '../../feature/dashboard/dashboardAPI'
import { reportsAPI } from '../../feature/reports/reportsAPI'
import { handleFetchSuperiorDashboard, handleExportSuperiorCsv } from '../../feature/dashboard/superiorDashboardSaga'
import { handleFetchReports, handleOpenReport } from '../../feature/reports/reportsSaga'
import {
  fetchSuperiorDashboardRequest,
  exportSuperiorCsvRequest,
} from '../../feature/dashboard/superiorDashboardSlice'
import { fetchReportsRequest, openReportRequest } from '../../feature/reports/reportsSlice'
import type { SuperiorReportItem } from '../../types/reports/report'

const run = async <A extends Action>(saga: Saga<[A]>, action: A) => {
  const dispatched: Action[] = []
  await runSaga({ dispatch: (a: Action) => dispatched.push(a) }, saga, action).toPromise()
  return dispatched
}

const mocked = <T extends (...args: never[]) => unknown>(fn: T) => fn as unknown as ReturnType<typeof vi.fn>

beforeEach(() => vi.clearAllMocks())

describe('superiorDashboardSaga', () => {
  it('tải mọi nguồn số liệu theo xã / tuyến / chu kỳ rồi báo thành công', async () => {
    mocked(dashboardAPI.fetchSegmentsList).mockResolvedValue([{ segment_id: 'SEG-001' }])
    mocked(dashboardAPI.fetchFixtureStatusStatistics).mockResolvedValue({ rows: [] })
    mocked(dashboardAPI.fetchRepairTimelinessStatistics).mockResolvedValue({ rows: [] })
    mocked(dashboardAPI.fetchWarrantyStatistics).mockResolvedValue({ items: [] })
    mocked(dashboardAPI.fetchFaultsList).mockResolvedValue([])
    mocked(dashboardAPI.fetchCitizenFeedbackStatistics).mockResolvedValue({ rows: [] })
    mocked(dashboardAPI.fetchWorkOrderStatistics).mockResolvedValue({ rows: [] })

    const out = await run(
      handleFetchSuperiorDashboard,
      fetchSuperiorDashboardRequest({ communeId: 'COM-001', segmentId: 'SEG-001', periodDays: 30 })
    )

    expect(dashboardAPI.fetchFixtureStatusStatistics).toHaveBeenCalledWith({
      commune_id: 'COM-001',
      group_by: 'segment',
      segment_id: 'SEG-001',
    })
    expect(out.map((a) => a.type)).toEqual(['superiorDashboard/fetchSuperiorDashboardSuccess'])
  })

  it('không gửi segment_id khi chọn tất cả tuyến', async () => {
    for (const fn of Object.values(dashboardAPI)) mocked(fn as never).mockResolvedValue({ rows: [], items: [] })
    await run(
      handleFetchSuperiorDashboard,
      fetchSuperiorDashboardRequest({ communeId: 'COM-001', segmentId: null, periodDays: 7 })
    )
    expect(dashboardAPI.fetchFixtureStatusStatistics).toHaveBeenCalledWith({
      commune_id: 'COM-001',
      group_by: 'segment',
    })
  })

  it('báo lỗi khi một nguồn ném ngoại lệ', async () => {
    for (const fn of Object.values(dashboardAPI)) mocked(fn as never).mockResolvedValue({ rows: [], items: [] })
    mocked(dashboardAPI.fetchFaultsList).mockRejectedValue(new Error('boom'))
    const out = await run(
      handleFetchSuperiorDashboard,
      fetchSuperiorDashboardRequest({ communeId: 'COM-001', segmentId: null, periodDays: 30 })
    )
    expect(out.map((a) => a.type)).toEqual(['superiorDashboard/fetchSuperiorDashboardFailure'])
  })

  it('xuất CSV lần lượt từng loại, truyền from/to cho loại có chu kỳ và within_days cho bảo hành', async () => {
    mocked(dashboardAPI.downloadStatisticsCsv).mockResolvedValue(undefined)
    await run(
      handleExportSuperiorCsv,
      exportSuperiorCsvRequest({
        types: ['warranty', 'work-orders'],
        communeId: 'COM-001',
        communeCode: 'COM-001',
        segmentId: 'SEG-001',
        periodDays: 30,
      })
    )
    const calls = mocked(dashboardAPI.downloadStatisticsCsv).mock.calls
    expect(calls).toHaveLength(2)
    expect(calls[0][0]).toBe('warranty')
    expect(calls[0][1]).toMatchObject({ commune_id: 'COM-001', segment_id: 'SEG-001', within_days: 90 })
    expect(calls[0][1]).not.toHaveProperty('from')
    expect(calls[1][1]).toHaveProperty('from')
    expect(calls[1][1]).toHaveProperty('to')
  })

  it('một file lỗi không làm dừng các file còn lại', async () => {
    mocked(dashboardAPI.downloadStatisticsCsv).mockRejectedValueOnce(new Error('x')).mockResolvedValue(undefined)
    await run(
      handleExportSuperiorCsv,
      exportSuperiorCsvRequest({
        types: ['fixture-status', 'warranty'],
        communeId: 'COM-001',
        communeCode: 'COM-001',
        segmentId: null,
        periodDays: 30,
      })
    )
    expect(dashboardAPI.downloadStatisticsCsv).toHaveBeenCalledTimes(2)
  })
})

describe('reportsSaga', () => {
  const summary = { workOrderId: 'WO-1' } as SuperiorReportItem

  it('tải danh sách báo cáo của tháng đang chọn', async () => {
    mocked(reportsAPI.getVerifiedReports).mockResolvedValue([summary])
    const out = await run(
      handleFetchReports,
      fetchReportsRequest({ month: 10, year: 2026, searchQuery: '', communeNames: { 'COM-001': 'Xã A' } })
    )
    expect(reportsAPI.getVerifiedReports).toHaveBeenCalledWith(
      { taskKind: 'all', searchQuery: '', month: 10, year: 2026 },
      { 'COM-001': 'Xã A' }
    )
    expect(out).toEqual([{ type: 'reports/fetchReportsSuccess', payload: [summary] }])
  })

  it('đánh dấu lỗi khi tải danh sách thất bại', async () => {
    mocked(reportsAPI.getVerifiedReports).mockRejectedValue(new Error('down'))
    const out = await run(
      handleFetchReports,
      fetchReportsRequest({ month: 10, year: 2026, searchQuery: '', communeNames: {} })
    )
    expect(out.map((a) => a.type)).toEqual(['reports/fetchReportsFailure'])
  })

  it('bổ sung chi tiết cho báo cáo đang mở', async () => {
    const detail = { workOrderId: 'WO-1', reviewNote: 'ok' } as SuperiorReportItem
    mocked(reportsAPI.getReportDetail).mockResolvedValue(detail)
    const out = await run(handleOpenReport, openReportRequest(summary))
    expect(out).toEqual([{ type: 'reports/openReportDetailSuccess', payload: detail }])
  })

  it('lỗi tải chi tiết thì không phát action nào (giữ bản tóm tắt)', async () => {
    mocked(reportsAPI.getReportDetail).mockRejectedValue(new Error('x'))
    expect(await run(handleOpenReport, openReportRequest(summary))).toEqual([])
  })
})
