import React from 'react'
import { CommunesTab } from './components/CommunesTab'

export const CommunesManagementPage: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 sm:p-6 md:p-8 font-sans text-slate-800 dark:text-slate-200 select-none">
      <div className="w-full max-w-[1600px] mx-auto space-y-4">
        {/* Nội dung danh sách và bản đồ vẽ BBox */}
        <CommunesTab />
      </div>
    </div>
  )
}

export default CommunesManagementPage
