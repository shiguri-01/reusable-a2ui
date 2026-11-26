import { defineHandler, defineHead, type InferProps } from "void";
import { ValidationError } from "void/handler";
import { insertExpenseSchema } from "@schema";
import { z } from "zod";
import { DASHBOARD_SURFACE_ID } from "@/features/a2ui/types";
import { validateA2UISurfaceMessages } from "@/features/a2ui/validate";
import {
  activateUiVersionById,
  createAndActivateUiVersion,
  ensureDefaultUiVersions,
} from "@/features/dashboard/server/ui-versions";
import {
  createExpenseRecord,
  deleteExpenseById,
  deleteExpenseSchema,
  listAllExpenses,
} from "@/features/expenses/server";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [expenseRows, versionRows] = await Promise.all([
    listAllExpenses(),
    ensureDefaultUiVersions(),
  ]);

  const activeVersion = versionRows.find((v) => v.isActive === 1) ?? versionRows.at(-1);

  return {
    expenses: expenseRows,
    uiVersions: versionRows,
    activeVersionId: activeVersion?.id ?? null,
  };
});

export const head = defineHead<Props>(() => ({
  title: "ダッシュボード",
}));

export const actions = {
  createExpense: defineHandler.withValidator({
    body: insertExpenseSchema,
  })(async (_c, { body }) => {
    await createExpenseRecord(body);
  }),

  deleteExpense: defineHandler.withValidator({
    body: deleteExpenseSchema,
  })(async (_c, { body }) => {
    await deleteExpenseById(body.id);
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

    const validated = validateA2UISurfaceMessages(parsed, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    if (!validated.ok) {
      throw new ValidationError({ messagesJson: validated.error });
    }

    await createAndActivateUiVersion({
      name: body.name,
      description: body.description,
      messages: validated.messages,
    });
  }),
};
