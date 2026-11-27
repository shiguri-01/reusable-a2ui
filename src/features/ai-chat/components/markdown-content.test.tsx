import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function renderFallback(ssr: boolean, content: string) {
  vi.stubEnv("SSR", ssr);
  const { MarkdownContent } = await import("./markdown-content");
  return renderToStaticMarkup(
    <MarkdownContent
      content={content}
      baseDataModel={{}}
      pending={false}
      onExpenseAction={async () => ({ ok: true })}
      onSendPrompt={() => {}}
    />,
  );
}

it.each([true, false])("renders A2UI skeletons in document order (SSR: %s)", async (ssr) => {
  const html = await renderFallback(
    ssr,
    '前文\n\n~~~~A2UI-JSON\n["closed payload"]\n~~~~\n\n後文\n\n```a2ui-json\n["unfinished payload"]',
  );
  expect(html).toMatch(/前文[\s\S]*data-slot="skeleton"[\s\S]*後文[\s\S]*data-slot="skeleton"/);
  expect(html.match(/role="status"/g)).toHaveLength(2);
  expect(html).not.toContain("closed payload");
  expect(html).not.toContain("unfinished payload");
});

it("keeps the rest of the fallback hidden when the closing boundary is ambiguous", async () => {
  const html = await renderFallback(true, '前文\n\n> ```a2ui-json\n> ["payload"]\n> ```\n\n後文');
  expect(html).toMatch(/前文[\s\S]*data-slot="skeleton"/);
  expect(html).not.toContain("payload");
  expect(html).not.toContain("後文");
});
