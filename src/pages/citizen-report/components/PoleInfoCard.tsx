import React from 'react'
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
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
      <div className="rounded-2xl border border-[#1f3864]/15 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded-md" />
          <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>

        <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-2">
          <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
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

  const poleCode = poleInfo?.external_ref?.trim() || ''
  const note = poleInfo?.note?.trim() || ''

  // Trạng thái 3: Tra cứu thành công (200 OK)
  return (
    <div className="rounded-2xl border border-[#1f3864]/15 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs">
      {/* Header card with status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
          Cột đèn bạn đang báo
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
          <CheckCircle2 className="w-3 h-3" />
          <span>Mã QR hợp lệ</span>
        </span>
      </div>

      {/* Biển mã cột */}
      <div className="rounded-xl bg-[#1f3864] px-4 py-3">
        <span className="text-[11px] font-medium text-[#c7d3ea] block">Mã cột</span>
        <p className="text-2xl font-extrabold text-white tracking-wide truncate">
          {poleCode || '-'}
        </p>
      </div>

      {/* Danh sách thông tin */}
      <dl className="space-y-2 text-xs">
        <div className="grid grid-cols-[88px_1fr] gap-2 items-start">
          <dt className="text-slate-500 dark:text-slate-400">Tuyến đường</dt>
          <dd className="font-semibold text-slate-900 dark:text-white truncate">
            {poleInfo?.segment_name || '-'}
          </dd>
        </div>

        <div className="grid grid-cols-[88px_1fr] gap-2 items-start">
          <dt className="text-slate-500 dark:text-slate-400">Địa bàn</dt>
          <dd className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-medium truncate">
            <MapPin className="w-3.5 h-3.5 text-[#1f3864] dark:text-blue-300 shrink-0" />
            <span>{poleInfo?.commune_name || '-'}</span>
          </dd>
        </div>

        <div className="grid grid-cols-[88px_1fr] gap-2 items-start">
          <dt className="text-slate-500 dark:text-slate-400">Ghi chú</dt>
          <dd className="text-slate-700 dark:text-slate-300 line-clamp-3 break-words">
            {note || '-'}
          </dd>
        </div>
      </dl>
    </div>
  )
}
