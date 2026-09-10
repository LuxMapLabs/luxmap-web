import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

export const DefaultLayout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      
      {/* 1. Full-width Top Header (Navbar) with Sidebar Toggle */}
      <Header
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* 2. Main Workspace: Left Sidebar + Right Page Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        
        {/* Left Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        {/* Right Page Outlet */}
        <main className="flex-1 overflow-hidden relative w-full h-full">
          <Outlet />
        </main>

      </div>

    </div>
  )
}


export default DefaultLayout
