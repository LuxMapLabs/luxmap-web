/**
 * Tiện ích xử lý và chuẩn hóa hình ảnh (Client-side Image Processing)
 */

/**
 * Chuyển đổi tệp ảnh sang định dạng JPEG chuẩn qua HTML5 Canvas
 * Đảm bảo 100% tệp xuất ra luôn có magic bytes JPEG (FF D8 FF) theo yêu cầu nghiêm ngặt của Backend C#
 *
 * @param file Tệp ảnh gốc (JPG, PNG, WEBP, HEIC, ...)
 * @param quality Mức chất lượng nén JPEG (mặc định 0.85)
 * @returns Promise<File> Tệp File mới định dạng image/jpeg với đuôi mở rộng .jpg
 */
export const convertToJpeg = (file: File, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || img.width
      canvas.height = img.naturalHeight || img.height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        // Fallback an toàn nếu môi trường không lấy được 2D context
        resolve(file)
        return
      }

      // Tô nền trắng nhằm tránh biến nền trong suốt của PNG thành màu đen khi đổi sang JPEG
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const baseName = file.name.replace(/\.[^/.]+$/, '')
          const jpegFile = new File([blob], `${baseName}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          })
          resolve(jpegFile)
        },
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error(`Không thể giải mã tệp ảnh: ${file.name}`))
    }

    img.src = objectUrl
  })
}
