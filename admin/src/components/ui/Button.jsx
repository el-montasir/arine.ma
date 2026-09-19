// Flat, consistent buttons. Minimalist SaaS style.
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
      'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-surface-700 disabled:text-text-subtle shadow-sm',
    secondary:
      'bg-surface-900 text-text-main hover:bg-surface-800 border border-line disabled:text-text-subtle disabled:hover:bg-surface-900',
    ghost: 'text-text-muted hover:bg-surface-800 hover:text-text-main',
    danger: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 dark:bg-danger-400/10 dark:text-danger-400 dark:border-danger-400/30',
    link: 'text-brand-600 hover:text-brand-700 dark:text-brand-400 disabled:text-text-subtle',
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
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}