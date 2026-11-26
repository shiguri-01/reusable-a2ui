import { useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIComponent } from "@/features/a2ui/types";
import { cn } from "@/lib/utils";
import { isContainerComponent, type EditableSurfaceGraph } from "../lib/a2ui-builder";
import { COMPONENT_META, summarizeComponent } from "../lib/catalog-registry";

interface StructureOutlineProps {
  graph: EditableSurfaceGraph;
  dataModel: DataModel;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (activeId: string, targetParentId: string, targetIndex?: number) => void;
  onDelete: (id: string) => void;
  onRequestAdd: (parentId: string) => void;
}

export function StructureOutline({
  graph,
  dataModel,
  selectedId,
  onSelect,
  onMove,
  onDelete,
  onRequestAdd,
}: StructureOutlineProps) {
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const toggleCollapsed = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const overParentId = graph.parentById.get(overId);
    if (overParentId) {
      const overParent = graph.componentsById.get(overParentId);
      if (overParent && isContainerComponent(overParent)) {
        const targetIndex = overParent.children.indexOf(overId);
        if (targetIndex !== -1) {
          onMove(activeId, overParentId, targetIndex);
          return;
        }
      }
    }

    const overNode = graph.componentsById.get(overId);
    if (overNode && isContainerComponent(overNode)) {
      onMove(activeId, overNode.id, overNode.children.length);
    }
  };

  const rootNode = graph.componentsById.get(graph.rootId);
  if (!rootNode || !isContainerComponent(rootNode)) return null;

  const renderSubtree = (nodeId: string, depth: number): ReactNode => {
    const node = graph.componentsById.get(nodeId);
    if (!node) return null;

    const container = isContainerComponent(node);
    const isCollapsed = Boolean(collapsedIds[node.id]);

    return (
      <SortableTreeRow
        key={node.id}
        node={node}
        depth={depth}
        dataModel={dataModel}
        isSelected={selectedId === node.id}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => toggleCollapsed(node.id)}
        onSelect={() => onSelect(node.id)}
        onDelete={() => onDelete(node.id)}
        onRequestAdd={() => onRequestAdd(node.id)}
      >
        {container && !isCollapsed && node.children.length > 0 && (
          <SortableContext items={node.children} strategy={verticalListSortingStrategy}>
            <div className="border-border/70 ml-3.5 space-y-0.5 border-l pl-2 pt-0.5">
              {node.children.map((childId) => renderSubtree(childId, depth + 1))}
            </div>
          </SortableContext>
        )}
      </SortableTreeRow>
    );
  };

  return (
    <DndContext
      id="a2ui-outline-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-1">
        {/* Root row */}
        <div
          onClick={() => onSelect(rootNode.id)}
          className={cn(
            "flex cursor-pointer items-center justify-between gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
            selectedId === rootNode.id
              ? "bg-primary/10 text-primary font-semibold"
              : "hover:bg-muted/70 text-foreground font-medium",
          )}
        >
          <span className="truncate">ページ全体 (root · {rootNode.children.length}セクション)</span>
          <button
            type="button"
            title="セクションを追加"
            aria-label="セクションを追加"
            onClick={(e) => {
              e.stopPropagation();
              onRequestAdd(rootNode.id);
            }}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded-xs p-0.5"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {rootNode.children.length === 0 ? (
          <div className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-xs">
            まだパーツがありません。「＋ パーツを追加」から作成できます。
          </div>
        ) : (
          <SortableContext items={rootNode.children} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {rootNode.children.map((childId) => renderSubtree(childId, 0))}
            </div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
}

interface SortableTreeRowProps {
  node: A2UIComponent;
  depth: number;
  dataModel: DataModel;
  isSelected: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onRequestAdd: () => void;
  children?: ReactNode;
}

function SortableTreeRow({
  node,
  dataModel,
  isSelected,
  isCollapsed,
  onToggleCollapse,
  onSelect,
  onDelete,
  onRequestAdd,
  children,
}: SortableTreeRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const meta = COMPONENT_META[node.component];
  const Icon = meta.icon;
  const summary = summarizeComponent(node, dataModel);
  const hasChildren = isContainerComponent(node) && node.children.length > 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      className={cn(isDragging && "z-20 opacity-50")}
    >
      <div
        onClick={onSelect}
        className={cn(
          "group/tree-row flex cursor-pointer items-center justify-between gap-1 rounded-md px-1.5 py-1 text-xs transition-colors",
          isSelected
            ? "bg-primary/12 text-primary font-medium"
            : "hover:bg-muted/70 text-foreground",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label="ドラッグして並び替え"
            className="text-muted-foreground/70 hover:text-foreground cursor-grab rounded-xs p-0.5 active:cursor-grabbing"
          >
            <GripVertical className="size-3" />
          </button>

          {meta.isContainer ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) onToggleCollapse();
              }}
              className={cn(
                "text-muted-foreground flex size-4 shrink-0 items-center justify-center rounded-xs",
                hasChildren ? "hover:text-foreground cursor-pointer" : "opacity-30",
              )}
              aria-label={isCollapsed ? "展開" : "折りたたむ"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3" />
              ) : (
                <ChevronDown className="size-3" />
              )}
            </button>
          ) : (
            <span className="size-4 shrink-0" />
          )}

          <Icon className="text-muted-foreground size-3.5 shrink-0" />
          <span className="shrink-0">{meta.shortLabel}</span>
          {summary && (
            <span className="text-muted-foreground truncate text-[11px] font-normal">
              · {summary}
            </span>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover/tree-row:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {meta.isContainer && (
            <button
              type="button"
              title="この中にパーツを追加"
              aria-label="この中にパーツを追加"
              onClick={onRequestAdd}
              className="text-muted-foreground hover:text-primary hover:bg-primary/10 cursor-pointer rounded-xs p-0.5"
            >
              <Plus className="size-3" />
            </button>
          )}
          <button
            type="button"
            title="削除"
            aria-label="削除"
            onClick={onDelete}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-xs p-0.5"
          >
            <Trash2 className="size-3" />
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
