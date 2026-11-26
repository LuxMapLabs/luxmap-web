import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { renderDecalToCanvas } from '../assets/decalCanvas'
import type { PoleListItem } from '../../types/assets/poles'
import type { QrCodeItem } from '../../types/qr-codes/qr-codes'

interface PoleQrLabelsPdfInput {
  poles: PoleListItem[]
  codesByPoleId: Record<string, QrCodeItem | null>
  segmentId: string
  segmentName: string
}

/**
 * Tạo file PDF tem QR cho các cột của lệnh Cập nhật vị trí cột.
 * 1 cột → 1 tem khổ A6 ngang; nhiều cột → khổ A4 dọc, 2x4 = 8 tem/trang, xếp theo mã cột.
 * Cột nào chưa có mã QR đang hiệu lực thì báo lỗi, không bỏ qua âm thầm.
 */
export async function buildPoleQrLabelsPdf({
  poles,
  codesByPoleId,
  segmentId,
  segmentName,
}: PoleQrLabelsPdfInput): Promise<File> {
  const sortedPoles = [...poles].sort((a, b) =>
    (a.external_ref || a.pole_id || '').localeCompare(b.external_ref || b.pole_id || '', 'vi', { numeric: true })
  )

  const missing = sortedPoles.filter((p) => !codesByPoleId[p.pole_id || '']?.url).map((p) => p.pole_id || '-')
  if (sortedPoles.length === 0 || missing.length > 0) {
    throw new Error(`Chưa có mã QR cho cột ${missing.join(', ') || '-'}`)
  }

  const decalDataUrls: string[] = []
  for (const pole of sortedPoles) {
    const qrDataUrl = await QRCode.toDataURL(codesByPoleId[pole.pole_id || '']?.url as string, {
      width: 400,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
    const canvas = await renderDecalToCanvas({
      poleCode: pole.external_ref || pole.pole_id,
      segmentName,
      communeName: pole.commune_name || '',
      note: pole.note || '',
      qrDataUrl,
    })
    decalDataUrls.push(canvas.toDataURL('image/png'))
  }

  if (sortedPoles.length === 1) {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a6' })
    const pageWidth = 148
    const pageHeight = 105
    const decalWidthMm = 126
    const decalHeightMm = (decalWidthMm * 600) / 1050
    doc.addImage(
      decalDataUrls[0],
      'PNG',
      (pageWidth - decalWidthMm) / 2,
      (pageHeight - decalHeightMm) / 2,
      decalWidthMm,
      decalHeightMm,
      undefined,
      'FAST'
    )
    return new File([doc.output('blob')], `Tem_QR_${sortedPoles[0].pole_id}.pdf`, { type: 'application/pdf' })
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const cols = 2
  const itemsPerPage = cols * 4
  const cardWidth = 92
  const cardHeight = (cardWidth * 600) / 1050
  const marginX = 9
  const marginY = 12
  const gap = 8

  decalDataUrls.forEach((dataUrl, index) => {
    const indexOnPage = index % itemsPerPage
    if (index > 0 && indexOnPage === 0) {
      doc.addPage()
    }
    const x = marginX + (indexOnPage % cols) * (cardWidth + gap)
    const y = marginY + Math.floor(indexOnPage / cols) * (cardHeight + gap)
    doc.addImage(dataUrl, 'PNG', x, y, cardWidth, cardHeight, undefined, 'FAST')
  })

  return new File(
    [doc.output('blob')],
    `Danh_Sach_Tem_QR_${sortedPoles.length}_Cot_${segmentId || 'Tuyen'}.pdf`,
    { type: 'application/pdf' }
  )
}
