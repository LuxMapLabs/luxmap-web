import React from 'react'

interface DownloadIconProps {
  className?: string
}

// Icon tải xuống gồm khay đứng yên và mũi tên tách riêng để animate (xem .download-arrow trong index.css)
export const DownloadIcon: React.FC<DownloadIconProps> = ({ className }) => (
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
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <g className="download-arrow">
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </g>
  </svg>
)
