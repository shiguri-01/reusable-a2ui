import { asc, db, desc, eq, inArray } from "void/db";
import { expenses, type Expense } from "@schema";
import { z } from "zod";
import { EXPENSE_CATEGORIES, getTodayIso, MONTHLY_BUDGET_LIMIT } from "@/features/expenses/model";
import { defineTool, type McpToolDefinition } from "../types";

const categoryEnum = z.enum(EXPENSE_CATEGORIES);
const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式で指定してください");
const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "月は YYYY-MM 形式で指定してください");

function monthToDateRange(month: string): { from: string; to: string } {
  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function serializeExpense(row: Expense) {
  return {
    id: row.id,
    title: row.title,
    amount: row.amount,
    category: row.category,
    spentAt: row.spentAt,
    note: row.note,
  };
}

function filterExpensesInMemory(
  rows: Expense[],
  filters: {
    query?: string;
    category?: string;
    month?: string;
    dateFrom?: string;
    dateTo?: string;
    minAmount?: number;
    maxAmount?: number;
  },
): { matched: Expense[]; effectiveDateFrom?: string; effectiveDateTo?: string } {
  let effectiveDateFrom = filters.dateFrom;
  let effectiveDateTo = filters.dateTo;

  if (filters.month) {
    const range = monthToDateRange(filters.month);
    if (!effectiveDateFrom || range.from > effectiveDateFrom) effectiveDateFrom = range.from;
    if (!effectiveDateTo || range.to < effectiveDateTo) effectiveDateTo = range.to;
  }

  const q = filters.query?.trim().toLowerCase();

  const matched = rows.filter((item) => {
    if (filters.category && item.category !== filters.category) return false;
    if (effectiveDateFrom && item.spentAt < effectiveDateFrom) return false;
    if (effectiveDateTo && item.spentAt > effectiveDateTo) return false;
    if (filters.minAmount !== undefined && item.amount < filters.minAmount) return false;
    if (filters.maxAmount !== undefined && item.amount > filters.maxAmount) return false;
    if (q) {
      const hay = `${item.title} ${item.note} ${item.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return { matched, effectiveDateFrom, effectiveDateTo };
}

const listExpensesTool = defineTool({
  name: "list_expenses",
  description:
    "支出レコードを検索・一覧取得します。キーワード・カテゴリ・月(YYYY-MM)・日付範囲・金額範囲で絞り込み、一致件数と合計金額も返します。特定の支出を探したり、編集・削除前に対象 ID を確認したいときに使ってください。",
  annotations: {
    title: "支出一覧の検索",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    query: z.string().trim().optional().describe("内容・メモ・カテゴリの部分一致キーワード"),
    category: categoryEnum.optional().describe("絞り込むカテゴリ"),
    month: yearMonthSchema
      .optional()
      .describe("対象月 (YYYY-MM)。例: 2026-11。指定するとその月の1日〜末日で絞り込みます"),
    dateFrom: isoDateSchema.optional().describe("開始日 (YYYY-MM-DD、この日を含む)"),
    dateTo: isoDateSchema.optional().describe("終了日 (YYYY-MM-DD、この日を含む)"),
    minAmount: z.number().int().min(0).optional().describe("最小金額（円）"),
    maxAmount: z.number().int().min(0).optional().describe("最大金額（円）"),
    sortBy: z
      .enum(["spentAt_desc", "spentAt_asc", "amount_desc", "amount_asc"])
      .default("spentAt_desc")
      .describe("並び順（デフォルト: 日付の新しい順）"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .default(30)
      .describe("返却する最大件数（デフォルト: 30、最大: 200）"),
  }),
  execute: async (args) => {
    const orderCols =
      args.sortBy === "spentAt_asc"
        ? [asc(expenses.spentAt), asc(expenses.id)]
        : args.sortBy === "amount_desc"
          ? [desc(expenses.amount), desc(expenses.spentAt)]
          : args.sortBy === "amount_asc"
            ? [asc(expenses.amount), desc(expenses.spentAt)]
            : [desc(expenses.spentAt), desc(expenses.id)];

    const allRows = await db
      .select()
      .from(expenses)
      .orderBy(...orderCols);

    const { matched, effectiveDateFrom, effectiveDateTo } = filterExpensesInMemory(allRows, args);
    const filteredTotalAmount = matched.reduce((sum, item) => sum + item.amount, 0);
    const sliced = matched.slice(0, args.limit);

    return {
      today: getTodayIso(),
      totalMatchedCount: matched.length,
      returnedCount: sliced.length,
      truncated: matched.length > sliced.length,
      filteredTotalAmount,
      appliedFilters: {
        query: args.query ?? null,
        category: args.category ?? null,
        month: args.month ?? null,
        dateFrom: effectiveDateFrom ?? null,
        dateTo: effectiveDateTo ?? null,
        minAmount: args.minAmount ?? null,
        maxAmount: args.maxAmount ?? null,
        sortBy: args.sortBy,
        limit: args.limit,
      },
      expenses: sliced.map(serializeExpense),
    };
  },
});

const getSpendingSummaryTool = defineTool({
  name: "get_spending_summary",
  description:
    "支出の集計・分析レポート（合計、件数、平均、最大・最小支出、予算消化率と残高、カテゴリ別内訳、月別推移）を返します。分析・相談・予算確認では list_expenses で全件計算せず、まずこのツールを使ってください。",
  annotations: {
    title: "支出の集計・分析",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    month: yearMonthSchema
      .optional()
      .describe("集計対象の月 (YYYY-MM)。省略時は全期間（または dateFrom/dateTo の範囲）"),
    dateFrom: isoDateSchema.optional().describe("集計開始日 (YYYY-MM-DD)"),
    dateTo: isoDateSchema.optional().describe("集計終了日 (YYYY-MM-DD)"),
    budgetLimit: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(`比較する予算上限（円）。省略時はデフォルトの ${MONTHLY_BUDGET_LIMIT} 円`),
  }),
  execute: async (args) => {
    const allRows = await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.spentAt), desc(expenses.id));

    const { matched, effectiveDateFrom, effectiveDateTo } = filterExpensesInMemory(allRows, args);

    const totalAmount = matched.reduce((sum, item) => sum + item.amount, 0);
    const count = matched.length;
    const averageAmount = count > 0 ? Math.round(totalAmount / count) : 0;

    let maxExpense: Expense | null = null;
    let minExpense: Expense | null = null;
    for (const item of matched) {
      if (!maxExpense || item.amount > maxExpense.amount) maxExpense = item;
      if (!minExpense || item.amount < minExpense.amount) minExpense = item;
    }

    const byCategoryMap = new Map<string, { total: number; count: number }>();
    const byMonthMap = new Map<string, { total: number; count: number }>();

    for (const item of matched) {
      const catPrev = byCategoryMap.get(item.category) ?? { total: 0, count: 0 };
      byCategoryMap.set(item.category, {
        total: catPrev.total + item.amount,
        count: catPrev.count + 1,
      });

      const ym = item.spentAt.slice(0, 7);
      const monthPrev = byMonthMap.get(ym) ?? { total: 0, count: 0 };
      byMonthMap.set(ym, {
        total: monthPrev.total + item.amount,
        count: monthPrev.count + 1,
      });
    }

    const byCategory = Array.from(byCategoryMap.entries())
      .map(([category, stat]) => ({
        category,
        total: stat.total,
        count: stat.count,
        ratioPercent: totalAmount > 0 ? Math.round((stat.total / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    const byMonth = Array.from(byMonthMap.entries())
      .map(([month, stat]) => ({
        month,
        total: stat.total,
        count: stat.count,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const budgetLimit = args.budgetLimit ?? MONTHLY_BUDGET_LIMIT;
    const remaining = budgetLimit - totalAmount;
    const usagePercent = budgetLimit > 0 ? Math.round((totalAmount / budgetLimit) * 100) : 0;

    return {
      today: getTodayIso(),
      availableCategories: [...EXPENSE_CATEGORIES],
      period: {
        month: args.month ?? null,
        dateFrom: effectiveDateFrom ?? null,
        dateTo: effectiveDateTo ?? null,
      },
      totalAmount,
      count,
      averageAmount,
      maxExpense: maxExpense ? serializeExpense(maxExpense) : null,
      minExpense: minExpense ? serializeExpense(minExpense) : null,
      budget: {
        limit: budgetLimit,
        spent: totalAmount,
        remaining,
        usagePercent,
        isOverBudget: remaining < 0,
      },
      byCategory,
      byMonth,
    };
  },
});

const createExpensesTool = defineTool({
  name: "create_expenses",
  description:
    "1件または複数件の支出をまとめて登録します。レシートの複数項目や1日の複数支出も1回の呼び出しで記録できます。日付(spentAt)を省略した場合は今日の日付が自動設定されます。",
  annotations: {
    title: "支出の作成",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: z.object({
    items: z
      .array(
        z.object({
          title: z.string().trim().min(1, "内容を入力してください").max(120).describe("支出の内容"),
          amount: z
            .number()
            .int()
            .positive("1円以上の整数で指定してください")
            .describe("金額（円）"),
          category: categoryEnum
            .default("その他")
            .describe("カテゴリ（食費/カフェ/日用品/交通/娯楽/その他）"),
          spentAt: isoDateSchema
            .optional()
            .describe("支出日 (YYYY-MM-DD)。省略時は今日の日付になります"),
          note: z.string().trim().max(300).optional().default("").describe("メモ（任意）"),
        }),
      )
      .min(1)
      .max(50)
      .describe("登録する支出の配列（1〜50件）"),
  }),
  execute: async (args) => {
    const today = getTodayIso();
    const values = args.items.map((item) => ({
      title: item.title,
      amount: Math.round(item.amount),
      category: item.category,
      spentAt: item.spentAt ?? today,
      note: item.note ?? "",
    }));

    const created = await db.insert(expenses).values(values).returning();
    const addedTotalAmount = created.reduce((sum, item) => sum + item.amount, 0);

    return {
      createdCount: created.length,
      addedTotalAmount,
      created: created.map(serializeExpense),
    };
  },
});

const updateExpenseTool = defineTool({
  name: "update_expense",
  description:
    "既存の支出を ID 指定で部分更新します。指定したフィールドのみ上書きされます。ID が不明な場合は先に list_expenses で検索してください。",
  annotations: {
    title: "支出の更新",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z
    .object({
      id: z.number().int().positive().describe("更新対象の支出 ID"),
      title: z.string().trim().min(1).max(120).optional().describe("新しい内容"),
      amount: z.number().int().positive().optional().describe("新しい金額（円）"),
      category: categoryEnum.optional().describe("新しいカテゴリ"),
      spentAt: isoDateSchema.optional().describe("新しい日付 (YYYY-MM-DD)"),
      note: z.string().trim().max(300).optional().describe("新しいメモ"),
    })
    .refine(
      (v) =>
        v.title !== undefined ||
        v.amount !== undefined ||
        v.category !== undefined ||
        v.spentAt !== undefined ||
        v.note !== undefined,
      { message: "更新するフィールドを1つ以上指定してください" },
    ),
  execute: async (args) => {
    const [existing] = await db.select().from(expenses).where(eq(expenses.id, args.id)).limit(1);
    if (!existing) {
      throw new Error(`ID=${args.id} の支出が見つかりません`);
    }

    const patch: Partial<typeof expenses.$inferInsert> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.amount !== undefined) patch.amount = Math.round(args.amount);
    if (args.category !== undefined) patch.category = args.category;
    if (args.spentAt !== undefined) patch.spentAt = args.spentAt;
    if (args.note !== undefined) patch.note = args.note;

    const [updated] = await db
      .update(expenses)
      .set(patch)
      .where(eq(expenses.id, args.id))
      .returning();

    return {
      before: serializeExpense(existing),
      after: serializeExpense(updated!),
    };
  },
});

const deleteExpensesTool = defineTool({
  name: "delete_expenses",
  description:
    "指定した ID の支出を1件または複数件削除します。誤削除を防ぐため、ID が不明な場合は先に list_expenses で対象を確認してください。",
  annotations: {
    title: "支出の削除",
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    ids: z
      .array(z.number().int().positive())
      .min(1)
      .max(50)
      .describe("削除対象の支出 ID の配列（1〜50件）"),
  }),
  execute: async (args) => {
    const uniqueIds = Array.from(new Set(args.ids));
    const targets = await db.select().from(expenses).where(inArray(expenses.id, uniqueIds));

    if (targets.length > 0) {
      await db.delete(expenses).where(
        inArray(
          expenses.id,
          targets.map((t) => t.id),
        ),
      );
    }

    const foundSet = new Set(targets.map((t) => t.id));
    const notFoundIds = uniqueIds.filter((id) => !foundSet.has(id));

    return {
      deletedCount: targets.length,
      deleted: targets.map(serializeExpense),
      notFoundIds,
    };
  },
});

export const EXPENSE_MCP_TOOLS: McpToolDefinition[] = [
  listExpensesTool,
  getSpendingSummaryTool,
  createExpensesTool,
  updateExpenseTool,
  deleteExpensesTool,
];
