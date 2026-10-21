import React from 'react'

export interface IotNodeTableSkeletonProps {
  rowCount?: number
}

export const IotNodeTableSkeleton: React.FC<IotNodeTableSkeletonProps> = ({ rowCount = 8 }) => {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {/* Mã thiết bị */}
          <td className="py-3.5 px-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Tủ điện */}
          <td className="py-3.5 px-4">
            <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
          </td>
          {/* Khu vực */}
          <td className="py-3.5 px-4">
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Nguồn dữ liệu */}
          <td className="py-3.5 px-4 text-center">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
          </td>
          {/* Điều khiển từ xa */}
          <td className="py-3.5 px-4 text-center">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
          </td>
          {/* Xác thực (Secret) */}
          <td className="py-3.5 px-4 text-center">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto" />
          </td>
          {/* Báo cáo gần nhất */}
          <td className="py-3.5 px-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Rơ-le đấu nối */}
          <td className="py-3.5 px-4">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded-md" />
          </td>
          {/* Thao tác */}
          <td className="py-3.5 px-4 text-right">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg ml-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}
