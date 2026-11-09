import React from 'react'
import { Lightbulb, AlertTriangle, ZapOff, ShieldAlert, type LucideIcon } from 'lucide-react'
import { useCountUp } from '../../../hooks/useCountUp'

interface DashboardKpiCardsProps {
  fixtureKpis: {
    totalPoles: number
    totalNormal: number
    totalDim: number
    totalOut: number
    normalPct: string
    dimPct: string
    outPct: string
  }
  faultsCount: number
  warrantyKpis: {
    itemsCount: number
    expiringCount: number
    expiredCount: number
  }
  onClickNormal?: () => void
  onClickPendingFaults?: () => void
  onClickSevereFaults?: () => void
  onClickWarranty?: () => void
}

interface MeterPart {
  pct: number
  color: string
}

type Tone = 'ok' | 'bad' | 'warn'

interface KpiCardProps {
  index: number
  icon: LucideIcon
  label: string
  value: number
  display?: string
  suffix?: string
  decimals?: number
  hint: string
  tone: Tone
  parts: MeterPart[]
  title: string
  onClick?: () => void
}

const TONE: Record<Tone, { value: string; tile: string }> = {
  ok: { value: 'text-emerald-600', tile: 'bg-emerald-50 text-emerald-600' },
  bad: { value: 'text-red-600', tile: 'bg-red-50 text-red-600' },
  warn: { value: 'text-amber-600', tile: 'bg-amber-50 text-amber-600' },
}

const KpiCard: React.FC<KpiCardProps> = ({
  index,
  icon: Icon,
  label,
  value,
  display,
  suffix = '',
  decimals = 0,
  hint,
  tone,
  parts,
  title,
  onClick,
}) => {
  const animated = useCountUp(value)
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{ '--i': index } as React.CSSProperties}
      className="ops-rise group text-left bg-white rounded-[20px] shadow-ops px-5 py-[18px] cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-ops-hover active:translate-y-0"
    >
      <span
        className={`flex h-[42px] w-[42px] items-center justify-center rounded-[14px] transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6 ${TONE[tone].tile}`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="mt-3.5 block text-[12.5px] font-semibold text-slate-500">{label}</span>
      <span className="mt-0.5 flex items-baseline gap-1.5">
        <strong className={`text-[32px] leading-[1.15] font-extrabold tracking-tight tabular-nums ${TONE[tone].value}`}>
          {display ?? `${animated.toFixed(decimals)}${suffix}`}
        </strong>
        <em className="not-italic text-xs font-medium text-slate-400">{hint}</em>
      </span>
      <span className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        {parts.map((p, i) => (
          <span
            key={i}
            style={{ width: `${Math.max(0, Math.min(100, p.pct))}%`, backgroundColor: p.color }}
            className="ops-grow ops-shine block h-full"
          />
        ))}
      </span>
    </button>
  )
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  fixtureKpis,
  faultsCount,
  warrantyKpis,
  onClickNormal,
  onClickPendingFaults,
  onClickSevereFaults,
  onClickWarranty,
}) => {
  const hasPoles = fixtureKpis.totalPoles > 0
  const warrantyTotal = warrantyKpis.expiredCount + warrantyKpis.expiringCount
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <KpiCard
        index={0}
        icon={Lightbulb}
        label="Tỷ lệ sáng bình thường"
        value={hasPoles ? Number(fixtureKpis.normalPct) : 0}
        display={hasPoles ? undefined : '-'}
        suffix="%"
        decimals={1}
        hint={hasPoles ? `${fixtureKpis.totalNormal} / ${fixtureKpis.totalPoles} cột` : 'Chưa có cột đèn'}
        tone="ok"
        parts={[{ pct: Number(fixtureKpis.normalPct), color: '#12a37f' }]}
        title="Cuộn xuống xem biểu đồ phân tích chiếu sáng"
        onClick={onClickNormal}
      />
      <KpiCard
        index={1}
        icon={AlertTriangle}
        label="Sự cố đang tồn đọng"
        value={faultsCount}
        hint={faultsCount > 0 ? 'cần khắc phục' : 'không có sự cố'}
        tone={faultsCount > 0 ? 'bad' : 'ok'}
        parts={[{ pct: faultsCount > 0 ? 100 : 0, color: '#e5484d' }]}
        title="Cuộn xuống bảng giám sát sự cố bóng đèn"
        onClick={onClickPendingFaults}
      />
      <KpiCard
        index={2}
        icon={ZapOff}
        label="Mất sáng nghiêm trọng"
        value={fixtureKpis.totalOut}
        hint={`${fixtureKpis.outPct}% số cột`}
        tone={fixtureKpis.totalOut > 0 ? 'bad' : 'ok'}
        parts={[{ pct: Number(fixtureKpis.outPct), color: '#e5484d' }]}
        title="Lọc các cột mất sáng hoàn toàn trong bảng sự cố"
        onClick={onClickSevereFaults}
      />
      <KpiCard
        index={3}
        icon={ShieldAlert}
        label="Bảo hành cần xử lý (≤ 1 tháng)"
        value={warrantyKpis.itemsCount}
        hint={`${warrantyKpis.expiredCount} quá hạn`}
        tone="warn"
        parts={
          warrantyTotal > 0
            ? [
                { pct: (warrantyKpis.expiredCount / warrantyTotal) * 100, color: '#e5484d' },
                { pct: (warrantyKpis.expiringCount / warrantyTotal) * 100, color: '#f5a524' },
              ]
            : []
        }
        title="Cuộn xuống bảng theo dõi bảo hành"
        onClick={onClickWarranty}
      />
    </div>
  )
}
