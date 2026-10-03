/**
 * Safely converts a color string (hex3, hex6, rgb, rgba) to rgba(r, g, b, alpha).
 * Falls back safely to `#8b2f9e` (Arine Purple) if the input is missing or malformed.
 *
 * @param {string} colorStr - Input color (e.g. '#1f9d84', '#fff', 'rgb(31, 157, 132)')
 * @param {number} alpha - Opacity value between 0 and 1
 * @param {string} fallback - Fallback hex color if colorStr is invalid
 * @returns {string} - CSS rgba(...) string
 */
export function hexToRgba(colorStr, alpha = 1, fallback = '#8b2f9e') {
  if (!colorStr || typeof colorStr !== 'string') {
    return colorStr === fallback ? `rgba(139, 47, 158, ${alpha})` : hexToRgba(fallback, alpha, '#8b2f9e')
  }

  const clean = colorStr.trim()

  // Hex format (#RGB or #RRGGBB)
  if (clean.startsWith('#')) {
    let hex = clean.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    if (hex.length === 6) {
      const num = parseInt(hex, 16)
      if (!Number.isNaN(num)) {
        const r = (num >> 16) & 255
        const g = (num >> 8) & 255
        const b = num & 255
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }
    }
  }

  // RGB or RGBA format
  const rgbMatch = clean.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)))
    const g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)))
    const b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  // If input is invalid, fallback
  if (fallback && clean !== fallback) {
    return hexToRgba(fallback, alpha, '#8b2f9e')
  }

  return `rgba(139, 47, 158, ${alpha})`
}

/**
 * Calculates whether text on top of a given background color should be dark or light.
 * Uses standard ITU-R BT.709 perceived luminance formula.
 *
 * @param {string} colorStr - Background color hex or rgb
 * @param {string} darkColor - Return value when background is light (default '#161616')
 * @param {string} lightColor - Return value when background is dark (default '#ffffff')
 * @returns {string} - Appropriate contrasting text color
 */
export function getContrastTextColor(colorStr, darkColor = '#161616', lightColor = '#ffffff') {
  if (!colorStr || typeof colorStr !== 'string') return lightColor

  const clean = colorStr.trim()
  let r = 139
  let g = 47
  let b = 158

  if (clean.startsWith('#')) {
    let hex = clean.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('')
    }
    if (hex.length === 6) {
      const num = parseInt(hex, 16)
      if (!Number.isNaN(num)) {
        r = (num >> 16) & 255
        g = (num >> 8) & 255
        b = num & 255
      }
    }
  } else {
    const rgbMatch = clean.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
    if (rgbMatch) {
      r = Math.min(255, Math.max(0, parseInt(rgbMatch[1], 10)))
      g = Math.min(255, Math.max(0, parseInt(rgbMatch[2], 10)))
      b = Math.min(255, Math.max(0, parseInt(rgbMatch[3], 10)))
    }
  }

  // Perceived brightness (0 = pitch black, 1 = pure white)
  const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return brightness > 0.65 ? darkColor : lightColor
}
