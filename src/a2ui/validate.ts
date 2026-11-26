import { a2uiMessagesSchema, type A2UIMessage } from "./types";

export type A2UIValidationResult =
  | { ok: true; messages: A2UIMessage[]; surfaceId: string }
  | { ok: false; error: string };

/**
 * Validates A2UI v0.9 messages for both schema conformance and graph integrity
 * (surfaceId, unique component IDs, rootId existence, and children references).
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
  let rootId = "";
  const ids = new Set<string>();
  const duplicateIds = new Set<string>();
  const childRefs: string[] = [];

  for (const msg of parsed.data) {
    if ("createSurface" in msg) {
      surfaceId = msg.createSurface.surfaceId;
      rootId = msg.createSurface.rootId;
      ids.clear();
      duplicateIds.clear();
      childRefs.length = 0;
    } else if ("updateComponents" in msg) {
      for (const comp of msg.updateComponents.components) {
        if (ids.has(comp.id)) {
          duplicateIds.add(comp.id);
        }
        ids.add(comp.id);
        if ("children" in comp && Array.isArray(comp.children)) {
          childRefs.push(...comp.children);
        }
      }
    }
  }

  if (!surfaceId) {
    return { ok: false, error: "createSurface メッセージが含まれていません" };
  }
  if (options?.expectedSurfaceId && surfaceId !== options.expectedSurfaceId) {
    return {
      ok: false,
      error: `surfaceId は "${options.expectedSurfaceId}" にしてください（指定値: "${surfaceId}"）`,
    };
  }
  if (duplicateIds.size > 0) {
    return {
      ok: false,
      error: `重複したコンポーネント ID があります: ${Array.from(duplicateIds).join(", ")}`,
    };
  }
  if (!rootId || !ids.has(rootId)) {
    return {
      ok: false,
      error: `rootId "${rootId || "root"}" に対応するコンポーネントが見つかりません`,
    };
  }

  const missingChildren = childRefs.filter((ref) => !ids.has(ref));
  if (missingChildren.length > 0) {
    return {
      ok: false,
      error: `存在しない children 参照があります: ${Array.from(new Set(missingChildren)).join(", ")}`,
    };
  }

  return {
    ok: true,
    messages: parsed.data,
    surfaceId,
  };
}
