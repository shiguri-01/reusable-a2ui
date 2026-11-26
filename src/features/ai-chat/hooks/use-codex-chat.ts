import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useChat } from "@ai-sdk/react";
import { createLocalStorage } from "@ui-sdk/core";
import type { UIMessage } from "ai";
import { buildA2UIDeveloperInstructions, buildUserTurnPrompt } from "@/features/a2ui/prompt";
import {
  CodexAppServerClient,
  DEFAULT_CODEX_WS_URL,
  type McpElicitationRequest,
} from "../codex/client";
import { CodexChatTransport } from "../codex/transport";
import type { AiPreviewDraft, DashboardEditBase } from "../types";

const wsUrlStorage = createLocalStorage("reusable-a2ui:codex-ws-url:v3");

function readStoredWsUrl(): string {
  return wsUrlStorage.get()?.trim() || DEFAULT_CODEX_WS_URL;
}

function findActiveRunningTool(messages: UIMessage[]) {
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
}

interface UseCodexChatOptions {
  currentPagePath?: string;
  activeVersionName?: string;
  dashboardEditBase?: DashboardEditBase;
  selectedBlock?: { id: string; label: string };
  onDataMutated: (toolName: string) => void;
  onDashboardProposed: (draft: AiPreviewDraft, base?: DashboardEditBase) => void;
}

export function useCodexChat({
  currentPagePath,
  activeVersionName,
  dashboardEditBase,
  selectedBlock,
  onDataMutated,
  onDashboardProposed,
}: UseCodexChatOptions) {
  const [wsUrlInput, setWsUrlInput] = useState(readStoredWsUrl);
  const [pendingElicitations, setPendingElicitations] = useState<McpElicitationRequest[]>([]);
  const [autoApproveSession, setAutoApproveSession] = useState(false);

  const client = useMemo(() => new CodexAppServerClient(DEFAULT_CODEX_WS_URL), []);

  const subscribeStatus = useCallback(
    (onStoreChange: () => void) => client.subscribeStatus(onStoreChange),
    [client],
  );
  const getStatusSnapshot = useCallback(() => client.getStatus(), [client]);
  const codexStatus = useSyncExternalStore(subscribeStatus, getStatusSnapshot, getStatusSnapshot);

  const handleElicitation = useEffectEvent((request: McpElicitationRequest) => {
    if (
      autoApproveSession &&
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

  useEffect(() => {
    client.setUrl(readStoredWsUrl());

    const unsubscribeStatus = client.subscribeStatus((nextStatus) => {
      if (nextStatus.state === "disconnected" || nextStatus.state === "error") {
        setPendingElicitations([]);
      }
    });
    const unsubscribeElicitations = client.subscribeMcpElicitations(handleElicitation);
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
        prepareTurn: (userText) => ({ text: userText }),
        effort: "low",
      }),
    [client],
  );

  useEffect(() => {
    transport.updateHandlers({
      prepareTurn: (userText) => ({
        text: buildUserTurnPrompt({
          userText,
          currentPagePath,
          activeVersionName,
          selectedBlock,
          currentMessagesJson: dashboardEditBase
            ? JSON.stringify(dashboardEditBase.messages, null, 2)
            : undefined,
        }),
        onDashboardProposed: (proposal) => onDashboardProposed(proposal, dashboardEditBase),
      }),
      onDataMutated,
    });
  }, [
    transport,
    currentPagePath,
    activeVersionName,
    dashboardEditBase,
    selectedBlock,
    onDataMutated,
    onDashboardProposed,
  ]);

  const { messages, sendMessage, status, stop, setMessages, error, clearError } = useChat({
    transport,
  });

  const isStreaming = status === "submitted" || status === "streaming";
  const activeRunningTool = findActiveRunningTool(messages);

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
    wsUrlStorage.set(nextUrl);
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
