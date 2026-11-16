import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

vi.mock('../../../../feature/iot/iotAPI', () => ({
  default: {
    getPoleControl: vi.fn(() => Promise.resolve(null)),
    sendCommand: vi.fn(),
  },
}))

import rootReducer from '../../../../redux/rootReducer'
import { loginSuccess } from '../../../../feature/auth/authSlice'
import { GisDrawerPanel, type GisDrawerPanelProps } from '../../../../pages/gis-map/components/GisDrawerPanel'
import { SegmentReshapeBar } from '../../../../pages/gis-map/components/SegmentReshapeBar'
import type { CurrentUserResponse } from '../../../../types/auth/me'

const renderSegmentPanel = (role: string, overrides: Partial<GisDrawerPanelProps> = {}) => {
  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  })
  store.dispatch(loginSuccess({ user: { user_id: 'U-1', username: 'u', role } as unknown as CurrentUserResponse }))
  const props: GisDrawerPanelProps = {
    selectedPole: null,
    setSelectedPole: vi.fn(),
    setSelectedSegmentId: vi.fn(),
    activeSegmentDetail: { id: 'SEG-003', name: 'Tuyến B', cabinet: '', road: '', poleCount: 3, lengthM: 1213 },
    handleSelectPole: vi.fn(),
    cabinets: [],
    effectivePoles: [],
    onStartReshapeSegment: vi.fn(),
    ...overrides,
  }
  render(
    <Provider store={store}>
      <GisDrawerPanel {...props} />
    </Provider>
  )
  return props
}

describe('Khung tuyến trên Bản đồ GIS: lấy hình theo đường trên bản đồ', () => {
  it('Quản lý thấy nút; bấm thì bật chế độ lấy hình', () => {
    const props = renderSegmentPanel('manager')
    const button = screen.getByRole('button', { name: /Lấy hình theo đường trên bản đồ/ })
    fireEvent.click(button)
    expect(props.onStartReshapeSegment).toHaveBeenCalledTimes(1)
  })

  it('Cấp giám sát chỉ xem: không có nút', () => {
    renderSegmentPanel('superior')
    expect(screen.queryByText('Hình tuyến')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lấy hình theo đường/ })).not.toBeInTheDocument()
  })

  it('đang lấy hình: khoá nút', () => {
    renderSegmentPanel('manager', { isReshapingSegment: true })
    expect(screen.getByRole('button', { name: /Đang lấy hình trên bản đồ/ })).toBeDisabled()
  })
})

describe('Thanh lấy hình tuyến', () => {
  const renderBar = (overrides: Partial<React.ComponentProps<typeof SegmentReshapeBar>> = {}) => {
    const props: React.ComponentProps<typeof SegmentReshapeBar> = {
      label: 'Tuyến B',
      pointCount: 2,
      lengthM: 1214,
      oldLengthM: 1213,
      polesFar: [],
      error: null,
      saving: false,
      onUndo: vi.fn(),
      onCancel: vi.fn(),
      onSave: vi.fn(),
      ...overrides,
    }
    render(<SegmentReshapeBar {...props} />)
    return { bar: screen.getByRole('dialog', { name: 'Lấy hình tuyến Tuyến B' }), props }
  }

  it('chưa bấm điểm nào: hướng dẫn bấm điểm đầu, chưa cho lưu hay bỏ điểm', () => {
    const { bar } = renderBar({ pointCount: 0, lengthM: null })
    expect(within(bar).getByText(/Bấm vào điểm đầu tuyến/)).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Lưu hình tuyến' })).toBeDisabled()
    expect(within(bar).getByRole('button', { name: 'Bỏ điểm cuối' })).toBeDisabled()
  })

  it('mới có điểm đầu: chưa có đoạn nên chưa cho lưu', () => {
    const { bar } = renderBar({ pointCount: 1, lengthM: null })
    expect(within(bar).getByRole('button', { name: 'Lưu hình tuyến' })).toBeDisabled()
    expect(within(bar).getByRole('button', { name: 'Bỏ điểm cuối' })).toBeEnabled()
  })

  it('có đoạn, mọi cột trong hành lang: so chiều dài mới với đang lưu, cho lưu, ghi nguồn bản đồ', () => {
    const { bar, props } = renderBar()
    expect(within(bar).getByText('1.214 m')).toBeInTheDocument()
    expect(within(bar).getByText('1.213 m')).toBeInTheDocument()
    expect(within(bar).getByText(/© OpenStreetMap/)).toBeInTheDocument()
    fireEvent.click(within(bar).getByRole('button', { name: 'Lưu hình tuyến' }))
    expect(props.onSave).toHaveBeenCalledTimes(1)
  })

  it('còn cột ngoài hành lang 25 m: liệt kê và chặn lưu', () => {
    const { bar } = renderBar({ polesFar: ['KS-07', 'KS-08'] })
    expect(within(bar).getByText(/2 cột của tuyến còn cách đường mới quá 25 m \(KS-07, KS-08\)/)).toBeInTheDocument()
    expect(within(bar).getByRole('button', { name: 'Lưu hình tuyến' })).toBeDisabled()
  })

  it('nhiều cột xa: chỉ nêu 3 mã đầu cho thanh khỏi che bản đồ', () => {
    const { bar } = renderBar({ polesFar: ['KS-01', 'KS-02', 'KS-03', 'KS-04'] })
    expect(within(bar).getByText(/4 cột .* \(KS-01, KS-02, KS-03…\)\./)).toBeInTheDocument()
  })

  it('hiện lỗi khi bấm không trúng đường', () => {
    const { bar } = renderBar({ error: 'Chỗ vừa bấm không nằm trên con đường nào của bản đồ nền.' })
    expect(within(bar).getByText(/không nằm trên con đường nào/)).toBeInTheDocument()
  })
})
