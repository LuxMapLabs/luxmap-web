import React, { useEffect, useMemo, useState } from 'react'
import { X, RotateCcw, Loader2, User, ChevronDown, Pause, Play, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { workScheduleAPI } from '../../../feature/work-schedule/workScheduleAPI'
import { fetchSegmentsList } from '../../../feature/dashboard/dashboardAPI'
import type { SurveyRecurringItem } from '../../../types/survey-schedules/recurring'
import type { SegmentListItem } from '../../../types/assets/segments'
import type { WorkOrderAssignee } from '../../../types/workorders/orders'
import {
  WEEK_DAYS,
  buildBaseline,
  cellKey,
  dayLabel,
  executeSave,
  gridFromBaseline,
  planSave,
  toggleCell,
  updateCell,
  type Baseline,
  type GridCell,
  type GridState,
  type ScheduleError,
} from '../../../utils/work-schedule/recurringGrid'

interface RecurringSurveyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  communeId?: string
  assignees?: WorkOrderAssignee[]
}

interface GridRow {
  segmentId: string
  name: string
  poleCount: number | null
  segmentCommuneId: string | null
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

/** Lần chạy đầu tiên của ô: `first_occurrence_date` của lịch đã lưu đúng thứ đó, nếu lịch còn chạy. */
function firstRunText(cell: GridCell, saved: SurveyRecurringItem | undefined): string {
  if (!cell.isActive) return 'Đang tạm dừng — không sinh phiếu'
  if (!saved) return 'Hệ thống tính khi lưu'
  if (saved.is_active === false) return 'Tính lại khi lưu (bật lại lịch)'
  return formatDate(saved.first_occurrence_date) || '—'
}

export const RecurringSurveyModal: React.FC<RecurringSurveyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  communeId,
  assignees = [],
}) => {
  const scopedCommune = communeId && communeId !== '*' ? communeId : undefined

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [segments, setSegments] = useState<SegmentListItem[]>([])
  const [baseline, setBaseline] = useState<Baseline>({})
  const [grid, setGrid] = useState<GridState>({})
  const [engineersByCommune, setEngineersByCommune] = useState<Record<string, WorkOrderAssignee[]>>({})
  const [errors, setErrors] = useState<Record<string, ScheduleError>>({})
  const [expanded, setExpanded] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setErrors({})
    setExpanded(null)
    try {
      const [schedules, segs] = await Promise.all([
        workScheduleAPI.getRecurringSurveySchedules(scopedCommune),
        fetchSegmentsList(scopedCommune),
      ])
      const items = schedules.items ?? []
      const nextBaseline = buildBaseline(items)
      setSegments(segs)
      setBaseline(nextBaseline)
      setGrid(gridFromBaseline(nextBaseline))

      const communes = new Set<string>()
      if (scopedCommune) communes.add(scopedCommune)
      segs.forEach((s) => s.commune_id && communes.add(s.commune_id))
      items.forEach((s) => s.commune_id && communes.add(s.commune_id))
      const lists = await Promise.allSettled(
        [...communes].map(async (c) => [c, (await workScheduleAPI.getAssignees(c)).items ?? []] as const)
      )
      const byCommune: Record<string, WorkOrderAssignee[]> = {}
      lists.forEach((r) => {
        if (r.status === 'fulfilled') byCommune[r.value[0]] = r.value[1]
      })
      setEngineersByCommune(byCommune)
    } catch (err) {
      console.error('[RecurringSurveyModal] Load failed:', err)
      toast.error('Không thể tải lịch khảo sát định kỳ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, communeId])

  // Hàng = tuyến của xã; thêm tuyến chỉ có trong lịch (vd. tuyến liên xã) để không bị ẩn.
  const rows = useMemo<GridRow[]>(() => {
    const list: GridRow[] = segments
      .filter((s) => s.segment_id)
      .map((s) => ({
        segmentId: s.segment_id!,
        name: s.segment_name || s.segment_id!,
        poleCount: s.pole_count ?? null,
        segmentCommuneId: s.commune_id,
      }))
    const known = new Set(list.map((r) => r.segmentId))
    for (const [segmentId, row] of Object.entries(baseline)) {
      if (known.has(segmentId)) continue
      const item = row.primary ?? row.extras[0]
      list.push({
        segmentId,
        name: item?.segment_name || segmentId,
        poleCount: null,
        segmentCommuneId: item?.commune_id ?? null,
      })
    }
    return list
  }, [segments, baseline])

  const savedItems = (segmentId: string): SurveyRecurringItem[] => {
    const row = baseline[segmentId]
    if (!row) return []
    return row.primary ? [row.primary, ...row.extras] : row.extras
  }

  const communeOf = (segmentId: string): string | undefined =>
    savedItems(segmentId)[0]?.commune_id ||
    scopedCommune ||
    rows.find((r) => r.segmentId === segmentId)?.segmentCommuneId ||
    undefined

  const ops = useMemo(
    () => planSave(baseline, grid, communeOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [baseline, grid, rows, scopedCommune]
  )
  const dirtySegments = useMemo(() => new Set(ops.map((o) => o.segmentId)), [ops])
  const summaryText = useMemo(() => {
    const count = { added: 0, moved: 0, changed: 0, removed: 0 }
    for (const op of ops) {
      if (op.kind === 'create') count[op.replacesScheduleId ? 'moved' : 'added']++
      else if (op.kind === 'patch') count.changed++
      else count.removed++
    }
    const parts = [
      count.added && `${count.added} thêm`,
      count.moved && `${count.moved} chuyển ngày`,
      count.changed && `${count.changed} sửa`,
      count.removed && `${count.removed} bỏ`,
    ].filter(Boolean)
    return parts.length > 0 ? `Chưa lưu: ${parts.join(' · ')}` : 'Không có thay đổi.'
  }, [ops])

  const clearRowErrors = (segmentId: string) =>
    setErrors((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${segmentId}:`)))
    )

  const handleCellClick = (segmentId: string, day: number) => {
    const turningOn = grid[segmentId]?.day !== day
    setGrid((prev) => toggleCell(prev, segmentId, day))
    clearRowErrors(segmentId)
    if (turningOn) setExpanded(segmentId)
    else if (expanded === segmentId) setExpanded(null)
  }

  const handleCellEdit = (segmentId: string, patch: Partial<Omit<GridCell, 'day'>>) => {
    setGrid((prev) => updateCell(prev, segmentId, patch))
    clearRowErrors(segmentId)
  }

  const handleSave = async () => {
    if (ops.length === 0) return
    setSaving(true)
    try {
      const result = await executeSave(ops, {
        create: (body) => workScheduleAPI.createRecurringSurveySchedule(body),
        patch: (id, body) => workScheduleAPI.patchRecurringSurveySchedule(id, body),
        remove: (id) => workScheduleAPI.deleteRecurringSurveySchedule(id),
      })
      const fresh = await workScheduleAPI.getRecurringSurveySchedules(scopedCommune)
      const nextBaseline = buildBaseline(fresh.items ?? [])
      const nextGrid = gridFromBaseline(nextBaseline)
      // Hàng lỗi giữ lựa chọn của người dùng để sửa rồi lưu lại.
      result.failedSegments.forEach((seg) => {
        nextGrid[seg] = grid[seg] ?? null
      })
      setBaseline(nextBaseline)
      setGrid(nextGrid)
      setErrors(result.errors)

      const failed = Object.keys(result.errors).length
      if (failed === 0) toast.success('Đã lưu lịch khảo sát định kỳ.')
      else toast.error(`${failed} ô chưa lưu được — xem các ô viền đỏ trên lưới.`)
      if (result.succeeded > 0) onSuccess()
    } catch (err) {
      console.error('[RecurringSurveyModal] Save failed:', err)
      toast.error('Không thể lưu lịch khảo sát định kỳ.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setGrid(gridFromBaseline(baseline))
    setErrors({})
  }

  if (!isOpen) return null

  const savedFor = (segmentId: string, day: number) =>
    savedItems(segmentId).find((s) => s.day_of_week === day)

  const engineersFor = (segmentId: string) => engineersByCommune[communeOf(segmentId) ?? ''] ?? assignees

  const engineerName = (segmentId: string, userId: string | null) => {
    if (!userId) return 'Tự động'
    return (
      engineersFor(segmentId).find((e) => e.user_id === userId)?.full_name ||
      savedItems(segmentId).find((s) => s.assigned_to === userId)?.assigned_to_name ||
      userId
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div
        role="dialog"
        aria-label="Lịch khảo sát định kỳ tuần"
        className="w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/85 backdrop-blur-xl shadow-[0_24px_64px_-16px_rgba(11,114,217,0.35)] animate-in zoom-in-95"
      >
        {/* HEADER */}
        <div className="px-4 py-4 sm:px-6 border-b border-sky-100/80 flex items-start justify-between gap-3 bg-linear-to-r from-sky-50/80 to-white/40 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#0B72D9]/10 text-[#0B72D9] flex items-center justify-center shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900">Lịch Khảo Sát Định Kỳ Tuần</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mỗi tuyến khảo sát một đêm mỗi tuần. Bấm ô để bật / tắt; bấm ô khác cùng hàng để chuyển ngày.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-[#0B72D9]" />
              <span className="text-xs font-semibold">Đang tải lịch khảo sát định kỳ...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 px-6 text-center text-sm text-slate-500">
              Xã chưa có tuyến đường nào để lập lịch khảo sát.
            </div>
          ) : (
            <table className="w-full min-w-[720px] table-fixed border-separate border-spacing-0 text-xs">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 bg-white/95 backdrop-blur px-4 py-2.5 text-left font-bold text-slate-600 border-b border-slate-200/70 w-[220px]">
                    Tuyến đường
                  </th>
                  {WEEK_DAYS.map((d) => (
                    <th
                      key={d.value}
                      className="bg-white/95 backdrop-blur px-1 py-2.5 text-center font-bold text-slate-600 border-b border-slate-200/70"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const cell = grid[row.segmentId] ?? null
                  const rowErrors = Object.entries(errors).filter(([k]) => k.startsWith(`${row.segmentId}:`))
                  const extras = baseline[row.segmentId]?.extras ?? []
                  const isExpanded = expanded === row.segmentId && cell !== null
                  const engineers = engineersFor(row.segmentId)
                  return (
                    <React.Fragment key={row.segmentId}>
                      <tr data-testid={`row-${row.segmentId}`}>
                        <td className="sticky left-0 z-[5] bg-white/95 backdrop-blur px-4 py-2 border-b border-slate-100 align-middle">
                          <button
                            type="button"
                            disabled={!cell}
                            onClick={() => setExpanded(isExpanded ? null : row.segmentId)}
                            className="w-full flex items-center gap-1.5 text-left disabled:cursor-default cursor-pointer"
                            aria-expanded={isExpanded}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800 truncate">{row.name}</span>
                                {dirtySegments.has(row.segmentId) && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Chưa lưu" />
                                )}
                              </span>
                              <span className="block text-[10.5px] text-slate-400 font-mono">
                                {row.segmentId}
                                {row.poleCount !== null ? ` · ${row.poleCount} cột` : ''}
                              </span>
                            </span>
                            {cell && (
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            )}
                          </button>
                          {extras.length > 0 && (
                            <p className="mt-1 text-[10.5px] text-amber-700">
                              Lịch thừa {extras.map((e) => dayLabel(e.day_of_week ?? 0)).join(', ')} — sẽ xoá khi lưu
                            </p>
                          )}
                          {rowErrors.map(([k, e]) => (
                            <p key={k} className="mt-1 text-[10.5px] text-rose-600 flex items-start gap-1">
                              <AlertCircle className="w-3 h-3 mt-px shrink-0" />
                              <span>
                                {dayLabel(Number(k.split(':').pop()))}: {e.message}
                              </span>
                            </p>
                          ))}
                        </td>
                        {WEEK_DAYS.map((d) => {
                          const on = cell?.day === d.value
                          const error = errors[cellKey(row.segmentId, d.value)]
                          const saved = on ? savedFor(row.segmentId, d.value) : undefined
                          const firstRun =
                            on && cell!.isActive && saved?.is_active !== false
                              ? formatDate(saved?.first_occurrence_date)
                              : ''
                          return (
                            <td key={d.value} className="px-1 py-1.5 border-b border-slate-100 align-middle">
                              <button
                                type="button"
                                aria-pressed={on}
                                aria-label={`${row.name} – ${d.label}`}
                                title={error ? error.message : undefined}
                                onClick={() => handleCellClick(row.segmentId, d.value)}
                                className={`w-full h-12 rounded-xl px-1 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer border ${
                                  on
                                    ? cell!.isActive
                                      ? 'bg-[#0B72D9] border-[#0B72D9] text-white shadow-[0_6px_16px_-6px_rgba(11,114,217,0.7)]'
                                      : 'bg-sky-50/80 border-dashed border-[#0B72D9]/50 text-[#0B72D9]'
                                    : 'bg-white/50 border-slate-200/70 hover:bg-sky-50 hover:border-sky-200'
                                } ${error ? 'ring-2 ring-rose-500 ring-offset-1' : ''}`}
                              >
                                {on ? (
                                  <>
                                    <span className="text-[11px] font-bold truncate max-w-full flex items-center gap-1">
                                      {!cell!.isActive && <Pause className="w-3 h-3" />}
                                      {cell!.isActive ? engineerName(row.segmentId, cell!.assignedTo) : 'Tạm dừng'}
                                    </span>
                                    {firstRun && <span className="text-[10px] opacity-80 font-mono">từ {firstRun}</span>}
                                  </>
                                ) : error ? (
                                  <AlertCircle className="w-4 h-4 text-rose-500" />
                                ) : null}
                              </button>
                            </td>
                          )
                        })}
                      </tr>
                      {isExpanded && cell && (
                        <tr>
                          <td colSpan={8} className="px-4 py-3 border-b border-slate-100 bg-sky-50/50">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] items-end">
                              <div className="flex flex-col gap-1">
                                <label
                                  htmlFor={`engineer-${row.segmentId}`}
                                  className="text-[11px] font-bold text-slate-600 flex items-center gap-1"
                                >
                                  <User className="w-3.5 h-3.5" /> Kỹ sư phụ trách ({dayLabel(cell.day)})
                                </label>
                                {/* select gốc: popover của OpsSelect bị khung cuộn của lưới cắt mất */}
                                <select
                                  id={`engineer-${row.segmentId}`}
                                  value={cell.assignedTo ?? ''}
                                  onChange={(e) => handleCellEdit(row.segmentId, { assignedTo: e.target.value || null })}
                                  className="w-full min-h-[38px] text-xs font-semibold text-slate-800 bg-white/80 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#0B72D9] cursor-pointer"
                                >
                                  <option value="">Để trống — tự chọn kỹ sư ít việc nhất</option>
                                  {cell.assignedTo && !engineers.some((e) => e.user_id === cell.assignedTo) && (
                                    <option value={cell.assignedTo}>{engineerName(row.segmentId, cell.assignedTo)}</option>
                                  )}
                                  {engineers.map((eng) => (
                                    <option key={eng.user_id} value={eng.user_id || ''}>
                                      {eng.full_name || eng.user_id}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1">
                                <label htmlFor={`note-${row.segmentId}`} className="text-[11px] font-bold text-slate-600">
                                  Ghi chú
                                </label>
                                <input
                                  id={`note-${row.segmentId}`}
                                  value={cell.note}
                                  maxLength={1000}
                                  onChange={(e) => handleCellEdit(row.segmentId, { note: e.target.value })}
                                  placeholder="Ghi chú cho phiếu khảo sát..."
                                  className="w-full min-h-[38px] text-xs text-slate-800 bg-white/80 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#0B72D9]"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCellEdit(row.segmentId, { isActive: !cell.isActive })}
                                className={`min-h-[38px] px-3 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                                  cell.isActive
                                    ? 'bg-white/80 border-slate-200 text-slate-700 hover:bg-white'
                                    : 'bg-[#0B72D9] border-[#0B72D9] text-white'
                                }`}
                              >
                                {cell.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                {cell.isActive ? 'Tạm dừng' : 'Chạy lại'}
                              </button>
                            </div>
                            <p className="mt-2 text-[11px] text-slate-500">
                              Lần chạy đầu tiên:{' '}
                              <strong className="text-[#0B72D9] font-mono">
                                {firstRunText(cell, savedFor(row.segmentId, cell.day))}
                              </strong>
                            </p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-4 py-3 sm:px-6 border-t border-slate-200/70 bg-white/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500">{summaryText}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              disabled={ops.length === 0 || saving}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              Hoàn tác
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={ops.length === 0 || saving || loading}
              className="flex items-center gap-2 px-5 py-2 bg-[#0B72D9] hover:bg-[#0961b8] text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Đang lưu...' : `Lưu ${ops.length > 0 ? `${ops.length} ` : ''}thay đổi`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
