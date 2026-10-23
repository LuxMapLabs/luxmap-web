import React from 'react'
import { createPortal } from 'react-dom'
import { X, MapPin, Lightbulb, AlertTriangle, Bookmark, QrCode } from 'lucide-react'
import { StatusBadge } from '../../../../../components/StatusBadge'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import type { CabinetListItem } from '../../../../../types/assets/cabinets'
import type { FixtureStatus } from '../../../../../types/common/enums'

interface PoleDetailModalProps {
  isOpen: boolean
  pole: PoleListItem | null
  segments?: SegmentListItem[]
  cabinets?: CabinetListItem[]
  fixtureStatus?: FixtureStatus
  onClose: () => void
  onViewQr?: (pole: PoleListItem) => void
}

export const PoleDetailModal: React.FC<PoleDetailModalProps> = ({
  isOpen,
  pole,
  segments = [],
  cabinets = [],
  fixtureStatus,
  onClose,
  onViewQr,
}) => {
  if (!isOpen || !pole) return null

  const seg = segments.find(
    (s) => s.segment_id === pole.segment_id || (s.external_ref && s.external_ref.toLowerCase() === pole.segment_id?.toLowerCase())
  )
  const segmentName = seg?.segment_name || (seg?.external_ref ? `Tuyến ${seg.external_ref}` : 'Chưa gắn tuyến')

  const cab = cabinets.find(
    (c) =>
      (pole.cabinet_id && (c.cabinet_id === pole.cabinet_id || c.external_ref === pole.cabinet_id)) ||
      c.cabinet_id === pole.feeder_id ||
      (c.external_ref && c.external_ref.toLowerCase() === pole.feeder_id?.toLowerCase()) ||
      (c.feeder_ids && pole.feeder_id && c.feeder_ids.includes(pole.feeder_id))
  )
  const cabName = cab?.cabinet_name || pole.cabinet_name || cab?.external_ref || 'Chưa gắn tủ'
  const feederName = pole.feeder_id ? `${cabName} • ${pole.feeder_id}` : cabName

  const watt = pole.active_fixture?.lamp_watt || 100
  const lampCount = pole.active_fixture?.lamp_count || 1
  const totalWatt = watt * lampCount

  // Xác định trạng thái đo sáng trắc quang
  let displayFixtureStatus: FixtureStatus = fixtureStatus || 'unknown'
  let displayFixtureLabel: string | undefined = undefined

  if (!pole.active_fixture) {
    displayFixtureStatus = 'out'
    displayFixtureLabel = 'Chưa gắn bộ đèn'
  } else if (!fixtureStatus) {
    displayFixtureStatus = 'unknown'
  }

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
                <StatusBadge type="fixture" status={displayFixtureStatus} label={displayFixtureLabel} size="sm" />
              </div>
              <p className="text-xs text-slate-200 dark:text-slate-400 mt-0.5">
                {segmentName} — {pole.commune_name || pole.commune_id || 'Chưa gán địa bàn'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Info Cards */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mã bộ đèn</div>
              <div className="text-sm font-bold font-mono text-slate-800 dark:text-slate-100 mt-1 truncate">
                {pole.active_fixture?.fixture_id || 'Chưa gắn'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số bóng / bộ</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1 truncate">
                {pole.active_fixture ? `${lampCount} bóng` : '—'}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng công suất</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-1">
                {pole.active_fixture ? (
                  <>
                    <span>{totalWatt} W</span>
                    {lampCount > 1 && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({lampCount}x{watt}W)
                      </span>
                    )}
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bảo hành bộ đèn</div>
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                {pole.active_fixture ? (
                  <>
                    <StatusBadge
                      type="warranty"
                      status={pole.active_fixture.warranty_status || 'unknown'}
                      size="sm"
                    />
                    <span className="text-[10px] font-mono text-slate-500">
                      Hạn: {pole.active_fixture.warranty_expiry || '—'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-mono text-slate-400">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Vị trí & Tuyến đường */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span>Vị trí lắp đặt & Nguồn cấp</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 text-xs space-y-1">
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Tuyến đường:</strong> {segmentName} ({pole.commune_name || pole.commune_id || 'Chưa gán địa bàn'})
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
