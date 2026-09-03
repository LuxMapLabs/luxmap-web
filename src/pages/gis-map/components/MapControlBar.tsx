import React from 'react'
import {
  Search,
  Zap,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Route,
  Tag,
  X,
} from 'lucide-react'
import { SegmentInfo, GisStats, PoleFeature } from '../GisMapPage'

interface MapControlBarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  isSearchFocused: boolean
  setIsSearchFocused: (f: boolean) => void
  searchSuggestions: PoleFeature[]
  handleSelectSearchResult: (f: PoleFeature) => void
  statusFilter: string
  setStatusFilter: (s: string) => void
  stats: GisStats
  selectedSegment: string
  handleSegmentSelect: (segId: string) => void
  segmentsList: SegmentInfo[]
  showLabels: boolean
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>
}

export const MapControlBar: React.FC<MapControlBarProps> = ({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  searchSuggestions,
  handleSelectSearchResult,
  statusFilter,
  setStatusFilter,
  stats,
  selectedSegment,
  handleSegmentSelect,
  segmentsList,
  showLabels,
  setShowLabels,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-4 pointer-events-none flex-nowrap">
      
      {/* Left Cluster: Search Box + Status Filter Pills Group */}
      <div className="flex items-center gap-2.5 pointer-events-auto">
        
        {/* 1. Search Input Box */}
        <div className="relative w-64 shrink-0 bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl overflow-visible">
          <div className="flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-blue-500 shrink-0 mr-2" />
            <input
              type="text"
              placeholder="Tìm mã cột (POLE-0047)..."
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setIsSearchFocused(true)
              }}
              className="w-full bg-transparent text-xs text-slate-800 font-semibold focus:outline-none placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setIsSearchFocused(false)
                }}
                className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchFocused && searchQuery.trim() && searchSuggestions.length > 0 && (
            <div className="absolute top-12 left-0 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 space-y-1 z-30 max-h-60 overflow-y-auto">
              {searchSuggestions.map((f: PoleFeature) => (
                <div
                  key={f.properties.pole_id}
                  onClick={() => handleSelectSearchResult(f)}
                  className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-between text-xs transition"
                >
                  <div>
                    <span className="font-bold text-slate-800">{f.properties.pole_id}</span>
                    <span className="text-[10px] text-slate-500 ml-1.5">{f.properties.segment_id}</span>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                      f.properties.fixture_status === 'normal'
                        ? 'bg-emerald-100 text-emerald-800'
                        : f.properties.fixture_status === 'dim'
                        ? 'bg-amber-100 text-amber-800'
                        : f.properties.fixture_status === 'out'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {f.properties.fixture_status === 'normal'
                      ? 'Sáng'
                      : f.properties.fixture_status === 'dim'
                      ? 'Mờ'
                      : f.properties.fixture_status === 'out'
                      ? 'Tắt'
                      : 'Chưa quét'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Status Filter Pills Group */}
        <div className="shrink-0 bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl p-1 flex items-center gap-1 text-xs font-medium text-slate-700">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-slate-700 font-semibold'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'normal' ? 'all' : 'normal')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'normal'
                ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-emerald-700 font-semibold'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${statusFilter === 'normal' ? 'text-white' : 'text-emerald-500 fill-emerald-100'}`} />
            <span>Đạt chuẩn ({stats.normal})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'dim' ? 'all' : 'dim')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'dim'
                ? 'bg-amber-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-amber-700 font-semibold'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${statusFilter === 'dim' ? 'text-white' : 'text-amber-500 fill-amber-100'}`} />
            <span>Đèn mờ ({stats.dim})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'out' ? 'all' : 'out')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'out'
                ? 'bg-rose-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-rose-700 font-semibold'
            }`}
          >
            <AlertCircle className={`w-3.5 h-3.5 ${statusFilter === 'out' ? 'text-white' : 'text-rose-500 fill-rose-100'}`} />
            <span>Hỏng/Tắt ({stats.out})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'unknown' ? 'all' : 'unknown')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
              statusFilter === 'unknown'
                ? 'bg-slate-600 text-white font-bold shadow-2xs'
                : 'hover:bg-slate-100 text-slate-700 font-semibold'
            }`}
          >
            <HelpCircle className={`w-3.5 h-3.5 ${statusFilter === 'unknown' ? 'text-white' : 'text-slate-400'}`} />
            <span>Chưa quét ({stats.unknown})</span>
          </button>
        </div>

      </div>

      {/* Right Cluster: Segment Filter & Label Toggle */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* 3. Segment Filter Dropdown */}
        <div className="flex items-center bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl px-2.5 py-1.5 gap-1.5 text-xs shrink-0">
          <Route className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <select
            value={selectedSegment}
            onChange={(e) => handleSegmentSelect(e.target.value)}
            className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 max-w-[210px] truncate"
          >
            <option value="all">Tất cả 3 tuyến</option>
            {segmentsList.map((seg) => (
              <option key={seg.id} value={seg.id}>
                {seg.name} - {seg.id} ({seg.poleCount} cột)
              </option>
            ))}
          </select>
        </div>


        {/* 4. Show/Hide Pole Labels Button */}
        <button
          type="button"
          onClick={() => setShowLabels((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer border ${
            showLabels
              ? 'bg-blue-600 text-white border-blue-700'
              : 'bg-white/95 backdrop-blur-md text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Hiện mã cột</span>
        </button>
      </div>

    </div>
  )
}
