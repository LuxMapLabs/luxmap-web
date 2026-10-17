/**
 * Tiện ích vẽ Tem QR Decal Cột Đèn chất lượng cao lên thẻ HTML Canvas
 * - Hoàn toàn độc lập với CSS Tailwind v4 (Triệt tiêu 100% lỗi parse màu "oklch" của html2canvas)
 * - Hỗ trợ hiển thị 100% TIẾNG VIỆT CÓ DẤU sắc nét bằng Canvas 2D Text API
 * - Chuẩn kích thước tỉ lệ tem decal: 105mm x 60mm (Tỉ lệ 7:4, render ở độ phân giải 1050px x 600px cho độ sắc nét cực cao)
 * - Thiết kế tối ưu không gian: Bỏ mã cột POLE-xxxx, mở rộng kích thước mã QR to rõ,
 *   bên phải hiển thị nổi bật: TUYẾN ĐƯỜNG, ĐỊA BÀN QUẢN LÝ và MÃ TEM QUÉT 16 ký tự Backend.
 */

export interface DecalCanvasData {
  poleCode?: string | null
  segmentName?: string | null
  communeName?: string | null
  qrDataUrl: string
  qrCodeText?: string | null
}

/**
 * Tải ảnh từ data URL thành đối tượng HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/**
 * Cắt ngắn văn bản nếu vượt quá độ rộng cho phép trên Canvas
 */
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text
  }
  let truncated = text
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return truncated + '...'
}

/**
 * Vẽ khung chữ nhật bo góc
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Vẽ icon MapPin vector sắc nét chuẩn Lucide MapPin
 */
function drawMapPinIcon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  const scale = size / 24
  ctx.scale(scale, scale)

  ctx.strokeStyle = color
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Vẽ hình giọt nước pin
  ctx.beginPath()
  ctx.moveTo(12, 22)
  ctx.bezierCurveTo(7.5, 17.5, 4, 13.5, 4, 9.5)
  ctx.bezierCurveTo(4, 5.1, 7.6, 1.5, 12, 1.5)
  ctx.bezierCurveTo(16.4, 1.5, 20, 5.1, 20, 9.5)
  ctx.bezierCurveTo(20, 13.5, 16.5, 17.5, 12, 22)
  ctx.closePath()
  ctx.stroke()

  // Vẽ lỗ tròn nhỏ ở giữa
  ctx.beginPath()
  ctx.arc(12, 9.5, 3.2, 0, Math.PI * 2)
  ctx.stroke()

  ctx.restore()
}

/**
 * Render một con tem decal hoàn chỉnh lên thẻ Canvas
 * @returns HTMLCanvasElement đã được vẽ hoàn chỉnh
 */
