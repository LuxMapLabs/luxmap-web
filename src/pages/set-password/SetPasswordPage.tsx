import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { RootState } from '../../redux/rootReducer'
import { resetPasswordState, setPasswordRequest } from '../../feature/password/passwordSlice'
import { PASSWORD_MIN_LENGTH, setPasswordSchema } from '../../validations/password.schema'
import { STRENGTH_MAX_LEVEL, hasAllCharacterTypes, type PasswordStrengthLevel } from '../../utils/passwordStrength'
import { usePasswordStrength } from '../../hooks/usePasswordStrength'

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

const PAGE_BACKGROUND = [
  'radial-gradient(900px 520px at 8% 4%, rgba(250,236,214,.9), transparent 62%)',
  'radial-gradient(800px 560px at 96% 10%, rgba(176,208,238,.85), transparent 62%)',
  'radial-gradient(700px 500px at 50% 100%, rgba(233,162,59,.18), transparent 60%)',
  'linear-gradient(180deg, #e9eef5 0%, #e3e1dc 100%)',
].join(',')

const INPUT_WRAP = 'relative flex items-center rounded-2xl border bg-white/75 transition-shadow focus-within:ring-4'
const INPUT_OK = 'border-slate-900/10 focus-within:border-[#1f3864] focus-within:ring-[#1f3864]/15'
const INPUT_ERROR = 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15'
const INPUT_CLASS =
  'h-[46px] w-full min-w-0 bg-transparent pl-3.5 pr-11 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50'

const PRIMARY_BUTTON =
  'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#1f3864] to-[#2d5496] text-[15px] font-semibold text-white no-underline shadow-[0_14px_28px_-14px_rgba(31,56,100,0.7)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1f3864]/25 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none'

/** Khung kính mờ dùng chung cho mọi trạng thái, cùng ngôn ngữ với khu Admin và Manager */
const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10 text-slate-800"
    style={{ background: PAGE_BACKGROUND, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
  >
    {/* Vầng sáng hổ phách như ánh đèn đường */}
    <div className="pointer-events-none absolute -top-16 right-[8%] -z-10 h-64 w-64 rounded-full bg-[#ffc27a] opacity-70 blur-[70px]" />
    <main className="w-full max-w-[440px] rounded-[32px] border border-white/80 bg-white/55 px-5 py-7 shadow-[0_40px_90px_-30px_rgba(72,84,110,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[34px] sm:px-8 sm:py-9">
      <div className="mb-6 flex items-center gap-2.5 font-bold text-[#1f3864]">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-gradient-to-br from-[#1f3864] to-[#2f5aa0]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffc27a] shadow-[0_0_12px_3px_rgba(255,194,122,0.8)]" />
        </span>
        LuxMap
      </div>
      {children}
    </main>
  </div>
)

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

const RuleItem: React.FC<{ met: boolean; children: React.ReactNode }> = ({ met, children }) => (
  <li className={`flex items-center gap-2.5 ${met ? 'text-slate-800' : 'text-slate-500'}`}>
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors motion-reduce:transition-none ${
        met ? 'border-[#1f9d6b] bg-[#1f9d6b] text-white' : 'border-slate-400/60 text-transparent'
      }`}
      aria-hidden="true"
    >
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
    <span>{children}</span>
    <span className="sr-only">{met ? 'đã đạt' : 'chưa đạt'}</span>
  </li>
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
  const strength = usePasswordStrength(newPassword)
  const levelColor = LEVEL_COLORS[strength.level]

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
      <PageShell>
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
      </PageShell>
    )
  }

  if (isSuccess) {
    return (
      <PageShell>
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
      </PageShell>
    )
  }

  const lengthMet = newPassword.length >= PASSWORD_MIN_LENGTH
  const matchMet = confirmPassword.length > 0 && confirmPassword === newPassword

  return (
    <PageShell>
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
                  className="h-2 rounded-[4px] bg-slate-900/10 transition-[background-color,box-shadow] duration-300 motion-reduce:transition-none"
                  style={
                    strength.level >= n ? { backgroundColor: levelColor, boxShadow: `0 0 10px ${levelColor}` } : undefined
                  }
                />
              ))}
            </div>
            <div className="mt-2 flex min-h-[18px] justify-between text-[12.5px] text-slate-500">
              <span aria-live="polite">
                Độ mạnh:{' '}
                <b className="font-semibold" style={{ color: levelColor }}>
                  {strength.label}
                </b>
              </span>
              <span className="tabular-nums">
                {newPassword.length}/{PASSWORD_MIN_LENGTH}
              </span>
            </div>
          </div>

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
          <RuleItem met={lengthMet}>Tối thiểu {PASSWORD_MIN_LENGTH} ký tự</RuleItem>
          <RuleItem met={hasAllCharacterTypes(newPassword)}>Nên có chữ hoa, chữ thường, số và ký tự đặc biệt</RuleItem>
          <RuleItem met={matchMet}>Hai ô nhập khớp nhau</RuleItem>
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
    </PageShell>
  )
}

export default SetPasswordPage
