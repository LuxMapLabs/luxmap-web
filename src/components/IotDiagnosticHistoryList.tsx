import React, { useEffect, useId, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../redux/store'
import { AlertCircle, CalendarRange, Loader2, RotateCw } from 'lucide-react'
import {
  DIAGNOSTIC_HISTORY_PAGE_SIZE,
  clearDiagnosticHistory,
  fetchDiagnosticHistoryRequest,
  resetDiagnosticHistory,
  selectDiagnosticHistory,
  type IotMonitorState,
} from '../feature/iot/iotMonitorSlice'
import { iotAnomalyLabel } from '../constants/iot'
import type { IotDiagnosticHistoryItem } from '../types/iot/feeders'
import { DateRangePicker } from './DateRangePicker'
import { startOfDay, endOfDay, type DateRange } from '../utils/dateUtils'

type DiagnosticRangeKey = '24h' | '7d' | '30d' | 'all'

const RANGE_OPTIONS: Array<{ key: DiagnosticRangeKey; label: string; ms: number | null }> = [
  { key: '24h', label: '24 giờ', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', label: '7 ngày', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', label: '30 ngày', ms: 30 * 24 * 60 * 60 * 1000 },
  { key: 'all', label: 'Tất cả', ms: null },
]

const EMPTY_ITEMS: IotDiagnosticHistoryItem[] = []

const fromForRange = (rk: DiagnosticRangeKey): string | null => {
  const opt = RANGE_OPTIONS.find((o) => o.key === rk)
  return opt?.ms != null ? new Date(Date.now() - opt.ms).toISOString() : null
}

const formatTime = (value?: string | null): string => {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString('vi-VN')
}

const formatDuration = (start?: string | null, end?: string | null): string => {
  if (!start || !end) return '-'
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (!Number.isFinite(s) || !Number.isFinite(e) || e < s) return '-'
  const totalMinutes = Math.floor((e - s) / 60_000)
  if (totalMinutes < 1) return '< 1 phút'
  if (totalMinutes < 60) return `${totalMinutes} phút`
  const totalHours = Math.floor(totalMinutes / 60)
  const remMinutes = totalMinutes % 60
  if (totalHours < 24) return `${totalHours} giờ ${remMinutes} phút`
  const days = Math.floor(totalHours / 24)
  const remHours = totalHours % 24
  return `${days} ngày ${remHours} giờ`
}

const statusMeta = (
  status?: string | null
): { label: string; className: string; title?: string } => {
  switch (status) {
    case 'active':
      return {
        label: 'Đang lỗi',
        className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
      }
    case 'resolved':
      return {
        label: 'Đã phục hồi',
        className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
      }
    case 'interrupted':
      return {
        label: 'Gián đoạn',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
        title: 'Đổi node / nguồn / ngưỡng hoặc mất quan sát liên tục — không phải đã phục hồi',
      }
    default:
      return {
        label: status || '-',
        className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      }
  }
}

const formatNum = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : '-'

const buildEvidence = (item: IotDiagnosticHistoryItem): string | null => {
  const a = item.anomaly
  if (!a) return null
  const parts: string[] = []
  if (a.observed != null) parts.push(`đo ${formatNum(a.observed, 2)}`)
  if (a.reference != null) parts.push(`danh định ${formatNum(a.reference, 2)}`)
  if (a.deviation_percent != null) parts.push(`lệch ${formatNum(a.deviation_percent, 1)}%`)
  if (a.limit != null) parts.push(`giới hạn ${formatNum(a.limit, 2)}`)
  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * Danh sách lịch sử các đợt lỗi của một mạch điện (GET /iot/feeders/{feederId}/diagnostics/history).
 */
export const IotDiagnosticHistoryList: React.FC<{ feederId: string | null }> = ({ feederId }) => {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()

  const entry = useSelector((s: { iotMonitor: IotMonitorState }) => selectDiagnosticHistory(s, key))
  const items = entry?.items ?? EMPTY_ITEMS
  const total = entry?.total ?? 0
  const page = entry?.page ?? 1
  const loading = entry?.loading ?? false
  const error = entry?.error ?? null

  const [viewMode, setViewMode] = useState<'recent' | 'by_date'>('recent')
  const [rangeKey, setRangeKey] = useState<DiagnosticRangeKey>('7d')
  const [dayRange, setDayRange] = useState<DateRange>({ startDate: null, endDate: null })
  const maxPickerDate = useMemo(() => new Date(), [])

  useEffect(() => {
    dispatch(resetDiagnosticHistory({ key, feederId: feederId ?? '' }))
    setViewMode('recent')
    setRangeKey('7d')
    setDayRange({ startDate: null, endDate: null })
    if (feederId) {
      dispatch(
        fetchDiagnosticHistoryRequest({
          key,
          feederId,
          page: 1,
          from: fromForRange('7d'),
          to: null,
        })
      )
    }
  }, [feederId, dispatch, key])

  useEffect(() => {
    return () => {
      dispatch(clearDiagnosticHistory({ key }))
    }
  }, [dispatch, key])

  const fetchForDayRange = (nextRange: DateRange) => {
    if (!feederId || !nextRange.startDate || !nextRange.endDate) return
    const from = startOfDay(nextRange.startDate)
    const endPlusOne = endOfDay(nextRange.endDate).getTime() + 1
    const to = new Date(Math.min(endPlusOne, Date.now()))
    if (from.getTime() >= to.getTime()) return
    dispatch(
      fetchDiagnosticHistoryRequest({
        key,
        feederId,
        page: 1,
        from: from.toISOString(),
        to: to.toISOString(),
      })
    )
  }

  const handleChangeViewMode = (mode: 'recent' | 'by_date') => {
    if (mode === viewMode) return
    setViewMode(mode)
    if (!feederId) return
    if (mode === 'recent') {
      dispatch(
        fetchDiagnosticHistoryRequest({
          key,
          feederId,
          page: 1,
          from: fromForRange(rangeKey),
          to: null,
        })
      )
    } else {
      fetchForDayRange(dayRange)
    }
  }

  const handleChangeDayRange = (next: DateRange) => {
    setDayRange(next)
    fetchForDayRange(next)
  }

  const handleSelectRange = (nextRange: DiagnosticRangeKey) => {
    setRangeKey(nextRange)
    if (!feederId) return
    dispatch(
      fetchDiagnosticHistoryRequest({
        key,
        feederId,
        page: 1,
        from: fromForRange(nextRange),
        to: null,
      })
    )
  }

  const loadPage = (nextPage: number) => {
    if (!feederId) return
    dispatch(
      fetchDiagnosticHistoryRequest({
        key,
        feederId,
        page: nextPage,
        from: entry?.from ?? null,
        to: entry?.to ?? null,
      })
    )
  }

  const waitingForDateRange = viewMode === 'by_date' && (!dayRange.startDate || !dayRange.endDate)
  const pages = Math.max(1, Math.ceil(total / DIAGNOSTIC_HISTORY_PAGE_SIZE))

  return (
    <div className="flex flex-col min-h-0 text-xs">
      <div className="pb-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Kiểu xem"
            className="inline-flex shrink-0 items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            {(
              [
                ['recent', 'Gần nhất'],
                ['by_date', 'Theo ngày'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                disabled={!feederId}
                onClick={() => handleChangeViewMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  !feederId
                    ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    : viewMode === mode
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs cursor-pointer'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {viewMode === 'recent' ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Khoảng thời gian">
              {RANGE_OPTIONS.map((opt) => {
                const isSelected = rangeKey === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!feederId}
                    onClick={() => handleSelectRange(opt.key)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      !feederId
                        ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600'
                        : isSelected
                          ? 'bg-indigo-600 text-white cursor-pointer'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          ) : (
            <DateRangePicker
              value={dayRange}
              onChange={handleChangeDayRange}
              maxDate={maxPickerDate}
              placeholder="Chọn khoảng ngày"
            />
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          &quot;Đang lỗi&quot; là đợt chưa đóng; &quot;Lần cuối xác nhận lỗi&quot; không khẳng định lỗi vẫn còn ở thời điểm xem.
        </p>
      </div>

      <div className="flex-1 py-3 space-y-2.5">
        {!feederId && (
          <p className="text-slate-500 italic">Node chưa gắn mạch nên chưa có lịch sử sự cố.</p>
        )}

        {feederId && waitingForDateRange && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarRange className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Chọn khoảng ngày để xem
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Xem lại các đợt lỗi trong một khoảng ngày cụ thể.
            </p>
          </div>
        )}

        {feederId && !waitingForDateRange && error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
                Không tải được lịch sử sự cố
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 break-words">{error}</p>
              <div className="pt-1.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => loadPage(page)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer disabled:cursor-not-allowed transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {feederId && !waitingForDateRange && loading && items.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Đang tải lịch sử sự cố…</span>
          </div>
        )}

        {feederId && !waitingForDateRange && !loading && !error && items.length === 0 && (
          <div className="space-y-1 py-4">
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {viewMode === 'by_date'
                ? 'Không có đợt lỗi nào trong khoảng này.'
                : 'Chưa ghi nhận đợt lỗi nào trong khoảng này.'}
            </p>
            {viewMode === 'recent' && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Lịch sử chỉ có từ khi hệ thống bắt đầu ghi, không có dữ liệu trước đó.
              </p>
            )}
          </div>
        )}

        {!waitingForDateRange && items.map((item, idx) => {
          const st = statusMeta(item.status)
          const evidence = buildEvidence(item)
          const duration = formatDuration(item.started_at, item.closed_at ?? item.ended_at)
          return (
            <div
              key={item.history_id ?? `${item.code}-${item.started_at}-${idx}`}
              data-testid="iot-diagnostic-row"
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-slate-900 dark:text-slate-100">
                  {iotAnomalyLabel(item.code)}
                </strong>
                <span
                  title={st.title}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${st.className}`}
                >
                  {st.label}
                </span>
                {item.node_id && (
                  <span className="ml-auto text-slate-400">
                    node <span className="font-mono">{item.node_id}</span>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="block text-slate-400">Bắt đầu</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatTime(item.started_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Lần cuối xác nhận lỗi</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatTime(item.ended_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Phục hồi</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {formatTime(item.closed_at)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Kéo dài</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {duration}
                  </span>
                </div>
              </div>

              {evidence && (
                <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  {evidence}
                </p>
              )}
            </div>
          )
        })}

        {feederId && !waitingForDateRange && loading && items.length > 0 && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {feederId && !waitingForDateRange && total > DIAGNOSTIC_HISTORY_PAGE_SIZE && items.length > 0 && (
        <nav
          aria-label="Phân trang"
          className="flex flex-wrap items-center justify-between gap-2 py-3 border-t border-slate-100 dark:border-slate-800 text-xs"
        >
          <span className="text-slate-500 dark:text-slate-400">
            Trang {page} / {pages} · {total} đợt
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => loadPage(page - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={loading || page >= pages}
              onClick={() => loadPage(page + 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Sau
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

export default IotDiagnosticHistoryList
