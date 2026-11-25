import { describe, it, expect } from 'vitest'
import { getPhaseOverdueInfo } from '../../utils/work-schedule/scheduleRules'
import reducer, {
  saveEditedGpsLocations,
  clearEditedGpsLocations,
  setFilterPhase,
} from '../../feature/work-schedule/workScheduleSlice'

describe('getPhaseOverdueInfo (unified overdue state)', () => {
  it('returns single kind="overdue" for both not-started (assigned) and in_progress past deadline', () => {
    const today = '2026-11-25'
    const notStarted = getPhaseOverdueInfo(
      {
        date: '2026-11-20',
        dueDate: '2026-11-22',
        status: 'pending',
        rawStatus: 'assigned',
      },
      false,
      undefined,
      today
    )
    const inProgress = getPhaseOverdueInfo(
      {
        date: '2026-11-20',
        dueDate: '2026-11-22',
        status: 'pending',
        rawStatus: 'in_progress',
      },
      false,
      undefined,
      today
    )

    expect(notStarted.isOverdue).toBe(true)
    expect(notStarted.kind).toBe('overdue')
    expect(notStarted.overdueDays).toBe(3)

    expect(inProgress.isOverdue).toBe(true)
    expect(inProgress.kind).toBe('overdue')
    expect(inProgress.overdueDays).toBe(3)
  })

  it('returns kind="none" when phase is reported, ended, or not past deadline', () => {
    const today = '2026-11-25'
    const reported = getPhaseOverdueInfo(
      {
        date: '2026-11-20',
        status: 'reported',
        rawStatus: 'done',
      },
      false,
      undefined,
      today
    )
    const future = getPhaseOverdueInfo(
      {
        date: '2026-11-25',
        dueDate: '2026-11-26',
        status: 'pending',
        rawStatus: 'assigned',
      },
      false,
      undefined,
      today
    )

    expect(reported.isOverdue).toBe(false)
    expect(reported.kind).toBe('none')
    expect(future.isOverdue).toBe(false)
    expect(future.kind).toBe('none')
    expect(future.isExtended).toBe(true)
  })
})

describe('workScheduleSlice overdue filter & sequential GPS draft order', () => {
  it('accepts unified "overdue" filterPhase', () => {
    const state = reducer(undefined, setFilterPhase('overdue'))
    expect(state.filterPhase).toBe('overdue')
  })

  it('stores and clears sequential pole order alongside edited GPS locations', () => {
    let state = reducer(
      undefined,
      saveEditedGpsLocations({
        workOrderId: 'WO-100',
        locations: {
          'POLE-2': { lat: 21.0285, lng: 105.8542 },
        },
        orderedPoleIds: ['POLE-3', 'POLE-1', 'POLE-2'],
      })
    )

    expect(state.editedGpsByWorkOrder['WO-100']).toEqual({
      'POLE-2': { lat: 21.0285, lng: 105.8542 },
    })
    expect(state.orderedGpsPolesByWorkOrder['WO-100']).toEqual(['POLE-3', 'POLE-1', 'POLE-2'])

    state = reducer(state, clearEditedGpsLocations('WO-100'))
    expect(state.editedGpsByWorkOrder['WO-100']).toBeUndefined()
    expect(state.orderedGpsPolesByWorkOrder['WO-100']).toBeUndefined()
  })
})
