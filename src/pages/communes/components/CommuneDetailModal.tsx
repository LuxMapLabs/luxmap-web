import React from 'react'
import { X, MapPin, Compass, Calendar, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import type { CommuneItem } from '../../../types/admin/communes'
import { CommuneBboxMap } from './CommuneBboxMap'

export interface CommuneDetailModalProps {
  isOpen: boolean
  commune: CommuneItem | null
  onClose: () => void
  onEdit?: (commune: CommuneItem) => void
}

export const CommuneDetailModal: React.FC<CommuneDetailModalProps> = ({
  isOpen,
  commune,
  onClose,
}) => {
  if (!isOpen || !commune) return null

  const hasBbox = Boolean(commune.bbox)

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—'
    try {
      const d = new Date(dateStr)
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {commune.name || 'Địa bàn chưa đặt tên'}
                </h2>
                {hasBbox ? (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Đã có BBox</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Chưa có BBox</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Mã địa bàn: <strong className="text-slate-700 dark:text-slate-300">{commune.commune_id}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: 2 Cột */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
          {/* Cột trái: Thông số địa bàn */}
          <div className="md:col-span-5 space-y-3.5">
            {/* Thông tin cơ bản */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/60 dark:border-slate-700 pb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                <span>Thông Tin Địa Giới Hành Chính</span>
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Mã đơn vị:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{commune.commune_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Tên địa bàn:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{commune.name || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Tâm bản đồ (Center):</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {commune.center?.lat && commune.center?.lng
                    ? `${commune.center.lat.toFixed(4)}, ${commune.center.lng.toFixed(4)}`
                    : 'Tự động tính từ BBox'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Ngày khởi tạo:</span>
                </span>
                <span className="text-slate-700 dark:text-slate-300">{formatDateTime(commune.created_at)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Cập nhật lần cuối:</span>
                </span>
                <span className="text-slate-700 dark:text-slate-300">{formatDateTime(commune.updated_at)}</span>
              </div>
            </div>

            {/* Chi tiết 4 cạnh BBox */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-200/60 dark:border-slate-700 pb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tọa Độ Khung Bao (BBox)</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">EPSG:4326</span>
              </h3>
              {hasBbox && commune.bbox ? (
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block">Tây (min_lng):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{commune.bbox.min_lng}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block">Nam (min_lat):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{commune.bbox.min_lat}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block">Đông (max_lng):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{commune.bbox.max_lng}</strong>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-700">
                    <span className="text-slate-400 text-[10px] block">Bắc (max_lat):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{commune.bbox.max_lat}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  Chưa thiết lập tọa độ vùng bao cho địa bàn này.
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Bản đồ 2 lớp Read-Only */}
          <div className="md:col-span-7 flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <label className="text-slate-700 dark:text-slate-300 font-bold">
                Bản Đồ 2 Lớp Kiểm Tra Khung BBox
              </label>
              <span className="text-[11px] text-slate-400">Chế độ xem tĩnh (Read-Only)</span>
            </div>
            <div className="w-full flex-1 rounded-2xl overflow-hidden min-h-[400px]">
              <CommuneBboxMap
                bbox={commune.bbox}
                communeName={commune.name || ''}
                readOnly={true}
                height="400px"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
export default CommuneDetailModal
