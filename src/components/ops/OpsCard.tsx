import React from 'react'

interface OpsCardProps {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  /** Thứ tự xuất hiện (mỗi bậc trễ thêm 70ms) */
  index?: number
  /** Bỏ padding nội dung để bảng chạm sát mép thẻ */
  flush?: boolean
  className?: string
  children?: React.ReactNode
}

// Thẻ chuẩn của Manager/Superior: nổi bằng bóng mềm, hiện dần khi vào trang, nhấc lên và ánh teal khi rê chuột
export const OpsCard: React.FC<OpsCardProps> = ({
  title,
  description,
  actions,
  index = 0,
  flush = false,
  className = '',
  children,
}) => (
  <section
    style={{ '--i': index } as React.CSSProperties}
    className={`ops-rise bg-white rounded-[20px] shadow-ops transition-all duration-300 hover:-translate-y-0.5 hover:shadow-ops-hover ${className}`}
  >
    {(title || actions) && (
      <header className="flex items-start justify-between gap-3 px-6 pt-5">
        <div className="min-w-0">
          {title && <h2 className="text-[15px] font-extrabold text-slate-900">{title}</h2>}
          {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </header>
    )}
    <div className={flush ? '' : 'px-6 pb-6 pt-4'}>{children}</div>
  </section>
)
