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

export const SuperiorMainCharts: React.FC<SuperiorMainChartsProps> = ({
  segmentChartData,
  dataSourceChartData,
  slaData,
  communeName,
}) => {
  const [barDimension, setBarDimension] = useState<'segment' | 'datasource'>('segment')
  const [viewMode, setViewMode] = useState<'count' | 'percent'>('count')

  const baseBarData = barDimension === 'segment' ? segmentChartData : dataSourceChartData

  // Chuẩn hóa dữ liệu theo % nếu ở chế độ xem percent
  const activeBarData = viewMode === 'count'
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

  // Dữ liệu cho biểu đồ Donut SLA: Phản ánh cơ cấu lệnh đã hoàn thành (Đúng hạn vs Trễ hạn) tương ứng tỷ lệ % ở tâm
  const slaPieData = [
    { name: 'Hoàn thành đúng hạn', value: slaData.onTime || 0, color: '#10b981' },
    { name: 'Hoàn thành trễ hạn', value: slaData.late || 0, color: '#f59e0b' },
  ].filter((item) => item.value > 0)

  // Nếu chưa có lệnh nào hoàn thành trong kỳ, hiển thị 1 lát mặc định để donut không bị rỗng
  const displayPieData =
    slaPieData.length > 0
      ? slaPieData
      : [{ name: 'Chưa có lệnh hoàn thành', value: 1, color: '#e2e8f0' }]

  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
      {/* BIỂU ĐỒ 1 (Trái - 7 phần): Stacked Bar Chart Hiện trạng chiếu sáng */}
      <div id="superior-lighting-chart" className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between scroll-mt-6">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">
                Phân Bố Chất Lượng Chiếu Sáng & Độ Phủ Trong Xã
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {barDimension === 'segment'
                  ? `So sánh số lượng cột đèn theo các tuyến đường thuộc ${communeName}`
                  : `Phân chia theo phương thức thu thập dữ liệu tại ${communeName}`}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Chuyển đổi Số lượng (Cột) vs Tỷ lệ (%) */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('count')}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === 'count' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị theo số lượng cột thực tế"
                >
                  Số lượng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('percent')}
                  className={`px-2 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === 'percent' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Hiển thị chuẩn hóa theo tỷ lệ % 100"
                >
                  Tỷ lệ %
                </button>
              </div>

              {/* Chuyển tab Tuyến đường vs Nguồn dữ liệu */}
              <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setBarDimension('segment')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    barDimension === 'segment'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Tuyến ({segmentChartData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setBarDimension('datasource')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    barDimension === 'datasource'
                      ? 'bg-white text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Nguồn
                </button>
              </div>
            </div>
          </div>

          {/* Vùng vẽ biểu đồ Recharts chuẩn chiều cao 260px */}
          <div className="w-full h-65 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeBarData} margin={{ top: 15, right: 15, left: -15, bottom: 20 }}>
                <defs>
                  <linearGradient id="barNormalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="barDimGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="barOutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.9} />
                <XAxis
                  dataKey="shortLabel"
                  tick={{ fontSize: 11.5, fontWeight: 600, fill: '#334155' }}
                  interval={0}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  dy={8}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  unit={viewMode === 'percent' ? '%' : ''}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null
                    const data = payload[0].payload as any
                    const isPct = viewMode === 'percent'
                    const totalPoles = isPct ? data._rawTotal : (data.normal + data.dim + data.out + data.unknown)
                    const normCount = isPct ? data._rawNormal : data.normal
                    const dimCount = isPct ? data._rawDim : data.dim
                    const outCount = isPct ? data._rawOut : data.out

                    return (
                      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-800">
                        <div className="font-bold text-sm border-b border-slate-700/80 pb-1.5 mb-2.5">
                          {data.name}
                        </div>
                        <div className="space-y-1.5 font-medium">
                          <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-emerald-400">
                              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                              Đạt chuẩn:
                            </span>
                            <span className="font-bold font-mono">
                              {normCount} ({totalPoles > 0 ? ((normCount / totalPoles) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-amber-400">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
                              Sáng yếu:
                            </span>
                            <span className="font-bold font-mono">
                              {dimCount} ({totalPoles > 0 ? ((dimCount / totalPoles) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-6">
                            <span className="flex items-center gap-2 text-rose-400">
                              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
                              Mất sáng:
                            </span>
                            <span className="font-bold font-mono">
                              {outCount} ({totalPoles > 0 ? ((outCount / totalPoles) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="border-t border-slate-700/80 pt-2 mt-2 flex justify-between font-bold text-slate-300">
                            <span>Tổng quy mô:</span>
                            <span className="font-mono text-white text-sm">{totalPoles} cột</span>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="normal" name="Đạt chuẩn" stackId="status" fill="url(#barNormalGrad)" maxBarSize={52} />
                <Bar dataKey="dim" name="Sáng yếu" stackId="status" fill="url(#barDimGrad)" maxBarSize={52} />
                <Bar dataKey="out" name="Mất sáng" stackId="status" fill="url(#barOutGrad)" maxBarSize={52} />
                <Bar dataKey="unknown" name="Chưa khảo sát" stackId="status" fill="#cbd5e1" radius={[5, 5, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex items-center justify-center gap-6 pt-3.5 mt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
            <span>Đạt chuẩn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
            <span>Sáng yếu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-500" />
            <span>Mất sáng</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-slate-300" />
            <span>Chưa khảo sát</span>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ 2 (Phải - 5 phần): Đánh giá SLA Sửa chữa Đúng hạn / Trễ hạn của Xã */}
      <div id="superior-sla-chart" className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between scroll-mt-6">
        <div className="flex-1 flex flex-col">
          <div className="mb-4">
            <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">
              Đánh Giá Tuân Thủ SLA Sửa Chữa Đêm
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Tỷ lệ hoàn thành lệnh sửa chữa trước hạn định tại {communeName}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center my-auto min-h-65">
            {/* Vòng Donut SLA to rõ, cân đối */}
            <div className="sm:col-span-5 relative h-52 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={displayPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {displayPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null
                      const item = payload[0]
                      return (
                        <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg font-medium">
                          {item.name}: <strong className="font-bold font-mono text-sm">{item.value} lệnh</strong>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Text trung tâm Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 font-mono leading-none tracking-tight">
                  {slaData.onTimeRate.toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">
                  ĐÚNG HẠN SLA
                </span>
              </div>
            </div>

            {/* Chi tiết 5 chỉ số từ RepairTimelinessRow */}
            <div className="sm:col-span-7 flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Tổng lệnh đã hoàn thành:</span>
                </div>
                <span className="font-mono font-bold text-slate-900 text-sm">{slaData.completed} lệnh</span>
              </div>

              <div className="flex items-center justify-between bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5 font-medium text-emerald-900">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>Hoàn thành đúng hạn:</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 text-sm">{slaData.onTime} lệnh</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span>Hoàn thành trễ hạn:</span>
                </div>
                <span className="font-mono font-bold text-amber-700 text-sm">{slaData.late} lệnh</span>
              </div>

              <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
                <div className="flex items-center gap-2.5 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                  <span>Không gắn hạn định:</span>
                </div>
                <span className="font-mono font-bold text-slate-600 text-sm">{slaData.noDueDate} lệnh</span>
              </div>

              {/* Lệnh đang mở quá hạn (Chưa xong) - Cảnh báo điều hành */}
              <div className="flex items-center justify-between bg-rose-50/90 border border-rose-200/90 rounded-xl px-3 py-2 text-xs shadow-2xs">
                <div className="flex items-center gap-2.5 font-semibold text-rose-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-pulse" />
                  <span>Đang mở quá hạn (chưa xong):</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-rose-700 text-sm">{slaData.openOverdue} lệnh</span>
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md border border-rose-200">
                    Cần đôn đốc
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend bar */}
        <div className="flex items-center justify-center gap-5 pt-3.5 mt-2 border-t border-slate-100 text-xs text-slate-600 font-semibold flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Đúng hạn ({slaData.onTime})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>Trễ hạn ({slaData.late})</span>
          </div>
          {slaData.openOverdue > 0 && (
            <div className="flex items-center gap-2 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Tồn đọng quá hạn ({slaData.openOverdue})</span>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
