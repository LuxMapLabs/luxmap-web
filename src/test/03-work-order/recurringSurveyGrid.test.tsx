import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import {
  buildBaseline,
  executeSave,
  gridFromBaseline,
  planSave,
  toggleCell,
  updateCell,
  type GridState,
  type SaveApi,
} from '../../utils/work-schedule/recurringGrid'
import type { SurveyRecurringItem } from '../../types/survey-schedules/recurring'

const item = (over: Partial<SurveyRecurringItem>): SurveyRecurringItem => ({
  schedule_id: 'SRS-001',
  commune_id: 'COM-001',
  segment_id: 'SEG-001',
  segment_name: 'Tuyến 1',
  day_of_week: 1,
  assigned_to: null,
  is_active: true,
  note: null,
  first_occurrence_date: '2026-12-07',
  ...over,
})

const communeOf = () => 'COM-001'
const onCells = (grid: GridState, seg: string) => (grid[seg] ? [grid[seg]!.day] : [])

describe('recurring grid — one cell per row', () => {
  it('turns a cell on in an empty row', () => {
    const grid = toggleCell({}, 'SEG-001', 3)
    expect(grid['SEG-001']).toEqual({ day: 3, assignedTo: null, note: '', isActive: true })
  })

  it('clicking another day in the same row moves the cell instead of adding one', () => {
    let grid = toggleCell({}, 'SEG-001', 2)
    grid = updateCell(grid, 'SEG-001', { assignedTo: 'USR-7', note: 'mang đèn pin', isActive: false })
    grid = toggleCell(grid, 'SEG-001', 5)
    expect(onCells(grid, 'SEG-001')).toEqual([5])
    expect(grid['SEG-001']).toEqual({ day: 5, assignedTo: 'USR-7', note: 'mang đèn pin', isActive: false })
  })

  it('clicking the lit cell turns the row off; other rows are untouched', () => {
    let grid = toggleCell({}, 'SEG-001', 2)
    grid = toggleCell(grid, 'SEG-002', 4)
    grid = toggleCell(grid, 'SEG-001', 2)
    expect(grid['SEG-001']).toBeNull()
    expect(onCells(grid, 'SEG-002')).toEqual([4])
  })

  it('loads legacy multi-day rows as one lit cell, preferring the earliest active day', () => {
    const baseline = buildBaseline([
      item({ schedule_id: 'SRS-001', day_of_week: 2, is_active: false }),
      item({ schedule_id: 'SRS-002', day_of_week: 5, is_active: true }),
      item({ schedule_id: 'SRS-003', day_of_week: 6, is_active: true }),
    ])
    expect(baseline['SEG-001'].primary?.schedule_id).toBe('SRS-002')
    expect(baseline['SEG-001'].extras.map((e) => e.schedule_id)).toEqual(['SRS-001', 'SRS-003'])
    expect(onCells(gridFromBaseline(baseline), 'SEG-001')).toEqual([5])
  })
})

