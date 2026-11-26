import { callMcpTool, getMcpToolDescriptors } from "./tools";

const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const SERVER_INFO = {
  name: "kakeibo-mcp",
  version: "0.1.0",
};

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}

function rpcSuccess(id: string | number | null, result: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

function rpcError(id: string | number | null, code: number, message: string, data?: unknown) {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data !== undefined ? { data } : {}),
    },
  };
}

async function handleSingleRpcMessage(
  msg: JsonRpcRequest,
): Promise<Record<string, unknown> | null> {
  if (!msg || typeof msg !== "object" || typeof msg.method !== "string") {
    return rpcError(null, -32600, "Invalid Request");
  }

  const isNotification = msg.id === undefined;
  const id = msg.id ?? null;

  if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled") {
    return null;
  }

  if (msg.method === "initialize") {
    const requestedVersion =
      typeof msg.params?.protocolVersion === "string" ? msg.params.protocolVersion : undefined;
    const protocolVersion =
      requestedVersion &&
      (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requestedVersion)
        ? requestedVersion
        : SUPPORTED_PROTOCOL_VERSIONS[0];

    return rpcSuccess(id, {
      protocolVersion,
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: SERVER_INFO,
      instructions:
        "家計簿アプリ (kakeibo) の MCP サーバーです。支出の検索・集計・作成・更新・削除と、A2UI ダッシュボードのバージョン管理ができます。",
    });
  }

  if (msg.method === "ping") {
    return rpcSuccess(id, {});
  }

  if (msg.method === "tools/list") {
    return rpcSuccess(id, {
      tools: getMcpToolDescriptors(),
    });
  }

  if (msg.method === "tools/call") {
    const toolName = typeof msg.params?.name === "string" ? msg.params.name : "";
    if (!toolName) {
      return rpcError(id, -32602, "tools/call requires params.name");
    }
    const result = await callMcpTool(toolName, msg.params?.arguments);
    return rpcSuccess(id, result);
  }

  if (isNotification) {
    return null;
  }

  return rpcError(id, -32601, `Method not found: ${msg.method}`);
}

export async function handleMcpPost(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error"), 400);
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) {
      return jsonResponse(rpcError(null, -32600, "Invalid Request"), 400);
    }
    const responses = (
      await Promise.all(payload.map((item) => handleSingleRpcMessage(item as JsonRpcRequest)))
    ).filter((item): item is Record<string, unknown> => item !== null);

    if (responses.length === 0) {
      return new Response(null, { status: 202 });
    }
    return jsonResponse(responses, 200);
  }

  const response = await handleSingleRpcMessage(payload as JsonRpcRequest);
  if (response === null) {
    return new Response(null, { status: 202 });
  }
  return jsonResponse(response, 200);
}

export function handleMcpGet(): Response {
  return jsonResponse(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: "streamable-http",
      endpoint: "/api/mcp",
      tools: getMcpToolDescriptors().map((t) => ({ name: t.name, title: t.annotations.title })),
    },
    200,
  );
}

export function handleMcpDelete(): Response {
  return new Response(null, { status: 204 });
}
