import React from 'react'
import { Link } from 'react-router-dom'
import loginBgHq from '../assets/images/login-bg-hq.png'
import luxmapMark from '../assets/images/luxmap-mark.svg'

// Hai lớp [&_input] cuối: ô trình duyệt tự điền vẫn nền trắng và không lấn góc bo
export const INPUT_WRAP =
  'relative flex h-[46px] items-center rounded-xl border transition-all duration-150 focus-within:ring-2 motion-reduce:transition-none [&_input]:rounded-[11px] [&_input:-webkit-autofill]:shadow-[inset_0_0_0_100px_white]'
export const INPUT_OK =
  'border-slate-300 bg-white hover:border-slate-400 focus-within:border-primary focus-within:ring-primary/20'
export const INPUT_ERROR =
  'border-rose-400 bg-white focus-within:border-rose-500 focus-within:ring-rose-500/20'

export const PRIMARY_BUTTON =
  'flex h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-white no-underline shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none'

/** Khung dùng chung cho các trang xác thực: ảnh trái + form phải, hoặc một thẻ canh giữa khi showImage = false */
export const AuthPageShell: React.FC<{ children: React.ReactNode; showImage?: boolean }> = ({
  children,
  showImage = true,
}) => (
  <div
    className="ops-theme ops-bg font-ops antialiased flex min-h-screen w-full flex-col p-2 text-slate-900 md:p-4"
    // Trang không ảnh: nền xanh đậm hơn nền app để thẻ nổi lên, tránh cảm giác trắng trống
    style={
      showImage
        ? undefined
        : {
            backgroundColor: '#d3ddec',
            backgroundImage:
              'radial-gradient(900px 600px at 12% 0%, rgba(124,155,198,.4), transparent 70%), radial-gradient(900px 700px at 90% 100%, rgba(47,85,144,.28), transparent 70%)',
          }
    }
  >
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border border-white/70 bg-[#e8edf5]/85 shadow-ops backdrop-blur-xl ${
        showImage
          ? 'flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_clamp(420px,40%,560px)]'
          : 'm-auto w-full max-w-[520px]'
      }`}
    >
      {/* Ảnh đêm: từ lg nằm bên trái, dưới lg là dải ngang phía trên */}
      {showImage ? (
        <div className="relative h-[min(160px,15vh)] shrink-0 overflow-hidden rounded-b-3xl bg-[#060c16] md:max-lg:h-[28vh] max-lg:[@media(max-height:760px)]:hidden lg:h-auto lg:rounded-l-none lg:rounded-r-3xl">
          <img
            src={loginBgHq}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[8%_50%] max-lg:object-[0%_60%] max-lg:origin-[0%_60%] max-lg:scale-[1.25]"
          />
          {/* Phủ navy cùng tông nút ở cạnh giáp form */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-l from-[#1f3864]/35 via-transparent to-transparent max-lg:hidden"
          />
          {/* Gradient tối nhẹ ở đáy ảnh */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[35%] bg-linear-to-t from-[#060c16]/60 via-[#060c16]/20 to-transparent"
          />
          {/* Quầng hổ phách nhẹ quanh đèn vàng */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 mix-blend-screen max-lg:hidden"
            style={{
              background:
                'radial-gradient(320px 320px at 55% 47%, rgba(233,162,59,.22), transparent 70%)',
            }}
          />
        </div>
      ) : null}

      {/* Cột form kính xanh navy nhạt, sáng nhẹ ở góc trên phải; liên kết chính sách ở đáy cột */}
      <main
        className={`relative flex flex-1 flex-col px-5 sm:px-6 lg:px-12 [@media(max-height:659px)]:py-2 ${
          showImage ? 'py-4' : 'pt-8 pb-3 [@media(max-height:759px)]:pt-5'
        }`}
        style={{
          backgroundImage:
            'radial-gradient(600px 400px at 100% 0%, rgba(255,255,255,0.55), transparent 70%)',
        }}
      >
        <div className="flex flex-1 items-center justify-center">
          <div className="auth-scale w-full max-w-[440px]">
            {/* Logo đồng bộ với sidebar ứng dụng, canh trái cùng mép ô nhập */}
            <div
              className="mb-7 flex items-center gap-3 select-none [@media(max-height:659px)]:mb-3"
            >
              <img src={luxmapMark} alt="" className="h-14 w-auto shrink-0 [@media(max-height:659px)]:h-11" />
              <span className="text-xl font-extrabold tracking-wide text-slate-900">LUXMAP</span>
            </div>
            {children}
          </div>
        </div>
        <Link
          to="/privacy"
          className={`auth-scale mx-auto inline-flex min-h-11 shrink-0 items-center rounded text-[13px] font-semibold text-slate-600 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
            showImage ? '[@media(max-height:659px)]:hidden' : '[@media(max-height:759px)]:hidden'
          }`}
        >
          Chính sách quyền riêng tư
        </Link>
      </main>
    </div>
  </div>
)
