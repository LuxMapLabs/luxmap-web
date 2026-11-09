import { z } from 'zod'

/** Backend (NIST SP 800-63B): tối thiểu 12 ký tự, tối đa 1024, không có quy tắc thành phần */
export const PASSWORD_MIN_LENGTH = 12
export const PASSWORD_MAX_LENGTH = 1024

/**
 * Schema đặt mật khẩu mới từ link mời / đặt lại.
 * Khớp quy tắc của POST /auth/password/set, kèm ô nhập lại mật khẩu.
 */
export const setPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)
      .max(PASSWORD_MAX_LENGTH, `Mật khẩu không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự`),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })

export type SetPasswordFormData = z.infer<typeof setPasswordSchema>