export async function renderDecalToCanvas(data: DecalCanvasData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas')
  const width = 1050
  const height = 600
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas 2D context.')
  }

  // 1. Nền trắng toàn bộ
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // 2. Đường viền bao ngoài bo góc chuẩn công nghiệp (Border xanh than đậm #1f3864)
  const margin = 20
  const cardW = width - margin * 2
  const cardH = height - margin * 2
  roundRect(ctx, margin, margin, cardW, cardH, 28)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 6
  ctx.strokeStyle = '#1f3864'
  ctx.stroke()

  // 3. Header Tem
  const headerY = margin + 50
  // Biểu tượng chấm tròn xanh
  ctx.beginPath()
  ctx.arc(margin + 40, headerY - 10, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#2563eb'
  ctx.fill()

  // Tiêu đề thương hiệu
  ctx.fillStyle = '#1f3864'
  ctx.font = 'bold 27px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText('LUXMAP — CHIẾU SÁNG ĐÔ THỊ', margin + 66, headerY - 10)

  // Nhãn phụ bên phải
  ctx.fillStyle = '#475569'
  ctx.font = 'bold 20px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Tem Quét Báo Sự Cố', margin + cardW - 35, headerY - 10)

  // Đường kẻ phân cách Header
  ctx.beginPath()
  ctx.moveTo(margin + 28, margin + 82)
  ctx.lineTo(margin + cardW - 28, margin + 82)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2
  ctx.stroke()

  // 4. Vẽ Mã QR (Khối bên trái - Phóng to lên 360px cho quét cực nhạy)
  const qrBoxX = margin + 35
  const qrBoxY = margin + 100
  const qrBoxSize = 360

  // Hộp viền chứa QR
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 24)
  ctx.fillStyle = '#f8fafc'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#cbd5e1'
  ctx.stroke()

  // Vẽ hình ảnh QR code
  if (data.qrDataUrl) {
    try {
      const qrImg = await loadImage(data.qrDataUrl)
      const qrPadding = 16
      ctx.drawImage(
        qrImg,
        qrBoxX + qrPadding,
        qrBoxY + qrPadding,
        qrBoxSize - qrPadding * 2,
        qrBoxSize - qrPadding * 2
      )
    } catch (err) {
      console.error('Lỗi khi vẽ mã QR lên canvas:', err)
    }
  }

  // 5. Khối thông tin định danh (Bên phải - Tối ưu hiển thị Tuyến, Địa bàn và Mã tem quét 16 ký tự)
  const infoX = qrBoxX + qrBoxSize + 40
  const maxInfoWidth = margin + cardW - infoX - 35

  let currentY = qrBoxY + 36
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // 5.1. TUYẾN ĐƯỜNG
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText('TUYẾN ĐƯỜNG', infoX, currentY)

  currentY += 40
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 30px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  const segText = fitText(ctx, data.segmentName || 'Chưa gắn tuyến', maxInfoWidth)
  ctx.fillText(segText, infoX, currentY)

  // 5.2. ĐỊA BÀN QUẢN LÝ (kèm icon MapPin)
  currentY += 56
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText('ĐỊA BÀN QUẢN LÝ', infoX, currentY)

  currentY += 40
  drawMapPinIcon(ctx, infoX, currentY - 24, 28, '#059669')

  ctx.fillStyle = '#1e293b'
  ctx.font = 'bold 26px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  const comText = fitText(ctx, data.communeName || 'Địa bàn chung', maxInfoWidth - 40)
  ctx.fillText(comText, infoX + 38, currentY)

  // 5.3. MÃ TEM QUÉT (16 KÝ TỰ BACKEND)
  currentY += 56
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText('MÃ TEM QUÉT', infoX, currentY)

  currentY += 46
  const displayCode = data.qrCodeText || data.poleCode || '---'

  // Badge nền nổi bật cho Mã tem quét
  const badgePadX = 16
  const badgeH = 46
  ctx.font = '900 32px "Consolas", "Courier New", monospace'
  const codeWidth = ctx.measureText(displayCode).width
  const badgeW = Math.min(codeWidth + badgePadX * 2, maxInfoWidth)

  roundRect(ctx, infoX, currentY - 34, badgeW, badgeH, 10)
  ctx.fillStyle = '#eff6ff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = '#bfdbfe'
  ctx.stroke()

  ctx.fillStyle = '#1d4ed8'
  ctx.fillText(fitText(ctx, displayCode, badgeW - badgePadX * 2), infoX + badgePadX, currentY)

  // 6. Đường kẻ phân cách Footer
  const footerDividerY = margin + cardH - 65
  ctx.beginPath()
  ctx.setLineDash([8, 6])
  ctx.moveTo(margin + 28, footerDividerY)
  ctx.lineTo(margin + cardW - 28, footerDividerY)
  ctx.strokeStyle = '#cbd5e1'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([]) // Reset dash

  // 7. Footer Hướng dẫn người dân
  const footerY = margin + cardH - 26
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#475569'
  ctx.font = 'bold 20px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText(
    '📱 Dùng camera điện thoại quét mã QR để báo sự cố đèn chiếu sáng',
    margin + cardW / 2,
    footerY
  )

  return canvas
}
