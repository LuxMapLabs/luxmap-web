import React from 'react'

export interface PoleTableSkeletonProps {
  rowCount?: number
}

export const PoleTableSkeleton: React.FC<PoleTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Mã cột */}
          <td className="p-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tuyến đường */}
          <td className="p-3.5">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tủ điện nguồn */}
          <td className="p-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </td>
          {/* Tọa độ GIS */}
          <td className="p-3.5">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Ghi chú */}
          <td className="p-3.5">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Địa bàn */}
          <td className="p-3.5">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Mã bóng */}
          <td className="p-3.5">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Trạng thái */}
          <td className="p-3.5">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full" />
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
