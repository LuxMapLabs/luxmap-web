import React from 'react'
import { Lock, MapPin, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import type { PublicQrInfo } from '../../../types/public/qr'

interface PoleInfoCardProps {
  code: string
  poleInfo: PublicQrInfo | null
  isLoading?: boolean
  error?: string | null
}

export const PoleInfoCard: React.FC<PoleInfoCardProps> = ({
  code,
  poleInfo,
  isLoading = false,
  error = null,
}) => {
  // Trạng thái 1: Đang tra cứu API hoặc trạng thái ban đầu chưa có cả poleInfo lẫn error (Skeleton Loading cục bộ)
  if (isLoading || (!poleInfo && !error)) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs space-y-3 animate-pulse">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-700/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
          </div>
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>

          <div className="bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5 sm:col-span-2">
            <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>

        <div className="h-3 w-4/5 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    )
  }

  // Trạng thái 2: Có lỗi thật sự từ API (Lỗi 404 mã không tồn tại hoặc đã bị thu hồi)
  if (error) {
    return (
      <div className="bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 shadow-xs space-y-3 text-left">
        <div className="flex items-center justify-between pb-2.5 border-b border-rose-200/80 dark:border-rose-900/60">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-semibold text-xs sm:text-sm">
            <div className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
            <span>Vị trí cột đèn phản ánh</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800/80 px-2 py-0.5 rounded-full">
            <span>Mã không hợp lệ</span>
          </span>
        </div>

        <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-rose-200/60 dark:border-rose-900/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Mã tem kiểm tra:
            </span>
            <strong className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {code || 'Không có mã'}
            </strong>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
            {error || 'Mã QR tem cột đèn này không tồn tại trong hệ thống hoặc đã bị thu hồi.'}
          </p>
        </div>

        <p className="text-[10.5px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
          * Vui lòng kiểm tra lại tem dán trên thân trụ đèn hoặc liên hệ đơn vị vận hành chiếu sáng địa phương để được hỗ trợ.
        </p>
      </div>
    )
  }

  // Trạng thái 3: Tra cứu thành công (200 OK)
  return (
    <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Header card with security badge */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-slate-700/70">
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span>Vị trí cột đèn phản ánh</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          <span>Mã QR hợp lệ</span>
        </span>
      </div>

      {/* Thông tin vị trí cột nhận từ Backend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">
            Mã tem cột đèn:
          </span>
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm">
              {code || '-'}
            </strong>
            <span title="Mã bảo mật định danh từ tem quét" className="text-slate-400 dark:text-slate-500">
              <Lock className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">
            Tuyến đường:
          </span>
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 dark:text-white font-medium text-xs truncate">
              {poleInfo?.segment_name || '-'}
            </strong>
            <span title="Thông tin vị trí do cơ quan quản lý xác lập" className="text-slate-400 dark:text-slate-500 shrink-0 ml-1">
              <Lock className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 sm:col-span-2">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">
            Địa bàn quản lý:
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium text-xs truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>{poleInfo?.commune_name || '-'}</span>
            </div>
            <span title="Thông tin vị trí do cơ quan quản lý xác lập" className="text-slate-400 dark:text-slate-500 shrink-0 ml-1">
              <Lock className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Ghi chú */}
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
        * Vị trí cột đèn được định vị chính xác theo tem quét giúp đội kỹ thuật cơ động nhanh chóng kiểm tra và khắc phục sự cố.
      </p>
    </div>
  )
}
