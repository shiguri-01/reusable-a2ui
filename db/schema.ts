import { sql } from "void/db";
import { integer, sqliteTable, text } from "void/schema-d1";
import { createInsertSchema } from "void/drizzle-zod";

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  category: text("category").notNull().default("その他"),
  spentAt: text("spent_at").notNull(),
  note: text("note").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const uiVersions = sqliteTable("ui_versions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  surfaceId: text("surface_id").notNull().default("expense-dashboard"),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  messagesJson: text("messages_json").notNull(),
  isActive: integer("is_active").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const insertExpenseSchema = createInsertSchema(expenses, {
  title: (schema) => schema.trim().min(1, "内容を入力してください").max(120),
  amount: (schema) => schema.int().positive("1円以上で入力してください"),
  category: (schema) => schema.trim().min(1).max(40),
  spentAt: (schema) => schema.regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD形式で入力してください"),
  note: (schema) => schema.max(300),
}).pick({
  title: true,
  amount: true,
  category: true,
  spentAt: true,
  note: true,
});

export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type UiVersion = typeof uiVersions.$inferSelect;
