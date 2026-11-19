import React, { useCallback, useEffect, useId, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch } from '../redux/store'
import { AlertCircle, CheckCircle2, Clock, Loader2, Moon, RotateCw, Sun, Timer, User } from 'lucide-react'
import {
  clearCommandHistory,
  fetchCommandHistoryRequest,
  resetCommandHistory,
  selectCommandHistory,
  type IotMonitorState,
} from '../feature/iot/iotMonitorSlice'
import type { IotCommandHistoryItem } from '../types/iot/nodes'
import type { IotCommandHistoryStatus } from '../types/common/enums'
import { currentChoice, type IotCommandChoice } from '../utils/iot/iotCommand'

/** Số lệnh mỗi trang (GET command/history, mới nhất trước). */
const HISTORY_PAGE_SIZE = 10
/** Đọc lại trang đầu khi còn lệnh đang chờ node xác nhận. */
const HISTORY_POLL_MS = 5_000

const CHOICE: Record<IotCommandChoice, { label: string; icon: React.ReactNode; className: string }> = {
  on: {
    label: 'Bật',
    icon: <Sun className="w-3.5 h-3.5" />,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  },
  off: {
    label: 'Tắt',
    icon: <Moon className="w-3.5 h-3.5" />,
    className: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  },
  auto: {
    label: 'AUTO',
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
  },
}

const STATUS: Record<IotCommandHistoryStatus, { label: string; icon: React.ReactNode; className: string }> = {
  success: {
    label: 'Thành công',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  pending: {
    label: 'Đang chờ',
    icon: <Timer className="w-3.5 h-3.5" />,
    className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  expired: {
    label: 'Quá hạn',
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  },
}

const FILTERS: Array<'all' | IotCommandHistoryStatus> = ['all', 'success', 'pending', 'expired']

/** Backend cũ chưa trả `status`: hiện rõ là chưa rõ, không để trống. */
const NO_STATUS = {
  label: 'Chưa rõ trạng thái',
  icon: <AlertCircle className="w-3.5 h-3.5" />,
  className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
}

/** Số trang hiện quanh trang đang xem: 1 … 4 5 [6] 7 8 … 20 */
function pageNumbers(page: number, pages: number): Array<number | '…'> {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages))
  const sorted = [...set].sort((a, b) => a - b)
  const out: Array<number | '…'> = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '-')

const EMPTY_ITEMS: IotCommandHistoryItem[] = []

/**
 * Danh sách lịch sử lệnh Bật / Tắt / AUTO của một node IoT (GET /iot/nodes/{nodeId}/command/history).
 */
