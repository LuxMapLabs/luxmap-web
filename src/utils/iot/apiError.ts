/** Lấy `error.message` từ body lỗi chuẩn của backend (`{ error: { code, message } }`), không có thì dùng câu mặc định. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: { message?: string } } } }
  return err?.response?.data?.error?.message || fallback
}
