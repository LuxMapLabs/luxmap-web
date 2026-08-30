import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface StatCardProps {
  title: string
  value: string | number
  subValue?: string
  icon?: React.ReactNode
  trend?: {
    value: string
    isUp: boolean
    label?: string
  }
  colorVariant?: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple'
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  icon,
  trend,
  colorVariant = 'blue',
  className = '',
}) => {
  const iconColors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }

  return (
    <div className={`p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{value}</h3>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold shrink-0 ${iconColors[colorVariant]}`}>
            {icon}
          </div>
        )}
      </div>

      {(trend || subValue) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          {trend && (
            <div className={`inline-flex items-center gap-1 font-bold ${trend.isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {trend.isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{trend.value}</span>
              {trend.label && <span className="text-slate-400 font-normal ml-0.5">{trend.label}</span>}
            </div>
          )}
          {subValue && <span className="text-slate-500 font-medium">{subValue}</span>}
        </div>
      )}
    </div>
  )
}

