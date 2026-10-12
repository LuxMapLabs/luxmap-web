import React from 'react'
import { QrCode, AlertTriangle, RefreshCw } from 'lucide-react'

interface InvalidQrAlertProps {
  errorMessage?: string | null
}

export const InvalidQrAlert: React.FC<InvalidQrAlertProps> = ({ errorMessage }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">
            Không Lấy Được Thông Tin Trụ Đèn
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {errorMessage ||
              'Không lấy được thông tin trụ đèn. Vui lòng quét lại mã QR dán trên thân cột đèn.'}
          </p>
        </div>

        {/* Hướng dẫn người dân */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl text-left border border-slate-200/80 dark:border-slate-700/80 space-y-2 text-xs">
          <strong className="text-slate-800 dark:text-slate-200 flex items-center gap-1.5 font-semibold">
            <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Cách xử lý:</span>
          </strong>
          <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-300">
            <li>Mở camera điện thoại hoặc ứng dụng Zalo để quét lại mã QR dán trên thân cột đèn.</li>
            <li>Giữ chắc tay và hướng ống kính rõ nét vào tem QR.</li>
            <li>Chạm vào thông báo mở liên kết vừa hiện lên trên màn hình điện thoại.</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-xs sm:text-sm transition shadow-md cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      </div>
    </div>
  )
}
