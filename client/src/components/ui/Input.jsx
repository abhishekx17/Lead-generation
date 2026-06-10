export default function Input({ label, icon: Icon, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted uppercase">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
        )}
        <input
          className={`h-11 w-full rounded-xl border border-hairline bg-canvas px-4 ${
            Icon ? 'pl-10' : ''
          } text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-ink focus:outline-none disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>
    </div>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted uppercase">
          {label}
        </label>
      )}
      <select
        className={`h-11 rounded-xl border border-hairline bg-canvas px-4 pr-8 text-sm text-ink transition-all duration-200 focus:border-ink focus:outline-none disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted uppercase">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-ink focus:outline-none disabled:opacity-50 resize-none ${className}`}
        {...props}
      />
    </div>
  );
}
