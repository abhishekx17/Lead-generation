export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-hairline pb-6">
      <div className="space-y-1">
        {eyebrow && (
          <p className="caption-uppercase text-xs font-semibold tracking-wider text-muted">
            {eyebrow}
          </p>
        )}
        <h1 className="text-3xl md:text-[36px] font-medium text-ink" style={{ letterSpacing: '-0.04em', lineHeight: 1.15 }}>
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm md:text-base text-muted leading-relaxed pt-1">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
