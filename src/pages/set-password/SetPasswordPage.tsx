import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { RootState } from '../../redux/rootReducer'
import { resetPasswordState, setPasswordRequest } from '../../feature/password/passwordSlice'
import { PASSWORD_MIN_LENGTH, setPasswordSchema } from '../../validations/password.schema'
import { hasAllCharacterTypes } from '../../utils/passwordStrength'
import { PasswordRuleItem, PasswordStrengthMeter } from '../../components/PasswordStrengthMeter'
import {
  AuthPageShell,
  INPUT_ERROR,
  INPUT_OK,
  INPUT_WRAP,
  PRIMARY_BUTTON,
} from '../../components/AuthPageShell'

const INPUT_CLASS =
  'h-[46px] w-full min-w-0 bg-transparent pl-3.5 pr-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50'

const ToggleVisibility: React.FC<{ shown: boolean; onToggle: () => void }> = ({ shown, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
    className="absolute right-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-slate-500 transition-colors hover:bg-slate-900/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f3864]"
  >
    {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
)

export const SetPasswordPage: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = (searchParams.get('token') || '').trim()

  const { isSubmitting, isSuccess, error } = useSelector((state: RootState) => state.password)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [capsLockActive, setCapsLockActive] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    dispatch(resetPasswordState())
    return () => {
      dispatch(resetPasswordState())
    }
  }, [dispatch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = setPasswordSchema.safeParse({ newPassword, confirmPassword })
    if (!result.success) {
      const errors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = String(issue.path[0] ?? '')
        if (key && !errors[key]) errors[key] = issue.message
      }
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    dispatch(setPasswordRequest({ token, new_password: result.data.newPassword }))
  }

  const trackCapsLock = (e: React.KeyboardEvent) => setCapsLockActive(e.getModifierState('CapsLock'))

  if (!token) {
    return (
      <AuthPageShell>
        <div className="space-y-5 text-center" role="alert">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#d64545] text-white shadow-[0_0_0_8px_rgba(214,69,69,0.14)]">
            <AlertCircle className="h-7 w-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">Liên kết không hợp lệ</h1>
            <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-slate-500">
              Liên kết thiếu mã xác thực. Hãy mở lại đúng liên kết trong email, hoặc yêu cầu gửi lại liên kết mới.
            </p>
          </div>
          <Link to="/login" className={PRIMARY_BUTTON}>
            Về trang đăng nhập
          </Link>
        </div>
      </AuthPageShell>
    )
  }

  if (isSuccess) {
    return (
      <AuthPageShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1f9d6b] text-white shadow-[0_0_0_8px_rgba(31,157,107,0.15)]">
            <Check className="h-7 w-7" strokeWidth={3} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold">Đã đặt mật khẩu</h1>
            <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-slate-500">
              Bạn có thể đăng nhập bằng email và mật khẩu vừa tạo.
            </p>
          </div>
          <button type="button" onClick={() => navigate('/login')} className={PRIMARY_BUTTON}>
            Đăng nhập
          </button>
        </div>
      </AuthPageShell>
    )
  }

  const lengthMet = newPassword.length >= PASSWORD_MIN_LENGTH
  const matchMet = confirmPassword.length > 0 && confirmPassword === newPassword

  return (
    <AuthPageShell>
      <h1 className="mb-1.5 text-2xl font-bold leading-tight">Đặt mật khẩu cho tài khoản</h1>
      <p className="mb-6 max-w-[36ch] text-sm leading-relaxed text-slate-500">
        Chọn mật khẩu mới để đăng nhập vào LuxMap.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[13px] text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">{error}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-semibold">
            Mật khẩu mới
          </label>
          <div className={`${INPUT_WRAP} ${fieldErrors.newPassword ? INPUT_ERROR : INPUT_OK}`}>
            <input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={trackCapsLock}
              onKeyUp={trackCapsLock}
              disabled={isSubmitting}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`}
              className={INPUT_CLASS}
            />
            <ToggleVisibility shown={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
          {fieldErrors.newPassword ? <p className="mt-1.5 text-xs text-red-600">{fieldErrors.newPassword}</p> : null}

          <PasswordStrengthMeter password={newPassword} />

          {capsLockActive ? (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 motion-reduce:animate-none" />
              <span>Caps Lock đang bật</span>
            </div>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirm-password" className="mb-1.5 block text-[13px] font-semibold">
            Nhập lại mật khẩu
          </label>
          <div className={`${INPUT_WRAP} ${fieldErrors.confirmPassword ? INPUT_ERROR : INPUT_OK}`}>
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={trackCapsLock}
              onKeyUp={trackCapsLock}
              disabled={isSubmitting}
              autoComplete="new-password"
              spellCheck={false}
              className={INPUT_CLASS}
            />
            <ToggleVisibility shown={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
          </div>
          {fieldErrors.confirmPassword ? (
            <p className="mt-1.5 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
          ) : null}
        </div>

        <ul
          className="grid gap-2 rounded-2xl border border-white/70 bg-white/50 px-3.5 py-3 text-[13px]"
          aria-label="Yêu cầu mật khẩu"
        >
          <PasswordRuleItem met={lengthMet}>Tối thiểu {PASSWORD_MIN_LENGTH} ký tự</PasswordRuleItem>
          <PasswordRuleItem met={hasAllCharacterTypes(newPassword)}>Nên có chữ hoa, chữ thường, số và ký tự đặc biệt</PasswordRuleItem>
          <PasswordRuleItem met={matchMet}>Hai ô nhập khớp nhau</PasswordRuleItem>
        </ul>

        <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <span>Đặt mật khẩu</span>
          )}
        </button>
        <p className="text-center text-[12.5px] text-slate-500">
          Gợi ý: một câu dài dễ nhớ an toàn hơn chuỗi ký tự ngắn.
        </p>
      </form>
    </AuthPageShell>
  )
}

export default SetPasswordPage
