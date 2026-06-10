const variants = {
  primary:
    'bg-primary text-on-primary border border-primary hover:shadow-[0_4px_16px_-2px_rgba(10,10,10,0.25)] active:scale-[0.97]',
  secondary:
    'bg-canvas text-ink border border-hairline hover:border-muted-soft hover:shadow-[0_2px_8px_-2px_rgba(10,10,10,0.08)] active:scale-[0.97]',
  onColor:
    'bg-on-primary text-ink border border-on-primary hover:shadow-[0_4px_12px_-2px_rgba(255,255,255,0.3)] active:scale-[0.97]',
  ghost:
    'bg-transparent text-muted border border-transparent hover:bg-surface-soft hover:text-ink active:scale-[0.97]',
  danger:
    'bg-error/10 text-error border border-error/20 hover:bg-error/15 active:scale-[0.97]',
};

const sizes = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-7 text-sm gap-2.5 rounded-xl',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  icon: Icon,
  iconPosition = 'left',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={18} variant="Bold" />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={18} variant="Bold" />}
    </button>
  );
}
