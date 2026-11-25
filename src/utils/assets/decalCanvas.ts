/**
 * Tiện ích vẽ Tem QR Decal dán cột đèn (1050px x 600px)
 * Nguồn duy nhất cho in ấn PDF và xem trước trực tiếp trên giao diện
 */

import luxmapMark from '../../assets/images/luxmap-mark.svg'

export interface DecalCanvasData {
  poleCode?: string | null // external_ref
  segmentName?: string | null
  communeName?: string | null
  note?: string | null
  qrDataUrl: string
}

const NAVY = '#1f3864'
const AMBER = '#F5A623'
const INK = '#0f172a'
const BODY = '#334155'
const MUTED = '#64748b'
const LINE = '#cbd5e1'
const PLATE_LABEL = '#c7d3ea'

const TEXT = '"Be Vietnam Pro", "Segoe UI", Roboto, Arial, sans-serif'
const DISPLAY = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif'

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
 * Tách và cắt ngắn văn bản theo số dòng tối đa trên Canvas
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const words = trimmed.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    const testLine = currentLine ? `${currentLine} ${word}` : word
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine
    } else {
      if (lines.length + 1 === maxLines) {
        const remaining = [currentLine, ...words.slice(i)].filter(Boolean).join(' ')
        lines.push(fitText(ctx, remaining, maxWidth))
        return lines
      }
      if (currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        lines.push(fitText(ctx, word, maxWidth))
        currentLine = ''
      }
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine)
  }

  return lines
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
 * Vẽ icon MapPin vector sắc nét
 */
function drawMapPinIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string
) {
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
  if (typeof document !== 'undefined' && document.fonts?.load) {
    try {
      await Promise.all([
        document.fonts.load('600 32px "Be Vietnam Pro"'),
        document.fonts.load('500 24px "Be Vietnam Pro"'),
        document.fonts.load('800 56px "Plus Jakarta Sans"'),
      ])
    } catch {
      /* dùng font dự phòng */
    }
  }

  const canvas = document.createElement('canvas')
  const width = 1050
  const height = 600
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Không thể khởi tạo Canvas 2D context.')
  }

  // 1. Nền trắng
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Khung thẻ và dải dưới (CTA): vùng y từ 496 đến 580, nền AMBER, nằm gọn trong góc bo của khung
  ctx.save()
  roundRect(ctx, 20, 20, 1010, 560, 28)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.clip()
  ctx.fillStyle = AMBER
  ctx.fillRect(20, 496, 1010, 84)
  ctx.restore()

  // Chữ CTA: Đèn không sáng? Quét mã QR để báo cho đơn vị quản lý, 600 28px TEXT, căn giữa, middle tại y=538
  ctx.save()
  ctx.fillStyle = NAVY
  ctx.font = `600 28px ${TEXT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const ctaText = fitText(
    ctx,
    'Đèn không sáng? Quét mã QR để báo cho đơn vị quản lý',
    950
  )
  ctx.fillText(ctaText, 525, 538)
  ctx.restore()

  // 2. QR (trái): hộp roundRect(56, 56, 400, 400, 20) nền trắng, viền LINE 2px
  roundRect(ctx, 56, 56, 400, 400, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = LINE
  ctx.stroke()

  if (data.qrDataUrl) {
    try {
      const qrImg = await loadImage(data.qrDataUrl)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(qrImg, 70, 70, 372, 372)
      ctx.imageSmoothingEnabled = true
    } catch (err) {
      console.error('Lỗi khi vẽ mã QR lên canvas:', err)
    }
  }

  // 3. Cột phải: x = 500, maxW = 494. Baseline alphabetic, căn trái trừ khi ghi khác
  const x = 500
  const maxW = 494

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // - Thương hiệu: biểu tượng LuxMap cao 40px tại (500, 56)
  try {
    const mark = await loadImage(luxmapMark)
    ctx.drawImage(mark, 500, 56, 35.5, 40)
  } catch (err) {
    console.error('Lỗi khi vẽ logo lên canvas:', err)
  }

  // Chữ LuxMap 800 28px DISPLAY NAVY tại (546, 86)
  ctx.fillStyle = NAVY
  ctx.font = `800 28px ${DISPLAY}`
  ctx.fillText('LuxMap', 546, 86)

  // Ngay sau (đo width + 14px) chữ Chiếu sáng công cộng 500 22px TEXT MUTED cùng baseline 86
  const luxMapWidth = ctx.measureText('LuxMap').width
  ctx.fillStyle = MUTED
  ctx.font = `500 22px ${TEXT}`
  ctx.fillText('Chiếu sáng công cộng', 546 + luxMapWidth + 14, 86)

  // - Biển mã cột: roundRect(500, 108, 494, 108, 14) nền NAVY
  roundRect(ctx, 500, 108, 494, 108, 14)
  ctx.fillStyle = NAVY
  ctx.fill()

  // Nhãn Mã cột 500 20px TEXT PLATE_LABEL tại (524, 140)
  ctx.fillStyle = PLATE_LABEL
  ctx.font = `500 20px ${TEXT}`
  ctx.fillText('Mã cột', 524, 140)

  // Mã cột 800 56px DISPLAY trắng tại (524, 198), fitText tối đa 446px, rỗng thì -
  const poleCodeValue = data.poleCode && data.poleCode.trim() ? data.poleCode.trim() : '-'
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 56px ${DISPLAY}`
  ctx.fillText(fitText(ctx, poleCodeValue, 446), 524, 198)

  // - Tuyến đường 500 20px TEXT MUTED tại (500, 258); giá trị 600 32px TEXT INK tại (500, 296), fitText maxW, rỗng -
  ctx.fillStyle = MUTED
  ctx.font = `500 20px ${TEXT}`
  ctx.fillText('Tuyến đường', x, 258)

  const segmentValue = data.segmentName && data.segmentName.trim() ? data.segmentName.trim() : '-'
  ctx.fillStyle = INK
  ctx.font = `600 32px ${TEXT}`
  ctx.fillText(fitText(ctx, segmentValue, maxW), x, 296)

  // - Địa bàn nhãn 500 20px TEXT tại (500, 336); drawMapPinIcon(ctx, 500, 348, 26, NAVY); giá trị 500 28px TEXT INK tại (536, 372), fitText maxW - 36, rỗng -
  ctx.fillStyle = MUTED
  ctx.font = `500 20px ${TEXT}`
  ctx.fillText('Địa bàn', x, 336)

  drawMapPinIcon(ctx, x, 348, 26, NAVY)

  const communeValue = data.communeName && data.communeName.trim() ? data.communeName.trim() : '-'
  ctx.fillStyle = INK
  ctx.font = `500 28px ${TEXT}`
  ctx.fillText(fitText(ctx, communeValue, maxW - 36), 536, 372)

  // - Ghi chú nhãn 500 20px TEXT tại (500, 412); giá trị 500 24px TEXT BODY, wrapText maxW tối đa 2 dòng, dòng 1 y=444, dòng 2 y=474. Rỗng/null/chỉ khoảng trắng thì -
  ctx.fillStyle = MUTED
  ctx.font = `500 20px ${TEXT}`
  ctx.fillText('Ghi chú', x, 412)

  const noteRaw = data.note && data.note.trim() ? data.note.trim() : '-'
  ctx.fillStyle = BODY
  ctx.font = `500 24px ${TEXT}`
  const noteLines = wrapText(ctx, noteRaw, maxW, 2)
  if (noteLines[0]) ctx.fillText(noteLines[0], x, 444)
  if (noteLines[1]) ctx.fillText(noteLines[1], x, 474)

  // 4. Viền khung ngoài sau cùng (NAVY 6px) để viền nằm trên
  roundRect(ctx, 20, 20, 1010, 560, 28)
  ctx.lineWidth = 6
  ctx.strokeStyle = NAVY
  ctx.stroke()

  return canvas
}
