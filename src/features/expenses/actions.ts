import { action } from "@void/react";
import { toPrimitiveString } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { EXPENSE_CATEGORIES, getTodayIso } from "./model";

export interface ExpenseActionResult {
  ok: boolean;
  message?: string;
}

export async function runExpenseA2UIAction(
  act: A2UIAction,
  sourceForm: Record<string, unknown>,
  target: "dashboard" | "expenses",
): Promise<ExpenseActionResult> {
  if (act.name === "createExpense") {
    const title = toPrimitiveString(sourceForm.title).trim();
    const amount = Number(sourceForm.amount);
    const category = toPrimitiveString(sourceForm.category).trim() || EXPENSE_CATEGORIES[0];
    const spentAt = toPrimitiveString(sourceForm.spentAt).trim() || getTodayIso();
    const note = toPrimitiveString(sourceForm.note).trim();

    if (!title) {
      return { ok: false, message: "内容を入力してください。" };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, message: "金額は1円以上の数値で入力してください。" };
    }

    const payload = {
      title,
      amount: Math.round(amount),
      category,
      spentAt,
      note,
    };
    const res =
      target === "dashboard"
        ? await action("/?createExpense", { data: payload })
        : await action("/expenses?create", { data: payload });

    if (!res.ok) {
      return { ok: false, message: res.error.message };
    }
    return { ok: true, message: `「${title}」を記録しました。` };
  }

  if (act.name === "deleteExpense") {
    const id = Number(act.context?.id);
    if (!Number.isInteger(id) || id <= 0) return { ok: false };

    const res =
      target === "dashboard"
        ? await action("/?deleteExpense", { data: { id } })
        : await action("/expenses?delete", { data: { id } });

    if (!res.ok) {
      return { ok: false, message: res.error.message };
    }
    return { ok: true, message: "支出ログを削除しました。" };
  }

  return { ok: false };
}
