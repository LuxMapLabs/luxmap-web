/**
 * Tiện ích vẽ Tem QR Decal Cột Đèn chất lượng cao lên thẻ HTML Canvas
 * - Hoàn toàn độc lập với CSS Tailwind v4 (Triệt tiêu 100% lỗi parse màu "oklch" của html2canvas)
 * - Hỗ trợ hiển thị 100% TIẾNG VIỆT CÓ DẤU sắc nét bằng Canvas 2D Text API
 * - Chuẩn kích thước tỉ lệ tem decal: 105mm x 60mm (Tỉ lệ 7:4, render ở độ phân giải 1050px x 600px cho độ sắc nét cực cao)
 * - Thiết kế đồng bộ 100% với giao diện xem trước HTML
 */

export interface DecalCanvasData {
  poleCode: string
  segmentName?: string | null
  communeName?: string | null
  qrDataUrl: string
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
  ctx.font = 'bold 19px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('Tem Quét Báo Sự Cố', margin + cardW - 35, headerY - 10)

  // Đường kẻ phân cách Header
  ctx.beginPath()
  ctx.moveTo(margin + 28, margin + 82)
  ctx.lineTo(margin + cardW - 28, margin + 82)
  ctx.strokeStyle = '#e2e8f0'
  ctx.lineWidth = 2
  ctx.stroke()

  // 4. Vẽ Mã QR (Khối bên trái)
  const qrBoxX = margin + 35
  const qrBoxY = margin + 105
  const qrBoxSize = 340

  // Hộp viền chứa QR
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 22)
  ctx.fillStyle = '#f8fafc'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = '#cbd5e1'
  ctx.stroke()

  // Vẽ hình ảnh QR code
  if (data.qrDataUrl) {
    try {
      const qrImg = await loadImage(data.qrDataUrl)
      const qrPadding = 18
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

  // 5. Thông tin định danh cột đèn (Khối bên phải)
  const infoX = qrBoxX + qrBoxSize + 42
  const maxInfoWidth = margin + cardW - infoX - 35

  // 5.1. Nhãn & Mã Cột Đèn
  let currentY = qrBoxY + 32
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText('MÃ CỘT ĐÈN', infoX, currentY)

  currentY += 48
  ctx.fillStyle = '#1e3a8a'
  ctx.font = '900 48px "Consolas", "Courier New", monospace'
  ctx.fillText(data.poleCode || '---', infoX, currentY)

  // 5.2. Nhãn & Tuyến Đường
  currentY += 50
  ctx.fillStyle = '#64748b'
  ctx.font = 'bold 18px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  ctx.fillText('TUYẾN ĐƯỜNG', infoX, currentY)

  currentY += 36
  ctx.fillStyle = '#0f172a'
  ctx.font = 'bold 26px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  const segText = fitText(ctx, data.segmentName || 'Chưa gắn tuyến', maxInfoWidth)
  ctx.fillText(segText, infoX, currentY)

  // 5.3. Địa bàn xã / phường (kèm icon MapPin vector xanh ngọc chuẩn Lucide)
  currentY += 46
  drawMapPinIcon(ctx, infoX, currentY - 22, 26, '#059669')

  ctx.fillStyle = '#334155'
  ctx.font = 'bold 22px "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  const comText = fitText(ctx, data.communeName || 'Địa bàn chung', maxInfoWidth - 36)
  ctx.fillText(comText, infoX + 34, currentY)

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
