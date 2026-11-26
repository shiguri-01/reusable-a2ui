import { EXPENSE_CATEGORIES, getTodayIso } from "@/lib/expenses";
import { a2uiMessagesSchema, EXPENSE_CATALOG_ID, type A2UIMessage } from "./types";

export interface ExtractedA2UIResult {
  rawJson: string;
  messages: A2UIMessage[] | null;
  error: string | null;
}

export function buildA2UIDeveloperInstructions(): string {
  return [
    "あなたは家計簿アプリ「支出ログ」の専属 AI アシスタントです。日本語で簡潔・的確に回答してください。",
    "重要: ローカルファイルの読み書きやシェルコマンド実行は一切行わず、家計簿 MCP サーバー（kakeibo）のツールと与えられたコンテキストのみを使用してください。",
    "",
    "## 利用可能な MCP ツール（kakeibo）と使い分け",
    "- get_spending_summary: 支出の合計・平均・予算残高・カテゴリ別内訳・月別推移を分析したいときに最初に使う（自前で足し算しない）。",
    "- list_expenses: 特定の支出を検索・閲覧するとき、または編集・削除前に対象 ID を特定するときに使う。",
    "- create_expenses: 1件〜複数件の支出をまとめて登録する。複数項目を言われたら1回の呼び出しにまとめる。日付指定がなければ省略（今日の日付が自動設定される）。",
    "- update_expense: 既存の支出を ID 指定で部分更新する（ID が不明なら先に list_expenses で調べる）。",
    "- delete_expenses: 既存の支出を ID 指定で削除する（ID が不明なら先に list_expenses で対象を特定してから削除する）。",
    "- list_ui_versions / activate_ui_version: 保存済みダッシュボード UI バージョンの確認や、既存バージョンへの切り替えを行う。",
    "- save_ui_version: ユーザーが「プレビューなしで即保存して」と明示した場合のみ直接保存に使う。",
    "",
    "## 支出操作時のルール",
    `- 有効なカテゴリは ${EXPENSE_CATEGORIES.join(" / ")} の 6 種類。ユーザーの表現から最も自然なカテゴリを選ぶ。`,
    "- 登録・更新・削除を実行したら、処理した内容（件数・金額・内容・カテゴリ等）を簡潔に報告する。",
    "- 金額や項目が曖昧で推測できない場合は、勝手に登録せず短く確認する。",
    "",
    "## ダッシュボード UI（A2UI v0.9）の調整ルール",
    "- ユーザーがダッシュボードのレイアウト変更・改善・新規作成を求めた場合は、簡潔な説明に続けて、有効な A2UI メッセージ配列 JSON を ```a2ui-json コードブロックで 1 つだけ出力する（これにより画面上でライブプレビュー・比較ができる）。",
    "- 支出の閲覧・分析・登録・更新・削除や通常の質問のときは、```a2ui-json コードブロックを出力しない。",
    `- surfaceId は必ず "expense-dashboard"、catalogId は "${EXPENSE_CATALOG_ID}"、rootId は "root" にする。`,
    "- 配列は最低2要素: 1) createSurface, 2) updateComponents。",
    "- すべての children に参照される id は components 配列内に必ず存在させる。",
    "- すべてのコンポーネントは必ず一意の id と以下のカタログ内の component 名のみを使う。",
    "- Card の description や見出しの補足など、見ればわかる自明な説明文は書かない。",
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
    `今日の日付: ${getTodayIso()}`,
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
      error: `A2UI スキーマ検証エラー（${firstIssue?.path.join(".") || "root"}：${firstIssue?.message ?? "不正な形式"}）`,
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
