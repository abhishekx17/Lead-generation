import { Clock, TickCircle, CloseCircle, Refresh } from 'iconsax-reactjs';

const config = {
  pending: {
    icon: Clock,
    className: 'bg-surface-strong text-muted border-hairline',
  },
  running: {
    icon: Refresh,
    className: 'bg-brand-mint/30 text-brand-teal border-brand-mint/50 animate-pulse-ring',
    spin: true,
  },
  completed: {
    icon: TickCircle,
    className: 'bg-success/15 text-success border-success/25',
  },
  failed: {
    icon: CloseCircle,
    className: 'bg-error/10 text-error border-error/25',
  },
};

export default function StatusBadge({ status }) {
  const { icon: Icon, className, spin } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${className}`}
    >
      <Icon size={14} variant="Bold" className={spin ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}
