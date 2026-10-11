import React from 'react'
import { Lock, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react'
import type { DecryptedPoleInfo } from '../../../utils/qrSecurity'

interface PoleInfoCardProps {
  poleInfo: DecryptedPoleInfo
}

export const PoleInfoCard: React.FC<PoleInfoCardProps> = ({ poleInfo }) => {
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
          <span>Đã xác thực QR</span>
        </span>
      </div>

      {/* Thông tin cố định (Read-Only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">
            Mã hiệu cột đèn:
          </span>
          <div className="flex items-center justify-between">
            <strong className="text-slate-900 dark:text-white font-mono font-bold text-xs sm:text-sm">
              {poleInfo.pole_code || '-'}
            </strong>
            <span title="Thông tin cố định từ mã QR" className="text-slate-400 dark:text-slate-500">
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
              {poleInfo.segment_name || '-'}
            </strong>
            <span title="Thông tin cố định từ mã QR" className="text-slate-400 dark:text-slate-500 shrink-0 ml-1">
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
              <span>{poleInfo.commune_name || '-'}</span>
            </div>
            <span title="Thông tin cố định từ mã QR" className="text-slate-400 dark:text-slate-500 shrink-0 ml-1">
              <Lock className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Ghi chú minh bạch */}
      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
        * Vị trí cột đèn được khóa cố định theo mã QR dán trên thân trụ nhằm đảm bảo đội kỹ thuật cơ động định vị chính xác vị trí cần sửa chữa.
      </p>
    </div>
  )
}
