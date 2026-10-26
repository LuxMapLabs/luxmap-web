import React from 'react'
import { AlertOctagon, RefreshCw, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { JobStatusItem, StorageSummary } from '../../../types/admin/system'

interface IncidentBannerProps {
  jobs: JobStatusItem[]
  storage?: StorageSummary
  lockedUsersCount?: number
  onRefresh: () => void
  isRefreshing: boolean
}

export const IncidentBanner: React.FC<IncidentBannerProps> = ({
  jobs,
  storage,
  onRefresh,
  isRefreshing,
}) => {
  const failingJobs = jobs.filter((j) => j.state === 'failing')
  const stalledJobs = jobs.filter((j) => j.state === 'stalled')
  const isDiskLow = storage?.disk?.low ?? false

  const totalIncidents = failingJobs.length + stalledJobs.length + (isDiskLow ? 1 : 0)

  // Trường hợp có biến cố / sự cố
  if (totalIncidents > 0) {
    return (
      <div className="p-5 rounded-3xl bg-rose-50/90 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 shadow-md animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-rose-950 dark:text-rose-100 uppercase tracking-wide">
                  Trung Tâm Cảnh Báo Biến Cố Khẩn Cấp ({totalIncidents} sự cố cần chú ý)
                </h3>
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-rose-800 dark:text-rose-200">
                {isDiskLow && (
                  <li className="flex items-center gap-1.5 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                    <span>Dung lượng ổ cứng máy chủ đã rơi vào vùng nguy hiểm (Dưới ngưỡng an toàn). Cần dọn dẹp hoặc mở rộng dung lượng.</span>
                  </li>
                )}
                {failingJobs.map((j) => (
                  <li key={j.name} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                    <span>
                      Tiến trình nền <strong className="font-mono">{j.name}</strong> đã thất bại {j.consecutive_failures ?? 1} lần liên tiếp
                      {j.last_error ? `: "${j.last_error}"` : '.'}
                    </span>
                  </li>
                ))}
                {stalledJobs.map((j) => (
                  <li key={j.name} className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                    <span>
                      Tiến trình nền <strong className="font-mono">{j.name}</strong> đang bị kẹt (Stalled lease). Không có worker nào tiếp nhận.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center shrink-0">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-100/50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Kiểm tra lại</span>
            </button>
            <Link
              to="/admin/settings"
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-600/30"
            >
              <span>Xử lý ngay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Nếu không có sự cố nào: Không hiển thị banner, trả về null để giao diện thoáng đãng
  return null
}
