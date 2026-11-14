import { useShowCommune } from '../../../../../hooks/useShowCommune'
import React from 'react'

export interface IotNodeTableSkeletonProps {
  rowCount?: number
}

/** Khung chờ cho bảng thiết bị IoT: mã, tủ, (địa bàn), mạch, server, trạng thái, lần nhận, thao tác. */
export const IotNodeTableSkeleton: React.FC<IotNodeTableSkeletonProps> = ({ rowCount = 8 }) => {
  const showCommune = useShowCommune()
  const widths = ['w-24', 'w-28', ...(showCommune ? ['w-28'] : []), 'w-20', 'w-24', 'w-24', 'w-24', 'w-20']
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <tr key={index} className="animate-pulse">
          {widths.map((width, col) => (
            <td key={col} className="py-3.5 px-4">
              <div className={`h-4 ${width} bg-slate-200 dark:bg-slate-800 rounded-md`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
