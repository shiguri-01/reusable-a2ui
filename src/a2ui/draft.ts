import { DASHBOARD_SURFACE_ID, type A2UIMessage } from "./types";
import { validateA2UISurfaceMessages } from "./validate";

export interface DashboardDraft {
  draftId: string;
  name: string;
  description: string;
  messagesJson: string;
  messages: A2UIMessage[];
}

export function extractDashboardDraft(draftId: string, output: unknown): DashboardDraft | null {
  if (!output || typeof output !== "object") return null;
  const draft = (output as { draft?: unknown }).draft;
  if (!draft || typeof draft !== "object") return null;

  const record = draft as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const description = typeof record.description === "string" ? record.description : "";
  if (!name) return null;

  const validated = validateA2UISurfaceMessages(record.messages, {
    expectedSurfaceId: DASHBOARD_SURFACE_ID,
  });
  if (!validated.ok) return null;

  return {
    draftId,
    name,
    description,
    messagesJson:
      typeof record.messagesJson === "string"
        ? record.messagesJson
        : JSON.stringify(validated.messages, null, 2),
    messages: validated.messages,
  };
}
