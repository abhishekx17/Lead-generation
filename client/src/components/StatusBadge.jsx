import {
  Clock01Icon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Refresh01Icon,
} from 'hugeicons-react';

const config = {
  // Default: renders on canvas/cream/dark surfaces — tokens adapt in .dark automatically
  default: {
    pending: {
      icon: Clock01Icon,
      className: 'bg-surface-strong text-muted border-hairline',
    },
    running: {
      icon: Refresh01Icon,
      className: 'bg-success/10 text-success border-success/30',
      spin: true,
    },
    completed: {
      icon: CheckmarkCircle01Icon,
      className: 'bg-success/15 text-success border-success/30',
    },
    failed: {
      icon: CancelCircleIcon,
      className: 'bg-error/10 text-error border-error/30',
    },
  },
  // onColor: renders on saturated brand card backgrounds (pink, teal, lavender, peach, ochre)
  onColor: {
    pending: {
      icon: Clock01Icon,
      className: 'bg-white/20 text-white border-white/25',
    },
    running: {
      icon: Refresh01Icon,
      className: 'bg-white/20 text-white border-white/30',
      spin: true,
    },
    completed: {
      icon: CheckmarkCircle01Icon,
      className: 'bg-white/20 text-white border-white/30',
    },
    failed: {
      icon: CancelCircleIcon,
      className: 'bg-black/15 text-white border-black/10',
    },
  },
  // onDark: renders on dark teal card in dark mode (text needs to flip)
  onDark: {
    pending: {
      icon: Clock01Icon,
      className: 'bg-white/10 text-on-dark border-white/15',
    },
    running: {
      icon: Refresh01Icon,
      className: 'bg-success/15 text-success border-success/25',
      spin: true,
    },
    completed: {
      icon: CheckmarkCircle01Icon,
      className: 'bg-success/15 text-success border-success/25',
    },
    failed: {
      icon: CancelCircleIcon,
      className: 'bg-error/15 text-error border-error/25',
    },
  },
};

export default function StatusBadge({ status, surface = 'default' }) {
  const surfaceConfig = config[surface] || config.default;
  const { icon: Icon, className, spin } = surfaceConfig[status] || surfaceConfig.pending;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}
    >
      <Icon size={12} className={spin ? 'animate-spin' : ''} />
      {status}
    </span>
  );
}
