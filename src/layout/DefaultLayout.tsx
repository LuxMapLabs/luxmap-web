import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '../components/Header'

export const DefaultLayout: React.FC = () => {
  const location = useLocation()

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100">
      
      {/* 1. Full-width Institutional Top Navbar */}
      <Header />

      {/* 2. Full-width Main Workspace with Smooth Route Transitions */}
      <main className="flex-1 overflow-hidden relative w-full h-full">
        <div key={location.pathname} className="w-full h-full animate-tab-view">
          <Outlet />
        </div>
      </main>

    </div>
  )
}

export default DefaultLayout

