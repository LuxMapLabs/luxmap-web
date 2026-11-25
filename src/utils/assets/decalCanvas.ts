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

const DISPLAY = '"Plus Jakarta Sans", "Segoe UI", Arial, sans-serif'
const TEXT = DISPLAY

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
 * Tìm cỡ chữ lớn nhất (từ maxSize xuống minSize) để văn bản vừa trong maxWidth.
 * Trả về null nếu ngay cả minSize vẫn không vừa.
 */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  family: string,
  maxSize: number,
  minSize: number,
  maxWidth: number
): number | null {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= maxWidth) return size
  }
  return null
}

/**
 * Tách mã dài thành 2 dòng cân đối, ưu tiên ngắt sau dấu gạch (- _ / .)
 */
function splitCode(ctx: CanvasRenderingContext2D, text: string, font: string): [string, string] {
  ctx.font = font
  const cuts: number[] = []
  for (let i = 0; i < text.length - 1; i++) {
    if ('-_/.'.includes(text[i])) cuts.push(i + 1)
  }
  if (cuts.length === 0) {
    for (let i = 1; i < text.length; i++) cuts.push(i)
  }
  let best = cuts[0]
  let bestWidth = Infinity
  for (const cut of cuts) {
    const w = Math.max(
      ctx.measureText(text.slice(0, cut)).width,
      ctx.measureText(text.slice(cut)).width
    )
    if (w < bestWidth) {
      bestWidth = w
      best = cut
    }
  }
  return [text.slice(0, best), text.slice(best)]
}

/**
 * Ngắt văn bản thành nhiều dòng vừa độ rộng, xuống dòng theo từ;
 * từ nào dài hơn cả dòng thì ngắt theo ký tự. Không bao giờ cắt bớt chữ.
 */
function breakLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.trim().split(/\s+/)) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth) {
      current = test
      continue
    }
    if (current) lines.push(current)
    current = ''
    let rest = word
    while (ctx.measureText(rest).width > maxWidth) {
      let cut = rest.length - 1
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > maxWidth) cut--
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    current = rest
  }
  if (current) lines.push(current)
  return lines
}

interface FittedValue {
  size: number
  lines: string[]
}

/**
 * Chọn cỡ chữ và số dòng: ưu tiên 1 dòng (giảm cỡ dần đến minSize),
 * không vừa thì xuống dòng (tối đa maxLines) ở cỡ minSize + 2.
 */
