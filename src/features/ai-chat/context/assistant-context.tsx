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
  DashboardBuilderActions,
  DashboardBuilderState,
} from "@/features/dashboard/hooks/use-dashboard-controller";
import { runExpenseA2UIAction, type ExpenseActionResult } from "@/features/expenses/actions";
import { buildExpenseDataModel, type ExpenseItem } from "@/features/expenses/model";
import type { AiPreviewDraft, DashboardEditBase } from "../types";

type SidebarPanel = "ai" | "customize";

export interface DashboardSidebarHost {
  customizeTab: CustomizePanelTab;
  onChangeCustomizeTab: (tab: CustomizePanelTab) => void;
  uiVersions: UiVersion[];
  activeVersion: UiVersion | undefined;
  dataModel: DataModel;
  pending: boolean;
  builder: DashboardBuilderState & DashboardBuilderActions;
  isEditing: boolean;
  preview: {
    hasProposal: boolean;
    activePreviewDraftId: string | null;
    appliedDraftIds: Record<string, boolean>;
    editingDraftId: string | null;
    onPreview: (draft: AiPreviewDraft) => void;
    onReceive: (draft: AiPreviewDraft, base?: DashboardEditBase) => void;
  };
  onActivateVersion: (versionId: number) => void;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<ExpenseActionResult>;
}

interface AssistantSidebarContextValue {
  currentPagePath: string;
  dashboardHost: DashboardSidebarHost | null;
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
  handleDashboardProposed: (draft: AiPreviewDraft, base?: DashboardEditBase) => void;
  consumePendingAssistantPrompt: () => string | null;
}

interface AssistantPageContextValue {
  setDashboardHost: (host: DashboardSidebarHost | null) => void;
  setPageExpenses: (expenses: ExpenseItem[]) => void;
  visiblePanel: SidebarPanel | null;
  openPanel: (panel: SidebarPanel) => void;
  closePanel: () => void;
  consumePendingPreviewDraft: () => AiPreviewDraft | null;
  requestAssistantPrompt: (text: string) => void;
}

const AssistantSidebarContext = createContext<AssistantSidebarContextValue | null>(null);
const AssistantPageContext = createContext<AssistantPageContextValue | null>(null);

export function AssistantSidebarProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { open, openMobile, isMobile, setOpen, setOpenMobile } = useSidebar();
  const [dashboardHost, setDashboardHost] = useState<DashboardSidebarHost | null>(null);
  const [selectedPanel, setSelectedPanel] = useState<SidebarPanel>("ai");
  const [pageExpenses, setPageExpenses] = useState<ExpenseItem[]>([]);
  const [pendingAction, setPendingAction] = useState(false);
  const [pendingPreviewDraft, setPendingPreviewDraft] = useState<AiPreviewDraft | null>(null);
  const [pendingAssistantPrompt, setPendingAssistantPrompt] = useState<string | null>(null);

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

  const handleDashboardProposed = useCallback(
    (draft: AiPreviewDraft, base?: DashboardEditBase) => {
      if (dashboardHost) {
        dashboardHost.preview.onReceive(draft, base);
      } else {
        handlePreviewA2UI(draft);
      }
    },
    [dashboardHost, handlePreviewA2UI],
  );

  const consumePendingPreviewDraft = useCallback(() => {
    if (!pendingPreviewDraft) return null;
    const draft = pendingPreviewDraft;
    setPendingPreviewDraft(null);
    return draft;
  }, [pendingPreviewDraft]);

  const requestAssistantPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPendingAssistantPrompt(trimmed);
      openPanel("ai");
    },
    [openPanel],
  );

  const consumePendingAssistantPrompt = useCallback(() => {
    if (!pendingAssistantPrompt) return null;
    const prompt = pendingAssistantPrompt;
    setPendingAssistantPrompt(null);
    return prompt;
  }, [pendingAssistantPrompt]);

  // Pages publish data to the sidebar without subscribing to the data they publish.
  const pageValue = useMemo<AssistantPageContextValue>(
    () => ({
      setDashboardHost,
      setPageExpenses,
      visiblePanel,
      openPanel,
      closePanel,
      consumePendingPreviewDraft,
      requestAssistantPrompt,
    }),
    [visiblePanel, openPanel, closePanel, consumePendingPreviewDraft, requestAssistantPrompt],
  );

  const value = useMemo<AssistantSidebarContextValue>(
    () => ({
      currentPagePath: router.path,
      dashboardHost,
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
      handleDashboardProposed,
      consumePendingAssistantPrompt,
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
      handleDashboardProposed,
      consumePendingAssistantPrompt,
    ],
  );

  return (
    <AssistantPageContext.Provider value={pageValue}>
      <AssistantSidebarContext.Provider value={value}>{children}</AssistantSidebarContext.Provider>
    </AssistantPageContext.Provider>
  );
}

export function useAssistantSidebar(): AssistantSidebarContextValue {
  const ctx = useContext(AssistantSidebarContext);
  if (!ctx) {
    throw new Error("useAssistantSidebar must be used within AssistantSidebarProvider");
  }
  return ctx;
}

export function useAssistantPage(): AssistantPageContextValue {
  const ctx = useContext(AssistantPageContext);
  if (!ctx) {
    throw new Error("useAssistantPage must be used within AssistantSidebarProvider");
  }
  return ctx;
}

export function useSyncAssistantExpenses(expenses: ExpenseItem[]) {
  const { setPageExpenses } = useAssistantPage();
  useEffect(() => {
    setPageExpenses(expenses);
  }, [expenses, setPageExpenses]);
}
