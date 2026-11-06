import React from 'react'
import { Lightbulb, Clock, AlertTriangle, ShieldCheck, ArrowUpRight } from 'lucide-react'

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
          <div key={i} className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs animate-pulse flex flex-col justify-between h-40">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="w-9 h-9 bg-slate-200 rounded-xl" />
            </div>
            <div className="h-8 w-20 bg-slate-200 rounded" />
            <div className="h-2 w-full bg-slate-200 rounded-full" />
            <div className="h-3 w-32 bg-slate-200 rounded" />
          </div>
        ))}
      </section>
    )
  }

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tỷ lệ chiếu sáng đạt chuẩn */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClickLighting}
        onKeyDown={(e) => e.key === 'Enter' && onClickLighting?.()}
        className="group relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-400 cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
            Tỷ lệ chiếu sáng đạt chuẩn
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem biểu đồ <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 group-hover:scale-105 transition-all">
              <Lightbulb className="w-5 h-5 fill-emerald-600/20" />
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 my-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
              {data.normalPct.toFixed(1)}%
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {data.normalCount} / {data.totalPoles} cột
            </span>
          </div>
          {/* Badge xu hướng */}
          <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/50 hidden sm:inline">
            ▲ +2.4% tuần
          </span>
        </div>

        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2.5 shadow-2xs">
          <div style={{ width: `${normalWidth}%` }} className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full transition-all duration-300" />
          <div style={{ width: `${dimWidth}%` }} className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-300" />
          <div style={{ width: `${outWidth}%` }} className="bg-gradient-to-r from-rose-400 to-rose-600 h-full transition-all duration-300" />
          <div style={{ width: `${unknownWidth}%` }} className="bg-slate-300 h-full transition-all duration-300" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Sáng yếu: <strong className="text-amber-600 font-bold">{data.dimCount}</strong> • Tắt: <strong className="text-rose-600 font-bold">{data.outCount}</strong>
          </span>
          <span>
            Chưa quét: <strong className="text-slate-600">{data.unknownCount} cột</strong>
          </span>
        </div>
      </div>

      {/* KPI 2: Chỉ số Tuân thủ SLA Sửa chữa */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClickSla}
        onKeyDown={(e) => e.key === 'Enter' && onClickSla?.()}
        className="group relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-400 cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 group-hover:text-blue-700 transition-colors">
            Tỷ lệ sửa chữa đúng hạn (SLA)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem SLA <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:scale-105 transition-all">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 my-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black text-blue-700 tracking-tight font-mono">
              {data.slaRate.toFixed(1)}%
            </span>
          </div>
          {/* Badge định mức SLA */}
          <span className="text-[10.5px] font-bold text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-200/50 hidden sm:inline">
            {data.slaRate >= 95 ? 'Đạt chuẩn ≥95%' : 'Cần cải thiện'}
          </span>
        </div>

        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2.5 shadow-2xs">
          <div style={{ width: `${slaOntimeWidth}%` }} className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300" />
          <div style={{ width: `${slaLateWidth}%` }} className="bg-gradient-to-r from-amber-400 to-amber-500 h-full transition-all duration-300" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Trễ hạn: <strong className="text-amber-600 font-bold">{data.slaLateCount} lệnh</strong>
          </span>
          <span>
            Quá hạn mở: <strong className="text-rose-600 font-bold">{data.slaOverdueCount} lệnh</strong>
          </span>
        </div>
      </div>

      {/* KPI 3: Sự cố đang mở */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClickFaults}
        onKeyDown={(e) => e.key === 'Enter' && onClickFaults?.()}
        className="group relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-rose-400 cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 group-hover:text-rose-700 transition-colors">
            {isSegmentFiltered ? 'Sự cố đang mở trên tuyến' : 'Sự cố đang mở trong xã'}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem sự cố <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-100 group-hover:scale-105 transition-all">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 my-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight font-mono">
              {data.openFaultsCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
              {data.criticalFaultsCount} nghiêm trọng
            </span>
          </div>
          {data.detectedFaultsCount > 0 ? (
            <span className="text-[10.5px] font-bold text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded-md border border-rose-200/50 hidden sm:inline">
              Cần giao việc
            </span>
          ) : (
            <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-md border border-emerald-200/50 hidden sm:inline">
              Đã giao hết
            </span>
          )}
        </div>

        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2.5 shadow-2xs">
          <div
            style={{
              width: data.openFaultsCount > 0 ? `${(data.inRepairFaultsCount / data.openFaultsCount) * 100}%` : '50%',
            }}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full transition-all duration-300"
            title={`Đang sửa chữa: ${data.inRepairFaultsCount}`}
          />
          <div
            style={{
              width:
                data.openFaultsCount > 0
                  ? `${((data.waitingRepairFaultsCount || 0) / data.openFaultsCount) * 100}%`
                  : '20%',
            }}
            className="bg-gradient-to-r from-blue-400 to-blue-500 h-full transition-all duration-300"
            title={`Chờ sửa chữa: ${data.waitingRepairFaultsCount || 0}`}
          />
          <div
            style={{
              width: data.openFaultsCount > 0 ? `${(data.detectedFaultsCount / data.openFaultsCount) * 100}%` : '30%',
            }}
            className="bg-gradient-to-r from-rose-400 to-rose-600 h-full transition-all duration-300"
            title={`Chưa phân lịch: ${data.detectedFaultsCount}`}
          />
        </div>

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
      </div>

      {/* KPI 4: Cảnh báo bảo hành thiết bị */}
      <div
        role="button"
        tabIndex={0}
        onClick={onClickWarranty}
        onKeyDown={(e) => e.key === 'Enter' && onClickWarranty?.()}
        className="group relative overflow-hidden bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-amber-400 cursor-pointer text-left"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 group-hover:text-amber-700 transition-colors">
            Cảnh báo bảo hành (≤ 90 ngày)
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
              Xem bảo hành <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-100 group-hover:scale-105 transition-all">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-2 my-2.5">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight font-mono">
              {data.warrantyAlertCount}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
              Cần lập dự toán
            </span>
          </div>
          <span className="text-[10.5px] font-bold text-amber-700 bg-amber-50/80 px-2 py-0.5 rounded-md border border-amber-200/50 hidden sm:inline">
            Theo dõi Quý
          </span>
        </div>

        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex mb-2.5 shadow-2xs">
          <div style={{ width: `${activeWWidth}%` }} className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full" />
          <div style={{ width: `${expiringWWidth}%` }} className="bg-gradient-to-r from-amber-400 to-amber-500 h-full" />
          <div style={{ width: `${expiredWWidth}%` }} className="bg-gradient-to-r from-rose-400 to-rose-600 h-full" />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>
            Đã hết hạn: <strong className="text-rose-600 font-bold">{data.warrantyExpiredCount} bóng</strong>
          </span>
          <span>
            Sắp hết hạn: <strong className="text-amber-600 font-bold">{data.warrantyExpiringCount} bóng</strong>
          </span>
        </div>
      </div>
    </section>
  )
}


