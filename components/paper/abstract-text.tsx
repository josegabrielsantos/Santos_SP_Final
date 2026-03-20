'use client';

import { useState } from 'react';

export function AbstractText({ text, highlight }: { text: string; highlight?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  if (highlight && highlight.length > 0) {
    return (
      <div className="mt-4">
        <span className="text-[13px] font-medium text-muted-foreground/70">Abstract: </span>
        <span
          className="text-[14px] leading-relaxed text-muted-foreground search-highlight"
          dangerouslySetInnerHTML={{ __html: highlight.join(' … ') }}
        />
      </div>
    );
  }

  const displayed = isLong && !expanded ? text.slice(0, 200) + '…' : text;

  return (
    <div className="mt-4">
      <span className="text-[13px] font-medium text-muted-foreground/70">Abstract: </span>
      <span className="text-[14px] leading-relaxed text-muted-foreground">{displayed}</span>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-1.5 text-[15px] font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
