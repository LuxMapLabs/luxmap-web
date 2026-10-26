import React, { useState, useMemo } from 'react'
import { AlertTriangle, Filter, AlertCircle } from 'lucide-react'
import type { FaultItem } from '../../../types/faults/faults'

export type ProgressFilterType =
  | 'all'
  | 'unassigned'
  | 'waiting_repair'
  | 'in_progress'
  | 'verified'

interface FaultsTableCardProps {
  faults: FaultItem[]
  activeTab: 'all' | 'blackout' | 'dim' | 'offline'
  onTabChange: (tab: 'all' | 'blackout' | 'dim' | 'offline') => void
  segmentNameMap: Record<string, string>
  onSelectFault: (fault: FaultItem) => void
  onNavigateToCreateSchedule?: (fault: FaultItem) => void
  totalCount: number
  blackoutCount: number
  dimCount: number
  offlineCount: number
}

export function getFaultProgressInfo(fault: FaultItem): {
  key: ProgressFilterType
  label: string
  bgClass: string
  textClass: string
  borderClass: string
  dotClass: string
} {
  const status = fault.fault_status
  const woId = fault.work_order_id

  if (status === 'verified') {
    return {
      key: 'verified',
      label: woId ? `Đã nghiệm thu (${woId})` : 'Đã nghiệm thu',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200/70',
      dotClass: 'bg-emerald-500',
    }
  }

  // Chờ nghiệm thu (resolved) được gộp vào Đang sửa chữa (in_progress)
  if (status === 'resolved' || status === 'in_progress') {
    return {
      key: 'in_progress',
      label:
        status === 'resolved'
          ? woId
            ? `Chờ duyệt nghiệm thu (${woId})`
            : 'Chờ duyệt nghiệm thu'
          : woId
          ? `Đang sửa chữa (${woId})`
          : 'Đang sửa chữa',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-700',
      borderClass: 'border-amber-200/70',
      dotClass: 'bg-amber-500 animate-pulse',
    }
  }

  if (status === 'confirmed' || (status === 'detected' && woId)) {
    return {
      key: 'waiting_repair',
      label: woId ? `Chờ sửa chữa (${woId})` : 'Chờ sửa chữa',
      bgClass: 'bg-blue-50',
      textClass: 'text-blue-700',
      borderClass: 'border-blue-200/70',
      dotClass: 'bg-blue-500',
    }
  }

  if (status === 'rejected') {
    return {
      key: 'all',
      label: 'Đã từ chối',
      bgClass: 'bg-slate-100',
      textClass: 'text-slate-600',
      borderClass: 'border-slate-200/70',
      dotClass: 'bg-slate-400',
    }
  }

  return {
    key: 'unassigned',
    label: 'Chưa phân lịch',
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-800',
    borderClass: 'border-rose-300',
    dotClass: 'bg-rose-600',
  }
}

