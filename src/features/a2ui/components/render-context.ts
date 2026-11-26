import type { ReactNode } from "react";
import type { DataModel } from "../data-model";
import type { A2UIAction, A2UIComponent } from "../types";

export const GAP_CLASS = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
} as const;

export const COMPACT_GAP_CLASS = {
  sm: "gap-1.5",
  md: "gap-2.5",
  lg: "gap-3.5",
} as const;

export const GRID_COLS_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export const COMPACT_GRID_COLS_CLASS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2",
  4: "grid-cols-2",
} as const;

export interface A2UISurfaceEditorProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (activeId: string, targetParentId: string, targetIndex?: number) => void;
  onMoveRelative: (nodeId: string, direction: "up" | "down") => void;
  onDuplicate: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onRequestAdd: (parentId: string) => void;
}

export interface A2UIRenderContext {
  surfaceId: string;
  idPrefix: string;
  mergedModel: DataModel;
  pending: boolean;
  compact: boolean;
  gapMap: Record<"sm" | "md" | "lg", string>;
  gridMap: Record<1 | 2 | 3 | 4, string>;
  updatePath: (path: string, value: unknown) => void;
  onAction: (action: A2UIAction) => void;
  renderNode: (id: string, depth: number, parent?: A2UIComponent) => ReactNode;
  editor?: A2UISurfaceEditorProps;
}
