import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { StorageDistributionCard } from '../../pages/admin-dashboard/components/StorageDistributionCard'
import type { StorageSummary } from '../../types/admin/system'

const GB = 1024 ** 3
const MB = 1024 ** 2
const storage: StorageSummary = {
  disk: { total_bytes: 38 * GB, free_bytes: 8.3 * GB, free_ratio: 8.3 / 38, low: false },
  database_bytes: 24 * MB,
  buckets: [{ bytes: 20 * MB }, { bytes: 38 * MB }, {}],
}

const rowFor = (name: string) => {
  const row = screen.getByText(name).closest('dt')?.parentElement
  if (!row) throw new Error(`Missing breakdown row: ${name}`)
  return within(row)
}

describe('StorageDistributionCard', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      unobserve() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows used bytes, total bytes and the matching used percentage', () => {
    render(<StorageDistributionCard storage={storage} />)

    expect(screen.getByText('29.7')).toHaveTextContent('29.7 GB')
    expect(screen.getByText('đã dùng trên 38 GB')).toBeInTheDocument()
    const donut = screen.getByRole('img', { name: 'Đã dùng 78% dung lượng ổ cứng' })
    expect(within(donut).getByText('78%')).toBeInTheDocument()
    expect(within(donut).getByText('đã dùng')).toBeInTheDocument()
  })

  it('shows the free size exactly once, in the breakdown', () => {
    const { container } = render(<StorageDistributionCard storage={storage} />)

    expect(screen.getAllByText('8.3 GB')).toHaveLength(1)
    expect(container.textContent?.match(/8\.3 GB/g)).toHaveLength(1)
    expect(rowFor('Trống').getByText('8.3 GB')).toBeInTheDocument()
    expect(rowFor('Trống').getByText('22%')).toBeInTheDocument()
  })

  it('adds the database and every bucket, and accounts for the remaining used space', () => {
    render(<StorageDistributionCard storage={{
      disk: { total_bytes: 10 * GB, free_bytes: 2 * GB },
      database_bytes: GB,
      buckets: [{ bytes: GB }, { bytes: 2 * GB }, {}],
    }} />)

    expect(rowFor('Dữ liệu LuxMap').getByText('4 GB')).toBeInTheDocument()
    expect(rowFor('Dữ liệu LuxMap').getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL 1 GB · Ảnh MinIO 3 GB')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('4 GB')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('Hệ điều hành, Docker, log…')).toBeInTheDocument()
  })

  it('clamps system and other usage at zero when LuxMap data exceeds used space', () => {
    render(<StorageDistributionCard storage={{
      disk: { total_bytes: 10 * GB, free_bytes: 9 * GB },
      database_bytes: GB,
      buckets: [{ bytes: GB }],
    }} />)

    expect(rowFor('Dữ liệu LuxMap').getByText('2 GB')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('0 B')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('0%')).toBeInTheDocument()
  })

  it('shows <1% for a non-zero tiny share', () => {
    render(<StorageDistributionCard storage={storage} />)

    expect(rowFor('Dữ liệu LuxMap').getByText('82 MB')).toBeInTheDocument()
    expect(rowFor('Dữ liệu LuxMap').getByText('<1%')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL 24 MB · Ảnh MinIO 58 MB')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('29.6 GB')).toBeInTheDocument()
  })

  it.each([true, false])('uses disk.low=%s for the badge and the API free_ratio for context', (low) => {
    render(<StorageDistributionCard storage={{
      ...storage,
      disk: { ...storage.disk, low, free_ratio: 0.42 },
    }} />)

    expect(screen.getByText(low ? 'Sắp đầy' : 'An toàn')).toBeInTheDocument()
    expect(screen.queryByText(low ? 'An toàn' : 'Sắp đầy')).not.toBeInTheDocument()
    expect(screen.getByText('Còn trống 42%')).toBeInTheDocument()
  })

  it('keeps the breakdown with missing database and bucket data', () => {
    render(<StorageDistributionCard storage={{ disk: storage.disk }} />)

    expect(rowFor('Dữ liệu LuxMap').getByText('0 B')).toBeInTheDocument()
    expect(rowFor('Dữ liệu LuxMap').getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('PostgreSQL 0 B · Ảnh MinIO 0 B')).toBeInTheDocument()
    expect(rowFor('Hệ thống & khác').getByText('29.7 GB')).toBeInTheDocument()
    expect(screen.queryByText('Chưa có dữ liệu dung lượng.')).not.toBeInTheDocument()
  })

  it('shows a missing free ratio as unavailable', () => {
    render(<StorageDistributionCard storage={{ disk: { total_bytes: GB, free_bytes: GB / 2 } }} />)

    expect(screen.getByText('Còn trống -')).toBeInTheDocument()
  })

  it.each([undefined, {}, { database_bytes: MB }, { disk: { total_bytes: 0 } }])(
    'keeps the empty state without usable disk data (%j)',
    (emptyStorage) => {
      render(<StorageDistributionCard storage={emptyStorage} />)

      expect(screen.getByText('Chưa có dữ liệu dung lượng.')).toBeInTheDocument()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
      expect(screen.queryByText('An toàn')).not.toBeInTheDocument()
      expect(screen.queryByText('Dữ liệu LuxMap')).not.toBeInTheDocument()
    },
  )
})
