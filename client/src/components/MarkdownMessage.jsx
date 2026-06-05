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
      nodes.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="rounded bg-slate-700 px-1 py-0.5 text-sm text-blue-300">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[(.+?)\]\((.+?)\)/);
      if (linkMatch) {
        nodes.push(
          <a key={key++} href={linkMatch[2]} target="_blank" rel="noreferrer" className="text-blue-400 underline">
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
    <div className="space-y-2 text-sm leading-relaxed text-slate-200">
      {blocks.map((block, i) => {
        const lines = block.split('\n');

        if (lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((line, j) => (
                <li key={j}>{renderInline(line.trim().replace(/^[-*]\s/, ''))}</li>
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
