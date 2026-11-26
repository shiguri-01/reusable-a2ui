import { a2uiMessagesSchema, type A2UIMessage } from "./types";

export type A2UIProposal =
  | { status: "streaming" }
  | { status: "invalid"; rawJson: string; error: string }
  | { status: "ready"; rawJson: string; messages: A2UIMessage[] };

interface A2UIResponse {
  displayText: string;
  proposal: A2UIProposal | null;
}

function parseProposal(rawJson: string): A2UIProposal {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      status: "invalid",
      rawJson,
      error: "JSON の構文エラーのため自動適用できません",
    };
  }

  const validated = a2uiMessagesSchema.safeParse(parsed);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    return {
      status: "invalid",
      rawJson,
      error: `A2UI スキーマ検証エラー（${firstIssue?.path.join(".") || "root"}：${firstIssue?.message ?? "不正な形式"}）`,
    };
  }

  return {
    status: "ready",
    rawJson: JSON.stringify(validated.data, null, 2),
    messages: validated.data,
  };
}

const A2UI_LANGUAGE = "a2ui-json";
const FENCE_LINE = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)(\r?\n|\r?$)/gm;
const PARTIAL_FENCE_LINE = /^ {0,3}(?:`{1,2}|~{1,2})\r?$/;

export function parseA2UIResponse(text: string, isStreaming = false): A2UIResponse {
  let visibleStart = 0;
  let visibleEnd = text.length;
  let displayText = "";
  let completedJson: string | null = null;
  let openFence: { marker: string; bodyStart: number; isA2UI: boolean } | null = null;

  // Track regular Markdown fences too, so examples containing an A2UI fence stay visible.
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
    // A stream chunk may end before the opening fence's language tag is complete.
    if (isStreaming && !lineBreak.includes("\n") && !isA2UI && A2UI_LANGUAGE.startsWith(language)) {
      visibleEnd = lineStart;
      break;
    }

    openFence = { marker, bodyStart: lineEnd, isA2UI };
    if (isA2UI) displayText += text.slice(visibleStart, lineStart);
  }

  if (openFence?.isA2UI) {
    const proposal: A2UIProposal = isStreaming
      ? { status: "streaming" }
      : {
          status: "invalid",
          rawJson: text.slice(openFence.bodyStart).trim(),
          error: "UI 定義が途中で終了しました",
        };
    return { displayText, proposal };
  }

  if (isStreaming && !openFence) {
    const lastLine = text.slice(text.lastIndexOf("\n") + 1);
    if (PARTIAL_FENCE_LINE.test(lastLine)) visibleEnd -= lastLine.length;
  }

  displayText += text.slice(visibleStart, visibleEnd);
  if (completedJson === null) return { displayText, proposal: null };

  return {
    displayText,
    proposal: isStreaming ? { status: "streaming" } : parseProposal(completedJson.trim()),
  };
}
