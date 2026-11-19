import React, { useMemo, useState, useEffect } from 'react'
import { Cpu } from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { OpsCard } from '../../../components/ops/OpsCard'
import type { IotDiagnosticSummaryItem } from '../../../types/iot/diagnostics'
import type { IotServerStatus } from '../../../types/iot/servers'
import type { IotFeederAverage } from '../../../types/iot/feeders'
import {
  IOT_DIAGNOSTIC_STATUS,
  IOT_TONE_CLASS,
  iotAnomalyLabel,
  iotStatusBadge,
} from '../../../constants/iot'
import {
  ELECTRICAL_METRICS,
  ELECTRICAL_METRIC_KEYS,
  formatMetric,
  type ElectricalMetric,
} from '../../../utils/iot/electricalSeries'

interface IotDiagnosticsCardProps {
  summary: IotDiagnosticSummaryItem[]
  servers: IotServerStatus[]
  feederHistory: IotFeederAverage[]
  historyLoading?: boolean
  onSelectFeeder: (feederId: string) => void
  iotLastUpdated: string | null
  loading?: boolean
}

const CHART_GROUPS = [
  { key: 'normal', name: 'Bình thường', color: '#10b981' },
  { key: 'anomaly', name: 'Có cảnh báo', color: '#f43f5e' },
  { key: 'stale', name: 'Mất tín hiệu', color: '#f59e0b' },
  { key: 'nodata', name: 'Chưa có dữ liệu', color: '#cbd5e1' },
] as const

