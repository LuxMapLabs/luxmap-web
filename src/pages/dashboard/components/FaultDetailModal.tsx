import { X, Calendar, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { FaultItem } from '../../../types/faults/faults'
import { getFaultProgressInfo } from './FaultsTableCard'

interface FaultDetailModalProps {
  fault: FaultItem | null
  onClose: () => void
  segmentNameMap: Record<string, string>
}

export const FaultDetailModal: React.FC<FaultDetailModalProps> = ({
  fault,
  onClose,
  segmentNameMap,
}) => {
  if (!fault) return null

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

  const sourceBadge = isCitizen ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
      📱 Dân quét QR
    </span>
  ) : sourceChannel.includes('iot') ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
      ⚡ Cảm biến IoT
    </span>
  ) : sourceChannel.includes('field') ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
      📋 Khảo sát hiện trường
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
      🤖 Xe quét AI
    </span>
  )

  const faultTypeBadge = isOffline ? (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
      Mất kết nối IoT
    </span>
  ) : isBlackout ? (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
      Mất sáng hoàn toàn
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
      Sáng yếu / Suy giảm
    </span>
  )

  const segmentName =
    segmentNameMap[fault.segment_id || ''] || fault.segment_id || 'Chưa rõ tuyến'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <h3 className="font-bold text-slate-900 text-base">Chi Tiết Sự Cố Chiếu Sáng</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cột: <strong className="text-slate-800">{fault.pole_id || 'Chưa gán cột'}</strong> •{' '}
              {segmentName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Hàng 1: Hiện trạng & Nguồn phát hiện */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Hiện trạng sự cố:</span>
              <div>{faultTypeBadge}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium block mb-1">Nguồn phát hiện:</span>
              <div>{sourceBadge}</div>
            </div>
          </div>

          {/* Hàng 2: Mã sự cố & Mức độ ưu tiên */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">Mã sự cố:</span>
              <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{fault.fault_id}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">Tiến độ xử lý:</span>
              <div className="mt-1">
                {(() => {
                  const progress = getFaultProgressInfo(fault)
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${progress.bgClass} ${progress.textClass} border ${progress.borderClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${progress.dotClass}`} />
                      {progress.label}
                    </span>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* Ghi chú sự cố */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
              Mô tả chi tiết:
            </span>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-sans">
              {fault.note || (isOffline ? 'Bộ điều khiển IoT ngắt kết nối tín hiệu với máy chủ trung tâm.' : 'Không có ghi chú thêm.')}
            </p>
          </div>

          {/* Ghi chú duyệt từ dân (nếu có) */}
          {fault.review_note && (
            <div className="space-y-1.5">
              <span className="text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Thông tin phê duyệt / đối soát:
              </span>
              <p className="text-emerald-800 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 font-mono text-[11px]">
                {fault.review_note}
              </p>
            </div>
          )}

          {/* Thời điểm & Tọa độ */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Thời điểm phát hiện:
              </span>
              <div className="font-medium text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100">
                {fault.detected_at
                  ? new Date(fault.detected_at).toLocaleString('vi-VN')
                  : 'Chưa xác định'}
              </div>
            </div>

            {fault.location && fault.location.lat != null && fault.location.lng != null ? (
              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Tọa độ GPS:
                </span>
                <div className="font-mono text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 truncate">
                  {fault.location.lat.toFixed(6)}, {fault.location.lng.toFixed(6)}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
