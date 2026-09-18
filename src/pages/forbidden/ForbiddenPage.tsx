import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import {
  ShieldAlert,
  ArrowLeft,
  Home,
  Map as MapIcon,
  Lightbulb,
  Lock,
} from 'lucide-react'
import { RootState } from '../../redux/rootReducer'

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useSelector((state: RootState) => state.auth)

  return (
    <div className="h-screen w-screen bg-[#f8fafc] relative overflow-hidden flex flex-col justify-between select-none font-sans text-slate-800">
      {/* Background GIS Grid & Radial Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Soft Radial Ambient Lights in Rose/Amber */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-200 h-125 bg-linear-to-b from-rose-100/50 via-amber-50/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-20 left-10 w-100 h-100 bg-rose-100/30 rounded-full blur-3xl" />
        <div className="absolute -top-20 right-10 w-100 h-100 bg-amber-100/30 rounded-full blur-3xl" />

        {/* Vector Grid Overlay */}
        <svg className="w-full h-full absolute inset-0 opacity-[0.04]">
          <defs>
            <pattern id="gis-grid-forbidden" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0f172a" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gis-grid-forbidden)" />
          <path d="M 100 150 Q 500 350 900 200 T 1600 500" fill="none" stroke="#0f172a" strokeWidth="4" strokeDasharray="12,12" />
          <path d="M 200 700 Q 700 500 1200 650 T 1800 200" fill="none" stroke="#0f172a" strokeWidth="4" strokeDasharray="12,12" />
        </svg>
      </div>

      {/* 1. Full-Width Top Navbar */}
      <header className="relative z-20 h-16 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/90 px-6 sm:px-12 flex items-center justify-between shrink-0 shadow-2xs">
        <div
          onClick={() => navigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20 transition-transform duration-200 group-hover:scale-105">
            <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-slate-900 uppercase">LuxMap</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded-md border border-rose-200">
                SECURITY RBAC
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
              Hệ thống GIS Quản lý Chiếu sáng Nông thôn
            </p>
          </div>
        </div>

        {user && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <span className="text-slate-500">Tài khoản:</span>
            <span className="font-bold text-slate-800">{user.username || user.fullName}</span>
          </div>
        )}
      </header>

      {/* 2. Expansive Center Hero Section */}
      <main className="relative z-10 w-full max-w-5xl mx-auto my-auto px-6 py-6 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-400">
        <div className="relative w-full flex flex-col items-center">
          {/* Giant Watermark 403 behind the Hero */}
          <div className="absolute -top-16 sm:-top-24 text-[120px] sm:text-[180px] font-black font-mono tracking-tighter text-rose-200/30 select-none pointer-events-none">
            403
          </div>

          {/* Animated Shield Graphic */}
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-rose-500/10 absolute inset-0 animate-ping [animation-duration:3s]" />
            <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-white to-rose-50/80 border border-rose-100 shadow-xl shadow-slate-200/80 flex items-center justify-center relative">
              <div className="w-14 h-14 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/30">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 px-2 py-0.5 bg-rose-600 text-white font-mono font-bold text-[10px] rounded-full shadow ring-2 ring-white flex items-center gap-1">
                <Lock className="w-3 h-3" />
                403
              </span>
            </div>
          </div>

          {/* Heading & Subtitles */}
          <div className="space-y-2 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Khu Vực Bị Hạn Chế Truy Cập
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto">
              Tài khoản của bạn hiện không đủ thẩm quyền để truy cập vào phân hệ này. Vui lòng liên hệ Quản trị viên nếu bạn cần cấp quyền truy cập công tác.
            </p>
          </div>

          {/* Interactive Action Buttons */}
          <div className="flex flex-row items-center justify-center gap-3 pt-6">
            <button
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-slate-300 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại trang trước</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-[#1f3864] hover:bg-[#1a2f55] text-white font-bold text-xs shadow-md shadow-slate-900/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
            >
              <Home className="w-4 h-4" />
              <span>Về Trang Chủ Tác Nghiệp</span>
            </button>
          </div>
        </div>
      </main>

      {/* 3. Full-Width Bottom Footer */}
      <footer className="relative z-20 w-full bg-white/80 backdrop-blur-md border-t border-slate-200/90 py-3.5 px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 shrink-0 shadow-2xs">
        <div>© 2026 LuxMap · Hệ thống GIS Quản lý Tài sản & Sự cố Chiếu sáng Nông thôn</div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <MapIcon className="w-3.5 h-3.5 text-primary" />
          <span>Kiểm soát phân quyền theo vai trò tác nghiệp (RBAC)</span>
        </div>
      </footer>
    </div>
  )
}

export default ForbiddenPage
