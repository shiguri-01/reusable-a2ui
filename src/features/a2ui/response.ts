import { CHAT_INLINE_SURFACE_ID, type A2UIMessage } from "./types";
import { validateA2UISurfaceMessages } from "./validate";

type InlineA2UIBlock =
  | { status: "invalid"; error: string }
  | { status: "ready"; messages: A2UIMessage[] };

export function parseInlineA2UIBlock(rawJson: string): InlineA2UIBlock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      status: "invalid",
      error: "インライン UI の JSON 構文エラーです",
    };
  }

  const validated = validateA2UISurfaceMessages(parsed, {
    expectedSurfaceId: CHAT_INLINE_SURFACE_ID,
  });
  if (!validated.ok) {
    return {
      status: "invalid",
      error: validated.error,
    };
  }

  return {
    status: "ready",
    messages: validated.messages,
  };
}
