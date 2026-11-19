import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'   // ← ADD

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>          {/* ← ADD */}
      <App />
    </ErrorBoundary>          {/* ← ADD */}
  </StrictMode>,
)