import { CancelCircleIcon, InformationCircleIcon, CheckmarkCircle01Icon } from 'hugeicons-react';

const config = {
  error: {
    icon: CancelCircleIcon,
    wrap: 'bg-error/10 text-error border-error/25',
    iconClass: 'text-error',
  },
  success: {
    icon: CheckmarkCircle01Icon,
    wrap: 'bg-success/10 text-success border-success/25',
    iconClass: 'text-success',
  },
  info: {
    icon: InformationCircleIcon,
    wrap: 'bg-surface-soft text-body border-hairline',
    iconClass: 'text-body',
  },
  warning: {
    icon: InformationCircleIcon,
    wrap: 'bg-warning/10 text-warning border-warning/25',
    iconClass: 'text-warning',
  },
};

export default function Alert({ type = 'info', children, action, dismissible, onDismiss }) {
  const { icon: Icon, wrap, iconClass } = config[type];

  return (
    <div className={`animate-slide-down flex items-start gap-3 rounded-xl border px-4 py-3.5 text-sm ${wrap}`}>
      <Icon size={20} className={`mt-0.5 shrink-0 ${iconClass}`} />
      <div className="flex-1 leading-relaxed">{children}{action}</div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 opacity-60 transition-opacity hover:opacity-100 cursor-pointer"
        >
          <CancelCircleIcon size={18} />
        </button>
      )}
    </div>
  );
}
