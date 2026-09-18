import React from 'react'

export type FixtureStatus = 'normal' | 'dim' | 'out' | 'unknown'
export type WorkOrderStatus = 'draft' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
export type SlaStatus = 'ontime' | 'warning' | 'overdue'

export interface StatusBadgeProps {
  type: 'fixture' | 'order' | 'sla' | 'custom'
  status?: FixtureStatus | WorkOrderStatus | SlaStatus | string
  label?: string
  size?: 'sm' | 'md'
  showDot?: boolean
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  label,
  size = 'md',
  showDot = true,
  className = '',
}) => {
  let displayLabel = label || status || ''
  let bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  let dotClass = 'bg-slate-500'

  if (type === 'fixture') {
    switch (status) {
      case 'normal':
        displayLabel = label || 'Sáng tốt'
        bgClass = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
        dotClass = 'bg-emerald-500'
        break
      case 'dim':
        displayLabel = label || 'Đèn mờ'
        bgClass = 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
        dotClass = 'bg-amber-500'
        break
      case 'out':
        displayLabel = label || 'Đèn tắt'
        bgClass = 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
        dotClass = 'bg-rose-500'
        break
      case 'unknown':
        displayLabel = label || 'Chưa quét'
        bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
        dotClass = 'bg-slate-400'
        break
    }
  } else if (type === 'order') {
    switch (status) {
      case 'draft':
        displayLabel = label || 'Mới tạo'
        bgClass = 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
        dotClass = 'bg-blue-500'
        break
      case 'assigned':
        displayLabel = label || 'Đã phân công'
        bgClass = 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
        dotClass = 'bg-purple-500'
        break
      case 'in_progress':
        displayLabel = label || 'Đang xử lý'
        bgClass = 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
        dotClass = 'bg-amber-500'
        break
      case 'completed':
        displayLabel = label || 'Hoàn thành'
        bgClass = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
        dotClass = 'bg-emerald-500'
        break
      case 'cancelled':
        displayLabel = label || 'Đã hủy'
        bgClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
        dotClass = 'bg-slate-400'
        break
    }
  } else if (type === 'sla') {
    switch (status) {
      case 'ontime':
        displayLabel = label || 'Đúng hạn'
        bgClass = 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
        dotClass = 'bg-emerald-500'
        break
      case 'warning':
        displayLabel = label || 'Sắp trễ hạn'
        bgClass = 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
        dotClass = 'bg-amber-500'
        break
      case 'overdue':
        displayLabel = label || 'Quá hạn SLA'
        bgClass = 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
        dotClass = 'bg-rose-500'
        break
    }
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg border shadow-2xs ${sizeClass} ${bgClass} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />}
      <span className="truncate">{displayLabel}</span>
    </span>
  )
}