describe('recurring grid — save diff', () => {
  it('no edits → no requests', () => {
    const baseline = buildBaseline([item({})])
    expect(planSave(baseline, gridFromBaseline(baseline), communeOf)).toEqual([])
  })

  it('new cell → POST with commune, segment, day; empty engineer and note are omitted', () => {
    const grid = toggleCell({}, 'SEG-009', 7)
    expect(planSave({}, grid, communeOf)).toEqual([
      {
        kind: 'create',
        segmentId: 'SEG-009',
        day: 7,
        body: { commune_id: 'COM-001', segment_id: 'SEG-009', day_of_week: 7 },
        pauseAfterCreate: false,
      },
    ])
  })

  it('engineer / note / pause change → one PATCH with only the changed fields', () => {
    const baseline = buildBaseline([item({ assigned_to: 'USR-1', note: 'cũ' })])
    let grid = gridFromBaseline(baseline)
    grid = updateCell(grid, 'SEG-001', { assignedTo: null, isActive: false })
    expect(planSave(baseline, grid, communeOf)).toEqual([
      {
        kind: 'patch',
        segmentId: 'SEG-001',
        day: 1,
        scheduleId: 'SRS-001',
        body: { is_active: false, assigned_to: null },
      },
    ])
  })

  it('whitespace-only note edit is not a change', () => {
    const baseline = buildBaseline([item({ note: null })])
    const grid = updateCell(gridFromBaseline(baseline), 'SEG-001', { note: '   ' })
    expect(planSave(baseline, grid, communeOf)).toEqual([])
  })

  it('moving the day → POST new day (carrying engineer, note, pause) that replaces the old schedule', () => {
    // PATCH cannot change day_of_week (server-owned field), so a move is create + delete.
    const baseline = buildBaseline([item({ assigned_to: 'USR-1', note: 'ghi chú', is_active: false })])
    const grid = toggleCell(gridFromBaseline(baseline), 'SEG-001', 4)
    expect(planSave(baseline, grid, communeOf)).toEqual([
      {
        kind: 'create',
        segmentId: 'SEG-001',
        day: 4,
        body: { commune_id: 'COM-001', segment_id: 'SEG-001', day_of_week: 4, assigned_to: 'USR-1', note: 'ghi chú' },
        pauseAfterCreate: true,
        replacesScheduleId: 'SRS-001',
      },
    ])
  })

  it('removed cell → DELETE', () => {
    const baseline = buildBaseline([item({ day_of_week: 3 })])
    const grid = toggleCell(gridFromBaseline(baseline), 'SEG-001', 3)
    expect(planSave(baseline, grid, communeOf)).toEqual([
      { kind: 'delete', segmentId: 'SEG-001', day: 3, scheduleId: 'SRS-001', reason: 'removed' },
    ])
  })

  it('moving onto a legacy duplicate day reuses that schedule instead of a conflicting POST', () => {
    const baseline = buildBaseline([
      item({ schedule_id: 'SRS-001', day_of_week: 1 }),
      item({ schedule_id: 'SRS-002', day_of_week: 5, is_active: false }),
    ])
    const grid = toggleCell(gridFromBaseline(baseline), 'SEG-001', 5)
    expect(planSave(baseline, grid, communeOf)).toEqual([
      { kind: 'patch', segmentId: 'SEG-001', day: 5, scheduleId: 'SRS-002', body: { is_active: true } },
      { kind: 'delete', segmentId: 'SEG-001', day: 1, scheduleId: 'SRS-001', reason: 'removed' },
    ])
  })

  it('legacy duplicates of an untouched row are deleted on save', () => {
    const baseline = buildBaseline([
      item({ schedule_id: 'SRS-001', day_of_week: 1 }),
      item({ schedule_id: 'SRS-002', day_of_week: 3 }),
    ])
    expect(planSave(baseline, gridFromBaseline(baseline), communeOf)).toEqual([
      { kind: 'delete', segmentId: 'SEG-001', day: 3, scheduleId: 'SRS-002', reason: 'duplicate' },
    ])
  })
})

const apiError = (status: number, code: string) =>
  Object.assign(new Error(code), { response: { status, data: { error: { code, message: code } } } })

describe('recurring grid — executeSave', () => {
  it('a failed move keeps the old schedule and reports the error on the target cell', async () => {
    const api: SaveApi = {
      create: vi.fn().mockRejectedValue(apiError(409, 'SURVEY_SCHEDULE_EXISTS')),
      patch: vi.fn(),
      remove: vi.fn(),
    }
    const result = await executeSave(
      [
        {
          kind: 'create',
          segmentId: 'SEG-001',
          day: 4,
          body: { commune_id: 'COM-001', segment_id: 'SEG-001', day_of_week: 4 },
          pauseAfterCreate: false,
          replacesScheduleId: 'SRS-001',
        },
      ],
      api
    )
    expect(api.remove).not.toHaveBeenCalled()
    expect(result.errors['SEG-001:4'].code).toBe('SURVEY_SCHEDULE_EXISTS')
    expect([...result.failedSegments]).toEqual(['SEG-001'])
  })

  it('maps each 409 to its own cell and keeps going for other rows', async () => {
    const api: SaveApi = {
      create: vi
        .fn()
        .mockRejectedValueOnce(apiError(409, 'CROSS_COMMUNE_REFERENCE'))
        .mockResolvedValueOnce(item({ schedule_id: 'SRS-010', segment_id: 'SEG-003' })),
      patch: vi.fn().mockResolvedValue(item({})),
      remove: vi.fn().mockResolvedValue(undefined),
    }
    const result = await executeSave(
      [
        { kind: 'create', segmentId: 'SEG-002', day: 2, body: {}, pauseAfterCreate: false },
        { kind: 'create', segmentId: 'SEG-003', day: 6, body: {}, pauseAfterCreate: true },
      ],
      api
    )
    expect(Object.keys(result.errors)).toEqual(['SEG-002:2'])
    expect(result.errors['SEG-002:2'].message).toMatch(/không thuộc địa bàn xã/)
    expect(api.patch).toHaveBeenCalledWith('SRS-010', { is_active: false })
    expect(result.succeeded).toBe(1)
  })
})

