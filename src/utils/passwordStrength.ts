import type { ZxcvbnFactory } from '@zxcvbn-ts/core'
import { PASSWORD_MIN_LENGTH } from '../validations/password.schema'

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface PasswordStrength {
  /** 0 = chưa nhập, 1 = rất yếu, 2 = yếu, 3 = trung bình, 4 = khá, 5 = mạnh */
  level: PasswordStrengthLevel
  label: string
}

export const STRENGTH_LABELS: Record<PasswordStrengthLevel, string> = {
  0: 'Chưa rõ',
  1: 'Rất yếu',
  2: 'Yếu',
  3: 'Trung bình',
  4: 'Khá',
  5: 'Mạnh',
}

export const STRENGTH_MAX_LEVEL = 5

// Chỉ đo tối đa ký tự đầu để giữ phản hồi nhanh với mật khẩu rất dài (khuyến nghị của zxcvbn-ts)
const MAX_CHECKED_LENGTH = 100
// Từ gắn với hệ thống: mật khẩu dựa trên tên này bị coi là dễ đoán
const APP_TERMS = ['luxmap']

// Ngưỡng độ khó đoán (log10 số lần đoán) chia mật khẩu đủ dài thành 5 bậc.
// Thang điểm 0 đến 4 của zxcvbn dồn hầu hết mật khẩu từ 12 ký tự vào điểm cao nhất, nên dùng thang liên tục để chia đều.
const WEAK_MIN_LOG10 = 6
const MEDIUM_MIN_LOG10 = 8
const GOOD_MIN_LOG10 = 11
const STRONG_MIN_LOG10 = 14

/**
 * Đổi độ khó đoán (guessesLog10 của zxcvbn) thành bậc hiển thị cho thanh độ mạnh.
 * Chỉ để gợi ý, không chặn việc gửi form. Backend chỉ bắt buộc độ dài tối thiểu,
 * nên mật khẩu chưa đủ độ dài luôn là Rất yếu dù độ khó đoán cao.
 * guessesLog10 = null nghĩa là thư viện chưa nạp xong: tạm coi mật khẩu đủ dài là Trung bình.
 */
export const mapGuessesToStrength = (password: string, guessesLog10: number | null): PasswordStrength => {
  let level: PasswordStrengthLevel
  if (!password) level = 0
  else if (password.length < PASSWORD_MIN_LENGTH) level = 1
  else if (guessesLog10 === null) level = 3
  else if (guessesLog10 < WEAK_MIN_LOG10) level = 1
  else if (guessesLog10 < MEDIUM_MIN_LOG10) level = 2
  else if (guessesLog10 < GOOD_MIN_LOG10) level = 3
  else if (guessesLog10 < STRONG_MIN_LOG10) level = 4
  else level = 5

  return { level, label: STRENGTH_LABELS[level] }
}

/** Có đủ chữ thường, chữ hoa, số và ký tự đặc biệt. Chỉ để gợi ý, backend không bắt buộc. */
export const hasAllCharacterTypes = (password: string): boolean =>
  /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password) && /\d/.test(password) && /[^\p{L}\p{N}\s]/u.test(password)

let checkerPromise:Promise<ZxcvbnFactory> | null = null

/**
 * Nạp zxcvbn-ts và từ điển theo kiểu lazy (tách chunk riêng, chỉ tải khi mở trang đặt mật khẩu)
 */
export const loadPasswordChecker = (): Promise<ZxcvbnFactory> => {
  if (!checkerPromise) {
    checkerPromise = Promise.all([
      import('@zxcvbn-ts/core'),
      import('@zxcvbn-ts/language-common'),
      import('@zxcvbn-ts/language-en'),
    ])
      .then(([core, common, en]) =>
        new core.ZxcvbnFactory({
          dictionary: { ...common.dictionary, ...en.dictionary },
          graphs: common.adjacencyGraphs,
          translations: en.translations,
          // Không bật useLevenshteinDistance: đo thực tế chậm tới ~850ms mỗi lần gõ, làm đứng ô nhập
        }),
      )
      .catch((error) => {
        checkerPromise = null
        throw error
      })
  }
  return checkerPromise
}

export const measureGuessesLog10 = (checker: ZxcvbnFactory, password: string): number =>
  checker.check(password.slice(0, MAX_CHECKED_LENGTH), APP_TERMS).guessesLog10
