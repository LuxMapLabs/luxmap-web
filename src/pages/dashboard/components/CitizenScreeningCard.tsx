import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { OpsCard } from '../../../components/ops/OpsCard'
import type {
  CitizenScreeningStatistics,
  CitizenScreeningVerdictCounts,
} from '../../../types/statistics/citizen-screening'
import { formatNightOf } from '../../../utils/citizen-report/citizenReviewFormat'
import {
  DATA_SOURCE_LABELS_VN,
  SCREENING_NIGHTS,
  defaultSourceOf,
  fillNights,
  formatRate,
  sourceOf,
} from '../../../utils/dashboard/citizenScreening'

interface CitizenScreeningCardProps {
  stats: CitizenScreeningStatistics | null
  loading: boolean
  selectedSegment: string
  segmentNameMap: Record<string, string>
}

// Thứ tự và màu của năm kết luận CV — dùng chung cho biểu đồ đêm, thanh cơ cấu và chú thích
const VERDICTS: { key: keyof CitizenScreeningVerdictCounts; label: string; hint: string; color: string }[] = [
  { key: 'cv_off', label: 'CV thấy đèn tắt', hint: 'Ảnh xác nhận đèn không sáng', color: '#ef4444' },
  { key: 'cv_on', label: 'CV thấy đèn sáng', hint: 'Ảnh cho thấy đèn vẫn sáng', color: '#10b981' },
  { key: 'inconclusive', label: 'Không kết luận', hint: 'Ảnh ban ngày, không thấy bóng, hoặc ảnh mâu thuẫn', color: '#f59e0b' },
  { key: 'not_analyzed', label: 'Chưa phân tích', hint: 'CV chạy khi Quản lý mở báo cáo lần đầu', color: '#94a3b8' },
  { key: 'no_photo', label: 'Không có ảnh', hint: 'Người dân không gửi ảnh', color: '#e2e8f0' },
]

