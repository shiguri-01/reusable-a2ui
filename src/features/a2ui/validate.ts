import { A2UI_ROOT_ID, a2uiMessagesSchema, type A2UIComponent, type A2UIMessage } from "./types";

export type A2UIValidationResult =
  | { ok: true; messages: A2UIMessage[]; surfaceId: string }
  | { ok: false; error: string };

function findCycleNode(childrenById: Map<string, readonly string[]>): string | null {
  const state = new Map<string, "visiting" | "visited">();

  const visit = (id: string): string | null => {
    const current = state.get(id);
    if (current === "visiting") return id;
    if (current === "visited") return null;

    state.set(id, "visiting");
    const children = childrenById.get(id);
    if (children) {
      for (const childId of children) {
        const cycle = visit(childId);
        if (cycle) return cycle;
      }
    }
    state.set(id, "visited");
    return null;
  };

  for (const id of childrenById.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return null;
}

/**
 * Validates A2UI v1.0 messages for both schema conformance and graph integrity
 * (surfaceId lifecycle, unique component IDs, canonical "root" component existence,
 * children references, and acyclic component hierarchy).
 */
export function validateA2UISurfaceMessages(
  input: unknown,
  options?: { expectedSurfaceId?: string },
): A2UIValidationResult {
  const parsed = a2uiMessagesSchema.safeParse(input);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      ok: false,
      error: `A2UI スキーマ検証エラー（${firstIssue?.path.join(".") || "root"}：${firstIssue?.message ?? "不正な形式"}）`,
    };
  }

  let surfaceId = "";
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();
  const childrenById = new Map<string, readonly string[]>();

  const resetSurface = () => {
    ids.clear();
    duplicateIds.clear();
    childrenById.clear();
  };

  const collectComponents = (components: A2UIComponent[], allowReplace: boolean) => {
    for (const comp of components) {
      if (!allowReplace && ids.has(comp.id)) {
        duplicateIds.add(comp.id);
      }
      ids.add(comp.id);
      if ("children" in comp && Array.isArray(comp.children)) {
        childrenById.set(comp.id, comp.children);
      } else {
        childrenById.delete(comp.id);
      }
    }
  };

  for (const msg of parsed.data) {
    if ("createSurface" in msg) {
      surfaceId = msg.createSurface.surfaceId;
      resetSurface();
      if (msg.createSurface.components) {
        collectComponents(msg.createSurface.components, false);
      }
    } else if ("updateComponents" in msg) {
      if (!surfaceId) {
        return { ok: false, error: "updateComponents の前に createSurface が必要です" };
      }
      if (msg.updateComponents.surfaceId !== surfaceId) {
        return {
          ok: false,
          error: `updateComponents の surfaceId（"${msg.updateComponents.surfaceId}"）が createSurface（"${surfaceId}"）と一致しません`,
        };
      }
      const batchIds = new Set<string>();
      for (const comp of msg.updateComponents.components) {
        if (batchIds.has(comp.id)) {
          duplicateIds.add(comp.id);
        }
        batchIds.add(comp.id);
      }
      collectComponents(msg.updateComponents.components, true);
    } else if ("updateDataModel" in msg) {
      if (!surfaceId) {
        return { ok: false, error: "updateDataModel の前に createSurface が必要です" };
      }
      if (msg.updateDataModel.surfaceId !== surfaceId) {
        return {
          ok: false,
          error: `updateDataModel の surfaceId（"${msg.updateDataModel.surfaceId}"）が createSurface（"${surfaceId}"）と一致しません`,
        };
      }
    } else if ("deleteSurface" in msg) {
      if (!surfaceId) {
        return { ok: false, error: "deleteSurface の前に createSurface が必要です" };
      }
      if (msg.deleteSurface.surfaceId !== surfaceId) {
        return {
          ok: false,
          error: `deleteSurface の surfaceId（"${msg.deleteSurface.surfaceId}"）が createSurface（"${surfaceId}"）と一致しません`,
        };
      }
      surfaceId = "";
      resetSurface();
    }
  }

  if (!surfaceId) {
    return { ok: false, error: "有効な createSurface メッセージが含まれていません" };
  }
  if (options?.expectedSurfaceId && surfaceId !== options.expectedSurfaceId) {
    return {
      ok: false,
      error: `surfaceId は "${options.expectedSurfaceId}" にしてください（指定値："${surfaceId}"）`,
    };
  }
  if (duplicateIds.size > 0) {
    return {
      ok: false,
      error: `重複したコンポーネント ID があります：${Array.from(duplicateIds).join(", ")}`,
    };
  }
  if (!ids.has(A2UI_ROOT_ID)) {
    return {
      ok: false,
      error: `ルートコンポーネント id="${A2UI_ROOT_ID}" が見つかりません`,
    };
  }

  const missingChildren: string[] = [];
  for (const children of childrenById.values()) {
    for (const ref of children) {
      if (!ids.has(ref)) {
        missingChildren.push(ref);
      }
    }
  }
  if (missingChildren.length > 0) {
    return {
      ok: false,
      error: `存在しない children 参照があります：${Array.from(new Set(missingChildren)).join(", ")}`,
    };
  }

  const cycleNode = findCycleNode(childrenById);
  if (cycleNode) {
    return {
      ok: false,
      error: `コンポーネントの親子関係が循環しています：${cycleNode}`,
    };
  }

  return {
    ok: true,
    messages: parsed.data,
    surfaceId,
  };
}
