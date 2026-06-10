import { CancelCircleIcon, InformationCircleIcon, CheckmarkCircle01Icon } from 'hugeicons-react';

const config = {
  error: {
    icon: CancelCircleIcon,
    wrap: 'border-[#fca5a5] bg-[#fff1f1] text-[#b91c1c] dark:border-[#7f1d1d] dark:bg-[#2d0a0a] dark:text-[#f87171]',
    iconClass: 'text-[#ef4444] dark:text-[#f87171]',
  },
  success: {
    icon: CheckmarkCircle01Icon,
    wrap: 'border-[#86efac] bg-[#f0fdf4] text-[#15803d] dark:border-[#166534] dark:bg-[#052e16] dark:text-[#4ade80]',
    iconClass: 'text-[#22c55e] dark:text-[#4ade80]',
  },
  info: {
    icon: InformationCircleIcon,
    wrap: 'border-[#a4d4c5] bg-[#f0faf7] text-[#0f6e56] dark:border-[#1a4a38] dark:bg-[#0a2820] dark:text-[#4ad4b0]',
    iconClass: 'text-[#1a3a3a] dark:text-[#4ad4b0]',
  },
  warning: {
    icon: InformationCircleIcon,
    wrap: 'border-[#fcd34d] bg-[#fffbeb] text-[#92400e] dark:border-[#78350f] dark:bg-[#1c1000] dark:text-[#fbbf24]',
    iconClass: 'text-[#f59e0b] dark:text-[#fbbf24]',
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
