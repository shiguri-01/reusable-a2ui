import { useState, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, GripVertical, Plus, Trash2 } from "lucide-react";
import { COMPONENT_META, summarizeComponent } from "@/features/dashboard/lib/catalog-registry";
import { isContainerComponent } from "@/features/dashboard/lib/a2ui-builder";
import { cn } from "@/lib/utils";
import type { DataModel } from "../data-model";
import type { A2UIComponent } from "../types";
import type { A2UISurfaceEditorProps } from "./render-context";

const EMPTY_CONTAINER_DROP_PREFIX = "container-drop:";

interface A2UIEditableSurfaceRootProps {
  rootId: string;
  componentsById: Map<string, A2UIComponent>;
  editor: A2UISurfaceEditorProps;
  children: ReactNode;
}

export function A2UIEditableSurfaceRoot({
  rootId,
  componentsById,
  editor,
  children,
}: A2UIEditableSurfaceRootProps) {
  const [, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findParentAndIndex = (childId: string): { parentId: string; index: number } | null => {
    for (const comp of componentsById.values()) {
      if (isContainerComponent(comp)) {
        const idx = comp.children.indexOf(childId);
        if (idx !== -1) {
          return { parentId: comp.id, index: idx };
        }
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveDragId(id);
    editor.onSelect(id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId || activeId === rootId) return;

    if (overId.startsWith(EMPTY_CONTAINER_DROP_PREFIX)) {
      const targetContainerId = overId.slice(EMPTY_CONTAINER_DROP_PREFIX.length);
      editor.onMove(activeId, targetContainerId, 0);
      return;
    }

    const overPlacement = findParentAndIndex(overId);
    if (overPlacement) {
      editor.onMove(activeId, overPlacement.parentId, overPlacement.index);
      return;
    }

    const overNode = componentsById.get(overId);
    if (overNode && isContainerComponent(overNode)) {
      editor.onMove(activeId, overNode.id, overNode.children.length);
    }
  };

  return (
    <DndContext
      id="a2ui-canvas-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDragId(null)}
    >
      <div
        className="space-y-3"
        onClick={() => {
          editor.onSelect(null);
        }}
      >
        {children}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            editor.onRequestAdd(rootId);
          }}
          className="border-primary/35 text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed py-3 text-xs font-medium transition-colors"
        >
          <Plus className="size-3.5" />
          セクション・パーツを末尾に追加
        </button>
      </div>
    </DndContext>
  );
}

interface SortableCanvasContainerProps {
  containerNode: Extract<A2UIComponent, { component: "Column" | "Row" | "Grid" | "Card" }>;
  editor?: A2UISurfaceEditorProps;
  children: ReactNode;
}

export function SortableCanvasContainer({
  containerNode,
  editor,
  children,
}: SortableCanvasContainerProps) {
  if (!editor) {
    return <>{children}</>;
  }

  return (
    <SortableContext items={containerNode.children} strategy={rectSortingStrategy}>
      {containerNode.children.length === 0 ? (
        <EmptyContainerDropzone
          containerId={containerNode.id}
          label={COMPONENT_META[containerNode.component].shortLabel}
          onRequestAdd={() => editor.onRequestAdd(containerNode.id)}
        />
      ) : (
        children
      )}
    </SortableContext>
  );
}

function EmptyContainerDropzone({
  containerId,
  label,
  onRequestAdd,
}: {
  containerId: string;
  label: string;
  onRequestAdd: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${EMPTY_CONTAINER_DROP_PREFIX}${containerId}`,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRequestAdd();
      }}
      className={cn(
        "col-span-full flex min-h-20 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-4 text-xs font-medium transition-colors",
        isOver
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/60 hover:text-foreground",
      )}
    >
      <Plus className="size-3.5" />
      <span>{label} 内にパーツを追加（またはここにドロップ）</span>
    </button>
  );
}

interface SortableCanvasItemProps {
  node: A2UIComponent;
  parent: A2UIComponent | undefined;
  dataModel: DataModel;
  editor: A2UISurfaceEditorProps;
  children: ReactNode;
}

function shouldFlexGrowInRow(node: A2UIComponent, parent: A2UIComponent | undefined): boolean {
  if (parent?.component !== "Row") return false;
  return (
    node.component === "TextField" ||
    node.component === "NumberField" ||
    node.component === "DateField" ||
    node.component === "SelectField" ||
    node.component === "Column" ||
    node.component === "Card"
  );
}

export function SortableCanvasItem({
  node,
  parent,
  dataModel,
  editor,
  children,
}: SortableCanvasItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: {
      parentId: parent?.id,
    },
  });

  const isSelected = editor.selectedId === node.id;
  const meta = COMPONENT_META[node.component];
  const Icon = meta.icon;
  const summary = summarizeComponent(node, dataModel);

  const siblingIndex =
    parent && isContainerComponent(parent) ? parent.children.indexOf(node.id) : -1;
  const siblingCount = parent && isContainerComponent(parent) ? parent.children.length : 0;
  const canMoveUp = siblingIndex > 0;
  const canMoveDown = siblingIndex >= 0 && siblingIndex < siblingCount - 1;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
      }}
      onClick={(e) => {
        e.stopPropagation();
        editor.onSelect(node.id);
      }}
      className={cn(
        "group/a2ui-node relative min-w-0 rounded-xl transition-shadow",
        shouldFlexGrowInRow(node, parent) && "flex-1",
        isDragging && "z-30 opacity-60 shadow-lg",
        isSelected
          ? "ring-primary ring-offset-background ring-2 ring-offset-2"
          : "hover:ring-primary/40 hover:ring-1 hover:ring-offset-1",
      )}
    >
      {/* Floating chrome pill: always visible when selected, subtle on hover */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-background/95 text-foreground absolute -top-3 left-2 z-20 flex max-w-[calc(100%-1rem)] items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[11px] shadow-xs backdrop-blur-xs transition-opacity",
          isSelected
            ? "border-primary/50 opacity-100"
            : "pointer-events-none opacity-0 group-hover/a2ui-node:pointer-events-auto group-hover/a2ui-node:opacity-100",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${meta.shortLabel} をドラッグして移動`}
          title="ドラッグして並び替え"
          className="text-muted-foreground hover:text-foreground flex cursor-grab items-center rounded-xs p-0.5 active:cursor-grabbing"
        >
          <GripVertical className="size-3" />
        </button>

        <button
          type="button"
          onClick={() => editor.onSelect(node.id)}
          className="flex min-w-0 cursor-pointer items-center gap-1 px-1 font-medium"
        >
          <Icon className="text-primary size-3 shrink-0" />
          <span className="shrink-0">{meta.shortLabel}</span>
          {summary && (
            <span className="text-muted-foreground max-w-28 truncate font-normal">· {summary}</span>
          )}
        </button>

        {isSelected && (
          <div className="ml-0.5 flex items-center gap-0.5 border-l pl-1">
            {meta.isContainer && (
              <button
                type="button"
                title="この中にパーツを追加"
                aria-label="この中にパーツを追加"
                onClick={() => editor.onRequestAdd(node.id)}
                className="text-primary hover:bg-primary/10 cursor-pointer rounded-xs p-0.5"
              >
                <Plus className="size-3" />
              </button>
            )}
            <button
              type="button"
              disabled={!canMoveUp}
              title="前へ移動"
              aria-label="前へ移動"
              onClick={() => editor.onMoveRelative(node.id, "up")}
              className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer rounded-xs p-0.5 disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowUp className="size-3" />
            </button>
            <button
              type="button"
              disabled={!canMoveDown}
              title="次へ移動"
              aria-label="次へ移動"
              onClick={() => editor.onMoveRelative(node.id, "down")}
              className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer rounded-xs p-0.5 disabled:pointer-events-none disabled:opacity-30"
            >
              <ArrowDown className="size-3" />
            </button>
            <button
              type="button"
              title="複製"
              aria-label="複製"
              onClick={() => editor.onDuplicate(node.id)}
              className="text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer rounded-xs p-0.5"
            >
              <Copy className="size-3" />
            </button>
            <button
              type="button"
              title="削除"
              aria-label="削除"
              onClick={() => editor.onDelete(node.id)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer rounded-xs p-0.5"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
