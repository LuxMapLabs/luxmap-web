import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Route, Loader2, ChevronDown } from 'lucide-react'
import type { SegmentListItem } from '../../../types/assets/segments'

interface DashboardToolbarProps {
  selectedSegment: string
  onSegmentChange: (segmentId: string) => void
  segments: SegmentListItem[]
  loading: boolean
}

// Ô chọn tuyến được đặt vào thanh tiêu đề của ManagerLayout (cạnh chuông thông báo)
export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  selectedSegment,
  onSegmentChange,
  segments,
  loading,
}) => {
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setSlot(document.getElementById('ops-topbar-slot'))
  }, [])

  if (!slot) return null

  return createPortal(
    <>
      {loading && (
        <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Đang đồng bộ...</span>
        </div>
      )}
      <label className="relative flex h-10 items-center gap-2 rounded-2xl bg-white pl-3.5 pr-9 shadow-ops text-[13px] transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-teal-500/30">
        <Route className="w-4 h-4 text-teal-600" />
        <span className="sr-only">Tuyến đường</span>
        <select
          value={selectedSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="appearance-none bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer max-w-[48vw] sm:max-w-64 truncate"
        >
          <option value="all">Tất cả các tuyến ({segments.length})</option>
          {segments.map((seg) => (
            <option key={seg.segment_id || ''} value={seg.segment_id || ''}>
              {seg.segment_name || seg.segment_id} {seg.pole_count != null ? `(${seg.pole_count} cột)` : ''}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
      </label>
    </>,
    slot
  )
}
