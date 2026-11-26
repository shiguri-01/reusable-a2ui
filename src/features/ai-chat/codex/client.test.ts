import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CodexAppServerClient,
  MCP_ELICITATION_APPROVAL_POLICY,
  type McpElicitationRequest,
} from "./client";

class MockWebSocket extends EventTarget {
  static OPEN = 1;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readyState = 0;
  sent: Array<Record<string, unknown>> = [];
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    MockWebSocket.instances.push(this);
    queueMicrotask(() => {
      this.readyState = MockWebSocket.OPEN;
      this.dispatchEvent(new Event("open"));
    });
  }

  send(data: string) {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    this.sent.push(parsed);

    if (parsed.method === "initialize" && typeof parsed.id === "number") {
      this.emitMessage({ jsonrpc: "2.0", id: parsed.id, result: {} });
    } else if (parsed.method === "thread/start" && typeof parsed.id === "number") {
      this.emitMessage({
        jsonrpc: "2.0",
        id: parsed.id,
        result: { thread: { id: "thr_1" }, model: "gpt-5" },
      });
    } else if (parsed.method === "turn/start" && typeof parsed.id === "number") {
      this.emitMessage({
        jsonrpc: "2.0",
        id: parsed.id,
        result: { turn: { id: "turn_1" } },
      });
    }
  }

  emitMessage(payload: unknown) {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(payload) }));
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent(new Event("close"));
  }
}

describe("CodexAppServerClient MCP elicitation support", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal("WebSocket", MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses granular approvalPolicy enabling only mcp_elicitations on thread/start and turn/start", async () => {
    const client = new CodexAppServerClient("ws://127.0.0.1:4500");
    await client.startThread({ developerInstructions: "test" });
    await client.startTurn({ threadId: "thr_1", text: "delete lunch" });

    const ws = MockWebSocket.instances[0]!;
    const initialize = ws.sent.find((msg) => msg.method === "initialize");
    const threadStart = ws.sent.find((msg) => msg.method === "thread/start");
    const turnStart = ws.sent.find((msg) => msg.method === "turn/start");

    expect(initialize?.params).toMatchObject({
      capabilities: {
        experimentalApi: true,
      },
    });
    expect(threadStart?.params).toMatchObject({
      sandbox: "read-only",
      approvalPolicy: MCP_ELICITATION_APPROVAL_POLICY,
    });
    expect(turnStart?.params).toMatchObject({
      approvalPolicy: MCP_ELICITATION_APPROVAL_POLICY,
    });
  });

  it("delivers mcpServer/elicitation/request to subscribers and sends structured responses", async () => {
    const client = new CodexAppServerClient("ws://127.0.0.1:4500");
    const received: McpElicitationRequest[] = [];
    client.subscribeMcpElicitations((req) => received.push(req));

    await client.connect();
    const ws = MockWebSocket.instances[0]!;

    ws.emitMessage({
      jsonrpc: "2.0",
      id: "req-42",
      method: "mcpServer/elicitation/request",
      params: {
        threadId: "thr_1",
        turnId: "turn_1",
        serverName: "kakeibo",
        environmentId: null,
        mode: "form",
        message: "Allow delete_expenses?",
        requestedSchema: { type: "object", properties: {} },
        _meta: {
          codex_approval_kind: "mcp_tool_call",
          tool_name: "delete_expenses",
          tool_title: "支出の削除",
          tool_params: { ids: [3, 5] },
          persist: ["session"],
        },
      },
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      requestId: "req-42",
      serverName: "kakeibo",
      approvalKind: "mcp_tool_call",
      toolName: "delete_expenses",
      toolTitle: "支出の削除",
      toolParams: { ids: [3, 5] },
      persistOptions: ["session"],
    });

    client.respondToMcpElicitation("req-42", { action: "accept", persist: "session" });
    const response = ws.sent.find((msg) => msg.id === "req-42");
    expect(response).toEqual({
      jsonrpc: "2.0",
      id: "req-42",
      result: {
        action: "accept",
        content: {},
        _meta: { persist: "session" },
      },
    });
  });

  it("auto-declines mcpServer/elicitation/request when no subscriber is registered", async () => {
    const client = new CodexAppServerClient("ws://127.0.0.1:4500");
    await client.connect();
    const ws = MockWebSocket.instances[0]!;

    ws.emitMessage({
      jsonrpc: "2.0",
      id: 99,
      method: "mcpServer/elicitation/request",
      params: {
        threadId: "thr_1",
        turnId: "turn_1",
        serverName: "kakeibo",
        mode: "form",
        message: "Allow delete_expenses?",
      },
    });

    const response = ws.sent.find((msg) => msg.id === 99);
    expect(response).toEqual({
      jsonrpc: "2.0",
      id: 99,
      result: {
        action: "decline",
        content: null,
        _meta: null,
      },
    });
  });

  it("returns JSON-RPC method-not-found error for unsupported server requests", async () => {
    const client = new CodexAppServerClient("ws://127.0.0.1:4500");
    await client.connect();
    const ws = MockWebSocket.instances[0]!;

    ws.emitMessage({
      jsonrpc: "2.0",
      id: 100,
      method: "item/commandExecution/requestApproval",
      params: {},
    });

    const response = ws.sent.find((msg) => msg.id === 100);
    expect(response).toMatchObject({
      jsonrpc: "2.0",
      id: 100,
      error: {
        code: -32601,
      },
    });
  });
});
