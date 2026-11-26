import { describe, expect, it } from "vite-plus/test";
import { parseInlineA2UIResponse } from "./response";
import { DASHBOARD_SURFACE_ID } from "./types";
import { validateA2UISurfaceMessages } from "./validate";

const inlineSurface = [
  {
    version: "0.9",
    createSurface: { surfaceId: "chat-inline", catalogId: "expense", rootId: "root" },
  },
  {
    version: "0.9",
    updateComponents: {
      surfaceId: "chat-inline",
      components: [{ id: "root", component: "Text", text: "予算 `確認`" }],
    },
  },
];

describe("parseInlineA2UIResponse", () => {
  it.each(["\n", "\r\n"])("keeps the inline UI hidden across streamed boundaries (%j)", (eol) => {
    const intro = "今月の予算状況です。\n\n";
    const block = ["```a2ui-json", JSON.stringify(inlineSurface, null, 2), "```"].join(eol);
    const text = intro + block;
    for (let length = intro.length; length <= text.length; length++) {
      const response = parseInlineA2UIResponse(text.slice(0, length), true);
      expect(response.displayText).toBe(intro);
      expect(response.inlineUi?.status ?? "streaming").toBe("streaming");
    }
    expect(parseInlineA2UIResponse(text, true).inlineUi).toEqual({ status: "streaming" });
    expect(parseInlineA2UIResponse(text).inlineUi).toMatchObject({
      status: "ready",
      messages: inlineSurface,
    });
  });

  it("preserves ordinary markdown, including literal A2UI fences inside code examples", () => {
    const text =
      '    indented code\n\n```json\n{"value": 3}\n```\n\n````md\n```a2ui-json\n[]\n```\n````';
    expect(parseInlineA2UIResponse(text)).toEqual({
      displayText: text,
      inlineUi: null,
    });
  });

  it("keeps text following the inline UI and reports malformed or interrupted definitions", () => {
    const malformed = "```a2ui-json\r\n{\r\n```\r\n補足です。";
    const response = parseInlineA2UIResponse(malformed);
    expect(response.displayText).toBe("補足です。");
    expect(response.inlineUi).toMatchObject({ status: "invalid", rawJson: "{" });
    const interrupted = parseInlineA2UIResponse("```a2ui-json\n[{");
    expect(interrupted.displayText).toBe("");
    expect(interrupted.inlineUi).toMatchObject({ status: "invalid", rawJson: "[{" });
  });
});

describe("validateA2UISurfaceMessages", () => {
  it("validates expected surfaceId, rootId, unique IDs, and children references", () => {
    expect(validateA2UISurfaceMessages(inlineSurface).ok).toBe(true);

    const wrongSurface = validateA2UISurfaceMessages(inlineSurface, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    expect(wrongSurface.ok).toBe(false);

    const missingChild = validateA2UISurfaceMessages([
      {
        version: "0.9",
        createSurface: { surfaceId: "chat-inline", catalogId: "expense", rootId: "root" },
      },
      {
        version: "0.9",
        updateComponents: {
          surfaceId: "chat-inline",
          components: [{ id: "root", component: "Column", children: ["ghost"] }],
        },
      },
    ]);
    expect(missingChild.ok).toBe(false);

    const duplicateId = validateA2UISurfaceMessages([
      {
        version: "0.9",
        createSurface: { surfaceId: "chat-inline", catalogId: "expense", rootId: "root" },
      },
      {
        version: "0.9",
        updateComponents: {
          surfaceId: "chat-inline",
          components: [
            { id: "root", component: "Text", text: "a" },
            { id: "root", component: "Text", text: "b" },
          ],
        },
      },
    ]);
    expect(duplicateId.ok).toBe(false);
  });
});
