import { asc, db, desc, eq } from "void/db";
import { uiVersions, type UiVersion } from "@schema";
import { PRESET_UI_VERSIONS } from "@/a2ui/presets";
import { DASHBOARD_SURFACE_ID, type A2UIMessage } from "@/a2ui/types";
import { validateA2UISurfaceMessages } from "@/a2ui/validate";

export async function ensureDefaultUiVersions(): Promise<UiVersion[]> {
  const existing = await db
    .select()
    .from(uiVersions)
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID))
    .orderBy(asc(uiVersions.version));

  if (existing.length > 0) {
    let updated = false;
    for (const row of existing) {
      const preset = PRESET_UI_VERSIONS.find((p) => p.version === row.version);
      if (!preset) continue;
      const nextJson = JSON.stringify(preset.messages, null, 2);
      if (row.name.includes(": ") || row.messagesJson.includes("例: ")) {
        await db
          .update(uiVersions)
          .set({
            name: preset.name,
            description: preset.description,
            messagesJson: nextJson,
          })
          .where(eq(uiVersions.id, row.id));
        updated = true;
      }
    }
    if (!updated) {
      return existing;
    }
    return await db
      .select()
      .from(uiVersions)
      .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID))
      .orderBy(asc(uiVersions.version));
  }

  await db.insert(uiVersions).values(
    PRESET_UI_VERSIONS.map((preset) => ({
      surfaceId: DASHBOARD_SURFACE_ID,
      version: preset.version,
      name: preset.name,
      description: preset.description,
      messagesJson: JSON.stringify(preset.messages, null, 2),
      isActive: preset.version === 3 ? 1 : 0,
    })),
  );

  return await db
    .select()
    .from(uiVersions)
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID))
    .orderBy(asc(uiVersions.version));
}

export async function activateUiVersionById(id: number): Promise<UiVersion | null> {
  const rows = await ensureDefaultUiVersions();
  const target = rows.find((row) => row.id === id);
  if (!target) return null;

  await db
    .update(uiVersions)
    .set({ isActive: 0 })
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID));
  await db.update(uiVersions).set({ isActive: 1 }).where(eq(uiVersions.id, target.id));

  return { ...target, isActive: 1 };
}

export async function activateUiVersionByNumber(versionNumber: number): Promise<UiVersion | null> {
  const rows = await ensureDefaultUiVersions();
  const target = rows.find((row) => row.version === versionNumber);
  if (!target) return null;

  await db
    .update(uiVersions)
    .set({ isActive: 0 })
    .where(eq(uiVersions.surfaceId, DASHBOARD_SURFACE_ID));
  await db.update(uiVersions).set({ isActive: 1 }).where(eq(uiVersions.id, target.id));

  return { ...target, isActive: 1 };
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
