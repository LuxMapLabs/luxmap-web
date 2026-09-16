import React from 'react'
import {
  Search,
  Zap,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  Route,
  X,
  Lightbulb,
} from 'lucide-react'
import type { SegmentInfo, GisStats } from '../GisMapPage'
import type { SearchResultItem } from '../../../utils/gis-map/gisSearchUtils'

interface MapControlBarProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  isSearchFocused: boolean
  setIsSearchFocused: (f: boolean) => void
  searchSuggestions: SearchResultItem[]
  handleSelectSearchResult: (item: SearchResultItem) => void
  handleSearchSubmit: (query: string) => void
  handleSearchClear?: () => void
  statusFilter: string
  setStatusFilter: (s: string) => void
  stats: GisStats
  selectedSegment: string
  handleSegmentSelect: (segId: string) => void
  segmentsList: SegmentInfo[]
  isPanelOpen?: boolean
}

export const MapControlBar: React.FC<MapControlBarProps> = ({
  searchQuery,
  setSearchQuery,
  isSearchFocused,
  setIsSearchFocused,
  searchSuggestions,
  handleSelectSearchResult,
  handleSearchSubmit,
  handleSearchClear,
  statusFilter,
  setStatusFilter,
  stats,
  selectedSegment,
  handleSegmentSelect,
  segmentsList,
  isPanelOpen = false,
}) => {
  // Reusable Search Input Node
  const searchInputNode = (widthClass: string) => (
    <div className={`relative ${widthClass} bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl overflow-visible`}>
      <div className="flex items-center px-3 py-2">
        <button
          type="button"
          onClick={() => handleSearchSubmit(searchQuery)}
          className="cursor-pointer focus:outline-none shrink-0 mr-2"
          title="Tìm kiếm"
        >
          <Search className="w-4 h-4 text-blue-500 hover:text-blue-600 transition" />
        </button>
        <input
          type="text"
          placeholder="Tìm mã cột, tuyến đường, tủ điện, atlas (gần nhà ông A...)..."
          value={searchQuery}
          onFocus={() => setIsSearchFocused(true)}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsSearchFocused(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSearchSubmit(searchQuery)
            }
          }}
          className="w-full bg-transparent text-xs text-slate-800 font-semibold focus:outline-none placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('')
              handleSearchClear?.()
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
        <div className={`absolute top-12 left-0 min-w-[320px] w-full bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl shadow-2xl p-1.5 space-y-1 z-50 max-h-72 overflow-y-auto`}>
          <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
            <span>Gợi ý ({searchSuggestions.length})</span>
            <span className="text-[9px] font-normal lowercase text-slate-400">Ấn Enter để chọn</span>
          </div>
          {searchSuggestions.map((item: SearchResultItem) => (
            <div
              key={`${item.category}-${item.id}`}
              onClick={() => handleSelectSearchResult(item)}
              className="p-2 hover:bg-blue-50/70 rounded-xl cursor-pointer flex items-center justify-between text-xs transition group"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div
                  className={`p-1.5 rounded-lg shrink-0 ${
                    item.category === 'segment'
                      ? 'bg-blue-100 text-blue-700'
                      : item.category === 'cabinet'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.category === 'segment' && <Route className="w-3.5 h-3.5" />}
                  {item.category === 'cabinet' && <Zap className="w-3.5 h-3.5" />}
                  {item.category === 'pole' && <Lightbulb className="w-3.5 h-3.5" />}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-800 group-hover:text-blue-700 truncate">{item.title}</div>
                  <div className="text-[10.5px] text-slate-500 truncate">{item.subtitle}</div>
                </div>
              </div>
              {item.badgeText && (
                <span
                  className={`text-[10.5px] px-2 py-0.5 rounded-full font-medium shrink-0 border flex items-center gap-1.5 shadow-2xs ${
                    item.badgeColorClass || 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {item.statusDotColor && (
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.statusDotColor}`} />
                  )}
                  <span>{item.badgeText}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // Reusable Status Filter Pills Node
  const statusPillsNode = (
    <div className="flex items-center bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl p-1 gap-1 text-xs shrink-0 overflow-x-auto">
      <button
        type="button"
        onClick={() => setStatusFilter('all')}
        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
          statusFilter === 'all'
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <Zap className="w-3 h-3" />
        <span>Tất cả</span>
        <span className="bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
          {stats.total}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('normal')}
        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
          statusFilter === 'normal'
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>Đạt chuẩn</span>
        <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
          {stats.normal}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('dim')}
        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
          statusFilter === 'dim'
            ? 'bg-amber-500 text-white shadow-sm'
            : 'text-amber-700 hover:bg-amber-50'
        }`}
      >
        <AlertTriangle className="w-3 h-3" />
        <span>Đèn mờ</span>
        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
          {stats.dim}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('out')}
        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
          statusFilter === 'out'
            ? 'bg-rose-600 text-white shadow-sm'
            : 'text-rose-700 hover:bg-rose-50'
        }`}
      >
        <AlertCircle className="w-3 h-3" />
        <span>Hỏng / Tắt</span>
        <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
          {stats.out}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setStatusFilter('unknown')}
        className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
          statusFilter === 'unknown'
            ? 'bg-slate-600 text-white shadow-sm'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        <HelpCircle className="w-3 h-3" />
        <span>Chưa quét</span>
        <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
          {stats.unknown}
        </span>
      </button>
    </div>
  )

  // Reusable Tools Node (Segment Selector)
  const toolsNode = (maxDropdownWidth: string) => (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Segment Filter Dropdown */}
      <div className="flex items-center bg-white/95 backdrop-blur-md shadow-md border border-slate-200 rounded-xl px-2.5 py-1.5 gap-1.5 text-xs shrink-0">
        <Route className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <select
          value={selectedSegment}
          onChange={(e) => handleSegmentSelect(e.target.value)}
          className={`bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer pr-1 ${maxDropdownWidth} truncate`}
        >
          <option value="all">Tất cả tuyến</option>
          {segmentsList.map((seg) => (
            <option key={seg.id} value={seg.id}>
              {seg.name} - {seg.id} ({seg.poleCount} cột)
            </option>
          ))}
        </select>
      </div>
    </div>
  )

  // 1. When Drawer is OPEN (width is limited to ~800px):
  // Put Route Selector UNDER Search Box to give Status Pills full room on Row 1
  if (isPanelOpen) {
    return (
      <div className="absolute top-3.5 left-3.5 right-3.5 z-30 flex items-start gap-2.5 pointer-events-none">
        {/* Left Column: Search Box on top, Tools directly underneath */}
        <div className="flex flex-col gap-2 pointer-events-auto shrink-0">
          {searchInputNode('w-64 sm:w-72')}
          {toolsNode('max-w-[140px] sm:max-w-[160px]')}
        </div>

        {/* Right side on Row 1: Status Filter Pills */}
        <div className="pointer-events-auto shrink-0">
          {statusPillsNode}
        </div>
      </div>
    )
  }

  // 2. When Drawer is CLOSED (normal wide screen):
  // Everything is on 1 SINGLE CLEAN ROW!
  return (
    <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-none">
      <div className="flex items-center gap-2.5 pointer-events-auto">
        {searchInputNode('w-60 lg:w-64')}
        {statusPillsNode}
      </div>

      <div className="pointer-events-auto">
        {toolsNode('max-w-[180px] lg:max-w-[210px]')}
      </div>
    </div>
  )
}

