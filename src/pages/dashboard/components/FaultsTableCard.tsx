import React, { useState, useMemo } from 'react'
import { AlertCircle } from 'lucide-react'
import { OpsCard } from '../../../components/ops/OpsCard'
import { OpsSelect } from '../../../components/ops/OpsSelect'
import { OpsTabs } from '../../../components/ops/OpsTabs'
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
    <OpsCard
      index={3}
      className="h-full relative z-20"
      title="Sự cố bóng đèn"
      description="Tổng hợp từ xe quét AI, khảo sát, cảm biến IoT và người dân quét QR"
      actions={
        <OpsSelect
          value={progressFilter}
          onChange={(val) => setProgressFilter(val as ProgressFilterType)}
          headerLabel="Tiến độ xử lý sự cố"
          headerBadge={`${faults.length} sự cố`}
          align="right"
          ariaLabel="Lọc theo tiến độ xử lý"
          triggerClassName="min-w-[180px] min-h-[34px] py-1"
          popoverClassName="w-68"
          options={[
            {
              value: 'all',
              label: 'Tiến độ: Tất cả',
              nativeLabel: `Tiến độ: Tất cả (${faults.length})`,
              subLabel: 'Toàn bộ sự cố ghi nhận trên địa bàn',
              badge: faults.length,
            },
            {
              value: 'unassigned',
              label: 'Chưa phân lịch',
              nativeLabel: `Chưa phân lịch (${progressCounts.unassigned})`,
              subLabel: 'Mới phát hiện, chờ giao ca kiểm tra',
              dotColor: 'bg-rose-500',
              badge: progressCounts.unassigned,
            },
            {
              value: 'waiting_repair',
              label: 'Chờ sửa chữa',
              nativeLabel: `Chờ sửa chữa (${progressCounts.waitingRepair})`,
              subLabel: 'Đã kiểm tra xác minh, chờ ca sửa chữa',
              dotColor: 'bg-amber-400',
              badge: progressCounts.waitingRepair,
            },
            {
              value: 'in_progress',
              label: 'Đang sửa chữa',
              nativeLabel: `Đang sửa chữa (${progressCounts.inProgress})`,
              subLabel: 'Kỹ sư đang xử lý tại hiện trường',
              dotColor: 'bg-blue-500',
              badge: progressCounts.inProgress,
            },
            {
              value: 'verified',
              label: 'Đã nghiệm thu',
              nativeLabel: `Đã nghiệm thu (${progressCounts.verified})`,
              subLabel: 'Đã hoàn tất khắc phục & xác nhận sáng',
              dotColor: 'bg-emerald-500',
              badge: progressCounts.verified,
            },
          ]}
        />
      }
      flush
    >
      <div className="px-6 pb-4 pt-4">
        <OpsTabs
          value={activeTab}
          onChange={onTabChange}
          items={[
            { key: 'all', label: 'Tất cả', count: totalCount },
            { key: 'blackout', label: 'Mất sáng hoàn toàn', count: blackoutCount },
            { key: 'dim', label: 'Sáng yếu / Suy giảm', count: dimCount },
            { key: 'offline', label: 'Mất kết nối IoT', count: offlineCount },
          ]}
        />
      </div>

      <div className="max-h-[360px] overflow-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
              <th className="py-2.5 px-6">Mã cột / tuyến</th>
              <th className="py-2.5 px-3">Hiện trạng</th>
              <th className="py-2.5 px-3">Nguồn phát hiện</th>
              <th className="py-2.5 px-6">Tiến độ xử lý</th>
            </tr>
          </thead>
          <tbody>
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

                  const rawNote = (fault.note || fault.review_note || '').trim()
                  const iotMatch = rawNote.match(/Thiết bị\s+(NODE-[\w-]+)\s+ở tủ\s+(CAB-[\w-]+)/i)

                  const primaryCode = fault.pole_id || (iotMatch ? iotMatch[1] : fault.fault_id || '-')

                  const segmentName =
                    segmentNameMap[fault.segment_id || ''] ||
                    fault.segment_id ||
                    (iotMatch ? iotMatch[2] : '-')

                  const progress = getFaultProgressInfo(fault)
                  const isUnassigned = progress.key === 'unassigned'
                  const canSchedulePole = Boolean(fault.pole_id || fault.segment_id) && !isOffline

                  return (
                    <tr
                      key={fault.fault_id || idx}
                      onClick={() => {
                        if (isUnassigned && canSchedulePole && onNavigateToCreateSchedule) {
                          onNavigateToCreateSchedule(fault)
                        } else {
                          onSelectFault(fault)
                        }
                      }}
                      style={{ '--i': idx } as React.CSSProperties}
                      className={`ops-rise group cursor-pointer border-b border-[#eef2f6] transition-colors duration-150 shadow-[inset_3px_0_0_transparent] hover:shadow-[inset_3px_0_0_var(--color-blue-600)] ${
                        isUnassigned ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-teal-50/40'
                      }`}
                      title={
                        isUnassigned && canSchedulePole
                          ? 'Tạo lịch ngay'
                          : 'Bấm vào hàng để xem tọa độ GPS chi tiết'
                      }
                    >
                      <td className="py-3 px-6">
                        <span
                          className={`font-mono text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
                            isUnassigned
                              ? 'bg-rose-100 text-rose-900 group-hover:bg-rose-200'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700'
                          }`}
                        >
                          {primaryCode}
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
                      <td className="py-3 px-6">
                        {isUnassigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 whitespace-nowrap ops-ping">
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

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-3.5 text-xs text-slate-500">
        <span>
          Hiển thị <strong className="text-slate-800 tabular-nums">{displayedFaults.length}</strong> /{' '}
          <strong className="text-slate-800 tabular-nums">{faults.length}</strong> sự cố
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-xs border border-amber-200 bg-amber-50" />
          Hàng nền vàng là sự cố chưa phân lịch, bấm để tạo lịch
        </span>
      </div>
    </OpsCard>
  )
}
export default FaultsTableCard
