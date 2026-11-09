import { useEffect, useMemo, useState } from 'react'
import type { ZxcvbnFactory } from '@zxcvbn-ts/core'
import {
  loadPasswordChecker,
  mapGuessesToStrength,
  measureGuessesLog10,
  type PasswordStrength,
} from '../utils/passwordStrength'

// Chờ người dùng ngừng gõ một chút rồi mới đo, tránh chạy zxcvbn ở từng phím
const STRENGTH_DEBOUNCE_MS = 150

/**
 * Đo độ mạnh mật khẩu bằng zxcvbn-ts. Thư viện được nạp lazy khi hook mount;
 * lỗi nạp (mạng, chặn) thì thanh độ mạnh quay về mức theo độ dài, không ảnh hưởng việc đặt mật khẩu.
 */
export const usePasswordStrength = (password: string): PasswordStrength => {
  const [checker, setChecker] = useState<ZxcvbnFactory | null>(null)
  const [debouncedPassword, setDebouncedPassword] = useState(password)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedPassword(password), STRENGTH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [password])

  useEffect(() => {
    let cancelled = false
    loadPasswordChecker()
      .then((loaded) => {
        if (!cancelled) setChecker(loaded)
      })
      .catch(() => {
        // Bỏ qua: thanh độ mạnh dùng mức dự phòng theo độ dài
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Độ khó đoán chỉ tính theo giá trị đã debounce; độ dài (rỗng, dưới mức tối thiểu) vẫn xét theo giá trị đang gõ
  const guessesLog10 = useMemo(
    () => (checker && debouncedPassword ? measureGuessesLog10(checker, debouncedPassword) : null),
    [checker, debouncedPassword],
  )

  return useMemo(() => mapGuessesToStrength(password, guessesLog10), [password, guessesLog10])
}
