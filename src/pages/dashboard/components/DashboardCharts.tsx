import React from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

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

interface DashboardChartsProps {
  barChartData: BarChartItem[]
  donutChartData: DonutChartItem[]
  selectedSegment: string
  segmentNameMap: Record<string, string>
  totalPoles: number
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  barChartData,
  donutChartData,
  selectedSegment,
  segmentNameMap,
  totalPoles,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Biểu đồ 1: Stacked Bar Chart theo tuyến */}
      <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
        <div className="mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {selectedSegment === 'all'
                ? 'Phân Bố Chiếu Sáng Tuyến Đường Tác Nghiệp'
                : `Chi Tiết Chiếu Sáng: ${segmentNameMap[selectedSegment] || selectedSegment}`}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedSegment === 'all'
                ? 'Hiện trạng hoạt động của các cột đèn trên 3 tuyến đường chính'
                : `Thống kê tình trạng hoạt động trên ${segmentNameMap[selectedSegment] || selectedSegment}`}
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569', fontWeight: 600 }} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                labelFormatter={(label) => {
                  const item = barChartData.find((d) => d.name === label)
                  return item?.fullName || String(label)
                }}
                formatter={(value: any, name: any) => {
                  const labelMap: Record<string, string> = {
                    normal: 'Đạt chuẩn (Bình thường)',
                    dim: 'Sáng yếu (Quang thông giảm)',
                    out: 'Mất sáng hoàn toàn (Tắt)',
                  }
                  return [`${value} cột đèn`, labelMap[String(name)] || String(name)]
                }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value) => {
                  const labelMap: Record<string, string> = {
                    normal: 'Đạt chuẩn (Bình thường)',
                    dim: 'Sáng yếu (Quang thông giảm)',
                    out: 'Mất sáng hoàn toàn (Tắt)',
                  }
                  return <span className="text-xs text-slate-600 font-medium">{labelMap[value] || value}</span>
                }}
              />
              <Bar dataKey="normal" stackId="a" fill="#10b981" name="normal" radius={[0, 0, 0, 0]} />
              <Bar dataKey="dim" stackId="a" fill="#f59e0b" name="dim" radius={[0, 0, 0, 0]} />
              <Bar dataKey="out" stackId="a" fill="#ef4444" name="out" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Biểu đồ 2: Donut Chart cơ cấu chiếu sáng */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div className="mb-2">
          <h3 className="text-sm font-bold text-slate-900">Cơ Cấu Chiếu Sáng Địa Bàn</h3>
          <p className="text-xs text-slate-500">Tỷ lệ theo kết quả đo rọi AI ban đêm</p>
        </div>

        <div className="h-56 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={donutChartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={88}
                paddingAngle={4}
                dataKey="value"
              >
                {donutChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, name: any) => [`${value} cột đèn`, name]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Tâm Donut hiển thị tổng số cột */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-800 leading-none">{totalPoles}</span>
            <span className="text-[11px] font-semibold text-slate-400 mt-0.5">Cột đèn</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
          {donutChartData.map((item, idx) => (
            <div key={idx} className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] font-medium text-slate-600 truncate">{item.name}</span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {item.value} <span className="text-[10px] font-normal text-slate-400">({totalPoles > 0 ? ((item.value / totalPoles) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
