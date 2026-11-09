import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import { OpsCard } from '../../../components/ops/OpsCard'

interface BarChartItem {
  name: string
  fullName: string
  normal: number
  dim: number
  out: number
}

interface DonutChartItem {
  name: string
  value: number
  color: string
}

interface LightingStatusCardProps {
  barChartData: BarChartItem[]
  donutChartData: DonutChartItem[]
  selectedSegment: string
  segmentNameMap: Record<string, string>
  totalPoles: number
}

const SEGMENT_PARTS: { key: 'normal' | 'dim' | 'out'; label: string; color: string }[] = [
  { key: 'normal', label: 'Bình thường', color: '#10b981' },
  { key: 'dim', label: 'Sáng yếu', color: '#f59e0b' },
  { key: 'out', label: 'Mất sáng', color: '#ef4444' },
]

// Thẻ gộp: biểu đồ tròn cơ cấu toàn mạng + thanh phân bố theo từng tuyến
export const LightingStatusCard: React.FC<LightingStatusCardProps> = ({
  barChartData,
  donutChartData,
  selectedSegment,
  segmentNameMap,
  totalPoles,
}) => {
  const hasData = totalPoles > 0

  return (
    <OpsCard
      index={2}
      title="Tình trạng chiếu sáng"
      description={
        selectedSegment === 'all'
          ? 'Kết quả đo rọi AI ban đêm, toàn mạng lưới và từng tuyến'
          : `Kết quả đo rọi AI ban đêm trên ${segmentNameMap[selectedSegment] || selectedSegment}`
      }
      actions={
        <span className="text-xs font-semibold text-slate-600 bg-[#f8fafc] px-3 py-1 rounded-lg border border-[#e2e8f0]">
          <strong className="text-slate-900 tabular-nums">{totalPoles}</strong> cột đèn
        </span>
      }
    >
      {hasData ? (
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 items-center">
          <div>
            <div className="relative h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    animationDuration={1100}
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`donut-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value ?? 0} cột đèn`, String(name ?? '')]}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800 leading-none tabular-nums">{totalPoles}</span>
                <span className="text-[11px] font-medium text-slate-500 mt-1">cột đèn</span>
              </div>
            </div>
            <ul className="mt-2 space-y-1.5">
              {donutChartData.map((item) => (
                <li key={item.name} className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                  <span className="ml-auto font-semibold text-slate-800 tabular-nums">
                    {item.value}{' '}
                    <span className="font-normal text-slate-500">
                      ({((item.value / totalPoles) * 100).toFixed(0)}%)
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <ul className="space-y-4">
            {barChartData.map((seg, idx) => {
              const total = seg.normal + seg.dim + seg.out
              return (
                <li key={seg.name} className="group cursor-default">
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-sm font-semibold text-slate-800 truncate transition-colors group-hover:text-teal-700">
                      {seg.fullName}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums shrink-0">
                      {total} cột
                      {seg.out > 0 && <span className="text-red-600 font-semibold"> · {seg.out} mất sáng</span>}
                      {seg.dim > 0 && <span className="text-amber-600 font-semibold"> · {seg.dim} sáng yếu</span>}
                    </span>
                  </div>
                  <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#eaeff4] transition-all duration-200 group-hover:h-3.5">
                    {SEGMENT_PARTS.map((part) => {
                      const n = seg[part.key]
                      if (n <= 0 || total <= 0) return null
                      return (
                        <span
                          key={part.key}
                          title={`${part.label}: ${n} cột`}
                          style={{
                            width: `${(n / total) * 100}%`,
                            backgroundColor: part.color,
                            '--i': idx + 2,
                          } as React.CSSProperties}
                          className="ops-grow ops-shine block h-full"
                        />
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <p className="py-10 text-center text-xs text-slate-500">Chưa có dữ liệu cột đèn trên phạm vi đang chọn</p>
      )}
    </OpsCard>
  )
}
