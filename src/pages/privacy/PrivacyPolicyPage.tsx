import { Link } from 'react-router-dom'
import { ArrowLeft, Info, KeyRound, Mail, ShieldCheck, Target, Trash2 } from 'lucide-react'
import luxmapMark from '../../assets/images/luxmap-mark.svg'

const CONTACT_EMAIL = 'luxmap.noreply@gmail.com'

const SECTIONS = [
  {
    id: 'gioi-thieu',
    icon: Info,
    title: 'Giới thiệu',
    body: 'LuxMap là hệ thống GIS quản lý tài sản và sự cố chiếu sáng công cộng nông thôn. Trang này mô tả dữ liệu mà hệ thống thu thập khi bạn sử dụng LuxMap.',
  },
  {
    id: 'dang-nhap-google',
    icon: KeyRound,
    title: 'Đăng nhập bằng Google',
    body: 'Khi bạn đăng nhập bằng Google, chúng tôi chỉ nhận địa chỉ email và tên hiển thị của bạn để xác định tài khoản đã được cấp quyền trong hệ thống. Chúng tôi không đọc dữ liệu Gmail, Google Drive hay bất kỳ dữ liệu Google nào khác.',
  },
  {
    id: 'muc-dich',
    icon: Target,
    title: 'Mục đích sử dụng dữ liệu',
    body: 'Thông tin chỉ được dùng để xác thực đăng nhập và phân quyền truy cập. Chúng tôi không bán hoặc chia sẻ thông tin này cho bên thứ ba.',
  },
  {
    id: 'xoa-du-lieu',
    icon: Trash2,
    title: 'Yêu cầu xóa dữ liệu',
    body: 'Để yêu cầu xóa dữ liệu hoặc hỏi về chính sách này, vui lòng liên hệ:',
  },
]

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <div
      className="ops-theme font-ops antialiased flex min-h-screen flex-col p-2 text-slate-800 md:p-4"
      // Cùng nền với trang đặt mật khẩu
      style={{
        backgroundColor: '#d3ddec',
        backgroundImage:
          'radial-gradient(900px 600px at 12% 0%, rgba(124,155,198,.4), transparent 70%), radial-gradient(900px 700px at 90% 100%, rgba(47,85,144,.28), transparent 70%)',
      }}
    >
      <main className="m-auto w-full max-w-[1000px] rounded-3xl border border-white/80 bg-white/90 p-5 shadow-ops backdrop-blur-xl sm:p-7">
        <header className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <img src={luxmapMark} alt="" className="h-14 w-auto shrink-0 [@media(max-height:659px)]:h-11" />
            <span className="text-xl font-extrabold tracking-wide text-slate-900">LUXMAP</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 motion-reduce:transition-none"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Đăng nhập
          </Link>
        </header>

        <div className="mt-5 flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[28px]">
              Chính sách quyền riêng tư
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">Áp dụng cho hệ thống LuxMap (luxmap.com.vn)</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {SECTIONS.map(({ id, title, icon: Icon, body }, index) => (
            <section key={id} aria-labelledby={id} className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                </span>
                <h2 id={id} className="text-base font-bold text-slate-900">
                  {index + 1}. {title}
                </h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{body}</p>
              {id === 'xoa-du-lieu' ? (
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-3 inline-flex min-h-11 max-w-full items-center gap-2 break-all rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 motion-reduce:transition-none"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {CONTACT_EMAIL}
                </a>
              ) : null}
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}

export default PrivacyPolicyPage
