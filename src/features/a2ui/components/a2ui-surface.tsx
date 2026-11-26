import { useId, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { buildSurfaceState, setByPath, type DataModel } from "../data-model";
import type { A2UIAction, A2UIComponent, A2UIMessage } from "../types";
import { renderDisplayNode } from "./display-nodes";
import { renderExpenseNode } from "./expense-nodes";
import { renderFormNode } from "./form-nodes";
import { renderLayoutNode } from "./layout-nodes";
import {
  COMPACT_GAP_CLASS,
  COMPACT_GRID_COLS_CLASS,
  GAP_CLASS,
  GRID_COLS_CLASS,
  type A2UIRenderContext,
} from "./render-context";

interface A2UISurfaceProps {
  messages: A2UIMessage[];
  dataModel: DataModel;
  onDataModelChange: (next: DataModel) => void;
  onAction: (action: A2UIAction) => void;
  pending?: boolean;
  compact?: boolean;
}

export function A2UISurface({
  messages,
  dataModel,
  onDataModelChange,
  onAction,
  pending = false,
  compact = false,
}: A2UISurfaceProps) {
  const idPrefix = useId();
  const surface = buildSurfaceState(messages);

  if (!surface) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center text-sm">
          有効な A2UI Surface 定義が見つかりませんでした。
        </CardContent>
      </Card>
    );
  }

  const mergedModel: DataModel = {
    ...surface.initialDataModel,
    ...dataModel,
  };

  const renderComponent = (node: A2UIComponent, depth: number): ReactNode => {
    switch (node.component) {
      case "Column":
      case "Row":
      case "Grid":
      case "Card":
      case "Divider":
        return renderLayoutNode(node, depth, ctx);
      case "Text":
      case "Badge":
      case "MetricCard":
      case "ProgressBar":
      case "KeyValueList":
      case "Alert":
        return renderDisplayNode(node, ctx);
      case "FilterChips":
      case "TextField":
      case "NumberField":
      case "DateField":
      case "SelectField":
      case "Button":
        return renderFormNode(node, ctx);
      case "CategoryBreakdown":
      case "ExpenseList":
        return renderExpenseNode(node, ctx);
    }
  };

  const renderNode = (id: string, depth = 0): ReactNode => {
    if (depth > 20) return null;
    const node = surface.componentsById.get(id);
    if (!node) {
      return (
        <div
          key={id}
          className="text-destructive border-destructive/40 rounded-md border border-dashed px-3 py-2 text-xs"
        >
          Missing component: <code>{id}</code>
        </div>
      );
    }
    return renderComponent(node, depth);
  };

  const ctx: A2UIRenderContext = {
    idPrefix,
    mergedModel,
    pending,
    compact,
    gapMap: compact ? COMPACT_GAP_CLASS : GAP_CLASS,
    gridMap: compact ? COMPACT_GRID_COLS_CLASS : GRID_COLS_CLASS,
    updatePath: (path, value) => onDataModelChange(setByPath(mergedModel, path, value)),
    onAction,
    renderNode,
  };

  return (
    <div data-a2ui-surface={surface.surfaceId} data-a2ui-catalog={surface.catalogId}>
      {renderNode(surface.rootId)}
    </div>
  );
}
