import React from 'react'
import { AlertTriangle } from 'lucide-react'
import type { FaultItem } from '../../../types/faults/faults'

interface FaultsTableCardProps {
  faults: FaultItem[]
  activeTab: 'all' | 'blackout' | 'dim' | 'offline'
  onTabChange: (tab: 'all' | 'blackout' | 'dim' | 'offline') => void
  segmentNameMap: Record<string, string>
  onSelectFault: (fault: FaultItem) => void
  totalCount: number
  blackoutCount: number
  dimCount: number
  offlineCount: number
}

export const FaultsTableCard: React.FC<FaultsTableCardProps> = ({
  faults,
  activeTab,
  onTabChange,
  segmentNameMap,
  onSelectFault,
  totalCount,
  blackoutCount,
  dimCount,
  offlineCount,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Giám Sát Sự Cố Bóng Đèn</h3>
              <p className="text-[11px] text-slate-500">Tổng hợp đa nguồn (Xe quét AI, Khảo sát, Cảm biến IoT, Dân quét QR)</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200/60">
            {faults.length} sự cố
          </span>
        </div>

        {/* 4 Tab Lọc Sự Cố (Khớp số học 100%: 19 + 11 + 3 = 33) */}
        <div className="flex gap-1.5 border-b border-slate-100 pb-2.5 mb-3 text-xs flex-wrap">
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

        <div className="overflow-x-auto max-h-[360px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Mã Cột / Tuyến</th>
                <th className="py-2.5 px-3">Hiện Trạng Sự Cố</th>
                <th className="py-2.5 px-3">Nguồn Phát Hiện</th>
                <th className="py-2.5 px-3">Tiến Độ Xử Lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faults.length > 0 ? (
                faults.map((fault, idx) => {
                  const faultTypeStr = String(fault.fault_type || '').toLowerCase()
                  const isOffline = faultTypeStr.includes('offline') || faultTypeStr.includes('node')
                  const isBlackout =
                    !isOffline &&
                    (faultTypeStr.includes('out') ||
                      faultTypeStr.includes('blackout') ||
                      faultTypeStr.includes('segment_outage'))

                  // Nhận diện nguồn phát hiện chuẩn xác từ Backend (kể cả báo cáo công dân qua review_note)
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

                  return (
                    <tr
                      key={idx}
                      onClick={() => onSelectFault(fault)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                          {fault.pole_id || 'Chưa gán cột'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {segmentName}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {isOffline ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                            Mất kết nối IoT
                          </span>
                        ) : isBlackout ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200/60">
                            Mất sáng hoàn toàn
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                            Sáng yếu / Suy giảm
                          </span>
                        )}
                        <div
                          className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px]"
                          title={fault.note || ''}
                        >
                          {fault.note || (isOffline ? 'Bộ điều khiển ngắt kết nối với máy chủ' : 'Cần kiểm tra điện áp & bóng')}
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
                        {fault.work_order_id ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                            Đã giao {fault.work_order_id}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                            Chưa phân lịch
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400">
                    Không có sự cố nào ghi nhận trên tuyến đường được chọn
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <span>Tổng sự cố tồn đọng: <strong className="text-rose-600">{faults.length}</strong></span>
        <span>Nhấp vào hàng để xem tọa độ GPS chi tiết</span>
      </div>
    </div>
  )
}
