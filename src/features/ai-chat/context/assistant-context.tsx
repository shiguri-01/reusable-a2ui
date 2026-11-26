import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@void/react";
import type { UiVersion } from "@schema";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import { buildExpenseDataModel, type ExpenseItem } from "@/features/expenses/model";
import type { AiPreviewDraft, CompareMode } from "../types";

export type AssistantSidebarTab = "ai" | "history" | "editor";

export interface DashboardEditorDraft {
  name: string;
  description: string;
  json: string;
  error: string | null;
}

export interface DashboardSidebarHost {
  panelTab: AssistantSidebarTab;
  uiVersions: UiVersion[];
  activeVersion: UiVersion | undefined;
  dataModel: DataModel;
  pending: boolean;
  editorDraft: DashboardEditorDraft;
  preview: {
    draft: AiPreviewDraft | null;
    compareMode: CompareMode;
    appliedDraftIds: Record<string, boolean>;
    onPreview: (draft: AiPreviewDraft) => void;
    onChangeCompareMode: (mode: CompareMode) => void;
    onDiscard: () => void;
    onApply: (draft: AiPreviewDraft) => Promise<void>;
    onOpenInEditor: (messagesJson: string, suggestedName?: string) => void;
  };
  onSelectTab: (tab: AssistantSidebarTab) => void;
  onSwitchToEditor: () => void;
  onActivateVersion: (versionId: number) => void;
  onEditorDraftChange: (patch: Partial<DashboardEditorDraft>) => void;
  onSaveNewVersion: () => void;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<ExpenseActionResult>;
}

interface AssistantSidebarContextValue {
  currentPagePath: string;
  dashboardHost: DashboardSidebarHost | null;
  setDashboardHost: (host: DashboardSidebarHost | null) => void;
  setPageExpenses: (expenses: ExpenseItem[]) => void;
  dataModel: DataModel;
  pending: boolean;
  executeExpenseAction: (
    act: A2UIAction,
    sourceForm: Record<string, unknown>,
  ) => Promise<ExpenseActionResult>;
  handleDataMutated: () => void;
  handlePreviewA2UI: (draft: AiPreviewDraft) => void;
  consumePendingPreviewDraft: () => AiPreviewDraft | null;
}

const AssistantSidebarContext = createContext<AssistantSidebarContextValue | null>(null);

export function AssistantSidebarProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [dashboardHost, setDashboardHost] = useState<DashboardSidebarHost | null>(null);
  const [pageExpenses, setPageExpenses] = useState<ExpenseItem[]>([]);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingPreviewDraft, setPendingPreviewDraft] = useState<AiPreviewDraft | null>(null);

  const fallbackDataModel = useMemo(() => buildExpenseDataModel(pageExpenses), [pageExpenses]);

  const executeFallbackExpenseAction = useCallback(
    async (act: A2UIAction, sourceForm: Record<string, unknown>): Promise<ExpenseActionResult> => {
      setPendingAction(true);
      try {
        const result = await runExpenseA2UIAction(act, sourceForm, "expenses");
        if (result.ok && router.path !== "/expenses") {
          void router.refresh();
        }
        return result;
      } finally {
        setPendingAction(false);
      }
    },
    [router],
  );

  const handleDataMutated = useCallback(() => {
    void router.refresh();
  }, [router]);

  const handlePreviewA2UI = useCallback(
    (draft: AiPreviewDraft) => {
      if (dashboardHost) {
        dashboardHost.preview.onPreview(draft);
        return;
      }
      setPendingPreviewDraft(draft);
      void router.visit("/");
    },
    [dashboardHost, router],
  );

  const consumePendingPreviewDraft = useCallback(() => {
    if (!pendingPreviewDraft) return null;
    const draft = pendingPreviewDraft;
    setPendingPreviewDraft(null);
    return draft;
  }, [pendingPreviewDraft]);

  const value = useMemo<AssistantSidebarContextValue>(
    () => ({
      currentPagePath: router.path,
      dashboardHost,
      setDashboardHost,
      setPageExpenses,
      dataModel: dashboardHost?.dataModel ?? fallbackDataModel,
      pending: (dashboardHost?.pending ?? false) || pendingAction,
      executeExpenseAction: dashboardHost?.onExpenseAction ?? executeFallbackExpenseAction,
      handleDataMutated,
      handlePreviewA2UI,
      consumePendingPreviewDraft,
    }),
    [
      router.path,
      dashboardHost,
      fallbackDataModel,
      pendingAction,
      executeFallbackExpenseAction,
      handleDataMutated,
      handlePreviewA2UI,
      consumePendingPreviewDraft,
    ],
  );

  return (
    <AssistantSidebarContext.Provider value={value}>{children}</AssistantSidebarContext.Provider>
  );
}

export function useAssistantSidebar(): AssistantSidebarContextValue {
  const ctx = useContext(AssistantSidebarContext);
  if (!ctx) {
    throw new Error("useAssistantSidebar must be used within AssistantSidebarProvider");
  }
  return ctx;
}

export function useSyncAssistantExpenses(expenses: ExpenseItem[]) {
  const { setPageExpenses } = useAssistantSidebar();
  useEffect(() => {
    setPageExpenses(expenses);
  }, [expenses, setPageExpenses]);
}
