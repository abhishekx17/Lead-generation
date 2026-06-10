export default function PageHeader({ eyebrow, title, description, action }) {
  return (
    <div className="animate-fade-in-up flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="caption-uppercase mb-2 text-muted">{eyebrow}</p>
        )}
        <h1 className="display-sm">{title}</h1>
        <div className="gradient-accent-line mt-3" />
        {description && (
          <p className="mt-3 max-w-2xl text-base text-muted leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
