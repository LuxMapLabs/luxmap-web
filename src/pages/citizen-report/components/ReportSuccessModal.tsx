import React from 'react'
import { CheckCircle, ShieldCheck } from 'lucide-react'
import type { CitizenReportResponse } from '../../../feature/citizen-report/citizenReportAPI'

interface ReportSuccessModalProps {
  result: CitizenReportResponse
  onNewReport?: () => void
}

export const ReportSuccessModal: React.FC<ReportSuccessModalProps> = ({ result }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Animated Check Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle className="w-9 h-9" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Gửi Phản Ánh Thành Công!
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {result.message}
          </p>
        </div>

        {/* Thông tin biên nhận phiếu */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs text-left">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Mã tiếp nhận:</span>
            <strong className="text-slate-900 dark:text-white font-mono text-xs sm:text-sm">
              {result.report_id}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-700/60">
            <span className="text-slate-500 dark:text-slate-400">Cột đèn:</span>
            <strong className="text-slate-900 dark:text-white font-medium">
              {result.pole_code}
            </strong>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500 dark:text-slate-400">Thời gian gửi:</span>
            <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
              {new Date(result.submitted_at).toLocaleString('vi-VN')}
            </span>
          </div>
        </div>

        {/* Thông điệp từ ban quản lý */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/60 dark:border-blue-800/40 text-left text-xs text-blue-900 dark:text-blue-300">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            Thông tin đã được chuyển vào hàng đợi tiếp nhận để điều phối tổ kỹ thuật kiểm tra và xử lý kịp thời. Cảm ơn sự chung tay của bạn vì an toàn giao thông cộng đồng!
          </span>
        </div>

        {/* Lời nhắn hoàn tất hành trình dành cho người dân */}
        <div className="pt-2 text-center border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Thông tin đã được ghi nhận. Bạn có thể thoát trình duyệt hoặc khóa màn hình điện thoại để tiếp tục hành trình.
          </p>
        </div>
      </div>
    </div>
  )
}
