import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { loginRequest } from '../../feature/auth/authSlice'
import { RootState } from '../../redux/rootReducer'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import tokenStorage from '../../utils/tokenStorage'
import loginBgHq from '../../assets/images/login-bg-hq.png'

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
      })
    )
  }

  return (
    <div className="min-h-screen w-full relative flex items-center justify-end overflow-hidden select-none font-sans bg-[#060c16]">
      {/* 1. Background Image HD sắc nét nguyên bản (Không bị tối mờ, con đường và đèn nằm trọn vẹn ở bên trái) */}
      <div
        className="absolute inset-0 bg-cover bg-left lg:bg-center pointer-events-none transition-all duration-500"
        style={{
          backgroundImage: `url(${loginBgHq})`,
        }}
      />

      {/* 2. Chỉ phủ lớp chuyển bóng rất nhẹ ở rìa phải để hỗ trợ tương phản cho Khung Login */}
      <div className="absolute inset-0 bg-gradient-to-l from-black/50 via-black/15 to-transparent pointer-events-none" />


      {/* 3. Khung đăng nhập Vuông vức (Không bo góc) kèm hiệu ứng Ambient Halo & Đổ bóng sâu - Nằm bên phải */}
      <div className="relative z-20 w-full max-w-[490px] mx-auto lg:mx-0 lg:mr-16 xl:mr-24 2xl:mr-32 p-4 sm:p-6 my-auto group">
        {/* [Mục 4] Ambient Halo phát sáng nhẹ phía sau thẻ */}
        <div className="absolute -inset-1.5 bg-gradient-to-r from-[#5fc4b0]/15 via-blue-500/10 to-[#5fc4b0]/10 blur-2xl -z-10 opacity-60 group-hover:opacity-95 transition-opacity duration-700 pointer-events-none" />

        <div className="w-full rounded-none p-8 sm:p-11 border border-white/15 hover:border-white/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_40px_rgba(0,0,0,0.6)] hover:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_50px_rgba(95,196,176,0.22)] backdrop-blur-2xl bg-gradient-to-br from-[#0c182a]/95 via-[#09121f]/90 to-[#060e1a]/95 text-white transition-all duration-500 animate-login-card relative overflow-hidden">
          {/* [Mục 4] Subtle Top Accent Line with Ambient Glow & Hover Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-[#5fc4b0] to-transparent shadow-[0_0_15px_rgba(95,196,176,0.7)] group-hover:shadow-[0_0_25px_rgba(95,196,176,1)] transition-all duration-500" />
          </div>

          {/* 4 Corner Tech Brackets (Điểm nhấn kỹ thuật GIS sắc sảo) */}
          <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#5fc4b0]/80 transition-all duration-300 group-hover:border-[#5fc4b0] group-hover:scale-105" />
          <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#5fc4b0]/80 transition-all duration-300 group-hover:border-[#5fc4b0] group-hover:scale-105" />
          <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#5fc4b0]/50 transition-all duration-300 group-hover:border-[#5fc4b0] group-hover:scale-105" />
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#5fc4b0]/50 transition-all duration-300 group-hover:border-[#5fc4b0] group-hover:scale-105" />

          {/* Header: Logo & Title (Tinh giản & Hiện đại) */}
          <div className="space-y-7">
            {/* Logo LuxMap */}
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-none bg-[#11233e] border border-[#204273] shadow-md shadow-black/40 flex items-center justify-center p-2">
                <div className="flex items-end justify-center gap-1.5 h-5 w-5">
                  <div className="w-1.5 h-3.5 bg-[#5fc4b0] rounded-none" />
                  <div className="w-1.5 h-5 bg-white rounded-none shadow-xs shadow-white" />
                  <div className="w-1.5 h-3.5 bg-[#5fc4b0] rounded-none" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-black tracking-wider text-white uppercase leading-none block">
                  LUXMAP
                </span>
                <span className="text-[11px] text-slate-400 font-medium tracking-wide">
                  Chiếu sáng Nông thôn Thông minh
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Đăng nhập
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 font-normal">
                Sử dụng tài khoản nhân viên / cán bộ để tiếp tục.
              </p>
            </div>
          </div>

          {/* Form Login (Vuông vức, tinh giản, sắc sảo) */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-7">
            {/* Field: Tài khoản / Email */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Tài khoản / Email
              </label>
              <div className="relative flex items-center rounded-none border border-slate-700/70 bg-slate-900/70 px-3.5 py-3 group/field focus-within:border-[#5fc4b0] focus-within:ring-1 focus-within:ring-[#5fc4b0]/40 transition-all duration-200">
                {/* [Mục 2] Icon sáng xanh ngọc khi focus */}
                <Mail className="w-4.5 h-4.5 text-slate-400 group-focus-within/field:text-[#5fc4b0] transition-colors duration-200 shrink-0" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin hoặc email"
                  disabled={loading}
                  autoComplete="username"
                  spellCheck={false}
                  className="w-full text-sm font-medium outline-none bg-transparent pl-3 pr-2 text-white placeholder-slate-500 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            {/* Field: Mật khẩu */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">
                Mật khẩu
              </label>
              <div className="relative flex items-center rounded-none border border-slate-700/70 bg-slate-900/70 px-3.5 py-3 group/field focus-within:border-[#5fc4b0] focus-within:ring-1 focus-within:ring-[#5fc4b0]/40 transition-all duration-200">
                {/* [Mục 2] Icon sáng xanh ngọc khi focus */}
                <Lock className="w-4.5 h-4.5 text-slate-400 group-focus-within/field:text-[#5fc4b0] transition-colors duration-200 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                  onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                  placeholder="••••••••"
                  disabled={loading}
                  autoComplete="current-password"
                  spellCheck={false}
                  className="w-full text-sm font-medium outline-none bg-transparent pl-3 pr-2 text-white placeholder-slate-500 disabled:opacity-50"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer shrink-0"
                  tabIndex={-1}
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* [Mục 2] Cảnh báo Caps Lock tự động */}
              {capsLockActive && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 pt-0.5 animate-in fade-in duration-200">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>Caps Lock đang bật</span>
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded-none text-[#1f3864] border-slate-600 bg-slate-900/80 focus:ring-[#5fc4b0] cursor-pointer transition-all"
                />
                <span className="text-xs font-medium text-slate-300">
                  Duy trì đăng nhập
                </span>
              </label>

              <button
                type="button"
                onClick={() => toast.info('Vui lòng liên hệ Quản trị viên hệ thống để được cấp lại mật khẩu.')}
                className="text-xs font-semibold text-[#5fc4b0] hover:text-[#8fd9e8] transition-colors cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="rounded-none p-3.5 text-xs border border-red-500/30 bg-red-500/10 text-red-300 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-red-300">Không thể đăng nhập</p>
                  <p className="leading-relaxed text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button (Hiệu ứng Shimmer ánh sáng lướt qua + Glow xanh ngọc + Mũi tên trượt tương tác) */}
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full py-3.5 px-6 rounded-none font-bold text-sm shadow-xl transition-all duration-300 flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-65 cursor-pointer bg-gradient-to-r from-[#1b345d] via-[#274880] to-[#1b345d] hover:from-[#214175] hover:via-[#315799] hover:to-[#214175] text-white border border-blue-400/30 hover:border-[#5fc4b0]/70 hover:shadow-[0_0_25px_rgba(95,196,176,0.35)] mt-3 overflow-hidden"
            >
              {/* Vệt ánh sáng Shimmer lướt qua khi rê chuột */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#5fc4b0]" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Bắt đầu ca làm việc</span>
                  <ArrowRight className="w-4 h-4 text-[#5fc4b0] transition-transform duration-300 group-hover:translate-x-1.5 group-hover:text-white shrink-0" />
                </>
              )}
            </button>
          </form>

          {/* Telemetry Status Bar đặt tinh tế bên trong khung đăng nhập */}
          <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-xs select-none text-slate-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="font-semibold text-slate-200 tracking-wide text-[11px]">
                Hệ thống Trực tuyến
              </span>
            </div>
            <span className="text-white/20">|</span>
            <span className="text-[11px] text-slate-400">
              IoT Gateway: <span className="text-slate-300 font-medium">Sẵn sàng</span>
            </span>
            <span className="text-white/20">|</span>
            <span className="text-[#5fc4b0] font-mono text-[11px] tracking-wider font-semibold">
              LUXMAP v2.4
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
