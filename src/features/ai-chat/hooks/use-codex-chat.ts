import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { buildA2UIDeveloperInstructions, buildUserTurnPrompt } from "@/features/a2ui/prompt";
import {
  CodexAppServerClient,
  DEFAULT_CODEX_WS_URL,
  type CodexClientStatus,
  type McpElicitationRequest,
} from "../codex/client";
import { CodexChatTransport } from "../codex/transport";
import type { AiPreviewDraft } from "../types";

const STORAGE_KEY_WS_URL = "reusable-a2ui:codex-ws-url:v3";

function getInitialWsUrl(): string {
  if (typeof window === "undefined") return DEFAULT_CODEX_WS_URL;
  return window.localStorage.getItem(STORAGE_KEY_WS_URL) || DEFAULT_CODEX_WS_URL;
}

interface UseCodexChatOptions {
  activeVersionName: string;
  currentMessagesJson: string;
  onDataMutated: (toolName: string) => void;
  onPreviewA2UI: (draft: AiPreviewDraft) => void;
}

export function useCodexChat({
  activeVersionName,
  currentMessagesJson,
  onDataMutated,
  onPreviewA2UI,
}: UseCodexChatOptions) {
  const [wsUrlInput, setWsUrlInput] = useState(getInitialWsUrl);
  const [pendingElicitations, setPendingElicitations] = useState<McpElicitationRequest[]>([]);
  const [autoApproveSession, setAutoApproveSession] = useState(false);

  const autoApproveSessionRef = useRef(autoApproveSession);
  autoApproveSessionRef.current = autoApproveSession;

  const latestContextRef = useRef({ activeVersionName, currentMessagesJson });
  latestContextRef.current = { activeVersionName, currentMessagesJson };

  const onDataMutatedRef = useRef(onDataMutated);
  onDataMutatedRef.current = onDataMutated;

  const onPreviewRef = useRef(onPreviewA2UI);
  onPreviewRef.current = onPreviewA2UI;

  const client = useMemo(() => new CodexAppServerClient(getInitialWsUrl()), []);
  const [codexStatus, setCodexStatus] = useState<CodexClientStatus>(() => client.getStatus());

  useEffect(() => {
    const unsubscribeStatus = client.subscribeStatus((nextStatus) => {
      setCodexStatus(nextStatus);
      if (nextStatus.state === "disconnected" || nextStatus.state === "error") {
        setPendingElicitations([]);
      }
    });
    const unsubscribeElicitations = client.subscribeMcpElicitations((request) => {
      if (
        autoApproveSessionRef.current &&
        (request.approvalKind === "mcp_tool_call" || request.serverName === "kakeibo")
      ) {
        client.respondToMcpElicitation(request.requestId, {
          action: "accept",
          persist: request.persistOptions.includes("session") ? "session" : undefined,
        });
        return;
      }
      setPendingElicitations((prev) => {
        if (prev.some((item) => item.requestId === request.requestId)) return prev;
        return [...prev, request];
      });
    });
    const unsubscribeNotifications = client.subscribeNotifications((method, params) => {
      if (method === "serverRequest/resolved") {
        const resolvedId = params.requestId;
        if (typeof resolvedId === "string" || typeof resolvedId === "number") {
          setPendingElicitations((prev) => prev.filter((item) => item.requestId !== resolvedId));
        }
      }
    });
    void client.connect().catch(() => {
      // Connection bar guides the user to start the local server
    });
    return () => {
      unsubscribeStatus();
      unsubscribeElicitations();
      unsubscribeNotifications();
      client.disconnect();
    };
  }, [client]);

  const transport = useMemo(
    () =>
      new CodexChatTransport({
        client,
        getDeveloperInstructions: buildA2UIDeveloperInstructions,
        formatUserPrompt: (userText) =>
          buildUserTurnPrompt({
            userText,
            activeVersionName: latestContextRef.current.activeVersionName,
            currentMessagesJson: latestContextRef.current.currentMessagesJson,
          }),
        onDataMutated: (toolName) => onDataMutatedRef.current(toolName),
        onDashboardProposed: (proposal) => onPreviewRef.current(proposal),
        effort: "low",
      }),
    [client],
  );

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";

  const activeRunningTool = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg?.role !== "assistant") continue;
      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j];
        if (
          part.type === "dynamic-tool" &&
          (part.state === "input-available" || part.state === "input-streaming")
        ) {
          const params =
            part.input && typeof part.input === "object" && !Array.isArray(part.input)
              ? (part.input as Record<string, unknown>)
              : undefined;
          return { toolName: part.toolName, toolParams: params };
        }
      }
    }
    return null;
  }, [messages]);

  const cancelAllPendingElicitations = () => {
    setPendingElicitations((prev) => {
      for (const req of prev) {
        client.respondToMcpElicitation(req.requestId, { action: "cancel" });
      }
      return [];
    });
  };

  const approveElicitation = (request: McpElicitationRequest, forSession: boolean) => {
    if (forSession) {
      setAutoApproveSession(true);
    }
    client.respondToMcpElicitation(request.requestId, {
      action: "accept",
      persist: forSession && request.persistOptions.includes("session") ? "session" : undefined,
    });
    setPendingElicitations((prev) => prev.filter((item) => item.requestId !== request.requestId));
  };

  const declineElicitation = (request: McpElicitationRequest) => {
    client.respondToMcpElicitation(request.requestId, { action: "decline" });
    setPendingElicitations((prev) => prev.filter((item) => item.requestId !== request.requestId));
  };

  const connect = async (): Promise<boolean> => {
    const nextUrl = wsUrlInput.trim() || DEFAULT_CODEX_WS_URL;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY_WS_URL, nextUrl);
    }
    client.setUrl(nextUrl);
    clearError();
    try {
      await client.connect();
      return true;
    } catch {
      return false;
    }
  };

  const resetChat = () => {
    cancelAllPendingElicitations();
    setAutoApproveSession(false);
    if (isStreaming) {
      void stop();
    }
    client.resetThread();
    setMessages([]);
    clearError();
  };

  const stopStreaming = () => {
    cancelAllPendingElicitations();
    void stop();
  };

  const sendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    clearError();
    await sendMessage({ text: trimmed });
  };

  return {
    wsUrlInput,
    setWsUrlInput,
    codexStatus,
    messages,
    isStreaming,
    error,
    pendingElicitations,
    autoApproveSession,
    setAutoApproveSession,
    activeRunningTool,
    approveElicitation,
    declineElicitation,
    connect,
    resetChat,
    stopStreaming,
    sendPrompt,
  };
}
