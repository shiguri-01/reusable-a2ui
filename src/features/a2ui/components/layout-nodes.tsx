import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { resolveValue } from "../data-model";
import type { A2UIComponent } from "../types";
import { SortableCanvasContainer } from "./canvas-editor-chrome";
import type { A2UIRenderContext } from "./render-context";

type LayoutNode = Extract<
  A2UIComponent,
  { component: "Column" | "Row" | "Grid" | "Card" | "Divider" }
>;

const ROW_ALIGN_CLASS = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
} as const;

const ROW_JUSTIFY_CLASS = {
  start: "justify-start",
  between: "justify-between",
  end: "justify-end",
} as const;

export function renderLayoutNode(
  node: LayoutNode,
  depth: number,
  ctx: A2UIRenderContext,
): ReactNode {
  const { mergedModel, compact, gapMap, gridMap, renderNode, editor } = ctx;

  switch (node.component) {
    case "Column": {
      return (
        <div key={node.id} className={cn("flex flex-col", gapMap[node.gap ?? "md"])}>
          <SortableCanvasContainer containerNode={node} editor={editor}>
            {node.children.map((childId) => renderNode(childId, depth + 1, node))}
          </SortableCanvasContainer>
        </div>
      );
    }

    case "Row": {
      return (
        <div
          key={node.id}
          className={cn(
            "flex",
            gapMap[node.gap ?? "md"],
            ROW_ALIGN_CLASS[node.align ?? "start"],
            ROW_JUSTIFY_CLASS[node.justify ?? "start"],
            node.wrap || compact ? "flex-wrap" : "flex-col sm:flex-row",
          )}
        >
          <SortableCanvasContainer containerNode={node} editor={editor}>
            {node.children.map((childId) => renderNode(childId, depth + 1, node))}
          </SortableCanvasContainer>
        </div>
      );
    }

    case "Grid": {
      return (
        <div
          key={node.id}
          className={cn("grid", gridMap[node.columns ?? 2], gapMap[node.gap ?? "md"])}
        >
          <SortableCanvasContainer containerNode={node} editor={editor}>
            {node.children.map((childId) => renderNode(childId, depth + 1, node))}
          </SortableCanvasContainer>
        </div>
      );
    }

    case "Card": {
      const title = resolveValue(mergedModel, node.title);
      const description = resolveValue(mergedModel, node.description);
      return (
        <Card key={node.id} className={cn(compact && "gap-3 py-3.5 shadow-none")}>
          {(title || description) && (
            <CardHeader className={cn(compact && "px-3.5")}>
              {title && (
                <CardTitle className={cn(compact ? "text-sm" : "text-base")}>{title}</CardTitle>
              )}
              {description && (
                <CardDescription className={cn(compact && "text-xs")}>
                  {description}
                </CardDescription>
              )}
            </CardHeader>
          )}
          <CardContent className={cn("flex flex-col", compact ? "gap-3 px-3.5" : "gap-4")}>
            <SortableCanvasContainer containerNode={node} editor={editor}>
              {node.children.map((childId) => renderNode(childId, depth + 1, node))}
            </SortableCanvasContainer>
          </CardContent>
        </Card>
      );
    }

    case "Divider": {
      return <Separator key={node.id} />;
    }
  }
}
