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
import { useChartMotion } from './chartMotion'

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
  citizenResolutionRate: number | null
}

export type DetailTab = 'faults' | 'warranty' | 'work'

interface SuperiorSubChartsProps {
  faultData: FaultChannelData
  warrantyData: WarrantyChartData
  workOrderData: WorkOrderChartData
  activeTab: DetailTab
  onChangeTab: (tab: DetailTab) => void
}

const SEGMENTED = 'inline-flex bg-[#EEF4FA] p-1 rounded-xl text-xs shrink-0'
const segBtn = (active: boolean) =>
  `px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
    active ? 'bg-white text-[#3B6385] shadow-xs' : 'text-slate-500 hover:text-slate-800'
  }`

const TOOLTIP_STYLE = {
  backgroundColor: '#fff',
  border: '1px solid #DCE8F3',
  borderRadius: '10px',
  color: '#1E293B',
  fontSize: '12px',
  padding: '8px 12px',
  boxShadow: '0 12px 28px -12px rgba(59, 99, 133, 0.35)',
}
// Ép màu chữ tooltip thay vì dùng màu mặc định của recharts
const TOOLTIP_TEXT_STYLE = { color: '#1E293B' }
const AXIS_TICK = { fontSize: 11, fill: '#94A3B8' }
const LABEL_TICK = { fontSize: 11.5, fontWeight: 600, fill: '#475569' }

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'faults', label: 'Sự cố & kênh báo lỗi' },
  { id: 'warranty', label: 'Bảo hành & loại đèn' },
  { id: 'work', label: 'Lệnh việc & phản ánh' },
]

// Một ô số liệu tóm tắt dưới biểu đồ
const Stat: React.FC<{ value: React.ReactNode; label: string; color: string }> = ({ value, label, color }) => (
  <div className="text-center">
    <div className="text-lg font-extrabold tabular-nums" style={{ color }}>
      {value}
    </div>
    <div className="text-[11.5px] font-medium text-slate-500">{label}</div>
  </div>
)

// Biểu đồ không có số liệu: báo rõ thay vì để trục trống
const EmptyChart: React.FC = () => (
  <div className="flex h-full items-center justify-center text-xs font-medium text-slate-400">
    Chưa có dữ liệu trong khoảng thời gian đã chọn
  </div>
)

