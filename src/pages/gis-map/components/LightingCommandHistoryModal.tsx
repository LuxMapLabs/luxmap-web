import React, { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  History,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Radio,
  Layers,
  Zap,
  Filter,
} from 'lucide-react'
import type { RootState } from '../../../redux/rootReducer'
import {
  closeHistoryModal,
  getLightingCommandsRequest,
} from '../../../feature/lighting/lightingSlice'
import type { LightingCommandItem } from '../../../types/lighting/commands'
import type { FeederControlMode, LightingCommandStatus } from '../../../types/common/enums'

export const LightingCommandHistoryModal: React.FC = () => {
  const dispatch = useDispatch()
  const {
    isHistoryModalOpen,
    historyFilterFeederId,
    historyModalTitle,
    history,
    isHistoryLoading,
    historyError,
  } = useSelector((state: RootState) => state.lighting)

  const [statusFilter, setStatusFilter] = useState<string>('all')

  const allItems = useMemo(() => history?.items || [], [history?.items])

  // Xác định xem có lệnh nào đang dở dang (pending hoặc delivered) cần theo dõi hay không
  const hasInFlight = useMemo(() => {
    return allItems.some(
      (cmd) => cmd.status === 'pending' || cmd.status === 'delivered'
    )
  }, [allItems])

  // Dùng Ref để lưu trạng thái hasInFlight cho interval polling ngầm
  // Tránh việc đưa allItems hoặc history vào dependencies của useEffect gây vòng lặp fetch vô tận
  const hasInFlightRef = useRef(hasInFlight)
  useEffect(() => {
    hasInFlightRef.current = hasInFlight
  }, [hasInFlight])

  // 1. Chỉ chạy duy nhất khi mở Modal hoặc khi đổi mạch (feederId) cần xem
  // - Reset filter về 'all'
  // - Gọi fetch danh sách lần đầu
  useEffect(() => {
    if (!isHistoryModalOpen) return

    setStatusFilter('all')
    dispatch(
      getLightingCommandsRequest({
        feeder_id: historyFilterFeederId || undefined,
        page_size: 100,
      })
    )
  }, [dispatch, isHistoryModalOpen, historyFilterFeederId])

  // 2. Polling định kỳ ngầm mỗi 4 giây (chỉ chạy khi modal đang mở VÀ có lệnh in-flight)
  // - Tuyệt đối không phụ thuộc vào allItems / history trong deps -> Không gây re-fetch liên tục
  // - Tuyệt đối không gọi setStatusFilter('all') -> Giữ nguyên tab người dùng đang chọn
  useEffect(() => {
    if (!isHistoryModalOpen) return

    const timer = setInterval(() => {
      if (hasInFlightRef.current) {
        dispatch(
          getLightingCommandsRequest({
            feeder_id: historyFilterFeederId || undefined,
            page_size: 100,
          })
        )
      }
    }, 4000)

    return () => clearInterval(timer)
  }, [dispatch, isHistoryModalOpen, historyFilterFeederId])

  // Đóng modal khi bấm ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isHistoryModalOpen) {
        dispatch(closeHistoryModal())
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, isHistoryModalOpen])

  // Lọc dữ liệu thuần túy ở Client-side (in-memory) — KHÔNG gọi API / dispatch lại
  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return allItems
    return allItems.filter((cmd) => cmd.status === statusFilter)
  }, [allItems, statusFilter])

  // Thống kê số lượng từng trạng thái để hiển thị trực quan
  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: allItems.length,
      applied: 0,
      delivered: 0,
      pending: 0,
      failed: 0,
      expired: 0,
    }
    allItems.forEach((cmd) => {
      if (map[cmd.status] !== undefined) {
        map[cmd.status] += 1
      }
    })
    return map
  }, [allItems])

  if (!isHistoryModalOpen) return null

  const handleClose = () => {
    dispatch(closeHistoryModal())
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const renderModeBadge = (mode: FeederControlMode) => {
    switch (mode) {
      case 'on':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            BẬT NGUỒN
          </span>
        )
      case 'off':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            NGẮT NGUỒN
          </span>
        )
      case 'auto':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            TỰ ĐỘNG
          </span>
        )
    }
  }

  const renderStatusBadge = (status: LightingCommandStatus) => {
    switch (status) {
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã thực thi
          </span>
        )
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            Đã nhận lệnh (Gateway)
          </span>
        )
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Đang chờ gửi
          </span>
        )
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            Thất bại
          </span>
        )
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
            <AlertCircle className="w-3.5 h-3.5" />
            Quá hạn
          </span>
        )
      case 'superseded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            <Layers className="w-3.5 h-3.5" />
            Bị ghi đè
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {status}
          </span>
        )
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header — Đã bỏ nút Load theo chỉ đạo */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                <span>Nhật Ký Lệnh Điều Khiển (IoT)</span>
                {historyFilterFeederId && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    {historyFilterFeederId}
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-mono font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                  {filteredItems.length} lệnh
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {historyModalTitle ? (
                  <span>
                    Đang xem lịch sử của: <strong className="text-slate-700 dark:text-slate-200 font-semibold">{historyModalTitle}</strong>
                  </span>
                ) : (
                  'Theo dõi tiến trình phát lệnh điều khiển, trạng thái tiếp nhận Gateway và thực thi rơ-le'
                )}
              </p>
            </div>
          </div>

          {/* Nút Đóng (Không có nút Load) */}
          <button
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters (Client-side, không gọi API khi bấm) */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Trạng thái:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'applied', label: 'Đã thực thi' },
              { id: 'delivered', label: 'Đã tới Gateway' },
              { id: 'pending', label: 'Đang chờ' },
              { id: 'failed', label: 'Lỗi' },
              { id: 'expired', label: 'Quá hạn' },
            ].map((tab) => {
              const count = counts[tab.id] || 0
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      statusFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {historyFilterFeederId && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs">
              <Zap className="w-3.5 h-3.5" />
              <span>Lộ điện: <strong>{historyFilterFeederId}</strong></span>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {isHistoryLoading && allItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
              <p className="text-sm">Đang tải nhật ký lệnh điều khiển...</p>
            </div>
          ) : historyError ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Lỗi tải nhật ký:</strong> {historyError}
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-14 text-center text-slate-400 dark:text-slate-500 space-y-2">
              <History className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {allItems.length === 0
                  ? 'Chưa có lệnh điều khiển nào'
                  : 'Không có lệnh nào phù hợp với bộ lọc trạng thái'}
              </p>
              <p className="text-xs text-slate-400">
                {allItems.length === 0
                  ? `Mạch ${historyFilterFeederId || ''} chưa phát sinh lệnh điều khiển Bật / Tắt / Auto qua hạ tầng IoT.`
                  : 'Hãy chọn tab trạng thái khác để xem các lệnh đã ghi nhận.'}
              </p>
            </div>
          ) : (
            filteredItems.map((cmd: LightingCommandItem) => (
              <div
                key={cmd.command_id || `${cmd.request_id}-${cmd.seq}`}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition shadow-xs space-y-2.5"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {renderModeBadge(cmd.requested_mode)}
                    {renderStatusBadge(cmd.status)}
                    {cmd.feeder_id && (
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {cmd.feeder_id}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(cmd.created_at)}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tủ / Thiết bị IoT</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">
                      {cmd.node_id || cmd.cabinet_id || 'Chưa gán Node'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Rơ-le tác động</span>
                    <strong className="text-slate-700 dark:text-slate-200 font-mono">
                      Rơ-le #{cmd.relay_no}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Giao Gateway</span>
                    <span className="text-slate-600 dark:text-slate-300 font-mono">
                      {formatDateTime(cmd.delivered_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Hoàn tất thực thi</span>
                    <span className="text-slate-600 dark:text-slate-300 font-mono">
                      {formatDateTime(cmd.completed_at)}
                    </span>
                  </div>
                </div>

                {/* Error Banner if any */}
                {cmd.error && (
                  <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2 border border-rose-200 dark:border-rose-900">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Lỗi thiết bị: {cmd.error}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Dữ liệu ghi nhận trực tiếp từ hạ tầng mạng viễn thông & Gateway IoT
          </span>
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default LightingCommandHistoryModal
