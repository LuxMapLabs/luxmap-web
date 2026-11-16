import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoleTable } from '../../../../../pages/assets/components/poles/components/PoleTable'
import { PoleDetailModal } from '../../../../../pages/assets/components/poles/components/PoleDetailModal'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { FeederListItem } from '../../../../../types/assets/feeders'

vi.mock('../../../../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))

const feeder = (feeder_id: string, external_ref: string): FeederListItem => ({
  feeder_id,
  external_ref,
  feeder_name: null,
  commune_id: 'commune_tl8',
  commune_name: null,
  has_geometry: false,
  pole_count: 1,
  updated_at: null,
})

// Dữ liệu dev: mã hiển thị của mạch này trùng mã nội bộ của mạch kia
const feeders = [feeder('FDR-009', 'FDR-CAB-TL8-A'), feeder('FDR-011', 'FDR-009')]

const pole: PoleListItem = {
  pole_id: 'POLE-0001',
  external_ref: 'POLE-0001',
  feeder_id: 'FDR-009',
  cabinet_name: 'Tủ A - Tỉnh Lộ 8',
  commune_id: 'commune_tl8',
  commune_name: null,
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat: 10.97, lng: 106.49 },
  updated_at: '2026-11-11T00:00:00Z',
} as PoleListItem

describe('Mã mạch của cột hiện mã hiển thị', () => {
  it('PoleTable hiện mã hiển thị của đúng mạch, không hiện mã nội bộ', () => {
    render(
      <PoleTable
        poles={[pole]}
        cabinets={[]}
        segments={[]}
        feeders={feeders}
        onViewDetail={vi.fn()}
        onEdit={vi.fn()}
        onViewCabinetDetail={vi.fn()}
      />
    )
    expect(screen.getByText(/Tủ A - Tỉnh Lộ 8 • FDR-CAB-TL8-A/)).toBeInTheDocument()
  })

  it('PoleDetailModal hiện mã hiển thị của đúng mạch', () => {
    render(<PoleDetailModal isOpen pole={pole} feeders={feeders} onClose={vi.fn()} />)
    expect(screen.getByText('FDR-CAB-TL8-A')).toBeInTheDocument()
    expect(screen.queryByText(/FDR-009/)).not.toBeInTheDocument()
  })
})
