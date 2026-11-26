import { asc, db, desc, eq } from "void/db";
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

  await db
    .update(uiVersions)
    .set({ isActive: 0 })
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID));
  await db.update(uiVersions).set({ isActive: 1 }).where(eq(uiVersions.id, target.id));

  return { ...target, isActive: 1 };
}

export async function ensureDefaultUiVersions(): Promise<UiVersion[]> {
  const existing = await listDashboardVersions();

  if (existing.length > 0) {
    let updated = false;
    for (const row of existing) {
      const preset = PRESET_UI_VERSIONS.find((p) => p.version === row.version);
      if (!preset) continue;
      if (row.name.includes(": ") || row.messagesJson.includes("例: ")) {
        await db
          .update(uiVersions)
          .set({
            name: preset.name,
            description: preset.description,
            messagesJson: JSON.stringify(preset.messages, null, 2),
          })
          .where(eq(uiVersions.id, row.id));
        updated = true;
      }
    }
    return updated ? await listDashboardVersions() : existing;
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
  await ensureDefaultUiVersions();

  const existing = await db
    .select({ version: uiVersions.version })
    .from(uiVersions)
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID))
    .orderBy(desc(uiVersions.version))
    .limit(1);

  const nextVersion = (existing[0]?.version ?? 0) + 1;

  await db
    .update(uiVersions)
    .set({ isActive: 0 })
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID));

  const [created] = await db
    .insert(uiVersions)
    .values({
      surfaceId: DASHBOARD_SURFACE_ID,
      version: nextVersion,
      name: input.name.trim(),
      description: (input.description ?? "").trim(),
      messagesJson: JSON.stringify(validated.messages, null, 2),
      isActive: 1,
    })
    .returning();

  return created!;
}