export const SuperiorSubCharts: React.FC<SuperiorSubChartsProps> = ({
  faultData,
  warrantyData,
  workOrderData,
  activeTab,
  onChangeTab,
}) => {
  const [faultMode, setFaultMode] = useState<'channel' | 'type'>('channel')
  const [warrantyMode, setWarrantyMode] = useState<'status' | 'fixture'>('status')
  const [workMode, setWorkMode] = useState<'workorders' | 'citizen'>('workorders')
  const motion = useChartMotion(350, JSON.stringify([activeTab, faultMode, warrantyMode, workMode, faultData, warrantyData, workOrderData]))

  const activeFaultData = faultMode === 'channel' ? faultData.channelData : faultData.typeData
  const activeWarrantyData = warrantyMode === 'status' ? warrantyData.statusData : warrantyData.fixtureTypeData
  const faultTotal = activeFaultData.reduce((sum, d) => sum + d.value, 0)
  const warrantyTotal = activeWarrantyData.reduce((sum, d) => sum + d.value, 0)
  const workTotal =
    workMode === 'workorders'
      ? workOrderData.woByKindData.reduce((sum, d) => sum + d.completed + d.inProgress + d.pending, 0)
      : workOrderData.citizenBySegmentData.reduce((sum, d) => sum + d.confirmed + d.merged + d.rejected, 0)

  return (
    <section
      id="superior-detail-chart"
      className="rounded-[20px] border border-[#DCE8F3] bg-white p-5 scroll-mt-6 shadow-[0_8px_24px_-14px_rgba(59,99,133,0.25)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[15px] font-extrabold text-slate-900 leading-tight">Phân tích chi tiết</h3>
        <div className={`${SEGMENTED} max-w-full overflow-x-auto`} role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={segBtn(activeTab === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'faults' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {faultMode === 'channel' ? 'Sự cố đang ghi nhận theo kênh phát hiện' : 'Sự cố đang ghi nhận theo loại lỗi'}
            </p>
            <div className={SEGMENTED}>
              <button type="button" onClick={() => setFaultMode('channel')} className={segBtn(faultMode === 'channel')}>
                Kênh
              </button>
              <button type="button" onClick={() => setFaultMode('type')} className={segBtn(faultMode === 'type')}>
                Loại lỗi
              </button>
            </div>
          </div>
          <div className="w-full h-48 mt-2">
            {faultTotal === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={activeFaultData} margin={{ top: 8, right: 20, left: 10, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={LABEL_TICK} width={140} axisLine={false} tickLine={false} />
                <Tooltip
                isAnimationActive={false}
                  cursor={{ fill: 'rgba(143, 184, 218, 0.12)' }}
                  formatter={(val: any) => [`${val} sự cố`, 'Số lượng']}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_TEXT_STYLE}
                  labelStyle={TOOLTIP_TEXT_STYLE}
                />
                <Bar {...motion} dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                  {activeFaultData.map((entry, index) => (
                    <Cell key={`fault-cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-[#E4EFF8] pt-3">
            {activeFaultData.map((d) => (
              <Stat
                key={d.name}
                value={faultTotal === 0 ? '-' : `${Math.round((d.value / faultTotal) * 100)}%`}
                label={d.name}
                color="#3B6385"
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'warranty' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Cơ sở lập dự toán thay thế thiết bị định kỳ</p>
            <div className={SEGMENTED}>
              <button
                type="button"
                onClick={() => setWarrantyMode('status')}
                className={segBtn(warrantyMode === 'status')}
              >
                Hạn bảo hành
              </button>
              <button
                type="button"
                onClick={() => setWarrantyMode('fixture')}
                className={segBtn(warrantyMode === 'fixture')}
              >
                Loại bóng
              </button>
            </div>
          </div>
          <div className="w-full h-48 mt-2">
            {warrantyTotal === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  {...motion}
                  data={activeWarrantyData}
                  cx="40%"
                  cy="50%"
                  innerRadius={44}
                  outerRadius={66}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {activeWarrantyData.map((entry, index) => (
                    <Cell key={`w-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip isAnimationActive={false} formatter={(val: any) => [`${val} bóng`, 'Số lượng']} contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_TEXT_STYLE}
                  labelStyle={TOOLTIP_TEXT_STYLE} />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconSize={9}
                  formatter={(value) => (
                    <span className="text-xs font-medium text-slate-600">
                      {value} · <strong className="text-slate-800">{activeWarrantyData.find((d) => d.name === value)?.value ?? 0}</strong>
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[#E4EFF8] pt-3">
            <Stat value={warrantyData.activeCount} label="Còn hạn (>90 ngày)" color="#3FA57A" />
            <Stat value={warrantyData.expiringCount} label="Sắp hết (≤90 ngày)" color="#C98A1B" />
            <Stat value={warrantyData.expiredCount} label="Đã hết bảo hành" color="#D95F5F" />
          </div>
        </div>
      )}

      {activeTab === 'work' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">Tiến độ thực hiện nhiệm vụ và giải quyết phản ánh QR</p>
            <div className={SEGMENTED}>
              <button type="button" onClick={() => setWorkMode('workorders')} className={segBtn(workMode === 'workorders')}>
                Lệnh việc
              </button>
              <button type="button" onClick={() => setWorkMode('citizen')} className={segBtn(workMode === 'citizen')}>
                Phản ánh QR
              </button>
            </div>
          </div>
          <div className="w-full h-48 mt-2">
            {workTotal === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              {workMode === 'workorders' ? (
                <BarChart data={workOrderData.woByKindData} margin={{ top: 10, right: 10, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E4EFF8" />
                  <XAxis dataKey="kind" tick={LABEL_TICK} tickLine={false} axisLine={{ stroke: '#DCE8F3' }} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip isAnimationActive={false} cursor={{ fill: 'rgba(143, 184, 218, 0.12)' }} contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_TEXT_STYLE}
                  labelStyle={TOOLTIP_TEXT_STYLE} />
                  <Bar {...motion} dataKey="completed" name="Đã nghiệm thu" stackId="wo" fill="#7CCBA2" maxBarSize={44} />
                  <Bar {...motion} dataKey="inProgress" name="Đang thực hiện" stackId="wo" fill="#8FB8DA" maxBarSize={44} />
                  <Bar {...motion} dataKey="pending" name="Chờ duyệt / mở" stackId="wo" fill="#F2C46B" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              ) : (
                <BarChart data={workOrderData.citizenBySegmentData} margin={{ top: 10, right: 10, left: -20, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#E4EFF8" />
                  <XAxis dataKey="segment" tick={LABEL_TICK} tickLine={false} axisLine={{ stroke: '#DCE8F3' }} />
                  <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
                  <Tooltip isAnimationActive={false} cursor={{ fill: 'rgba(143, 184, 218, 0.12)' }} contentStyle={TOOLTIP_STYLE}
                  itemStyle={TOOLTIP_TEXT_STYLE}
                  labelStyle={TOOLTIP_TEXT_STYLE} />
                  <Bar {...motion} dataKey="confirmed" name="Đã duyệt tạo lỗi" stackId="cr" fill="#7CCBA2" maxBarSize={44} />
                  <Bar {...motion} dataKey="merged" name="Gộp vào lỗi sẵn" stackId="cr" fill="#8FB8DA" maxBarSize={44} />
                  <Bar {...motion} dataKey="rejected" name="Từ chối / trùng" stackId="cr" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={44} />
                </BarChart>
              )}
            </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-[#E4EFF8] pt-3">
            <Stat value={workOrderData.totalAccepted} label="Đã nghiệm thu" color="#3FA57A" />
            <Stat value={workOrderData.totalExecuting} label="Đang thực hiện" color="#4A7AA3" />
            <Stat value={workOrderData.citizenResolutionRate == null ? '-' : `${workOrderData.citizenResolutionRate}%`} label="Tỷ lệ xử lý QR dân" color="#C98A1B" />
          </div>
        </div>
      )}
    </section>
  )
}
