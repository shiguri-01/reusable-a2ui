import type { z } from "zod";

export interface McpToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface McpToolDefinition<TInput extends z.ZodType = z.ZodType> {
  name: string;
  description: string;
  inputSchema: TInput;
  annotations: McpToolAnnotations;
  execute: (args: z.infer<TInput>) => Promise<Record<string, unknown>>;
}

export function defineTool<TInput extends z.ZodType>(
  def: McpToolDefinition<TInput>,
): McpToolDefinition<TInput> {
  return def;
}
