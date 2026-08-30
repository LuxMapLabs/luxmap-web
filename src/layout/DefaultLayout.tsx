import React from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from '../components/Header'
import { Sidebar } from '../components/Sidebar'

export const DefaultLayout: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 font-sans antialiased text-slate-900">
      
      {/* 1. Full-width Top Header (Navbar) */}
      <Header />

      {/* 2. Main Workspace: Left Sidebar + Right Page Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Sidebar */}
        <Sidebar />

        {/* Right Page Outlet */}
        <main className="flex-1 overflow-hidden relative w-full h-full">
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default DefaultLayout
