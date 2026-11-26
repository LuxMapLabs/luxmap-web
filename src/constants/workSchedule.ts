import { createElement } from 'react'
import { ScanLine, ClipboardCheck, Wrench, MapPinned, type LucideIcon } from 'lucide-react'
import type { TaskKind } from '../types/common/enums'

// Màu khớp màu giai đoạn trên lịch: Khảo sát vàng, Kiểm tra xanh dương, Sửa chữa xanh lá, Cập nhật vị trí tím
const PHASE_STYLE: Record<TaskKind, { Icon: LucideIcon; iconClassName: string }> = {
  survey: {
    Icon: ScanLine,
    iconClassName: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
  },
  inspection: {
    Icon: ClipboardCheck,
    iconClassName: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
  },
  repair: {
    Icon: Wrench,
    iconClassName: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
  },
  pole_gps_update: {
    Icon: MapPinned,
    iconClassName: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
  },
}

/**
 * Icon & màu ô icon của một giai đoạn công tác, dạng trường của OpsSelectOption.
 * Nguồn duy nhất cho dropdown "Tạo sự vụ" và bộ lọc giai đoạn trên lịch.
 */
export const phaseOptionIcon = (kind: TaskKind) => ({
  icon: createElement(PHASE_STYLE[kind].Icon, { className: 'w-3.5 h-3.5' }),
  iconClassName: PHASE_STYLE[kind].iconClassName,
})
