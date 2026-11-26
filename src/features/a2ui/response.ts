import type { A2UIMessage } from "./types";
import { validateA2UISurfaceMessages } from "./validate";

type InlineA2UIBlock =
  | { status: "streaming" }
  | { status: "invalid"; error: string }
  | { status: "ready"; messages: A2UIMessage[] };

interface InlineA2UIResponse {
  displayText: string;
  inlineUi: InlineA2UIBlock | null;
}

function parseInlineBlock(rawJson: string): InlineA2UIBlock {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      status: "invalid",
      error: "インライン UI の JSON 構文エラーです",
    };
  }

  const validated = validateA2UISurfaceMessages(parsed);
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

const A2UI_LANGUAGE = "a2ui-json";
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)(\r?\n|\r?$)/gm;
const PARTIAL_FENCE_LINE = /^ {0,3}(?:`{1,2}|~{1,2})\r?$/;

/**
 * Extracts an inline ```a2ui-json block from an assistant chat message.
 * Dashboard edits are handled separately via MCP tools (`propose_dashboard_ui` / `save_ui_version`).
 */
export function parseInlineA2UIResponse(text: string, isStreaming = false): InlineA2UIResponse {
  let visibleStart = 0;
  let visibleEnd = text.length;
  let displayText = "";
  let completedJson: string | null = null;
  let openFence: { marker: string; bodyStart: number; isA2UI: boolean } | null = null;

  for (const match of text.matchAll(FENCE_LINE)) {
    const [line, marker, info, lineBreak] = match;
    const lineStart = match.index;
    const lineEnd = lineStart + line.length;
    const language = info.trim().toLowerCase();

    if (openFence) {
      const closesFence = marker.startsWith(openFence.marker) && !language;
      if (!closesFence) continue;

      if (openFence.isA2UI) {
        completedJson = text.slice(openFence.bodyStart, lineStart);
        visibleStart = lineEnd;
      }
      openFence = null;
      continue;
    }

    if (marker[0] === "`" && info.includes("`")) continue;
    const isA2UI = language === A2UI_LANGUAGE;
    if (isStreaming && !lineBreak.includes("\n") && !isA2UI && A2UI_LANGUAGE.startsWith(language)) {
      visibleEnd = lineStart;
      break;
    }

    openFence = { marker, bodyStart: lineEnd, isA2UI };
    if (isA2UI) displayText += text.slice(visibleStart, lineStart);
  }

  if (openFence?.isA2UI) {
    const inlineUi: InlineA2UIBlock = isStreaming
      ? { status: "streaming" }
      : {
          status: "invalid",
          error: "UI 定義が途中で終了しました",
        };
    return { displayText, inlineUi };
  }

  if (isStreaming && !openFence) {
    const lastLine = text.slice(text.lastIndexOf("\n") + 1);
    if (PARTIAL_FENCE_LINE.test(lastLine)) visibleEnd -= lastLine.length;
  }

  displayText += text.slice(visibleStart, visibleEnd);
  if (completedJson === null) return { displayText, inlineUi: null };

  return {
    displayText,
    inlineUi: isStreaming ? { status: "streaming" } : parseInlineBlock(completedJson.trim()),
  };
}
