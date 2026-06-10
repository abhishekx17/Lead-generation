import {
  Clock01Icon,
  CheckmarkCircle01Icon,
  CancelCircleIcon,
  Refresh01Icon,
} from 'hugeicons-react';

const config = {
  // Default: renders on canvas/cream/dark surfaces
  default: {
    pending: {
      icon: Clock01Icon,
      className: 'bg-[#f0ede6] text-[#6a6a6a] border-[#e5e5e5] dark:bg-[#2a2a28] dark:text-[#8a8a88] dark:border-[#3a3a38]',
    },
    running: {
      icon: Refresh01Icon,
      className: 'bg-[#e6f7f3] text-[#0f6e56] border-[#a4d4c5] dark:bg-[#0f3028] dark:text-[#4ad4b0] dark:border-[#1a4a38]',
      spin: true,
    },
    completed: {
      icon: CheckmarkCircle01Icon,
      className: 'bg-[#dcfce7] text-[#15803d] border-[#86efac] dark:bg-[#052e16] dark:text-[#4ade80] dark:border-[#166534]',
    },
    failed: {
      icon: CancelCircleIcon,
      className: 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5] dark:bg-[#2d0a0a] dark:text-[#f87171] dark:border-[#7f1d1d]',
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
      className: 'bg-[#0a1a1a]/15 text-[#0a1a1a]/80 border-[#0a1a1a]/20',
    },
    running: {
      icon: Refresh01Icon,
      className: 'bg-[#0a1a1a]/15 text-[#0a1a1a] border-[#0a1a1a]/25',
      spin: true,
    },
    completed: {
      icon: CheckmarkCircle01Icon,
      className: 'bg-[#0a1a1a]/15 text-[#0a1a1a] border-[#0a1a1a]/25',
    },
    failed: {
      icon: CancelCircleIcon,
      className: 'bg-[#0a1a1a]/20 text-[#0a1a1a] border-[#0a1a1a]/30',
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
