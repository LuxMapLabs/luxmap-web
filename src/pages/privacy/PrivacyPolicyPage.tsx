import { Link } from 'react-router-dom'
import { Lightbulb, Mail } from 'lucide-react'

const CONTACT_EMAIL = 'luxmap.noreply@gmail.com'

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col">
      <header className="h-16 w-full bg-white border-b border-slate-200 px-6 sm:px-12 flex items-center">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
            <Lightbulb className="w-5 h-5 text-amber-300 fill-amber-300" />
          </div>
          <span className="font-extrabold text-base tracking-wider text-slate-900 uppercase">LuxMap</span>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Chính sách quyền riêng tư</h1>
        <p className="mt-2 text-sm text-slate-500">Áp dụng cho hệ thống LuxMap (luxmap.com.vn)</p>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. Giới thiệu</h2>
            <p className="mt-2">
              LuxMap là hệ thống GIS quản lý tài sản và sự cố chiếu sáng công cộng nông thôn. Trang này mô tả
              dữ liệu mà hệ thống thu thập khi bạn sử dụng LuxMap.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">2. Đăng nhập bằng Google</h2>
            <p className="mt-2">
              Khi bạn đăng nhập bằng Google, chúng tôi chỉ nhận địa chỉ email và tên hiển thị của bạn để xác định
              tài khoản đã được cấp quyền trong hệ thống. Chúng tôi không đọc dữ liệu Gmail, Google Drive hay bất
              kỳ dữ liệu Google nào khác.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">3. Mục đích sử dụng dữ liệu</h2>
            <p className="mt-2">
              Thông tin chỉ được dùng để xác thực đăng nhập và phân quyền truy cập. Chúng tôi không bán hoặc chia
              sẻ thông tin này cho bên thứ ba.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">4. Yêu cầu xóa dữ liệu</h2>
            <p className="mt-2">Để yêu cầu xóa dữ liệu hoặc hỏi về chính sách này, vui lòng liên hệ:</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="mt-3 inline-flex items-center gap-2 font-semibold text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              {CONTACT_EMAIL}
            </a>
          </div>
        </section>
      </main>

      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-6 sm:px-12 text-xs text-slate-500">
        © 2026 LuxMap · Hệ thống GIS Quản lý Tài sản & Sự cố Chiếu sáng Nông thôn
      </footer>
    </div>
  )
}

export default PrivacyPolicyPage
