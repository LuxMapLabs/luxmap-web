import React from 'react'
import { Lightbulb, Clock, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useCountUp } from '../../../hooks/useCountUp'

export interface SuperiorKpiData {
  // KPI 1: Chiếu sáng đạt chuẩn
  normalPct: number
  normalCount: number
  totalPoles: number
  dimCount: number
  outCount: number
  unknownCount: number

  // KPI 2: Tiến độ SLA sửa chữa
  slaRate: number
  slaOnTimeCount: number
  slaTotalFinished: number
  slaLateCount: number
  slaOverdueCount: number

  // KPI 3: Sự cố tồn đọng
  openFaultsCount: number
  criticalFaultsCount: number
  inRepairFaultsCount: number
  waitingRepairFaultsCount?: number
  detectedFaultsCount: number

  // KPI 4: Cảnh báo bảo hành
  warrantyAlertCount: number
  warrantyExpiredCount: number
  warrantyExpiringCount: number
  warrantyActiveCount: number
}

interface SuperiorKpiGridProps {
  data: SuperiorKpiData
  loading?: boolean
  isSegmentFiltered?: boolean
  onClickLighting?: () => void
  onClickSla?: () => void
  onClickFaults?: () => void
  onClickWarranty?: () => void
}

const CARD =
  'ops-rise group rounded-[20px] border border-[#DCE8F3] bg-white p-5 flex flex-col text-left shadow-[0_8px_24px_-14px_rgba(59,99,133,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(59,99,133,0.35)] cursor-pointer'

const GREEN = '#7CCBA2'
const AMBER = '#F2C46B'
const ROSE = '#EE8B8B'
const BLUE = '#8FB8DA'
const INDIGO = '#A6B4F0'
const SLATE = '#CBD5E1'

