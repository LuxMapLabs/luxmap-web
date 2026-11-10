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
  Legend,
  CartesianGrid,
} from 'recharts'

export interface FaultChannelData {
  channelData: { name: string; value: number; color: string }[]
  typeData: { name: string; value: number; color: string }[]
  aiPct: number
  iotPct: number
  citizenPct: number
}

export interface WarrantyChartData {
  statusData: { name: string; value: number; color: string }[]
  fixtureTypeData: { name: string; value: number; color: string }[]
  activeCount: number
  expiringCount: number
  expiredCount: number
}

export interface WorkOrderChartData {
  woByKindData: {
    kind: string
    completed: number
    inProgress: number
    pending: number
  }[]
  citizenBySegmentData: {
    segment: string
    confirmed: number
    merged: number
    rejected: number
  }[]
  totalAccepted: number
  totalExecuting: number
  citizenResolutionRate: number
}

interface SuperiorSubChartsProps {
  faultData: FaultChannelData
  warrantyData: WarrantyChartData
  workOrderData: WorkOrderChartData
}

export const SuperiorSubCharts: React.FC<SuperiorSubChartsProps> = ({
  faultData,
  warrantyData,
  workOrderData,
}) => {
  // Tabs state
  const [faultMode, setFaultMode] = useState<'channel' | 'type'>('channel')
  const [warrantyMode, setWarrantyMode] = useState<'status' | 'fixture'>('status')
  const [workMode, setWorkMode] = useState<'workorders' | 'citizen'>('workorders')

  const activeFaultData = faultMode === 'channel' ? faultData.channelData : faultData.typeData
  const activeWarrantyData = warrantyMode === 'status' ? warrantyData.statusData : warrantyData.fixtureTypeData

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
      {/* BIỂU ĐỒ 3: Kênh phát hiện & Loại sự cố */}
      <div id="superior-faults-chart" className="bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between scroll-mt-6">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Phân Tích Sự Cố & Kênh Báo Lỗi
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Đánh giá tỷ lệ phát hiện giữa Camera AI, IoT và Dân báo
              </p>
            </div>

            <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setFaultMode('channel')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  faultMode === 'channel' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kênh
              </button>
              <button
                type="button"
                onClick={() => setFaultMode('type')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  faultMode === 'type' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Loại lỗi
              </button>
            </div>
          </div>

          {/* Biểu đồ thanh ngang Recharts chuẩn chiều cao 220px */}
          <div className="w-full h-55 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={activeFaultData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11.5, fontWeight: 600, fill: '#334155' }}
                  width={130}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: any) => [`${val} sự cố`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {activeFaultData.map((entry, index) => (
                    <Cell key={`fault-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 Thẻ thống kê mini bên dưới */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 mt-2 text-center">
          <div>
            <div className="text-base font-black font-mono text-blue-600">{faultData.aiPct}%</div>
            <div className="text-[11px] font-semibold text-slate-500">Camera AI Quét</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-indigo-600">{faultData.iotPct}%</div>
            <div className="text-[11px] font-semibold text-slate-500">Node IoT / Tủ</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-emerald-600">{faultData.citizenPct}%</div>
            <div className="text-[11px] font-semibold text-slate-500">Dân báo QR</div>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ 4: Vòng đời bảo hành & Chủng loại đèn */}
      <div id="superior-warranty-chart" className="bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between scroll-mt-6">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Vòng Đời Bảo Hành & Chủng Loại Đèn
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Cơ sở lập dự toán kinh phí thay thế thiết bị định kỳ
              </p>
            </div>

            <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setWarrantyMode('status')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  warrantyMode === 'status' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hạn BH
              </button>
              <button
                type="button"
                onClick={() => setWarrantyMode('fixture')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  warrantyMode === 'fixture' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Loại bóng
              </button>
            </div>
          </div>

          {/* Donut Chart Recharts chuẩn chiều cao 220px */}
          <div className="w-full h-55 my-auto flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activeWarrantyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={74}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {activeWarrantyData.map((entry, index) => (
                    <Cell key={`w-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} bóng`, 'Số lượng']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconSize={9}
                  formatter={(value) => <span className="text-[11px] font-semibold text-slate-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 Thẻ thống kê mini bên dưới */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 mt-2 text-center">
          <div>
            <div className="text-base font-black font-mono text-emerald-600">{warrantyData.activeCount}</div>
            <div className="text-[11px] font-semibold text-slate-500">Còn hạn (&gt;90 ngày)</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-amber-600">{warrantyData.expiringCount}</div>
            <div className="text-[11px] font-semibold text-slate-500">Sắp hết (≤90 ngày)</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-rose-600">{warrantyData.expiredCount}</div>
            <div className="text-[11px] font-semibold text-slate-500">Đã hết bảo hành</div>
          </div>
        </div>
      </div>

      {/* BIỂU ĐỒ 5: Cơ cấu lệnh công tác & Phản ánh QR */}
      <div id="superior-workorder-chart" className="bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 sm:p-6 flex flex-col justify-between scroll-mt-6">
        <div className="flex-1 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Lệnh Công Tác & Phản Ánh Dân
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-0.5">
                Tiến độ thực thi nhiệm vụ & giải quyết phản ánh QR
              </p>
            </div>

            <div className="inline-flex bg-slate-100/90 p-1 rounded-xl border border-slate-200/60 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setWorkMode('workorders')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  workMode === 'workorders' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lệnh việc
              </button>
              <button
                type="button"
                onClick={() => setWorkMode('citizen')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  workMode === 'citizen' ? 'bg-white text-teal-700 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Phản ánh QR
              </button>
            </div>
          </div>

          {/* Stacked Bar Chart Recharts chuẩn chiều cao 220px */}
          <div className="w-full h-55 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              {workMode === 'workorders' ? (
                <BarChart data={workOrderData.woByKindData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
                  <XAxis dataKey="kind" tick={{ fontSize: 11.5, fontWeight: 600, fill: '#334155' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                  />
                  <Bar dataKey="completed" name="Đã nghiệm thu" stackId="wo" fill="#10b981" maxBarSize={36} />
                  <Bar dataKey="inProgress" name="Đang thực hiện" stackId="wo" fill="#0ea5e9" maxBarSize={36} />
                  <Bar dataKey="pending" name="Chờ duyệt / Mở" stackId="wo" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              ) : (
                <BarChart data={workOrderData.citizenBySegmentData} margin={{ top: 15, right: 15, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" strokeOpacity={0.8} />
                  <XAxis dataKey="segment" tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '10px', border: 'none', color: '#fff', fontSize: '12px', padding: '8px 12px' }}
                  />
                  <Bar dataKey="confirmed" name="Đã duyệt tạo lỗi" stackId="cr" fill="#10b981" maxBarSize={36} />
                  <Bar dataKey="merged" name="Gộp vào lỗi sẵn" stackId="cr" fill="#0ea5e9" maxBarSize={36} />
                  <Bar dataKey="rejected" name="Từ chối / Trùng" stackId="cr" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3 Thẻ thống kê mini bên dưới */}
        <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3.5 mt-2 text-center">
          <div>
            <div className="text-base font-black font-mono text-emerald-600">{workOrderData.totalAccepted}</div>
            <div className="text-[11px] font-semibold text-slate-500">Đã nghiệm thu</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-teal-600">{workOrderData.totalExecuting}</div>
            <div className="text-[11px] font-semibold text-slate-500">Đang thực hiện</div>
          </div>
          <div>
            <div className="text-base font-black font-mono text-amber-600">{workOrderData.citizenResolutionRate}%</div>
            <div className="text-[11px] font-semibold text-slate-500">Tỷ lệ xử lý QR dân</div>
          </div>
        </div>
      </div>
    </section>
  )
}
