import type { ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import { isContainerComponent } from "@/features/dashboard/lib/a2ui-builder";
import { getComponentDisplayParts } from "@/features/dashboard/lib/catalog-registry";
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
    editor.onSelect(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
    }
  };

  return (
    <DndContext
      id="a2ui-canvas-dnd"
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="space-y-4"
        onClick={() => {
          editor.onSelect(null);
        }}
      >
        {children}

        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            editor.onRequestAdd(rootId);
          }}
          className="text-muted-foreground hover:text-foreground h-11 w-full border-dashed"
        >
          <Plus className="size-4" />
          ブロックを追加
        </Button>
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
  onRequestAdd,
}: {
  containerId: string;
  onRequestAdd: () => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${EMPTY_CONTAINER_DROP_PREFIX}${containerId}`,
  });

  return (
    <div ref={setNodeRef} className="col-span-full">
      <Button
        type="button"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onRequestAdd();
        }}
        className={cn(
          "min-h-20 w-full border-dashed",
          isOver ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground",
        )}
      >
        <Plus className="size-4" />
        ブロックを追加
      </Button>
    </div>
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
  const display = getComponentDisplayParts(node, dataModel);

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
      {/* Floating block chip: border matches selection ring, whole label area acts as drag grip */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "bg-background/95 text-foreground absolute -top-4 left-2.5 z-20 flex h-8 max-w-[calc(100%-1.25rem)] items-center rounded-lg border px-1 shadow-sm backdrop-blur-xs transition-opacity",
          isSelected
            ? "border-primary opacity-100"
            : "pointer-events-none opacity-0 group-hover/a2ui-node:pointer-events-auto group-hover/a2ui-node:opacity-100",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={() => editor.onSelect(node.id)}
          aria-label={`${display.primary}を選択・移動`}
          className="group/chip-handle flex h-full min-w-0 cursor-grab items-center gap-1.5 pr-2 pl-0.5 text-xs select-none active:cursor-grabbing"
        >
          <span className="text-muted-foreground group-hover/chip-handle:bg-accent group-hover/chip-handle:text-accent-foreground flex size-6 shrink-0 items-center justify-center rounded-md transition-colors">
            <GripVertical className="size-4" />
          </span>
          <span className="text-foreground max-w-44 truncate font-medium">{display.primary}</span>
          {display.secondary && (
            <span className="text-muted-foreground shrink-0">{display.secondary}</span>
          )}
        </button>

        {isSelected && (
          <div className="flex items-center gap-0.5 border-l pl-1">
            {isContainerComponent(node) && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-primary hover:text-primary size-7"
                title="ブロックを追加"
                aria-label="ブロックを追加"
                onClick={() => editor.onRequestAdd(node.id)}
              >
                <Plus className="size-3.5" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!canMoveUp}
              title="前へ移動"
              aria-label="前へ移動"
              onClick={() => editor.onMoveRelative(node.id, "up")}
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!canMoveDown}
              title="次へ移動"
              aria-label="次へ移動"
              onClick={() => editor.onMoveRelative(node.id, "down")}
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
              onClick={() => editor.onDuplicate(node.id)}
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
              onClick={() => editor.onDelete(node.id)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
