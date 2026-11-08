export interface OpsTabItem<T extends string> {
  key: T
  label: string
  count?: number
}

interface OpsTabsProps<T extends string> {
  items: OpsTabItem<T>[]
  value: T
  onChange: (key: T) => void
}

// Một kiểu tab duy nhất cho Manager: thanh phân đoạn, mục đang chọn là viên trắng nổi lên
export function OpsTabs<T extends string>({ items, value, onChange }: OpsTabsProps<T>) {
  return (
    <div role="tablist" className="inline-flex flex-wrap gap-0.5 rounded-[14px] bg-slate-100 p-1">
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(item.key)}
            className={`flex items-center gap-2 rounded-[11px] px-3.5 py-2 text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 active:scale-95 ${
              active
                ? 'bg-white text-teal-700 shadow-[0_4px_10px_-4px_rgba(15,27,45,0.18)]'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={`rounded-full px-1.5 text-[11px] tabular-nums transition-colors duration-200 ${
                  active ? 'bg-teal-50 text-teal-700' : 'bg-white text-slate-500'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
