import { defineHandler, defineHead, type InferProps } from "void";
import { insertExpenseSchema } from "@schema";
import {
  createExpenseRecord,
  deleteExpenseById,
  deleteExpenseSchema,
  listAllExpenses,
} from "@/features/expenses/server";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  return { expenses: await listAllExpenses() };
});

export const head = defineHead<Props>(() => ({
  title: "支出一覧",
}));

export const actions = {
  create: defineHandler.withValidator({
    body: insertExpenseSchema,
  })(async (_c, { body }) => {
    await createExpenseRecord(body);
  }),

  delete: defineHandler.withValidator({
    body: deleteExpenseSchema,
  })(async (_c, { body }) => {
    await deleteExpenseById(body.id);
  }),
};
