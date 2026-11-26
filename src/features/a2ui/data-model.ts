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

function splitPath(path: string): string[] {
  return path
    .replace(/^\/+/, "")
    .split("/")
    .filter((segment) => segment.length > 0);
}

export function getByPath(model: DataModel, path: string): unknown {
  const segments = splitPath(path);
  let current: unknown = model;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
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

export function setByPath(model: DataModel, path: string, value: unknown): DataModel {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return typeof value === "object" && value !== null ? (value as DataModel) : model;
  }

  const clone: DataModel = { ...model };
  let cursor: Record<string, unknown> = clone;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    const existing = cursor[key];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[key] = next;
    cursor = next;
  }

  cursor[segments[segments.length - 1]!] = value;
  return clone;
}

export function deleteByPath(model: DataModel, path: string): DataModel {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return {};
  }

  const clone: DataModel = { ...model };
  let cursor: Record<string, unknown> = clone;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]!;
    const existing = cursor[key];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      return clone;
    }
    const next = { ...(existing as Record<string, unknown>) };
    cursor[key] = next;
    cursor = next;
  }

  delete cursor[segments[segments.length - 1]!];
  return clone;
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
      for (const comp of message.updateComponents.components) {
        componentsById.set(comp.id, comp);
      }
    } else if ("updateDataModel" in message) {
      const { path, value } = message.updateDataModel;
      if (path && path !== "/") {
        initialDataModel =
          value === null
            ? deleteByPath(initialDataModel, path)
            : setByPath(initialDataModel, path, value);
      } else if (value === null) {
        initialDataModel = {};
      } else if (typeof value === "object") {
        initialDataModel = {
          ...initialDataModel,
          ...(value as DataModel),
        };
      }
    } else if ("deleteSurface" in message) {
      if (message.deleteSurface.surfaceId === surfaceId) {
        return null;
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
