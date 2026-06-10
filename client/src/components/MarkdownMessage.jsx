function renderInline(text) {
  const nodes = [];
  const regex = /(\*\*.+?\*\*|\*.+?\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('**')) {
      nodes.push(<strong key={key++} className="font-semibold text-ink">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key++} className="text-body-strong">{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded-lg bg-surface-card px-1.5 py-0.5 text-[13px] font-medium text-brand-coral">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        nodes.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-ink underline decoration-brand-lavender/40 underline-offset-2 transition-colors hover:decoration-brand-lavender"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export default function MarkdownMessage({ content }) {
  if (!content) return null;

  const blocks = content.split('\n\n');

  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-body">
      {blocks.map((block, i) => {
        const lines = block.split('\n');

        if (lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))) {
          return (
            <ul key={i} className="list-none space-y-1.5 pl-0">
              {lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-lavender" />
                  <span>{renderInline(line.trim().replace(/^[-*]\s/, ''))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={i}>
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
