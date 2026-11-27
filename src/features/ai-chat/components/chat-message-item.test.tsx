import { renderToReadableStream } from "react-dom/server";
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  A2UI_PROTOCOL_VERSION,
  CHAT_INLINE_SURFACE_ID,
  EXPENSE_CATALOG_ID,
} from "@/features/a2ui/types";

afterEach(() => vi.unstubAllEnvs());

function inlineA2UIFence(text: string) {
  const messages = [
    {
      version: A2UI_PROTOCOL_VERSION,
      createSurface: {
        surfaceId: CHAT_INLINE_SURFACE_ID,
        catalogId: EXPENSE_CATALOG_ID,
        components: [{ id: "root", component: "Text", text }],
      },
    },
  ];
  return ["```a2ui-json", JSON.stringify(messages), "```"].join("\n");
}

async function renderMessage(text: string, isStreamingThis = false) {
  vi.stubEnv("SSR", false);
  const { ChatMessageItem } = await import("./chat-message-item");
  const stream = await renderToReadableStream(
    <ChatMessageItem
      message={{ id: "assistant", role: "assistant", parts: [{ type: "text", text }] }}
      dataModel={{}}
      pending={isStreamingThis}
      isStreamingThis={isStreamingThis}
      activePreviewDraftId={null}
      appliedDraftIds={{}}
      editingDraftId={null}
      onExpenseAction={async () => ({ ok: true })}
      onSendPrompt={() => {}}
      onPreview={() => {}}
    />,
  );
  await stream.allReady;
  return new Response(stream).text();
}

it("renders the inline card between the preceding and following markdown", async () => {
  const html = await renderMessage(
    `前文です。\n\n${inlineA2UIFence("カードです。")}\n\n後文です。`,
  );
  expect(html).toMatch(/<p[^>]*>前文です。<\/p>[\s\S]*>カードです。</);
  expect(html).toMatch(/>カードです。<[\s\S]*<p[^>]*>後文です。<\/p>/);
}, 20_000);

it("renders multiple cards and preserves ordinary fenced and inline code", async () => {
  const html = await renderMessage(
    [
      inlineA2UIFence("最初のカード"),
      "`インラインコード`",
      "````md\n```a2ui-json\n[]\n```\n````",
      inlineA2UIFence("次のカード"),
    ].join("\n\n"),
  );
  expect(html).toMatch(
    />最初のカード<[\s\S]*data-streamdown="inline-code"[\s\S]*data-language="md"[\s\S]*>次のカード</,
  );
  expect(html.match(/data-a2ui-surface=/g)).toHaveLength(2);
});

it("shows a placeholder for an unfinished fence while rendering a closed card", async () => {
  const first = inlineA2UIFence("完成したカード");
  const unfinished = inlineA2UIFence("未完成のカード").slice(0, -3);
  const html = await renderMessage(`${first}\n\n${unfinished}`, true);
  expect(html).toMatch(/>完成したカード<[\s\S]*data-slot="skeleton"/);
  expect(html).not.toContain("未完成のカード");
  const closed = await renderMessage(unfinished + "```", true);
  expect(closed).toContain(">未完成のカード<");
  expect(closed).not.toContain('data-slot="skeleton"');
});

it("shows a generic error for an unfinished fence after streaming ends", async () => {
  const first = inlineA2UIFence("完成したカード");
  const unfinished = inlineA2UIFence("未完成のカード").slice(0, -3);
  const html = await renderMessage(`${first}\n\n${unfinished}`);
  expect(html).toMatch(/>完成したカード<[\s\S]*>UI の表示に失敗しました</);
  expect(html.match(/data-a2ui-surface=/g)).toHaveLength(1);
  expect(html).not.toContain("未完成のカード");
});

it("renders malformed JSON as an error in the original position", async () => {
  const html = await renderMessage("前文\n\n```a2ui-json\n[{\n```\n\n後文");
  expect(html).toMatch(
    />前文<[\s\S]*class="text-destructive text-xs">インライン UI の JSON 構文エラーです<[\s\S]*>後文</,
  );
});

it.each(["```a2ui-json", "```a2ui-json\n", "```a2ui-json\n[{"])(
  "shows the placeholder as an A2UI fence starts streaming (%j)",
  async (text) => {
    const html = await renderMessage(text, true);
    expect(html).toContain('role="status"');
    expect(html).toContain('data-slot="skeleton"');
    expect(html).not.toContain('data-language="a2ui-json"');
  },
);

it("renders an empty closed fence as a JSON error", async () => {
  const html = await renderMessage("```a2ui-json\n```");
  expect(html).toContain("インライン UI の JSON 構文エラーです");
});
