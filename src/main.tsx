import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n' // initialize i18next before rendering
import './index.css'
import App from './App'
import { applyTheme, getInitialTheme } from './theme'

// Apply the saved/preferred theme before first paint to avoid a flash.
applyTheme(getInitialTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
