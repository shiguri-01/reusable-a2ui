export type CodexConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

export interface JsonRpcNotification {
  jsonrpc?: "2.0";
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc?: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface CodexThreadStartResult {
  thread: {
    id: string;
  };
  model: string;
  modelProvider?: string;
}

export interface CodexTurnStartResult {
  turn: {
    id: string;
  };
}

export interface CodexClientStatus {
  state: CodexConnectionState;
  url: string;
  model?: string;
  threadId?: string;
  error?: string;
}

type NotificationHandler = (method: string, params: Record<string, unknown>) => void;
type StatusListener = (status: CodexClientStatus) => void;

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

export const DEFAULT_CODEX_WS_URL = "ws://127.0.0.1:4500";

export class CodexAppServerClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private notificationHandlers = new Set<NotificationHandler>();
  private statusListeners = new Set<StatusListener>();
  private connectPromise: Promise<void> | null = null;
  private status: CodexClientStatus;

  constructor(url = DEFAULT_CODEX_WS_URL) {
    this.status = {
      state: "disconnected",
      url,
    };
  }

  getStatus(): CodexClientStatus {
    return this.status;
  }

  setUrl(url: string) {
    const trimmed = url.trim() || DEFAULT_CODEX_WS_URL;
    if (trimmed === this.status.url) return;
    this.disconnect();
    this.updateStatus({
      state: "disconnected",
      url: trimmed,
      model: undefined,
      threadId: undefined,
      error: undefined,
    });
  }

  subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  subscribeNotifications(handler: NotificationHandler): () => void {
    this.notificationHandlers.add(handler);
    return () => {
      this.notificationHandlers.delete(handler);
    };
  }

  private updateStatus(patch: Partial<CodexClientStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      listener(this.status);
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.status.state === "connected") {
      return;
    }
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    this.disconnectSocketOnly();
    this.updateStatus({ state: "connecting", error: undefined });

    const ws = new WebSocket(this.status.url);
    this.ws = ws;

    await new Promise<void>((resolve, reject) => {
      const handleOpen = () => {
        ws.removeEventListener("error", handleError);
        resolve();
      };
      const handleError = () => {
        ws.removeEventListener("open", handleOpen);
        reject(new Error(`Codex App Server (${this.status.url}) に接続できません。`));
      };
      ws.addEventListener("open", handleOpen, { once: true });
      ws.addEventListener("error", handleError, { once: true });
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : "接続に失敗しました";
      this.ws = null;
      this.updateStatus({ state: "error", error: message });
      throw err;
    });

    ws.addEventListener("message", (event) => {
      if (this.ws !== ws) return;
      this.handleRawMessage(String(event.data));
    });

    ws.addEventListener("close", () => {
      if (this.ws !== ws) return;
      const wasConnected = this.status.state === "connected";
      this.rejectAllPending(new Error("Codex App Server との接続が切断されました"));
      this.ws = null;
      if (this.status.state !== "error") {
        this.updateStatus({
          state: "disconnected",
          threadId: undefined,
          error: wasConnected ? "サーバー接続が切断されました" : undefined,
        });
      }
    });

    ws.addEventListener("error", () => {
      if (this.ws !== ws) return;
      this.updateStatus({
        state: "error",
        error: `WebSocket 通信エラー (${this.status.url})`,
      });
    });

    try {
      await this.request("initialize", {
        clientInfo: {
          name: "reusable-a2ui",
          version: "0.1.0",
        },
        capabilities: null,
      });
      this.notify("initialized");
      this.updateStatus({ state: "connected", error: undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : "初期化に失敗しました";
      this.disconnectSocketOnly();
      this.updateStatus({ state: "error", error: message });
      throw err;
    }
  }

  disconnect() {
    this.disconnectSocketOnly();
    this.updateStatus({
      state: "disconnected",
      threadId: undefined,
      model: undefined,
      error: undefined,
    });
  }

  private disconnectSocketOnly() {
    this.rejectAllPending(new Error("接続を終了しました"));
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore close errors
      }
      this.ws = null;
    }
  }

  private rejectAllPending(error: Error) {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private handleRawMessage(raw: string) {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    // Response to a client request
    if (typeof parsed.id === "number" && !("method" in parsed)) {
      const pending = this.pending.get(parsed.id);
      if (!pending) return;
      this.pending.delete(parsed.id);

      const errObj = parsed.error as JsonRpcResponse["error"] | undefined;
      if (errObj) {
        pending.reject(new Error(errObj.message || `JSON-RPC error (${errObj.code})`));
      } else {
        pending.resolve(parsed.result);
      }
      return;
    }

    // Server notification
    if (typeof parsed.method === "string") {
      const params =
        parsed.params && typeof parsed.params === "object"
          ? (parsed.params as Record<string, unknown>)
          : {};

      for (const handler of this.notificationHandlers) {
        handler(parsed.method, params);
      }
    }
  }

  async request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Codex App Server に接続されていません");
    }

    const id = this.nextId++;
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      ...(params !== undefined ? { params } : {}),
    };

    return await new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      this.ws?.send(JSON.stringify(payload));
    });
  }

  notify(method: string, params?: unknown) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const payload: JsonRpcNotification = {
      jsonrpc: "2.0",
      method,
      ...(params !== undefined ? { params } : {}),
    };
    this.ws.send(JSON.stringify(payload));
  }

  async startThread(options: {
    developerInstructions: string;
    model?: string;
  }): Promise<CodexThreadStartResult> {
    await this.connect();
    const res = await this.request<CodexThreadStartResult>("thread/start", {
      sandbox: "read-only",
      approvalPolicy: "never",
      ephemeral: true,
      developerInstructions: options.developerInstructions,
      ...(options.model ? { model: options.model } : {}),
    });
    this.updateStatus({
      threadId: res.thread.id,
      model: res.model,
    });
    return res;
  }

  async startTurn(options: {
    threadId: string;
    text: string;
    effort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  }): Promise<CodexTurnStartResult> {
    await this.connect();
    return await this.request<CodexTurnStartResult>("turn/start", {
      threadId: options.threadId,
      input: [
        {
          type: "text",
          text: options.text,
          text_elements: [],
        },
      ],
      approvalPolicy: "never",
      effort: options.effort ?? "low",
    });
  }

  async interruptTurn(threadId: string, turnId: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    await this.request("turn/interrupt", { threadId, turnId }).catch(() => {
      // ignore if turn already ended
    });
  }

  resetThread() {
    this.updateStatus({ threadId: undefined });
  }
}
