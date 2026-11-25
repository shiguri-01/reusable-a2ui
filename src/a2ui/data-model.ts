import type { A2UIComponent, A2UIMessage, BoundValue } from "./types";

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

export function setByPath(model: DataModel, path: string, value: unknown): DataModel {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return typeof value === "object" && value !== null ? (value as DataModel) : model;
  }

  const clone: DataModel = { ...model };
  let cursor: Record<string, unknown> = clone;

  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    const existing = cursor[key];
    const next =
      existing && typeof existing === "object" && !Array.isArray(existing)
        ? { ...(existing as Record<string, unknown>) }
        : {};
    cursor[key] = next;
    cursor = next;
  }

  cursor[segments[segments.length - 1]] = value;
  return clone;
}

export function resolveValue<T>(model: DataModel, bound: BoundValue<T> | undefined): T | undefined {
  if (bound === undefined) return undefined;
  if (typeof bound === "object" && bound !== null && "@path" in bound) {
    return getByPath(model, bound["@path"]) as T | undefined;
  }
  return bound;
}

export function buildSurfaceState(messages: A2UIMessage[]): SurfaceState | null {
  let surfaceId = "";
  let catalogId = "";
  let rootId = "";
  const componentsById = new Map<string, A2UIComponent>();
  let initialDataModel: DataModel = {};

  for (const message of messages) {
    if ("createSurface" in message) {
      surfaceId = message.createSurface.surfaceId;
      catalogId = message.createSurface.catalogId;
      rootId = message.createSurface.rootId;
      componentsById.clear();
    } else if ("updateComponents" in message) {
      for (const comp of message.updateComponents.components) {
        componentsById.set(comp.id, comp);
      }
    } else if ("updateDataModel" in message) {
      if (message.updateDataModel.path) {
        initialDataModel = setByPath(
          initialDataModel,
          message.updateDataModel.path,
          message.updateDataModel.value,
        );
      } else if (
        typeof message.updateDataModel.value === "object" &&
        message.updateDataModel.value !== null
      ) {
        initialDataModel = {
          ...initialDataModel,
          ...(message.updateDataModel.value as DataModel),
        };
      }
    } else if ("deleteSurface" in message) {
      if (message.deleteSurface.surfaceId === surfaceId) {
        return null;
      }
    }
  }

  if (!surfaceId || !rootId) return null;

  return {
    surfaceId,
    catalogId,
    rootId,
    componentsById,
    initialDataModel,
  };
}
