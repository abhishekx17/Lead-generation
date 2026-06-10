export default function Input({ label, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-body-strong">
          {label}
        </label>
      )}
      <input
        className={`h-11 w-full rounded-xl border border-hairline bg-canvas px-4 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-brand-lavender focus:ring-2 focus:ring-brand-lavender/20 focus:outline-none disabled:opacity-50 ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, className = '', children, ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-body-strong">
          {label}
        </label>
      )}
      <select
        className={`h-11 rounded-xl border border-hairline bg-canvas px-4 pr-8 text-sm text-ink transition-all duration-200 focus:border-brand-lavender focus:ring-2 focus:ring-brand-lavender/20 focus:outline-none disabled:opacity-50 cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-body-strong">
          {label}
        </label>
      )}
      <textarea
        className={`w-full rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm text-ink placeholder:text-muted-soft transition-all duration-200 focus:border-brand-lavender focus:ring-2 focus:ring-brand-lavender/20 focus:outline-none disabled:opacity-50 resize-none ${className}`}
        {...props}
      />
    </div>
  );
}
