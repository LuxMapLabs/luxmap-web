import type { CSSProperties } from 'react'

/** Độ trễ xuất hiện theo thứ tự: dùng cùng class glass-enter (biến CSS --i). */
export const enterDelay = (index: number): CSSProperties => ({ '--i': index } as CSSProperties)
