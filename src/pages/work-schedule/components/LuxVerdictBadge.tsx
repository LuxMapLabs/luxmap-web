import { luxVerdict, type LuxVerdictSource } from '../../../utils/work-schedule/luxVerdict'

const toneClass = {
  dim: 'bg-orange-100 text-orange-900 border-orange-300',
  normal: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  muted: 'bg-slate-100 text-slate-600 border-slate-200',
} as const

/** Nhãn kết luận độ sáng của một số đo lux, theo kết quả backend chấm (LUX-BASELINE). */
export default function LuxVerdictBadge({ photo }: { photo: LuxVerdictSource }) {
  const verdict = luxVerdict(photo)
  if (!verdict) return null
  return (
    <span
      className={`px-2 py-0.5 border font-bold text-[10px] rounded-md ${toneClass[verdict.tone]}`}
      title="Độ sáng so với baseline của chính cột này (backend chấm khi Quản lý xác nhận ảnh)"
    >
      {verdict.label}
    </span>
  )
}
