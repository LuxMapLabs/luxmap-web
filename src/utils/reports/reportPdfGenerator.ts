import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { SuperiorReportItem } from '../../types/reports/report'
import { workScheduleAPI } from '../../feature/work-schedule/workScheduleAPI'

/**
 * Xuất trực tiếp một thẻ DOM (biên bản A4) thành file PDF chất lượng cao,
 * giữ nguyên 100% font tiếng Việt, màu sắc, huy hiệu và ảnh hiện trường.
 */
export async function exportReportElementToPdf(
  element: HTMLElement,
  filename: string
): Promise<void> {
  // 1. Chụp element thành Canvas độ phân giải cao (scale 2 = Retina / ~300 DPI)
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 850,
  })

  const imgData = canvas.toDataURL('image/jpeg', 0.95)

  // 2. Kích thước A4 chuẩn trong mm: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = 210
  const pageHeight = 297
  const margin = 10
  const printWidth = pageWidth - margin * 2
  const printHeight = (canvas.height * printWidth) / canvas.width

  // Nếu nội dung vừa hoặc gần vừa 1 trang A4 (<= 280mm)
  if (printHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, 'JPEG', margin, margin, printWidth, printHeight)
  } else {
    // Phân trang tự động nếu biên bản dài (ví dụ kèm nhiều ảnh minh chứng)
    let heightLeft = printHeight
    let position = margin

    pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight)
    heightLeft -= pageHeight - margin * 2

    while (heightLeft > 0) {
      position = position - (pageHeight - margin * 2)
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', margin, position, printWidth, printHeight)
      heightLeft -= pageHeight - margin * 2
    }
  }

  // 3. Tải file về máy người dùng
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

/**
 * Xây dựng giao diện HTML văn bản A4 chuẩn thể thức hành chính cho một báo cáo
 */
