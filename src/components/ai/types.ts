import type { UIMessage } from "ai";
import type { A2UIMessage } from "@/a2ui/types";

export interface AiPreviewDraft {
  messageId: string;
  name: string;
  description: string;
  messagesJson: string;
  messages: A2UIMessage[];
}

export type CompareMode = "preview" | "current" | "split";

export function createAiPreviewDraft(
  messageId: string,
  prompt: string,
  nextVersionNumber: number,
  definition: { rawJson: string; messages: A2UIMessage[] },
): AiPreviewDraft {
  return {
    messageId,
    name: summarizePromptForVersionName(prompt, nextVersionNumber),
    description: prompt.slice(0, 200),
    messagesJson: definition.rawJson,
    messages: definition.messages,
  };
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function getMessageReasoning(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<typeof p, { type: "reasoning" }> => p.type === "reasoning")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

export function getPrecedingUserText(messages: UIMessage[], assistantIndex: number): string {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;
    const text = getMessageText(msg).replace(/\s+/g, " ").trim();
    if (text) return text;
  }
  return "";
}

export function summarizePromptForVersionName(prompt: string, nextVersionNumber: number): string {
  const cleaned = prompt.replace(/\s+/g, " ").trim();
  const short = cleaned.length > 18 ? `${cleaned.slice(0, 18)}…` : cleaned;
  return `v${nextVersionNumber}：${short || "AI生成"}`;
}
