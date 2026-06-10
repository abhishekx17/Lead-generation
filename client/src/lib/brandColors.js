/**
 * Professional card variants — clean white/cream cards with subtle accent colors.
 * Uses clean semantic theme classes (bg-canvas, border-hairline) instead of hardcoded white backgrounds
 * to correctly support dark theme with a gray/black combination.
 */
export const BRAND_CARD_VARIANTS = Array(6).fill(null).map(() => ({
  bg: 'bg-canvas',
  border: 'border border-hairline',
  text: 'text-ink',
  muted: 'text-muted',
  badge: 'bg-surface-soft text-ink hover:bg-surface-strong',
  accentBorder: '',
  iconBg: 'bg-surface-soft text-ink/80',
  progressBg: 'bg-surface-soft',
  progressFill: 'bg-ink',
}));

export function getBrandVariant(index) {
  return BRAND_CARD_VARIANTS[index % BRAND_CARD_VARIANTS.length];
}
