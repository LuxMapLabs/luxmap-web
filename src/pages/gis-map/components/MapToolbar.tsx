import React from 'react'
import { Search, Sun, Zap, X } from 'lucide-react'

export interface MapToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  selectedPowerSource: string
  onPowerSourceChange: (source: string) => void
  selectedSegment: string
  onSegmentChange: (segment: string) => void
  segments: { id: string; name: string }[]
  onClearFilter: () => void
}

export const MapToolbar: React.FC<MapToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPowerSource,
  onPowerSourceChange,
  selectedSegment,
  onSegmentChange,
  segments,
  onClearFilter,
}) => {
  const isFiltered = searchQuery || selectedPowerSource !== 'all' || selectedSegment !== 'all'

  return (
    <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg p-2.5 flex flex-wrap items-center justify-between gap-3 select-none">
      
      {/* Left Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-70">
        
        {/* Quick Search Pole Box */}
        <div className="relative flex-1 max-w-xs min-w-45">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã cột (VD: POLE-0019)..."
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Tuyến Feeder / Đoạn đường Dropdown */}
        <div className="flex items-center gap-1">
          <select
            value={selectedSegment}
            onChange={(e) => onSegmentChange(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200/80 text-slate-700 py-1.5 pl-3 pr-8 rounded-xl focus:outline-none focus:bg-white focus:border-primary cursor-pointer transition shadow-2xs"
          >
            <option value="all">Tất cả tuyến đường</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </div>

        {/* Nguồn cấp điện Filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => onPowerSourceChange('all')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              selectedPowerSource === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tất cả nguồn
          </button>
          <button
            type="button"
            onClick={() => onPowerSourceChange('grid')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              selectedPowerSource === 'grid'
                ? 'bg-white text-primary shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3 h-3 text-amber-500" />
            <span>Điện lưới</span>
          </button>
          <button
            type="button"
            onClick={() => onPowerSourceChange('solar')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              selectedPowerSource === 'solar'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sun className="w-3 h-3 text-emerald-500" />
            <span>Solar</span>
          </button>
        </div>

      </div>

      {/* Right Tool: Clear Filter Button */}
      {isFiltered && (
        <button
          type="button"
          onClick={onClearFilter}
          className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          <span>Đặt lại bộ lọc</span>
        </button>
      )}

    </div>
  )
}
