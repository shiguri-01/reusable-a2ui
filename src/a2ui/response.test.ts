import { describe, expect, it } from "vite-plus/test";
import { parseA2UIResponse } from "./response";

const proposal = [
  {
    version: "0.9",
    createSurface: { surfaceId: "expense-dashboard", catalogId: "expense", rootId: "root" },
  },
  {
    version: "0.9",
    updateComponents: {
      surfaceId: "expense-dashboard",
      components: [{ id: "root", component: "Text", text: "予算 `確認`" }],
    },
  },
];

describe("parseA2UIResponse", () => {
  it.each(["\n", "\r\n"])("keeps the proposal hidden across streamed boundaries (%j)", (eol) => {
    const intro = "予算を先頭にしました。\n\n";
    const block = ["```a2ui-json", JSON.stringify(proposal, null, 2), "```"].join(eol);
    const text = intro + block;
    for (let length = intro.length; length <= text.length; length++) {
      const response = parseA2UIResponse(text.slice(0, length), true);
      expect(response.displayText).toBe(intro);
      expect(response.proposal?.status ?? "streaming").toBe("streaming");
    }
    expect(parseA2UIResponse(text, true).proposal).toEqual({ status: "streaming" });
    expect(parseA2UIResponse(text).proposal).toMatchObject({ status: "ready", messages: proposal });
  });

  it("preserves ordinary markdown, including literal A2UI fences inside code examples", () => {
    const text =
      '    indented code\n\n```json\n{"value": 3}\n```\n\n````md\n```a2ui-json\n[]\n```\n````';
    expect(parseA2UIResponse(text)).toEqual({
      displayText: text,
      proposal: null,
    });
  });

  it("keeps text following the proposal and reports malformed or interrupted definitions", () => {
    const malformed = "```a2ui-json\r\n{\r\n```\r\n補足です。";
    const response = parseA2UIResponse(malformed);
    expect(response.displayText).toBe("補足です。");
    expect(response.proposal).toMatchObject({ status: "invalid", rawJson: "{" });
    const interrupted = parseA2UIResponse("```a2ui-json\n[{");
    expect(interrupted.displayText).toBe("");
    expect(interrupted.proposal).toMatchObject({ status: "invalid", rawJson: "[{" });
  });
});
