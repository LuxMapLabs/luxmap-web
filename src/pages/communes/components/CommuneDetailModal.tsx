import React from 'react'
import { X, MapPin, Compass, Calendar, Clock, CheckCircle2, AlertTriangle, Edit2 } from 'lucide-react'
import type { CommuneItem } from '../../../types/admin/communes'

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
  onEdit,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  {commune.name || 'Địa bàn chưa đặt tên'}
                </h2>
                {hasBbox ? (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    <span>Đã có BBox</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>Chưa có BBox</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Mã địa bàn: <span className="font-semibold text-slate-700">{commune.commune_id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Modal: Hồ sơ thông số kỹ thuật (Dossier View - Chuẩn Key-Value đồng nhất) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* 1. Thông tin hành chính */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5">
            <h3 className="font-bold text-slate-800 text-xs border-b border-slate-200/70 pb-2 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>Thông Tin Địa Giới Hành Chính</span>
            </h3>
            
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Mã đơn vị:</span>
              <span className="font-mono font-semibold text-slate-700">
                {commune.commune_id}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tên địa bàn:</span>
              <span className="font-semibold text-slate-900">{commune.name || '—'}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Tâm toạ độ (Center):</span>
              <span className="font-mono font-medium text-slate-700">
                {commune.center?.lat && commune.center?.lng
                  ? `${commune.center.lat.toFixed(4)}, ${commune.center.lng.toFixed(4)}`
                  : 'Tự động tính từ BBox'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Ngày khởi tạo:</span>
              </span>
              <span className="text-slate-700">{formatDateTime(commune.created_at)}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Cập nhật lần cuối:</span>
              </span>
              <span className="text-slate-700">{formatDateTime(commune.updated_at)}</span>
            </div>
          </div>

          {/* 2. Chi tiết 4 cạnh BBox: Mô hình La bàn GIS chuẩn (Bắc ở trên, Nam ở dưới) */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tọa Độ Khung Bao Bản Đồ (Bounding Box)</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono font-medium">EPSG:4326</span>
            </div>

            {hasBbox && commune.bbox ? (
              <div className="space-y-2 pt-1">
                {/* Đỉnh trên: Bắc (max_lat) */}
                <div className="flex justify-center">
                  <div className="w-48 px-3 py-2 bg-white rounded-lg border border-slate-200/90 text-center shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Vĩ độ Bắc (max_lat)</span>
                    <strong className="font-mono text-xs font-semibold text-slate-800">{commune.bbox.max_lat}</strong>
                  </div>
                </div>

                {/* Hàng giữa: Tây (min_lng) <---> Tâm BBox <---> Đông (max_lng) */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200/90 text-center shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Kinh độ Tây (min_lng)</span>
                    <strong className="font-mono text-xs font-semibold text-slate-800">{commune.bbox.min_lng}</strong>
                  </div>

                  <div className="flex-1 px-2.5 py-2 bg-slate-100/70 rounded-lg border border-slate-200/80 text-center shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-sans block mb-0.5 font-medium">Tọa độ tâm (Center)</span>
                    <strong className="font-mono text-xs font-semibold text-slate-700">
                      {commune.center?.lat !== undefined && commune.center?.lng !== undefined
                        ? `${commune.center.lat.toFixed(4)}, ${commune.center.lng.toFixed(4)}`
                        : typeof commune.bbox.min_lat === 'number' && typeof commune.bbox.max_lat === 'number' && typeof commune.bbox.min_lng === 'number' && typeof commune.bbox.max_lng === 'number'
                        ? `${((commune.bbox.min_lat + commune.bbox.max_lat) / 2).toFixed(4)}, ${((commune.bbox.min_lng + commune.bbox.max_lng) / 2).toFixed(4)}`
                        : '—'}
                    </strong>
                  </div>

                  <div className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200/90 text-center shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Kinh độ Đông (max_lng)</span>
                    <strong className="font-mono text-xs font-semibold text-slate-800">{commune.bbox.max_lng}</strong>
                  </div>
                </div>

                {/* Đáy dưới: Nam (min_lat) */}
                <div className="flex justify-center">
                  <div className="w-48 px-3 py-2 bg-white rounded-lg border border-slate-200/90 text-center shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-sans block mb-0.5">Vĩ độ Nam (min_lat)</span>
                    <strong className="font-mono text-xs font-semibold text-slate-800">{commune.bbox.min_lat}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                Chưa thiết lập tọa độ vùng bao cho địa bàn này.
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onEdit(commune)
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa BBox</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

export default CommuneDetailModal