function buildReportHtmlString(report: SuperiorReportItem): string {
  const beforePhoto = report.evidencePhotos?.find((p) => p.kind === 'before') || report.evidencePhotos?.[0]
  const afterPhoto = report.evidencePhotos?.find((p) => p.kind === 'after') || report.evidencePhotos?.[1]

  const hasPhotos = Boolean(beforePhoto || afterPhoto)

  return `
    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background: #ffffff; padding: 36px 44px; width: 780px; box-sizing: border-box; line-height: 1.5;">
      <!-- Header Quốc hiệu / Đơn vị quản lý -->
      <table style="width: 100%; border-collapse: collapse; padding-bottom: 16px; margin-bottom: 20px; border-bottom: 2px solid #0f172a;">
        <tr>
          <td style="vertical-align: top; width: 48%;">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">UBND HUYỆN NINH PHƯỚC</div>
            <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 3px;">PHÒNG KINH TẾ & HẠ TẦNG</div>
            <div style="font-size: 11px; font-family: monospace; color: #64748b; margin-top: 5px;">Số: ${report.workOrderId}/BB-NTCS-2026</div>
          </td>
          <td style="vertical-align: top; width: 52%; text-align: center;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b; margin-top: 3px;">Độc lập - Tự do - Hạnh phúc</div>
            <div style="width: 120px; height: 1.5px; background: #94a3b8; margin: 6px auto;"></div>
            <div style="font-size: 11px; color: #64748b; font-style: italic;">Ninh Phước, ngày ${report.verifiedDate}</div>
          </td>
        </tr>
      </table>

      <!-- Tiêu đề văn bản -->
      <div style="text-align: center; margin: 24px 0 20px 0;">
        <h1 style="font-size: 16px; font-weight: 900; text-transform: uppercase; color: #0f172a; margin: 0; letter-spacing: 0.5px;">BIÊN BẢN NGHIỆM THU KỸ THUẬT & BÀN GIAO</h1>
        <p style="font-size: 11px; color: #64748b; font-style: italic; margin-top: 5px;">V/v: Hoàn thành bảo trì, sửa chữa hệ thống chiếu sáng đường giao thông nông thôn</p>
      </div>

      <!-- I. THÔNG TIN LỆNH CÔNG TÁC -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 10px;">
          I. THÔNG TIN LỆNH CÔNG TÁC
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 11.5px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 140px;">Mã lệnh công tác:</td>
            <td style="padding: 4px 0; font-family: monospace; font-weight: 700; color: #1d4ed8; width: 220px;">${report.workOrderId}</td>
            <td style="padding: 4px 0; color: #64748b; width: 140px;">Giai đoạn tác nghiệp:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${report.taskKindName} (${report.taskKind})</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Tuyến đường xử lý:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${report.road}</td>
            <td style="padding: 4px 0; color: #64748b;">Địa bàn hành chính:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${report.communeName}, Huyện Ninh Phước</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Kỹ sư hiện trường:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${report.engineerName}</td>
            <td style="padding: 4px 0; color: #64748b;">Quản lý thẩm duyệt:</td>
            <td style="padding: 4px 0; font-weight: 700; color: #0f172a;">${report.managerName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b;">Thời điểm hoàn tất:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${report.completedDate}</td>
            <td style="padding: 4px 0; color: #64748b;">Thời điểm nghiệm thu:</td>
            <td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${report.verifiedDate}</td>
          </tr>
        </table>
      </div>

      <!-- II. HIỆN TRẠNG SỰ CỐ & KẾT QUẢ KHẮC PHỤC -->
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 10px;">
          II. HIỆN TRẠNG SỰ CỐ & KẾT QUẢ KHẮC PHỤC
        </div>
        <div style="font-size: 11.5px; line-height: 1.6; color: #334155;">
          <p style="margin: 0 0 6px 0;"><strong>1. Hiện trạng ban đầu:</strong> ${report.initialFaultDesc}</p>
          <p style="margin: 0 0 6px 0;"><strong>2. Kết quả khắc phục thực địa:</strong> ${report.solutionDesc}</p>
          ${report.reportNote ? `<p style="margin: 0; padding: 6px 10px; background: #f8fafc; border-left: 3px solid #94a3b8; font-style: italic; color: #475569;">Ghi chú từ kỹ sư: "${report.reportNote}"</p>` : ''}
        </div>
      </div>

      <!-- III. MINH CHỨNG HÌNH ẢNH HIỆN TRƯỜNG -->
      ${
        hasPhotos
          ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 10px;">
            III. MINH CHỨNG HÌNH ẢNH HIỆN TRƯỜNG
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              ${
                beforePhoto
                  ? `
                <td style="width: 50%; padding-right: 8px; vertical-align: top;">
                  <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc;">
                    <div style="background: #fff1f2; color: #be123c; font-size: 10px; font-weight: 700; padding: 5px 8px; border-bottom: 1px solid #ffe4e6;">
                      📸 TRƯỚC TÁC NGHIỆP (BEFORE)
                    </div>
                    <img src="${beforePhoto.url}" alt="Trước tác nghiệp" style="width: 100%; height: 160px; object-fit: cover; display: block;" crossorigin="anonymous" />
                    <div style="padding: 5px 8px; font-size: 10px; color: #64748b; background: #ffffff;">
                      ${beforePhoto.locationText || 'Hiện trường trước khi sửa'}
                    </div>
                  </div>
                </td>
              `
                  : ''
              }
              ${
                afterPhoto
                  ? `
                <td style="width: 50%; padding-left: 8px; vertical-align: top;">
                  <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc;">
                    <div style="background: #ecfdf5; color: #047857; font-size: 10px; font-weight: 700; padding: 5px 8px; border-bottom: 1px solid #d1fae5;">
                      ✨ SAU HOÀN TẤT (AFTER)
                    </div>
                    <img src="${afterPhoto.url}" alt="Sau tác nghiệp" style="width: 100%; height: 160px; object-fit: cover; display: block;" crossorigin="anonymous" />
                    <div style="padding: 5px 8px; font-size: 10px; color: #64748b; background: #ffffff;">
                      ${afterPhoto.locationText || 'Hiện trường sau nghiệm thu'}
                    </div>
                  </div>
                </td>
              `
                  : ''
              }
            </tr>
          </table>
        </div>
      `
          : ''
      }

      <!-- IV. Ý KIẾN THẨM DUYỆT CỦA CÁN BỘ QUẢN LÝ -->
      <div style="margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin-bottom: 10px;">
          IV. Ý KIẾN THẨM DUYỆT CỦA CÁN BỘ QUẢN LÝ
        </div>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 11.5px; color: #166534; line-height: 1.5;">
          <div style="font-weight: 800; margin-bottom: 4px;">✔ KẾT QUẢ ĐÁNH GIÁ: ĐẠT TIÊU CHUẨN NGHIỆM THU</div>
          <div style="font-style: italic;">"${report.reviewNote}"</div>
        </div>
      </div>

      <!-- V. CHỮ KÝ XÁC NHẬN -->
      <table style="width: 100%; border-collapse: collapse; margin-top: 24px; text-align: center;">
        <tr>
          <td style="width: 50%; vertical-align: top;">
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #0f172a;">ĐẠI DIỆN ĐƠN VỊ QUẢN LÝ</div>
            <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">(Ký, ghi rõ họ tên & thẩm duyệt)</div>
            <div style="margin: 16px auto; display: inline-block; border: 1px dashed #10b981; background: #f0fdf4; color: #047857; padding: 4px 10px; border-radius: 6px; font-size: 9.5px; font-weight: 700;">
              ✔ ĐÃ XÁC THỰC ĐIỆN TỬ
              <div style="font-size: 8.5px; font-weight: 400; color: #059669; margin-top: 1px;">Hệ thống LuxMap • ${report.verifiedDate}</div>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${report.managerName}</div>
          </td>
          <td style="width: 50%; vertical-align: top;">
            <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #0f172a;">ĐẠI DIỆN CƠ QUAN CẤP TRÊN (SUPERIOR)</div>
            <div style="font-size: 10px; color: #64748b; font-style: italic; margin-top: 2px;">(Phê chuẩn & Tiếp nhận hồ sơ)</div>
            <div style="margin: 16px auto; display: inline-block; border: 1px dashed #3b82f6; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; font-size: 9.5px; font-weight: 700;">
              ✔ ĐÃ TIẾP NHẬN HỒ SƠ
              <div style="font-size: 8.5px; font-weight: 400; color: #2563eb; margin-top: 1px;">Phòng Kinh tế & Hạ tầng</div>
            </div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">Đặng Văn Cường</div>
          </td>
        </tr>
      </table>
    </div>
  `
}

/**
 * Trình xuất PDF đồng bộ chất lượng cao (dùng cho cả Modal và Danh sách bảng)
 */
export async function exportReportToPdf(
  report: SuperiorReportItem,
  sourceElement?: HTMLElement | null
): Promise<void> {
  const filename = `Bien_Ban_Nghiem_Thu_${report.workOrderId}.pdf`

  // Trường hợp 1: Có sẵn element DOM từ Modal
  if (sourceElement) {
    await exportReportElementToPdf(sourceElement, filename)
    return
  }

  // Trường hợp 2: Bấm xuất nhanh từ danh sách ngoài bảng (chưa mở modal)
  const preparedReport = { ...report }
  if (preparedReport.evidencePhotos && preparedReport.evidencePhotos.length > 0) {
    const updatedPhotos = await Promise.all(
      preparedReport.evidencePhotos.map(async (p) => {
        if (p.id) {
          try {
            const b64 = await workScheduleAPI.fetchEvidenceBase64(p.id, false)
            return { ...p, url: b64 }
          } catch {
            return p
          }
        }
        return p
      })
    )
    preparedReport.evidencePhotos = updatedPhotos
  }

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '780px'
  container.style.background = '#ffffff'
  container.style.zIndex = '-9999'
  container.innerHTML = buildReportHtmlString(preparedReport)

  document.body.appendChild(container)

  try {
    // Chờ 250ms để DOM phân giải và render hình ảnh / font
    await new Promise((resolve) => setTimeout(resolve, 250))
    await exportReportElementToPdf(container, filename)
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}


/**
 * Mở hộp thoại in ấn chuẩn của trình duyệt (hỗ trợ in ra PDF sắc nét với font tiếng Việt đầy đủ)
 */
export function printReportWindow(): void {
  window.print()
}
