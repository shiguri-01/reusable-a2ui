import type { AiPreviewDraft, DashboardEditBase } from "@/features/ai-chat/types";

export interface DashboardProposal {
  draft: AiPreviewDraft;
  mode: "preview" | "split" | null;
}

export function matchesProposalBase(
  base: DashboardEditBase | undefined,
  current: DashboardEditBase,
): boolean {
  return base?.messages === current.messages && base.versionId === current.versionId;
}
