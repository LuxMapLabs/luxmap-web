import { X } from 'lucide-react'
import type { FaultItem } from '../../../types/faults/faults'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="font-bold text-slate-800 text-sm">Chi Tiết Sự Cố Chiếu Sáng</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cột: <strong>{fault.pole_id || 'Chưa gán cột'}</strong> •{' '}
              {segmentNameMap[fault.segment_id || ''] || fault.segment_id || 'Chưa rõ tuyến'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">Mã sự cố:</span>
              <div className="font-mono font-bold text-slate-800 text-sm mt-0.5">{fault.fault_id}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-slate-400 font-medium">Mức độ ưu tiên:</span>
              <div className="font-bold text-slate-800 capitalize mt-0.5">
                {fault.severity || 'Trung bình'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-slate-400 font-medium">Ghi chú sự cố:</span>
            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-sans">
              {fault.note || 'Không có ghi chú thêm.'}
            </p>
          </div>

          {fault.location && fault.location.lat != null && fault.location.lng != null && (
            <div className="space-y-1.5">
              <span className="text-slate-400 font-medium">Tọa độ GPS:</span>
              <div className="font-mono text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {fault.location.lat.toFixed(6)}, {fault.location.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
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
