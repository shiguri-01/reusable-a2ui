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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isContainerComponent, type EditableSurfaceGraph } from "../lib/a2ui-builder";
import { COMPONENT_META, getComponentDisplayParts } from "../lib/catalog-registry";

const OUTLINE_EMPTY_CONTAINER_DROP_PREFIX = "outline-container-drop:";

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

    if (overId.startsWith(OUTLINE_EMPTY_CONTAINER_DROP_PREFIX)) {
      const targetContainerId = overId.slice(OUTLINE_EMPTY_CONTAINER_DROP_PREFIX.length);
      onMove(activeId, targetContainerId, 0);
      return;
    }

    const overParentId = graph.parentById.get(overId);
    if (!overParentId) return;

    const overParent = graph.componentsById.get(overParentId);
    if (!overParent || !isContainerComponent(overParent)) return;

    const targetIndex = overParent.children.indexOf(overId);
    if (targetIndex !== -1) {
      onMove(activeId, overParentId, targetIndex);
    }
  };

  const rootNode = graph.componentsById.get(graph.rootId);
  if (!rootNode || !isContainerComponent(rootNode)) return null;

  const renderSubtree = (nodeId: string): ReactNode => {
    const node = graph.componentsById.get(nodeId);
    if (!node) return null;

    const container = isContainerComponent(node);
    const isCollapsed = Boolean(collapsedIds[node.id]);

    return (
      <SortableTreeRow
        key={node.id}
        node={node}
        dataModel={dataModel}
        isSelected={selectedId === node.id}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => toggleCollapsed(node.id)}
        onSelect={() => onSelect(node.id)}
        onDelete={() => onDelete(node.id)}
        onRequestAdd={() => onRequestAdd(node.id)}
      >
        {container && !isCollapsed && (
          <div className="border-border ml-4 space-y-0.5 border-l pt-0.5 pl-2">
            {node.children.length > 0 ? (
              <SortableContext items={node.children} strategy={verticalListSortingStrategy}>
                {node.children.map(renderSubtree)}
              </SortableContext>
            ) : (
              <EmptyOutlineDropzone containerId={node.id} />
            )}
          </div>
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
      <div className="space-y-0.5">
        <div
          onClick={() => onSelect(rootNode.id)}
          className={cn(
            "flex min-h-9 cursor-pointer items-center justify-between gap-1.5 rounded-md px-2 py-1 text-sm transition-colors",
            selectedId === rootNode.id
              ? "bg-accent text-accent-foreground font-medium"
              : "hover:bg-muted/70 text-foreground",
          )}
        >
          <span className="truncate font-medium">ページ全体</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            title="ブロックを追加"
            aria-label="ブロックを追加"
            onClick={(e) => {
              e.stopPropagation();
              onRequestAdd(rootNode.id);
            }}
          >
            <Plus className="size-4" />
          </Button>
        </div>

        {rootNode.children.length === 0 ? (
          <EmptyOutlineDropzone containerId={rootNode.id} label="まだブロックがありません" />
        ) : (
          <SortableContext items={rootNode.children} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">{rootNode.children.map(renderSubtree)}</div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
}

function EmptyOutlineDropzone({
  containerId,
  label = "空の枠（ドロップ可能）",
}: {
  containerId: string;
  label?: string;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${OUTLINE_EMPTY_CONTAINER_DROP_PREFIX}${containerId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors",
        isOver
          ? "border-primary bg-primary/10 text-primary"
          : "text-muted-foreground border-transparent",
      )}
    >
      {label}
    </div>
  );
}

interface SortableTreeRowProps {
  node: A2UIComponent;
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

  const { icon: Icon } = COMPONENT_META[node.component];
  const display = getComponentDisplayParts(node, dataModel);
  const isContainer = isContainerComponent(node);
  const hasChildren = isContainer && node.children.length > 0;

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
          "group/tree-row flex min-h-9 cursor-pointer items-center justify-between gap-1 rounded-md px-1 py-1 text-sm transition-colors",
          isSelected
            ? "bg-accent text-accent-foreground font-medium"
            : "hover:bg-muted/70 text-foreground",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-label={`${display.primary}を移動`}
            className="text-muted-foreground hover:text-foreground size-7 shrink-0 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </Button>

          {isContainer ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={!hasChildren}
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) onToggleCollapse();
              }}
              className="text-muted-foreground size-6 shrink-0 disabled:opacity-30"
              aria-label={isCollapsed ? "展開" : "折りたたむ"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </Button>
          ) : (
            <span className="size-6 shrink-0" />
          )}

          <Icon className="text-muted-foreground size-4 shrink-0" />
          <span className="text-foreground truncate font-medium">{display.primary}</span>
          {display.secondary && (
            <span className="text-muted-foreground shrink-0 font-normal">{display.secondary}</span>
          )}
        </div>

        <div
          className={cn(
            "flex shrink-0 items-center gap-0.5 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover/tree-row:opacity-100",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {isContainer && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              title="ブロックを追加"
              aria-label="ブロックを追加"
              onClick={onRequestAdd}
            >
              <Plus className="size-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7"
            title="削除"
            aria-label="削除"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {children}
    </div>
  );
}
