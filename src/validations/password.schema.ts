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

/**
 * Schema người dùng đang đăng nhập tự đổi mật khẩu (POST /auth/password/change).
 * Dùng chung quy tắc độ dài 12-1024 ký tự với setPasswordSchema và yêu cầu mật khẩu mới khác mật khẩu cũ.
 */
export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
    newPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu mới')
      .min(PASSWORD_MIN_LENGTH, `Mật khẩu phải có ít nhất ${PASSWORD_MIN_LENGTH} ký tự`)
      .max(PASSWORD_MAX_LENGTH, `Mật khẩu không được vượt quá ${PASSWORD_MAX_LENGTH} ký tự`),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu mới'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Mật khẩu nhập lại không khớp',
    path: ['confirmPassword'],
  })
  .refine((data) => data.oldPassword.length === 0 || data.newPassword !== data.oldPassword, {
    message: 'Mật khẩu mới phải khác mật khẩu hiện tại',
    path: ['newPassword'],
  })

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

/**
 * Schema gửi yêu cầu đặt lại mật khẩu qua email (POST /auth/password/forgot).
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email')
    .max(256, 'Email không được vượt quá 256 ký tự')
    .email('Email không đúng định dạng'),
})

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>
