/**
 * Common Validation Rules & Regex Patterns
 * Dùng chung toàn hệ thống cho các trường dữ liệu tiêu chuẩn (Số điện thoại, Email, v.v.)
 * Tránh phụ thuộc chéo (cross-domain coupling) giữa các phân hệ nghiệp vụ.
 */

/**
 * Regex kiểm tra số điện thoại di động Việt Nam tiêu chuẩn (10 chữ số)
 * Các đầu số hợp lệ của các nhà mạng Viettel, Vinaphone, Mobifone, Vietnamobile, Gmobile: 03, 05, 07, 08, 09
 */
export const VIETNAM_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/
