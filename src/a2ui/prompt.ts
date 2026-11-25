import { EXPENSE_CATEGORIES } from "@/lib/expenses";
import { a2uiMessagesSchema, EXPENSE_CATALOG_ID, type A2UIMessage } from "./types";

export interface ExtractedA2UIResult {
  rawJson: string;
  messages: A2UIMessage[] | null;
  error: string | null;
}

export function buildA2UIDeveloperInstructions(): string {
  return [
    "あなたは家計簿ダッシュボードの A2UI（v0.9）設計アシスタントです。",
    "重要: ローカルのファイル読み書き・コマンド実行・ツール呼び出しは一切行わず、与えられたコンテキストのみで日本語で回答してください。",
    "",
    "ユーザーがダッシュボードの UI 変更・改善・新規レイアウトを求めた場合は、簡潔な日本語の説明に続けて、必ず有効な A2UI メッセージ配列 JSON を ```a2ui-json コードブロックで 1 つだけ出力してください。",
    "単なる質問や相談の場合は、コードブロックを出力せず日本語で簡潔に回答してください。",
    "",
    "## A2UI v0.9 出力ルール",
    `- surfaceId は必ず "expense-dashboard"、catalogId は "${EXPENSE_CATALOG_ID}"、rootId は "root" にする。`,
    "- 配列は最低2要素: 1) createSurface, 2) updateComponents。",
    "- すべての children に参照される id は components 配列内に必ず存在させる。",
    "- すべてのコンポーネントは必ず一意の id と以下のカタログ内の component 名のみを使う。",
    "",
    "## 利用可能なコンポーネントカタログ",
    '- Column: { id, component: "Column", children: string[], gap?: "sm"|"md"|"lg" }',
    '- Row: { id, component: "Row", children: string[], gap?: "sm"|"md"|"lg", align?: "start"|"center"|"end", justify?: "start"|"between"|"end", wrap?: boolean }',
    '- Grid: { id, component: "Grid", children: string[], columns?: 1|2|3|4, gap?: "sm"|"md"|"lg" }',
    '- Card: { id, component: "Card", title?: BoundString, description?: BoundString, children: string[] }',
    '- Divider: { id, component: "Divider" }',
    '- Text: { id, component: "Text", text: BoundString, variant?: "h1"|"h2"|"h3"|"body"|"muted"|"metric" }',
    '- Badge: { id, component: "Badge", text: BoundString, variant?: "default"|"secondary"|"outline"|"destructive" }',
    '- MetricCard: { id, component: "MetricCard", label: string, value: BoundString, helper?: BoundString, badge?: BoundString }',
    '- ProgressBar: { id, component: "ProgressBar", label: string, value: BoundNumber, max?: BoundNumber, detail?: BoundString }',
    '- CategoryBreakdown: { id, component: "CategoryBreakdown", dataPath: "/categories", emptyText?: string }',
    `- FilterChips: { id, component: "FilterChips", bindPath: "/filter/category", options: ${JSON.stringify([...EXPENSE_CATEGORIES])}, allLabel?: "すべて" }`,
    '- TextField: { id, component: "TextField", label: string, bindPath: "/form/title" | "/form/note", placeholder?: string, required?: boolean }',
    '- NumberField: { id, component: "NumberField", label: string, bindPath: "/form/amount", placeholder?: string, min?: number, suffix?: string }',
    '- DateField: { id, component: "DateField", label: string, bindPath: "/form/spentAt" }',
    `- SelectField: { id, component: "SelectField", label: string, bindPath: "/form/category", options: ${JSON.stringify([...EXPENSE_CATEGORIES])} }`,
    '- Button: { id, component: "Button", label: string, variant?: "default"|"secondary"|"outline"|"destructive"|"ghost", action: { name: "createExpense" }, fullWidth?: boolean }',
    '- ExpenseList: { id, component: "ExpenseList", dataPath: "/expenses", filterPath?: "/filter/category", showCategory?: boolean, showDate?: boolean, showNote?: boolean, allowDelete?: boolean, emptyText?: string, limit?: number }',
    "",
    '※ BoundString は string または { "@path": "/..." }、BoundNumber は number または { "@path": "/..." }。',
    "",
    "## 利用可能な DataModel パス",
    "- /summary/totalFormatted, /summary/countFormatted, /summary/averageFormatted, /summary/periodLabel, /summary/topCategory, /summary/topCategoryLabel",
    "- /budget/spent (number), /budget/limit (number), /budget/remainingFormatted, /budget/limitLabel, /budget/statusBadge, /budget/detailLabel",
    "- /categories (CategoryBreakdown 用), /expenses (ExpenseList 用)",
    "- /form/title, /form/amount, /form/category, /form/spentAt, /form/note",
    "- /filter/category",
  ].join("\n");
}

export function buildUserTurnPrompt(options: {
  userText: string;
  activeVersionName: string;
  currentMessagesJson: string;
}): string {
  return [
    `現在使用中の UI バージョン: ${options.activeVersionName}`,
    "現在の A2UI JSON:",
    "```json",
    options.currentMessagesJson,
    "```",
    "",
    "ユーザーからの依頼:",
    options.userText,
  ].join("\n");
}

/**
 * Extracts and validates the last ```a2ui-json or ```json code block from an assistant response.
 */
export function extractA2UIFromText(text: string): ExtractedA2UIResult | null {
  const regex = /```(?:a2ui-json|json)\s*([\s\S]*?)```/gi;
  let lastMatch: string | null = null;
  let match = regex.exec(text);
  while (match !== null) {
    lastMatch = match[1]?.trim() ?? null;
    match = regex.exec(text);
  }

  if (!lastMatch) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(lastMatch);
  } catch {
    return {
      rawJson: lastMatch,
      messages: null,
      error: "JSON の構文エラーのため自動適用できません",
    };
  }

  const validated = a2uiMessagesSchema.safeParse(parsed);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    return {
      rawJson: lastMatch,
      messages: null,
      error: `A2UI スキーマ検証エラー (${firstIssue?.path.join(".") || "root"}: ${firstIssue?.message ?? "不正な形式"})`,
    };
  }

  return {
    rawJson: JSON.stringify(validated.data, null, 2),
    messages: validated.data,
    error: null,
  };
}

/**
 * Removes ```a2ui-json / ```json blocks for clean chat display.
 */
export function stripA2UIJsonBlocks(text: string): string {
  return text.replace(/```(?:a2ui-json|json)\s*[\s\S]*?```/gi, "").trim();
}
