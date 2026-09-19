import React from 'react'
import { createPortal } from 'react-dom'
import { X, Zap, MapPin, Activity, AlertTriangle, Route, ShieldCheck, Gauge } from 'lucide-react'
import type { AssetCabinetItem } from '../AssetManagementPage'

interface CabinetDetailModalProps {
  cabinet: AssetCabinetItem | null
  onClose: () => void
}

export const CabinetDetailModal: React.FC<CabinetDetailModalProps> = ({
  cabinet,
  onClose,
}) => {
  if (!cabinet) return null

  const isFault = cabinet.status === 'fault'

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            isFault
              ? 'bg-gradient-to-r from-rose-600 to-amber-600'
              : 'bg-gradient-to-r from-amber-600 to-orange-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/25 px-2 py-0.5 rounded-md font-bold">
                  {cabinet.cabinet_id}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isFault ? 'bg-rose-900/40 text-rose-100' : 'bg-emerald-900/40 text-emerald-100'
                  }`}
                >
                  {isFault ? 'Sự Cố Ngắt Nguồn' : 'Đang Cấp Điện'}
                </span>
              </div>
              <h3 className="font-extrabold text-base mt-0.5">{cabinet.cabinet_name}</h3>
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
          {/* Fault Alert Banner if fault */}
          {isFault && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold">Cảnh báo sự cố điện tại tủ:</div>
                <div className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  {cabinet.fault_reason || 'Ngắn mạch hoặc sụt áp bất thường, Aptomat tự động ngắt tải bảo vệ hệ thống.'}
                </div>
              </div>
            </div>
          )}

          {/* 3 KPI Cards */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Gauge className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Điện áp</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {cabinet.voltage_v > 0 ? `${cabinet.voltage_v} V` : '0 V (Mất)'}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Pha chuẩn 220V</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Activity className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Tải thực tế</span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-1">
                {cabinet.current_load_kw} kW
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Hệ số cosφ {cabinet.power_factor || 0.95}</div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl">
              <div className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1">
                <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Số cột ăn tủ</span>
              </div>
              <div className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-1">
                {cabinet.total_poles_managed}
              </div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">Điểm chiếu sáng</div>
            </div>
          </div>

          {/* Info Rows */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Tuyến đường cấp nguồn:</span>
              </span>
              <strong className="text-slate-800 dark:text-slate-200">{cabinet.segment_name}</strong>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Phân cấp tủ:</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {cabinet.role === 'root_cabinet' ? 'Tủ điện nguồn chính (Root)' : 'Tủ điện phân đoạn phụ (Sub)'}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>Tọa độ WGS84:</span>
              </span>
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {cabinet.lat.toFixed(4)}, {cabinet.lng.toFixed(4)}
              </span>
            </div>

            <div className="flex items-start justify-between pt-0.5">
              <span className="text-slate-500 dark:text-slate-400">Mốc thực địa:</span>
              <span className="text-right text-slate-800 dark:text-slate-200 font-medium max-w-[280px]">
                {cabinet.landmark_note || 'Chưa cập nhật mốc'}
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
    </div>,
    document.body
  )
}
