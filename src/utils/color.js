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
