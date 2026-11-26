import { z } from "zod";
import type { McpToolDefinition } from "../types";
import { EXPENSE_MCP_TOOLS } from "./expense-tools";
import { UI_VERSION_MCP_TOOLS } from "./ui-version-tools";

export { MUTATING_MCP_TOOL_NAMES } from "../tool-metadata";
export type { McpToolAnnotations, McpToolDefinition } from "../types";

export const MCP_TOOLS: McpToolDefinition[] = [...EXPENSE_MCP_TOOLS, ...UI_VERSION_MCP_TOOLS];

const MCP_TOOLS_BY_NAME = new Map(MCP_TOOLS.map((tool) => [tool.name, tool]));

const MCP_TOOL_DESCRIPTORS = MCP_TOOLS.map((tool) => {
  const jsonSchema = z.toJSONSchema(tool.inputSchema, {
    target: "draft-2020-12",
    unrepresentable: "any",
  }) as Record<string, unknown>;
  delete jsonSchema.$schema;

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: jsonSchema,
    annotations: tool.annotations,
  };
});

export function getMcpToolDescriptors() {
  return MCP_TOOL_DESCRIPTORS;
}

export async function callMcpTool(
  name: string,
  rawArgs: unknown,
): Promise<{
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
}> {
  const tool = MCP_TOOLS_BY_NAME.get(name);
  if (!tool) {
    return {
      isError: true,
      content: [{ type: "text", text: `不明なツールです: ${name}` }],
    };
  }

  const parsed = tool.inputSchema.safeParse(rawArgs ?? {});
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "input"}: ${issue.message}`)
      .join("; ");
    return {
      isError: true,
      content: [{ type: "text", text: `入力パラメータエラー: ${issues}` }],
    };
  }

  try {
    const result = await tool.execute(parsed.data);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "ツールの実行に失敗しました";
    return {
      isError: true,
      content: [{ type: "text", text: message }],
    };
  }
}
