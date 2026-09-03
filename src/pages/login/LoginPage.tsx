import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { loginRequest } from '../../feature/auth/authSlice'
import { RootState } from '../../redux/rootReducer'
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const dispatch = useDispatch()
  const navigate = useNavigate()

  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      toast.success('Đăng nhập thành công! Chào mừng bạn trở lại.')
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (error) {
      toast.error(error)
    }
  }, [error])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!emailOrPhone.trim()) {
      toast.warning('Vui lòng nhập Email hoặc Số điện thoại')
      return
    }

    if (!password) {
      toast.warning('Vui lòng nhập mật khẩu')
      return
    }

    dispatch(loginRequest({ emailOrPhone: emailOrPhone.trim(), password }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4 font-sans">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl border border-gray-100 transition-all duration-300 hover:shadow-2xl">
        {/* Banner header logo */}
        <div className="bg-primary p-8 text-center text-white relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-90"></div>
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3 backdrop-blur-xs">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">LuxMap</h2>
            <p className="mt-1 text-xs text-blue-100 font-light">
              Nền tảng bản đồ số GIS quản lý tài sản & chiếu sáng thông minh
            </p>
          </div>
        </div>

        {/* Form Login */}
        <div className="p-8">
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-gray-800">Đăng Nhập Hệ Thống</h3>
            <p className="text-xs text-gray-500 mt-1">
              Nhập tài khoản cán bộ / công dân được cấp để tiếp tục
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Input Email / Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 block">
                Email hoặc Số điện thoại
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  placeholder="name@luxmap.vn hoặc 09xxxxxxxx"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors duration-200 focus:border-secondary focus:ring-1 focus:ring-secondary disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-600 block">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-10 text-sm text-gray-800 placeholder-gray-400 outline-none transition-colors duration-200 focus:border-secondary focus:ring-1 focus:ring-secondary disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Banner trực quan trên UI */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-danger border border-red-200 flex items-start space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-red-800">Không thể đăng nhập</p>
                  <p className="text-red-700 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button with Loading State */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-opacity-95 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xác thực...
                </>
              ) : (
                'Đăng Nhập'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
