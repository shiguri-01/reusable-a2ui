import { describe, expect, it } from "vite-plus/test";
import { buildSurfaceState } from "./data-model";
import { parseInlineA2UIResponse } from "./response";
import { A2UI_PROTOCOL_VERSION, DASHBOARD_SURFACE_ID, EXPENSE_CATALOG_ID } from "./types";
import { validateA2UISurfaceMessages } from "./validate";

const inlineSurface = [
  {
    version: A2UI_PROTOCOL_VERSION,
    createSurface: {
      surfaceId: "chat-inline",
      catalogId: EXPENSE_CATALOG_ID,
      components: [{ id: "root", component: "Text" as const, text: "予算 `確認`" }],
    },
  },
];

const streamedSurface = [
  {
    version: A2UI_PROTOCOL_VERSION,
    createSurface: { surfaceId: "chat-inline", catalogId: EXPENSE_CATALOG_ID },
  },
  {
    version: A2UI_PROTOCOL_VERSION,
    updateComponents: {
      surfaceId: "chat-inline",
      components: [{ id: "root", component: "Text" as const, text: "予算 `確認`" }],
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

describe("validateA2UISurfaceMessages (v1.0)", () => {
  it("validates single-message and streamed surfaces, root existence, unique IDs, and children references", () => {
    expect(validateA2UISurfaceMessages(inlineSurface).ok).toBe(true);
    expect(validateA2UISurfaceMessages(streamedSurface).ok).toBe(true);

    const wrongSurface = validateA2UISurfaceMessages(inlineSurface, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    expect(wrongSurface.ok).toBe(false);

    const missingChild = validateA2UISurfaceMessages([
      {
        version: "1.0",
        createSurface: {
          surfaceId: "chat-inline",
          catalogId: EXPENSE_CATALOG_ID,
          components: [{ id: "root", component: "Column", children: ["ghost"] }],
        },
      },
    ]);
    expect(missingChild.ok).toBe(false);

    const duplicateId = validateA2UISurfaceMessages([
      {
        version: "1.0",
        createSurface: {
          surfaceId: "chat-inline",
          catalogId: EXPENSE_CATALOG_ID,
          components: [
            { id: "root", component: "Text", text: "a" },
            { id: "root", component: "Text", text: "b" },
          ],
        },
      },
    ]);
    expect(duplicateId.ok).toBe(false);
  });

  it("supports inline dataModel and deleting keys via updateDataModel value: null", () => {
    const validated = validateA2UISurfaceMessages([
      {
        version: "1.0",
        createSurface: {
          surfaceId: "chat-inline",
          catalogId: EXPENSE_CATALOG_ID,
          components: [{ id: "root", component: "Text", text: { "@path": "/note" } }],
          dataModel: { note: "hello", transient: "remove-me" },
        },
      },
      {
        version: "1.0",
        updateDataModel: {
          surfaceId: "chat-inline",
          path: "/transient",
          value: null,
        },
      },
    ]);

    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const state = buildSurfaceState(validated.messages);
    expect(state?.initialDataModel).toEqual({ note: "hello" });
  });

  it("rejects cyclic component hierarchies and un-recreated deleted surfaces", () => {
    const cyclic = validateA2UISurfaceMessages([
      {
        version: "1.0",
        createSurface: {
          surfaceId: "chat-inline",
          catalogId: EXPENSE_CATALOG_ID,
          components: [
            { id: "root", component: "Column", children: ["card-a"] },
            { id: "card-a", component: "Card", children: ["card-b"] },
            { id: "card-b", component: "Card", children: ["card-a"] },
          ],
        },
      },
    ]);
    expect(cyclic.ok).toBe(false);

    const deleted = validateA2UISurfaceMessages([
      ...inlineSurface,
      {
        version: "1.0",
        deleteSurface: { surfaceId: "chat-inline" },
      },
    ]);
    expect(deleted.ok).toBe(false);

    const recreated = validateA2UISurfaceMessages([
      ...inlineSurface,
      {
        version: "1.0",
        deleteSurface: { surfaceId: "chat-inline" },
      },
      ...inlineSurface,
    ]);
    expect(recreated.ok).toBe(true);
  });
});
