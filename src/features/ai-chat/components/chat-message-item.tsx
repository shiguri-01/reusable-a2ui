import { useState } from "react";
import type { UIMessage } from "ai";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { cn } from "@/lib/utils";
import { getMessageReasoning, getMessageText, type AiPreviewDraft } from "../types";
import { MarkdownContent } from "./markdown-content";
import { ToolCallRow, type DynamicToolPart } from "./tool-call-row";

interface ChatMessageItemProps {
  message: UIMessage;
  dataModel: DataModel;
  pending: boolean;
  isStreamingThis: boolean;
  activePreviewDraftId: string | null;
  appliedDraftIds: Record<string, boolean>;
  editingDraftId: string | null;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onSendPrompt: (text: string) => void;
  onPreview: (draft: AiPreviewDraft) => void;
}

export function ChatMessageItem({
  message,
  dataModel,
  pending,
  isStreamingThis,
  activePreviewDraftId,
  appliedDraftIds,
  editingDraftId,
  onExpenseAction,
  onSendPrompt,
  onPreview,
}: ChatMessageItemProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const isUser = message.role === "user";
  const textContent = getMessageText(message);
  const reasoningContent = isUser ? "" : getMessageReasoning(message);
  const toolParts = isUser
    ? []
    : message.parts.filter((part): part is DynamicToolPart => part.type === "dynamic-tool");

  const hasText = textContent.trim().length > 0;
  const showWaiting = isStreamingThis && toolParts.length === 0;

  return (
    <div
      className={cn("shadcn-scrollbar flex flex-col gap-2", isUser ? "items-end" : "items-start")}
    >
      {!isUser && reasoningContent && (
        <Collapsible open={reasoningOpen} onOpenChange={setReasoningOpen} className="w-full">
          <CollapsibleTrigger className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex cursor-pointer items-center gap-1 rounded-sm text-xs outline-none focus-visible:ring-2">
            {reasoningOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
            思考プロセス
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-muted/40 text-muted-foreground mt-1.5 rounded-md border px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap">
            {reasoningContent}
          </CollapsibleContent>
        </Collapsible>
      )}

      {!isUser && toolParts.length > 0 && (
        <div className="w-full space-y-1.5">
          {toolParts.map((part) => (
            <ToolCallRow
              key={part.toolCallId}
              part={part}
              activePreviewDraftId={activePreviewDraftId}
              appliedDraftIds={appliedDraftIds}
              editingDraftId={editingDraftId}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}

      {(hasText || showWaiting) && (
        <div
          className={cn(
            "text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground max-w-[90%] rounded-lg px-3.5 py-2 whitespace-pre-wrap"
              : "text-foreground min-w-0 w-full py-0.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          )}
        >
          {isUser ? (
            textContent
          ) : !hasText ? (
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <Loader2 className="size-4 animate-spin" />
              応答中...
            </span>
          ) : (
            <MarkdownContent
              content={textContent}
              isAnimating={isStreamingThis}
              baseDataModel={dataModel}
              pending={pending}
              onExpenseAction={onExpenseAction}
              onSendPrompt={onSendPrompt}
            />
          )}
        </div>
      )}
    </div>
  );
}
