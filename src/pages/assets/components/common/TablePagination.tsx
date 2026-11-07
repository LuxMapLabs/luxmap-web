import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface TablePaginationProps {
  currentListLength: number
  /** Tổng số bản ghi từ server (nếu có); mặc định dùng currentListLength */
  totalCount?: number
  currentPage: number
  pageSize: number
  totalPages: number
  unitLabel: string
  isLoading?: boolean
  onPageChange: (page: number) => void
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentListLength,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  unitLabel,
  isLoading = false,
  onPageChange,
}) => {
  const totalRecords = totalCount ?? currentListLength
  if (isLoading) {
    return (
      <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="h-4 w-52 bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse" />
        <div className="flex items-center gap-1">
          <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-40">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-6 w-14 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 opacity-40">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
      <div>
        Hiển thị{' '}
        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
          {totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1}
        </strong>{' '}
        -{' '}
        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
          {Math.min(currentPage * pageSize, totalRecords)}
        </strong>{' '}
        trên tổng số{' '}
        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
          {totalRecords}
        </strong>{' '}
        bản ghi {unitLabel}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-slate-700 dark:text-slate-300 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg">
          {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-slate-700 dark:text-slate-300 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
