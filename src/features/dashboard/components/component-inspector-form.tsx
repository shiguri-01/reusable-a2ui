import { Fragment } from "react";
import { ArrowDown, ArrowUp, Copy, Plus, Slash, Trash2 } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIComponent } from "@/features/a2ui/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getComponentAncestors,
  isContainerComponent,
  type EditableSurfaceGraph,
} from "../lib/a2ui-builder";
import { COMPONENT_META, getComponentDisplayParts } from "../lib/catalog-registry";
import { DisplayInspectorFields } from "./inspector/display-inspector-fields";
import { ExpenseInspectorFields } from "./inspector/expense-inspector-fields";
import { FormInspectorFields } from "./inspector/form-inspector-fields";
import { LayoutInspectorFields } from "./inspector/layout-inspector-fields";

interface ComponentInspectorProps {
  node: A2UIComponent;
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  onSelectNode: (id: string | null) => void;
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void;
  onMoveRelative: (nodeId: string, direction: "up" | "down") => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRequestAddChild: (parentId: string) => void;
}

function renderInspectorFields(
  node: A2UIComponent,
  dataModel: DataModel,
  onUpdateNode: (nodeId: string, next: A2UIComponent) => void,
) {
  switch (node.component) {
    case "Column":
    case "Row":
    case "Grid":
    case "Card":
      return (
        <LayoutInspectorFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />
      );
    case "Divider":
      return null;
    case "Text":
    case "Badge":
    case "MetricCard":
    case "ProgressBar":
    case "Alert":
    case "KeyValueList":
      return (
        <DisplayInspectorFields node={node} dataModel={dataModel} onUpdateNode={onUpdateNode} />
      );
    case "CategoryBreakdown":
    case "ExpenseList":
      return <ExpenseInspectorFields node={node} onUpdateNode={onUpdateNode} />;
    case "FilterChips":
    case "TextField":
    case "NumberField":
    case "DateField":
    case "SelectField":
    case "Button":
      return <FormInspectorFields node={node} onUpdateNode={onUpdateNode} />;
  }
}

export function ComponentInspector({
  node,
  graph,
  dataModel,
  onSelectNode,
  onUpdateNode,
  onMoveRelative,
  onDuplicate,
  onDelete,
  onRequestAddChild,
}: ComponentInspectorProps) {
  const isRoot = node.id === graph.rootId;
  const { icon: Icon } = COMPONENT_META[node.component];
  const display = getComponentDisplayParts(node, dataModel);
  const ancestors = getComponentAncestors(graph, node.id);
  const currentParentId = graph.parentById.get(node.id);
  const currentParent = currentParentId ? graph.componentsById.get(currentParentId) : undefined;

  const siblingIndex =
    currentParent && isContainerComponent(currentParent)
      ? currentParent.children.indexOf(node.id)
      : -1;
  const siblingCount =
    currentParent && isContainerComponent(currentParent) ? currentParent.children.length : 0;

  const fields = renderInspectorFields(node, dataModel, onUpdateNode);

  return (
    <div className="space-y-3.5">
      {/* Breadcrumb navigation */}
      {ancestors.length > 1 && (
        <div className="flex min-w-0 flex-wrap items-center gap-0.5 text-xs">
          {ancestors.map((anc, idx) => {
            const isLast = idx === ancestors.length - 1;
            const ancLabel =
              anc.id === graph.rootId
                ? "ページ全体"
                : getComponentDisplayParts(anc, dataModel).primary;
            return (
              <Fragment key={anc.id}>
                {idx > 0 && (
                  <Slash aria-hidden="true" className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectNode(anc.id)}
                  className={cn(
                    "h-6 max-w-36 truncate px-1.5 text-xs",
                    isLast ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                >
                  <span className="truncate">{ancLabel}</span>
                </Button>
              </Fragment>
            );
          })}
        </div>
      )}

      {/* Selected Header & Quick Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">
              {isRoot ? "ページ全体" : display.primary}
            </div>
            {!isRoot && display.secondary && (
              <div className="text-muted-foreground truncate text-xs">{display.secondary}</div>
            )}
          </div>
        </div>

        {!isRoot && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={siblingIndex <= 0}
              title="上へ移動"
              aria-label="上へ移動"
              onClick={() => onMoveRelative(node.id, "up")}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={siblingIndex < 0 || siblingIndex >= siblingCount - 1}
              title="下へ移動"
              aria-label="下へ移動"
              onClick={() => onMoveRelative(node.id, "down")}
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="複製"
              aria-label="複製"
              onClick={() => onDuplicate(node.id)}
            >
              <Copy className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-7"
              title="削除"
              aria-label="削除"
              onClick={() => onDelete(node.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {isContainerComponent(node) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => onRequestAddChild(node.id)}
        >
          <Plus className="size-3.5" />
          中にブロックを追加
        </Button>
      )}

      {fields && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-3.5"
        >
          {fields}
        </form>
      )}
    </div>
  );
}
