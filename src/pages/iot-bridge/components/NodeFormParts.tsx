import React from 'react'
import { inputClass } from './IotBridgeModal'

/** Nhóm trường có tiêu đề kèm icon: chia form dài thành các bước dễ quét (form đăng ký và sửa node dùng chung). */
export const FormSection: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <section className="space-y-3">
    <header className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100">
        {icon}
      </span>
      <h4 className="text-[13px] font-bold text-slate-900">{title}</h4>
      <span className="h-px flex-1 bg-slate-100" aria-hidden />
    </header>
    <div className="space-y-3">{children}</div>
  </section>
)

/** Ô số có đơn vị cố định bên phải; nhãn đọc màn hình giữ nguyên dạng "Điện áp (V)". */
export const UnitInput: React.FC<{
  label: string
  unit: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}> = ({ label, unit, value, placeholder, onChange }) => (
  <span className="relative block">
    <input
      aria-label={label}
      className={`${inputClass} pr-10`}
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
      {unit}
    </span>
  </span>
)

export const MAX_NODE_RADIUS_KM = 1000

/** Bán kính node: để trống = 0. Trả về null khi không hợp lệ (ngoài 0..1000 km hoặc không phải số). */
export const parseNodeRadiusKm = (text: string): number | null => {
  if (text.trim() === '') return 0
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 && n <= MAX_NODE_RADIUS_KM ? n : null
}

/** Ô nhập bán kính node (km), cùng kiểu với ô bán kính của server. */
export const NodeRadiusInput: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
  <span className="relative block">
    <input
      aria-label="Bán kính node (km)"
      type="number"
      inputMode="decimal"
      min={0}
      max={MAX_NODE_RADIUS_KM}
      step="any"
      className={`${inputClass} pr-10`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      aria-invalid={parseNodeRadiusKm(value) === null}
    />
    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-slate-400">
      km
    </span>
  </span>
)
