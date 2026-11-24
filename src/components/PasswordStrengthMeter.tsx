import React from 'react'
import { Check } from 'lucide-react'
import { PASSWORD_MIN_LENGTH } from '../validations/password.schema'
import { STRENGTH_MAX_LEVEL, type PasswordStrengthLevel } from '../utils/passwordStrength'
import { usePasswordStrength } from '../hooks/usePasswordStrength'

/** Màu từng bậc của thanh độ mạnh: đỏ, cam, vàng, xanh nhạt, xanh đậm */
const LEVEL_COLORS: Record<PasswordStrengthLevel, string> = {
  0: '#5d6679',
  1: '#d64545',
  2: '#e8833a',
  3: '#e2b631',
  4: '#7fb83f',
  5: '#1f9d6b',
}
const SEGMENTS = Array.from({ length: STRENGTH_MAX_LEVEL }, (_, i) => i + 1)

export interface PasswordStrengthMeterProps {
  password: string
  minLength?: number
}

/**
 * Thanh đo độ mạnh mật khẩu 5 bậc dùng chung (SetPasswordPage và tab Bảo mật của ProfileModal).
 */
export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  minLength = PASSWORD_MIN_LENGTH,
}) => {
  const strength = usePasswordStrength(password)
  const levelColor = LEVEL_COLORS[strength.level]

  return (
    <div className="mt-3" data-testid="password-strength">
      <div
        className="grid grid-cols-5 gap-[5px]"
        role="meter"
        aria-label="Độ mạnh mật khẩu"
        aria-valuemin={0}
        aria-valuemax={STRENGTH_MAX_LEVEL}
        aria-valuenow={strength.level}
        aria-valuetext={strength.label}
      >
        {SEGMENTS.map((n) => (
          <span
            key={n}
            className="h-2 rounded-[4px] bg-slate-900/10 dark:bg-slate-700 transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none"
            style={
              strength.level >= n
                ? { backgroundColor: levelColor, boxShadow: `0 0 10px ${levelColor}` }
                : undefined
            }
          />
        ))}
      </div>
      <div className="mt-2 flex min-h-[18px] justify-between text-[12.5px] text-slate-500 dark:text-slate-400">
        <span aria-live="polite">
          Độ mạnh:{' '}
          <b className="font-semibold" style={{ color: levelColor }}>
            {strength.label}
          </b>
        </span>
        <span className="tabular-nums">
          {password.length}/{minLength}
        </span>
      </div>
    </div>
  )
}

export const PasswordRuleItem: React.FC<{
  met: boolean
  className?: string
  children: React.ReactNode
}> = ({ met, className = '', children }) => (
  <li
    className={`flex items-center gap-2.5 ${
      met ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
    } ${className}`.trim()}
  >
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors motion-reduce:transition-none ${
        met
          ? 'border-[#1f9d6b] bg-[#1f9d6b] text-white'
          : 'border-slate-400/60 dark:border-slate-600 text-transparent'
      }`}
      aria-hidden="true"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
    <span>{children}</span>
    <span className="sr-only">{met ? 'đã đạt' : 'chưa đạt'}</span>
  </li>
)
