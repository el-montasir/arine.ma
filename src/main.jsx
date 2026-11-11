import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const googleFontsLink = document.getElementById('google-fonts-stylesheet')
if (googleFontsLink) {
  const enableGoogleFonts = () => {
    googleFontsLink.media = 'all'
  }

  if (googleFontsLink.sheet) {
    enableGoogleFonts()
  } else {
    googleFontsLink.addEventListener('load', enableGoogleFonts, { once: true })
  }
}

// After a deploy, a tab opened on the previous build still asks for the old
// hashed chunks (e.g. Shop-<hash>.js), which no longer exist, so the lazy route
// fails and renders a blank page. Reload once to pick up the new build; the
// timestamp guard stops a reload loop if the chunk is genuinely broken.
window.addEventListener('vite:preloadError', (event) => {
  const KEY = 'arine-chunk-reload-at'
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0
  } catch {}
  if (Date.now() - last < 10_000) return
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {}
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)