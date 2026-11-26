import { describe, it, expect } from 'vitest'
import { buildPoleQrLabelsPdf } from '../../utils/work-schedule/poleQrLabelsPdf'
import type { PoleListItem } from '../../types/assets/poles'
import type { QrCodeItem } from '../../types/qr-codes/qr-codes'

const pole = (poleId: string): PoleListItem =>
  ({ pole_id: poleId, segment_id: 'SEG-012', commune_id: 'COM-001', commune_name: 'Phước Thiện' }) as PoleListItem

const qr = (poleId: string): QrCodeItem =>
  ({ pole_id: poleId, url: `https://luxmap.example/r/${poleId}`, active: true }) as QrCodeItem

describe('buildPoleQrLabelsPdf', () => {
  it('fails naming every pole that has no active QR code instead of skipping it', async () => {
    await expect(
      buildPoleQrLabelsPdf({
        poles: [pole('POLE-0111'), pole('POLE-0168'), pole('POLE-0114')],
        codesByPoleId: { 'POLE-0111': qr('POLE-0111'), 'POLE-0168': null },
        segmentId: 'SEG-012',
        segmentName: 'Phước Thiện',
      })
    ).rejects.toThrow('Chưa có mã QR cho cột POLE-0114, POLE-0168')
  })

  it('fails when no pole is given', async () => {
    await expect(
      buildPoleQrLabelsPdf({ poles: [], codesByPoleId: {}, segmentId: 'SEG-012', segmentName: 'Phước Thiện' })
    ).rejects.toThrow('Chưa có mã QR')
  })
})
