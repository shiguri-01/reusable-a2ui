import { defineHandler, type InferProps } from "void";
import { ValidationError } from "void/handler";
import { asc, db, desc, eq } from "void/db";
import { expenses, insertExpenseSchema, uiVersions } from "@schema";
import { z } from "zod";
import { PRESET_UI_VERSIONS } from "@/a2ui/presets";
import { a2uiMessagesSchema } from "@/a2ui/types";

const SURFACE_ID = "expense-dashboard";

async function ensureDefaultUiVersions() {
  const existing = await db
    .select()
    .from(uiVersions)
    .where(eq(uiVersions.surfaceId, SURFACE_ID))
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
      .where(eq(uiVersions.surfaceId, SURFACE_ID))
      .orderBy(asc(uiVersions.version));
  }

  await db.insert(uiVersions).values(
    PRESET_UI_VERSIONS.map((preset) => ({
      surfaceId: SURFACE_ID,
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
    .where(eq(uiVersions.surfaceId, SURFACE_ID))
    .orderBy(asc(uiVersions.version));
}

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [expenseRows, versionRows] = await Promise.all([
    db.select().from(expenses).orderBy(desc(expenses.spentAt), desc(expenses.id)),
    ensureDefaultUiVersions(),
  ]);

  const activeVersion =
    versionRows.find((v) => v.isActive === 1) ?? versionRows[versionRows.length - 1];

  return {
    expenses: expenseRows,
    uiVersions: versionRows,
    activeVersionId: activeVersion?.id ?? null,
  };
});

export const actions = {
  createExpense: defineHandler.withValidator({
    body: insertExpenseSchema,
  })(async (_c, { body }) => {
    await db.insert(expenses).values(body);
  }),

  deleteExpense: defineHandler.withValidator({
    body: z.object({
      id: z.number().int().positive(),
    }),
  })(async (_c, { body }) => {
    await db.delete(expenses).where(eq(expenses.id, body.id));
  }),

  activateVersion: defineHandler.withValidator({
    body: z.object({
      id: z.number().int().positive(),
    }),
  })(async (_c, { body }) => {
    await db.update(uiVersions).set({ isActive: 0 }).where(eq(uiVersions.surfaceId, SURFACE_ID));
    await db.update(uiVersions).set({ isActive: 1 }).where(eq(uiVersions.id, body.id));
  }),

  saveVersion: defineHandler.withValidator({
    body: z.object({
      name: z.string().trim().min(1, "バージョン名を入力してください").max(80),
      description: z.string().trim().max(240).optional().default(""),
      messagesJson: z.string().min(2),
    }),
  })(async (_c, { body }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(body.messagesJson);
    } catch {
      throw new ValidationError({ messagesJson: "有効なJSON形式ではありません" });
    }

    const validated = a2uiMessagesSchema.safeParse(parsed);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      throw new ValidationError({
        messagesJson: `A2UIスキーマエラー：${firstIssue?.path.join(".") || "root"} - ${firstIssue?.message ?? "不正な形式"}`,
      });
    }

    const existing = await db
      .select({ version: uiVersions.version })
      .from(uiVersions)
      .where(eq(uiVersions.surfaceId, SURFACE_ID))
      .orderBy(desc(uiVersions.version))
      .limit(1);

    const nextVersion = (existing[0]?.version ?? 0) + 1;

    await db.update(uiVersions).set({ isActive: 0 }).where(eq(uiVersions.surfaceId, SURFACE_ID));
    await db.insert(uiVersions).values({
      surfaceId: SURFACE_ID,
      version: nextVersion,
      name: body.name,
      description: body.description,
      messagesJson: JSON.stringify(validated.data, null, 2),
      isActive: 1,
    });
  }),
};
