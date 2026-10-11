import CryptoJS from 'crypto-js'
import type { PoleListItem } from '../types/assets/poles'
import type { SegmentListItem } from '../types/assets/segments'

/**
 * DTO thông tin cột đèn giải mã từ mã QR (Local UI Entity)
 * Tái sử dụng trực tiếp các trường định danh từ PoleListItem và SegmentListItem
 * pole_code đại diện cho external_ref của cột đèn ngoài thực địa.
 */
export interface DecryptedPoleInfo {
  pole_code: NonNullable<PoleListItem['external_ref']>
  segment_name: NonNullable<SegmentListItem['segment_name']>
  commune_name: NonNullable<PoleListItem['commune_id']>
  issued_at?: number
}

export interface GeneratePoleQrTokenParams {
  pole_code: NonNullable<PoleListItem['external_ref']>
  segment_name?: SegmentListItem['segment_name']
  commune_name?: PoleListItem['commune_id']
}

// Khóa bí mật và Magic Prefix đọc từ biến môi trường Vite (.env)
export const QR_SECRET_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_QR_SECRET_KEY) || ''

export const QR_MAGIC_PREFIX =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_QR_MAGIC_PREFIX) || ''

/**
 * Sinh chuỗi mã QR token bảo mật 2 lớp: Magic Prefix + AES-256 (crypto-js)
 * Đóng gói: `${QR_MAGIC_PREFIX}${poleCode}~${segmentName}~${communeName}`
 * Chuyển đổi an toàn sang Base64URL-safe cho query param ?lux=
 * Tuyệt đối không để lộ pole_id nội bộ của cơ sở dữ liệu.
 */
export function generatePoleQrToken(params: GeneratePoleQrTokenParams): string {
  const poleCode = (params.pole_code || '').trim()
  const segmentName = (params.segment_name || '').trim()
  const communeName = (params.commune_name || '').trim()

  const payload = `${QR_MAGIC_PREFIX}${poleCode}~${segmentName}~${communeName}`
  const encrypted = CryptoJS.AES.encrypt(payload, QR_SECRET_KEY).toString()

  // Chuyển sang Base64URL-safe
  return encrypted.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Giải mã token `lux` từ URL bằng AES-256 (crypto-js) và kiểm tra Magic Prefix
 * Trả về DecryptedPoleInfo nếu giải mã thành công và đúng prefix.
 * Trả về null nếu token bị sai, giả mạo, sai secret key hoặc không có Magic Prefix.
 */
export function decryptPoleQrToken(lux: string | null | undefined): DecryptedPoleInfo | null {
  if (!lux || typeof lux !== 'string') return null
  const cleanLux = lux.trim()
  if (!cleanLux) return null

  try {
    // Khôi phục chuẩn Base64 từ Base64URL
    let base64 = cleanLux.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4 !== 0) {
      base64 += '='
    }

    const decryptedBytes = CryptoJS.AES.decrypt(base64, QR_SECRET_KEY)
    const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8)

    if (!decryptedText) {
      return null
    }

    // 2. Kiểm tra tính toàn vẹn 2 lớp bằng Magic Prefix (LUX#)
    if (!decryptedText.startsWith(QR_MAGIC_PREFIX)) {
      return null
    }

    // Cắt bỏ prefix
    const rawData = decryptedText.slice(QR_MAGIC_PREFIX.length)
    const parts = rawData.split('~')
    if (parts.length < 3) {
      return null
    }

    const [poleCode, segmentName, communeName] = parts
    if (!poleCode || !segmentName || !communeName) {
      return null
    }

    return {
      pole_code: poleCode,
      segment_name: segmentName,
      commune_name: communeName,
      issued_at: Math.floor(Date.now() / 1000),
    }
  } catch {
    return null
  }
}

/**
 * Xây dựng URL báo cáo sự cố chuẩn: `${origin}/report?lux=<aes_token>`
 */
export function buildPoleReportUrl(
  poleCode: NonNullable<PoleListItem['external_ref']>,
  segmentName: string = '',
  communeName: string = '',
  origin?: string
): string {
  const token = generatePoleQrToken({
    pole_code: poleCode,
    segment_name: segmentName,
    commune_name: communeName,
  })
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/report?lux=${token}`
}

/**
 * Hàm loại bỏ dấu Tiếng Việt sang ký tự ASCII tiêu chuẩn
 * Giúp văn bản hiển thị sạch sẽ, chính xác 100% trong file PDF khi dùng font chuẩn (Helvetica) của jsPDF
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

/**
 * Hàm wrapper tương thích ngược với CitizenReportSaga
 */
export function decryptAndVerifyQrToken(luxParam: string | null | undefined): DecryptedPoleInfo | null {
  return decryptPoleQrToken(luxParam)
}
