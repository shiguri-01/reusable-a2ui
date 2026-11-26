import { lazy, Suspense } from "react";

interface MarkdownContentProps {
  content: string;
  isAnimating?: boolean;
}

const LazyStreamdown = import.meta.env.SSR
  ? null
  : lazy(async () => {
      const [{ Streamdown }, { cjk }] = await Promise.all([
        import("streamdown"),
        import("@streamdown/cjk"),
      ]);
      const plugins = { cjk };

      return {
        default: function StreamdownRenderer({
          content,
          isAnimating = false,
        }: MarkdownContentProps) {
          return (
            <Streamdown plugins={plugins} isAnimating={isAnimating}>
              {content}
            </Streamdown>
          );
        },
      };
    });

export function MarkdownContent({ content, isAnimating = false }: MarkdownContentProps) {
  const fallback = <span className="whitespace-pre-wrap">{content}</span>;

  if (!LazyStreamdown) {
    return fallback;
  }

  return (
    <Suspense fallback={fallback}>
      <LazyStreamdown content={content} isAnimating={isAnimating} />
    </Suspense>
  );
}
