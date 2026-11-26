import { z } from "zod";
import { a2uiMessagesSchema, DASHBOARD_SURFACE_ID, type A2UIMessage } from "@/features/a2ui/types";
import { validateA2UISurfaceMessages } from "@/features/a2ui/validate";
import {
  activateUiVersionById,
  activateUiVersionByNumber,
  createAndActivateUiVersion,
  ensureDefaultUiVersions,
} from "@/features/dashboard/server/ui-versions";
import { defineTool, type McpToolDefinition } from "../types";

function assertValidDashboardMessages(messages: A2UIMessage[]): A2UIMessage[] {
  const result = validateA2UISurfaceMessages(messages, {
    expectedSurfaceId: DASHBOARD_SURFACE_ID,
  });
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.messages;
}

const listUiVersionsTool = defineTool({
  name: "list_ui_versions",
  description:
    "ダッシュボードの保存済み A2UI バージョン一覧を取得します。現在アクティブなバージョンや過去の履歴を確認したいときに使います。",
  annotations: {
    title: "UI バージョン一覧の取得",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    includeJson: z
      .boolean()
      .default(false)
      .describe("true の場合、各バージョンの A2UI messagesJson も含めます（通常は false 推奨）"),
  }),
  execute: async (args) => {
    const rows = await ensureDefaultUiVersions();
    const active = rows.find((r) => r.isActive === 1) ?? rows[rows.length - 1] ?? null;

    return {
      activeVersion: active?.version ?? null,
      activeId: active?.id ?? null,
      versions: rows.map((row) => ({
        id: row.id,
        version: row.version,
        name: row.name,
        description: row.description,
        isActive: row.isActive === 1,
        createdAt: row.createdAt,
        ...(args.includeJson ? { messagesJson: row.messagesJson } : {}),
      })),
    };
  },
});

const activateUiVersionTool = defineTool({
  name: "activate_ui_version",
  description:
    "保存済みの A2UI バージョンに切り替えます。version 番号（例: 1, 2, 3）または id のいずれかを指定してください。",
  annotations: {
    title: "UI バージョンの切り替え",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z
    .object({
      version: z.number().int().positive().optional().describe("切り替えるバージョン番号（例: 2）"),
      id: z.number().int().positive().optional().describe("切り替えるレコード ID"),
    })
    .refine((v) => v.version !== undefined || v.id !== undefined, {
      message: "version または id のいずれかを指定してください",
    }),
  execute: async (args) => {
    const activated =
      args.version !== undefined
        ? await activateUiVersionByNumber(args.version)
        : await activateUiVersionById(args.id!);

    if (!activated) {
      throw new Error(
        args.version !== undefined
          ? `v${args.version} の UI バージョンが見つかりません`
          : `ID=${args.id} の UI バージョンが見つかりません`,
      );
    }

    return {
      activated: {
        id: activated.id,
        version: activated.version,
        name: activated.name,
        description: activated.description,
      },
    };
  },
});

const proposeDashboardUiTool = defineTool({
  name: "propose_dashboard_ui",
  description:
    "ダッシュボードの新しいレイアウト案を検証し、画面上のライブプレビュー（Before/After 比較・適用ドック）に反映します。ユーザーがダッシュボードの変更・改善を求めたときに使ってください。",
  annotations: {
    title: "ダッシュボード案を作成",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  inputSchema: z.object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .describe("提案するバージョン名（例: v4：予算重視レイアウト）"),
    description: z.string().trim().max(240).optional().default("").describe("変更内容の短い要約"),
    messages: a2uiMessagesSchema.describe(
      `surfaceId="${DASHBOARD_SURFACE_ID}" の有効な A2UI v0.9 メッセージ配列`,
    ),
  }),
  execute: async (args) => {
    const validated = assertValidDashboardMessages(args.messages);
    return {
      draft: {
        name: args.name,
        description: args.description,
        messagesJson: JSON.stringify(validated, null, 2),
        messages: validated,
      },
    };
  },
});

const saveUiVersionTool = defineTool({
  name: "save_ui_version",
  description:
    "新しい A2UI ダッシュボード定義を検証して新バージョンとして保存し、即座に有効化します。ユーザーがライブプレビュー確認なしで即保存・適用を明示的に求めた場合や、外部 MCP クライアントから UI を更新したい場合に使います。",
  annotations: {
    title: "UI バージョンの保存・適用",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  inputSchema: z.object({
    name: z.string().trim().min(1).max(80).describe("バージョン名（例: v4：節約重視レイアウト）"),
    description: z.string().trim().max(240).optional().default("").describe("変更内容のメモ"),
    messages: a2uiMessagesSchema.describe("有効な A2UI v0.9 メッセージ配列"),
  }),
  execute: async (args) => {
    const validated = assertValidDashboardMessages(args.messages);
    const created = await createAndActivateUiVersion({
      name: args.name,
      description: args.description,
      messages: validated,
    });

    return {
      saved: {
        id: created.id,
        version: created.version,
        name: created.name,
        description: created.description,
      },
    };
  },
});

export const UI_VERSION_MCP_TOOLS: McpToolDefinition[] = [
  listUiVersionsTool,
  activateUiVersionTool,
  proposeDashboardUiTool,
  saveUiVersionTool,
];
