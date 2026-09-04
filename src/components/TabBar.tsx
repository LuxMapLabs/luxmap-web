import React from 'react'

export interface TabItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string | number
  badgeColor?: 'default' | 'danger' | 'warning' | 'success' | 'primary'
  disabled?: boolean
}

export interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'underline' | 'pills' | 'segmented'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  // Size styles
  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3 gap-1.5',
    md: 'text-xs font-semibold py-2 px-4 gap-2',
    lg: 'text-sm font-bold py-2.5 px-5 gap-2.5',
  }[size]

  const badgeSizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.2',
    md: 'text-[11px] px-2 py-0.5',
    lg: 'text-xs px-2 py-0.5',
  }[size]

  // Container variants
  const containerVariants = {
    underline: 'flex items-center gap-2 border-b border-slate-200 overflow-x-auto custom-scrollbar',
    pills: 'flex items-center gap-1.5 overflow-x-auto custom-scrollbar p-1',
    segmented: 'inline-flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/60 overflow-x-auto custom-scrollbar',
  }[variant]

  const getBadgeStyle = (color?: string, isActive?: boolean) => {
    if (color === 'danger') return 'bg-rose-100 text-rose-700 font-bold'
    if (color === 'warning') return 'bg-amber-100 text-amber-700 font-bold'
    if (color === 'success') return 'bg-emerald-100 text-emerald-700 font-bold'
    if (color === 'primary') return 'bg-blue-100 text-primary font-bold'
    return isActive ? 'bg-white/20 text-white font-bold' : 'bg-slate-200/80 text-slate-600 font-semibold'
  }

  return (
    <div className={`${containerVariants} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id

        // Item styles per variant
        let itemStyle = ''
        if (variant === 'underline') {
          itemStyle = isActive
            ? 'text-primary border-b-2 border-primary font-bold -mb-px'
            : 'text-slate-500 hover:text-slate-800 border-b-2 border-transparent font-medium hover:border-slate-300'
        } else if (variant === 'pills') {
          itemStyle = isActive
            ? 'bg-primary text-white font-bold shadow-xs'
            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60 font-medium'
        } else if (variant === 'segmented') {
          itemStyle = isActive
            ? 'bg-white text-primary font-bold shadow-xs'
            : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/50'
        }

        return (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={`flex items-center justify-center rounded-xl transition-all duration-200 select-none whitespace-nowrap cursor-pointer ${
              tab.disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-98'
            } ${fullWidth ? 'flex-1' : ''} ${sizeStyles} ${itemStyle}`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`rounded-full transition-colors ${badgeSizeStyles} ${getBadgeStyle(
                  tab.badgeColor,
                  isActive && variant === 'pills'
                )}`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

