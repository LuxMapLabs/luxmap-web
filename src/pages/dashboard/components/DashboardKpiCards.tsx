import React from 'react'
import { Lightbulb, AlertTriangle, AlertOctagon, ShieldCheck } from 'lucide-react'

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
}

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  fixtureKpis,
  faultsCount,
  warrantyKpis,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tỷ lệ chiếu sáng bình thường */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Tỷ lệ sáng bình thường</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lightbulb className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 my-3">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
            {fixtureKpis.totalPoles > 0 ? `${fixtureKpis.normalPct}%` : '---'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
            {fixtureKpis.totalPoles > 0
              ? `${fixtureKpis.totalNormal} / ${fixtureKpis.totalPoles} cột`
              : 'Chưa có cột đèn'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span>Sáng yếu: <strong className="text-amber-600">{fixtureKpis.totalDim}</strong></span>
          <span>Mất sáng: <strong className="text-red-600">{fixtureKpis.totalOut}</strong></span>
          <span>Đạt chuẩn: <strong className="text-emerald-600">{fixtureKpis.normalPct}%</strong></span>
        </div>
      </div>

      {/* KPI 2: Sự cố đang tồn đọng */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Sự cố đang tồn đọng</span>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 my-3">
          <span className="text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
            {faultsCount}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
            Cần khắc phục
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-snug">
          {faultsCount > 0
            ? `Ghi nhận ${faultsCount} sự cố bóng đèn trên tuyến.`
            : 'Hiện không có sự cố nào chưa được khắc phục.'}
        </p>
      </div>

      {/* KPI 3: Mất sáng nghiêm trọng (Nguy cơ an toàn / Điểm mù) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Mất sáng nghiêm trọng</span>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 my-3">
          <span className="text-3xl font-extrabold text-rose-600 tracking-tight leading-none">
            {fixtureKpis.totalOut}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
            {fixtureKpis.outPct}% số cột
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${Math.min(100, Math.max(8, Number(fixtureKpis.outPct)))}%` }}
              className="bg-rose-500 rounded-full"
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 font-medium">
            <span>Sáng yếu: <strong className="text-amber-600 font-bold">{fixtureKpis.totalDim} cột</strong></span>
            <span className="text-rose-600 font-bold">Khẩn cấp</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Cảnh báo bảo hành (<= 30 ngày) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Bảo hành cần xử lý (≤ 1 tháng)</span>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2.5 my-3">
          <span className="text-3xl font-extrabold text-amber-600 tracking-tight leading-none">
            {warrantyKpis.itemsCount}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
            Bóng đèn
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
          <span>Đã quá hạn: <strong className="text-red-600 font-bold">{warrantyKpis.expiredCount}</strong></span>
          <span>Sắp hết (≤30đ): <strong className="text-amber-600 font-bold">{warrantyKpis.expiringCount}</strong></span>
        </div>
      </div>
    </div>
  )
}
