import { lazy, Suspense } from "react";
import { InlineA2UISkeleton } from "./inline-a2ui-skeleton";
import type { MarkdownContentProps } from "./streamdown-renderer";

const LazyStreamdownRenderer = import.meta.env.SSR
  ? null
  : lazy(() => import("./streamdown-renderer"));

function splitFallbackAroundA2UIFences(content: string) {
  const lines = content.split(/(?<=\n)|(?<=\r)(?!\n)/);
  const parts: (string | null)[] = [];
  let visibleText = "";
  let activeFenceMarker: string | undefined;
  for (const line of lines) {
    if (activeFenceMarker) {
      const closingMarker = /^ {0,3}(`{3,}|~{3,})[\t ]*[\r\n]*$/.exec(line)?.[1];
      if (closingMarker?.startsWith(activeFenceMarker)) activeFenceMarker = undefined;
      continue;
    }

    const openingFence =
      /^((?:[\t >]|(?:[-+*]|\d{1,9}[.)])[\t ])*)(`{3,}|~{3,})[\t ]*a2ui-json(?=\s|$)/i.exec(line);
    if (!openingFence) {
      visibleText += line;
      continue;
    }

    if (visibleText) parts.push(visibleText);
    parts.push(null);
    visibleText = "";

    const [, openingLinePrefix, openingMarker] = openingFence;
    const canFindClosingFenceInFallback = /^ {0,3}$/.test(openingLinePrefix);
    if (!canFindClosingFenceInFallback) break;
    activeFenceMarker = openingMarker;
  }
  if (visibleText) parts.push(visibleText);
  return parts;
}

export function MarkdownContent(props: MarkdownContentProps) {
  const fallback = (
    <div className="whitespace-pre-wrap">
      {splitFallbackAroundA2UIFences(props.content).map((part, index) =>
        part === null ? <InlineA2UISkeleton key={index} /> : <span key={index}>{part}</span>,
      )}
    </div>
  );

  if (!LazyStreamdownRenderer) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <LazyStreamdownRenderer {...props} />
    </Suspense>
  );
}
