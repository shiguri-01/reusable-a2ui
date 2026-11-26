import { describe, expect, it, vi } from "vite-plus/test";
import { extractDashboardDraft } from "@/features/a2ui/draft";
import { createEmptyDashboardMessages } from "@/features/dashboard/lib/a2ui-builder";

vi.mock("void/db", () => ({
  db: {},
  and: vi.fn(),
  asc: vi.fn(),
  desc: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  inArray: vi.fn(),
  lte: vi.fn(),
}));

const { handleMcpMethodNotAllowed, handleMcpPost } = await import("./server");

function createMcpRequest(body: unknown, headers?: Record<string, string>): Request {
  return new Request("http://localhost/api/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("kakeibo MCP server (@modelcontextprotocol/sdk)", () => {
  it("handles initialize and notifications/initialized", async () => {
    const initRes = await handleMcpPost(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    );

    expect(initRes.status).toBe(200);
    const initJson = (await initRes.json()) as {
      result: {
        protocolVersion: string;
        serverInfo: { name: string; version: string };
        instructions?: string;
        capabilities: { tools?: Record<string, unknown> };
      };
    };
    expect(initJson.result.protocolVersion).toBe("2025-11-25");
    expect(initJson.result.serverInfo).toEqual({ name: "kakeibo-mcp", version: "0.1.0" });
    expect(initJson.result.instructions).toContain("家計簿アプリ");
    expect(initJson.result.capabilities.tools).toBeDefined();

    const notifRes = await handleMcpPost(
      createMcpRequest({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    );
    expect(notifRes.status).toBe(202);
  });

  it("lists all registered tools with JSON schemas and annotations", async () => {
    const res = await handleMcpPost(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        tools: Array<{
          name: string;
          title?: string;
          inputSchema: { type: string; properties?: Record<string, unknown> };
          annotations?: { title?: string; destructiveHint?: boolean };
        }>;
      };
    };

    expect(body.result.tools).toHaveLength(9);
    const names = body.result.tools.map((t) => t.name);
    expect(names).toEqual([
      "list_expenses",
      "get_spending_summary",
      "create_expenses",
      "update_expense",
      "delete_expenses",
      "list_ui_versions",
      "activate_ui_version",
      "propose_dashboard_ui",
      "save_ui_version",
    ]);

    for (const tool of body.result.tools) {
      expect(tool.title).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.annotations?.title).toBeUndefined();
    }
  });

  it("executes propose_dashboard_ui and returns structuredContent", async () => {
    const messages = createEmptyDashboardMessages();
    const res = await handleMcpPost(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "propose_dashboard_ui",
          arguments: {
            name: "テスト案",
            description: "最小構成",
            messages,
          },
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
        structuredContent?: { draft: { name: string; messages: unknown[]; messagesJson?: string } };
      };
    };
    expect(body.result.isError).toBeUndefined();
    expect(body.result.structuredContent?.draft.name).toBe("テスト案");
    expect(body.result.structuredContent?.draft.messages).toHaveLength(1);
    expect(body.result.structuredContent?.draft.messagesJson).toBeUndefined();
    expect(body.result.content[0]?.type).toBe("text");

    const parsedDraft = extractDashboardDraft("call-1", body.result.structuredContent);
    expect(parsedDraft?.messagesJson).toContain("dashboard");
  });

  it("returns tool error when refined schema validation fails", async () => {
    const res = await handleMcpPost(
      createMcpRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: {
          name: "update_expense",
          arguments: { id: 1 },
        },
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      result: {
        isError?: boolean;
        content: Array<{ type: string; text: string }>;
      };
    };
    expect(body.result.isError).toBe(true);
    expect(body.result.content[0]?.text).toContain("更新するフィールドを1つ以上指定してください");
  });

  it("enforces Streamable HTTP header and method requirements", async () => {
    const missingAccept = await handleMcpPost(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 5, method: "ping" }),
      }),
    );
    expect(missingAccept.status).toBe(406);

    const wrongContentType = await handleMcpPost(
      new Request("http://localhost/api/mcp", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          accept: "application/json, text/event-stream",
        },
        body: "{}",
      }),
    );
    expect(wrongContentType.status).toBe(415);

    const notAllowed = handleMcpMethodNotAllowed();
    expect(notAllowed.status).toBe(405);
    expect(notAllowed.headers.get("allow")).toBe("POST");
  });
});
