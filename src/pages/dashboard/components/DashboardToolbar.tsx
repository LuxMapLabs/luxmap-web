import React from 'react'
import { Route, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SegmentListItem } from '../../../types/assets/segments'

interface DashboardToolbarProps {
  selectedSegment: string
  onSegmentChange: (segmentId: string) => void
  segments: SegmentListItem[]
  loading: boolean
}

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  selectedSegment,
  onSegmentChange,
  segments,
  loading,
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 px-4.5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Lọc Tuyến đường (Đồng bộ trực tiếp từ Database qua API) */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <Route className="w-4 h-4 text-slate-500" />
          <label className="font-semibold text-slate-500 whitespace-nowrap">Tuyến đường:</label>
          <select
            value={selectedSegment}
            onChange={(e) => {
              onSegmentChange(e.target.value)
              toast.info(`Đã chọn: ${e.target.selectedOptions[0]?.text}`)
            }}
            className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer max-w-sm truncate"
          >
            <option value="all">Tất cả các tuyến</option>
            {segments.map((seg) => (
              <option key={seg.segment_id || ''} value={seg.segment_id || ''}>
                {seg.segment_name || seg.segment_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Indicator nhỏ gọn */}
      {loading && (
        <div className="flex items-center gap-1.5 px-2 text-xs text-blue-600 font-semibold animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Đang đồng bộ dữ liệu...</span>
        </div>
      )}
    </div>
  )
}
