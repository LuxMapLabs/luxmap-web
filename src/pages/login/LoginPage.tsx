import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { loginRequest } from '../../feature/auth/authSlice'
import { RootState } from '../../redux/rootReducer'
import {
  User,
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
} from 'lucide-react'

export const LoginPage: React.FC = () => {
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

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
      toast.warning('Vui lòng nhập Mã nhân viên, Email hoặc Số điện thoại')
      return
    }

    if (!password) {
      toast.warning('Vui lòng nhập mật khẩu')
      return
    }

    dispatch(loginRequest({ emailOrPhone: emailOrPhone.trim(), password }))
  }

  return (
    <div className="min-h-screen w-full bg-[#071120] flex items-center justify-center p-4 sm:p-8 lg:p-12 font-sans relative overflow-hidden select-none">
      {/* Background GIS Grid Pattern (Mạng lưới tọa độ không gian) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="gis-grid-full" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#3e86c9" strokeWidth="0.6" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" fill="url(#gis-grid-full)" height="100%" />
        </svg>
      </div>

      {/* Ánh sáng Gradient Ambient tạo chiều sâu */}
      <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-gradient-to-tr from-[#1f3864]/40 to-[#3e86c9]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-[550px] h-[550px] bg-gradient-to-bl from-[#5fc4b0]/15 via-[#1f3864]/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================================= */}
      {/* CONTAINER CHÍNH: BỐ CỤC 2 CỘT HIỆN ĐẠI CHO GIAO DIỆN WEB (SPLIT DESKTOP)  */}
      {/* ========================================================================= */}
      <div className="w-full max-w-5xl bg-[#0c1a32]/95 backdrop-blur-xl rounded-[32px] sm:rounded-[40px] shadow-2xl shadow-black/80 border border-slate-700/60 overflow-hidden relative z-10 flex flex-col lg:flex-row min-h-[640px] transition-all duration-300">

        {/* ------------------------------------------------------------- */}
        {/* CỘT TRÁI (HERO PANEL): GIS SHOWCASE & THÔNG TIN THƯƠNG HIỆU   */}
        {/* ------------------------------------------------------------- */}
        <div className="lg:w-[50%] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-[#0c1a32] via-[#102344] to-[#152e59]">
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
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-[#5fc4b0]/20 text-[#5fc4b0] border border-[#5fc4b0]/30 tracking-normal">
                    GIS WEB
                  </span>
                </div>
                <p className="text-[11px] font-bold tracking-widest text-slate-300 mt-1 uppercase">
                  FIELD OPERATIONS & ASSET MANAGEMENT
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
        <div className="lg:w-[50%] bg-white p-8 sm:p-12 lg:p-14 flex flex-col justify-between text-slate-800">
          <div className="w-full max-w-md mx-auto space-y-6">
            
            {/* Tiêu đề Form */}
            <div className="space-y-1">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Đăng nhập tác nghiệp
              </h3>
              <p className="text-sm text-slate-500 font-normal">
                Sử dụng tài khoản nhân viên / cán bộ đã được cấp.
              </p>
            </div>

            {/* Form đăng nhập */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Input: Mã nhân viên / SĐT / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-[#1f3864] block uppercase">
                  MÃ NHÂN VIÊN / SỐ ĐIỆN THOẠI / EMAIL
                </label>
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white p-2 transition-all duration-200 focus-within:border-[#1f3864] focus-within:ring-3 focus-within:ring-[#1f3864]/10 shadow-xs">
                  {/* Khối icon lồng bo góc */}
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mr-3 shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={emailOrPhone}
                    onChange={(e) => setEmailOrPhone(e.target.value)}
                    placeholder="VD: NV-0125 hoặc admin@civicflow.vn"
                    disabled={loading}
                    className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none bg-transparent py-1 pr-3 disabled:opacity-50"
                    required
                  />
                </div>
              </div>

              {/* Input: Mật khẩu */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-[#1f3864] block uppercase">
                  MẬT KHẨU
                </label>
                <div className="relative flex items-center rounded-2xl border border-slate-200 bg-white p-2 transition-all duration-200 focus-within:border-[#1f3864] focus-within:ring-3 focus-within:ring-[#1f3864]/10 shadow-xs">
                  {/* Khối icon lồng bo góc */}
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 mr-3 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loading}
                    className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none bg-transparent py-1 pr-2 disabled:opacity-50"
                    required
                  />
                  {/* Nút ẩn/hiện mật khẩu */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer shrink-0 transition-colors"
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
                  <span className="text-xs sm:text-sm font-semibold text-slate-600">
                    Duy trì đăng nhập trên thiết bị
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => toast.info('Vui lòng liên hệ Quản trị viên hệ thống để được cấp lại mật khẩu.')}
                  className="text-xs font-bold text-[#1f3864] hover:text-[#3e86c9] transition-colors cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Banner hiển thị lỗi trực quan */}
              {error && (
                <div className="rounded-2xl bg-red-50 p-3.5 text-xs text-danger border border-red-200 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-red-800">Không thể đăng nhập</p>
                    <p className="text-red-700 leading-relaxed font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Nút Đăng Nhập Chính */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 rounded-2xl bg-[#1f3864] hover:bg-[#16294d] text-white font-bold text-base shadow-xl shadow-[#1f3864]/25 transition-all duration-200 flex items-center justify-center relative active:scale-[0.99] disabled:pointer-events-none disabled:opacity-65 cursor-pointer mt-3"
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
          <div className="w-full max-w-md mx-auto mt-6 pt-4 border-t border-slate-100">
            <div className="bg-[#5fc4b0]/10 border border-[#5fc4b0]/30 rounded-2xl p-3.5 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-[#5fc4b0]/20 text-[#1f3864] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-[#247061]" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black tracking-wide text-[#1f3864] uppercase">
                  HỖ TRỢ LÀM VIỆC NGOẠI TUYẾN
                </div>
                <div className="text-xs text-slate-600 font-medium">
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
