import React from 'react'
import { X, Route, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { AssetSegmentItem } from '../AssetManagementPage'

interface SegmentDetailModalProps {
  segment: AssetSegmentItem | null
  onClose: () => void
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({
  segment,
  onClose,
}) => {
  if (!segment) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Route className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/25 px-2 py-0.5 rounded-md font-bold">
                  {segment.segment_id}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-100">
                  {segment.road_class === 'inter_commune'
                    ? 'Đường liên xã'
                    : segment.road_class === 'inter_village'
                    ? 'Đường liên thôn'
                    : 'Đường nhánh'}
                </span>
              </div>
              <h3 className="font-extrabold text-base mt-0.5">{segment.segment_name}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-800 dark:text-slate-200">
          {/* 3 Metrics */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Chiều dài</div>
              <div className="text-lg font-black text-blue-700 dark:text-blue-400 mt-1">
                {(segment.length_m / 1000).toFixed(1)} km
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">{segment.length_m.toLocaleString()} mét</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Số cột đèn</div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {segment.pole_count}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Điểm chiếu sáng</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Trạng thái GIS</div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1 flex items-center justify-center gap-1">
                {segment.has_active_fault ? (
                  <span className="text-rose-600 dark:text-rose-400">Sự cố</span>
                ) : (
                  <span>Tốt</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {segment.has_active_fault ? 'Cần kiểm tra' : '100% bình thường'}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>Địa bàn quản lý:</span>
              </span>
              <strong className="text-slate-800 dark:text-slate-200">{segment.commune_name}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400">Mật độ cột trung bình:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {segment.pole_count > 0 ? `~${Math.round(segment.length_m / segment.pole_count)} mét / cột` : 'Chưa gắn cột'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <span className="text-slate-500 dark:text-slate-400">Tình trạng phân đoạn:</span>
              <span className={`font-bold flex items-center gap-1.5 ${segment.has_active_fault ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {segment.has_active_fault ? (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Có phân đoạn báo lỗi</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Lưới điện vận hành ổn định</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-700 font-semibold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
