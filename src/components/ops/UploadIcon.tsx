import React from 'react'

interface UploadIconProps {
  className?: string
}

// Icon tải lên gồm khay đứng yên và mũi tên tách riêng để animate (xem .upload-arrow trong index.css)
export const UploadIcon: React.FC<UploadIconProps> = ({ className }) => (
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
    <g className="upload-arrow">
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </g>
  </svg>
)
