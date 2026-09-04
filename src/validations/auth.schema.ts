import { z } from 'zod'
import type { LoginRequest } from '../types/auth'

/**
 * Regex kiểm tra số điện thoại Việt Nam (10 số)
 */
export const PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/

/**
 * Schema xác thực Đăng nhập
 * Khớp 100% với LoginRequest từ src/types/auth.ts
 */
export const loginSchema = z.object({
  emailOrPhone: z
    .string()
    .min(1, 'Vui lòng nhập Email hoặc Số điện thoại')
    .trim()
    .refine(
      (val) => z.string().email().safeParse(val).success || PHONE_REGEX.test(val),
      {
        message: 'Định dạng Email hoặc Số điện thoại (10 số) không hợp lệ',
      }
    ),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  rememberMe: z.boolean().optional(),
}) satisfies z.ZodType<LoginRequest>

export type LoginFormData = z.infer<typeof loginSchema>

/**
 * Schema xác thực Đăng ký
 * Khớp với RegisterRequest từ src/types/auth.ts kèm confirmPassword
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
      .max(100, 'Họ và tên không được vượt quá 100 ký tự')
      .trim(),
    email: z
      .string()
      .email('Email không đúng định dạng')
      .nullish(),
    phoneNumber: z
      .string()
      .regex(PHONE_REGEX, 'Số điện thoại phải gồm 10 số (VD: 0901234567)')
      .nullish(),
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số')
      .regex(/[^A-Za-z0-9]/, 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt (@, #, $, ...)'),
    confirmPassword: z
      .string()
      .min(1, 'Vui lòng nhập lại mật khẩu'),
    administrativeUnitId: z
      .string()
      .min(1, 'Vui lòng chọn đơn vị hành chính'),
    role: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)], {
      message: 'Vui lòng chọn vai trò người dùng',
    }),
  })
  .refine((data) => data.email || data.phoneNumber, {
    message: 'Phải cung cấp ít nhất Email hoặc Số điện thoại để liên hệ',
    path: ['email'],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

export type RegisterFormData = z.infer<typeof registerSchema>
