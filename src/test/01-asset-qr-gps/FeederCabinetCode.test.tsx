import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FeederTable } from '../../pages/assets/components/feeders/components/FeederTable'
import { FeederDetailModal } from '../../pages/assets/components/feeders/components/FeederDetailModal'
import type { FeederListItem } from '../../types/assets/feeders'
import type { CabinetListItem } from '../../types/assets/cabinets'

vi.mock('../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))

// Dữ liệu dev: mã hiển thị của tủ này trùng mã nội bộ của tủ kia
const cabinets = [
  { cabinet_id: 'CAB-007', external_ref: 'CAB-NVN-A', cabinet_name: 'Tủ A - Nguyễn Văn Ni' },
  { cabinet_id: 'CAB-NVN-X', external_ref: 'CAB-007', cabinet_name: 'Tủ khác' },
] as CabinetListItem[]

const feeder = {
  feeder_id: 'FDR-001',
  external_ref: 'FDR-CAB-NVN-A',
  feeder_name: 'Lộ 1 - Tủ A - Nguyễn Văn Ni',
  commune_id: 'commune_nvn',
  commune_name: null,
  has_geometry: false,
  pole_count: 0,
  updated_at: null,
  cabinet: {
    cabinet_id: 'CAB-007',
    cabinet_name: 'Tủ A - Nguyễn Văn Ni',
    location: { lat: 10.97, lng: 106.49 },
    cabinet_source: 'verified',
  },
} as FeederListItem

describe('Mã tủ của mạch hiện mã hiển thị', () => {
  it('FeederTable hiện mã hiển thị của đúng tủ', () => {
    render(
      <FeederTable feeders={[feeder]} cabinets={cabinets} onViewDetail={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.getByText('CAB-NVN-A')).toBeInTheDocument()
    expect(screen.queryByText('CAB-007')).not.toBeInTheDocument()
  })

  it('FeederDetailModal hiện mã hiển thị của đúng tủ', () => {
    render(<FeederDetailModal isOpen feeder={feeder} poles={[]} cabinets={cabinets} onClose={vi.fn()} />)
    expect(screen.getByText(/Mã tủ: CAB-NVN-A/)).toBeInTheDocument()
  })
})
