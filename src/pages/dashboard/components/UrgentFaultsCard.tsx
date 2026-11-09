import React from 'react'
import { AlertTriangle, CalendarPlus, CheckCircle2 } from 'lucide-react'
import type { FaultItem } from '../../../types/faults/faults'
import { OpsCard } from '../../../components/ops/OpsCard'

interface UrgentFaultsCardProps {
  faults: FaultItem[]
  segmentNameMap: Record<string, string>
  onCreateSchedule: (fault: FaultItem) => void
}

const MAX_ITEMS = 4

// Danh sách sự cố chưa có lịch công tác, bấm vào để tạo lịch ngay
export const UrgentFaultsCard: React.FC<UrgentFaultsCardProps> = ({ faults, segmentNameMap, onCreateSchedule }) => (
  <OpsCard
    index={3}
    className="h-full"
    title="Cần xử lý ngay"
    description="Sự cố chưa có lịch công tác"
    actions={
      faults.length > 0 ? (
        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600">{faults.length}</span>
      ) : undefined
    }
  >
    {faults.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        <p className="text-sm font-bold text-slate-700">Không có sự cố chờ phân lịch</p>
        <p className="text-xs text-slate-400">Mọi sự cố đã được giao việc</p>
      </div>
    ) : (
      <ul className="space-y-2.5">
        {faults.slice(0, MAX_ITEMS).map((fault, idx) => {
          const segmentName = segmentNameMap[fault.segment_id || ''] || fault.segment_id || '-'
          return (
            <li key={fault.fault_id || idx} style={{ '--i': idx + 4 } as React.CSSProperties} className="ops-rise">
              <button
                type="button"
                onClick={() => onCreateSchedule(fault)}
                className="group flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left transition-all duration-200 hover:translate-x-1 hover:bg-white hover:shadow-ops-hover cursor-pointer"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-red-50 text-red-600">
                  <AlertTriangle className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold text-slate-900">{fault.pole_id || '-'}</span>
                  <span className="block truncate text-xs text-slate-400">{segmentName}</span>
                </span>
                <CalendarPlus className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-teal-600" />
              </button>
            </li>
          )
        })}
        {faults.length > MAX_ITEMS && (
          <li className="pt-1 text-center text-xs text-slate-400">
            và {faults.length - MAX_ITEMS} sự cố khác trong bảng bên dưới
          </li>
        )}
      </ul>
    )}
  </OpsCard>
)
