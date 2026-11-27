import {
  A2UI_ROOT_ID,
  EXPENSE_CATALOG_ID,
  type A2UIComponent,
  type A2UIMessage,
  type BoundValue,
} from "./types";

export type DataModel = Record<string, unknown>;

export interface SurfaceState {
  surfaceId: string;
  catalogId: string;
  rootId: string;
  componentsById: Map<string, A2UIComponent>;
  initialDataModel: DataModel;
}

function splitPath(path: string): string[] | undefined {
  if (/~(?![01])/.test(path)) return undefined;
  if (path === "" || path === "/") return [];
  return path
    .replace(/^\//, "")
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function getArrayIndex(key: string): number {
  return /^(0|[1-9]\d*)$/.test(key) ? Number(key) : -1;
}

function isDataObject(value: unknown): value is DataModel {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getByPath(model: DataModel, path: string): unknown {
  const segments = splitPath(path);
  if (!segments) return undefined;
  let current: unknown = model;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = getArrayIndex(segment);
      if (index < 0 || index >= current.length) return undefined;
      current = current[index];
    } else if (isDataObject(current) && Object.hasOwn(current, segment)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

export function toPrimitiveString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
}

function updateByPath(model: DataModel, path: string, value: unknown, remove: boolean): DataModel {
  const segments = splitPath(path);
  if (!segments) return model;
  if (segments.length === 0) {
    if (remove) return {};
    return isDataObject(value) ? value : model;
  }

  const update = (parent: unknown, depth: number): unknown => {
    const key = segments[depth]!;
    const isLeaf = depth === segments.length - 1;
    if (Array.isArray(parent)) {
      const index = getArrayIndex(key);
      if (index < 0 || index > parent.length || (remove && index === parent.length)) {
        return parent;
      }
      const next: unknown[] = [...parent];
      if (isLeaf && remove) next.splice(index, 1);
      else next[index] = isLeaf ? value : update(parent[index], depth + 1);
      return next;
    }

    const record = isDataObject(parent) ? parent : {};
    const hasKey = Object.hasOwn(record, key);
    if (remove && !hasKey) return parent;
    if (isLeaf && remove) {
      const next = { ...record };
      delete next[key];
      return next;
    }
    const child = hasKey ? record[key] : undefined;
    return { ...record, [key]: isLeaf ? value : update(child, depth + 1) };
  };

  return update(model, 0) as DataModel;
}

export function setByPath(model: DataModel, path: string, value: unknown): DataModel {
  return updateByPath(model, path, value, false);
}

export function resolveValue<T>(model: DataModel, bound: BoundValue<T> | undefined): T | undefined {
  if (bound === undefined) return undefined;
  if (typeof bound === "object" && bound !== null && "@path" in bound) {
    return getByPath(model, bound["@path"]) as T | undefined;
  }
  return bound;
}

export function resolveContextRecord(
  model: DataModel,
  context: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!context) return {};
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "@path" in value &&
      typeof (value as { "@path"?: unknown })["@path"] === "string"
    ) {
      resolved[key] = getByPath(model, (value as { "@path": string })["@path"]);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export function buildSurfaceState(messages: A2UIMessage[]): SurfaceState | null {
  let surfaceId = "";
  let catalogId = EXPENSE_CATALOG_ID;
  const componentsById = new Map<string, A2UIComponent>();
  let initialDataModel: DataModel = {};

  for (const message of messages) {
    if ("createSurface" in message) {
      if (surfaceId) return null;
      surfaceId = message.createSurface.surfaceId;
      catalogId = message.createSurface.catalogId ?? EXPENSE_CATALOG_ID;
      componentsById.clear();
      initialDataModel = message.createSurface.dataModel
        ? { ...message.createSurface.dataModel }
        : {};
      if (message.createSurface.components) {
        for (const comp of message.createSurface.components) {
          componentsById.set(comp.id, comp);
        }
      }
    } else if ("updateComponents" in message) {
      if (!surfaceId || message.updateComponents.surfaceId !== surfaceId) continue;
      for (const comp of message.updateComponents.components) {
        componentsById.set(comp.id, comp);
      }
    } else if ("updateDataModel" in message) {
      if (!surfaceId || message.updateDataModel.surfaceId !== surfaceId) continue;
      const { path, value } = message.updateDataModel;
      initialDataModel = updateByPath(initialDataModel, path ?? "/", value, value === null);
    } else if ("deleteSurface" in message) {
      if (message.deleteSurface.surfaceId === surfaceId) {
        surfaceId = "";
        componentsById.clear();
        initialDataModel = {};
      }
    }
  }

  if (!surfaceId || !componentsById.has(A2UI_ROOT_ID)) return null;

  return {
    surfaceId,
    catalogId,
    rootId: A2UI_ROOT_ID,
    componentsById,
    initialDataModel,
  };
}