// Thanh tiến độ mảnh gồm nhiều đoạn màu
const Bar: React.FC<{ parts: { width: number; color: string }[] }> = ({ parts }) => (
  <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-[#E4EFF8]">
    {parts.map((p, i) => (
      <span key={i} style={{ width: `${p.width}%`, backgroundColor: p.color }} className="h-full ops-grow" />
    ))}
  </span>
)

// Một dòng nhận xét ngắn có chấm màu
const Status: React.FC<{ color: string; text: string }> = ({ color, text }) => (
  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-600">
    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
    {text}
  </span>
)

export const SuperiorKpiGrid: React.FC<SuperiorKpiGridProps> = ({
  data,
  loading = false,
  isSegmentFiltered = false,
  onClickLighting,
  onClickSla,
  onClickFaults,
  onClickWarranty,
}) => {
  const animNormalPct = useCountUp(data.normalPct)
  const animSlaRate = useCountUp(data.slaRate)
  const animOpenFaults = useCountUp(data.openFaultsCount)
  const animWarrantyAlert = useCountUp(data.warrantyAlertCount)

  const pct = (part: number, total: number, fallback = 0) => (total > 0 ? (part / total) * 100 : fallback)

  const totalWarranty = data.warrantyActiveCount + data.warrantyExpiringCount + data.warrantyExpiredCount

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-[20px] border border-[#DCE8F3] bg-white p-5 animate-pulse flex flex-col justify-between h-40"
          >
            <div className="h-4 w-28 bg-[#E4EFF8] rounded" />
            <div className="h-9 w-24 bg-[#E4EFF8] rounded" />
            <div className="h-1.5 w-full bg-[#E4EFF8] rounded-full" />
            <div className="h-3 w-32 bg-[#E4EFF8] rounded" />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tỷ lệ chiếu sáng đạt chuẩn */}
      <button type="button" onClick={onClickLighting} style={{ '--i': 0 } as React.CSSProperties} className={CARD}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-500">Chiếu sáng đạt chuẩn</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E8F6EE] text-emerald-600">
            <Lightbulb className="w-[18px] h-[18px]" />
          </span>
        </div>
        <strong className="mt-2 text-[34px] leading-none font-extrabold tracking-tight tabular-nums text-slate-900">
          {animNormalPct.toFixed(1)}%
        </strong>
        <span className="mt-1.5 flex min-h-[22px] items-center text-[12px] text-slate-500">
          {data.normalCount} / {data.totalPoles} cột hoạt động bình thường
        </span>
        <div className="mt-3">
          <Bar
            parts={[
              { width: pct(data.normalCount, data.totalPoles), color: GREEN },
              { width: pct(data.dimCount, data.totalPoles), color: AMBER },
              { width: pct(data.outCount, data.totalPoles), color: ROSE },
              { width: pct(data.unknownCount, data.totalPoles), color: SLATE },
            ]}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-slate-500">
          <span>
            Sáng yếu <strong className="text-amber-600">{data.dimCount}</strong> · Tắt{' '}
            <strong className="text-rose-500">{data.outCount}</strong>
          </span>
          <span>Chưa quét {data.unknownCount}</span>
        </div>
      </button>

      {/* KPI 2: Tuân thủ SLA sửa chữa */}
      <button type="button" onClick={onClickSla} style={{ '--i': 1 } as React.CSSProperties} className={CARD}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-500">Sửa chữa đúng hạn (SLA)</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E4EFF8] text-[#4A7AA3]">
            <Clock className="w-[18px] h-[18px]" />
          </span>
        </div>
        <strong className="mt-2 text-[34px] leading-none font-extrabold tracking-tight tabular-nums text-[#3B6385]">
          {data.slaTotalFinished === 0 ? '-' : `${animSlaRate.toFixed(1)}%`}
        </strong>
        <span className="mt-1.5 flex min-h-[22px] items-center">
          {data.slaTotalFinished === 0 ? (
            <Status color={BLUE} text="Chưa có lệnh hoàn thành" />
          ) : (
            <Status color={data.slaRate >= 95 ? GREEN : AMBER} text={data.slaRate >= 95 ? 'Đạt chuẩn ≥95%' : 'Cần cải thiện'} />
          )}
        </span>
        <div className="mt-3">
          <Bar
            parts={[
              { width: pct(data.slaOnTimeCount, data.slaTotalFinished, 100), color: BLUE },
              { width: pct(data.slaLateCount, data.slaTotalFinished), color: AMBER },
            ]}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-slate-500">
          <span>
            {data.slaOnTimeCount} / {data.slaTotalFinished} lệnh đúng hạn
          </span>
          <span>
            Quá hạn mở <strong className="text-rose-500">{data.slaOverdueCount}</strong>
          </span>
        </div>
      </button>

      {/* KPI 3: Sự cố đang mở */}
      <button type="button" onClick={onClickFaults} style={{ '--i': 2 } as React.CSSProperties} className={CARD}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-500">
            {isSegmentFiltered ? 'Sự cố đang mở trên tuyến' : 'Sự cố đang mở trong xã'}
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDECEC] text-rose-500">
            <AlertTriangle className="w-[18px] h-[18px]" />
          </span>
        </div>
        <strong className="mt-2 text-[34px] leading-none font-extrabold tracking-tight tabular-nums text-rose-500">
          {Math.round(animOpenFaults)}
        </strong>
        <span className="mt-1.5 flex min-h-[22px] items-center">
          <Status
            color={data.detectedFaultsCount > 0 ? ROSE : GREEN}
            text={data.detectedFaultsCount > 0 ? 'Cần giao việc' : 'Đã giao hết'}
          />
        </span>
        <div className="mt-3">
          <Bar
            parts={[
              { width: pct(data.inRepairFaultsCount, data.openFaultsCount, 50), color: INDIGO },
              { width: pct(data.waitingRepairFaultsCount || 0, data.openFaultsCount, 20), color: BLUE },
              { width: pct(data.detectedFaultsCount, data.openFaultsCount, 30), color: ROSE },
            ]}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-slate-500">
          <span>
            Đang sửa <strong className="text-[#6C7BD8]">{data.inRepairFaultsCount}</strong>
            {data.waitingRepairFaultsCount != null && (
              <>
                {' '}
                · Chờ sửa <strong className="text-[#4A7AA3]">{data.waitingRepairFaultsCount}</strong>
              </>
            )}
          </span>
          <span>
            Chưa phân lịch <strong className="text-rose-500">{data.detectedFaultsCount}</strong>
          </span>
        </div>
      </button>

      {/* KPI 4: Cảnh báo bảo hành thiết bị */}
      <button type="button" onClick={onClickWarranty} style={{ '--i': 3 } as React.CSSProperties} className={CARD}>
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-slate-500">Cảnh báo bảo hành (≤ 90 ngày)</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDF0E4] text-[#D9895A]">
            <ShieldCheck className="w-[18px] h-[18px]" />
          </span>
        </div>
        <strong className="mt-2 text-[34px] leading-none font-extrabold tracking-tight tabular-nums text-[#D9895A]">
          {Math.round(animWarrantyAlert)}
        </strong>
        <span className="mt-1.5 flex min-h-[22px] items-center text-[12px] text-slate-500">Cần lập dự toán thay thế</span>
        <div className="mt-3">
          <Bar
            parts={[
              { width: pct(data.warrantyActiveCount, totalWarranty, 85), color: GREEN },
              { width: pct(data.warrantyExpiringCount, totalWarranty, 10), color: AMBER },
              { width: pct(data.warrantyExpiredCount, totalWarranty, 5), color: ROSE },
            ]}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-slate-500">
          <span>
            Đã hết hạn <strong className="text-rose-500">{data.warrantyExpiredCount}</strong> bóng
          </span>
          <span>
            Sắp hết <strong className="text-amber-600">{data.warrantyExpiringCount}</strong> bóng
          </span>
        </div>
      </button>
    </section>
  )
}