// --- Component: clicking cells in the modal ---------------------------------------------------

const api = vi.hoisted(() => ({
  getRecurringSurveySchedules: vi.fn(),
  getAssignees: vi.fn(),
  createRecurringSurveySchedule: vi.fn(),
  patchRecurringSurveySchedule: vi.fn(),
  deleteRecurringSurveySchedule: vi.fn(),
}))
vi.mock('../../feature/work-schedule/workScheduleAPI', () => ({ workScheduleAPI: api }))
vi.mock('../../feature/dashboard/dashboardAPI', () => ({
  fetchSegmentsList: vi.fn().mockResolvedValue([
    { segment_id: 'SEG-001', segment_name: 'Tuyến 1', commune_id: 'COM-001', pole_count: 12 },
    { segment_id: 'SEG-002', segment_name: 'Tuyến 2', commune_id: 'COM-001', pole_count: 8 },
  ]),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { RecurringSurveyModal } from '../../pages/work-schedule/components/RecurringSurveyModal'

describe('RecurringSurveyModal', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset())
    api.getRecurringSurveySchedules.mockResolvedValue({ items: [item({ day_of_week: 1 })] })
    api.getAssignees.mockResolvedValue({ items: [] })
  })

  const pressed = (rowId: string) =>
    within(screen.getByTestId(`row-${rowId}`))
      .getAllByRole('button', { pressed: true })
      .map((b) => b.getAttribute('aria-label'))

  it('keeps one lit cell per row and saves a move as POST then DELETE', async () => {
    api.createRecurringSurveySchedule.mockResolvedValue(item({ schedule_id: 'SRS-002', day_of_week: 3 }))
    api.deleteRecurringSurveySchedule.mockResolvedValue(undefined)
    render(<RecurringSurveyModal isOpen onClose={() => {}} onSuccess={() => {}} communeId="COM-001" />)

    await screen.findByRole('button', { name: 'Tuyến 1 – Thứ Hai', pressed: true })
    expect(screen.queryByText(/chọn nhiều thứ/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Tuyến 1 – Thứ Tư' }))
    expect(pressed('SEG-001')).toEqual(['Tuyến 1 – Thứ Tư'])

    fireEvent.click(screen.getByRole('button', { name: 'Tuyến 2 – Thứ Sáu' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tuyến 2 – Chủ Nhật' }))
    expect(pressed('SEG-002')).toEqual(['Tuyến 2 – Chủ Nhật'])

    api.getRecurringSurveySchedules.mockResolvedValue({ items: [] })
    fireEvent.click(screen.getByRole('button', { name: /Lưu 2 thay đổi/ }))

    await waitFor(() => expect(api.deleteRecurringSurveySchedule).toHaveBeenCalledWith('SRS-001'))
    expect(api.createRecurringSurveySchedule).toHaveBeenCalledWith({
      commune_id: 'COM-001',
      segment_id: 'SEG-001',
      day_of_week: 3,
    })
    expect(api.createRecurringSurveySchedule).toHaveBeenCalledWith({
      commune_id: 'COM-001',
      segment_id: 'SEG-002',
      day_of_week: 7,
    })
    expect(api.patchRecurringSurveySchedule).not.toHaveBeenCalled()
  })

  it('shows a 409 on the exact cell and keeps the user choice for that row', async () => {
    api.createRecurringSurveySchedule.mockRejectedValue(apiError(409, 'SURVEY_SCHEDULE_EXISTS'))
    render(<RecurringSurveyModal isOpen onClose={() => {}} onSuccess={() => {}} communeId="COM-001" />)
    await screen.findByRole('button', { name: 'Tuyến 1 – Thứ Hai', pressed: true })

    fireEvent.click(screen.getByRole('button', { name: 'Tuyến 2 – Thứ Năm' }))
    fireEvent.click(screen.getByRole('button', { name: /Lưu 1 thay đổi/ }))

    const cell = await screen.findByRole('button', { name: 'Tuyến 2 – Thứ Năm', pressed: true })
    await waitFor(() => expect(cell.className).toContain('ring-rose-500'))
    expect(within(screen.getByTestId('row-SEG-002')).getByText(/Thứ Năm: Tuyến đã có lịch/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tuyến 1 – Thứ Hai' }).className).not.toContain('ring-rose-500')
  })
})
