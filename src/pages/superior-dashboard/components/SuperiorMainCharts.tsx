import React, { useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts'
import { useChartMotion } from './chartMotion'

export interface FixtureBarItem {
  id: string
  name: string
  shortLabel: string
  normal: number
  dim: number
  out: number
  unknown: number
}

export interface SlaBreakdownData {
  onTimeRate: number
  completed: number
  onTime: number
  late: number
  noDueDate: number
  openOverdue: number
}

interface SuperiorMainChartsProps {
  segmentChartData: FixtureBarItem[]
  dataSourceChartData: FixtureBarItem[]
  slaData: SlaBreakdownData
  communeName: string
}

const CARD =
  'rounded-[20px] border border-[#DCE8F3] bg-white p-5 flex flex-col scroll-mt-6 shadow-[0_8px_24px_-14px_rgba(59,99,133,0.25)]'
const SEGMENTED = 'inline-flex bg-[#EEF4FA] p-1 rounded-xl text-xs shrink-0'
const segBtn = (active: boolean) =>
  `px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
    active ? 'bg-white text-[#3B6385] shadow-xs' : 'text-slate-500 hover:text-slate-800'
  }`

const GREEN = '#7CCBA2'
const AMBER = '#F2C46B'
const ROSE = '#EE8B8B'

export const SuperiorMainCharts: React.FC<SuperiorMainChartsProps> = ({
  segmentChartData,
  dataSourceChartData,
  slaData,
  communeName,
}) => {
  const [barDimension, setBarDimension] = useState<'segment' | 'datasource'>('segment')
  const [viewMode, setViewMode] = useState<'count' | 'percent'>('count')
  const motion = useChartMotion(150, JSON.stringify([barDimension, viewMode, segmentChartData, dataSourceChartData, slaData]))

  const baseBarData = barDimension === 'segment' ? segmentChartData : dataSourceChartData

  // Chuẩn hóa dữ liệu theo % nếu ở chế độ xem percent
  const activeBarData =
    viewMode === 'count'
      ? baseBarData
      : baseBarData.map((item) => {
          const total = item.normal + item.dim + item.out + item.unknown || 1
          return {
            ...item,
            normal: Number(((item.normal / total) * 100).toFixed(1)),
            dim: Number(((item.dim / total) * 100).toFixed(1)),
            out: Number(((item.out / total) * 100).toFixed(1)),
            unknown: Number(((item.unknown / total) * 100).toFixed(1)),
            _rawTotal: total,
            _rawNormal: item.normal,
            _rawDim: item.dim,
            _rawOut: item.out,
          }
        })

  // Cơ cấu lệnh đã hoàn thành (đúng hạn so với trễ hạn), khớp với tỷ lệ % ở tâm vòng
  const slaPieData = [
    { name: 'Hoàn thành đúng hạn', value: slaData.onTime || 0, color: GREEN },
    { name: 'Hoàn thành trễ hạn', value: slaData.late || 0, color: AMBER },
  ].filter((item) => item.value > 0)

  // Chưa có lệnh nào hoàn thành trong kỳ: hiển thị 1 lát mặc định để vòng không rỗng
  const isPlaceholderPie = slaPieData.length === 0
  const displayPieData = isPlaceholderPie
    ? [{ name: 'Chưa có lệnh hoàn thành', value: 1, color: '#E4EFF8' }]
    : slaPieData

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
      {/* Biểu đồ trái (8 phần): hiện trạng chiếu sáng */}
      <div id="superior-lighting-chart" className={`lg:col-span-8 ${CARD}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">Chất lượng chiếu sáng</h3>
            <p className="text-xs text-slate-500 mt-1">
              {barDimension === 'segment'
                ? `Số cột theo từng tuyến đường tại ${communeName}`
                : `Theo cách thu thập dữ liệu tại ${communeName}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className={SEGMENTED}>
              <button type="button" onClick={() => setViewMode('count')} className={segBtn(viewMode === 'count')}>
                Số lượng
              </button>
              <button type="button" onClick={() => setViewMode('percent')} className={segBtn(viewMode === 'percent')}>
                Tỷ lệ %
              </button>
            </div>
            <div className={SEGMENTED}>
              <button
                type="button"
                onClick={() => setBarDimension('segment')}
                className={segBtn(barDimension === 'segment')}
              >
                Theo tuyến ({segmentChartData.length})
              </button>
              <button
                type="button"
                onClick={() => setBarDimension('datasource')}
                className={segBtn(barDimension === 'datasource')}
              >
                Theo nguồn
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-52 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activeBarData} margin={{ top: 10, right: 10, left: -18, bottom: 4 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E4EFF8" />
              <XAxis
                dataKey="shortLabel"
                tick={{ fontSize: 11.5, fontWeight: 600, fill: '#475569' }}
                interval={0}
                tickLine={false}
                axisLine={{ stroke: '#DCE8F3' }}
                dy={6}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                unit={viewMode === 'percent' ? '%' : ''}
              />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: 'rgba(143, 184, 218, 0.12)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload as any
                  const isPct = viewMode === 'percent'
                  const totalPoles = isPct ? data._rawTotal : data.normal + data.dim + data.out + data.unknown
                  const normCount = isPct ? data._rawNormal : data.normal
                  const dimCount = isPct ? data._rawDim : data.dim
                  const outCount = isPct ? data._rawOut : data.out
                  const share = (n: number) => (totalPoles > 0 ? ((n / totalPoles) * 100).toFixed(1) : 0)

                  return (
                    <div className="bg-white text-slate-800 border border-[#DCE8F3] shadow-[0_12px_28px_-12px_rgba(59,99,133,0.35)] p-3 rounded-xl text-xs">
                      <div className="font-bold text-sm border-b border-[#E4EFF8] pb-1.5 mb-2">{data.name}</div>
                      <div className="space-y-1.5 font-medium">
                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: GREEN }} />
                            Đạt chuẩn
                          </span>
                          <span className="font-bold font-mono">
                            {normCount} ({share(normCount)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: AMBER }} />
                            Sáng yếu
                          </span>
                          <span className="font-bold font-mono">
                            {dimCount} ({share(dimCount)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-6">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: ROSE }} />
                            Mất sáng
                          </span>
                          <span className="font-bold font-mono">
                            {outCount} ({share(outCount)}%)
                          </span>
                        </div>
                        <div className="border-t border-[#E4EFF8] pt-2 mt-2 flex justify-between font-bold">
                          <span>Tổng quy mô</span>
                          <span className="font-mono">{totalPoles} cột</span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar {...motion} dataKey="normal" name="Đạt chuẩn" stackId="status" fill={GREEN} maxBarSize={48} />
              <Bar {...motion} dataKey="dim" name="Sáng yếu" stackId="status" fill={AMBER} maxBarSize={48} />
              <Bar {...motion} dataKey="out" name="Mất sáng" stackId="status" fill={ROSE} maxBarSize={48} />
              <Bar
                {...motion}
                dataKey="unknown"
                name="Chưa khảo sát"
                stackId="status"
                fill="#CBD5E1"
                radius={[5, 5, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-center gap-5 pt-3 mt-1 border-t border-[#E4EFF8] text-xs text-slate-600 font-semibold flex-wrap">
          {[
            { label: 'Đạt chuẩn', color: GREEN },
            { label: 'Sáng yếu', color: AMBER },
            { label: 'Mất sáng', color: ROSE },
            { label: 'Chưa khảo sát', color: '#CBD5E1' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Biểu đồ phải (4 phần): SLA sửa chữa */}
      <div id="superior-sla-chart" className={`lg:col-span-4 ${CARD}`}>
        <div>
          <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">Tuân thủ SLA sửa chữa</h3>
          <p className="text-xs text-slate-500 mt-1">Lệnh sửa chữa hoàn thành trước hạn tại {communeName}</p>
        </div>

        <div className="relative h-36 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                {...motion}
                data={displayPieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={66}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {displayPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload }) => {
                  if (isPlaceholderPie || !active || !payload || !payload.length) return null
                  const item = payload[0]
                  return (
                    <div className="bg-white text-slate-800 border border-[#DCE8F3] shadow-[0_12px_28px_-12px_rgba(59,99,133,0.35)] text-xs px-3 py-1.5 rounded-xl font-medium">
                      {item.name}: <strong className="font-bold font-mono text-sm">{item.value} lệnh</strong>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">
              {slaData.completed === 0 ? '-' : `${slaData.onTimeRate.toFixed(1)}%`}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 mt-1">đúng hạn</span>
          </div>
        </div>

        <div className="mt-3 space-y-2 text-[13px]">
          <div className="flex items-center justify-between rounded-xl bg-[#EEF7F2] px-3 py-2">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GREEN }} />
              Đúng hạn
            </span>
            <span className="font-bold tabular-nums text-slate-900">{slaData.onTime} lệnh</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FDF6E7] px-3 py-2">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AMBER }} />
              Trễ hạn
            </span>
            <span className="font-bold tabular-nums text-slate-900">{slaData.late} lệnh</span>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-[#FDECEC] px-3 py-2">
            <span className="flex items-center gap-2 font-semibold text-rose-700 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: ROSE }} />
              Đang mở quá hạn
            </span>
            <span className="font-bold tabular-nums text-rose-600 whitespace-nowrap">{slaData.openOverdue} lệnh</span>
          </div>
        </div>

        <p className="mt-3 text-[11.5px] text-slate-500">
          Tổng {slaData.completed} lệnh đã hoàn thành · {slaData.noDueDate} lệnh không gắn hạn định
        </p>
      </div>
    </section>
  )
}
