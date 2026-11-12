import React, { useEffect, useRef, useState } from 'react'
import { CornerUpRight, GripVertical, ListOrdered, X } from 'lucide-react'
import { isBend, type OrderedPole } from '../utils/gis-map/segmentPoleOrder'

interface SegmentPoleOrderListProps {
  /** Các cột của tuyến (xen điểm uốn nếu có), theo thứ tự dọc tuyến. */
  route: OrderedPole[]
  /** Mã hiển thị của từng cột, theo id. */
  codes: Record<string, string>
  highlightId: string | null
  /** Dòng cần cuộn vào tầm nhìn. */
  revealId: string | null
  onHover: (id: string | null) => void
  onFocus: (id: string) => void
  onMove: (from: number, to: number) => void
  onRemove: (id: string) => void
  onAutoSort: () => void
}

const iconButton =
  'p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed cursor-pointer transition'

export const SegmentPoleOrderList: React.FC<SegmentPoleOrderListProps> = ({
  route,
  codes,
  highlightId,
  revealId,
  onHover,
  onFocus,
  onMove,
  onRemove,
  onAutoSort,
}) => {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  // Cuộn dòng cần xem vào tầm nhìn (chỉ trong khung danh sách, không kéo cả trang)
  useEffect(() => {
    if (!revealId || !listRef.current) return
    const row = Array.from(listRef.current.querySelectorAll<HTMLElement>('[data-pole-id]')).find(
      (el) => el.dataset.poleId === revealId
    )
    row?.scrollIntoView?.({ block: 'nearest' })
  }, [revealId])

  const poleIndexes = route.flatMap((p, i) => (isBend(p) ? [] : [i]))
  const firstPoleIndex = poleIndexes[0]
  const lastPoleIndex = poleIndexes[poleIndexes.length - 1]

  const endDrag = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  // Dòng đổi chỗ dưới con trỏ mà trình duyệt không báo rời chuột, nên phải tự bỏ vòng sáng
  // để nó không kẹt ở một cột không còn khớp với dòng đang rê.
  const moveAndClear = (from: number, to: number) => {
    onMove(from, to)
    onHover(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ListOrdered className="w-3.5 h-3.5 text-blue-500" />
          Thứ tự cột dọc tuyến
        </span>
        <button
          type="button"
          onClick={onAutoSort}
          disabled={poleIndexes.length < 3}
          title="Sắp lại các cột theo vị trí gần nhau"
          className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
        >
          Sắp xếp tự động
        </button>
      </div>

      {route.length === 0 ? (
        <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-center">
          Chưa chọn cột nào. Click vào các cột đèn trên bản đồ để thêm vào tuyến.
        </div>
      ) : (
        <ul
          ref={listRef}
          aria-label="Danh sách cột của tuyến"
          className="max-h-[260px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900"
        >
          {route.map((pole, index) => {
            const bend = isBend(pole)
            const isFirst = index === firstPoleIndex
            const isLast = index === lastPoleIndex
            const isHighlighted = highlightId === pole.id
            return (
              <li
                key={pole.id}
                data-pole-id={pole.id}
                draggable
                onDragStart={(e) => {
                  setDragIndex(index)
                  onHover(null)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', pole.id)
                }}
                onDragOver={(e) => {
                  if (dragIndex === null) return
                  e.preventDefault()
                  setOverIndex(index)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (dragIndex !== null) moveAndClear(dragIndex, index)
                  endDrag()
                }}
                onDragEnd={() => {
                  endDrag()
                  onHover(null)
                }}
                onMouseEnter={() => !bend && onHover(pole.id)}
                onMouseLeave={() => !bend && onHover(null)}
                className={`flex items-center gap-1 px-1.5 py-1 transition-colors ${
                  isHighlighted ? 'bg-amber-50 dark:bg-amber-950/30' : ''
                } ${dragIndex === index ? 'opacity-40' : ''} ${
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? 'border-t-2 border-blue-500'
                    : ''
                }`}
              >
                <span
                  className="cursor-grab text-slate-300 dark:text-slate-600 shrink-0"
                  title="Kéo để đổi vị trí"
                  aria-hidden="true"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() => onFocus(pole.id)}
                  title={bend ? 'Xem điểm uốn này trên bản đồ' : 'Xem cột này trên bản đồ'}
                  className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer"
                >
                  {bend ? (
                    <span className="flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300 truncate">
                      <CornerUpRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      Điểm uốn
                    </span>
                  ) : (
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {codes[pole.id] || pole.id}
                    </span>
                  )}
                  {isFirst && (
                    <span className="shrink-0 px-1.5 py-px rounded bg-emerald-500 text-white text-[9px] font-bold">
                      Đầu tuyến
                    </span>
                  )}
                  {isLast && poleIndexes.length > 1 && (
                    <span className="shrink-0 px-1.5 py-px rounded bg-rose-500 text-white text-[9px] font-bold">
                      Cuối tuyến
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRemove(pole.id)
                    onHover(null)
                  }}
                  title={bend ? 'Xóa điểm uốn' : 'Bỏ khỏi tuyến'}
                  aria-label={bend ? 'Xóa điểm uốn' : `Bỏ ${codes[pole.id] || pole.id} khỏi tuyến`}
                  className={`${iconButton} hover:text-rose-500`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SegmentPoleOrderList
