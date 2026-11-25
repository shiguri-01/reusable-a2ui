import { useState } from "react";
import type { UIMessage } from "ai";
import { Check, ChevronDown, ChevronRight, Eye, Loader2 } from "lucide-react";
import { extractA2UIFromText, stripA2UIJsonBlocks } from "@/a2ui/prompt";
import { cn } from "@/lib/utils";
import {
  getMessageReasoning,
  getMessageText,
  summarizePromptForVersionName,
  type AiPreviewDraft,
} from "./types";

interface ChatMessageItemProps {
  message: UIMessage;
  precedingUserText: string;
  nextVersionNumber: number;
  isStreamingThis: boolean;
  isActivePreview: boolean;
  isApplied: boolean;
  onPreview: (draft: AiPreviewDraft) => void;
  onOpenInEditor: (messagesJson: string, suggestedName?: string) => void;
}

export function ChatMessageItem({
  message,
  precedingUserText,
  nextVersionNumber,
  isStreamingThis,
  isActivePreview,
  isApplied,
  onPreview,
  onOpenInEditor,
}: ChatMessageItemProps) {
  const [reasoningOpen, setReasoningOpen] = useState(false);

  const isUser = message.role === "user";
  const textContent = getMessageText(message);
  const reasoningContent = isUser ? "" : getMessageReasoning(message);

  const extracted = !isUser && !isStreamingThis ? extractA2UIFromText(textContent) : null;
  const displayText = extracted ? stripA2UIJsonBlocks(textContent) : textContent;

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      {!isUser && reasoningContent && (
        <div className="w-full">
          <button
            type="button"
            onClick={() => setReasoningOpen((prev) => !prev)}
            className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 text-[11px]"
          >
            {reasoningOpen ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            思考プロセス
          </button>
          {reasoningOpen && (
            <div className="bg-muted/40 text-muted-foreground mt-1 rounded-md border px-2.5 py-2 text-[11px] leading-relaxed whitespace-pre-wrap">
              {reasoningContent}
            </div>
          )}
        </div>
      )}

      <div
        className={cn(
          "text-xs leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground max-w-[90%] rounded-lg px-3 py-2"
            : "text-foreground w-full py-0.5",
        )}
      >
        {!isUser && !displayText && isStreamingThis ? (
          <span className="text-muted-foreground inline-flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" />
            生成中...
          </span>
        ) : (
          displayText || (extracted ? "新しい UI を生成しました。" : "")
        )}
      </div>

      {extracted && (
        <>
          {extracted.messages ? (
            isApplied ? (
              <span className="text-muted-foreground inline-flex items-center gap-1 pt-0.5 text-[11px]">
                <Check className="size-3" />
                適用済み
              </span>
            ) : !isActivePreview ? (
              <button
                type="button"
                onClick={() =>
                  onPreview({
                    messageId: message.id,
                    name: summarizePromptForVersionName(precedingUserText, nextVersionNumber),
                    description: precedingUserText.slice(0, 200),
                    messagesJson: extracted.rawJson,
                    messages: extracted.messages!,
                  })
                }
                className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 pt-0.5 text-[11px] underline underline-offset-2"
              >
                <Eye className="size-3" />
                プレビュー
              </button>
            ) : null
          ) : (
            <div className="text-destructive flex items-center gap-2 pt-0.5 text-[11px]">
              <span>{extracted.error}</span>
              <button
                type="button"
                onClick={() =>
                  onOpenInEditor(
                    extracted.rawJson,
                    summarizePromptForVersionName(precedingUserText, nextVersionNumber),
                  )
                }
                className="cursor-pointer underline underline-offset-2"
              >
                JSON編集
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
