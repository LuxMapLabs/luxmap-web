import React, { Fragment, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface AssetTabItem {
  key: string
  label: string
  icon: LucideIcon
  count: number
  isLoading?: boolean
  active: boolean
  onSelect: () => void
}

interface AssetTabsProps {
  /** Mỗi phần tử là một nhóm tab; giữa các nhóm có vạch ngăn */
  groups: AssetTabItem[][]
}

// Thanh tab của trang Tài sản: tab đang chọn là viên teal đặc, thanh tự cuộn ngang khi màn hình hẹp
export const AssetTabs: React.FC<AssetTabsProps> = ({ groups }) => {
  const activeRef = useRef<HTMLButtonElement | null>(null)

  const activeKey = groups.flat().find((t) => t.active)?.key
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [activeKey])

  return (
    <div
      role="tablist"
      className="ops-rise flex items-center gap-1 overflow-x-auto rounded-[20px] bg-white p-1.5 shadow-ops select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {groups.map((group, gi) => (
        <Fragment key={gi}>
          {gi > 0 && <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-slate-200" />}
          {group.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                ref={tab.active ? activeRef : undefined}
                role="tab"
                aria-selected={tab.active}
                type="button"
                onClick={tab.onSelect}
                className={`group flex flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-3.5 py-2 text-xs font-bold transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 active:scale-[0.97] ${
                  tab.active
                    ? 'bg-linear-to-br from-teal-500 to-teal-700 text-white shadow-[0_10px_20px_-10px_rgba(13,148,136,0.75)]'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-px'
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors duration-200 ${
                    tab.active ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span>{tab.label}</span>
                <span
                  className={`min-w-5 rounded-full px-1.5 text-center text-[11px] tabular-nums ${
                    tab.active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tab.isLoading ? '…' : tab.count}
                </span>
              </button>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}
