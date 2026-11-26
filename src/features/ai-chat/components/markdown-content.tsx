import { cjk } from "@streamdown/cjk";
import { Streamdown } from "streamdown";

const STREAMDOWN_PLUGINS = { cjk };

interface MarkdownContentProps {
  content: string;
  isAnimating?: boolean;
}

export function MarkdownContent({ content, isAnimating = false }: MarkdownContentProps) {
  return (
    <Streamdown plugins={STREAMDOWN_PLUGINS} isAnimating={isAnimating}>
      {content}
    </Streamdown>
  );
}
