import type { ReactNode } from "react";
import { ChevronRight, Trash2 } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ALL_CATEGORY_LABEL, formatYen, type ExpenseItem } from "@/features/expenses/model";
import { cn } from "@/lib/utils";
import { getByPath } from "../data-model";
import type { A2UIComponent } from "../types";
import type { A2UIRenderContext } from "./render-context";

type ExpenseNode = Extract<A2UIComponent, { component: "CategoryBreakdown" | "ExpenseList" }>;

const categoryRowsSchema = z
  .object({
    category: z.string(),
    total: z.number(),
    count: z.number(),
  })
  .and(z.union([z.object({ ratio: z.number() }), z.object({ ratioPercent: z.number() })]))
  .array();

export function renderExpenseNode(node: ExpenseNode, ctx: A2UIRenderContext): ReactNode {
  const { mergedModel, pending, compact, onAction } = ctx;

  switch (node.component) {
    case "CategoryBreakdown": {
      const data = getByPath(mergedModel, node.dataPath);
      const parsed = categoryRowsSchema.safeParse(data);
      const items = parsed.success ? parsed.data.sort((a, b) => b.total - a.total) : [];
      if (items.length === 0) {
        return (
          <p key={node.id} className="text-muted-foreground py-4 text-center text-sm">
            {node.emptyText ?? "まだ支出データがありません"}
          </p>
        );
      }

      const detailsPeriod = compact ? node.detailsPeriod : undefined;
      const Row = detailsPeriod ? "button" : "div";
      return (
        <ul key={node.id} aria-label="カテゴリ別の支出割合" className="list-none">
          {items.map((item) => {
            const ratio = "ratio" in item ? item.ratio : item.ratioPercent;
            return (
              <li key={item.category}>
                <Row
                  className={cn(
                    "block w-full space-y-1.5 rounded-md py-1.5 text-left",
                    detailsPeriod &&
                      "hover:bg-accent focus-visible:ring-ring cursor-pointer px-1.5 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-default disabled:opacity-60",
                  )}
                  {...(detailsPeriod && {
                    type: "button" as const,
                    disabled: pending,
                    "aria-label": `${detailsPeriod}の${item.category}の明細を見る（${item.count}件、${formatYen(item.total)}、${ratio}%）`,
                    onClick: () =>
                      onAction({
                        name: "sendPrompt",
                        payload: {
                          text: `${detailsPeriod}の「${item.category}」の支出明細を見せて`,
                        },
                      }),
                  })}
                >
                  <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 font-medium break-words">{item.category}</span>
                      <span className="text-muted-foreground shrink-0 text-xs">{item.count}件</span>
                    </span>
                    <span className="ml-auto flex items-center gap-2 tabular-nums">
                      <span className="font-semibold">{formatYen(item.total)}</span>
                      <span className="text-muted-foreground w-9 text-right text-xs">{ratio}%</span>
                      {detailsPeriod && (
                        <ChevronRight aria-hidden className="text-muted-foreground size-3.5" />
                      )}
                    </span>
                  </span>
                  <Progress value={ratio} aria-hidden />
                </Row>
              </li>
            );
          })}
        </ul>
      );
    }

    case "ExpenseList": {
      const allItems = (getByPath(mergedModel, node.dataPath) as ExpenseItem[] | undefined) ?? [];
      const activeFilter = node.filterPath
        ? String(getByPath(mergedModel, node.filterPath) ?? ALL_CATEGORY_LABEL)
        : ALL_CATEGORY_LABEL;

      const filtered =
        activeFilter && activeFilter !== ALL_CATEGORY_LABEL
          ? allItems.filter((item) => item.category === activeFilter)
          : allItems;

      const visible = node.limit ? filtered.slice(0, node.limit) : filtered;

      if (visible.length === 0) {
        return (
          <div key={node.id} className="text-muted-foreground py-6 text-center text-sm">
            {node.emptyText ?? "該当する支出ログがありません"}
          </div>
        );
      }

      return (
        <div key={node.id} className="divide-y">
          {visible.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between gap-3 text-sm first:pt-0 last:pb-0",
                compact ? "py-2" : "py-3",
              )}
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{item.title}</span>
                  {node.showCategory && <Badge variant="secondary">{item.category}</Badge>}
                </div>
                {(node.showDate || (node.showNote && item.note)) && (
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                    {node.showDate && <span>{item.spentAt}</span>}
                    {node.showNote && item.note && <span>{item.note}</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatYen(item.amount)}</span>
                {node.allowDelete && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive size-8"
                    disabled={pending}
                    aria-label={`${item.title}を削除`}
                    onClick={() =>
                      onAction({
                        name: "deleteExpense",
                        payload: { id: item.id },
                      })
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
  }
}
