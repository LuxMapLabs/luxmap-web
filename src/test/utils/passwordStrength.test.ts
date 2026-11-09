import { describe, it, expect } from 'vitest'
import {
  hasAllCharacterTypes,
  loadPasswordChecker,
  mapGuessesToStrength,
  measureGuessesLog10,
} from '../../utils/passwordStrength'

describe('mapGuessesToStrength', () => {
  it('chưa nhập thì bậc 0', () => {
    expect(mapGuessesToStrength('', null).level).toBe(0)
  })

  it('dưới 12 ký tự luôn là Rất yếu dù độ khó đoán cao', () => {
    expect(mapGuessesToStrength('Ab1!xyz', 20).label).toBe('Rất yếu')
  })

  it('đủ dài nhưng thư viện chưa nạp thì tạm là Trung bình', () => {
    expect(mapGuessesToStrength('abcdefghijkl', null).label).toBe('Trung bình')
  })

  it('chia đủ 5 bậc theo ngưỡng độ khó đoán', () => {
    const password = 'a-long-enough-password'
    expect(mapGuessesToStrength(password, 3).label).toBe('Rất yếu')
    expect(mapGuessesToStrength(password, 6).label).toBe('Yếu')
    expect(mapGuessesToStrength(password, 7.9).label).toBe('Yếu')
    expect(mapGuessesToStrength(password, 8).label).toBe('Trung bình')
    expect(mapGuessesToStrength(password, 11).label).toBe('Khá')
    expect(mapGuessesToStrength(password, 14).label).toBe('Mạnh')
  })
})

describe('measureGuessesLog10 (zxcvbn-ts)', () => {
  it('mật khẩu dễ đoán đủ 12 ký tự vẫn ra Rất yếu', async () => {
    const checker = await loadPasswordChecker()
    for (const weak of ['passwordpassword', 'qwertyuiop123', 'abcdefghijkl']) {
      expect(mapGuessesToStrength(weak, measureGuessesLog10(checker, weak)).level).toBe(1)
    }
  })

  it('ví dụ thực tế rơi vào đúng từng bậc', async () => {
    const checker = await loadPasswordChecker()
    const levelOf = (p: string) => mapGuessesToStrength(p, measureGuessesLog10(checker, p)).level
    expect(levelOf('nguyenvana2004')).toBe(3)
    expect(levelOf('mattroimoc123')).toBe(4)
    expect(levelOf('qT7#vLx9!mZp2Rw8')).toBe(5)
  })
})

describe('hasAllCharacterTypes', () => {
  it('đủ chữ thường, chữ hoa, số và ký tự đặc biệt thì đạt', () => {
    expect(hasAllCharacterTypes('Mua-Ha-Noi-2026')).toBe(true)
    expect(hasAllCharacterTypes('Mưa-Hà-Nội-2026')).toBe(true)
  })

  it('thiếu một loại thì không đạt', () => {
    expect(hasAllCharacterTypes('mua-ha-noi-2026')).toBe(false)
    expect(hasAllCharacterTypes('MUA-HA-NOI-2026')).toBe(false)
    expect(hasAllCharacterTypes('Mua-Ha-Noi-nam')).toBe(false)
    expect(hasAllCharacterTypes('MuaHaNoi2026')).toBe(false)
    expect(hasAllCharacterTypes('')).toBe(false)
  })
})
