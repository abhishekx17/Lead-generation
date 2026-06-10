const variants = {
  primary:
    'bg-primary text-on-primary border border-primary active:scale-[0.97]',
  secondary:
    'bg-transparent text-ink border border-hairline active:scale-[0.97] hover:bg-surface-soft',
  onColor:
    'bg-white text-[#0a0a0a] border border-transparent active:scale-[0.97] hover:bg-white/90',
  ghost:
    'bg-transparent text-muted border border-transparent hover:bg-surface-soft hover:text-ink active:scale-[0.97]',
  danger:
    'bg-error/10 text-error border border-error/20 hover:bg-error/15 active:scale-[0.97]',
};

const sizes = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl', // 12px radius = rounded-xl (Vite-Tailwind default)
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
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && <Icon size={18} />}
      {children}
      {Icon && iconPosition === 'right' && <Icon size={18} />}
    </button>
  );
}
