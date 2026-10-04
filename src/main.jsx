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

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)