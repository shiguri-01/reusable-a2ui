import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vite-plus/test";
import { DASHBOARD_SURFACE_ID } from "@/features/a2ui/types";
import { useDashboardDraft } from "./use-dashboard-draft";

it("keeps the original saved JSON editable when the surface sequence is invalid", () => {
  const json = JSON.stringify([
    {
      version: "1.0",
      updateDataModel: { surfaceId: DASHBOARD_SURFACE_ID, value: { note: "recover me" } },
    },
  ]);

  function SavedDashboard() {
    const draft = useDashboardDraft({ activeVersionId: 1, activeMessagesJson: json });
    expect(draft.rawJson).toBe(json);
    expect(draft.jsonError).toContain("createSurface");
    expect(draft.isDirty).toBe(false);
    expect(draft.activeMessages[0]).toHaveProperty("createSurface");
    return null;
  }

  renderToStaticMarkup(<SavedDashboard />);
});
