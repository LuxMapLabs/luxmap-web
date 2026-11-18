import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonitorFeeder } from './ElectricalMonitorModal'
import { IOT_NODE_STATUS, IOT_TONE_COLOR, iotStatusBadge } from '../../../constants/iot'

export interface FeederPickerProps {
  feeders: MonitorFeeder[]
  activeFeederId: string
  nodeStatus: Record<string, string | null | undefined>
  onSelect: (feederId: string) => void
  onOpenChange?: (open: boolean) => void
}

export const FeederPicker: React.FC<FeederPickerProps> = ({
  feeders,
  activeFeederId,
  nodeStatus,
  onSelect,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [focusedIndex, setFocusedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const optionRefs = useRef<Map<string, HTMLLIElement>>(new Map())
  const listboxId = 'feeder-picker-listbox'

  const setOpenState = useCallback(
    (open: boolean | ((prev: boolean) => boolean)) => {
      setIsOpen((prev) => {
        const next = typeof open === 'function' ? open(prev) : open
        if (next !== prev) {
          onOpenChange?.(next)
        }
        return next
      })
    },
    [onOpenChange]
  )

  const currentIndex = feeders.findIndex((f) => f.feeder_id === activeFeederId)
  const actualIndex = currentIndex !== -1 ? currentIndex : 0
  const activeFeeder = feeders[actualIndex] || feeders[0]

  const filteredFeeders = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return feeders
    return feeders.filter(
      (f) =>
        (f.name && f.name.toLowerCase().includes(q)) ||
        f.label.toLowerCase().includes(q) ||
        (f.node_id && f.node_id.toLowerCase().includes(q))
    )
  }, [feeders, query])

  // Reset or initialize focus index when opening or filtering
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      const idx = feeders.findIndex((f) => f.feeder_id === activeFeederId)
      setFocusedIndex(idx !== -1 ? idx : 0)
    }
  }, [isOpen, activeFeederId, feeders])

  // Auto scroll focused item into view
  useEffect(() => {
    if (isOpen && filteredFeeders[focusedIndex]) {
      const el = optionRefs.current.get(filteredFeeders[focusedIndex].feeder_id)
      if (typeof el?.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [focusedIndex, isOpen, filteredFeeders])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenState(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
    }
  }, [isOpen, setOpenState])

  const closeAndRefocus = () => {
    setOpenState(false)
    triggerRef.current?.focus()
  }

  const handleSelect = (feederId: string) => {
    onSelect(feederId)
    closeAndRefocus()
  }

  const handlePrev = () => {
    if (actualIndex > 0) {
      onSelect(feeders[actualIndex - 1].feeder_id)
    }
  }

  const handleNext = () => {
    if (actualIndex < feeders.length - 1) {
      onSelect(feeders[actualIndex + 1].feeder_id)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      e.preventDefault()
      e.nativeEvent.stopImmediatePropagation()
      closeAndRefocus()
      return
    }

    if (e.key === 'Tab') {
      setOpenState(false)
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.min(prev + 1, filteredFeeders.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusedIndex((prev) => Math.max(prev - 1, 0))
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredFeeders[focusedIndex]) {
        handleSelect(filteredFeeders[focusedIndex].feeder_id)
      }
      return
    }
  }

  if (feeders.length <= 1) {
    const f = feeders[0]
    if (!f) return null
    const status = f.node_id ? nodeStatus[f.node_id] : null
    const badge = f.node_id ? iotStatusBadge(IOT_NODE_STATUS, status) : null
    const displayName = f.name || f.label
    const nodeText = f.node_id || 'chưa gắn IoT'

    return (
      <div className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
        {f.node_id && badge ? (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: IOT_TONE_COLOR[badge.tone] }}
          />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 border border-slate-400 dark:border-slate-500 bg-transparent" />
        )}
        <span className="font-semibold">{displayName}</span>
        <span className="text-slate-400 dark:text-slate-500">·</span>
        <span className={f.node_id ? 'font-mono text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}>
          {nodeText}
        </span>
      </div>
    )
  }

  const activeStatus = activeFeeder.node_id ? nodeStatus[activeFeeder.node_id] : null
  const activeBadge = activeFeeder.node_id ? iotStatusBadge(IOT_NODE_STATUS, activeStatus) : null
  const activeTitle = [activeFeeder.name, activeFeeder.label, activeFeeder.node_id || 'chưa gắn IoT']
    .filter(Boolean)
    .join(' · ')

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1">
      {/* Nút ‹ Mạch trước */}
      <button
        type="button"
        aria-label="Mạch trước"
        disabled={actualIndex <= 0}
        onClick={handlePrev}
        className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Nút chọn dropdown */}
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setOpenState((prev) => !prev)}
        title={activeTitle}
        className="min-h-[32px] max-w-md px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 min-w-0"
      >
        {activeFeeder.node_id && activeBadge ? (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: IOT_TONE_COLOR[activeBadge.tone] }}
          />
        ) : (
          <span className="w-2 h-2 rounded-full shrink-0 border border-slate-400 dark:border-slate-500 bg-transparent" />
        )}
        <span className="truncate font-semibold">{activeFeeder.name || activeFeeder.label}</span>
        <span className="font-mono whitespace-nowrap shrink-0 text-slate-500 dark:text-slate-400">
          {activeFeeder.node_id || 'chưa gắn IoT'}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400 ml-auto" />
      </button>

      {/* Nút › Mạch sau */}
      <button
        type="button"
        aria-label="Mạch sau"
        disabled={actualIndex >= feeders.length - 1}
        onClick={handleNext}
        className="min-w-[32px] min-h-[32px] w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500 shrink-0"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 z-20 w-[26rem] max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden p-2 flex flex-col gap-2"
          onKeyDown={handleKeyDown}
        >
          {/* Ô tìm */}
          <div className="relative">
            <input
              ref={searchInputRef}
              autoFocus
              role="combobox"
              aria-controls={listboxId}
              aria-expanded={true}
              aria-autocomplete="list"
              aria-activedescendant={
                filteredFeeders[focusedIndex] ? `feeder-option-${filteredFeeders[focusedIndex].feeder_id}` : undefined
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFocusedIndex(0)
              }}
              placeholder="Tìm mạch hoặc node…"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Danh sách */}
          <ul
            id={listboxId}
            role="listbox"
            className="max-h-80 overflow-y-auto space-y-1 p-0.5"
          >
            {filteredFeeders.length === 0 ? (
              <li className="p-3 text-xs text-center text-slate-400">
                Không tìm thấy mạch phù hợp.
              </li>
            ) : (
              filteredFeeders.map((f, idx) => {
                const isSelected = f.feeder_id === activeFeederId
                const isFocused = idx === focusedIndex
                const badge = f.node_id ? iotStatusBadge(IOT_NODE_STATUS, nodeStatus[f.node_id]) : null
                const toneTextClass =
                  badge?.tone === 'bad'
                    ? 'text-rose-600 dark:text-rose-400'
                    : badge?.tone === 'warn'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500 dark:text-slate-400'

                return (
                  <li
                    key={f.feeder_id}
                    ref={(el) => {
                      if (el) optionRefs.current.set(f.feeder_id, el)
                      else optionRefs.current.delete(f.feeder_id)
                    }}
                    id={`feeder-option-${f.feeder_id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(f.feeder_id)}
                    onMouseEnter={() => setFocusedIndex(idx)}
                    className={`p-2 rounded-lg cursor-pointer flex items-center gap-2.5 transition text-left ${
                      isFocused ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    } ${f.node_id ? '' : 'opacity-70'}`}
                  >
                    {f.node_id && badge ? (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: IOT_TONE_COLOR[badge.tone] }}
                      />
                    ) : (
                      <span className="w-2 h-2 rounded-full shrink-0 border border-slate-400 dark:border-slate-500 bg-transparent" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {f.name || f.label}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                        <span className="font-mono whitespace-nowrap">{f.label}</span>
                        <span>·</span>
                        {f.node_id && badge ? (
                          <>
                            <span className="font-mono whitespace-nowrap">{f.node_id}</span>
                            <span>·</span>
                            <span className={`whitespace-nowrap ${toneTextClass}`}>{badge.label}</span>
                          </>
                        ) : (
                          <span className="whitespace-nowrap text-slate-400 dark:text-slate-500">chưa gắn IoT</span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 ml-auto" />
                    )}
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

export default FeederPicker
