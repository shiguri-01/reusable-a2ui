import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { registerMcpTools } from "./tools";

const SERVER_INFO = {
  name: "kakeibo-mcp",
  version: "0.1.0",
};

const SERVER_INSTRUCTIONS =
  "家計簿アプリ (kakeibo) の MCP サーバーです。支出の検索・集計・作成・更新・削除と、A2UI ダッシュボードのバージョン管理ができます。";

// Edge-safe JSON Schema validator (no eval/new Function on Cloudflare Workers).
const jsonSchemaValidator = new CfWorkerJsonSchemaValidator();

function createKakeiboMcpServer(): McpServer {
  const server = new McpServer(SERVER_INFO, {
    instructions: SERVER_INSTRUCTIONS,
    jsonSchemaValidator,
  });
  registerMcpTools(server);
  return server;
}

export async function handleMcpPost(request: Request): Promise<Response> {
  const server = createKakeiboMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await Promise.allSettled([transport.close(), server.close()]);
  }
}

/**
 * Per the MCP Streamable HTTP spec, stateless servers that do not expose
 * server-initiated SSE streams or session termination respond with 405.
 */
export function handleMcpMethodNotAllowed(): Response {
  return Response.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Method not allowed.",
      },
      id: null,
    },
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
