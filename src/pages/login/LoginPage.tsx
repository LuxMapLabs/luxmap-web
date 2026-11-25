import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { loginRequest, googleLoginRequest } from '../../feature/auth/authSlice'
import { GoogleSignInButton } from '../../components/GoogleSignInButton'
import {
  AuthPageShell,
  INPUT_OK,
  INPUT_WRAP,
  PRIMARY_BUTTON,
} from '../../components/AuthPageShell'
import type { RootState } from '../../redux/rootReducer'
import tokenStorage from '../../utils/tokenStorage'

const INPUT_CLASS =
  'h-full w-full min-w-0 bg-transparent pl-2.5 text-[15px] text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-50'

const LOGIN_INPUT_WRAP = `${INPUT_WRAP} ${INPUT_OK} group/field`

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => tokenStorage.isRemembered())
  const [capsLockActive, setCapsLockActive] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      toast.success('Đăng nhập thành công! Chào mừng bạn trở lại.')
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) {
      toast.warning('Vui lòng nhập tài khoản hoặc email')
      return
    }

    if (!password) {
      toast.warning('Vui lòng nhập mật khẩu')
      return
    }

    dispatch(
      loginRequest({
        emailOrPhone: email.trim(),
        password,
        rememberMe,
      }),
    )
  }

  const handleGoogleCredential = (idToken: string) => {
    dispatch(googleLoginRequest({ id_token: idToken }))
  }

  return (
    <AuthPageShell>
      <h1 className="mb-2 text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[28px]">
        Đăng nhập
      </h1>
      <p className="mb-5 text-balance text-sm leading-relaxed text-slate-600 [@media(max-height:659px)]:mb-3">
        Sử dụng tài khoản nhân viên / cán bộ để tiếp tục.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5 [@media(max-height:759px)]:space-y-4 [@media(max-height:659px)]:space-y-3">
        {/* Banner lỗi đăng nhập từ máy chủ */}
        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-semibold">Không thể đăng nhập</p>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
        ) : null}

        {/* Tài khoản / Email */}
        <div>
          <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">
            Tài khoản / Email
          </label>
          <div className={LOGIN_INPUT_WRAP}>
            <Mail
              className="pointer-events-none ml-3.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within/field:text-primary motion-reduce:transition-none"
              aria-hidden="true"
            />
            <input
              id="login-email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập tên đăng nhập hoặc email"
              disabled={loading}
              autoComplete="username"
              spellCheck={false}
              className={`${INPUT_CLASS} pr-3.5`}
              required
            />
          </div>
        </div>

        {/* Mật khẩu */}
        <div>
          <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">
            Mật khẩu
          </label>
          <div className={LOGIN_INPUT_WRAP}>
            <Lock
              className="pointer-events-none ml-3.5 h-4 w-4 shrink-0 text-slate-400 transition-colors group-focus-within/field:text-primary motion-reduce:transition-none"
              aria-hidden="true"
            />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
              onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
              placeholder="••••••••"
              disabled={loading}
              autoComplete="current-password"
              spellCheck={false}
              className={`${INPUT_CLASS} pr-11`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="absolute right-1.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Cảnh báo Caps Lock tự động */}
          {capsLockActive ? (
            <div className="mt-2 flex items-center gap-1.5 text-[13px] text-amber-800">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-600 motion-reduce:animate-none" />
              <span>Caps Lock đang bật</span>
            </div>
          ) : null}
        </div>

        {/* Duy trì đăng nhập & Quên mật khẩu */}
        <div className="flex items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <span className="text-sm font-semibold text-slate-700">
              Duy trì đăng nhập
            </span>
          </label>

          <Link
            to="/forgot-password"
            className="inline-flex min-h-11 items-center whitespace-nowrap rounded text-sm font-semibold text-primary transition-colors hover:text-primary/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transition-none"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Nút đăng nhập */}
        <button type="submit" disabled={loading} className={PRIMARY_BUTTON}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      {/* Đăng nhập bằng Google (ẩn nếu chưa cấu hình VITE_GOOGLE_CLIENT_ID) */}
      {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
        <div className="mt-4 [@media(max-height:659px)]:mt-3">
          <div className="flex items-center gap-3 text-[13px] text-slate-600 select-none">
            <span className="h-px flex-1 bg-slate-900/10" />
            <span>hoặc</span>
            <span className="h-px flex-1 bg-slate-900/10" />
          </div>
          {/* Từ xl phóng 1.1 để nút Google (giới hạn 400px) bằng bề rộng ô nhập 440px */}
          <div className={`mt-4 [@media(max-height:659px)]:mt-3 ${loading ? 'pointer-events-none opacity-60' : ''}`}>
            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              onLoadError={() => toast.error('Không tải được đăng nhập Google. Vui lòng thử lại sau.')}
            />
          </div>
        </div>
      ) : null}
    </AuthPageShell>
  )
}

export default LoginPage
