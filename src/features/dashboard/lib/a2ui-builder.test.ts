import { describe, expect, it } from "vite-plus/test";
import { PRESET_UI_VERSIONS } from "@/features/a2ui/presets";
import { DASHBOARD_SURFACE_ID } from "@/features/a2ui/types";
import { validateA2UISurfaceMessages } from "@/features/a2ui/validate";
import {
  duplicateComponent,
  extractEditableSurface,
  insertBlock,
  moveComponent,
  moveComponentRelative,
  removeComponent,
  updateComponent,
} from "./a2ui-builder";
import { BLOCK_BLUEPRINTS, getComponentDisplayParts } from "./catalog-registry";
import { matchesProposalBase } from "./ai-proposal";

describe("a2ui-builder operations", () => {
  const baseV3 = PRESET_UI_VERSIONS[2]!.messages;

  it("inserts multi-node preset blocks without ID collisions and keeps A2UI valid", () => {
    const kpiPreset = BLOCK_BLUEPRINTS.find((b) => b.id === "preset-kpi-trio")!;
    const first = insertBlock(baseV3, kpiPreset, { parentId: "root", index: 0 });
    const second = insertBlock(first.messages, kpiPreset, { parentId: "root", index: 1 });

    expect(first.insertedId).not.toBe(second.insertedId);
    const validated = validateA2UISurfaceMessages(second.messages, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    expect(validated.ok).toBe(true);
  });

  it("reorders siblings and moves nodes across containers while preventing cycles", () => {
    // Reorder inside root: ["kpi-grid", "budget-card", "workspace-grid"] -> move "budget-card" up
    const movedUp = moveComponentRelative(baseV3, "budget-card", "up");
    const graphAfterUp = extractEditableSurface(movedUp);
    const rootAfterUp = graphAfterUp.componentsById.get("root");
    expect(rootAfterUp && "children" in rootAfterUp ? rootAfterUp.children[0] : null).toBe(
      "budget-card",
    );

    // Move "budget-card" into "left-col"
    const reparented = moveComponent(movedUp, "budget-card", "left-col", 0);
    const graphReparented = extractEditableSurface(reparented);
    expect(graphReparented.parentById.get("budget-card")).toBe("left-col");

    // Attempt invalid cycle: moving "workspace-grid" into its own descendant "left-col"
    const cycleAttempt = moveComponent(reparented, "workspace-grid", "left-col", 0);
    const graphCycle = extractEditableSurface(cycleAttempt);
    expect(graphCycle.parentById.get("workspace-grid")).toBe("root");

    const validated = validateA2UISurfaceMessages(cycleAttempt, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    expect(validated.ok).toBe(true);
  });

  it("duplicates a container subtree with fresh IDs and prunes descendants on remove", () => {
    const { messages: afterDup, duplicatedId } = duplicateComponent(baseV3, "breakdown-card");
    expect(duplicatedId).toBeTruthy();

    const dupValidated = validateA2UISurfaceMessages(afterDup, {
      expectedSurfaceId: DASHBOARD_SURFACE_ID,
    });
    expect(dupValidated.ok).toBe(true);

    const afterRemove = removeComponent(afterDup, duplicatedId!);
    const graphAfterRemove = extractEditableSurface(afterRemove);
    expect(graphAfterRemove.componentsById.has(duplicatedId!)).toBe(false);
    expect(graphAfterRemove.components.length).toBe(
      extractEditableSurface(baseV3).components.length,
    );
  });

  it("updates component properties immutably", () => {
    const updated = updateComponent(baseV3, "kpi-grid", (comp) =>
      comp.component === "Grid" ? { ...comp, columns: 2 } : comp,
    );
    const graph = extractEditableSurface(updated);
    const grid = graph.componentsById.get("kpi-grid");
    expect(grid?.component === "Grid" ? grid.columns : null).toBe(2);
  });
});

it("falls back to the block type when a text binding resolves to a number", () => {
  const block = { id: "summary", component: "Text", text: { "@path": "/total" } } as const;

  expect(getComponentDisplayParts(block, { total: 1200 })).toEqual({ primary: "テキスト" });
  expect(getComponentDisplayParts(block, { total: "  ¥1,200  " })).toEqual({
    primary: "¥1,200",
    secondary: "テキスト",
  });
});

it("recognizes the AI request's base only while the version and draft snapshot still match", () => {
  const messages = PRESET_UI_VERSIONS[2]!.messages;
  const base = { messages, versionId: 3 };
  const editedMessages = moveComponentRelative(messages, "budget-card", "up");

  expect(matchesProposalBase(base, { messages, versionId: 3 })).toBe(true);
  expect(matchesProposalBase(base, { messages: editedMessages, versionId: 3 })).toBe(false);
  expect(matchesProposalBase(base, { messages, versionId: 4 })).toBe(false);
  expect(matchesProposalBase(undefined, base)).toBe(false);
});
