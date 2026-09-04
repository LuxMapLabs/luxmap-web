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
  CheckCircle2,
  AlertCircle,
  MapPin,
  Radio,
  Zap,
  Sun,
  Moon,
} from 'lucide-react'

import tokenStorage from '../../utils/tokenStorage'

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(() => tokenStorage.isRemembered())

  // Trạng thái Dark / Light Mode (Mặc định là Dark Mode)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('luxmap_theme')
    return saved !== null ? saved === 'dark' : true
  })

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev
      localStorage.setItem('luxmap_theme', next ? 'dark' : 'light')
      return next
    })
  }

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

    if (!email.trim()) {
      toast.warning('Vui lòng nhập địa chỉ Email')
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
    <div
      className={`min-h-screen w-full flex items-center justify-center p-4 sm:p-8 lg:p-12 font-sans relative overflow-hidden select-none transition-colors duration-500 ${
        isDarkMode
          ? 'bg-[#071120] text-white'
          : 'bg-gradient-to-br from-slate-100 via-sky-50/50 to-blue-50/60 text-slate-900'
      }`}
    >
      {/* Nút bấm chuyển đổi Dark / Light Mode nổi ở góc trên bên phải */}
      <button
        type="button"
        onClick={toggleTheme}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-300 shadow-xl cursor-pointer backdrop-blur-md active:scale-95 ${
          isDarkMode
            ? 'bg-[#0c1a32]/85 border-slate-700/80 text-amber-300 hover:bg-[#132847] hover:border-amber-400/50 shadow-black/40'
            : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white hover:border-blue-300 shadow-slate-200/80'
        }`}
        title={isDarkMode ? 'Chuyển sang Giao diện Sáng (Light Mode)' : 'Chuyển sang Giao diện Tối (Dark Mode)'}
      >
        {isDarkMode ? (
          <>
            <Sun className="w-4 h-4 text-amber-300 animate-spin-slow" />
            <span className="text-xs font-bold text-slate-200">Giao diện Sáng</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-[#1f3864]" />
            <span className="text-xs font-bold text-slate-700">Giao diện Tối</span>
          </>
        )}
      </button>

      {/* Background GIS Grid Pattern (Mạng lưới tọa độ không gian) */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="gis-grid-full" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke={isDarkMode ? '#3e86c9' : '#94a3b8'}
                strokeWidth="0.6"
                strokeOpacity={isDarkMode ? '0.4' : '0.35'}
              />
            </pattern>
          </defs>
          <rect width="100%" fill="url(#gis-grid-full)" height="100%" />
        </svg>
      </div>

      {/* Ánh sáng Gradient Ambient tạo chiều sâu */}
      <div
        className={`absolute top-1/4 -left-20 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-tr from-[#1f3864]/40 to-[#3e86c9]/10'
            : 'bg-gradient-to-tr from-blue-200/50 to-sky-100/40'
        }`}
      />
      <div
        className={`absolute -bottom-20 -right-20 w-[550px] h-[550px] rounded-full blur-3xl pointer-events-none transition-all duration-500 ${
          isDarkMode
            ? 'bg-gradient-to-bl from-[#5fc4b0]/15 via-[#1f3864]/30 to-transparent'
            : 'bg-gradient-to-bl from-teal-200/30 via-indigo-100/30 to-transparent'
        }`}
      />

      {/* ========================================================================= */}
      {/* CONTAINER CHÍNH: BỐ CỤC 2 CỘT HIỆN ĐẠI CHO GIAO DIỆN WEB (SPLIT DESKTOP)  */}
      {/* ========================================================================= */}
      <div
        className={`w-full max-w-5xl rounded-[32px] sm:rounded-[40px] border overflow-hidden relative z-10 flex flex-col lg:flex-row min-h-[640px] transition-all duration-300 ${
          isDarkMode
            ? 'bg-[#0c1a32]/95 backdrop-blur-xl border-slate-700/60 shadow-2xl shadow-black/80'
            : 'bg-white border-slate-200/90 shadow-2xl shadow-slate-300/70'
        }`}
      >
        {/* ------------------------------------------------------------- */}
        {/* CỘT TRÁI (HERO PANEL): GIS SHOWCASE & THÔNG TIN THƯƠNG HIỆU   */}
        {/* ------------------------------------------------------------- */}
        <div
          className={`lg:w-[50%] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden transition-colors duration-500 ${
            isDarkMode
              ? 'bg-gradient-to-br from-[#0c1a32] via-[#102344] to-[#152e59]'
              : 'bg-gradient-to-br from-[#16294a] via-[#1f3864] to-[#2b4c80]'
          }`}
        >
          {/* Đường GIS vector uốn lượn đứt nét phát sáng */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-90">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 500 600" fill="none">
              <path
                d="M -50 450 C 120 420, 220 360, 290 260 C 360 150, 420 180, 550 120"
                stroke="#1f3d6b"
                strokeWidth="4"
                strokeDasharray="8 8"
              />
              <path
                d="M -50 450 C 120 420, 220 360, 290 260 C 360 150, 420 180, 550 120"
                stroke="#5fc4b0"
                strokeWidth="2"
                strokeDasharray="6 12"
                strokeOpacity="0.85"
              />
              {/* Điểm nút tọa độ cột đèn (Pole / Node) */}
              <circle cx="290" cy="260" r="7" fill="#5fc4b0" />
              <circle cx="290" cy="260" r="14" stroke="#5fc4b0" strokeWidth="2" strokeOpacity="0.4" className="animate-ping" />

              {/* Điểm nút vàng cảnh báo sự cố */}
              <circle cx="160" cy="390" r="6" fill="#e9a23b" />
              <circle cx="440" cy="160" r="5" fill="#8fd9e8" />
            </svg>
          </div>

          {/* Top: Logo LuxMap 3 vạch cột đèn */}
          <div className="relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-13 h-13 rounded-2xl bg-[#132847] border border-[#234575] shadow-lg shadow-black/40 flex items-center justify-center p-2.5">
                <div className="flex items-end justify-center gap-1.5 h-8 w-8">
                  <div className="w-1.5 h-5 bg-[#5fc4b0] rounded-full flex flex-col items-center">
                    <span className="w-2.5 h-2.5 -mt-1 rounded-full bg-[#5fc4b0]" />
                  </div>
                  <div className="w-2 h-8 bg-white rounded-full flex flex-col items-center">
                    <span className="w-3 h-3 -mt-1 rounded-full bg-white shadow-sm shadow-white" />
                  </div>
                  <div className="w-1.5 h-6 bg-[#5fc4b0] rounded-full flex flex-col items-center">
                    <span className="w-2.5 h-2.5 -mt-1 rounded-full bg-[#5fc4b0]" />
                  </div>
                </div>
              </div>
              <div>
                <div className="text-2xl font-black tracking-wider text-white uppercase leading-none flex items-center gap-2">
                  <span>LUXMAP</span>
                  <span className="text-[10px] font-black tracking-normal px-2 py-0.5 rounded-md bg-[#5fc4b0] text-[#0c1a32]">
                    GIS 4.0
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium tracking-wide mt-1">
                  Hệ thống Quản lý Chiếu sáng Nông thôn Thông minh
                </p>
              </div>
            </div>
          </div>

          {/* Center: Tiêu đề Chào mừng & Giới thiệu hệ thống */}
          <div className="relative z-10 py-8 lg:py-0 space-y-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#5fc4b0] uppercase">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#5fc4b0]" />
                Nền tảng Quản trị & Tác nghiệp Hiện trường
              </span>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                Chào mừng trở lại!
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md">
                Đăng nhập để nhận lệnh điều phối, giám sát tài sản chiếu sáng và đồng bộ dữ liệu bản đồ số GIS theo thời gian thực.
              </p>
            </div>

            {/* Tính năng nổi bật tóm tắt */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-2xl bg-[#112444]/60 border border-[#203c6b]/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Quản lý Cột & Tuyến dây</span>
              </div>
              <div className="p-3 rounded-2xl bg-[#112444]/60 border border-[#203c6b]/60 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-200">Xử lý Sự cố & Lệnh làm</span>
              </div>
            </div>
          </div>

          {/* Bottom: Card Thiết bị / Hệ thống sẵn sàng */}
          <div className="relative z-10 pt-4">
            <div className="bg-[#112444]/90 backdrop-blur-md rounded-2xl p-4 border border-[#203d6e] flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#5fc4b0]/15 text-[#5fc4b0] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black tracking-wide text-white uppercase">
                    HỆ THỐNG TRỰC TUYẾN SẴN SÀNG
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium mt-0.5">
                    GPS chính xác · Mạng ổn định · Đồng bộ dữ liệu GIS
                  </div>
                </div>
              </div>
              {/* Đèn xanh ngọc phát sáng online */}
              <div className="relative flex items-center justify-center mr-2 shrink-0">
                <span className="w-3 h-3 rounded-full bg-[#5fc4b0]" />
                <span className="w-3 h-3 rounded-full bg-[#5fc4b0] absolute animate-ping opacity-80" />
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* CỘT PHẢI (FORM PANEL): FORM ĐĂNG NHẬP TÁC NGHIỆP RỘNG RÃI     */}
        {/* ------------------------------------------------------------- */}
        <div
          className={`lg:w-[50%] p-8 sm:p-12 lg:p-14 flex flex-col justify-between transition-colors duration-500 ${
            isDarkMode ? 'bg-[#0a1628] text-slate-100' : 'bg-white text-slate-800'
          }`}
        >
          <div className="w-full max-w-md mx-auto space-y-6">
            {/* Tiêu đề Form */}
            <div className="space-y-1">
              <h3
                className={`text-2xl sm:text-3xl font-black tracking-tight transition-colors ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Đăng nhập tác nghiệp
              </h3>
              <p
                className={`text-sm font-normal transition-colors ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Sử dụng tài khoản nhân viên / cán bộ đã được cấp.
              </p>
            </div>

            {/* Form đăng nhập */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input: Địa chỉ Email (Đã bỏ Mã nhân viên & SĐT theo yêu cầu) */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold tracking-wider block uppercase transition-colors ${
                    isDarkMode ? 'text-[#8fd9e8]' : 'text-[#1f3864]'
                  }`}
                >
                  ĐỊA CHỈ EMAIL
                </label>
                <div
                  className={`relative flex items-center rounded-2xl border p-2 transition-all duration-200 shadow-xs ${
                    isDarkMode
                      ? 'bg-[#10223d] border-slate-700/80 focus-within:border-[#5fc4b0] focus-within:ring-3 focus-within:ring-[#5fc4b0]/15'
                      : 'bg-white border-slate-200 focus-within:border-[#1f3864] focus-within:ring-3 focus-within:ring-[#1f3864]/10'
                  }`}
                >
                  {/* Khối icon lồng bo góc */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3 shrink-0 transition-colors ${
                      isDarkMode ? 'bg-[#183157] text-[#5fc4b0]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="VD: admin@civicflow.vn"
                    disabled={loading}
                    className={`w-full text-sm font-semibold outline-none bg-transparent py-1 pr-3 disabled:opacity-50 transition-colors ${
                      isDarkMode
                        ? 'text-white placeholder-slate-400'
                        : 'text-slate-800 placeholder-slate-400'
                    }`}
                    required
                  />
                </div>
              </div>

              {/* Input: Mật khẩu */}
              <div className="space-y-1.5">
                <label
                  className={`text-xs font-bold tracking-wider block uppercase transition-colors ${
                    isDarkMode ? 'text-[#8fd9e8]' : 'text-[#1f3864]'
                  }`}
                >
                  MẬT KHẨU
                </label>
                <div
                  className={`relative flex items-center rounded-2xl border p-2 transition-all duration-200 shadow-xs ${
                    isDarkMode
                      ? 'bg-[#10223d] border-slate-700/80 focus-within:border-[#5fc4b0] focus-within:ring-3 focus-within:ring-[#5fc4b0]/15'
                      : 'bg-white border-slate-200 focus-within:border-[#1f3864] focus-within:ring-3 focus-within:ring-[#1f3864]/10'
                  }`}
                >
                  {/* Khối icon lồng bo góc */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center mr-3 shrink-0 transition-colors ${
                      isDarkMode ? 'bg-[#183157] text-[#5fc4b0]' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className={`w-full text-sm font-semibold outline-none bg-transparent py-1 pr-2 disabled:opacity-50 transition-colors ${
                      isDarkMode
                        ? 'text-white placeholder-slate-400'
                        : 'text-slate-800 placeholder-slate-400'
                    }`}
                    required
                  />
                  {/* Nút ẩn/hiện mật khẩu */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className={`p-2 transition-colors focus:outline-none cursor-pointer shrink-0 ${
                      isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'
                    }`}
                    tabIndex={-1}
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Tùy chọn: Duy trì đăng nhập */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={loading}
                    className="w-4.5 h-4.5 rounded-md text-[#1f3864] border-slate-300 focus:ring-[#1f3864] focus:ring-offset-0 cursor-pointer transition-all"
                  />
                  <span
                    className={`text-xs sm:text-sm font-semibold transition-colors ${
                      isDarkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Duy trì đăng nhập trên thiết bị
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => toast.info('Vui lòng liên hệ Quản trị viên hệ thống để được cấp lại mật khẩu.')}
                  className={`text-xs font-bold transition-colors cursor-pointer ${
                    isDarkMode ? 'text-[#5fc4b0] hover:text-[#8fd9e8]' : 'text-[#1f3864] hover:text-[#3e86c9]'
                  }`}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Banner hiển thị lỗi trực quan */}
              {error && (
                <div className="rounded-2xl bg-red-500/10 p-3.5 text-xs text-danger border border-red-500/30 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-red-300">Không thể đăng nhập</p>
                    <p className="text-red-200 leading-relaxed font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Nút Đăng Nhập Chính */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-2xl font-bold text-base shadow-xl transition-all duration-200 flex items-center justify-center relative active:scale-[0.99] disabled:pointer-events-none disabled:opacity-65 cursor-pointer mt-3 ${
                  isDarkMode
                    ? 'bg-gradient-to-r from-[#1f3864] to-[#2b518c] hover:from-[#244275] hover:to-[#3561a3] text-white shadow-black/40 border border-blue-400/20'
                    : 'bg-[#1f3864] hover:bg-[#16294d] text-white shadow-[#1f3864]/25'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    <span>Đang xác thực tác nghiệp...</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-wide">Bắt đầu ca làm việc</span>
                    <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center absolute right-4">
                      <ArrowRight className="w-5 h-5 text-white" />
                    </div>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Box An Toàn Chân Form: Hỗ trợ ngoại tuyến & Mã hóa an toàn */}
          <div
            className={`w-full max-w-md mx-auto mt-6 pt-4 border-t transition-colors ${
              isDarkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            <div
              className={`rounded-2xl p-3.5 flex items-center gap-3.5 transition-colors border ${
                isDarkMode
                  ? 'bg-[#10223d]/80 border-[#5fc4b0]/20 text-slate-300'
                  : 'bg-[#5fc4b0]/10 border-[#5fc4b0]/30 text-slate-600'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isDarkMode ? 'bg-[#5fc4b0]/20 text-[#5fc4b0]' : 'bg-[#5fc4b0]/20 text-[#1f3864]'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-[#5fc4b0]" />
              </div>
              <div className="space-y-0.5">
                <div
                  className={`text-xs font-black tracking-wide uppercase ${
                    isDarkMode ? 'text-[#5fc4b0]' : 'text-[#1f3864]'
                  }`}
                >
                  HỖ TRỢ LÀM VIỆC NGOẠI TUYẾN
                </div>
                <div
                  className={`text-xs font-medium ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  Dữ liệu được bảo vệ và mã hóa lưu an toàn trên thiết bị.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
