import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { AlertCircle, Loader2, MailCheck } from 'lucide-react'
import type { RootState } from '../../redux/rootReducer'
import { forgotPasswordRequest, resetPasswordState } from '../../feature/password/passwordSlice'
import { forgotPasswordSchema } from '../../validations/password.schema'
import {
  AuthPageShell,
  INPUT_ERROR,
  INPUT_OK,
  INPUT_WRAP,
  PRIMARY_BUTTON,
} from '../../components/AuthPageShell'

const INPUT_CLASS =
  'h-[46px] w-full min-w-0 bg-transparent pl-3.5 pr-3.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50'

export const ForgotPasswordPage: React.FC = () => {
  const dispatch = useDispatch()
  const { isRequestingReset, resetRequestSent, resetRequestError } = useSelector(
    (state: RootState) => state.password,
  )

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')

  useEffect(() => {
    dispatch(resetPasswordState())
    return () => {
      dispatch(resetPasswordState())
    }
  }, [dispatch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setEmailError(result.error.issues[0]?.message ?? '')
      return
    }
    setEmailError('')
    dispatch(forgotPasswordRequest({ email: result.data.email }))
  }

  if (resetRequestSent) {
    return (
      <AuthPageShell>
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1f9d6b] text-white shadow-[0_0_0_8px_rgba(31,157,107,0.15)]">
            <MailCheck className="h-7 w-7" />
          </div>
          <div className="space-y-1.5" role="status">
            <h1 className="text-2xl font-bold">Kiểm tra email của bạn</h1>
            <p className="mx-auto max-w-[36ch] text-sm leading-relaxed text-slate-500">
              Nếu email này có tài khoản LuxMap, liên kết đặt lại mật khẩu đã được gửi. Liên kết có hiệu lực 1&nbsp;giờ.
            </p>
          </div>
          <Link to="/login" className={PRIMARY_BUTTON}>
            Về trang đăng nhập
          </Link>
        </div>
      </AuthPageShell>
    )
  }

  return (
    <AuthPageShell>
      <h1 className="mb-1.5 text-2xl font-bold leading-tight">Quên mật khẩu</h1>
      <p className="mb-6 max-w-[36ch] text-sm leading-relaxed text-slate-500">
        Nhập email tài khoản LuxMap, chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {resetRequestError ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[13px] text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">{resetRequestError}</p>
          </div>
        ) : null}

        <div>
          <label htmlFor="forgot-email" className="mb-1.5 block text-[13px] font-semibold">
            Email
          </label>
          <div className={`${INPUT_WRAP} ${emailError ? INPUT_ERROR : INPUT_OK}`}>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isRequestingReset}
              autoComplete="email"
              placeholder="ten@example.com"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={emailError ? 'forgot-email-error' : undefined}
              className={INPUT_CLASS}
            />
          </div>
          {emailError ? (
            <p id="forgot-email-error" className="mt-1.5 text-xs text-red-600">
              {emailError}
            </p>
          ) : null}
        </div>

        <button type="submit" disabled={isRequestingReset} className={PRIMARY_BUTTON}>
          {isRequestingReset ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang gửi...</span>
            </>
          ) : (
            <span>Gửi liên kết đặt lại</span>
          )}
        </button>
      </form>

      <p className="mt-5 text-center text-[13px]">
        <Link to="/login" className="font-semibold text-[#1f3864] hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthPageShell>
  )
}

export default ForgotPasswordPage
