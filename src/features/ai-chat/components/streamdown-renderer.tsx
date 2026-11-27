import { cjk } from "@streamdown/cjk";
import { createContext, isValidElement, useContext, useMemo, type ComponentProps } from "react";
import {
  Block,
  defaultComponents,
  Streamdown,
  useIsCodeFenceIncomplete,
  type BlockProps,
} from "streamdown";
import { parseInlineA2UIBlock } from "@/features/a2ui/response";
import { InlineA2UICard } from "./inline-a2ui-card";
import { InlineA2UISkeleton } from "./inline-a2ui-skeleton";

type InlineCardProps = Omit<ComponentProps<typeof InlineA2UICard>, "messages">;

export interface MarkdownContentProps extends InlineCardProps {
  content: string;
  isAnimating?: boolean;
}

const InlineCardContext = createContext<InlineCardProps | null>(null);
const BlockSourceContext = createContext("");
const DefaultPre = defaultComponents.pre;

function MarkdownBlock(props: BlockProps) {
  return (
    <BlockSourceContext.Provider value={props.content}>
      <Block {...props} />
    </BlockSourceContext.Provider>
  );
}

function getNodeLastLine(source: string, endOffset: number) {
  const lastLineBreak = Math.max(
    source.lastIndexOf("\n", endOffset - 1),
    source.lastIndexOf("\r", endOffset - 1),
  );
  return source.slice(lastLineBreak + 1, endOffset);
}

function hasClosingCodeFence(
  source: string,
  position: NonNullable<ComponentProps<typeof DefaultPre>["node"]>["position"],
  code: ComponentProps<"code">["children"],
) {
  const { start, end } = position ?? {};
  if (!start || !end || start.offset === undefined) return false;

  const openingMarker = /^(`{3,}|~{3,})/.exec(source.slice(start.offset))?.[0];
  const nodeLastLine = getNodeLastLine(source, end.offset ?? 0);
  const closingMarker = /^[\t >]*(`{3,}|~{3,})[\t ]*$/.exec(nodeLastLine)?.[1];
  if (!openingMarker || !closingMarker?.startsWith(openingMarker)) return false;

  const bodyLineCount =
    typeof code === "string" && code ? code.replace(/\n$/, "").split("\n").length : 0;
  const nodeLineCount = end.line - start.line + 1;
  const openingAndBodyLineCount = 1 + bodyLineCount;
  return nodeLineCount > openingAndBodyLineCount;
}

function MarkdownPre(props: ComponentProps<typeof DefaultPre>) {
  const cardProps = useContext(InlineCardContext);
  const source = useContext(BlockSourceContext);
  const isFenceIncompleteWhileAnimating = useIsCodeFenceIncomplete();
  const { children } = props;

  if (
    !cardProps ||
    !isValidElement<ComponentProps<"code">>(children) ||
    !children.props.className
      ?.split(/\s+/)
      .some((name) => name.toLowerCase() === "language-a2ui-json")
  ) {
    return <DefaultPre {...props} />;
  }

  if (isFenceIncompleteWhileAnimating) {
    return <InlineA2UISkeleton />;
  }

  const code = children.props.children;
  if (!hasClosingCodeFence(source, props.node?.position, code)) {
    return <div className="text-destructive text-xs">UI の表示に失敗しました</div>;
  }

  const block = parseInlineA2UIBlock(typeof code === "string" ? code : "");
  if (block.status === "invalid") {
    return <div className="text-destructive text-xs">{block.error}</div>;
  }

  return <InlineA2UICard {...cardProps} messages={block.messages} />;
}

const components = { pre: MarkdownPre };
const plugins = { cjk };

export default function StreamdownRenderer({
  content,
  isAnimating = false,
  baseDataModel,
  pending,
  onExpenseAction,
  onSendPrompt,
}: MarkdownContentProps) {
  const cardProps = useMemo(
    () => ({ baseDataModel, pending, onExpenseAction, onSendPrompt }),
    [baseDataModel, pending, onExpenseAction, onSendPrompt],
  );

  return (
    <InlineCardContext.Provider value={cardProps}>
      <Streamdown
        BlockComponent={MarkdownBlock}
        components={components}
        plugins={plugins}
        isAnimating={isAnimating}
      >
        {content}
      </Streamdown>
    </InlineCardContext.Provider>
  );
}
