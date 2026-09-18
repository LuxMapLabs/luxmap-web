import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import App from './App.tsx'
import './index.css'

// Always enforce Dark Mode for Institutional Command Center / IOC SCADA aesthetic
document.documentElement.classList.add('dark')
localStorage.removeItem('luxmap-theme')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)

