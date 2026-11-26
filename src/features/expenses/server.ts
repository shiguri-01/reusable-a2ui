import { db, desc, eq } from "void/db";
import { expenses, type Expense, type NewExpense } from "@schema";
import { z } from "zod";

export const deleteExpenseSchema = z.object({
  id: z.number().int().positive(),
});

export async function listAllExpenses(): Promise<Expense[]> {
  return await db.select().from(expenses).orderBy(desc(expenses.spentAt), desc(expenses.id));
}

export async function createExpenseRecord(
  input: Pick<NewExpense, "title" | "amount" | "category" | "spentAt" | "note">,
): Promise<void> {
  await db.insert(expenses).values(input);
}

export async function deleteExpenseById(id: number): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, id));
}
