function App() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface font-sans p-6">
      <div className="rounded-2xl bg-white p-8 shadow-lg max-w-lg w-full text-center border border-gray-100">
        <h1 className="text-2xl font-bold text-primary mb-2">
          LuxMap Web GIS Platform
        </h1>
        <p className="text-sm text-text-sub mb-6">
          Hệ thống bản đồ số GIS quản lý tài sản và sự cố chiếu sáng đường giao thông nông thôn
        </p>
        <div className="flex justify-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Web SPA Active
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            React 18 + Vite
          </span>
        </div>
      </div>
    </div>
  )
}

export default App
