import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Edit2, EllipsisVertical } from 'lucide-react'

export interface RowActionMenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  /** Hành động nguy hiểm (xóa, tháo dỡ): hiển thị màu đỏ và ngăn cách với nhóm còn lại */
  danger?: boolean
}

export interface RowActionsProps {
  viewLabel: string
  editLabel: string
  onView?: () => void
  onEdit?: () => void
  /** Các hành động phụ và nguy hiểm: gom vào menu "Thêm thao tác" */
  menuItems?: RowActionMenuItem[]
  align?: 'end' | 'center'
}

const MENU_WIDTH = 208

const iconButtonClass =
  'p-1.5 text-slate-500 dark:text-slate-400 rounded-lg transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'

export const RowActions: React.FC<RowActionsProps> = ({
  viewLabel,
  editLabel,
  onView,
  onEdit,
  menuItems = [],
  align = 'end',
}) => {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const toggleMenu = () => {
    if (open) {
      setOpen(false)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    if (rect) {
      const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8))
      setPosition({ top: rect.bottom + 4, left })
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open, close])

  // Chỉ có đúng một thao tác phụ: hiện thành nút riêng, không giấu trong menu "⋯"
  const singleItem = menuItems.length === 1 ? menuItems[0] : null
  const overflowItems = singleItem ? [] : menuItems
  const regularItems = overflowItems.filter((item) => !item.danger)
  const dangerItems = overflowItems.filter((item) => item.danger)

  const renderItem = (item: RowActionMenuItem) => (
    <button
      key={item.key}
      type="button"
      role="menuitem"
      onClick={() => {
        close()
        item.onClick()
      }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition cursor-pointer ${
        item.danger
          ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
          : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      {item.icon && <span className="shrink-0 [&>svg]:w-4 [&>svg]:h-4">{item.icon}</span>}
      <span>{item.label}</span>
    </button>
  )

  return (
    <div className={`flex items-center gap-1 ${align === 'end' ? 'justify-end' : 'justify-center'}`}>
      {onView && (
        <button
          type="button"
          onClick={onView}
          title={viewLabel}
          aria-label={viewLabel}
          className={`${iconButtonClass} hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800`}
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title={editLabel}
          aria-label={editLabel}
          className={`${iconButtonClass} hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800`}
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}
      {singleItem && (
        <button
          type="button"
          onClick={singleItem.onClick}
          title={singleItem.label}
          aria-label={singleItem.label}
          className={`${iconButtonClass} [&>svg]:w-4 [&>svg]:h-4 ${
            singleItem.danger
              ? 'hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              : 'hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800'
          }`}
        >
          {singleItem.icon}
        </button>
      )}
      {overflowItems.length > 0 && (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={toggleMenu}
            title="Thêm thao tác"
            aria-label="Thêm thao tác"
            aria-haspopup="menu"
            aria-expanded={open}
            className={`${iconButtonClass} hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 ${
              open ? 'bg-slate-100 dark:bg-slate-800 text-slate-800' : ''
            }`}
          >
            <EllipsisVertical className="w-4 h-4" />
          </button>
          {open &&
            position &&
            createPortal(
              <div
                ref={menuRef}
                role="menu"
                style={{ position: 'fixed', top: position.top, left: position.left, width: MENU_WIDTH }}
                className="z-60 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 animate-in fade-in duration-100"
              >
                {regularItems.map(renderItem)}
                {regularItems.length > 0 && dangerItems.length > 0 && (
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" role="separator" />
                )}
                {dangerItems.map(renderItem)}
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  )
}
