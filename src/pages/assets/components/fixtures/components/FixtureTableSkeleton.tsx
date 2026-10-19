import React from 'react'

export interface FixtureTableSkeletonProps {
  rowCount?: number
}

export const FixtureTableSkeleton: React.FC<FixtureTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Mã bóng */}
          <td className="py-3.5 px-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Cột Lắp Đặt */}
          <td className="py-3.5 px-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </td>
          {/* Tuyến Đường */}
          <td className="py-3.5 px-3.5">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Công Suất */}
          <td className="py-3.5 px-3.5 text-center">
            <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
          </td>
          {/* Loại Bóng / Nguồn */}
          <td className="py-3.5 px-3.5">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Ngày Lắp Đặt */}
          <td className="py-3.5 px-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Hạn Bảo Hành */}
          <td className="py-3.5 px-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Trạng Thái */}
          <td className="py-3.5 px-3.5 text-center">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
          </td>
          {/* Thao Tác */}
          <td className="py-3.5 px-3.5 text-center">
            <div className="h-6 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}
