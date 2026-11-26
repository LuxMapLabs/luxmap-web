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
import type { IotFeederHistorySample } from '../../../types/iot/feeders'
import {
  IOT_DIAGNOSTIC_STATUS,
  IOT_ELECTRICAL_STATUS,
  IOT_NODE_STATUS,
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
  feederHistory: IotFeederHistorySample[]
  historyLoading?: boolean
  onSelectFeeder: (feederId: string) => void
  iotLastUpdated: string | null
  loading?: boolean
}

type DonutGroupKey = 'normal' | 'anomaly' | 'stale' | 'nodata'

const CHART_GROUPS: ReadonlyArray<{
  key: DonutGroupKey
  name: string
  color: string
  bgClass: string
  borderClass: string
}> = [
  {
    key: 'normal',
    name: 'Bình thường',
    color: '#10b981',
    bgClass: 'bg-emerald-50/70 hover:bg-emerald-50',
    borderClass: 'border-emerald-200/80',
  },
  {
    key: 'anomaly',
    name: 'Có cảnh báo',
    color: '#f43f5e',
    bgClass: 'bg-rose-50/70 hover:bg-rose-50',
    borderClass: 'border-rose-200/80',
  },
  {
    key: 'stale',
    name: 'Dữ liệu quá hạn',
    color: '#f59e0b',
    bgClass: 'bg-amber-50/70 hover:bg-amber-50',
    borderClass: 'border-amber-200/80',
  },
  {
    key: 'nodata',
    name: 'Chưa có dữ liệu',
    color: '#94a3b8',
    bgClass: 'bg-slate-50 hover:bg-slate-100/80',
    borderClass: 'border-slate-200/80',
  },
]

function classifyNodeGroup(item: IotDiagnosticSummaryItem): DonutGroupKey {
  if (item.diagnostic_status === 'normal') return 'normal'
  if (item.diagnostic_status === 'anomaly') return 'anomaly'
  if (item.diagnostic_status === 'stale' || item.connection_status === 'offline') return 'stale'
  return 'nodata'
}

