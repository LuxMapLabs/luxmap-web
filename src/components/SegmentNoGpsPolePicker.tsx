import React from 'react'
import type { PoleListItem } from '../types/assets/poles'

/** Cột chưa có GPS mà chưa thuộc tuyến nào (hoặc đang thuộc tuyến `segmentId`): chọn được vào tuyến dù chưa lên bản đồ. */
export const noGpsPolesFor = (poles: PoleListItem[], segmentId?: string | null): PoleListItem[] =>
  poles.filter((p) => p.pole_id && !p.location && (!p.segment_id || p.segment_id === segmentId))

interface SegmentNoGpsPolePickerProps {
  poles: PoleListItem[]
  selected: Set<string>
  onToggle: (poleId: string) => void
}

export const SegmentNoGpsPolePicker: React.FC<SegmentNoGpsPolePickerProps> = ({ poles, selected, onToggle }) => {
  if (poles.length === 0) return null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 dark:text-slate-300">Cột chưa có GPS</span>
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          {selected.size} / {poles.length} cột
        </span>
      </div>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">
        Chưa lên được bản đồ nên không có trong hình tuyến. Gắn GPS cho cột sau, hình tuyến sẽ tự cập nhật.
      </p>
      <ul className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
        {poles.map((p) => {
          const id = p.pole_id as string
          return (
            <li key={id}>
              <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={selected.has(id)}
                  onChange={() => onToggle(id)}
                  className="accent-primary"
                />
                <span className="font-mono font-bold">{p.external_ref || id}</span>
                {p.note && <span className="truncate text-slate-500 dark:text-slate-400">{p.note}</span>}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