export const IotCommandHistoryList: React.FC<{ nodeId: string | null }> = ({ nodeId }) => {
  const key = useId()
  const dispatch = useDispatch<AppDispatch>()

  const entry = useSelector((s: { iotMonitor: IotMonitorState }) => selectCommandHistory(s, key))
  const items = entry?.items ?? EMPTY_ITEMS
  const total = entry?.total ?? 0
  const page = entry?.page ?? 1
  const loading = entry?.loading ?? false
  const error = entry?.error ?? null
  const [filter, setFilter] = useState<'all' | IotCommandHistoryStatus>('all')

  const loadPage = useCallback(
    (id: string, nextPage: number) => {
      dispatch(fetchCommandHistoryRequest({ key, nodeId: id, page: nextPage }))
    },
    [dispatch, key]
  )

  useEffect(() => {
    dispatch(resetCommandHistory({ key, nodeId: nodeId ?? '' }))
    setFilter('all')
    if (nodeId) loadPage(nodeId, 1)
  }, [nodeId, loadPage, dispatch, key])

  useEffect(() => {
    return () => {
      dispatch(clearCommandHistory({ key }))
    }
  }, [dispatch, key])

  const hasPending = items.some((item) => item.status === 'pending')
  // Lệnh đang chờ node xác nhận: đọc lại trang đang xem để thấy nó thành success / expired
  useEffect(() => {
    if (!nodeId || !hasPending) return
    const timer = window.setInterval(() => loadPage(nodeId, page), HISTORY_POLL_MS)
    return () => window.clearInterval(timer)
  }, [nodeId, hasPending, page, loadPage])

  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE))
  const shown = filter === 'all' ? items : items.filter((item) => item.status === filter)
  const disableFilters = (Boolean(error) && items.length === 0) || (loading && items.length === 0)

  return (
    <div className="flex flex-col min-h-0 text-xs">
      <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Trạng thái">
          {FILTERS.map((filterKey) => {
            const label = filterKey === 'all' ? 'Tất cả' : STATUS[filterKey].label
            const isSelected = filter === filterKey
            return (
              <button
                key={filterKey}
                type="button"
                aria-pressed={isSelected}
                disabled={disableFilters}
                onClick={() => setFilter(filterKey)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  disableFilters
                    ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600'
                    : isSelected
                    ? 'bg-indigo-600 text-white cursor-pointer'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 py-3 space-y-2.5">
        {!nodeId && <p className="text-slate-500 italic">Mạch chưa gắn node IoT nên chưa có lệnh nào.</p>}

        {/* Lỗi khi chưa có dữ liệu (lần đầu hoặc đổi trang) */}
        {error && items.length === 0 && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
                Không tải được nhật ký lệnh
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300 break-words">{error}</p>
              <div className="pt-1.5">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => nodeId && loadPage(nodeId, page)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs cursor-pointer disabled:cursor-not-allowed transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lỗi khi đã có dữ liệu (lỗi khi poll): hiện khối gọn phía trên danh sách */}
        {error && items.length > 0 && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span className="font-semibold text-rose-900 dark:text-rose-200 shrink-0">
                Không tải được nhật ký lệnh:
              </span>
              <span className="text-rose-700 dark:text-rose-300 truncate">{error}</span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => nodeId && loadPage(nodeId, page)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs shrink-0 cursor-pointer disabled:cursor-not-allowed transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <RotateCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              <span>Thử lại</span>
            </button>
          </div>
        )}

        {/* Đang tải lần đầu (chưa có item và chưa có error) */}
        {loading && items.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Đang tải nhật ký lệnh…</span>
          </div>
        )}

        {nodeId && !loading && !error && shown.length === 0 && (
          <p className="text-slate-400 italic">{items.length === 0 ? 'Chưa có lệnh nào.' : 'Không có lệnh ở trạng thái này.'}</p>
        )}

        {shown.map((item) => {
          const choice = currentChoice(item)
          const status = item.status ? STATUS[item.status] : NO_STATUS
          return (
            <div
              key={item.command_id || `${item.requested_at}`}
              data-testid="iot-command-row"
              className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                {choice ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${CHOICE[choice].className}`}>
                    {CHOICE[choice].icon} {CHOICE[choice].label}
                  </span>
                ) : (
                  <span className="font-mono">{item.mode || '-'}</span>
                )}
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${status.className}`}>
                  {status.icon} {status.label}
                </span>
                {choice === 'auto' && item.auto_schedule?.day_start && item.auto_schedule.night_start && (
                  <span className="text-slate-500 dark:text-slate-400">
                    ngày từ {item.auto_schedule.day_start} · đêm từ {item.auto_schedule.night_start}
                  </span>
                )}
                <span className="ml-auto text-slate-400 inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {formatTime(item.requested_at)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="block text-slate-400">Người gửi</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                    <User className="w-3 h-3" /> {item.requested_by || '-'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Bridge nhận lệnh</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(item.bridge_accepted_at)}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Thiết bị</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{item.device_id || '-'}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Mạch</span>
                  <span className="font-mono text-slate-700 dark:text-slate-200">{item.feeder_id || '-'}</span>
                </div>
              </div>
            </div>
          )
        })}

        {loading && items.length > 0 && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        )}
      </div>

      {nodeId && total > HISTORY_PAGE_SIZE && items.length > 0 && (
        <nav
          aria-label="Phân trang"
          className="flex flex-wrap items-center justify-between gap-2 py-3 border-t border-slate-100 dark:border-slate-800 text-xs"
        >
          <span className="text-slate-500 dark:text-slate-400">
            Trang {page} / {pages} · {total} lệnh
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => loadPage(nodeId, page - 1)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              Trước
            </button>
            {pageNumbers(page, pages).map((n, i) =>
              n === '…' ? (
                <span key={`gap-${i}`} className="px-1 text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  type="button"
                  aria-current={n === page ? 'page' : undefined}
                  disabled={loading}
                  onClick={() => loadPage(nodeId, n)}
                  className={`min-w-7 px-2 py-1 rounded-lg font-semibold cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                    n === page ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {n}
                </button>
              )
            )}
            <button
              type="button"
              disabled={loading || page >= pages}
              onClick={() => loadPage(nodeId, page + 1)}
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

export default IotCommandHistoryList
