import React from 'react'
import { CommunesTab } from './components/CommunesTab'

export const CommunesManagementPage: React.FC = () => {
  return (
    <div className="admin-glass-root h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-6 md:p-8 text-slate-800 dark:text-slate-200 select-none">
      <div className="glass-slab w-full max-w-[1600px] mx-auto p-5 md:p-6 space-y-4">
        {/* Nội dung danh sách và bản đồ vẽ BBox */}
        <CommunesTab />
      </div>
    </div>
  )
}

export default CommunesManagementPage
