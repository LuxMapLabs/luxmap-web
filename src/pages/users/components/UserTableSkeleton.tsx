import React from 'react'

export interface UserTableSkeletonProps {
  rowCount?: number
}

export const UserTableSkeleton: React.FC<UserTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Người dùng / Tên đăng nhập */}
          <td className="py-2.5 px-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7.5 h-7.5 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
              <div className="space-y-1">
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
                <div className="h-2.5 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
              </div>
            </div>
          </td>

          {/* Vai trò */}
          <td className="py-2.5 px-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>

          {/* Địa bàn phụ trách */}
          <td className="py-2.5 px-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>

          {/* Trạng thái */}
          <td className="py-2.5 px-3.5">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
              <div className="h-3.5 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
            </div>
          </td>

          {/* Ngày khởi tạo */}
          <td className="py-2.5 px-3.5">
            <div className="h-3.5 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>

          {/* Thao tác (3 icon vuông 28x28px) */}
          <td className="py-2.5 px-3.5 text-right">
            <div className="inline-flex items-center gap-1">
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

