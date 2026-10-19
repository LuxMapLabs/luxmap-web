import React from 'react'

export interface CabinetTableSkeletonProps {
  rowCount?: number
}

export const CabinetTableSkeleton: React.FC<CabinetTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Mã tủ điện */}
          <td className="p-3.5">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tên tủ điện / Lộ nguồn */}
          <td className="p-3.5">
            <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Địa bàn */}
          <td className="p-3.5">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Số cột quản lý */}
          <td className="p-3.5">
            <div className="h-4 w-14 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tọa độ GIS */}
          <td className="p-3.5">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
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
