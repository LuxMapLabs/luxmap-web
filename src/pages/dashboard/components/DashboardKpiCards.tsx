import React from 'react'
import { Lightbulb, AlertTriangle, AlertOctagon, ShieldCheck, ArrowDownRight } from 'lucide-react'

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

export const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  fixtureKpis,
  faultsCount,
  warrantyKpis,
  onClickNormal,
  onClickPendingFaults,
  onClickSevereFaults,
  onClickWarranty,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Tỷ lệ chiếu sáng bình thường -> Trỏ xuống Biểu đồ */}
      <div
        onClick={onClickNormal}
        title="Bấm để cuộn xuống xem Biểu đồ phân tích chiếu sáng"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-lg hover:border-emerald-400 hover:-translate-y-1 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700 transition-colors">
              Tỷ lệ sáng bình thường
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-105 transition-all">
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
          <span className="text-emerald-600 font-bold group-hover:underline flex items-center gap-0.5">
            Xem biểu đồ ↘
          </span>
        </div>
      </div>

      {/* KPI 2: Sự cố đang tồn đọng -> Trỏ xuống Bảng giám sát sự cố (Tất cả) */}
      <div
        onClick={onClickPendingFaults}
        title="Bấm để cuộn xuống Bảng giám sát sự cố bóng đèn (Tất cả sự cố)"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-lg hover:border-rose-400 hover:-translate-y-1 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-700 transition-colors">
              Sự cố đang tồn đọng
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 group-hover:scale-105 transition-all">
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
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100 pt-2 font-medium">
          <span className="truncate max-w-[150px]">
            {faultsCount > 0 ? `Ghi nhận ${faultsCount} sự cố` : 'Không có sự cố'}
          </span>
          <span className="text-rose-600 font-bold group-hover:underline flex items-center gap-0.5">
            Xem sự cố ↘
          </span>
        </div>
      </div>

      {/* KPI 3: Mất sáng nghiêm trọng -> Trỏ xuống Bảng sự cố và chuyển tab Mất sáng hoàn toàn */}
      <div
        onClick={onClickSevereFaults}
        title="Bấm để cuộn xuống Bảng sự cố và lọc các cột Mất sáng hoàn toàn"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-lg hover:border-rose-500 hover:-translate-y-1 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-700 transition-colors">
              Mất sáng nghiêm trọng
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-rose-600 transition-colors" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 group-hover:scale-105 transition-all">
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
            <span className="text-rose-600 font-bold group-hover:underline">Lọc mất sáng ↘</span>
          </div>
        </div>
      </div>

      {/* KPI 4: Cảnh báo bảo hành (<= 30 ngày) -> Trỏ xuống Bảng bảo hành */}
      <div
        onClick={onClickWarranty}
        title="Bấm để cuộn xuống Bảng theo dõi bảo hành"
        className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-lg hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer group active:scale-[0.98]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition-colors">
              Bảo hành cần xử lý (≤ 1 tháng)
            </span>
            <ArrowDownRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 group-hover:scale-105 transition-all">
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
        <div className="flex justify-between text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-2">
          <span>Quá hạn: <strong className="text-red-600 font-bold">{warrantyKpis.expiredCount}</strong></span>
          <span className="text-amber-600 font-bold group-hover:underline">Xem bảo hành ↘</span>
        </div>
      </div>
    </div>
  )
}

