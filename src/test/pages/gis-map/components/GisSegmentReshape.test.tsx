import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
    ...overrides,
  }
  render(
    <Provider store={store}>
      <GisDrawerPanel {...props} />
    </Provider>
  )
  return props
}

describe('Khung tuyến trên Bản đồ GIS', () => {
  it('không có thẻ "Hình tuyến" / nút lấy hình theo đường (việc đó làm ở form Sửa tuyến)', () => {
    renderSegmentPanel('manager')
    expect(screen.getByText('Thông tin tuyến')).toBeInTheDocument()
    expect(screen.queryByText('Hình tuyến')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Vẽ hình tuyến/ })).not.toBeInTheDocument()
  })
})
