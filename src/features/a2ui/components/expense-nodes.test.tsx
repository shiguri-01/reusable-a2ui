import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";
import { A2UI_PROTOCOL_VERSION, EXPENSE_CATALOG_ID, type A2UIMessage } from "../types";
import { A2UISurface } from "./a2ui-surface";

describe("CategoryBreakdown", () => {
  const surfaceId = "chat-inline";
  const messages: A2UIMessage[] = [
    {
      version: A2UI_PROTOCOL_VERSION,
      createSurface: {
        surfaceId,
        catalogId: EXPENSE_CATALOG_ID,
        components: [
          {
            id: "root",
            component: "CategoryBreakdown",
            dataPath: "/categoryBreakdown",
            detailsPeriod: "2026年11月",
          },
        ],
        dataModel: {
          categoryBreakdown: [
            { category: "交通", total: 250, count: 2, ratio: 25 },
            { category: "食費", total: 750, count: 3, ratioPercent: 75 },
          ],
        },
      },
    },
  ];

  it("plots tool and dashboard percentages in spending order with chat detail buttons", () => {
    const html = renderToStaticMarkup(
      <A2UISurface
        messages={messages}
        dataModel={{}}
        onDataModelChange={vi.fn()}
        onAction={vi.fn()}
        compact
      />,
    );

    expect(html).toContain("2026年11月の食費の明細を見る");
    expect(html).toContain('type="button"');
    expect(html).toContain("width:75%");
    expect(html).toContain("width:25%");
    expect(html.indexOf("width:75%")).toBeLessThan(html.indexOf("width:25%"));
  });
});
