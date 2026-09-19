import { useMemo } from 'react'

/**
 * Stylized book cover generated from book data — used until real cover
 * images are available. Palettes are derived deterministically from the
 * book id so each title feels unique while remaining on-brand.
 */
const PALETTES = [
  { bg: 'linear-gradient(160deg, #4C1D95 0%, #6D28D9 55%, #7C3AED 100%)', accent: '#EDE9FE', spine: '#3B0F7E' },
  { bg: 'linear-gradient(160deg, #1E1B4B 0%, #312E81 55%, #4338CA 100%)', accent: '#E0E7FF', spine: '#14123B' },
  { bg: 'linear-gradient(160deg, #701A2C 0%, #9F1239 55%, #BE123C 100%)', accent: '#FFE4E6', spine: '#58101F' },
  { bg: 'linear-gradient(160deg, #065F46 0%, #047857 55%, #059669 100%)', accent: '#D1FAE5', spine: '#064E3B' },
  { bg: 'linear-gradient(160deg, #1E3A8A 0%, #1D4ED8 55%, #2563EB 100%)', accent: '#DBEAFE', spine: '#172554' },
  { bg: 'linear-gradient(160deg, #78350F 0%, #92400E 55%, #B45309 100%)', accent: '#FEF3C7', spine: '#451A03' },
]

export default function BookCover({ book = {}, className = '', size = 'md' }) {
  const palette = useMemo(
    () => PALETTES[Math.abs(Number(book?.id) || 0) % PALETTES.length] || PALETTES[0],
    [book?.id]
  )

  const sizes = {
    sm: 'aspect-[2/3] text-[0.5rem] p-2',
    md: 'aspect-[2/3] text-[0.65rem] p-3',
    lg: 'aspect-[2/3] text-xs p-5',
  }

  const titleLine = size === 'lg' ? 'leading-[1.7]' : 'leading-[1.5]'
  const titleSize =
    size === 'lg'
      ? 'text-lg'
      : size === 'md'
        ? 'text-[0.72rem]'
        : 'text-[0.55rem]'

  const authorHide = size === 'sm'

  return (
    <div
      className={`relative overflow-hidden rounded-r-[3px] rounded-l-[1px] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] group-hover:shadow-[0_16px_32px_-10px_rgba(0,0,0,0.45)] transition-shadow duration-300 max-w-full ${sizes[size]} ${className}`}
      style={{ background: palette.bg }}
      role="img"
      aria-label={`غلاف كتاب ${book?.title || ''}`}
    >
      {/* Spine */}
      <div
        className="absolute inset-y-0 right-0 w-[6%] opacity-90"
        style={{ backgroundColor: palette.spine }}
      />
      <div className="absolute inset-y-0 right-[6%] w-px bg-white/25" />

      {/* Subtle ornamental frame */}
      <div
        className="absolute inset-[8%] rounded-[2px] border"
        style={{ borderColor: `${palette.accent}22` }}
      />

      {/* Category chip */}
      {book?.category && (
        <div className="absolute top-[10%] left-[8%] right-[14%] flex justify-center">
          <span
            className="px-1.5 py-0.5 rounded-full text-[0.5em] tracking-wide"
            style={{
              backgroundColor: `${palette.accent}1A`,
              color: palette.accent,
              border: `1px solid ${palette.accent}33`,
            }}
          >
            {book.category}
          </span>
        </div>
      )}

      {/* Title */}
      <div className="absolute inset-x-[10%] top-[30%] bottom-[22%] flex flex-col justify-center">
        <div
          className={`text-center font-semibold text-white drop-shadow-sm ${titleLine} ${titleSize}`}
        >
          {book?.title || ''}
        </div>
        <div className="mt-[6%] mx-auto h-px w-[38%]" style={{ backgroundColor: `${palette.accent}55` }} />
      </div>

      {/* Author */}
      {!authorHide && book?.author && (
        <div className="absolute inset-x-0 bottom-[9%] text-center">
          <span
            className="text-[0.55em]"
            style={{ color: `${palette.accent}CC` }}
          >
            {book.author}
          </span>
        </div>
      )}

      {/* Soft top sheen */}
      <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-white/20 to-transparent" />
    </div>
  )
}