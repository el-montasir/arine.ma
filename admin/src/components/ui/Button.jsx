// Flat, consistent buttons. No 3D shadows — 2D SaaS style.
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  disabled,
  onClick,
  ...rest
}) {
  const variants = {
    primary:
      'bg-brand-600 text-white hover:bg-brand-500 active:bg-brand-700 disabled:bg-surface-700 disabled:text-[#6f6488]',
    secondary:
      'bg-surface-800 text-[#ece6f6] hover:bg-surface-700 border border-line disabled:text-[#6f6488] disabled:hover:bg-surface-800',
    ghost: 'text-[#c0b6d6] hover:bg-surface-800 hover:text-white',
    danger: 'bg-danger-400/10 text-danger-400 border border-danger-400/30 hover:bg-danger-400/20',
    link: 'text-brand-400 hover:text-brand-300 disabled:text-[#6f6488]',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}