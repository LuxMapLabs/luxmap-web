import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Clock, History, Loader2, Moon, Sun, Timer, User, X } from 'lucide-react'
import iotAPI from '../../../feature/iot/iotAPI'
import type { IotCommandHistoryItem } from '../../../types/iot/nodes'
import type { IotCommandHistoryStatus } from '../../../types/common/enums'
import { currentChoice, type IotCommandChoice } from '../../../utils/iot/iotCommand'
import { apiErrorMessage } from '../../../utils/iot/apiError'

/** Số lệnh mỗi trang (GET command/history, mới nhất trước). */
export const HISTORY_PAGE_SIZE = 10
/** Đọc lại trang đầu khi còn lệnh đang chờ node xác nhận. */
export const HISTORY_POLL_MS = 5_000

export interface CommandHistoryFeeder {
  feederId: string
  label: string
  nodeId: string
}

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

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString('vi-VN') : '—')

/**
 * Nhật ký lệnh Bật / Tắt / AUTO của node IoT gán cho mạch: GET /iot/nodes/{nodeId}/command/history
 * (mới nhất trước, `status` success | pending | expired), phân trang `HISTORY_PAGE_SIZE` lệnh. Tủ nhiều mạch thì chọn
 * mạch ở thanh trên; lọc trạng thái trên trang đang xem. Trang có lệnh đang chờ thì đọc lại mỗi `HISTORY_POLL_MS`.
 */
export const IotCommandHistoryModal: React.FC<{
  title: string
  feeders: CommandHistoryFeeder[]
  initialFeederId?: string | null
  onClose: () => void
}> = ({ title, feeders, initialFeederId, onClose }) => {
  const [feederId, setFeederId] = useState(
    feeders.find((f) => f.feederId === initialFeederId)?.feederId ?? feeders[0]?.feederId ?? null
  )
  const active = feeders.find((f) => f.feederId === feederId) ?? null
  const nodeId = active?.nodeId ?? null

  const [items, setItems] = useState<IotCommandHistoryItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | IotCommandHistoryStatus>('all')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const loadPage = useCallback(
    async (id: string, nextPage: number) => {
      setLoading(true)
      try {
        const result = await iotAPI.getCommandHistory(id, { page: nextPage, page_size: HISTORY_PAGE_SIZE })
        const fresh = result.items || []
        setItems(fresh)
        setTotal(result.total ?? fresh.length)
        setPage(nextPage)
        setError(null)
      } catch (err) {
        setError(apiErrorMessage(err, 'Không đọc được lịch sử lệnh.'))
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    setItems([])
    setTotal(0)
    setFilter('all')
    if (nodeId) loadPage(nodeId, 1)
  }, [nodeId, loadPage])

  const hasPending = items.some((item) => item.status === 'pending')
  // Lệnh đang chờ node xác nhận: đọc lại trang đang xem để thấy nó thành success / expired
  useEffect(() => {
    if (!nodeId || !hasPending) return
    const timer = window.setInterval(() => loadPage(nodeId, page), HISTORY_POLL_MS)
    return () => window.clearInterval(timer)
  }, [nodeId, hasPending, page, loadPage])

  const pages = Math.max(1, Math.ceil(total / HISTORY_PAGE_SIZE))

  const counts = useMemo(() => {
    const map = { all: items.length, success: 0, pending: 0, expired: 0 }
    for (const item of items) if (item.status && item.status in map) map[item.status] += 1
    return map
  }, [items])
  const shown = filter === 'all' ? items : items.filter((item) => item.status === filter)

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        role="dialog"
        aria-label="Nhật ký lệnh điều khiển"
        className="w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Nhật ký lệnh điều khiển</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {title}
                {nodeId && (
                  <>
                    {' '}· node <span className="font-mono">{nodeId}</span> · {total} lệnh
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 shrink-0 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-3 space-y-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          {feeders.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mạch">
              {feeders.map((f) => (
                <button
                  key={f.feederId}
                  type="button"
                  aria-pressed={f.feederId === feederId}
                  onClick={() => setFeederId(f.feederId)}
                  className={`px-2.5 py-1 rounded-lg font-semibold border cursor-pointer ${
                    f.feederId === feederId
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Trạng thái">
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                  filter === key ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {key === 'all' ? 'Tất cả' : STATUS[key].label} ({counts[key]})
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 text-xs">
          {!nodeId && <p className="text-slate-500 italic">Mạch chưa gắn node IoT nên chưa có lệnh nào.</p>}
          {error && <p className="font-semibold text-rose-700 dark:text-rose-300">{error}</p>}
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
                    <span className="font-mono">{item.mode || '—'}</span>
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
                      <User className="w-3 h-3" /> {item.requested_by || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Bridge nhận lệnh</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{formatTime(item.bridge_accepted_at)}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Thiết bị</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{item.device_id || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400">Mạch</span>
                    <span className="font-mono text-slate-700 dark:text-slate-200">{item.feeder_id || '—'}</span>
                  </div>
                </div>
              </div>
            )
          })}

          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          )}
        </div>

        {nodeId && total > HISTORY_PAGE_SIZE && (
          <nav
            aria-label="Phân trang"
            className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 border-t border-slate-100 dark:border-slate-800 text-xs"
          >
            <span className="text-slate-500 dark:text-slate-400">
              Trang {page} / {pages} · {total} lệnh
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => loadPage(nodeId, page - 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40 cursor-pointer"
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
                    className={`min-w-7 px-2 py-1 rounded-lg font-semibold cursor-pointer ${
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
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>,
    document.body
  )
}

export default IotCommandHistoryModal
