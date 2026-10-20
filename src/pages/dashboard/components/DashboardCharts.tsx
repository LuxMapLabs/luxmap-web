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
} from 'recharts'
import { PieChart as PieChartIcon, X } from 'lucide-react'

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
  const [showDonutModal, setShowDonutModal] = useState<boolean>(false)

  // Độ rộng biểu đồ: Nếu nhiều hơn 7 tuyến thì mở rộng để cuộn ngang mượt mà (~65px mỗi cột)
  const isMultiSegments = barChartData.length > 7
  const chartMinWidth = isMultiSegments ? `${Math.max(750, barChartData.length * 65)}px` : '100%'

  return (
    <>
      {/* THẺ BIỂU ĐỒ FULL WIDTH HÀNG NGANG */}
      <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col">
        {/* Header của thẻ Bar Chart */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Nút mở Popup xem cơ cấu chiếu sáng ở góc trên bên trái */}
            <button
              type="button"
              onClick={() => setShowDonutModal(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 border border-emerald-200/80 cursor-pointer shadow-xs active:scale-95"
              title="Nhấn để mở biểu đồ tròn cơ cấu chiếu sáng địa bàn"
            >
              <PieChartIcon className="w-4 h-4 text-emerald-600" />
              <span>Xem cơ cấu chiếu sáng</span>
            </button>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {selectedSegment === 'all'
                  ? 'Phân Bố Chiếu Sáng Tuyến Đường Tác Nghiệp'
                  : `Chi Tiết Chiếu Sáng: ${segmentNameMap[selectedSegment] || selectedSegment}`}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedSegment === 'all'
                  ? 'Hiện trạng hoạt động của các cột đèn trên các tuyến đường'
                  : `Thống kê tình trạng hoạt động trên ${segmentNameMap[selectedSegment] || selectedSegment}`}
              </p>
            </div>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200/80">
            Tổng quy mô: <strong className="text-slate-800">{totalPoles}</strong> cột đèn
          </div>
        </div>

        {/* Khung Biểu đồ Bar Chart có thanh cuộn ngang khi số tuyến nhiều */}
        <div className="w-full overflow-x-auto custom-scrollbar pb-1">
          <div style={{ minWidth: chartMinWidth, height: 270 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barChartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: -15,
                  bottom: isMultiSegments ? 35 : 10,
                }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  interval={0}
                  angle={isMultiSegments ? -35 : 0}
                  textAnchor={isMultiSegments ? 'end' : 'middle'}
                  height={isMultiSegments ? 60 : 30}
                  tickFormatter={(value) => {
                    const str = String(value)
                    return str.length > 16 ? `${str.slice(0, 14)}...` : str
                  }}
                />
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
                <Bar dataKey="normal" stackId="a" fill="#10b981" name="normal" radius={[0, 0, 0, 0]} />
                <Bar dataKey="dim" stackId="a" fill="#f59e0b" name="dim" radius={[0, 0, 0, 0]} />
                <Bar dataKey="out" stackId="a" fill="#ef4444" name="out" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DÒNG CHÚ THÍCH MÀU SẮC CỐ ĐỊNH (Đã đưa ra ngoài để không bị chạy theo thanh cuộn ngang) */}
        <div className="flex items-center justify-center gap-6 py-2 border-t border-slate-100 text-xs font-medium text-slate-600 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#10b981]" />
            <span>Đạt chuẩn (Bình thường)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#f59e0b]" />
            <span>Sáng yếu (Quang thông giảm)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-xs bg-[#ef4444]" />
            <span>Mất sáng hoàn toàn (Tắt)</span>
          </div>
        </div>

        {/* HÀNG CÁC CHỈ SỐ % VÀ SỐ LƯỢNG NẰM DƯỚI CÙNG THẺ CHART */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-slate-100 pt-3 mt-0.5">
          {donutChartData.map((item, idx) => (
            <div key={idx} className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs font-semibold text-slate-600 truncate">{item.name}</span>
              </div>
              <div className="text-sm font-extrabold text-slate-800">
                {item.value}{' '}
                <span className="text-xs font-medium text-slate-500">
                  ({totalPoles > 0 ? ((item.value / totalPoles) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL POPUP XEM CƠ CẤU CHIẾU SÁNG (DONUT CHART) */}
      {showDonutModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setShowDonutModal(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Popup */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Cơ Cấu Chiếu Sáng Địa Bàn</h3>
                <p className="text-xs text-slate-500">
                  {selectedSegment === 'all'
                    ? 'Tỷ lệ toàn mạng lưới theo kết quả đo rọi AI ban đêm'
                    : `Tỷ lệ trên tuyến: ${segmentNameMap[selectedSegment] || selectedSegment}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDonutModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng popup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Popup: Donut Chart sắc nét */}
            <div className="h-64 w-full relative flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={96}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutChartData.map((entry, index) => (
                      <Cell key={`modal-cell-${index}`} fill={entry.color} />
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
                <span className="text-3xl font-extrabold text-slate-800 leading-none">{totalPoles}</span>
                <span className="text-xs font-semibold text-slate-400 mt-1">Cột đèn</span>
              </div>
            </div>

            {/* Footer Popup: Chú thích 3 chỉ số */}
            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 mt-2">
              {donutChartData.map((item, idx) => (
                <div key={idx} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-xs font-medium text-slate-600 truncate">{item.name}</span>
                  </div>
                  <div className="text-sm font-bold text-slate-800">
                    {item.value}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      ({totalPoles > 0 ? ((item.value / totalPoles) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

