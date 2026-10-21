import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { store } from './redux/store'
import App from './App.tsx'
import './index.css'

// Configure MapLibre Web Worker bundle for production and development
setWorkerUrl(workerUrl)

// Default Light Mode
document.documentElement.classList.remove('dark')
localStorage.setItem('luxmap-theme', 'light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
