export const MCP_TOOL_LABELS: Record<string, string> = {
  list_expenses: "支出を検索",
  get_spending_summary: "支出を集計・分析",
  create_expenses: "支出を登録",
  update_expense: "支出を更新",
  delete_expenses: "支出を削除",
  list_ui_versions: "UI履歴を取得",
  activate_ui_version: "UIバージョンを切替",
  propose_dashboard_ui: "ダッシュボード案を作成",
  save_ui_version: "UIバージョンを保存",
};

export const MUTATING_MCP_TOOL_NAMES = new Set<string>([
  "create_expenses",
  "update_expense",
  "delete_expenses",
  "activate_ui_version",
  "save_ui_version",
]);
