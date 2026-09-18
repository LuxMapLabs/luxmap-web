import React from 'react'
import { Info, X, MapPin, Wrench, ShieldCheck, Zap, Lightbulb, AlertTriangle } from 'lucide-react'
import { StatusBadge } from '../../../components/StatusBadge'
import type { EditablePoleData } from './EditPoleModal'

interface PoleDetailModalProps {
  isOpen: boolean
  pole: (EditablePoleData & { lat?: number; lng?: number; lux_value?: number; open_fault_count?: number; near_sensitive_poi?: boolean }) | null
  onClose: () => void
  onOpenEdit: (pole: EditablePoleData) => void
}

export const PoleDetailModal: React.FC<PoleDetailModalProps> = ({
  isOpen,
  pole,
  onClose,
  onOpenEdit,
}) => {
  if (!isOpen || !pole) return null

  const lux = pole.lux_value ?? 28.5
  const isLuxOk = lux >= 25

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-[#1f3864] dark:bg-slate-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <Lightbulb className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{pole.pole_id}</h3>
                <StatusBadge type="fixture" status={pole.fixture_status} size="sm" />
              </div>
              <p className="text-xs text-slate-200 dark:text-slate-400 mt-0.5">
                {pole.segment_name} — {pole.commune_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs text-slate-800 dark:text-slate-200 max-h-[75vh] overflow-y-auto">
          {/* 3 KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Công suất & Nguồn</span>
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">{pole.lamp_watt}W</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {pole.power_source === 'grid' ? 'Lưới điện 220V' : 'Năng lượng MT'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-blue-500" />
                <span>Độ rọi Lux thực tế</span>
              </div>
              <div className={`text-sm font-black mt-1 ${isLuxOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {lux} Lux
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {isLuxOk ? 'Đạt chuẩn (≥ 25 Lux)' : 'Cảnh báo suy hao Lux'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-purple-500" />
                <span>Bảo hành thiết bị</span>
              </div>
              <div className="text-sm font-black text-purple-700 dark:text-purple-300 mt-1">
                {pole.warranty_expiry || 'Không có'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Nhà cung cấp Rạng Đông
              </div>
            </div>
          </div>

          {/* GIS Coordinates & Feeder Box */}
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-2.5">
            <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Tọa độ Bản đồ GIS & Đấu nối Feeder:</span>
              </span>
              <span className="font-mono text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                GPS: {pole.lat ?? '10.9701'}, {pole.lng ?? '106.4896'}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 text-xs space-y-1">
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Tuyến đường:</strong> {pole.segment_name} ({pole.commune_name})
              </div>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Đấu nối Tủ Feeder:</strong>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{pole.feeder_id || 'Chưa gắn'}</span>
              </div>
              {pole.atlas && (
                <div>
                  <strong className="text-slate-800 dark:text-slate-200">Mốc định vị thực tế (Atlas):</strong> {pole.atlas}
                </div>
              )}
            </div>
          </div>

          {/* Inspection & Fault Status */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#1f3864] dark:text-blue-400" />
              <span>Lịch Sử Kiểm Định & Trạng Thái Sự Cố Gần Nhất:</span>
            </div>
            <div className="text-slate-700 dark:text-slate-200 text-xs flex items-center justify-between bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                {(pole.open_fault_count ?? 0) > 0 ? (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    Đang có {pole.open_fault_count} sự cố cần xử lý
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">Hoạt động bình thường, không có sự cố mở</span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Cập nhật qua Camera AI</span>
            </div>
            {pole.near_sensitive_poi && (
              <div className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50 font-medium">
                ⚠️ Cột nằm tại vị trí nhạy cảm (Gần Trường học / Bệnh viện / Khu dân cư) - Ưu tiên bảo trì cao!
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-between items-center">
          <button
            type="button"
            onClick={() => {
              onClose()
              onOpenEdit(pole)
            }}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Chỉnh sửa thông số</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#1f3864] dark:bg-blue-600 hover:bg-[#1f3864]/90 dark:hover:bg-blue-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
