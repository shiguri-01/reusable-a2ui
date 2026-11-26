import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { and, asc, db, desc, eq, gte, inArray, lte } from "void/db";
import { expenses, type Expense } from "@schema";
import { z } from "zod";
import {
  EXPENSE_CATEGORIES,
  getTodayIso,
  MONTHLY_BUDGET_LIMIT,
  summarizeExpenses,
} from "@/features/expenses/model";
import { jsonToolResult } from "./result";

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

interface ExpenseQueryFilters {
  query?: string;
  category?: string;
  month?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: "spentAt_desc" | "spentAt_asc" | "amount_desc" | "amount_asc";
}

function resolveDateBounds(filters: Pick<ExpenseQueryFilters, "month" | "dateFrom" | "dateTo">) {
  let effectiveDateFrom = filters.dateFrom;
  let effectiveDateTo = filters.dateTo;

  if (filters.month) {
    const range = monthToDateRange(filters.month);
    if (!effectiveDateFrom || range.from > effectiveDateFrom) effectiveDateFrom = range.from;
    if (!effectiveDateTo || range.to < effectiveDateTo) effectiveDateTo = range.to;
  }

  return { effectiveDateFrom, effectiveDateTo };
}

function getOrderColumns(sortBy: ExpenseQueryFilters["sortBy"]) {
  switch (sortBy) {
    case "spentAt_asc":
      return [asc(expenses.spentAt), asc(expenses.id)];
    case "amount_desc":
      return [desc(expenses.amount), desc(expenses.spentAt)];
    case "amount_asc":
      return [asc(expenses.amount), desc(expenses.spentAt)];
    default:
      return [desc(expenses.spentAt), desc(expenses.id)];
  }
}

async function queryFilteredExpenses(filters: ExpenseQueryFilters): Promise<{
  matched: Expense[];
  effectiveDateFrom?: string;
  effectiveDateTo?: string;
}> {
  const { effectiveDateFrom, effectiveDateTo } = resolveDateBounds(filters);
  const conditions = [];

  if (filters.category) {
    conditions.push(eq(expenses.category, filters.category));
  }
  if (effectiveDateFrom) {
    conditions.push(gte(expenses.spentAt, effectiveDateFrom));
  }
  if (effectiveDateTo) {
    conditions.push(lte(expenses.spentAt, effectiveDateTo));
  }
  if (filters.minAmount !== undefined) {
    conditions.push(gte(expenses.amount, filters.minAmount));
  }
  if (filters.maxAmount !== undefined) {
    conditions.push(lte(expenses.amount, filters.maxAmount));
  }

  const baseQuery = db.select().from(expenses);
  const rows = await (
    conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery
  ).orderBy(...getOrderColumns(filters.sortBy));

  const q = filters.query?.trim().toLowerCase();
  const matched = q
    ? rows.filter((item) => `${item.title} ${item.note} ${item.category}`.toLowerCase().includes(q))
    : rows;

  return { matched, effectiveDateFrom, effectiveDateTo };
}

export function registerExpenseTools(server: McpServer): void {
  server.registerTool(
    "list_expenses",
    {
      title: "支出一覧の検索",
      description:
        "支出レコードを検索・一覧取得します。キーワード・カテゴリ・月(YYYY-MM)・日付範囲・金額範囲で絞り込み、一致件数と合計金額も返します。特定の支出を探したり、編集・削除前に対象 ID を確認したいときに使ってください。",
      annotations: {
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
    },
    async (args) => {
      const { matched, effectiveDateFrom, effectiveDateTo } = await queryFilteredExpenses(args);
      const filteredTotalAmount = matched.reduce((sum, item) => sum + item.amount, 0);
      const sliced = matched.slice(0, args.limit);

      return jsonToolResult({
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
      });
    },
  );

  server.registerTool(
    "get_spending_summary",
    {
      title: "支出の集計・分析",
      description:
        "支出の集計・分析レポート（合計、件数、平均、最大・最小支出、予算消化率と残高、カテゴリ別内訳、月別推移）を返します。分析・相談・予算確認では list_expenses で全件計算せず、まずこのツールを使ってください。",
      annotations: {
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
    },
    async (args) => {
      const { matched, effectiveDateFrom, effectiveDateTo } = await queryFilteredExpenses(args);
      const summary = summarizeExpenses(matched, args.budgetLimit);

      let maxExpense: Expense | null = null;
      let minExpense: Expense | null = null;
      const byMonthMap = new Map<string, { total: number; count: number }>();

      for (const item of matched) {
        if (!maxExpense || item.amount > maxExpense.amount) maxExpense = item;
        if (!minExpense || item.amount < minExpense.amount) minExpense = item;

        const ym = item.spentAt.slice(0, 7);
        const monthPrev = byMonthMap.get(ym) ?? { total: 0, count: 0 };
        byMonthMap.set(ym, {
          total: monthPrev.total + item.amount,
          count: monthPrev.count + 1,
        });
      }

      const byMonth = Array.from(byMonthMap.entries())
        .map(([month, stat]) => ({
          month,
          total: stat.total,
          count: stat.count,
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      return jsonToolResult({
        today: getTodayIso(),
        availableCategories: [...EXPENSE_CATEGORIES],
        period: {
          month: args.month ?? null,
          dateFrom: effectiveDateFrom ?? null,
          dateTo: effectiveDateTo ?? null,
        },
        totalAmount: summary.total,
        count: summary.count,
        averageAmount: summary.average,
        maxExpense: maxExpense ? serializeExpense(maxExpense) : null,
        minExpense: minExpense ? serializeExpense(minExpense) : null,
        budget: summary.budget,
        byCategory: summary.categories.map((cat) => ({
          category: cat.category,
          total: cat.total,
          count: cat.count,
          ratioPercent: cat.ratio,
        })),
        byMonth,
      });
    },
  );

  server.registerTool(
    "create_expenses",
    {
      title: "支出の作成",
      description:
        "1件または複数件の支出をまとめて登録します。レシートの複数項目や1日の複数支出も1回の呼び出しで記録できます。日付(spentAt)を省略した場合は今日の日付が自動設定されます。",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              title: z
                .string()
                .trim()
                .min(1, "内容を入力してください")
                .max(120)
                .describe("支出の内容"),
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
    },
    async (args) => {
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

      return jsonToolResult({
        createdCount: created.length,
        addedTotalAmount,
        created: created.map(serializeExpense),
      });
    },
  );

  server.registerTool(
    "update_expense",
    {
      title: "支出の更新",
      description:
        "既存の支出を ID 指定で部分更新します。指定したフィールドのみ上書きされます。ID が不明な場合は先に list_expenses で検索してください。",
      annotations: {
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
    },
    async (args) => {
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

      return jsonToolResult({
        before: serializeExpense(existing),
        after: serializeExpense(updated!),
      });
    },
  );

  server.registerTool(
    "delete_expenses",
    {
      title: "支出の削除",
      description:
        "指定した ID の支出を1件または複数件削除します。誤削除を防ぐため、ID が不明な場合は先に list_expenses で対象を確認してください。",
      annotations: {
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
    },
    async (args) => {
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

      return jsonToolResult({
        deletedCount: targets.length,
        deleted: targets.map(serializeExpense),
        notFoundIds,
      });
    },
  );
}
