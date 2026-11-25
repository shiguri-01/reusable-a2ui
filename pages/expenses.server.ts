import { defineHandler, type InferProps } from "void";
import { db, desc, eq } from "void/db";
import { expenses, insertExpenseSchema } from "@schema";
import { z } from "zod";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const rows = await db.select().from(expenses).orderBy(desc(expenses.spentAt), desc(expenses.id));

  return { expenses: rows };
});

export const actions = {
  create: defineHandler.withValidator({
    body: insertExpenseSchema,
  })(async (_c, { body }) => {
    await db.insert(expenses).values(body);
  }),

  delete: defineHandler.withValidator({
    body: z.object({
      id: z.number().int().positive(),
    }),
  })(async (_c, { body }) => {
    await db.delete(expenses).where(eq(expenses.id, body.id));
  }),
};
