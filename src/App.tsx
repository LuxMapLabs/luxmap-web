import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { DefaultLayout } from './layout/DefaultLayout'
import { GisMapPage } from './pages/gis-map/GisMapPage'
import { NotFoundPage } from './pages/not-found/NotFoundPage'

function App() {
  return (
    <BrowserRouter>
      {/* Global Toast Notifications (Sonner) */}
      <Toaster richColors position="top-right" />

      <Routes>
        {/* Main Application Routes inside DefaultLayout */}
        <Route element={<DefaultLayout />}>
          <Route path="/" element={<Navigate to="/gis-map" replace />} />
          <Route path="/gis-map" element={<GisMapPage />} />
        </Route>

        {/* 404 Not Found Page for all invalid / undefined URLs */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

