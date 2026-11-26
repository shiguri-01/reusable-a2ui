export function jsonToolResult<T extends Record<string, unknown>>(result: T) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result) }],
    structuredContent: result,
  };
}