const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }> = ({
  label,
  value,
  sub,
  tone = 'text-slate-900',
}) => (
  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 min-w-0">
    <p className="text-[11px] font-semibold text-slate-500 truncate">{label}</p>
    <p className={`text-2xl font-extrabold tabular-nums leading-tight mt-1 ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</p>}
  </div>
)

// Khối số liệu báo cáo QR của người dân và kết quả CV nhận diện đèn ON/OFF trên ảnh họ gửi (drift ST-14)
export const CitizenScreeningCard: React.FC<CitizenScreeningCardProps> = ({
  stats,
  loading,
  selectedSegment,
  segmentNameMap,
}) => {
  const navigate = useNavigate()
  const [dataSource, setDataSource] = useState<string | null>(null)

  // Giữ nguồn đang xem khi tải lại; nguồn đó biến mất thì quay về nguồn mặc định
  useEffect(() => {
    if (!stats?.sources.some((s) => s.data_source === dataSource)) setDataSource(defaultSourceOf(stats))
  }, [stats, dataSource])

  const source = sourceOf(stats, dataSource)
  const nights = useMemo(
    () => (stats?.from && stats?.to ? fillNights(source?.by_night ?? [], stats.from, stats.to) : []),
    [source, stats?.from, stats?.to]
  )
  const chartData = useMemo(() => nights.map((n) => ({ ...n, label: formatNightOf(n.night_of).slice(0, 5) })), [nights])

  const scope =
    selectedSegment === 'all' ? 'toàn địa bàn' : segmentNameMap[selectedSegment] || selectedSegment
  const agreement = source?.agreement
  const versions = source?.artifact_versions ?? []

  return (
    <OpsCard
      index={3}
      title="Báo cáo QR của người dân · sàng lọc bằng CV"
      description={`${SCREENING_NIGHTS} đêm gần nhất, ${scope} — CV nhận diện đèn ON/OFF trên ảnh người dân gửi, chỉ là gợi ý cho Quản lý`}
      actions={
        <>
          {stats?.sources.length === 1 && (
            <span className="text-xs font-semibold text-slate-600 bg-[#f8fafc] px-3 py-1 rounded-lg border border-[#e2e8f0]">
              Nguồn: {DATA_SOURCE_LABELS_VN[stats.sources[0].data_source] ?? stats.sources[0].data_source}
            </span>
          )}
          {stats && stats.sources.length > 1 && (
            <select
              aria-label="Nguồn dữ liệu"
              value={dataSource ?? ''}
              onChange={(e) => setDataSource(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-[#f8fafc] px-2 py-1 rounded-lg border border-[#e2e8f0]"
            >
              {stats.sources.map((s) => (
                <option key={s.data_source} value={s.data_source}>
                  {DATA_SOURCE_LABELS_VN[s.data_source] ?? s.data_source}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => navigate('/citizen-reports')}
            className="text-xs font-semibold text-[#0B72D9] bg-[#eef6fd] hover:bg-[#dcecfb] px-3 py-1 rounded-lg transition-colors"
          >
            Mở hàng chờ duyệt
          </button>
        </>
      }
    >
      {!stats ? (
        <p className="py-10 text-center text-xs text-slate-500">
          {loading ? 'Đang tải số liệu báo cáo QR…' : 'Không tải được số liệu báo cáo QR từ máy chủ.'}
        </p>
      ) : !source ? (
        <p className="py-10 text-center text-xs text-slate-500">
          Chưa có báo cáo QR nào của người dân trong {SCREENING_NIGHTS} đêm gần nhất ({scope}).
        </p>
      ) : (
        <div className="space-y-5">
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <Kpi
              label="Báo cáo nhận được"
              value={source.reports}
              sub={`${source.submissions} lượt gửi · ${source.far_from_pole} gửi từ xa cột`}
            />
            <Kpi
              label="Đang chờ duyệt"
              value={source.by_status.pending}
              sub={`${source.by_status.accepted} nhận · ${source.by_status.merged} gộp · ${source.by_status.rejected} từ chối`}
              tone="text-[#0B72D9]"
            />
            <Kpi
              label="CV xác nhận đèn tắt"
              value={source.by_verdict.cv_off}
              sub={`${source.by_verdict.cv_on} báo cáo CV thấy đèn sáng`}
              tone="text-red-600"
            />
            <Kpi
              label="Nghi báo nhầm / spam"
              value={source.contradicted}
              sub="Dân báo đèn tắt, ảnh cho thấy đèn sáng"
              tone="text-amber-600"
            />
            <Kpi
              label="Mức khớp CV ↔ Quản lý"
              value={formatRate(agreement?.agreement_rate)}
              sub={agreement?.decided ? `trên ${agreement.decided} báo cáo đã quyết` : 'chưa có báo cáo đã quyết'}
              tone="text-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-5">
            {/* Xu hướng theo đêm */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Báo cáo theo đêm, tô theo kết luận CV</p>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#eef2f6" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} interval="preserveStartEnd" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(11,114,217,0.06)' }}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #e2e8f0' }}
                      labelFormatter={(_, payload) => `Đêm ${formatNightOf(payload?.[0]?.payload?.night_of)}`}
                    />
                    {VERDICTS.map((v) => (
                      <Bar key={v.key} dataKey={v.key} name={v.label} stackId="verdict" fill={v.color} maxBarSize={18} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cơ cấu kết luận CV */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Kết luận CV trên {source.reports} báo cáo</p>
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#eaeff4] mb-3">
                {VERDICTS.map((v) => {
                  const n = source.by_verdict[v.key]
                  return n > 0 ? (
                    <span
                      key={v.key}
                      title={`${v.label}: ${n}`}
                      style={{ width: `${(n / source.reports) * 100}%`, backgroundColor: v.color }}
                      className="block h-full"
                    />
                  ) : null
                })}
              </div>
              <ul className="space-y-1.5">
                {VERDICTS.map((v) => {
                  const n = source.by_verdict[v.key]
                  return (
                    <li key={v.key} className="flex items-center gap-2 text-xs text-slate-600" title={v.hint}>
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: v.color }} />
                      <span className="truncate">{v.label}</span>
                      <span className="ml-auto font-semibold text-slate-800 tabular-nums">
                        {n} <span className="font-normal text-slate-500">({((n / source.reports) * 100).toFixed(0)}%)</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
              {source.by_verdict.not_analyzed > 0 && (
                <p className="text-[11px] text-slate-500 mt-2">
                  CV chạy khi Quản lý mở báo cáo lần đầu — báo cáo chưa ai mở nằm ở "Chưa phân tích".
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Mức khớp theo từng lớp */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">
                CV so với quyết định của Quản lý <span className="font-normal text-slate-500">(báo cáo "đèn tắt" đã quyết)</span>
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left">
                    <th className="py-1.5 font-semibold">Kết luận CV</th>
                    <th className="py-1.5 font-semibold text-right">Quản lý nhận / gộp</th>
                    <th className="py-1.5 font-semibold text-right">Quản lý từ chối</th>
                    <th className="py-1.5 font-semibold text-right">Khớp</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 tabular-nums">
                  <tr className="border-t border-[#eef2f6]">
                    <td className="py-1.5">CV thấy đèn tắt</td>
                    <td className="py-1.5 text-right font-semibold text-emerald-700">{agreement?.cv_off_upheld ?? 0}</td>
                    <td className="py-1.5 text-right">{agreement?.cv_off_rejected ?? 0}</td>
                    <td className="py-1.5 text-right font-semibold">{formatRate(agreement?.cv_off_upheld_rate)}</td>
                  </tr>
                  <tr className="border-t border-[#eef2f6]">
                    <td className="py-1.5">CV thấy đèn sáng</td>
                    <td className="py-1.5 text-right">{agreement?.cv_on_upheld ?? 0}</td>
                    <td className="py-1.5 text-right font-semibold text-emerald-700">{agreement?.cv_on_rejected ?? 0}</td>
                    <td className="py-1.5 text-right font-semibold">{formatRate(agreement?.cv_on_rejected_rate)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[11px] text-slate-500 mt-2">
                Mức khớp, không phải độ chính xác: quyết định của Quản lý không phải nhãn chuẩn. Báo "đèn mờ" không tính —
                CV chỉ nhận ON/OFF, không đo độ sáng.
              </p>
              {versions.length > 1 && (
                <p className="text-[11px] text-amber-700 mt-1">
                  ⚠ Số liệu gộp {versions.length} phiên bản model: {versions.map((v) => `${v.artifact_version} (${v.photos} ảnh)`).join(', ')}
                </p>
              )}
            </div>

            {/* Cột bị báo nhiều nhất */}
            <div>
              <p className="text-xs font-bold text-slate-700 mb-2">Cột bị báo nhiều nhất</p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-500 text-left">
                    <th className="py-1.5 font-semibold">Cột</th>
                    <th className="py-1.5 font-semibold">Tuyến</th>
                    <th className="py-1.5 font-semibold text-right">Báo cáo</th>
                    <th className="py-1.5 font-semibold text-right">Lượt gửi</th>
                    <th className="py-1.5 font-semibold text-right">Nghi nhầm</th>
                    <th className="py-1.5 font-semibold text-right">Đêm gần nhất</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700 tabular-nums">
                  {source.top_poles.map((p) => (
                    <tr key={p.pole_id} className="border-t border-[#eef2f6]">
                      <td className="py-1.5 font-semibold text-slate-800">{p.pole_id}</td>
                      <td className="py-1.5 truncate max-w-[140px]">
                        {p.segment_id ? segmentNameMap[p.segment_id] || p.segment_id : 'Chưa phân tuyến'}
                      </td>
                      <td className="py-1.5 text-right font-semibold">{p.reports}</td>
                      <td className="py-1.5 text-right">{p.submissions}</td>
                      <td className={`py-1.5 text-right ${p.contradicted > 0 ? 'font-semibold text-amber-600' : ''}`}>
                        {p.contradicted}
                      </td>
                      <td className="py-1.5 text-right">{formatNightOf(p.last_night_of)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </OpsCard>
  )
}
