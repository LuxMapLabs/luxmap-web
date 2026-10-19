import React from 'react'

export interface SegmentTableSkeletonProps {
  rowCount?: number
}

export const SegmentTableSkeleton: React.FC<SegmentTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Mã tuyến */}
          <td className="p-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tên tuyến đường */}
          <td className="p-3.5">
            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Cấp đường */}
          <td className="p-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </td>
          {/* Chiều dài (m) */}
          <td className="p-3.5">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Số cột chiếu sáng */}
          <td className="p-3.5">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Địa bàn */}
          <td className="p-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Nguồn dữ liệu */}
          <td className="p-3.5">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Thao tác */}
          <td className="p-3.5 text-right">
            <div className="h-6 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}
