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
      'bg-[var(--purple)] text-white hover:bg-[var(--purple-dark)] disabled:opacity-50 shadow-sm',
    secondary:
      'bg-[var(--card)] text-[var(--ink)] hover:bg-[var(--bg)] border border-[var(--line)] disabled:opacity-50',
    light:
      'bg-white/15 text-white hover:bg-white/25 disabled:opacity-50',
    white:
      'bg-white text-[var(--purple-dark)] hover:bg-slate-50 disabled:opacity-50 shadow-sm',
    ghost:
      'text-[var(--ink-soft)] hover:bg-[var(--bg)] hover:text-[var(--ink)] disabled:opacity-50',
    danger:
      'bg-[var(--red-bg)] text-[var(--red)] border border-[var(--red)]/20 hover:bg-[var(--red)]/15 disabled:opacity-50',
    link:
      'text-[var(--purple)] hover:underline disabled:opacity-50 p-0',
  }
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs rounded-[8px]',
    md: 'px-3.5 py-2 text-[12.5px] rounded-[9px]',
    lg: 'px-4.5 py-2.5 text-sm rounded-[10px]',
  }
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 font-semibold transition-all duration-150 cursor-pointer disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
