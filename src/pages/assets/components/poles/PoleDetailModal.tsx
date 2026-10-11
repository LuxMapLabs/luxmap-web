import React from 'react'
import { createPortal } from 'react-dom'
import { X, MapPin, Zap, Lightbulb, AlertTriangle, Bookmark, QrCode } from 'lucide-react'
import { StatusBadge } from '../../../../components/StatusBadge'
import type { PoleListItem } from '../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../types/assets/segments'
import type { CabinetListItem } from '../../../../types/assets/cabinets'

interface PoleDetailModalProps {
  isOpen: boolean
  pole: PoleListItem | null
  segments?: SegmentListItem[]
  cabinets?: CabinetListItem[]
  onClose: () => void
  onViewQr?: (pole: PoleListItem) => void
}

export const PoleDetailModal: React.FC<PoleDetailModalProps> = ({
  isOpen,
  pole,
  segments = [],
  cabinets = [],
  onClose,
  onViewQr,
}) => {
  if (!isOpen || !pole) return null

  const seg = segments.find(
    (s) => s.segment_id === pole.segment_id || (s.external_ref && s.external_ref.toLowerCase() === pole.segment_id?.toLowerCase())
  )
  const segmentName = seg?.segment_name || (seg?.external_ref ? `Tuyến ${seg.external_ref}` : 'Chưa gắn tuyến')

  const cab = cabinets.find(
    (c) => c.cabinet_id === pole.feeder_id || (c.external_ref && c.external_ref.toLowerCase() === pole.feeder_id?.toLowerCase())
  )
  const feederName = cab?.cabinet_name || cab?.external_ref || 'Chưa gắn tủ'

  const watt = pole.active_fixture?.lamp_watt || 100
  const fixtureStatus = pole.active_fixture ? 'normal' : 'out'
  const lat = pole.location?.lat ?? 10.9701
  const lng = pole.location?.lng ?? 106.4896

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
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
                <h3 className="font-bold text-white text-base">{pole.external_ref}</h3>
                <StatusBadge type="fixture" status={fixtureStatus} size="sm" />
              </div>
              <p className="text-xs text-slate-200 dark:text-slate-400 mt-0.5">
                {segmentName} — {pole.commune_id || 'Củ Chi'}
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
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 mt-1">{watt}W</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {pole.active_fixture?.power_source === 'grid' ? 'Lưới điện 220V' : 'Lưới điện'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-blue-500" />
                <span>Trạng thái bóng</span>
              </div>
              <div className="text-sm font-black mt-1 text-emerald-600 dark:text-emerald-400">
                {pole.active_fixture ? 'Đang hoạt động' : 'Không có bóng'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Mã: {pole.active_fixture?.fixture_id || '—'}
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-2xs">
              <div className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Khu vực nhạy cảm (POI)</span>
              </div>
              <div className={`text-sm font-black mt-1 ${pole.near_sensitive_poi ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-300'}`}>
                {pole.near_sensitive_poi ? 'Khu vực nhạy cảm' : 'Bình thường'}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Nguồn: {pole.data_source === 'field' ? 'Khảo sát thực địa' : pole.data_source}
              </div>
            </div>
          </div>

          {/* GIS Coordinates & Feeder Box */}
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200 dark:border-blue-900/60 space-y-2.5">
            <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Tọa độ Bản đồ GIS & Đấu nối Tủ điện:</span>
              </span>
              <span className="font-mono text-xs text-blue-700 dark:text-blue-300 font-bold bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">
                GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 text-xs space-y-1">
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Tuyến đường:</strong> {segmentName} ({pole.commune_id || 'Củ Chi'})
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-slate-800 dark:text-slate-200">Tủ điện quản lý:</strong>{' '}
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{pole.feeder_id || 'Chưa gắn'}</span>
                <span className="text-slate-500">({feederName})</span>
              </div>
              {pole.near_sensitive_poi && (
                <div className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Khu vực nhạy cảm (gần trường học / bệnh viện / ngã tư)</span>
                </div>
              )}
            </div>
          </div>

          {/* Ghi chú hiện trường */}
          <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/60 space-y-1.5">
            <div className="font-bold text-amber-950 dark:text-amber-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Ghi chú hiện trường:</span>
              </span>
              {pole.updated_at && (
                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono">
                  Cập nhật: {new Date(pole.updated_at).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>
            {pole.note ? (
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {pole.note}
              </p>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                Chưa có ghi chú cho vị trí cột này.
              </p>
            )}
            {(pole.updated_by_name || pole.updated_by) && (
              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                Người cập nhật: <strong className="text-slate-700 dark:text-slate-300">{pole.updated_by_name || pole.updated_by}</strong>
                {pole.updated_by && pole.updated_by_name && <span className="font-mono text-[10px] text-slate-400 ml-1">({pole.updated_by})</span>}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex justify-between items-center gap-2">
          {onViewQr ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onViewQr(pole)
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <QrCode className="w-4 h-4" />
              <span>Xem / Tải mã QR</span>
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
