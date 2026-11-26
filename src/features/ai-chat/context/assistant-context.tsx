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
import { useSidebar } from "@/components/ui/sidebar";
import type { DataModel } from "@/features/a2ui/data-model";
import type { A2UIAction } from "@/features/a2ui/types";
import type {
  CustomizePanelTab,
  EditorDraft,
} from "@/features/dashboard/hooks/use-dashboard-controller";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import { buildExpenseDataModel, type ExpenseItem } from "@/features/expenses/model";
import type { AiPreviewDraft, CompareMode } from "../types";

type SidebarPanel = "ai" | "customize";

export interface DashboardSidebarHost {
  customizeTab: CustomizePanelTab;
  uiVersions: UiVersion[];
  activeVersion: UiVersion | undefined;
  dataModel: DataModel;
  pending: boolean;
  editorDraft: EditorDraft;
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
  onShowHistory: () => void;
  onSwitchToEditor: () => void;
  onActivateVersion: (versionId: number) => void;
  onEditorDraftChange: (patch: Partial<EditorDraft>) => void;
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
  activePanel: SidebarPanel;
  visiblePanel: SidebarPanel | null;
  openPanel: (panel: SidebarPanel) => void;
  togglePanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
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
  const { open, openMobile, isMobile, setOpen, setOpenMobile } = useSidebar();
  const [dashboardHost, setDashboardHost] = useState<DashboardSidebarHost | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<SidebarPanel>("ai");
  const [pageExpenses, setPageExpenses] = useState<ExpenseItem[]>([]);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingPreviewDraft, setPendingPreviewDraft] = useState<AiPreviewDraft | null>(null);

  const activePanel = dashboardHost ? selectedPanel : "ai";
  const visiblePanel = (isMobile ? openMobile : open) ? activePanel : null;

  useEffect(() => {
    if (!dashboardHost && selectedPanel === "customize") {
      setSelectedPanel("ai");
    }
  }, [dashboardHost, selectedPanel]);

  const setSidebarOpen = useCallback(
    (next: boolean) => {
      if (isMobile) {
        setOpenMobile(next);
      } else {
        setOpen(next);
      }
    },
    [isMobile, setOpen, setOpenMobile],
  );

  const openPanel = useCallback(
    (panel: SidebarPanel) => {
      setSelectedPanel(panel);
      setSidebarOpen(true);
    },
    [setSidebarOpen],
  );

  const closePanel = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  const togglePanel = useCallback(
    (panel: SidebarPanel) => {
      if (visiblePanel === panel) {
        closePanel();
      } else {
        openPanel(panel);
      }
    },
    [visiblePanel, closePanel, openPanel],
  );

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
      activePanel,
      visiblePanel,
      openPanel,
      togglePanel,
      closePanel,
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
      activePanel,
      visiblePanel,
      openPanel,
      togglePanel,
      closePanel,
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
