import { CloseCircle, InfoCircle, TickCircle } from 'iconsax-reactjs';

const config = {
  error: {
    icon: CloseCircle,
    wrap: 'border-error/25 bg-error/8 text-error',
    iconClass: 'text-error',
  },
  success: {
    icon: TickCircle,
    wrap: 'border-success/25 bg-success/8 text-body-strong',
    iconClass: 'text-success',
  },
  info: {
    icon: InfoCircle,
    wrap: 'border-brand-teal/20 bg-brand-teal/5 text-body-strong',
    iconClass: 'text-brand-teal',
  },
  warning: {
    icon: InfoCircle,
    wrap: 'border-warning/25 bg-warning/8 text-body-strong',
    iconClass: 'text-warning',
  },
};

export default function Alert({ type = 'info', children, action, dismissible, onDismiss }) {
  const { icon: Icon, wrap, iconClass } = config[type];

  return (
    <div className={`animate-slide-down flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${wrap}`}>
      <Icon size={20} variant="Bold" className={`mt-0.5 shrink-0 ${iconClass}`} />
      <div className="flex-1 leading-relaxed">
        {children}
        {action}
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100"
        >
          <CloseCircle size={18} />
        </button>
      )}
    </div>
  );
}
