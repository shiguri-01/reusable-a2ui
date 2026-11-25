import type { ChatRequestOptions, ChatTransport, UIMessage, UIMessageChunk } from "ai";
import type { CodexAppServerClient } from "./client";

export interface CodexChatTransportOptions {
  client: CodexAppServerClient;
  getDeveloperInstructions: () => string;
  formatUserPrompt: (userText: string) => string;
  effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
}

function extractLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;
    const text = msg.parts
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return "";
}

/**
 * Bridges Vercel AI SDK's `useChat` hook to a local `codex app-server` WebSocket endpoint.
 * Maps Codex JSON-RPC notifications into AI SDK `UIMessageChunk` stream events.
 */
export class CodexChatTransport implements ChatTransport<UIMessage> {
  private readonly client: CodexAppServerClient;
  private readonly getDeveloperInstructions: () => string;
  private readonly formatUserPrompt: (userText: string) => string;
  private readonly effort: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";

  constructor(options: CodexChatTransportOptions) {
    this.client = options.client;
    this.getDeveloperInstructions = options.getDeveloperInstructions;
    this.formatUserPrompt = options.formatUserPrompt;
    this.effort = options.effort ?? "low";
  }

  async sendMessages(
    options: {
      trigger: "submit-message" | "regenerate-message";
      chatId: string;
      messageId: string | undefined;
      messages: UIMessage[];
      abortSignal: AbortSignal | undefined;
    } & ChatRequestOptions,
  ): Promise<ReadableStream<UIMessageChunk>> {
    const rawUserText = extractLastUserText(options.messages);
    if (!rawUserText) {
      throw new Error("メッセージが空です");
    }

    await this.client.connect();

    let threadId = this.client.getStatus().threadId;
    if (!threadId) {
      const started = await this.client.startThread({
        developerInstructions: this.getDeveloperInstructions(),
      });
      threadId = started.thread.id;
    }

    const promptText = this.formatUserPrompt(rawUserText);
    const { abortSignal } = options;

    return new ReadableStream<UIMessageChunk>({
      start: async (controller) => {
        let activeTurnId: string | null = null;
        let closed = false;
        const startedTextIds = new Set<string>();
        const startedReasoningIds = new Set<string>();

        const safeEnqueue = (chunk: UIMessageChunk) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            // stream already closed
          }
        };

        const closeAllParts = () => {
          for (const id of startedReasoningIds) {
            safeEnqueue({ type: "reasoning-end", id });
          }
          startedReasoningIds.clear();

          for (const id of startedTextIds) {
            safeEnqueue({ type: "text-end", id });
          }
          startedTextIds.clear();
        };

        const cleanup = () => {
          unsubscribe();
          abortSignal?.removeEventListener("abort", handleAbort);
        };

        const finish = (errorText?: string) => {
          if (closed) return;
          closeAllParts();
          if (errorText) {
            safeEnqueue({ type: "error", errorText });
          }
          closed = true;
          cleanup();
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        const handleAbort = () => {
          if (activeTurnId && threadId) {
            void this.client.interruptTurn(threadId, activeTurnId);
          }
          finish();
        };

        if (abortSignal) {
          if (abortSignal.aborted) {
            finish();
            return;
          }
          abortSignal.addEventListener("abort", handleAbort, { once: true });
        }

        const unsubscribe = this.client.subscribeNotifications((method, params) => {
          if (closed) return;

          const notifThreadId = typeof params.threadId === "string" ? params.threadId : undefined;
          if (notifThreadId && notifThreadId !== threadId) return;

          const notifTurnId = typeof params.turnId === "string" ? params.turnId : undefined;
          if (activeTurnId && notifTurnId && notifTurnId !== activeTurnId) return;

          if (method === "item/reasoning/summaryTextDelta") {
            const itemId = typeof params.itemId === "string" ? params.itemId : "reasoning-0";
            const delta = typeof params.delta === "string" ? params.delta : "";
            if (!delta) return;
            if (!startedReasoningIds.has(itemId)) {
              startedReasoningIds.add(itemId);
              safeEnqueue({ type: "reasoning-start", id: itemId });
            }
            safeEnqueue({ type: "reasoning-delta", id: itemId, delta });
            return;
          }

          if (method === "item/agentMessage/delta") {
            const itemId = typeof params.itemId === "string" ? params.itemId : "text-0";
            const delta = typeof params.delta === "string" ? params.delta : "";
            if (!delta) return;
            if (!startedTextIds.has(itemId)) {
              startedTextIds.add(itemId);
              safeEnqueue({ type: "text-start", id: itemId });
            }
            safeEnqueue({ type: "text-delta", id: itemId, delta });
            return;
          }

          if (method === "turn/completed") {
            const turn = params.turn as
              | {
                  id?: string;
                  status?: string;
                  error?: { message?: string } | null;
                  items?: Array<{ type?: string; id?: string; text?: string }>;
                }
              | undefined;

            if (activeTurnId && turn?.id && turn.id !== activeTurnId) return;

            // Fallback: if the server didn't stream deltas for agentMessage, emit final text
            if (startedTextIds.size === 0 && Array.isArray(turn?.items)) {
              for (const item of turn.items) {
                if (item.type === "agentMessage" && item.text) {
                  const id = item.id ?? "text-final";
                  startedTextIds.add(id);
                  safeEnqueue({ type: "text-start", id });
                  safeEnqueue({ type: "text-delta", id, delta: item.text });
                }
              }
            }

            if (turn?.status === "failed") {
              finish(turn.error?.message || "Codex のターン実行に失敗しました");
              return;
            }
            finish();
            return;
          }

          if (method === "error") {
            const message =
              typeof params.message === "string"
                ? params.message
                : "Codex App Server でエラーが発生しました";
            finish(message);
          }
        });

        try {
          const turnRes = await this.client.startTurn({
            threadId,
            text: promptText,
            effort: this.effort,
          });
          activeTurnId = turnRes.turn.id;
        } catch (err) {
          const message = err instanceof Error ? err.message : "ターンの開始に失敗しました";
          finish(message);
        }
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
