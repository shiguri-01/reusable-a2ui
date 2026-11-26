import { useMemo, useState } from "react";
import { buildSurfaceState, getByPath, type DataModel } from "@/features/a2ui/data-model";
import { A2UISurface } from "@/features/a2ui/components/a2ui-surface";
import type { A2UIAction, A2UIMessage } from "@/features/a2ui/types";
import { ALL_CATEGORY_LABEL, createInitialExpenseForm } from "@/features/expenses/model";

interface InlineA2UICardProps {
  messages: A2UIMessage[];
  baseDataModel: DataModel;
  pending: boolean;
  onExpenseAction: (
    action: A2UIAction,
    formValues: Record<string, unknown>,
  ) => Promise<{ ok: boolean; message?: string }>;
  onSendPrompt: (text: string) => void;
}

const LIVE_BASE_KEYS = new Set(["expenses", "categories", "summary", "budget"]);

export function InlineA2UICard({
  messages,
  baseDataModel,
  pending,
  onExpenseAction,
  onSendPrompt,
}: InlineA2UICardProps) {
  const initialSurfaceModel = useMemo(
    () => buildSurfaceState(messages)?.initialDataModel ?? {},
    [messages],
  );

  const [localState, setLocalState] = useState<DataModel>(() => {
    const initialForm = getByPath(initialSurfaceModel, "/form");
    const initialFilter = getByPath(initialSurfaceModel, "/filter");
    return {
      ...initialSurfaceModel,
      form: createInitialExpenseForm(
        initialForm && typeof initialForm === "object"
          ? (initialForm as Record<string, unknown>)
          : undefined,
      ),
      filter: {
        category: ALL_CATEGORY_LABEL,
        ...(initialFilter && typeof initialFilter === "object"
          ? (initialFilter as Record<string, unknown>)
          : {}),
      },
    };
  });

  const [localBusy, setLocalBusy] = useState(false);
  const [inlineFeedback, setInlineFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const inlineDataModel = useMemo<DataModel>(
    () => ({
      ...baseDataModel,
      ...localState,
    }),
    [baseDataModel, localState],
  );

  const handleDataModelChange = (next: DataModel) => {
    const overrides: DataModel = {};
    for (const [key, value] of Object.entries(next)) {
      if (LIVE_BASE_KEYS.has(key) && !(key in initialSurfaceModel)) {
        continue;
      }
      overrides[key] = value;
    }
    setLocalState(overrides);
  };

  const handleAction = async (act: A2UIAction) => {
    setInlineFeedback(null);

    if (act.name === "sendPrompt") {
      const text = typeof act.context?.text === "string" ? act.context.text.trim() : "";
      if (text) {
        onSendPrompt(text);
      }
      return;
    }

    const currentForm = (getByPath(localState, "/form") as Record<string, unknown>) ?? {};
    setLocalBusy(true);
    try {
      const result = await onExpenseAction(act, currentForm);
      if (result.ok) {
        if (act.name === "createExpense") {
          setLocalState((prev) => ({
            ...prev,
            form: {
              ...(prev.form as Record<string, unknown> | undefined),
              title: "",
              amount: "",
              note: "",
            },
          }));
        }
        if (result.message) {
          setInlineFeedback({ type: "success", message: result.message });
        }
      } else if (result.message) {
        setInlineFeedback({ type: "error", message: result.message });
      }
    } finally {
      setLocalBusy(false);
    }
  };

  return (
    <div className="bg-muted/40 w-full space-y-2 rounded-lg p-2.5">
      <A2UISurface
        messages={messages}
        dataModel={inlineDataModel}
        onDataModelChange={handleDataModelChange}
        onAction={(act) => void handleAction(act)}
        pending={pending || localBusy}
        compact
      />
      {inlineFeedback && (
        <div
          className={
            inlineFeedback.type === "error"
              ? "bg-destructive/10 text-destructive rounded-md px-2.5 py-1.5 text-xs font-medium"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-md px-2.5 py-1.5 text-xs font-medium"
          }
        >
          {inlineFeedback.message}
        </div>
      )}
    </div>
  );
}
