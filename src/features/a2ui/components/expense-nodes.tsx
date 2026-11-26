import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ALL_CATEGORY_LABEL,
  formatYen,
  type CategoryStat,
  type ExpenseItem,
} from "@/features/expenses/model";
import { cn } from "@/lib/utils";
import { getByPath } from "../data-model";
import type { A2UIComponent } from "../types";
import type { A2UIRenderContext } from "./render-context";

type ExpenseNode = Extract<A2UIComponent, { component: "CategoryBreakdown" | "ExpenseList" }>;

export function renderExpenseNode(node: ExpenseNode, ctx: A2UIRenderContext): ReactNode {
  const { mergedModel, pending, compact, onAction } = ctx;

  switch (node.component) {
    case "CategoryBreakdown": {
      const items = (getByPath(mergedModel, node.dataPath) as CategoryStat[] | undefined) ?? [];
      if (items.length === 0) {
        return (
          <p key={node.id} className="text-muted-foreground py-4 text-center text-sm">
            {node.emptyText ?? "まだ支出データがありません"}
          </p>
        );
      }

      return (
        <div key={node.id} className={cn(compact ? "space-y-2.5" : "space-y-3")}>
          {items.map((item) => (
            <div key={item.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.category}</span>
                  <span className="text-muted-foreground text-xs">{item.count}件</span>
                </div>
                <div className="flex items-center gap-2 tabular-nums">
                  <span className="font-semibold">{formatYen(item.total)}</span>
                  <span className="text-muted-foreground w-10 text-right text-xs">
                    {item.ratio}%
                  </span>
                </div>
              </div>
              <Progress value={item.ratio} className="h-2" />
            </div>
          ))}
        </div>
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
