import { A2UI_ROOT_ID, a2uiMessagesSchema, type A2UIComponent, type A2UIMessage } from "./types";

export type A2UIValidationResult =
  | { ok: true; messages: A2UIMessage[]; surfaceId: string }
  | { ok: false; error: string };

/**
 * Validates A2UI v1.0 messages for both schema conformance and graph integrity
 * (surfaceId lifecycle, unique component IDs, canonical "root" component existence,
 * and children references).
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
  const childRefs: string[] = [];

  const collectComponents = (components: A2UIComponent[]) => {
    for (const comp of components) {
      if (ids.has(comp.id)) {
        duplicateIds.add(comp.id);
      }
      ids.add(comp.id);
      if ("children" in comp && Array.isArray(comp.children)) {
        childRefs.push(...comp.children);
      }
    }
  };

  for (const msg of parsed.data) {
    if ("createSurface" in msg) {
      surfaceId = msg.createSurface.surfaceId;
      ids.clear();
      duplicateIds.clear();
      childRefs.length = 0;
      if (msg.createSurface.components) {
        collectComponents(msg.createSurface.components);
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
      collectComponents(msg.updateComponents.components);
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
    }
  }

  if (!surfaceId) {
    return { ok: false, error: "createSurface メッセージが含まれていません" };
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

  const missingChildren = childRefs.filter((ref) => !ids.has(ref));
  if (missingChildren.length > 0) {
    return {
      ok: false,
      error: `存在しない children 参照があります：${Array.from(new Set(missingChildren)).join(", ")}`,
    };
  }

  return {
    ok: true,
    messages: parsed.data,
    surfaceId,
  };
}
