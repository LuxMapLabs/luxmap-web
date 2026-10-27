import React from 'react'
import { X, Cable, Zap, MapPin, Calendar, User, Lightbulb } from 'lucide-react'
import type { FeederListItem } from '../../../../../types/assets/feeders'
import type { PoleListItem } from '../../../../../types/assets/poles'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'

export interface FeederDetailModalProps {
  isOpen: boolean
  feeder: FeederListItem | null
  poles: PoleListItem[]
  onClose: () => void
}

export const FeederDetailModal: React.FC<FeederDetailModalProps> = ({
  isOpen,
  feeder,
  poles,
  onClose,
}) => {
  if (!isOpen || !feeder) return null

  // Lọc các cột đèn đang đấu nối vào mạch điện này
  const connectedPoles = poles.filter(
    (p) => p.feeder_id && p.feeder_id === feeder.feeder_id
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
              <Cable className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {feeder.feeder_name || 'Chi Tiết Mạch Điện'}
                </h2>
                <span className="font-mono text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  {feeder.external_ref || feeder.feeder_id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lộ xuất tuyến chiếu sáng công cộng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Tủ điện */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Tủ Điện Cấp Nguồn:
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {feeder.cabinet?.cabinet_name || 'Chưa gắn tủ điện'}
              </p>
              {feeder.cabinet?.cabinet_id && (
                <span className="inline-block font-mono text-[10px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
                  Mã tủ: {feeder.cabinet.cabinet_id}
                </span>
              )}
            </div>

            {/* Địa bàn */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
                Địa Bàn Quản Lý:
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {formatFriendlyCommuneName(feeder.commune_name, feeder.commune_id, 'Chưa gán địa bàn')}
              </p>
              {feeder.commune_id && feeder.commune_name && (
                <span className="inline-block font-mono text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                  Mã địa bàn: {feeder.commune_id}
                </span>
              )}
            </div>

            {/* Số lượng cột đèn */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-emerald-500" />
                Số Cột Đèn Đang Đấu Nối:
              </span>
              <p className="font-bold text-slate-900 dark:text-slate-100 text-base font-mono">
                {connectedPoles.length > 0 ? connectedPoles.length : feeder.pole_count} cột
              </p>
            </div>

            {/* Cập nhật gần nhất */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-500" />
                Cập Nhật Lần Cuối:
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {feeder.updated_at ? new Date(feeder.updated_at).toLocaleString('vi-VN') : 'Không rõ'}
              </p>
              {feeder.updated_by_name && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <User className="w-3 h-3" /> Bởi {feeder.updated_by_name}
                </span>
              )}
            </div>
          </div>

          {/* Danh sách các cột đèn thuộc mạch này */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Danh Sách Cột Đèn Đang Đấu Nối ({connectedPoles.length}):</span>
              {connectedPoles.length > 0 && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Hoạt động bình thường
                </span>
              )}
            </h3>

            {connectedPoles.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                <p className="text-xs text-slate-400 italic">
                  Chưa có cột đèn nào đấu nối vào mạch điện này. Khi thêm hoặc sửa cột đèn, hãy chọn mạch này để cấp nguồn.
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                {connectedPoles.map((p) => (
                  <div
                    key={p.pole_id}
                    className="p-2.5 px-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100">
                        {p.external_ref || p.pole_id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        ({p.pole_id})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {p.segment_id && (
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                          Tuyến: {p.segment_id}
                        </span>
                      )}
                      {p.location && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {p.location.lat.toFixed(5)}, {p.location.lng.toFixed(5)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}
