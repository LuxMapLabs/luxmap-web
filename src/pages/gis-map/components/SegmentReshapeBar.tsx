import React from 'react'
import { Spline } from 'lucide-react'
import { ROUTE_CORRIDOR_M } from '../../../utils/gis-map/poleMove'

interface SegmentReshapeBarProps {
  label: string
  pointCount: number
  /** Chiều dài đoạn đã lấy; null khi chưa có đoạn nào. */
  lengthM: number | null
  oldLengthM: number | null
  /** Mã các cột của tuyến đang nằm xa hình mới quá hành lang. */
  polesFar: string[]
  error: string | null
  saving: boolean
  onUndo: () => void
  onCancel: () => void
  onSave: () => void
}

const meters = (m: number) => `${m.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} m`

/** Thanh nổi trên bản đồ khi lấy hình tuyến theo đường của bản đồ nền. */
export const SegmentReshapeBar: React.FC<SegmentReshapeBarProps> = ({
  label,
  pointCount,
  lengthM,
  oldLengthM,
  polesFar,
  error,
  saving,
  onUndo,
  onCancel,
  onSave,
}) => {
  const shown = polesFar.slice(0, 3).join(', ') + (polesFar.length > 3 ? '…' : '')
  return (
    <div
      role="dialog"
      aria-label={`Lấy hình tuyến ${label}`}
      className="absolute top-24 left-1/2 -translate-x-1/2 z-30 w-[min(92%,28rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-xs space-y-2"
    >
      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
        <Spline className="w-3.5 h-3.5 text-orange-500" />
        Lấy hình tuyến {label} theo đường trên bản đồ
      </div>
      <p className="text-slate-600 dark:text-slate-400">
        {pointCount === 0
          ? 'Bấm vào điểm đầu tuyến, ngay trên con đường.'
          : 'Bấm tiếp dọc con đường tới điểm cuối. Hệ thống tự đi theo đường có sẵn trên bản đồ nền.'}
      </p>
      <div className="flex gap-4 text-slate-700 dark:text-slate-300">
        <span>
          Dài mới: <strong className="text-slate-900 dark:text-white">{lengthM === null ? '—' : meters(lengthM)}</strong>
        </span>
        <span>
          Đang lưu:{' '}
          <strong className="text-slate-900 dark:text-white">{oldLengthM === null ? '—' : meters(oldLengthM)}</strong>
        </span>
      </div>
      {error && <p className="text-amber-700 dark:text-amber-400 font-medium">{error}</p>}
      {lengthM !== null && polesFar.length > 0 && (
        <p className="text-rose-600 dark:text-rose-400 font-medium">
          {polesFar.length} cột của tuyến còn cách đường mới quá {ROUTE_CORRIDOR_M} m ({shown}). Bấm tiếp cho đường đi
          tới gần các cột này.
        </p>
      )}
      <p className="text-[10.5px] text-slate-400 dark:text-slate-500">Nét đường lấy từ © OpenStreetMap, qua © MapTiler.</p>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={saving || pointCount === 0}
          className="mr-auto px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Bỏ điểm cuối
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Huỷ
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={saving || lengthM === null || polesFar.length > 0}
          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Đang lưu…' : 'Lưu hình tuyến'}
        </button>
      </div>
    </div>
  )
}
