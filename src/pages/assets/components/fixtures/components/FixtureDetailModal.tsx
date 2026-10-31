import React from 'react'
import { createPortal } from 'react-dom'
import { X, Lightbulb, Zap, Calendar, ShieldCheck, ShieldAlert, Boxes, MapPin, Edit2, AlertCircle } from 'lucide-react'
import type { ManagedFixture } from '../../../../../hooks/assets/useAssetData'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'
import { formatFriendlyCommuneName } from '../../../../../utils/assets/communeUtils'

export interface FixtureDetailModalProps {
  isOpen: boolean
  fixture: ManagedFixture | null
  poles?: PoleListItem[]
  segments?: SegmentListItem[]
  onClose: () => void
  onEdit?: (fixture: ManagedFixture) => void
}

export const FixtureDetailModal: React.FC<FixtureDetailModalProps> = ({
  isOpen,
  fixture,
  poles = [],
  segments = [],
  onClose,
  onEdit,
}) => {
  if (!isOpen || !fixture) return null

  // Lookup pole information
  const pole = poles.find((p) => {
    if (fixture.pole_external_ref && p.external_ref) {
      return p.external_ref.toLowerCase() === fixture.pole_external_ref.toLowerCase()
    }
    if (fixture.pole_id && p.pole_id) {
      return p.pole_id === fixture.pole_id
    }
    return false
  })

  // Lookup segment information
  const segment = segments.find((s) => {
    if (pole?.segment_id) {
      return (
        s.segment_id === pole.segment_id ||
        (s.external_ref && s.external_ref.toLowerCase() === pole.segment_id.toLowerCase())
      )
    }
    return false
  })

  const isRetired = Boolean(fixture.removed_date)
  const lampCount = fixture.lamp_count || 1
  const lampWatt = fixture.lamp_watt || 100
  const totalWatt = lampCount * lampWatt
  const fixtureCode =
    fixture.fixture_id || (fixture.pole_external_ref ? `FIX-${fixture.pole_external_ref}` : 'FIX-UNKNOWN')

  // Warranty calculation
  const hasWarrantyExpiry = Boolean(fixture.warranty_expiry)
  const isWarrantyExpired = hasWarrantyExpiry
    ? new Date(fixture.warranty_expiry!).getTime() < Date.now()
    : false

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 z-10 overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-white/25 px-2 py-0.5 rounded-md font-bold">
                  {fixtureCode}
                </span>
                {!isRetired ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-100 border border-emerald-400/30">
                    Đang hoạt động
                  </span>
                ) : (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-900/50 text-slate-200 border border-slate-400/30">
                    Đã tháo dỡ
                  </span>
                )}
              </div>
              <h3 className="font-extrabold text-base mt-0.5">
                {fixture.fixture_type === 'led_road_lamp' ? 'Đèn LED Chiếu Sáng Đường Phố' : fixture.fixture_type}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 text-xs text-slate-700 dark:text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Grid Thông số Kỹ thuật Nổi bật */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/60">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Số bóng / bộ</span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-slate-100 mt-1">
                {lampCount} bóng
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {lampWatt} W / bóng
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/60">
              <div className="text-[10px] text-blue-700 dark:text-blue-400 font-bold uppercase flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-blue-500" />
                <span>Tổng công suất</span>
              </div>
              <div className="text-base font-black text-blue-700 dark:text-blue-300 mt-1">
                {totalWatt} W
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                Nguồn: {fixture.power_source === 'grid' ? 'Điện lưới' : 'Năng lượng MT'}
              </div>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 col-span-2 sm:col-span-1">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Bảo hành</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                {hasWarrantyExpiry ? (
                  isWarrantyExpired ? (
                    <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Hết hạn
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Còn hạn</span>
                  )
                ) : (
                  <span className="text-slate-400 font-normal">Không có</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                {fixture.warranty_expiry || '—'}
              </div>
            </div>
          </div>

          {/* Cụm Vị trí Lắp đặt: Cột & Tuyến đường */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <Boxes className="w-4 h-4 text-blue-600 dark:text-sky-400" />
              <span>Vị Trí & Hạ Tầng Lắp Đặt</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Cột điện gắn:</span>
                <span className="font-mono font-bold text-blue-600 dark:text-sky-400">
                  {fixture.pole_external_ref || 'Chưa gán cột'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Tuyến đường:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">
                  {segment?.segment_name || (pole?.segment_id ? `Tuyến ${pole.segment_id}` : 'Chưa gắn tuyến')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Địa bàn quản lý:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatFriendlyCommuneName(pole?.commune_name, pole?.commune_id, 'Chưa gán địa bàn')}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                <span className="text-slate-500">Tọa độ GIS:</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-500" />
                  {pole?.location?.lat && pole?.location?.lng
                    ? `${pole.location.lat.toFixed(5)}, ${pole.location.lng.toFixed(5)}`
                    : 'Chưa định vị'}
                </span>
              </div>
            </div>
          </div>

          {/* Vòng đời & Thời gian vận hành */}
          <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-200/70 dark:border-orange-900/50 space-y-2">
            <div className="font-bold text-orange-950 dark:text-orange-200 text-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span>Vòng Đời Vận Hành & Lịch Sử</span>
            </div>

            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span>Ngày bắt đầu lắp đặt:</span>
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {fixture.install_date || 'Chưa ghi nhận'}
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span>Hạn kết thúc bảo hành:</span>
                <strong className="font-mono text-slate-900 dark:text-slate-100">
                  {fixture.warranty_expiry || 'Không có'}
                </strong>
              </div>

              {isRetired && (
                <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-bold">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Ngày tháo dỡ thu hồi:
                  </span>
                  <span className="font-mono">{fixture.removed_date}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-orange-200/50 dark:border-orange-900/40">
                <span>Nguồn dữ liệu:</span>
                <span className="font-semibold uppercase tracking-wider">
                  {fixture.data_source || 'field'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(fixture)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa thông số</span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default FixtureDetailModal

