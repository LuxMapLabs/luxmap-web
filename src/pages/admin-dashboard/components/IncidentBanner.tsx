import React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { JobStatusItem, StorageSummary } from '../../../types/admin/system'

interface IncidentBannerProps {
  jobs: JobStatusItem[]
  storage?: StorageSummary
  onSelectJob?: (job: JobStatusItem) => void
}

interface AttentionItem {
  key: string
  tone: 'danger' | 'warning'
  title: string
  detail: string
  to?: string
  job?: JobStatusItem
}

export const IncidentBanner: React.FC<IncidentBannerProps> = ({ jobs, storage, onSelectJob }) => {
  const items: AttentionItem[] = []

  if (storage?.disk?.low) {
    items.push({
      key: 'disk-low',
      tone: 'danger',
      title: 'Ổ cứng máy chủ sắp đầy',
      detail: 'Dung lượng khả dụng dưới ngưỡng an toàn. Cần dọn dẹp hoặc mở rộng.',
      to: '/admin/settings',
    })
  }

  jobs
    .filter((j) => j.state === 'failing')
    .forEach((j) => {
      items.push({
        key: `failing-${j.name}`,
        tone: 'danger',
        title: `Worker ${j.name || '-'} thất bại`,
        detail: `${j.consecutive_failures ?? 1} lần liên tiếp${j.last_error ? `: ${j.last_error}` : '.'}`,
        job: j,
      })
    })

  jobs
    .filter((j) => j.state === 'stalled')
    .forEach((j) => {
      items.push({
        key: `stalled-${j.name}`,
        tone: 'warning',
        title: `Worker ${j.name || '-'} bị kẹt`,
        detail: 'Không có worker nào tiếp nhận tiến trình này.',
        job: j,
      })
    })

  return (
    <section className="glass-tile glass-lift p-5 h-full select-none">
      <h2 className="text-[13px] text-slate-500 dark:text-slate-400">Cần chú ý</h2>

      {items.length === 0 ? (
        <div className="mt-4 flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Không có mục nào cần xử lý</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Worker và dung lượng đều trong ngưỡng an toàn.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.map((item) => (
            <li key={item.key} className="glass-item flex items-center gap-3 px-3.5 py-3">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.tone === 'danger' ? 'bg-danger' : 'bg-warning'}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
              </div>
              {item.to ? (
                <Link to={item.to} className="glass-btn">
                  Xử lý
                </Link>
              ) : (
                <button type="button" className="glass-btn" onClick={() => item.job && onSelectJob?.(item.job)}>
                  Xem
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
