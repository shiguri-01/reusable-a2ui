import { asc, db, eq } from "void/db";
import { uiVersions, type UiVersion } from "@schema";
import { PRESET_UI_VERSIONS } from "@/features/a2ui/presets";
import { DASHBOARD_SURFACE_ID, type A2UIMessage } from "@/features/a2ui/types";
import { validateA2UISurfaceMessages } from "@/features/a2ui/validate";

export const DEFAULT_ACTIVE_UI_VERSION = 3;

async function listDashboardVersions(): Promise<UiVersion[]> {
  return await db
    .select()
    .from(uiVersions)
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID))
    .orderBy(asc(uiVersions.version));
}

async function activateUiVersion(
  predicate: (row: UiVersion) => boolean,
): Promise<UiVersion | null> {
  const rows = await ensureDefaultUiVersions();
  const target = rows.find(predicate);
  if (!target) return null;

  await db.batch([
    db
      .update(uiVersions)
      .set({ isActive: 0 })
      .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID)),
    db.update(uiVersions).set({ isActive: 1 }).where(eq(uiVersions.id, target.id)),
  ]);

  return { ...target, isActive: 1 };
}

export async function ensureDefaultUiVersions(): Promise<UiVersion[]> {
  const existing = await listDashboardVersions();
  if (existing.length > 0) {
    return existing;
  }

  await db.insert(uiVersions).values(
    PRESET_UI_VERSIONS.map((preset) => ({
      surfaceId: DASHBOARD_SURFACE_ID,
      version: preset.version,
      name: preset.name,
      description: preset.description,
      messagesJson: JSON.stringify(preset.messages, null, 2),
      isActive: preset.version === DEFAULT_ACTIVE_UI_VERSION ? 1 : 0,
    })),
  );

  return await listDashboardVersions();
}

export async function activateUiVersionById(id: number): Promise<UiVersion | null> {
  return await activateUiVersion((row) => row.id === id);
}

export async function activateUiVersionByNumber(versionNumber: number): Promise<UiVersion | null> {
  return await activateUiVersion((row) => row.version === versionNumber);
}

export async function createAndActivateUiVersion(input: {
  name: string;
  description?: string;
  messages: A2UIMessage[];
}): Promise<UiVersion> {
  const validated = validateA2UISurfaceMessages(input.messages, {
    expectedSurfaceId: DASHBOARD_SURFACE_ID,
  });
  if (!validated.ok) {
    throw new Error(validated.error);
  }

  const rows = await ensureDefaultUiVersions();
  const nextVersion = (rows.at(-1)?.version ?? 0) + 1;

  const [, createdRows] = await db.batch([
    db
      .update(uiVersions)
      .set({ isActive: 0 })
      .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID)),
    db
      .insert(uiVersions)
      .values({
        surfaceId: DASHBOARD_SURFACE_ID,
        version: nextVersion,
        name: input.name.trim(),
        description: (input.description ?? "").trim(),
        messagesJson: JSON.stringify(validated.messages, null, 2),
        isActive: 1,
      })
      .returning(),
  ]);

  const created = createdRows[0];
  if (!created) {
    throw new Error("UI バージョンの保存に失敗しました");
  }

  return created;
}
