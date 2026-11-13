import { useEffect } from 'react'

const AMIRI_HREF = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap'

// Amiri (classic Naskh) for the section headers; loaded only on pages that use it.
export const AMIRI = { fontFamily: "'Amiri', serif" }

export default function useAmiriFont() {
  useEffect(() => {
    if (document.getElementById('font-amiri')) return
    const link = document.createElement('link')
    link.id = 'font-amiri'
    link.rel = 'stylesheet'
    link.href = AMIRI_HREF
    document.head.appendChild(link)
  }, [])
}
