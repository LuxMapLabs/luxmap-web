import React from 'react'
import { Lightbulb, Clock, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react'
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

export const SuperiorKpiGrid: React.FC<SuperiorKpiGridProps> = ({
  data,
  loading = false,
  isSegmentFiltered = false,
  onClickLighting,
  onClickSla,
  onClickFaults,
  onClickWarranty,
}) => {
  // Animated numbers
  const animNormalPct = useCountUp(data.normalPct)
  const animSlaRate = useCountUp(data.slaRate)
  const animOpenFaults = useCountUp(data.openFaultsCount)
  const animWarrantyAlert = useCountUp(data.warrantyAlertCount)

  // Tính toán tỷ lệ phần trăm các dải màu progress bar
  const normalWidth = data.totalPoles > 0 ? (data.normalCount / data.totalPoles) * 100 : 0
  const dimWidth = data.totalPoles > 0 ? (data.dimCount / data.totalPoles) * 100 : 0
  const outWidth = data.totalPoles > 0 ? (data.outCount / data.totalPoles) * 100 : 0
  const unknownWidth = data.totalPoles > 0 ? (data.unknownCount / data.totalPoles) * 100 : 0

  const slaOntimeWidth = data.slaTotalFinished > 0 ? (data.slaOnTimeCount / data.slaTotalFinished) * 100 : 100
  const slaLateWidth = data.slaTotalFinished > 0 ? (data.slaLateCount / data.slaTotalFinished) * 100 : 0

  const totalWarranty = data.warrantyActiveCount + data.warrantyExpiringCount + data.warrantyExpiredCount
  const activeWWidth = totalWarranty > 0 ? (data.warrantyActiveCount / totalWarranty) * 100 : 85
  const expiringWWidth = totalWarranty > 0 ? (data.warrantyExpiringCount / totalWarranty) * 100 : 10
  const expiredWWidth = totalWarranty > 0 ? (data.warrantyExpiredCount / totalWarranty) * 100 : 5

  if (loading) {
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 animate-pulse flex flex-col justify-between h-44"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="w-11 h-11 bg-slate-200 rounded-[14px]" />
            </div>
            <div className="h-9 w-24 bg-slate-200 rounded" />
            <div className="h-1.5 w-full bg-slate-200 rounded-full" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tỷ lệ chiếu sáng đạt chuẩn */}
      <button
        type="button"
        onClick={onClickLighting}
        style={{ '--i': 0 } as React.CSSProperties}
        className="ops-rise group relative overflow-hidden bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-ops-hover cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
            Tỷ lệ chiếu sáng đạt chuẩn
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem biểu đồ <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50 text-emerald-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Lightbulb className="w-5 h-5 fill-emerald-600/20" />
            </span>
          </div>
        </div>

        <div className="my-2.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <strong className="text-[32px] leading-[1.15] font-extrabold tracking-tight tabular-nums text-slate-900">
              {animNormalPct.toFixed(1)}%
            </strong>
            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/50">
              ▲ +2.4% tuần
            </span>
          </div>
          <div className="flex items-center">
            <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {data.normalCount} / {data.totalPoles} cột
            </span>
          </div>
        </div>

        <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
          <span style={{ width: `${normalWidth}%` }} className="ops-grow ops-shine bg-emerald-500 h-full" />
          <span style={{ width: `${dimWidth}%` }} className="ops-grow ops-shine bg-amber-500 h-full" />
          <span style={{ width: `${outWidth}%` }} className="ops-grow ops-shine bg-rose-500 h-full" />
          <span style={{ width: `${unknownWidth}%` }} className="ops-grow ops-shine bg-slate-300 h-full" />
        </span>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Sáng yếu: <strong className="text-amber-600 font-bold">{data.dimCount}</strong> • Tắt: <strong className="text-rose-600 font-bold">{data.outCount}</strong>
          </span>
          <span>
            Chưa quét: <strong className="text-slate-600">{data.unknownCount} cột</strong>
          </span>
        </div>
      </button>

      {/* KPI 2: Chỉ số Tuân thủ SLA Sửa chữa */}
      <button
        type="button"
        onClick={onClickSla}
        style={{ '--i': 1 } as React.CSSProperties}
        className="ops-rise group relative overflow-hidden bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-ops-hover cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-slate-500 group-hover:text-blue-700 transition-colors">
            Tỷ lệ sửa chữa đúng hạn (SLA)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem SLA <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-blue-50 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Clock className="w-5 h-5" />
            </span>
          </div>
        </div>

        <div className="my-2.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <strong className="text-[32px] leading-[1.15] font-extrabold tracking-tight tabular-nums text-blue-700">
              {animSlaRate.toFixed(1)}%
            </strong>
            <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200/50">
              {data.slaRate >= 95 ? 'Đạt chuẩn ≥95%' : 'Cần cải thiện'}
            </span>
          </div>
          <div className="flex items-center">
            <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
              {data.slaOnTimeCount} / {data.slaTotalFinished} lệnh đúng hạn
            </span>
          </div>
        </div>

        <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
          <span style={{ width: `${slaOntimeWidth}%` }} className="ops-grow ops-shine bg-blue-600 h-full" />
          <span style={{ width: `${slaLateWidth}%` }} className="ops-grow ops-shine bg-amber-500 h-full" />
        </span>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Trễ hạn: <strong className="text-amber-600 font-bold">{data.slaLateCount} lệnh</strong>
          </span>
          <span>
            Quá hạn mở: <strong className="text-rose-600 font-bold">{data.slaOverdueCount} lệnh</strong>
          </span>
        </div>
      </button>

      {/* KPI 3: Sự cố đang mở */}
      <button
        type="button"
        onClick={onClickFaults}
        style={{ '--i': 2 } as React.CSSProperties}
        className="ops-rise group relative overflow-hidden bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-ops-hover cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-slate-500 group-hover:text-rose-700 transition-colors">
            {isSegmentFiltered ? 'Sự cố đang mở trên tuyến' : 'Sự cố đang mở trong xã'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem sự cố <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-red-50 text-red-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
        </div>

        <div className="my-2.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <strong className="text-[32px] leading-[1.15] font-extrabold tracking-tight tabular-nums text-red-600">
              {Math.round(animOpenFaults)}
            </strong>
            {data.detectedFaultsCount > 0 ? (
              <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-md border border-rose-200/50">
                Cần giao việc
              </span>
            ) : (
              <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/50">
                Đã giao hết
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
              {data.criticalFaultsCount} nghiêm trọng
            </span>
          </div>
        </div>

        <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
          <span
            style={{
              width: data.openFaultsCount > 0 ? `${(data.inRepairFaultsCount / data.openFaultsCount) * 100}%` : '50%',
            }}
            className="ops-grow ops-shine bg-indigo-500 h-full"
            title={`Đang sửa chữa: ${data.inRepairFaultsCount}`}
          />
          <span
            style={{
              width:
                data.openFaultsCount > 0
                  ? `${((data.waitingRepairFaultsCount || 0) / data.openFaultsCount) * 100}%`
                  : '20%',
            }}
            className="ops-grow ops-shine bg-blue-500 h-full"
            title={`Chờ sửa chữa: ${data.waitingRepairFaultsCount || 0}`}
          />
          <span
            style={{
              width: data.openFaultsCount > 0 ? `${(data.detectedFaultsCount / data.openFaultsCount) * 100}%` : '30%',
            }}
            className="ops-grow ops-shine bg-rose-500 h-full"
            title={`Chưa phân lịch: ${data.detectedFaultsCount}`}
          />
        </span>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Đang sửa: <strong className="text-indigo-600 font-bold">{data.inRepairFaultsCount}</strong>
            {data.waitingRepairFaultsCount != null && (
              <> • Chờ sửa: <strong className="text-blue-600 font-bold">{data.waitingRepairFaultsCount}</strong></>
            )}
          </span>
          <span>
            Chưa phân lịch: <strong className="text-rose-600 font-bold">{data.detectedFaultsCount} sự cố</strong>
          </span>
        </div>
      </button>

      {/* KPI 4: Cảnh báo bảo hành thiết bị */}
      <button
        type="button"
        onClick={onClickWarranty}
        style={{ '--i': 3 } as React.CSSProperties}
        className="ops-rise group relative overflow-hidden bg-white rounded-[20px] shadow-ops border border-slate-200/80 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-ops-hover cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] font-semibold text-slate-500 group-hover:text-amber-700 transition-colors">
            Cảnh báo bảo hành (≤ 90 ngày)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem bảo hành <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-amber-50 text-amber-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <ShieldCheck className="w-5 h-5" />
            </span>
          </div>
        </div>

        <div className="my-2.5 flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <strong className="text-[32px] leading-[1.15] font-extrabold tracking-tight tabular-nums text-amber-600">
              {Math.round(animWarrantyAlert)}
            </strong>
            <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/50">
              Theo dõi Quý
            </span>
          </div>
          <div className="flex items-center">
            <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
              Cần lập dự toán
            </span>
          </div>
        </div>

        <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100 mb-2.5">
          <span style={{ width: `${activeWWidth}%` }} className="ops-grow ops-shine bg-emerald-500 h-full" />
          <span style={{ width: `${expiringWWidth}%` }} className="ops-grow ops-shine bg-amber-500 h-full" />
          <span style={{ width: `${expiredWWidth}%` }} className="ops-grow ops-shine bg-rose-500 h-full" />
        </span>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Đã hết hạn: <strong className="text-rose-600 font-bold">{data.warrantyExpiredCount} bóng</strong>
          </span>
          <span>
            Sắp hết hạn: <strong className="text-amber-600 font-bold">{data.warrantyExpiringCount} bóng</strong>
          </span>
        </div>
      </button>
    </section>
  )
}
