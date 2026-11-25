import React from 'react'

const PAGE_BACKGROUND = [
  'radial-gradient(900px 520px at 8% 4%, rgba(250,236,214,.9), transparent 62%)',
  'radial-gradient(800px 560px at 96% 10%, rgba(176,208,238,.85), transparent 62%)',
  'radial-gradient(700px 500px at 50% 100%, rgba(233,162,59,.18), transparent 60%)',
  'linear-gradient(180deg, #e9eef5 0%, #e3e1dc 100%)',
].join(',')

export const INPUT_WRAP = 'relative flex items-center rounded-2xl border bg-white/75 transition-shadow focus-within:ring-4'
export const INPUT_OK = 'border-slate-900/10 focus-within:border-[#1f3864] focus-within:ring-[#1f3864]/15'
export const INPUT_ERROR = 'border-red-400 focus-within:border-red-500 focus-within:ring-red-500/15'

export const PRIMARY_BUTTON =
  'flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#1f3864] to-[#2d5496] text-[15px] font-semibold text-white no-underline shadow-[0_14px_28px_-14px_rgba(31,56,100,0.7)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#1f3864]/25 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none'

/** Khung kính mờ dùng chung cho mọi trạng thái, cùng ngôn ngữ với khu Admin và Manager */
export const AuthPageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="relative isolate flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-10 text-slate-800"
    style={{ background: PAGE_BACKGROUND, fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
  >
    {/* Vầng sáng hổ phách như ánh đèn đường */}
    <div className="pointer-events-none absolute -top-16 right-[8%] -z-10 h-64 w-64 rounded-full bg-[#ffc27a] opacity-70 blur-[70px]" />
    <main className="w-full max-w-[440px] rounded-[32px] border border-white/80 bg-white/55 px-5 py-7 shadow-[0_40px_90px_-30px_rgba(72,84,110,0.35),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[34px] sm:px-8 sm:py-9">
      <div className="mb-6 flex items-center gap-2.5 font-bold text-[#1f3864]">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-gradient-to-br from-[#1f3864] to-[#2f5aa0]">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ffc27a] shadow-[0_0_12px_3px_rgba(255,194,122,0.8)]" />
        </span>
        LuxMap
      </div>
      {children}
    </main>
  </div>
)
