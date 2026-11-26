import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExpenseTools } from "./expense-tools";
import { registerUiVersionTools } from "./ui-version-tools";

export function registerMcpTools(server: McpServer): void {
  registerExpenseTools(server);
  registerUiVersionTools(server);
}
