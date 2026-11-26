import type { UIMessage } from "ai";
import type { DashboardDraft } from "@/features/a2ui/draft";
import type { A2UIMessage } from "@/features/a2ui/types";

export type AiPreviewDraft = DashboardDraft;

export interface DashboardEditBase {
  versionId: number | undefined;
  messages: A2UIMessage[];
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .filter((t) => t.length > 0)
    .join("\n\n");
}

export function getMessageReasoning(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "reasoning" }> => p.type === "reasoning")
    .map((p) => p.text)
    .join("\n")
    .trim();
}