export const FaultsTableCard: React.FC<FaultsTableCardProps> = ({
  faults,
  activeTab,
  onTabChange,
  segmentNameMap,
  onSelectFault,
  onNavigateToCreateSchedule,
  totalCount,
  blackoutCount,
  dimCount,
  offlineCount,
}) => {
  // State lọc theo Tiến độ xử lý
  const [progressFilter, setProgressFilter] = useState<ProgressFilterType>('all')

  // Đếm số lượng theo tiến độ trên tập faults hiện tại
  const progressCounts = useMemo(() => {
    let unassigned = 0
    let waitingRepair = 0
    let inProgress = 0
    let verified = 0

    faults.forEach((f) => {
      const p = getFaultProgressInfo(f)
      if (p.key === 'unassigned') unassigned++
      else if (p.key === 'waiting_repair') waitingRepair++
      else if (p.key === 'in_progress') inProgress++
      else if (p.key === 'verified') verified++
    })

    return {
      unassigned,
      waitingRepair,
      inProgress,
      verified,
    }
  }, [faults])

  // Lọc danh sách hiển thị kết hợp cả loại sự cố và tiến độ xử lý
  const displayedFaults = useMemo(() => {
    if (progressFilter === 'all') return faults
    return faults.filter((f) => getFaultProgressInfo(f).key === progressFilter)
  }, [faults, progressFilter])

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header bảng */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Giám Sát Sự Cố Bóng Đèn</h3>
              <p className="text-[11px] text-slate-500">
                Tổng hợp đa nguồn (Xe quét AI, Khảo sát, Cảm biến IoT, Dân quét QR)
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200/60">
            {displayedFaults.length} / {faults.length} sự cố
          </span>
        </div>

        {/* 4 Tab Lọc Theo Loại Sự Cố */}
        <div className="flex gap-1.5 border-b border-slate-100 pb-2.5 mb-2.5 text-xs flex-wrap">
          <button
            onClick={() => onTabChange('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => onTabChange('blackout')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'blackout'
                ? 'bg-red-600 text-white'
                : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            Mất sáng hoàn toàn ({blackoutCount})
          </button>
          <button
            onClick={() => onTabChange('dim')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dim'
                ? 'bg-amber-600 text-white'
                : 'text-slate-500 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Sáng yếu / Suy giảm ({dimCount})
          </button>
          <button
            onClick={() => onTabChange('offline')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'offline'
                ? 'bg-purple-600 text-white'
                : 'text-slate-500 hover:text-purple-600 hover:bg-purple-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            Mất kết nối IoT ({offlineCount})
          </button>
        </div>

        {/* Thanh Lọc Theo Tiến Độ Xử Lý */}
        <div className="flex items-center justify-between bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-200/70 mb-3 text-xs flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>Lọc theo tiến độ xử lý:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setProgressFilter('all')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                progressFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              Tất cả ({faults.length})
            </button>
            <button
              onClick={() => setProgressFilter('unassigned')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                progressFilter === 'unassigned'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Chưa phân lịch ({progressCounts.unassigned})
            </button>
            <button
              onClick={() => setProgressFilter('waiting_repair')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                progressFilter === 'waiting_repair'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Chờ sửa chữa ({progressCounts.waitingRepair})
            </button>
            <button
              onClick={() => setProgressFilter('in_progress')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                progressFilter === 'in_progress'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Đang sửa chữa ({progressCounts.inProgress})
            </button>
            <button
              onClick={() => setProgressFilter('verified')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
                progressFilter === 'verified'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Đã nghiệm thu ({progressCounts.verified})
            </button>
          </div>
        </div>

        {/* Bảng dữ liệu sự cố */}
        <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Mã Cột / Tuyến</th>
                <th className="py-2.5 px-3">Hiện Trạng Sự Cố</th>
                <th className="py-2.5 px-3">Nguồn Phát Hiện</th>
                <th className="py-2.5 px-3">Tiến Độ Xử Lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedFaults.length > 0 ? (
                displayedFaults.map((fault, idx) => {
                  const faultTypeStr = String(fault.fault_type || '').toLowerCase()
                  const isOffline = faultTypeStr.includes('offline') || faultTypeStr.includes('node')
                  const isBlackout =
                    !isOffline &&
                    (faultTypeStr.includes('out') ||
                      faultTypeStr.includes('blackout') ||
                      faultTypeStr.includes('segment_outage'))

                  // Nhận diện nguồn phát hiện chuẩn xác từ Backend
                  const sourceChannel = String(fault.source_channel || '').toLowerCase()
                  const noteStr = `${fault.note || ''} ${fault.review_note || ''}`.toLowerCase()
                  const isCitizen =
                    sourceChannel.includes('citizen') ||
                    sourceChannel.includes('qr') ||
                    noteStr.includes('citizen_report') ||
                    noteStr.includes('crp-') ||
                    noteStr.includes('dân')

                  const sourceText = isCitizen
                    ? '📱 Dân quét QR'
                    : sourceChannel.includes('iot')
                    ? '⚡ Cảm biến IoT'
                    : sourceChannel.includes('field')
                    ? '📋 Khảo sát hiện trường'
                    : '🤖 Xe quét AI'

                  const segmentName =
                    segmentNameMap[fault.segment_id || ''] || fault.segment_id || 'Chưa rõ tuyến'

                  const progress = getFaultProgressInfo(fault)
                  const isUnassigned = progress.key === 'unassigned'

                  return (
                    <tr
                      key={fault.fault_id || idx}
                      onClick={() => {
                        if (isUnassigned && onNavigateToCreateSchedule) {
                          onNavigateToCreateSchedule(fault)
                        } else {
                          onSelectFault(fault)
                        }
                      }}
                      className={`transition-all cursor-pointer group ${
                        isUnassigned
                          ? 'bg-rose-50/60 hover:bg-rose-100/80 border-l-4 border-l-rose-500 shadow-2xs'
                          : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                      }`}
                      title={
                        isUnassigned
                          ? 'Tạo lịch ngay'
                          : 'Bấm vào hàng để xem tọa độ GPS chi tiết'
                      }
                    >
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            isUnassigned
                              ? 'bg-rose-100 text-rose-900 group-hover:bg-rose-200'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700'
                          }`}
                        >
                          {fault.pole_id || 'Chưa gán cột'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {segmentName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isOffline ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                            Mất kết nối IoT
                          </span>
                        ) : isBlackout ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                            Mất sáng hoàn toàn
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Sáng yếu / Suy giảm
                          </span>
                        )}
                        <div
                          className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]"
                          title={fault.note || ''}
                        >
                          {fault.note ||
                            (isOffline
                              ? 'Bộ điều khiển ngắt kết nối với máy chủ'
                              : 'Cần kiểm tra điện áp & bóng')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{sourceText}</div>
                        <div className="text-[10px] text-slate-400">
                          {fault.detected_at
                            ? new Date(fault.detected_at).toLocaleDateString('vi-VN')
                            : 'Gần đây'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs whitespace-nowrap animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Chưa phân lịch
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${progress.bgClass} ${progress.textClass} border ${progress.borderClass} whitespace-nowrap`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${progress.dotClass}`} />
                            {progress.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                    Không có sự cố nào phù hợp với bộ lọc hiện tại
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>
          Đang hiển thị: <strong className="text-slate-800">{displayedFaults.length}</strong> / Tổng sự cố:{' '}
          <strong className="text-rose-600">{faults.length}</strong>
        </span>
        <span className="italic">
          * Hàng màu hồng viền đỏ là sự cố chưa phân lịch (Nhấp để tạo lịch ngay)
        </span>
      </div>
    </div>
  )
}
export default FaultsTableCard

