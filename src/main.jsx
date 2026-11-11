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

// iOS Safari zooms into a form field when its text is under 16px and stays
// zoomed. index.css keeps fields at 16px; maximum-scale=1 is the belt-and-braces
// fix (iOS still allows pinch-zoom with it, so it is applied on iOS only).
const isIOS =
  /iP(hone|od|ad)/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
if (isIOS) {
  document
    .querySelector('meta[name="viewport"]')
    ?.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)