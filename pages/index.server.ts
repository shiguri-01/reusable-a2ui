import { defineHandler, type InferProps } from "void";
import { ValidationError } from "void/handler";
import { db, desc, eq } from "void/db";
import { expenses, insertExpenseSchema } from "@schema";
import { z } from "zod";
import { a2uiMessagesSchema } from "@/a2ui/types";
import {
  activateUiVersionById,
  createAndActivateUiVersion,
  ensureDefaultUiVersions,
} from "@/lib/ui-versions";

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
    await activateUiVersionById(body.id);
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

    await createAndActivateUiVersion({
      name: body.name,
      description: body.description,
      messages: validated.data,
    });
  }),
};
