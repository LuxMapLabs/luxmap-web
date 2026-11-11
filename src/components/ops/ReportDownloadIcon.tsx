import React from 'react'

interface ReportDownloadIconProps {
  className?: string
}

// Icon xuất báo cáo: tờ giấy có góc gấp đứng yên, mũi tên bên trong tách riêng để animate (xem .report-arrow trong index.css)
export const ReportDownloadIcon: React.FC<ReportDownloadIconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <path d="M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
    <path d="M14 2v6h6" />
    <g className="report-arrow">
      <line x1="12" x2="12" y1="11" y2="18" />
      <polyline points="9 15 12 18 15 15" />
    </g>
  </svg>
)