function fitValue(
  ctx: CanvasRenderingContext2D,
  text: string,
  weight: number,
  family: string,
  maxSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number
): FittedValue {
  const single = fitFontSize(ctx, text, weight, family, maxSize, minSize, maxWidth)
  if (single) return { size: single, lines: [text] }
  for (let size = minSize + 4; size >= minSize; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`
    const lines = breakLines(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { size, lines }
  }
  ctx.font = `${weight} ${minSize}px ${family}`
  const lines = breakLines(ctx, text, maxWidth)
  if (lines.length > maxLines) {
    // Quá dài tuyệt đối: giữ maxLines dòng, dòng cuối rút gọn để không tràn khung
    const kept = lines.slice(0, maxLines - 1)
    kept.push(fitText(ctx, lines.slice(maxLines - 1).join(' '), maxWidth))
    return { size: minSize, lines: kept }
  }
  return { size: minSize, lines }
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
        document.fonts.load('500 24px "Plus Jakarta Sans"'),
        document.fonts.load('600 24px "Plus Jakarta Sans"'),
        document.fonts.load('700 32px "Plus Jakarta Sans"'),
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
  const ctaLabel = 'Đèn không sáng? Quét mã QR để báo cho đơn vị quản lý'
  const ctaSize = fitFontSize(ctx, ctaLabel, 700, TEXT, 32, 22, 950) ?? 22
  ctx.font = `700 ${ctaSize}px ${TEXT}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const ctaText = ctaLabel
  ctx.fillText(ctaText, 525, 538)
  ctx.restore()

  // 2. QR (trái): hộp roundRect(56, 56, 400, 400, 20) nền trắng, viền LINE 2px
  roundRect(ctx, 44, 52, 420, 420, 20)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.lineWidth = 2
  ctx.strokeStyle = LINE
  ctx.stroke()

  if (data.qrDataUrl) {
    try {
      const qrImg = await loadImage(data.qrDataUrl)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(qrImg, 58, 66, 392, 392)
      ctx.imageSmoothingEnabled = true
    } catch (err) {
      console.error('Lỗi khi vẽ mã QR lên canvas:', err)
    }
  }

  // 3. Cột phải: x = 500, maxW = 494. Baseline alphabetic, căn trái trừ khi ghi khác
  const x = 490
  const maxW = 510

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // - Thương hiệu: biểu tượng + tên + mô tả trên một hàng
  try {
    const mark = await loadImage(luxmapMark)
    ctx.drawImage(mark, x, 52, 35.5, 40)
  } catch (err) {
    console.error('Lỗi khi vẽ logo lên canvas:', err)
  }
  ctx.fillStyle = NAVY
  ctx.font = `800 34px ${DISPLAY}`
  ctx.fillText('LuxMap', x + 48, 84)
  const luxMapWidth = ctx.measureText('LuxMap').width
  ctx.fillStyle = MUTED
  ctx.font = `500 22px ${TEXT}`
  ctx.fillText('Chiếu sáng công cộng', x + 48 + luxMapWidth + 14, 84)
  ctx.fillStyle = LINE
  ctx.fillRect(x, 108, maxW, 2)

  // - Các mục thông tin: tự co chữ / xuống dòng, dàn đều theo chiều dọc phần còn lại
  const clean = (v?: string | null) => (v && v.trim() ? v.trim() : '-')

  // Mã cột: nằm ngang, 1 dòng nếu vừa; dài thì giảm cỡ rồi ngắt 2 dòng ở dấu gạch
  const poleCodeValue = clean(data.poleCode)
  let codeFit: FittedValue
  const codeSingle = fitFontSize(ctx, poleCodeValue, 800, DISPLAY, 44, 30, maxW)
  if (codeSingle) {
    codeFit = { size: codeSingle, lines: [poleCodeValue] }
  } else {
    const [first, second] = splitCode(ctx, poleCodeValue, `800 32px ${DISPLAY}`)
    const size = Math.min(
      fitFontSize(ctx, first, 800, DISPLAY, 32, 18, maxW) ?? 18,
      fitFontSize(ctx, second, 800, DISPLAY, 32, 18, maxW) ?? 18
    )
    codeFit = { size, lines: [fitText(ctx, first, maxW), fitText(ctx, second, maxW)] }
  }
  const infoRows = [
    { label: 'Mã cột', icon: false, color: NAVY, weight: 800, family: DISPLAY, fit: codeFit },
    {
      label: 'Tuyến đường',
      icon: false,
      color: INK,
      weight: 700,
      family: TEXT,
      fit: fitValue(ctx, clean(data.segmentName), 700, TEXT, 36, 22, maxW, 2),
    },
    {
      label: 'Địa bàn',
      icon: true,
      color: INK,
      weight: 700,
      family: TEXT,
      fit: fitValue(ctx, clean(data.communeName), 700, TEXT, 32, 20, maxW - 36, 2),
    },
    {
      label: 'Ghi chú',
      icon: false,
      color: BODY,
      weight: 500,
      family: TEXT,
      fit: fitValue(ctx, clean(data.note), 500, TEXT, 28, 18, maxW, 3),
    },
  ]
  const LABEL_H = 30
  const rowHeights = infoRows.map(
    (r) => LABEL_H + r.fit.lines.length * Math.round(r.fit.size * 1.25)
  )
  const areaTop = 124
  const areaBottom = 484
  const slack = areaBottom - areaTop - rowHeights.reduce((a, b) => a + b, 0)
  const pad = Math.max(4, Math.min(20, Math.floor(slack / 8)))
  let cursor = areaTop + Math.max(0, Math.floor((slack - 6 * pad) / 2))

  infoRows.forEach((r, i) => {
    ctx.fillStyle = MUTED
    ctx.font = `600 22px ${TEXT}`
    ctx.fillText(r.label, x, cursor + 20)

    const lineH = Math.round(r.fit.size * 1.25)
    const valueX = r.icon ? x + 36 : x
    if (r.icon) drawMapPinIcon(ctx, x, cursor + LABEL_H + 2, 26, NAVY)
    ctx.fillStyle = r.color
    ctx.font = `${r.weight} ${r.fit.size}px ${r.family}`
    r.fit.lines.forEach((line, li) => {
      ctx.fillText(line, valueX, cursor + LABEL_H + r.fit.size + li * lineH)
    })

    cursor += rowHeights[i]
    if (i < infoRows.length - 1) {
      ctx.fillStyle = LINE
      ctx.fillRect(x, cursor + pad, maxW, 2)
      cursor += 2 * pad
    }
  })

  // 4. Viền khung ngoài sau cùng (NAVY 6px) để viền nằm trên
  roundRect(ctx, 20, 20, 1010, 560, 28)
  ctx.lineWidth = 6
  ctx.strokeStyle = NAVY
  ctx.stroke()

  return canvas
}