export const IotDiagnosticsCard: React.FC<IotDiagnosticsCardProps> = ({
  summary,
  servers,
  feederHistory,
  historyLoading: seriesLoading = false,
  onSelectFeeder,
  iotLastUpdated,
  loading = false,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null)
  const [metric, setMetric] = useState<ElectricalMetric>('power')

  // Ưu tiên xếp các node đang lỗi / quá hạn lên đầu để Quản lý thấy ngay
  const sortedNodes = useMemo(() => {
    const rank = (st?: string | null) =>
      st === 'anomaly' ? 0 : st === 'stale' ? 1 : st === 'normal' ? 2 : 3
    return [...summary].sort((a, b) => rank(a.diagnostic_status) - rank(b.diagnostic_status))
  }, [summary])

  const [selectedNodeId, setSelectedNodeId] = useState<string>('')

  useEffect(() => {
    if (sortedNodes.length === 0) {
      setSelectedNodeId('')
      return
    }
    const stillExists = sortedNodes.some((n) => n.node_id === selectedNodeId)
    if (!stillExists) {
      setSelectedNodeId(sortedNodes[0]?.node_id || '')
    }
  }, [sortedNodes, selectedNodeId])

  const selectedNode = useMemo(
    () => sortedNodes.find((n) => n.node_id === selectedNodeId) || sortedNodes[0] || null,
    [sortedNodes, selectedNodeId]
  )

  useEffect(() => {
    if (selectedNode?.feeder_id) {
      onSelectFeeder(selectedNode.feeder_id)
    }
  }, [selectedNode?.feeder_id, onSelectFeeder])

  const donutData = useMemo(() => {
    const counts = { normal: 0, anomaly: 0, stale: 0, nodata: 0 }
    summary.forEach((item) => {
      if (item.diagnostic_status === 'normal') counts.normal++
      else if (item.diagnostic_status === 'anomaly') counts.anomaly++
      else if (item.diagnostic_status === 'stale') counts.stale++
      else counts.nodata++
    })
    return CHART_GROUPS.map((g) => ({
      name: g.name,
      value: counts[g.key],
      color: g.color,
    }))
  }, [summary])

  const activeDonutData = useMemo(() => donutData.filter((d) => d.value > 0), [donutData])
  const hoveredItem = hoveredSlice !== null ? activeDonutData[hoveredSlice] : undefined

  const onlineGateways = useMemo(
    () => servers.filter((s) => s.status === 'online').length,
    [servers]
  )

  const metricField = (avg: IotFeederAverage): number | null => {
    const v =
      metric === 'power'
        ? avg.power_mw_avg
        : metric === 'current'
        ? avg.current_ma_avg
        : avg.voltage_avg
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }

  const chartData = useMemo(
    () =>
      feederHistory.map((item) => {
        const ts = item.period_start || item.period_end
        const timeLabel = ts
          ? new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : '-'
        const val =
          metric === 'power'
            ? item.power_mw_avg
            : metric === 'current'
            ? item.current_ma_avg
            : item.voltage_avg
        return {
          timeLabel,
          value: typeof val === 'number' && Number.isFinite(val) ? val : null,
        }
      }),
    [feederHistory, metric]
  )

  const latestVal = useMemo(() => {
    const last = feederHistory[feederHistory.length - 1]
    return last ? metricField(last) : null
  }, [feederHistory, metric])

  const metricStats = useMemo(() => {
    const vals = feederHistory
      .map((item) =>
        metric === 'power'
          ? item.power_mw_avg
          : metric === 'current'
          ? item.current_ma_avg
          : item.voltage_avg
      )
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (vals.length === 0) return null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return {
      avg,
      min: Math.min(...vals),
      max: Math.max(...vals),
    }
  }, [feederHistory, metric])

  const meta = ELECTRICAL_METRICS[metric]
  const isAlert =
    selectedNode?.diagnostic_status === 'anomaly' || selectedNode?.diagnostic_status === 'stale'
  const strokeColor = isAlert ? '#f43f5e' : '#0d9488'
  const nodeBadge = iotStatusBadge(IOT_DIAGNOSTIC_STATUS, selectedNode?.diagnostic_status)
  const updatedText = iotLastUpdated
    ? new Date(iotLastUpdated).toLocaleTimeString('vi-VN')
    : '-'

  return (
    <OpsCard
      index={3}
      title={
        <span className="inline-flex items-center gap-2">
          <Cpu className="w-4 h-4 text-teal-600" />
          Giám sát thiết bị IoT
        </span>
      }
      description="Tình trạng kết nối toàn mạng lưới và biến động thông số điện của Node đang chọn"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {servers.length > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-lg border ${
                onlineGateways === servers.length
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  onlineGateways === servers.length ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              Gateway: <strong>{onlineGateways}/{servers.length}</strong> online
            </span>
          )}
          <span className="text-xs font-semibold text-slate-600 bg-[#f8fafc] px-3 py-1 rounded-lg border border-[#e2e8f0]">
            Tổng <strong className="text-slate-900 tabular-nums">{summary.length}</strong> node
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Cập nhật: <strong className="text-slate-600 font-mono">{updatedText}</strong>
          </span>
        </div>
      }
    >
      {loading && summary.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">Đang tải dữ liệu giám sát IoT...</p>
      ) : summary.length === 0 ? (
        <p className="text-xs text-slate-500 py-8 text-center">
          Chưa có thiết bị IoT nào trong phạm vi tuyến đường đang chọn.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 items-center">
          {/* Cột trái: Donut Chart */}
          <div className="flex flex-col items-center lg:border-r lg:border-slate-100 lg:pr-6">
            <div className="relative h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={4}
                    onMouseEnter={(_, idx) => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  >
                    {activeDonutData.map((entry, idx) => (
                      <Cell key={`iot-donut-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
                <span className="text-2xl font-extrabold text-slate-800 leading-none tabular-nums">
                  {hoveredItem ? hoveredItem.value : summary.length}
                </span>
                <span className="text-[11px] font-medium text-slate-400 mt-1">
                  {hoveredItem
                    ? `${hoveredItem.name} (${Math.round((hoveredItem.value / summary.length) * 100)}%)`
                    : 'Tổng Node IoT'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 text-[11px] w-full max-w-[230px]">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-slate-600 truncate">
                    {d.name}: <strong className="text-slate-900">{d.value}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cột phải: Chọn Node + Biểu đồ đường */}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Chọn node IoT"
                  value={selectedNode?.node_id || ''}
                  onChange={(e) => setSelectedNodeId(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-teal-500"
                >
                  {sortedNodes.map((n) => (
                    <option key={n.node_id} value={n.node_id || ''}>
                      {n.node_id}
                      {n.feeder_id ? ` — ${n.feeder_id}` : ''}
                    </option>
                  ))}
                </select>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${IOT_TONE_CLASS[nodeBadge.tone]}`}
                >
                  {nodeBadge.label}
                </span>
                {selectedNode?.anomaly_codes && selectedNode.anomaly_codes.length > 0 && (
                  <span
                    title={selectedNode.anomaly_codes.map((c) => iotAnomalyLabel(c)).join(' • ')}
                    className="text-[11px] font-semibold text-rose-700 truncate max-w-[260px]"
                  >
                    {iotAnomalyLabel(selectedNode.anomaly_codes[0])}
                    {selectedNode.anomaly_codes.length > 1
                      ? ` (+${selectedNode.anomaly_codes.length - 1})`
                      : ''}
                  </span>
                )}
              </div>

              <div className="inline-flex rounded-xl bg-slate-100 p-0.5 text-xs font-semibold">
                {ELECTRICAL_METRIC_KEYS.map((k) => {
                  const active = metric === k
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setMetric(k)}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        active
                          ? 'bg-white text-teal-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ELECTRICAL_METRICS[k].label} ({ELECTRICAL_METRICS[k].unit})
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2 ô KPI nhỏ */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <span className="text-slate-500 truncate">Mới nhất</span>
                <strong className="font-mono text-slate-900 shrink-0">
                  {latestVal != null ? formatMetric(latestVal, metric) : '-'}
                </strong>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <span className="text-slate-500 truncate">TB (Thấp–Cao)</span>
                <strong className="font-mono text-slate-900 shrink-0">
                  {metricStats
                    ? `${metricStats.avg.toFixed(meta.digits)} (${metricStats.min.toFixed(meta.digits)}–${metricStats.max.toFixed(meta.digits)})`
                    : '-'}
                </strong>
              </div>
            </div>

            {/* Biểu đồ đường góc cạnh */}
            <div className="h-52 w-full">
              {!selectedNode?.feeder_id ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Node chưa gán mạch điện nên chưa có lịch sử số đo.
                </div>
              ) : seriesLoading && chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  Đang tải lịch sử điện...
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                  Chưa có mẫu điện trong cửa sổ gần đây.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 16 }}>
                    <defs>
                      <linearGradient id="iotAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
                        <stop offset="60%" stopColor={strokeColor} stopOpacity={0.08} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="timeLabel"
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: 'Thời gian đo (HH:mm)',
                        position: 'insideBottom',
                        offset: -10,
                        fontSize: 10.5,
                        fill: '#64748b',
                        fontWeight: 600,
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      width={52}
                      label={{
                        value: `${meta.label} (${meta.unit})`,
                        angle: -90,
                        position: 'insideLeft',
                        fontSize: 10.5,
                        fill: '#64748b',
                        fontWeight: 600,
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '11px',
                        color: '#ffffff',
                      }}
                      formatter={(val: unknown) => [
                        typeof val === 'number' ? `${val.toFixed(meta.digits)} ${meta.unit}` : '-',
                        meta.label,
                      ]}
                      labelFormatter={(lbl) => `Mốc ${lbl}`}
                    />
                    <Area
                      type="linear"
                      dataKey="value"
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      fill="url(#iotAreaGrad)"
                      connectNulls
                      dot={false}
                      activeDot={{ r: 5, fill: '#ffffff', stroke: strokeColor, strokeWidth: 2.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </OpsCard>
  )
}

export default IotDiagnosticsCard