export const IotDiagnosticsCard: React.FC<IotDiagnosticsCardProps> = ({
  summary,
  servers,
  feederHistory,
  historyLoading: seriesLoading = false,
  onSelectFeeder,
  iotLastUpdated,
  loading = false,
}) => {
  const [hoveredKey, setHoveredKey] = useState<DonutGroupKey | null>(null)
  const [metric, setMetric] = useState<ElectricalMetric>('power')

  // Ưu tiên số 1: Node đã gắn mạch điện (feeder_id) để luôn hiển thị được biểu đồ đường;
  // sau đó xếp theo mức độ cảnh báo (anomaly -> stale -> normal -> khác)
  const sortedNodes = useMemo(() => {
    const statusRank = (st?: string | null) =>
      st === 'anomaly' ? 0 : st === 'stale' ? 1 : st === 'normal' ? 2 : 3
    return [...summary].sort((a, b) => {
      const feederDiff = (b.feeder_id ? 1 : 0) - (a.feeder_id ? 1 : 0)
      if (feederDiff !== 0) return feederDiff
      return statusRank(a.diagnostic_status) - statusRank(b.diagnostic_status)
    })
  }, [summary])

  const [selectedNodeId, setSelectedNodeId] = useState<string>('')

  useEffect(() => {
    if (sortedNodes.length === 0) {
      setSelectedNodeId('')
      return
    }
    const current = sortedNodes.find((n) => n.node_id === selectedNodeId)
    const firstWithFeeder = sortedNodes.find((n) => Boolean(n.feeder_id))
    // Nếu chưa chọn node, hoặc node đang chọn bị mất, hoặc node đang chọn không có feeder trong khi đã có node có feeder
    if (!current) {
      setSelectedNodeId((firstWithFeeder || sortedNodes[0])?.node_id || '')
    }
  }, [sortedNodes, selectedNodeId])

  const selectedNode = useMemo(
    () => sortedNodes.find((n) => n.node_id === selectedNodeId) || sortedNodes[0] || null,
    [sortedNodes, selectedNodeId]
  )

  // Tải lịch sử điện ngay khi đổi mạch VÀ tự động cập nhật liên tục mỗi 1 giây (1000ms) để biểu đồ nhảy real-time
  const historyLoadingRef = React.useRef(seriesLoading)
  historyLoadingRef.current = seriesLoading

  useEffect(() => {
    const feederId = selectedNode?.feeder_id
    if (!feederId) return

    onSelectFeeder(feederId)

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible' && !historyLoadingRef.current) {
        onSelectFeeder(feederId)
      }
    }, 1_000)

    return () => window.clearInterval(timer)
  }, [selectedNode?.feeder_id, onSelectFeeder])

  const donutData = useMemo(() => {
    const counts: Record<DonutGroupKey, number> = {
      normal: 0,
      anomaly: 0,
      stale: 0,
      nodata: 0,
    }
    summary.forEach((item) => {
      counts[classifyNodeGroup(item)]++
    })
    return CHART_GROUPS.map((g) => ({
      ...g,
      value: counts[g.key],
      percent: summary.length > 0 ? Math.round((counts[g.key] / summary.length) * 100) : 0,
    }))
  }, [summary])

  const activeDonutData = useMemo(() => donutData.filter((d) => d.value > 0), [donutData])
  const hoveredItem = useMemo(
    () => (hoveredKey ? donutData.find((d) => d.key === hoveredKey) : undefined),
    [hoveredKey, donutData]
  )

  const handleSelectGroup = (groupKey: DonutGroupKey) => {
    const target =
      sortedNodes.find((n) => classifyNodeGroup(n) === groupKey && Boolean(n.feeder_id)) ||
      sortedNodes.find((n) => classifyNodeGroup(n) === groupKey)
    if (target?.node_id) {
      setSelectedNodeId(target.node_id)
    }
  }

  const onlineGateways = useMemo(
    () => servers.filter((s) => s.status === 'online').length,
    [servers]
  )

  // Chỉ sử dụng lịch sử điện khi node đang chọn có gắn feeder_id
  const activeHistory = useMemo(
    () => (selectedNode?.feeder_id ? feederHistory : []),
    [selectedNode?.feeder_id, feederHistory]
  )

  const formatSampleDateTime = (iso?: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
    })
  }

  const chartData = useMemo(
    () =>
      activeHistory.map((item) => {
        const ts = item.measured_at || item.received_at
        const dateObj = ts ? new Date(ts) : null
        const validDate = dateObj && !Number.isNaN(dateObj.getTime()) ? dateObj : null
        const timeLabel = validDate
          ? validDate.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '-'
        const fullTimeLabel = formatSampleDateTime(ts)
        const measuredLabel = formatSampleDateTime(item.measured_at)
        const receivedLabel = formatSampleDateTime(item.received_at)
        const val =
          metric === 'power'
            ? item.power_mw
            : metric === 'current'
            ? item.current_ma
            : item.voltage
        return {
          timeLabel,
          fullTimeLabel,
          measuredLabel,
          receivedLabel,
          receptionType: item.reception_type ?? null,
          lampCommand: item.lamp_command ?? null,
          value: typeof val === 'number' && Number.isFinite(val) ? val : null,
        }
      }),
    [activeHistory, metric]
  )

  const hasBackfillSamples = useMemo(
    () => chartData.some((item) => item.receptionType === 'backfill'),
    [chartData]
  )

  const latestSample = useMemo(
    () => (activeHistory.length > 0 ? activeHistory[activeHistory.length - 1] : null),
    [activeHistory]
  )

  const latestVal = useMemo(() => {
    const last = activeHistory[activeHistory.length - 1]
    if (!last) return null
    const v =
      metric === 'power'
        ? last.power_mw
        : metric === 'current'
        ? last.current_ma
        : last.voltage
    return typeof v === 'number' && Number.isFinite(v) ? v : null
  }, [activeHistory, metric])

  const latestSampleTime = useMemo(() => {
    const last = chartData[chartData.length - 1]
    return last?.fullTimeLabel && last.fullTimeLabel !== '-' ? last.fullTimeLabel : null
  }, [chartData])

  const metricStats = useMemo(() => {
    const vals = activeHistory
      .map((item) =>
        metric === 'power'
          ? item.power_mw
          : metric === 'current'
          ? item.current_ma
          : item.voltage
      )
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
    if (vals.length === 0) return null
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    return {
      avg,
      min: Math.min(...vals),
      max: Math.max(...vals),
    }
  }, [activeHistory, metric])

  const meta = ELECTRICAL_METRICS[metric]
  const isAlert =
    selectedNode?.diagnostic_status === 'anomaly' ||
    selectedNode?.diagnostic_status === 'stale' ||
    selectedNode?.connection_status === 'offline'
  const strokeColor = isAlert ? '#f43f5e' : '#0d9488'
  const nodeBadge = iotStatusBadge(IOT_DIAGNOSTIC_STATUS, selectedNode?.diagnostic_status)
  const connBadge = selectedNode?.connection_status
    ? iotStatusBadge(IOT_NODE_STATUS, selectedNode.connection_status)
    : null
  const elecBadge = selectedNode?.electrical_status
    ? iotStatusBadge(IOT_ELECTRICAL_STATUS, selectedNode.electrical_status)
    : null
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
      description="Tình trạng kết nối toàn mạng lưới và biến động từng mẫu điện theo giờ đo của Node đang chọn"
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
        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-6 items-center">
          {/* Cột trái: Donut Chart & Chú thích tương tác không bị cắt chữ */}
          <div className="flex flex-col items-center lg:border-r lg:border-slate-100 lg:pr-6">
            <div className="relative h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      activeDonutData.length > 0
                        ? activeDonutData
                        : [{ key: 'nodata', name: 'Chưa có dữ liệu', value: 1, color: '#e2e8f0' }]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={76}
                    paddingAngle={activeDonutData.length > 1 ? 3 : 0}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={activeDonutData.length > 1 ? 5 : 0}
                    onMouseEnter={(_, idx) => {
                      const item = activeDonutData[idx]
                      if (item) setHoveredKey(item.key)
                    }}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={(_, idx) => {
                      const item = activeDonutData[idx]
                      if (item) handleSelectGroup(item.key)
                    }}
                  >
                    {(activeDonutData.length > 0
                      ? activeDonutData
                      : [{ key: 'nodata' as DonutGroupKey, color: '#e2e8f0' }]
                    ).map((entry, idx) => (
                      <Cell
                        key={`iot-donut-${idx}`}
                        fill={entry.color}
                        opacity={hoveredKey && hoveredKey !== entry.key ? 0.45 : 1}
                        className="cursor-pointer transition-opacity duration-150 outline-none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
                <span className="text-2xl font-extrabold text-slate-800 leading-none tabular-nums">
                  {hoveredItem ? hoveredItem.value : summary.length}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 leading-tight">
                  {hoveredItem ? hoveredItem.name : 'Tổng Node IoT'}
                </span>
                {hoveredItem && (
                  <span className="text-[10px] font-mono font-bold text-slate-400 mt-0.5">
                    {hoveredItem.percent}%
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] w-full">
              {donutData.map((d) => {
                const isHovered = hoveredKey === d.key
                return (
                  <button
                    key={d.key}
                    type="button"
                    onMouseEnter={() => setHoveredKey(d.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() => handleSelectGroup(d.key)}
                    title={`Bấm để xem node nhóm "${d.name}" (${d.value} node)`}
                    className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-left transition cursor-pointer ${
                      d.bgClass
                    } ${d.borderClass} ${isHovered ? 'ring-2 ring-slate-300/80 shadow-2xs' : ''}`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-slate-700 font-medium leading-tight">{d.name}</span>
                    </span>
                    <strong className="font-mono text-xs font-extrabold text-slate-900 shrink-0 tabular-nums">
                      {d.value}
                    </strong>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cột phải: Chọn Node + Biểu đồ đường 30 giây */}
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
                      {n.feeder_id ? ` — ${n.feeder_id}` : ' (Chưa gán mạch)'}
                    </option>
                  ))}
                </select>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${IOT_TONE_CLASS[nodeBadge.tone]}`}
                >
                  {nodeBadge.label}
                </span>
                {connBadge && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[connBadge.tone]}`}
                  >
                    {connBadge.label}
                  </span>
                )}
                {elecBadge && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${IOT_TONE_CLASS[elecBadge.tone]}`}
                  >
                    {elecBadge.label}
                  </span>
                )}
                {latestSample?.lamp_command && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      latestSample.lamp_command.toUpperCase() === 'ON'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    Đèn: {latestSample.lamp_command.toUpperCase()}
                  </span>
                )}
                {hasBackfillSamples && (
                  <span
                    title="Có mẫu điện được node lưu thẻ nhớ khi mất kết nối và gửi bù lại sau theo giờ đo gốc"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 border border-violet-200"
                  >
                    <span className="w-2 h-2 rounded-full bg-violet-600" />
                    Có mẫu gửi bù
                  </span>
                )}
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

            {/* 3 ô KPI nhỏ */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                <span className="text-slate-500 truncate">
                  Mới nhất{latestSampleTime ? ` (${latestSampleTime})` : ''}
                </span>
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
              <div className="px-3 py-1.5 rounded-xl bg-teal-50/70 border border-teal-100 flex items-center justify-between gap-2">
                <span className="text-teal-700 truncate">Sự cố đang mở</span>
                <strong className="font-mono text-teal-800 shrink-0">
                  {selectedNode ? `${selectedNode.fault_ids?.length ?? 0} sự cố` : '-'}
                </strong>
              </div>
            </div>

            {/* Biểu đồ đường 30 giây */}
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
                  <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 4, bottom: 18 }}>
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
                      minTickGap={22}
                      label={{
                        value: 'Thời gian đo mẫu (HH:mm:ss)',
                        position: 'insideBottom',
                        offset: -12,
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
                      domain={[0, 'auto']}
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
                      formatter={(val: unknown, _name: unknown, item: { payload?: { receptionType?: 'live' | 'backfill' | null; lampCommand?: string | null; measuredLabel?: string; receivedLabel?: string } }) => {
                        const valueText =
                          typeof val === 'number' ? `${val.toFixed(meta.digits)} ${meta.unit}` : '-'
                        const p = item?.payload
                        const receptionText =
                          p?.receptionType === 'backfill'
                            ? 'Gửi bù từ thẻ nhớ'
                            : p?.receptionType === 'live'
                            ? 'Trực tiếp'
                            : null
                        const lampText = p?.lampCommand ? `Đèn ${p.lampCommand}` : null
                        const extra = [receptionText, lampText].filter(Boolean).join(' · ')
                        return [extra ? `${valueText} (${extra})` : valueText, meta.label]
                      }}
                      labelFormatter={(lbl, payload) => {
                        const first = payload?.[0]?.payload as
                          | {
                              fullTimeLabel?: string
                              measuredLabel?: string
                              receivedLabel?: string
                              receptionType?: 'live' | 'backfill' | null
                            }
                          | undefined
                        if (!first) return `Mẫu ${lbl}`
                        if (
                          first.receptionType === 'backfill' &&
                          first.measuredLabel &&
                          first.receivedLabel &&
                          first.measuredLabel !== first.receivedLabel
                        ) {
                          return `Giờ đo: ${first.measuredLabel} · Nhận: ${first.receivedLabel}`
                        }
                        return `Giờ đo: ${first.measuredLabel && first.measuredLabel !== '-' ? first.measuredLabel : first.fullTimeLabel || lbl}`
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={strokeColor}
                      strokeWidth={2.5}
                      fill="url(#iotAreaGrad)"
                      connectNulls
                      isAnimationActive={false}
                      dot={(props: { cx?: number; cy?: number; index?: number; payload?: { receptionType?: 'live' | 'backfill' | null } }) => {
                        const { cx, cy, index, payload } = props
                        if (typeof cx !== 'number' || typeof cy !== 'number') return <g key={`dot-empty-${index}`} />
                        const isBackfill = payload?.receptionType === 'backfill'
                        return (
                          <circle
                            key={`dot-${index}`}
                            cx={cx}
                            cy={cy}
                            r={isBackfill ? 3.5 : 2.5}
                            fill={isBackfill ? '#7c3aed' : strokeColor}
                            stroke={isBackfill ? '#ffffff' : 'none'}
                            strokeWidth={isBackfill ? 1 : 0}
                          />
                        )
                      }}
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
