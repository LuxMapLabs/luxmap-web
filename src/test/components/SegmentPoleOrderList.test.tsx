import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { SegmentPoleOrderList } from '../../components/SegmentPoleOrderList'
import type { OrderedPole } from '../../utils/gis-map/segmentPoleOrder'

const route: OrderedPole[] = [
  { id: 'POLE-0001', coord: [106.8, 10.8] },
  { id: 'POLE-0002', coord: [106.801, 10.8] },
  { id: 'POLE-0003', coord: [106.802, 10.8] },
]
const codes = { 'POLE-0001': 'C-01', 'POLE-0002': 'C-02', 'POLE-0003': 'C-03' }

const setup = (overrides: Partial<React.ComponentProps<typeof SegmentPoleOrderList>> = {}) => {
  const props = {
    route,
    codes,
    highlightId: null,
    revealId: null,
    onHover: vi.fn(),
    onFocus: vi.fn(),
    onMove: vi.fn(),
    onRemove: vi.fn(),
    onAutoSort: vi.fn(),
    ...overrides,
  }
  render(<SegmentPoleOrderList {...props} />)
  return props
}

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('SegmentPoleOrderList', () => {
  it('hiện mã cột theo đúng thứ tự, đánh dấu đầu tuyến và cuối tuyến', () => {
    setup()
    const items = rows()
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('C-01')
    expect(items[0]).toHaveTextContent('Đầu tuyến')
    expect(items[1]).toHaveTextContent('C-02')
    expect(items[1]).not.toHaveTextContent('Đầu tuyến')
    expect(items[1]).not.toHaveTextContent('Cuối tuyến')
    expect(items[2]).toHaveTextContent('C-03')
    expect(items[2]).toHaveTextContent('Cuối tuyến')
  })

  it('danh sách rỗng thì hiện hướng dẫn thay vì để trống', () => {
    setup({ route: [] })
    expect(screen.getByText(/Chưa chọn cột nào/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('đổi chỗ hoặc bỏ cột thì xóa vòng sáng để không kẹt ở cột cũ trên bản đồ', () => {
    const onHover = vi.fn()
    setup({ highlightId: 'POLE-0002', onHover })
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ C-02 khỏi tuyến' }))
    expect(onHover).toHaveBeenLastCalledWith(null)
    onHover.mockClear()
    const items = rows()
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(items[0], { dataTransfer })
    fireEvent.drop(items[2], { dataTransfer })
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('nút bỏ gọi onRemove với đúng id cột', () => {
    const { onRemove } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ C-02 khỏi tuyến' }))
    expect(onRemove).toHaveBeenCalledWith('POLE-0002')
  })

  it('rê chuột vào dòng báo onHover(id), rời khỏi báo onHover(null); click dòng gọi onFocus', () => {
    const { onHover, onFocus } = setup()
    const second = rows()[1]
    fireEvent.mouseEnter(second)
    expect(onHover).toHaveBeenLastCalledWith('POLE-0002')
    fireEvent.mouseLeave(second)
    expect(onHover).toHaveBeenLastCalledWith(null)

    fireEvent.click(within(second).getByTitle('Xem cột này trên bản đồ'))
    expect(onFocus).toHaveBeenCalledWith('POLE-0002')
  })

  it('kéo dòng đầu thả xuống dòng cuối thì gọi onMove(0, 2)', () => {
    const { onMove } = setup()
    const items = rows()
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(items[0], { dataTransfer })
    fireEvent.dragOver(items[2], { dataTransfer })
    fireEvent.drop(items[2], { dataTransfer })
    expect(onMove).toHaveBeenCalledWith(0, 2)
  })

  it('thả lên chính dòng đang kéo thì không đổi gì ngoài việc gọi onMove cùng chỉ số', () => {
    const { onMove } = setup()
    const items = rows()
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
    fireEvent.dragStart(items[1], { dataTransfer })
    fireEvent.drop(items[1], { dataTransfer })
    expect(onMove).toHaveBeenCalledWith(1, 1)
  })

  it('sắp xếp tự động bị khóa khi dưới 3 cột và gọi onAutoSort khi đủ', () => {
    const { onAutoSort } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Sắp xếp tự động' }))
    expect(onAutoSort).toHaveBeenCalledTimes(1)
  })

  it('sắp xếp tự động bị khóa khi chỉ có 2 cột', () => {
    setup({ route: route.slice(0, 2) })
    expect(screen.getByRole('button', { name: 'Sắp xếp tự động' })).toBeDisabled()
  })
})
