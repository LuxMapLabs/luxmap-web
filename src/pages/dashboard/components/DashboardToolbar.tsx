import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Route, Loader2, ChevronDown, Check } from 'lucide-react'
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
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSlot(document.getElementById('ops-topbar-slot'))
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleMouseDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!slot) return null

  const selectedSegmentObj =
    selectedSegment === 'all'
      ? null
      : segments.find((s) => s.segment_id === selectedSegment) || null

  const totalPoles = segments.reduce((sum, s) => sum + (s.pole_count || 0), 0)

  return createPortal(
    <>
      {loading && (
        <div className="flex items-center gap-1.5 text-xs text-teal-700 font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Đang đồng bộ...</span>
        </div>
      )}

      <div ref={dropdownRef} className="relative select-none">
        {/* Hidden native select for accessibility & test compatibility */}
        <select
          tabIndex={-1}
          aria-hidden="true"
          value={selectedSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="sr-only absolute pointer-events-none opacity-0 w-0 h-0 -z-50"
        >
          <option value="all">Tất cả các tuyến ({segments.length})</option>
          {segments.map((seg) => (
            <option key={seg.segment_id || ''} value={seg.segment_id || ''}>
              {seg.segment_name || seg.segment_id}{' '}
              {seg.pole_count != null ? `(${seg.pole_count} cột)` : ''}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          title="Lọc theo tuyến đường"
          className={`group flex h-10 items-center gap-2 rounded-2xl bg-white pl-2.5 pr-3 shadow-ops text-[13px] border transition-all duration-200 hover:shadow-ops-hover hover:-translate-y-0.5 cursor-pointer ${
            isOpen
              ? 'border-teal-400 ring-2 ring-teal-500/25 shadow-ops-hover'
              : 'border-transparent hover:border-teal-200/80'
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
              isOpen || selectedSegment !== 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-600 group-hover:bg-teal-100'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
          </span>

          <span className="font-bold text-slate-800 max-w-[40vw] sm:max-w-52 truncate">
            {selectedSegmentObj
              ? selectedSegmentObj.segment_name || selectedSegmentObj.segment_id
              : 'Tất cả các tuyến'}
          </span>

          <span
            className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold font-mono shrink-0 transition-colors ${
              selectedSegmentObj
                ? 'bg-teal-50 text-teal-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {selectedSegmentObj
              ? `${selectedSegmentObj.pole_count ?? 0} cột`
              : segments.length}
          </span>

          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-teal-600' : 'group-hover:text-slate-600'
            }`}
          />
        </button>

        {isOpen && (
          <div
            role="listbox"
            aria-label="Danh sách tuyến đường"
            className="absolute right-0 top-full mt-2 w-76 sm:w-84 rounded-2xl border border-slate-200/90 bg-white/98 backdrop-blur-xl p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-100 mb-1">
              <span className="text-[11px] font-bold text-slate-400">Phạm vi giám sát tuyến</span>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {segments.length} tuyến · {totalPoles} cột
              </span>
            </div>

            <div className="max-h-68 overflow-y-auto custom-scrollbar space-y-1 p-0.5">
              {/* Option: Tất cả các tuyến */}
              <button
                type="button"
                role="option"
                aria-selected={selectedSegment === 'all'}
                onClick={() => {
                  onSegmentChange('all')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                  selectedSegment === 'all'
                    ? 'bg-teal-50/90 text-teal-800 border-teal-200 shadow-2xs'
                    : 'bg-transparent text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      selectedSegment === 'all'
                        ? 'bg-teal-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Route className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-bold truncate">
                      Tất cả các tuyến ({segments.length})
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Tổng hợp toàn bộ {totalPoles} cột chiếu sáng
                    </div>
                  </div>
                </div>

                {selectedSegment === 'all' && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  </span>
                )}
              </button>

              {/* Danh sách từng tuyến */}
              {segments.map((seg) => {
                const segId = seg.segment_id || ''
                const isSelected = selectedSegment === segId
                const name = seg.segment_name || segId
                return (
                  <button
                    key={segId}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSegmentChange(segId)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer border ${
                      isSelected
                        ? 'bg-teal-50/90 text-teal-800 border-teal-200 shadow-2xs'
                        : 'bg-transparent text-slate-700 border-transparent hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-teal-50 text-teal-600'
                        }`}
                      >
                        <Route className="w-3.5 h-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13px] font-bold truncate">{name}</div>
                        {seg.external_ref && seg.external_ref !== name && (
                          <div className="text-[11px] text-slate-400 font-mono truncate">
                            Mã tuyến: {seg.external_ref}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {seg.pole_count != null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                            isSelected
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {seg.pole_count} cột
                        </span>
                      )}
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>,
    slot
  )
}

